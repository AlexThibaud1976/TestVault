import { TESTVAULT_SCHEMA } from "@atconseil/argos-wit-schema";
import { isArgosWit, schemaToAdoFieldRefName } from "./wit-refname-matcher.js";

// ─── Known ADO system process GUIDs ──────────────────────────────────────────

export const SYSTEM_PROCESS_IDS = {
	Agile: "adcc42ab-9882-485e-a3ed-7678f01f66bc",
	Scrum: "6b724908-ef14-45cf-84f8-768b5384da45",
	CMMI: "27450541-8e31-4150-9947-dc59f998fc01",
} as const;

export type BaseProcessType = keyof typeof SYSTEM_PROCESS_IDS;

// ─── ADO Process API field type mapping ──────────────────────────────────────

const ADO_FIELD_TYPE: Record<string, string> = {
	string: "string",
	integer: "integer",
	longText: "plainText",
	html: "html",
	treePath: "treePath",
	identity: "identity",
	dateTime: "dateTime",
	boolean: "boolean",
	picklistString: "picklistString",
	picklistInteger: "picklistInteger",
};

const SCHEMA_MARKER_PREFIX = '{"testvault-schema":"';
const API_VERSION = "7.1";
const DEFAULT_TIMEOUT_MS = 60_000;

// ─── Error types ──────────────────────────────────────────────────────────────

export class ProcessPermissionError extends Error {
	readonly statusCode = 403;
	constructor(message = "Process creation requires Project Collection Admin permissions") {
		super(message);
		this.name = "ProcessPermissionError";
	}
}

export class ProcessInstallError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string
	) {
		super(message);
		this.name = "ProcessInstallError";
	}
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type ProcessInstallState =
	| { status: "not-installed" }
	| { status: "installed"; processId: string; processName: string; schemaVersion: string }
	| { status: "partial"; processId: string; processName: string; missingWitRefs: string[] };

export interface InstallProgressStep {
	phase: "creating-picklists" | "creating-process" | "creating-wits" | "done";
	message: string;
	current?: number;
	total?: number;
}

export interface InstallOptions {
	processName: string;
	baseProcess: BaseProcessType;
	/** If provided, assigns the new process to each project after install */
	projectIds?: string[];
	onProgress?: (step: InstallProgressStep) => void;
}

export interface ProcessInstallResult {
	processId: string;
	processName: string;
}

export interface IProcessInstallService {
	detectInstallState(): Promise<ProcessInstallState>;
	install(options: InstallOptions): Promise<ProcessInstallResult>;
}

