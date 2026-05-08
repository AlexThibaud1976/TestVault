import { z } from "zod";
import { TestVaultTestCaseSchema } from "./test-case.js";

export const TestVaultTestCaseVersionSchema = z.object({
	id: z.number().int(),
	parentTestCaseId: z.number().int(),
	snapshotName: z.string(),
	comment: z.string().optional(),
	snapshotAt: z.string().datetime(),
	snapshotBy: z.string(),
	frozenFields: TestVaultTestCaseSchema,
});
export type TestVaultTestCaseVersion = z.infer<typeof TestVaultTestCaseVersionSchema>;
