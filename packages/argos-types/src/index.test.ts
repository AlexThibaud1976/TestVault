import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
	AdoEnvironmentSchema,
	AuditOperationSchema,
	AutomationStatusSchema,
	EncryptedApiKeySchema,
	EvidenceRefSchema,
	GlobalStatusSchema,
	LLMProviderConfigSchema,
	LLMProviderTypeSchema,
	OrgConfigSchema,
	ProjectConfigSchema,
	TestCaseStateSchema,
	TestPlanStateSchema,
	TestStepResultSchema,
	TestStepSchema,
	TestVaultAuditLogSchema,
	TestVaultPreconditionSchema,
	TestVaultTestCaseSchema,
	TestVaultTestCaseVersionSchema,
	TestVaultTestExecutionSchema,
	TestVaultTestPlanSchema,
	TestVaultTestSetSchema,
	UserPreferencesSchema,
} from "./index.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NOW = "2026-05-08T12:00:00.000Z";

const validStep = { index: 1, action: "Click login", expected: "Form submits" };

const validTestCase = {
	id: 1,
	title: "Login with valid credentials",
	description: "Verifies the happy path login flow",
	state: "Active" as const,
	areaPath: "ProjectA\\Auth",
	iterationPath: "ProjectA\\Sprint-1",
	tags: ["smoke", "auth"],
	steps: [validStep],
	priority: 2 as const,
	automationStatus: "Manual" as const,
	preconditionLinks: [],
	createdBy: "mathieu@example.com",
	createdAt: NOW,
	modifiedBy: "mathieu@example.com",
	modifiedAt: NOW,
};

const validExecution = {
	id: 100,
	testPlanId: 10,
	testCaseId: 1,
	environment: "QA",
	globalStatus: "Pass" as const,
	stepResults: [{ stepIndex: 1, status: "Pass" as const, evidenceIds: [] }],
	evidence: [],
	executedBy: "mathieu@example.com",
	executedAt: NOW,
	bugLinks: [],
	source: "Manual" as const,
	immutable: true as const,
};

// ─── Enums ───────────────────────────────────────────────────────────────────

describe("TestCaseState", () => {
	it("accepts all valid states", () => {
		for (const s of ["Design", "Ready", "Active", "Closed", "Deprecated"] as const) {
			expect(TestCaseStateSchema.parse(s)).toBe(s);
		}
	});
	it("rejects unknown state", () => {
		expect(() => TestCaseStateSchema.parse("Unknown")).toThrow(ZodError);
	});
});

describe("TestPlanState", () => {
	it("accepts all valid states", () => {
		for (const s of ["Draft", "Locked", "Closed"] as const) {
			expect(TestPlanStateSchema.parse(s)).toBe(s);
		}
	});
	it("rejects unknown state", () => {
		expect(() => TestPlanStateSchema.parse("Active")).toThrow(ZodError);
	});
});

describe("GlobalStatus", () => {
	it("accepts all valid statuses", () => {
		for (const s of ["Pass", "Fail", "Blocked", "Unexecuted", "Skipped"] as const) {
			expect(GlobalStatusSchema.parse(s)).toBe(s);
		}
	});
	it("rejects invalid status", () => {
		expect(() => GlobalStatusSchema.parse("Running")).toThrow(ZodError);
	});
});

describe("AutomationStatus", () => {
	it("accepts all valid statuses", () => {
		for (const s of ["Manual", "Planned", "Automated"] as const) {
			expect(AutomationStatusSchema.parse(s)).toBe(s);
		}
	});
});

describe("LLMProviderType", () => {
	it("accepts all valid providers", () => {
		for (const s of ["anthropic", "openai", "azure-openai"] as const) {
			expect(LLMProviderTypeSchema.parse(s)).toBe(s);
		}
	});
	it("rejects unknown provider", () => {
		expect(() => LLMProviderTypeSchema.parse("google")).toThrow(ZodError);
	});
});

