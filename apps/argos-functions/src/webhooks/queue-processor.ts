import type { IAdoClient } from "@atconseil/argos-sdk";
import {
	createAdoClient,
	createTestCaseService,
	createTestExecutionService,
} from "@atconseil/argos-sdk";
import {
	parseCucumber,
	parseJUnit,
	parseNUnit,
	parseTestNG,
	parseXUnit,
} from "@atconseil/testvault-importers";
import type { ImportResult } from "@atconseil/testvault-importers";
import type { IWebhookTokenService } from "./token-service.js";
import type { QueuePayload } from "./webhook-handler.js";

export type ProcessResult = {
	matched: number;
	unmatched: number;
};

type AdoServices = {
	testCaseService: ReturnType<typeof createTestCaseService>;
	execService: ReturnType<typeof createTestExecutionService>;
};

type AdoFactory = (config: { baseUrl: string; project: string; pat: string }) => AdoServices;

function defaultFactory(config: { baseUrl: string; project: string; pat: string }): AdoServices {
	const client: IAdoClient = createAdoClient(config);
	return {
		testCaseService: createTestCaseService(client, config.project),
		execService: createTestExecutionService(client, config.project),
	};
}

function parseBody(body: string, contentType: string): ImportResult {
	const text = Buffer.from(body, "base64").toString("utf8");
	if (contentType.includes("json")) return parseCucumber(text);
	if (text.includes("<test-run") || text.includes("<test-results")) return parseNUnit(text);
	if (text.includes("<assemblies")) return parseXUnit(text);
	if (text.includes("<testng-results")) return parseTestNG(text);
	return parseJUnit(text);
}

export async function processQueueMessage(
	payload: QueuePayload,
	tokenService: IWebhookTokenService,
	adoFactory: AdoFactory = defaultFactory
): Promise<ProcessResult> {
	const token = await tokenService.get(payload.tokenId);
	if (!token || token.revokedAt) throw new Error("Invalid or revoked token");

	const parsed = parseBody(payload.body, payload.contentType);
	const { testCaseService, execService } = adoFactory({
		baseUrl: token.orgUrl,
		project: token.project,
		pat: token.adoPat,
	});

	const allTcs = await testCaseService.list({ top: 2000 });
	const keyMap = new Map<string, number>();
	for (const tc of allTcs) {
		if (tc.automationKey) keyMap.set(tc.automationKey, tc.id);
	}

	let matched = 0;
	let unmatched = 0;

	for (const item of parsed.items) {
		if (!item.automationKey) {
			unmatched++;
			continue;
		}
		const tcId = keyMap.get(item.automationKey);
		if (!tcId) {
			unmatched++;
			continue;
		}

		const isFail = Boolean(item.description);
		const run = await execService.startRun({
			testPlanId: Number(token.planId),
			testCaseId: tcId,
			environment: token.environment,
			source: "CI",
		});
		await execService.saveStepResult(run.id, {
			stepIndex: 0,
			status: isFail ? "Fail" : "Pass",
			comment: item.description ?? "",
			evidenceIds: [],
		});
		await execService.finalizeRun(run.id);
		matched++;
	}

	return { matched, unmatched };
}