export interface ProcessInstallServiceConfig {
	/** e.g. "https://dev.azure.com/myorg" (cloud) or "https://server/collection" (server) */
	orgUrl: string;
	/** Returns "Basic ..." or "Bearer ..." — allows PAT and OAuth token use */
	getAuthHeader: () => Promise<string>;
	timeoutMs?: number;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createProcessInstallService(
	config: ProcessInstallServiceConfig
): IProcessInstallService {
	const { orgUrl, getAuthHeader, timeoutMs = DEFAULT_TIMEOUT_MS } = config;
	const base = `${orgUrl}/_apis/work/processes`;

	async function doFetch(url: string, init?: RequestInit): Promise<Response> {
		const auth = await getAuthHeader();
		const signal = AbortSignal.timeout(timeoutMs);
		return fetch(url, {
			...init,
			signal,
			headers: {
				Authorization: auth,
				Accept: "application/json",
				...(init?.headers as Record<string, string> | undefined),
			},
		});
	}

	async function throwForStatus(res: Response): Promise<void> {
		if (res.ok) return;
		const body = await res.text().catch(() => "");
		if (res.status === 403) throw new ProcessPermissionError(body || undefined);
		throw new ProcessInstallError(res.status, body || `HTTP ${res.status}`);
	}

	async function jsonOrThrow<T>(res: Response): Promise<T> {
		await throwForStatus(res);
		return res.json() as Promise<T>;
	}

	return {
		async detectInstallState() {
			const res = await doFetch(`${base}?api-version=${API_VERSION}`);
			const { value } = await jsonOrThrow<{
				value: Array<{ typeId: string; name: string; description?: string }>;
			}>(res);

			const tv = value.find((p) => p.description?.startsWith(SCHEMA_MARKER_PREFIX));
			if (!tv) return { status: "not-installed" };

			let schemaVersion = "unknown";
			try {
				const marker = JSON.parse(tv.description ?? "{}") as { "testvault-schema"?: string };
				schemaVersion = marker["testvault-schema"] ?? "unknown";
			} catch {
				// malformed description — treat as installed but unknown version
			}

			const witsRes = await doFetch(
				`${base}/${tv.typeId}/workItemTypes?api-version=${API_VERSION}`
			);
			const { value: wits } = await jsonOrThrow<{ value: Array<{ referenceName: string }> }>(
				witsRes
			);

			// ADO generates its own refName; use pattern matching to detect presence
			const missingWitRefs = TESTVAULT_SCHEMA.wits
				.filter(
					(schemaWit) =>
						!wits.some((adoWit) => isArgosWit(adoWit.referenceName, schemaWit.referenceName))
				)
				.map((schemaWit) => schemaWit.referenceName);

			if (missingWitRefs.length === 0) {
				return {
					status: "installed",
					processId: tv.typeId,
					processName: tv.name,
					schemaVersion,
				};
			}
			return { status: "partial", processId: tv.typeId, processName: tv.name, missingWitRefs };
		},

		async install({ processName, baseProcess, projectIds, onProgress }) {
			const emit = onProgress ?? (() => undefined);

			// ── Step 1: Create the inherited process (fail-fast on 403) ───────
			emit({ phase: "creating-process", message: `Creating process "${processName}"...` });

			const createRes = await doFetch(`${base}?api-version=${API_VERSION}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: processName,
					parentProcessTypeId: SYSTEM_PROCESS_IDS[baseProcess],
					description: JSON.stringify({ "testvault-schema": TESTVAULT_SCHEMA.version }),
				}),
			});
			const created = await jsonOrThrow<{ typeId: string; name: string }>(createRes);
			const processId = created.typeId;

			// ── Step 2: Create picklists (idempotent) ────────────────────────
			emit({ phase: "creating-picklists", message: "Checking existing picklists..." });
			const picklistIds = new Map<string, string>(); // field referenceName → picklist id

			const existingListsRes = await doFetch(
				`${orgUrl}/_apis/work/processes/lists?api-version=${API_VERSION}`,
				{ method: "GET" }
			);
			const existingLists = await jsonOrThrow<{ value: Array<{ id: string; name: string }> }>(
				existingListsRes
			);
			const existingPicklistsByName = new Map<string, string>(
				existingLists.value.map((p) => [p.name, p.id])
			);
			emit({
				phase: "creating-picklists",
				message: `Found ${existingLists.value.length} existing picklists in organization.`,
			});

			for (const wit of TESTVAULT_SCHEMA.wits) {
				for (const field of wit.fields) {
					if (
						field.referenceName.startsWith("TestVault.") &&
						(field.type === "picklistString" || field.type === "picklistInteger") &&
						!picklistIds.has(field.referenceName) &&
						field.allowedValues
					) {
						const picklistName = field.referenceName.replace(".", "-");

						const existingId = existingPicklistsByName.get(picklistName);
						if (existingId) {
							emit({
								phase: "creating-picklists",
								message: `Reusing existing picklist "${picklistName}"...`,
							});
							picklistIds.set(field.referenceName, existingId);
							continue;
						}

						emit({
							phase: "creating-picklists",
							message: `Creating picklist "${picklistName}"...`,
						});
						const res = await doFetch(
							`${orgUrl}/_apis/work/processes/lists?api-version=${API_VERSION}`,
							{
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									name: picklistName,
									type: field.type === "picklistInteger" ? "Integer" : "String",
									items: field.allowedValues.map(String),
								}),
							}
						);
						const pl = await jsonOrThrow<{ id: string }>(res);
						picklistIds.set(field.referenceName, pl.id);
						existingPicklistsByName.set(picklistName, pl.id);
					}
				}
			}

			// ── Step 3: Create each WIT with its fields and states (idempotent) ─
			emit({ phase: "creating-wits", message: "Checking existing work item types..." });
			const existingWitsRes = await doFetch(
				`${base}/${processId}/workItemTypes?api-version=${API_VERSION}`,
				{ method: "GET" }
			);
			const existingWitsData = await jsonOrThrow<{ value: Array<{ referenceName: string }> }>(
				existingWitsRes
			);
			const existingAdoWits = existingWitsData.value;
			const existingArgosCount = existingAdoWits.filter((adoWit) =>
				TESTVAULT_SCHEMA.wits.some((s) => isArgosWit(adoWit.referenceName, s.referenceName))
			).length;
			emit({
				phase: "creating-wits",
				message: `Found ${existingArgosCount} existing TestVault WITs in process.`,
			});

			const wits = TESTVAULT_SCHEMA.wits;

			for (let i = 0; i < wits.length; i++) {
				const wit = wits[i];
				if (!wit) continue;

				const existingAdoWit = existingAdoWits.find((adoWit) =>
					isArgosWit(adoWit.referenceName, wit.referenceName)
				);
				if (existingAdoWit) {
					emit({
						phase: "creating-wits",
						message: `Skipping ${wit.displayName} (already exists as ${existingAdoWit.referenceName})`,
						current: i + 1,
						total: wits.length,
					});
					continue;
				}

				emit({
					phase: "creating-wits",
					message: `Creating ${wit.displayName}...`,
					current: i + 1,
					total: wits.length,
				});

				// Create the WIT — ADO ignores our referenceName and generates its own
				const witRes = await doFetch(
					`${base}/${processId}/workItemTypes?api-version=${API_VERSION}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							name: wit.displayName,
							description: wit.description,
							color: wit.color.replace("#", ""),
							icon: wit.icon,
						}),
					}
				);
				// Read the ADO-generated referenceName from the response
				const witData = await jsonOrThrow<{ referenceName: string; name: string }>(witRes);
				const adoRefName = witData.referenceName;