describe("AuditOperation", () => {
	it("accepts all defined operations", () => {
		const ops = [
			"llm.provider.add",
			"llm.provider.update",
			"llm.provider.remove",
			"llm.feature.assign",
			"llm.prompt.update",
			"llm.quota.update",
			"llm.global.toggle",
			"license.update",
			"process.install",
			"process.update",
			"webhook.create",
			"webhook.delete",
			"feature_flag.update",
			"retention.update",
		];
		for (const op of ops) {
			expect(AuditOperationSchema.parse(op)).toBe(op);
		}
	});
	it("rejects unknown operation", () => {
		expect(() => AuditOperationSchema.parse("user.delete")).toThrow(ZodError);
	});
});

// ─── TestStep ─────────────────────────────────────────────────────────────────

describe("TestStep", () => {
	it("parses a valid step", () => {
		expect(TestStepSchema.parse(validStep)).toEqual(validStep);
	});
	it("rejects missing action", () => {
		expect(() => TestStepSchema.parse({ index: 1, expected: "ok" })).toThrow(ZodError);
	});
	it("rejects non-positive index", () => {
		expect(() => TestStepSchema.parse({ index: 0, action: "a", expected: "b" })).toThrow(ZodError);
	});
});

// ─── TestStepResult ───────────────────────────────────────────────────────────

describe("TestStepResult", () => {
	it("parses a valid step result and defaults defectIds to []", () => {
		const r = { stepIndex: 1, status: "Pass" as const, evidenceIds: [] };
		const parsed = TestStepResultSchema.parse(r);
		expect(parsed).toEqual({ ...r, defectIds: [] });
		expect(parsed.defectIds).toEqual([]);
	});
	it("parses result with optional comment", () => {
		const r = {
			stepIndex: 1,
			status: "Fail" as const,
			comment: "Server 500",
			evidenceIds: ["att-1"],
		};
		expect(TestStepResultSchema.parse(r)).toEqual({ ...r, defectIds: [] });
	});
	it("parses optional actualResult and explicit defectIds", () => {
		const r = {
			stepIndex: 2,
			status: "Fail" as const,
			actualResult: "Got 500 instead of 200",
			defectIds: [101, 102],
			evidenceIds: [],
		};
		expect(TestStepResultSchema.parse(r)).toEqual(r);
	});
	it("rejects invalid status", () => {
		expect(() =>
			TestStepResultSchema.parse({ stepIndex: 1, status: "Running", evidenceIds: [] })
		).toThrow(ZodError);
	});
});

// ─── EvidenceRef ─────────────────────────────────────────────────────────────

describe("EvidenceRef", () => {
	it("parses a valid evidence reference", () => {
		const e = {
			attachmentId: "att-abc123",
			filename: "screenshot.png",
			contentType: "image/png",
			sizeBytes: 102400,
			uploadedAt: NOW,
		};
		expect(EvidenceRefSchema.parse(e)).toEqual(e);
	});
	it("rejects negative sizeBytes", () => {
		expect(() =>
			EvidenceRefSchema.parse({
				attachmentId: "x",
				filename: "f",
				contentType: "c",
				sizeBytes: -1,
				uploadedAt: NOW,
			})
		).toThrow(ZodError);
	});
	it("rejects invalid datetime", () => {
		expect(() =>
			EvidenceRefSchema.parse({
				attachmentId: "x",
				filename: "f",
				contentType: "c",
				sizeBytes: 0,
				uploadedAt: "not-a-date",
			})
		).toThrow(ZodError);
	});
});

// ─── TestVaultTestCase ───────────────────────────────────────────────────────

