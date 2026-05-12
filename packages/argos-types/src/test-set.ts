import { z } from "zod";

export const TestVaultTestSetSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	description: z.string(),
	areaPath: z.string(),
	tags: z.array(z.string()),
	testCaseIds: z.array(z.number().int()),
	wiqlQuery: z.string().optional(),
});
export type TestVaultTestSet = z.infer<typeof TestVaultTestSetSchema>;
