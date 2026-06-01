import type { TestvaultSchema } from "./model.js";
import { AUDIT_LOG_WIT } from "./wits/audit-log.js";
import { PRECONDITION_WIT } from "./wits/precondition.js";
import { TEST_CASE_VERSION_WIT } from "./wits/test-case-version.js";
import { TEST_CASE_WIT } from "./wits/test-case.js";
import { TEST_EXECUTION_WIT } from "./wits/test-execution.js";
import { TEST_PLAN_WIT } from "./wits/test-plan.js";
import { TEST_SET_WIT } from "./wits/test-set.js";

export const TESTVAULT_SCHEMA: TestvaultSchema = {
	version: "1.1.0",
	generatedAt: "2026-06-01T00:00:00.000Z",
	wits: [
		TEST_CASE_WIT,
		TEST_PLAN_WIT,
		TEST_SET_WIT,
		PRECONDITION_WIT,
		TEST_EXECUTION_WIT,
		TEST_CASE_VERSION_WIT,
		AUDIT_LOG_WIT,
	],
};