describe("TestVaultTestCase", () => {
	it("parses a valid test case", () => {
		expect(TestVaultTestCaseSchema.parse(validTestCase)).toMatchObject({
			id: 1,
			title: "Login with valid credentials",
		});
	});
	it("parses optional fields absent", () => {
		const tc = { ...validTestCase };
		expect(TestVaultTestCaseSchema.parse(tc)).toBeDefined();
	});
	it("parses with optional fields present", () => {
		const tc = {
			...validTestCase,
			assignedTo: "alice@example.com",
			automationKey: "auth.login.valid",
			gherkin: "Given I am on the login page",
		};
		expect(TestVaultTestCaseSchema.parse(tc)).toMatchObject({ automationKey: "auth.login.valid" });
	});
	it("rejects title exceeding 255 chars", () => {
		expect(() =>
			TestVaultTestCaseSchema.parse({ ...validTestCase, title: "x".repeat(256) })
		).toThrow(ZodError);
	});
	it("rejects description exceeding 32 KB", () => {
		expect(() =>
			TestVaultTestCaseSchema.parse({ ...validTestCase, description: "x".repeat(32769) })
		).toThrow(ZodError);
	});
	it("rejects invalid priority", () => {
		expect(() => TestVaultTestCaseSchema.parse({ ...validTestCase, priority: 5 })).toThrow(
			ZodError
		);
	});
	it("rejects invalid state", () => {
		expect(() => TestVaultTestCaseSchema.parse({ ...validTestCase, state: "Open" })).toThrow(
			ZodError
		);
	});
	it("rejects missing title", () => {
		const { title: _t, ...noTitle } = validTestCase;
		expect(() => TestVaultTestCaseSchema.parse(noTitle)).toThrow(ZodError);
	});
	it("rejects non-ISO datetime for createdAt", () => {
		expect(() =>
			TestVaultTestCaseSchema.parse({ ...validTestCase, createdAt: "2026/01/01" })
		).toThrow(ZodError);
	});
});

// ─── TestVaultTestCaseVersion ─────────────────────────────────────────────────

describe("TestVaultTestCaseVersion", () => {
	it("parses a valid snapshot", () => {
		const v = {
			id: 200,
			parentTestCaseId: 1,
			snapshotName: "v1.0",
			snapshotAt: NOW,
			snapshotBy: "aicha@example.com",
			frozenFields: validTestCase,
		};
		expect(TestVaultTestCaseVersionSchema.parse(v)).toMatchObject({ snapshotName: "v1.0" });
	});
	it("parses with optional comment", () => {
		const v = {
			id: 201,
			parentTestCaseId: 1,
			snapshotName: "Sprint-12",
			comment: "Locked for Sprint-12 release",
			snapshotAt: NOW,
			snapshotBy: "aicha@example.com",
			frozenFields: validTestCase,
		};
		expect(TestVaultTestCaseVersionSchema.parse(v)).toMatchObject({
			comment: "Locked for Sprint-12 release",
		});
	});
	it("rejects missing parentTestCaseId", () => {
		expect(() =>
			TestVaultTestCaseVersionSchema.parse({
				id: 200,
				snapshotName: "v1.0",
				snapshotAt: NOW,
				snapshotBy: "x",
				frozenFields: validTestCase,
			})
		).toThrow(ZodError);
	});
});

// ─── TestVaultTestPlan ────────────────────────────────────────────────────────

describe("TestVaultTestPlan", () => {
	const validPlan = {
		id: 10,
		name: "Sprint-14 Release",
		description: "Test plan for sprint 14",
		state: "Draft" as const,
		iterationPath: "ProjectA\\Sprint-14",
		owner: "aicha@example.com",
		environments: ["Dev", "QA"],
		testSetIds: [1, 2],
		additionalTestCaseIds: [],
		createdBy: "aicha@example.com",
		createdAt: NOW,
	};
	it("parses a valid plan", () => {
		expect(TestVaultTestPlanSchema.parse(validPlan)).toMatchObject({ name: "Sprint-14 Release" });
	});
	it("parses locked plan with snapshot IDs", () => {
		const locked = { ...validPlan, state: "Locked" as const, lockedSnapshotIds: [200, 201] };
		expect(TestVaultTestPlanSchema.parse(locked)).toMatchObject({ lockedSnapshotIds: [200, 201] });
	});
	it("rejects invalid state", () => {
		expect(() => TestVaultTestPlanSchema.parse({ ...validPlan, state: "Active" })).toThrow(
			ZodError
		);
	});
	it("rejects missing owner", () => {
		const { owner: _o, ...noOwner } = validPlan;
		expect(() => TestVaultTestPlanSchema.parse(noOwner)).toThrow(ZodError);
	});
});

