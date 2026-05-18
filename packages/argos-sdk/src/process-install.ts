import { TESTVAULT_SCHEMA } from "@atconseil/argos-wit-schema";
import {
	isArgosWit,
	schemaToAdoFieldName,
	schemaToAdoFieldRefName,
	schemaToAdoStateName,
	validateAdoFieldName,
	validateAdoStateName,
} from "./wit-refname-matcher.js";

// ─── Known ADO system process GUIDs ──────────────────────────────────────────

export const SYSTEM_PROCESS_IDS = {
	Agile: "adcc42ab-9882-485e-a3ed-7678f01f66bc",
	Scrum: "6b724908-ef14-45cf-84f8-768b5384da45",
	CMMI: "27450541-8e31-4150-9947-dc59f998fc01",
} as const;

export type BaseProcessType = keyof typeof SYSTEM_PROCESS_IDS;

// ─── ADO REST API field type mapping (org-level create endpoint) ─────────────
// Maps schema types to ADO REST /wit/fields body shape.
// picklistString/picklistInteger must use base type + isPicklist:true.

const ADO_FIELD_TYPE_REST: Record<string, { type: string; isPicklist: boolean }> = {
	string: { type: "string", isPicklist: false },
	integer: { type: "integer", isPicklist: false },
	double: { type: "double", isPicklist: false },
	boolean: { type: "boolean", isPicklist: false },
	dateTime: { type: "dateTime", isPicklist: false },
	html: { type: "html", isPicklist: false },
	plainText: { type: "plainText", isPicklist: false },
	longText: { type: "plainText", isPicklist: false },
	treePath: { type: "treePath", isPicklist: false },
	identity: { type: "string", isPicklist: false },
	picklistString: { type: "string", isPicklist: true },
	picklistInteger: { type: "integer", isPicklist: true },
	picklistDouble: { type: "double", isPicklist: true },
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

// ─── Pre-flight types (Sprint 2.13) ──────────────────────────────────────────

export interface PreflightFieldAction {
	schemaRef: string;
	adoRef: string;
	adoName: string;
	action: "create" | "reuse" | "conflict";
	conflictDetails?: { existingRefName: string; existingType: string };
	typeCompatible?: boolean;
}

export interface PreflightReport {
	canProceed: boolean;
	actions: PreflightFieldAction[];
	summary: { toCreate: number; toReuse: number; conflicts: number };
	errors: string[];
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

	async function createFieldAtOrg(
		schemaField: (typeof TESTVAULT_SCHEMA.wits)[number]["fields"][number],
		adoFieldRefName: string,
		adoFieldName: string
	): Promise<void> {
		const fieldTypeInfo = ADO_FIELD_TYPE_REST[schemaField.type];
		if (!fieldTypeInfo) {
			throw new Error(
				`Unknown schema field type "${schemaField.type}" for ${schemaField.referenceName}`
			);
		}

		const body = {
			name: adoFieldName,
			referenceName: adoFieldRefName,
			description: schemaField.description ?? "",
			type: fieldTypeInfo.type,
			usage: "workItem",
			readOnly: false,
			canSortBy: true,
			isQueryable: true,
			isPicklist: fieldTypeInfo.isPicklist,
			isPicklistSuggested: false,
		};

		const res = await doFetch(`${orgUrl}/_apis/wit/fields?api-version=${API_VERSION}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (res.status === 409) return;

		if (!res.ok) {
			const errBody = await res.text().catch(() => "");
			if (errBody.includes("VS402803")) {
				throw new Error(
					`[CREATE FAILED] Field "${adoFieldName}" (${adoFieldRefName}): VS402803 name conflict. Despite pre-flight check, ADO rejected. The org state may have changed.`
				);
			}
			await throwForStatus(res);
		}
	}

	function getAllUniqueSchemaFields(): Array<
		(typeof TESTVAULT_SCHEMA.wits)[number]["fields"][number]
	> {
		const seen = new Set<string>();
		const result: Array<(typeof TESTVAULT_SCHEMA.wits)[number]["fields"][number]> = [];
		for (const wit of TESTVAULT_SCHEMA.wits) {
			for (const field of wit.fields) {
				if (!field.referenceName.startsWith("TestVault.")) continue;
				if (!seen.has(field.referenceName)) {
					seen.add(field.referenceName);
					result.push(field);
				}
			}
		}
		return result;
	}

	async function preflightOrgFields(
		schemaFields: ReadonlyArray<(typeof TESTVAULT_SCHEMA.wits)[number]["fields"][number]>,
		typeMapping: Record<string, { type: string; isPicklist: boolean }>,
		emit: (step: InstallProgressStep) => void
	): Promise<PreflightReport> {
		emit({
			phase: "creating-wits",
			message: "[VALIDATE] Pre-flight: fetching org-level fields...",
		});

		const res = await doFetch(`${orgUrl}/_apis/wit/fields?api-version=${API_VERSION}`, {
			method: "GET",
		});
		const orgFields = await jsonOrThrow<{
			value: Array<{ name: string; referenceName: string; type: string; isPicklist?: boolean }>;
		}>(res);

		const byRefName = new Map(orgFields.value.map((f) => [f.referenceName, f]));
		const byName = new Map(orgFields.value.map((f) => [f.name, f]));

		const actions: PreflightFieldAction[] = [];
		const errors: string[] = [];

		for (const schemaField of schemaFields) {
			if (!schemaField.referenceName.startsWith("TestVault.")) continue;

			const adoRef = schemaToAdoFieldRefName(schemaField.referenceName);
			const adoName = schemaToAdoFieldName(schemaField.displayName);
			const expectedType = typeMapping[schemaField.type]?.type ?? schemaField.type;

			const nameError = validateAdoFieldName(adoName);
			if (nameError) {
				errors.push(`Schema field ${schemaField.referenceName}: ${nameError}`);
				actions.push({ schemaRef: schemaField.referenceName, adoRef, adoName, action: "conflict" });
				continue;
			}

			const existingByRef = byRefName.get(adoRef);
			const existingByName = byName.get(adoName);

			if (existingByRef) {
				const typeMatch = existingByRef.type === expectedType;
				if (!typeMatch) {
					errors.push(
						`Schema field ${schemaField.referenceName}: type mismatch ` +
							`(schema=${expectedType}, ado=${existingByRef.type})`
					);
				}
				actions.push({
					schemaRef: schemaField.referenceName,
					adoRef,
					adoName,
					action: "reuse",
					typeCompatible: typeMatch,
				});
			} else if (existingByName) {
				errors.push(
					`Schema field ${schemaField.referenceName}: name "${adoName}" already used by ` +
						`"${existingByName.referenceName}". Cannot create.`
				);
				actions.push({
					schemaRef: schemaField.referenceName,
					adoRef,
					adoName,
					action: "conflict",
					conflictDetails: {
						existingRefName: existingByName.referenceName,
						existingType: existingByName.type,
					},
				});
			} else {
				actions.push({ schemaRef: schemaField.referenceName, adoRef, adoName, action: "create" });
			}
		}

		const summary = {
			toCreate: actions.filter((a) => a.action === "create").length,
			toReuse: actions.filter((a) => a.action === "reuse").length,
			conflicts: actions.filter((a) => a.action === "conflict").length,
		};

		emit({
			phase: "creating-wits",
			message: `[VALIDATE] Pre-flight: ${actions.length} schema fields. ${summary.toCreate} to create, ${summary.toReuse} to reuse, ${summary.conflicts} conflicts.`,
		});

		for (const err of errors) {
			emit({ phase: "creating-wits", message: `[ERROR] ${err}` });
		}

		return { canProceed: errors.length === 0, actions, summary, errors };
	}

	interface AdoState {
		id: string;
		name: string;
		color: string;
		stateCategory: string;
		order?: number;
		customizationType?: string;
	}

	async function getExistingStates(procId: string, adoWitRefName: string): Promise<AdoState[]> {
		const url = `${base}/${procId}/workItemTypes/${encodeURIComponent(adoWitRefName)}/states?api-version=${API_VERSION}`;
		const res = await doFetch(url, { method: "GET" });
		const data = await jsonOrThrow<{ value: AdoState[] }>(res);
		return data.value;
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

			// ── Pre-flight: validate org-level fields before any POST ─────────
			const uniqueSchemaFields = getAllUniqueSchemaFields();
			const preflight = await preflightOrgFields(uniqueSchemaFields, ADO_FIELD_TYPE_REST, emit);

			if (!preflight.canProceed) {
				throw new ProcessInstallError(
					400,
					`Pre-flight validation failed:\n${preflight.errors.join("\n")}`
				);
			}

			const preflightByRef = new Map(preflight.actions.map((a) => [a.schemaRef, a]));

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

				// Add custom fields — ETAPE A: org create, ETAPE B: WIT attach
				for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
					const planning = preflightByRef.get(field.referenceName);
					if (!planning) {
						throw new Error(`Pre-flight missing for ${field.referenceName} (internal error)`);
					}

					const adoFieldRefName = planning.adoRef;
					const adoFieldName = planning.adoName;

					// ETAPE A : create or reuse field at organisation level
					if (planning.action === "create") {
						emit({
							phase: "creating-wits",
							message: `  [CREATE] org-level field ${adoFieldRefName} (display: "${adoFieldName}")`,
							current: i + 1,
							total: wits.length,
						});
						await createFieldAtOrg(field, adoFieldRefName, adoFieldName);
					} else if (planning.action === "reuse") {
						emit({
							phase: "creating-wits",
							message: `  [REUSE] org-level field ${adoFieldRefName} (already exists, compatible)`,
							current: i + 1,
							total: wits.length,
						});
					} else {
						throw new Error(
							`Internal error: conflict for ${field.referenceName} but pre-flight passed`
						);
					}

					// ETAPE B : attach field to WIT
					const attachBody: Record<string, unknown> = {
						referenceName: adoFieldRefName,
						required: field.required,
					};
					if (field.defaultValue !== undefined) {
						attachBody.defaultValue = String(field.defaultValue);
					}
					const plId = picklistIds.get(field.referenceName);
					if (plId) attachBody.picklistId = plId;

					const fieldRes = await doFetch(
						`${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/fields?api-version=${API_VERSION}`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(attachBody),
						}
					);

					// 409 on attach = field already attached to this WIT (idempotent OK)
					if (fieldRes.status !== 409) {
						await throwForStatus(fieldRes);
					}

					emit({
						phase: "creating-wits",
						message: `  [ATTACH] "${adoFieldName}" -> ${wit.displayName}`,
						current: i + 1,
						total: wits.length,
					});
				}

				// Add custom states — 2-step: detect defaults then create with translated name
				emit({
					phase: "creating-wits",
					message: `  [VALIDATE] Pre-flight states for ${wit.displayName}...`,
					current: i + 1,
					total: wits.length,
				});
				const existingStates = await getExistingStates(processId, adoRefName);
				const existingStateNames = new Set(existingStates.map((s) => s.name));
				emit({
					phase: "creating-wits",
					message: `  [VALIDATE] WIT has ${existingStates.length} default states: ${existingStates.map((s) => s.name).join(", ")}`,
					current: i + 1,
					total: wits.length,
				});

				for (const state of wit.states) {
					const adoStateName = schemaToAdoStateName(state.name);

					const nameError = validateAdoStateName(adoStateName);
					if (nameError) {
						throw new Error(`Schema state "${state.name}" for ${wit.referenceName}: ${nameError}`);
					}

					if (existingStateNames.has(adoStateName)) {
						emit({
							phase: "creating-wits",
							message: `  [STATE-SKIP] "${adoStateName}" already exists in ${wit.displayName} (idempotent)`,
							current: i + 1,
							total: wits.length,
						});
						continue;
					}

					emit({
						phase: "creating-wits",
						message: `  [STATE-CREATE] "${adoStateName}" (category: ${state.stateCategory})`,
						current: i + 1,
						total: wits.length,
					});

					const stateRes = await doFetch(
						`${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/states?api-version=${API_VERSION}`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								name: adoStateName,
								color: state.color.replace("#", ""),
								stateCategory: state.stateCategory,
							}),
						}
					);

					if (stateRes.status === 409) {
						emit({
							phase: "creating-wits",
							message: `  [STATE-SKIP] "${adoStateName}" 409 conflict (idempotent OK)`,
							current: i + 1,
							total: wits.length,
						});
						continue;
					}

					if (!stateRes.ok) {
						const errBody = await stateRes.text().catch(() => "");
						if (errBody.includes("VS403083")) {
							throw new Error(
								`[STATE FAILED] State "${adoStateName}" in ${wit.displayName}: VS403083 name conflict. WIT may have been modified concurrently.`
							);
						}
						await throwForStatus(stateRes);
					}
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
