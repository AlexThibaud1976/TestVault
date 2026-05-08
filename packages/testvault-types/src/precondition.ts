import { z } from "zod";

export const TestVaultPreconditionSchema = z.object({
	id: z.number().int(),
	title: z.string(),
	description: z.string(),
	tags: z.array(z.string()),
	linkedTestCaseIds: z.array(z.number().int()),
});
export type TestVaultPrecondition = z.infer<typeof TestVaultPreconditionSchema>;