				emit({
					phase: "creating-wits",
					message: `Created ${wit.displayName} (ADO refName: ${adoRefName})`,
					current: i + 1,
					total: wits.length,
				});

				// Add custom fields — use ADO-generated refName in URL + Custom. prefix for field refName
				for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
					const adoFieldRefName = schemaToAdoFieldRefName(field.referenceName);

					const body: Record<string, unknown> = {
						referenceName: adoFieldRefName,
						name: field.displayName,
						type: ADO_FIELD_TYPE[field.type] ?? field.type,
						required: field.required,
					};
					if (field.defaultValue !== undefined) {
						body.defaultValue = String(field.defaultValue);
					}
					const plId = picklistIds.get(field.referenceName);
					if (plId) body.picklistId = plId;

					const fieldRes = await doFetch(
						`${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/fields?api-version=${API_VERSION}`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(body),
						}
					);
					await throwForStatus(fieldRes);

					emit({
						phase: "creating-wits",
						message: `  Added field "${field.displayName}" (${adoFieldRefName}) to ${wit.displayName}`,
						current: i + 1,
						total: wits.length,
					});
				}

				// Add custom states — use ADO-generated refName in the URL
				for (const state of wit.states) {
					const stateRes = await doFetch(
						`${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/states?api-version=${API_VERSION}`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								name: state.name,
								color: state.color.replace("#", ""),
								stateCategory: state.stateCategory,
							}),
						}
					);
					await throwForStatus(stateRes);
				}
			}

			// ── Step 4: Assign to projects (optional) ─────────────────────────
			for (const projectId of projectIds ?? []) {
				const patchRes = await doFetch(
					`${orgUrl}/_apis/projects/${projectId}?api-version=${API_VERSION}`,
					{
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							capabilities: { processTemplate: { templateTypeId: processId } },
						}),
					}
				);
				await throwForStatus(patchRes);
			}

			emit({ phase: "done", message: "Installation complete!" });
			return { processId, processName };
		},
	};
}
