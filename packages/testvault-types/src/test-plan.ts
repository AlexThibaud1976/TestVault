import { z } from "zod";
import { TestPlanStateSchema } from "./enums.js";

export const TestVaultTestPlanSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	description: z.string(),
	state: TestPlanStateSchema,
	iterationPath: z.string(),
	owner: z.string(),
	environments: z.array(z.string()),
	testSetIds: z.array(z.number().int()),
	additionalTestCaseIds: z.array(z.number().int()),
	lockedSnapshotIds: z.array(z.number().int()).optional(),
	createdBy: z.string(),
	createdAt: z.string().datetime(),
});
export type TestVaultTestPlan = z.infer<typeof TestVaultTestPlanSchema>;