// ─── TestVaultTestSet ─────────────────────────────────────────────────────────

describe("TestVaultTestSet", () => {
	const validSet = {
		id: 5,
		name: "Auth Test Set",
		description: "All authentication tests",
		areaPath: "ProjectA\\Auth",
		tags: ["auth"],
		testCaseIds: [1, 2, 3],
	};
	it("parses a valid test set", () => {
		expect(TestVaultTestSetSchema.parse(validSet)).toMatchObject({ name: "Auth Test Set" });
	});
	it("parses with optional WIQL query", () => {
		const setWithQuery = {
			...validSet,
			wiqlQuery:
				"SELECT [System.Id] FROM workitems WHERE [System.WorkItemType] = 'TestVault.TestCase'",
		};
		expect(TestVaultTestSetSchema.parse(setWithQuery)).toMatchObject({
			wiqlQuery: expect.stringContaining("SELECT"),
		});
	});
	it("rejects missing areaPath", () => {
		const { areaPath: _a, ...noArea } = validSet;
		expect(() => TestVaultTestSetSchema.parse(noArea)).toThrow(ZodError);
	});
});

// ─── TestVaultPrecondition ────────────────────────────────────────────────────

describe("TestVaultPrecondition", () => {
	const validPrecond = {
		id: 20,
		title: "User is logged out",
		description: "The application must be in a clean state with no active session.",
		tags: ["setup"],
		linkedTestCaseIds: [1, 2],
	};
	it("parses a valid precondition", () => {
		expect(TestVaultPreconditionSchema.parse(validPrecond)).toMatchObject({
			title: "User is logged out",
		});
	});
	it("rejects missing title", () => {
		const { title: _t, ...noTitle } = validPrecond;
		expect(() => TestVaultPreconditionSchema.parse(noTitle)).toThrow(ZodError);
	});
});

// ─── TestVaultTestExecution ───────────────────────────────────────────────────

describe("TestVaultTestExecution", () => {
	it("parses a valid execution", () => {
		expect(TestVaultTestExecutionSchema.parse(validExecution)).toMatchObject({
			globalStatus: "Pass",
		});
	});
	it("defaults globalStatusOverridden to false and accepts previousExecutionId", () => {
		const base = TestVaultTestExecutionSchema.parse(validExecution);
		expect(base.globalStatusOverridden).toBe(false);
		expect(base.previousExecutionId).toBeUndefined();
		const rerun = TestVaultTestExecutionSchema.parse({
			...validExecution,
			globalStatusOverridden: true,
			previousExecutionId: 555,
		});
		expect(rerun.globalStatusOverridden).toBe(true);
		expect(rerun.previousExecutionId).toBe(555);
	});
	it("parses execution with CI metadata", () => {
		const ciExec = {
			...validExecution,
			source: "CI" as const,
			ciMetadata: {
				pipelineRunId: "run-42",
				pipelineUrl: "https://github.com/org/repo/actions/runs/42",
				rawPayloadHash: "abc123",
			},
		};
		expect(TestVaultTestExecutionSchema.parse(ciExec)).toMatchObject({ source: "CI" });
	});
	it("rejects immutable: false", () => {
		expect(() =>
			TestVaultTestExecutionSchema.parse({ ...validExecution, immutable: false })
		).toThrow(ZodError);
	});
	it("rejects invalid globalStatus", () => {
		expect(() =>
			TestVaultTestExecutionSchema.parse({ ...validExecution, globalStatus: "Running" })
		).toThrow(ZodError);
	});
	it("rejects invalid source", () => {
		expect(() => TestVaultTestExecutionSchema.parse({ ...validExecution, source: "HTTP" })).toThrow(
			ZodError
		);
	});
	it("rejects missing environment", () => {
		const { environment: _e, ...noEnv } = validExecution;
		expect(() => TestVaultTestExecutionSchema.parse(noEnv)).toThrow(ZodError);
	});
});

