import { describe, expect, it, vi } from "vitest";
import { processQueueMessage } from "./queue-processor.js";
import type { IWebhookTokenService, WebhookToken } from "./token-service.js";

const TOKEN: WebhookToken = {
	id: "tok-1",
	secret: "s",
	label: "CI",
	adoPat: "pat",
	orgUrl: "https://dev.azure.com/acme",
	project: "P",
	planId: "42",
	environment: "CI",
	createdAt: "2026-01-01T00:00:00.000Z",
};

const JUNIT_PASS = `<testsuite><testcase name="login" classname="com.example.LoginTest"/></testsuite>`;
const JUNIT_FAIL = `<testsuite><testcase name="login" classname="com.example.LoginTest"><failure message="expected true but was false"/></testcase></testsuite>`;

function makeTokenSvc(token: WebhookToken | undefined): IWebhookTokenService {
	return {
		create: vi.fn(),
		list: vi.fn(),
		get: vi.fn().mockResolvedValue(token),
		revoke: vi.fn(),
	} as unknown as IWebhookTokenService;
}

function makeAdoFactory() {
	const mockRun = { id: 7 };
	const startRun = vi.fn().mockResolvedValue(mockRun);
	const saveStepResult = vi.fn().mockResolvedValue(mockRun);
	const finalizeRun = vi.fn().mockResolvedValue({});
	const list = vi.fn().mockResolvedValue([
		{ id: 101, automationKey: "com.example.LoginTest.login" },
		{ id: 102, automationKey: "com.example.OtherTest.other" },
	]);
	const factory = vi.fn().mockReturnValue({
		testCaseService: { list },
		execService: { startRun, saveStepResult, finalizeRun },
	});

	return { factory, startRun, saveStepResult, finalizeRun, list };
}

describe("processQueueMessage", () => {
	it("throws if token not found", async () => {
		const { factory } = makeAdoFactory();
		await expect(
			processQueueMessage(
				{
					tokenId: "bad",
					body: Buffer.from("x").toString("base64"),
					contentType: "application/xml",
				},
				makeTokenSvc(undefined),
				factory
			)
		).rejects.toThrow();
	});

	it("throws if token is revoked", async () => {
		const { factory } = makeAdoFactory();
		await expect(
			processQueueMessage(
				{
					tokenId: "tok-1",
					body: Buffer.from("x").toString("base64"),
					contentType: "application/xml",
				},
				makeTokenSvc({ ...TOKEN, revokedAt: "2026-02-01T00:00:00.000Z" }),
				factory
			)
		).rejects.toThrow();
	});

	it("returns matched=1, unmatched=0 for a passing JUnit result with matching TC", async () => {
		const { factory, startRun, saveStepResult, finalizeRun } = makeAdoFactory();
		const result = await processQueueMessage(
			{
				tokenId: "tok-1",
				body: Buffer.from(JUNIT_PASS).toString("base64"),
				contentType: "application/xml",
			},
			makeTokenSvc(TOKEN),
			factory
		);
		expect(result.matched).toBe(1);
		expect(result.unmatched).toBe(0);
		expect(startRun).toHaveBeenCalledWith(
			expect.objectContaining({ testCaseId: 101, environment: "CI" })
		);
		expect(saveStepResult).toHaveBeenCalledWith(7, expect.objectContaining({ status: "Pass" }));
		expect(finalizeRun).toHaveBeenCalledWith(7);
	});

	it("creates a Fail execution for a failing JUnit result", async () => {
		const { factory, saveStepResult } = makeAdoFactory();
		await processQueueMessage(
			{
				tokenId: "tok-1",
				body: Buffer.from(JUNIT_FAIL).toString("base64"),
				contentType: "application/xml",
			},
			makeTokenSvc(TOKEN),
			factory
		);
		expect(saveStepResult).toHaveBeenCalledWith(7, expect.objectContaining({ status: "Fail" }));
	});

	it("counts unmatched when automationKey has no corresponding TC", async () => {
		const { factory } = makeAdoFactory();
		const noMatchXml = `<testsuite><testcase name="foo" classname="x.y.NoMatch"/></testsuite>`;
		const result = await processQueueMessage(
			{
				tokenId: "tok-1",
				body: Buffer.from(noMatchXml).toString("base64"),
				contentType: "application/xml",
			},
			makeTokenSvc(TOKEN),
			factory
		);
		expect(result.matched).toBe(0);
		expect(result.unmatched).toBe(1);
	});

	it("handles Cucumber JSON payload", async () => {
		const cucumber = JSON.stringify([
			{
				id: "login-feature",
				name: "Login feature",
				elements: [
					{
						id: "login-feature;user-can-log-in",
						name: "User can log in",
						steps: [{ result: { status: "passed" } }],
					},
				],
			},
		]);
		const ado = makeAdoFactory();
		ado.list.mockResolvedValue([{ id: 201, automationKey: "login-feature;user-can-log-in" }]);
		const result = await processQueueMessage(
			{
				tokenId: "tok-1",
				body: Buffer.from(cucumber).toString("base64"),
				contentType: "application/json",
			},
			makeTokenSvc(TOKEN),
			ado.factory
		);
		expect(result.matched).toBe(1);
	});
});
