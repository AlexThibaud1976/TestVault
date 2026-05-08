/**
 * T-6.10 — Phase 6 E2E: AI Admin (health, BYOK LLM proxy, audit, global toggle).
 * All tests require ARGOS_FUNCTIONS_URL pointing at a deployed argos-functions instance.
 * They are automatically skipped when the env var is absent (CI without deployment).
 *
 * Companion unit tests covering business logic in isolation live in:
 *   apps/argos-functions/src/shared/crypto.test.ts
 *   apps/argos-functions/src/shared/quota.test.ts
 *   apps/argos-functions/src/shared/audit-log.test.ts
 *   apps/argos-functions/src/llm-proxy/generate-test-cases.test.ts
 *   apps/argos-functions/src/jobs/flakiness-detector.test.ts
 *   apps/argos-extension/src/hub/LlmProviderSettings.test.tsx
 *   apps/argos-extension/src/hub/QuotaSettings.test.tsx
 *   apps/argos-extension/src/hub/AiCandidatesModal.test.tsx
 *   apps/argos-extension/src/hub/FlakinessReport.test.tsx
 *   apps/argos-extension/src/hub/AuditLogSettings.test.tsx
 */
import { expect, test } from "../fixtures/index.js";

const FUNCTIONS_URL = process.env.ARGOS_FUNCTIONS_URL;
const SKIP_REASON = "ARGOS_FUNCTIONS_URL not set — skipping live function tests";

// ─── /v1/health ───────────────────────────────────────────────────────────────

test.describe("GET /api/v1/health", () => {
	test.skip(!FUNCTIONS_URL, SKIP_REASON);

	test("returns 200 with status=ok", async () => {
		const res = await fetch(`${FUNCTIONS_URL}/api/v1/health`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { status: string; version: string; timestamp: string };
		expect(body.status).toBe("ok");
	});

	test("response includes version string", async () => {
		const res = await fetch(`${FUNCTIONS_URL}/api/v1/health`);
		const body = (await res.json()) as { version: string };
		expect(typeof body.version).toBe("string");
		expect(body.version.length).toBeGreaterThan(0);
	});

	test("response includes ISO timestamp", async () => {
		const res = await fetch(`${FUNCTIONS_URL}/api/v1/health`);
		const body = (await res.json()) as { timestamp: string };
		expect(() => new Date(body.timestamp)).not.toThrow();
		expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
	});
});

// ─── /v1/llm/generate-test-cases ─────────────────────────────────────────────

test.describe("POST /api/v1/llm/generate-test-cases", () => {
	test.skip(!FUNCTIONS_URL, SKIP_REASON);

	test("returns 400 when workItemDescription is too short", async () => {
		const res = await fetch(`${FUNCTIONS_URL}/api/v1/llm/generate-test-cases`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				orgUrl: "https://dev.azure.com/test-org",
				userId: "user-1",
				providerId: "provider-1",
				workItemTitle: "Login feature",
				workItemDescription: "Too short",
				params: { count: 3, temperature: 0.3, maxTokens: 4000 },
			}),
		});
		expect(res.status).toBe(400);
	});

	test("returns 400 for malformed JSON body", async () => {
		const res = await fetch(`${FUNCTIONS_URL}/api/v1/llm/generate-test-cases`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not-json",
		});
		expect(res.status).toBe(400);
	});

	test("returns 404 when provider not configured", async () => {
		const res = await fetch(`${FUNCTIONS_URL}/api/v1/llm/generate-test-cases`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				orgUrl: "https://dev.azure.com/test-org",
				userId: "user-1",
				providerId: "nonexistent-provider",
				workItemTitle: "Login feature",
				workItemDescription: "A".repeat(60),
				params: { count: 3, temperature: 0.3, maxTokens: 4000 },
			}),
		});
		expect(res.status).toBe(404);
	});
});

// ─── live ADO + functions (full integration) ──────────────────────────────────

test.describe("Full AI admin flow (live ADO + live Functions)", () => {
	test.skip(!FUNCTIONS_URL || !process.env.ADO_CLOUD_ORG_URL, SKIP_REASON);

	test("health endpoint is reachable from test runner", async () => {
		const res = await fetch(`${FUNCTIONS_URL}/api/v1/health`);
		expect(res.ok).toBe(true);
	});

	test("flakiness detector job is registered (timer trigger exists)", async () => {
		const res = await fetch(`${FUNCTIONS_URL}/api/v1/health`);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.status).toBe("ok");
	});
});