// ─── TestVaultAuditLog ────────────────────────────────────────────────────────

describe("TestVaultAuditLog", () => {
	const validLog = {
		id: 300,
		actorUserId: "user-id-abc",
		actorDisplayName: "Aïcha Martin",
		timestampUtc: NOW,
		operation: "llm.provider.add" as const,
		contextMetadata: { provider: "anthropic" },
		immutable: true as const,
	};
	it("parses a valid audit log entry", () => {
		expect(TestVaultAuditLogSchema.parse(validLog)).toMatchObject({
			operation: "llm.provider.add",
		});
	});
	it("parses entry with anonymized values", () => {
		const logWithValues = {
			...validLog,
			oldValueAnonymized: "...wxyz",
			newValueAnonymized: "...ab12",
		};
		expect(TestVaultAuditLogSchema.parse(logWithValues)).toMatchObject({
			oldValueAnonymized: "...wxyz",
		});
	});
	it("rejects immutable: false", () => {
		expect(() => TestVaultAuditLogSchema.parse({ ...validLog, immutable: false })).toThrow(
			ZodError
		);
	});
	it("rejects unknown operation", () => {
		expect(() => TestVaultAuditLogSchema.parse({ ...validLog, operation: "user.login" })).toThrow(
			ZodError
		);
	});
	it("rejects contextMetadata with non-string values", () => {
		expect(() =>
			TestVaultAuditLogSchema.parse({ ...validLog, contextMetadata: { key: 42 } })
		).toThrow(ZodError);
	});
});

// ─── Config types ─────────────────────────────────────────────────────────────

describe("EncryptedApiKey", () => {
	const validKey = {
		version: 1 as const,
		algorithm: "AES-256-GCM" as const,
		ciphertext: "base64ciphertext==",
		iv: "base64iv==",
		authTag: "base64tag==",
		maskedSuffix: "wxyz",
		encryptedAt: NOW,
		encryptedBy: "aicha@example.com",
	};
	it("parses a valid encrypted key", () => {
		expect(EncryptedApiKeySchema.parse(validKey)).toMatchObject({ algorithm: "AES-256-GCM" });
	});
	it("rejects maskedSuffix not exactly 4 chars", () => {
		expect(() => EncryptedApiKeySchema.parse({ ...validKey, maskedSuffix: "ab" })).toThrow(
			ZodError
		);
	});
	it("rejects version other than 1", () => {
		expect(() => EncryptedApiKeySchema.parse({ ...validKey, version: 2 })).toThrow(ZodError);
	});
	it("rejects wrong algorithm", () => {
		expect(() => EncryptedApiKeySchema.parse({ ...validKey, algorithm: "RSA" })).toThrow(ZodError);
	});
});

describe("LLMProviderConfig", () => {
	const validProvider = {
		id: "provider-1",
		type: "anthropic" as const,
		apiKeyEncrypted: "encryptedblob",
		apiKeyMaskedSuffix: "...wxyz",
		createdAt: NOW,
		createdBy: "aicha@example.com",
	};
	it("parses a valid provider config", () => {
		expect(LLMProviderConfigSchema.parse(validProvider)).toMatchObject({ type: "anthropic" });
	});
	it("parses Azure OpenAI with optional fields", () => {
		const azureProvider = {
			...validProvider,
			type: "azure-openai" as const,
			endpoint: "https://my-openai.openai.azure.com",
			deploymentName: "gpt-4",
			apiVersion: "2024-02-01",
		};
		expect(LLMProviderConfigSchema.parse(azureProvider)).toMatchObject({ deploymentName: "gpt-4" });
	});
	it("rejects invalid provider type", () => {
		expect(() => LLMProviderConfigSchema.parse({ ...validProvider, type: "cohere" })).toThrow(
			ZodError
		);
	});
});

describe("OrgConfig", () => {
	const validOrgConfig = {
		llmProviders: [],
		llmFeatureMapping: [],
		llmGlobalEnabled: true,
		llmQuotas: { perUserMonthly: 100, mode: "hard" as const, alertThresholdPct: 80 },
		retentionDays: { audit: 90, testExecutions: 365, snapshots: 365 },
		featureFlags: { bddSync: true },
		licenseKey: "encrypted-license-key",
	};
	it("parses a valid org config", () => {
		expect(OrgConfigSchema.parse(validOrgConfig)).toMatchObject({ llmGlobalEnabled: true });
	});
	it("rejects audit retention below 90 days", () => {
		const invalid = {
			...validOrgConfig,
			retentionDays: { ...validOrgConfig.retentionDays, audit: 89 },
		};
		expect(() => OrgConfigSchema.parse(invalid)).toThrow(ZodError);
	});
	it("parses custom logo URL", () => {
		const withLogo = { ...validOrgConfig, customLogoUrl: "https://example.com/logo.png" };
		expect(OrgConfigSchema.parse(withLogo)).toMatchObject({
			customLogoUrl: "https://example.com/logo.png",
		});
	});
});

describe("ProjectConfig", () => {
	const validProjectConfig = {
		environments: ["Dev", "QA", "Staging"],
		bddSyncMappings: [],
		ciIntegrations: [],
	};
	it("parses a valid project config", () => {
		expect(ProjectConfigSchema.parse(validProjectConfig)).toMatchObject({
			environments: ["Dev", "QA", "Staging"],
		});
	});
	it("parses with optional defaultEnvironment", () => {
		const withDefault = { ...validProjectConfig, defaultEnvironment: "QA" };
		expect(ProjectConfigSchema.parse(withDefault)).toMatchObject({ defaultEnvironment: "QA" });
	});
});

describe("UserPreferences", () => {
	const validPrefs = {
		uiDensity: "compact" as const,
		shownTutorials: ["onboarding-v1"],
		recentTestPlans: [1, 2, 3],
	};
	it("parses valid preferences", () => {
		expect(UserPreferencesSchema.parse(validPrefs)).toMatchObject({ uiDensity: "compact" });
	});
	it("rejects invalid uiDensity", () => {
		expect(() => UserPreferencesSchema.parse({ ...validPrefs, uiDensity: "large" })).toThrow(
			ZodError
		);
	});
});

// ─── AdoEnvironment ───────────────────────────────────────────────────────────

describe("AdoEnvironment", () => {
	it("parses cloud environment", () => {
		const cloud = { type: "cloud" as const, orgUrl: "https://dev.azure.com/myorg" };
		expect(AdoEnvironmentSchema.parse(cloud)).toMatchObject({ type: "cloud" });
	});
	it("parses server environment", () => {
		const server = {
			type: "server" as const,
			collectionUrl: "https://ado.mycompany.com/tfs",
			version: "18.0.1",
		};
		expect(AdoEnvironmentSchema.parse(server)).toMatchObject({ type: "server", version: "18.0.1" });
	});
	it("rejects unknown type", () => {
		expect(() =>
			AdoEnvironmentSchema.parse({ type: "unknown", orgUrl: "https://example.com" })
		).toThrow(ZodError);
	});
	it("rejects cloud without orgUrl", () => {
		expect(() => AdoEnvironmentSchema.parse({ type: "cloud" })).toThrow(ZodError);
	});
	it("rejects server without collectionUrl", () => {
		expect(() => AdoEnvironmentSchema.parse({ type: "server", version: "18.0.1" })).toThrow(
			ZodError
		);
	});
});
