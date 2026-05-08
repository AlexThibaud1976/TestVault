import { z } from "zod";
import { AutomationStatusSchema, TestCaseStateSchema } from "./enums.js";

export const TestStepSchema = z.object({
	index: z.number().int().positive(),
	action: z.string(),
	expected: z.string(),
	data: z.string().optional(),
});
export type TestStep = z.infer<typeof TestStepSchema>;

export const TestVaultTestCaseSchema = z.object({
	id: z.number().int(),
	title: z.string().max(255),
	description: z.string().max(32768),
	state: TestCaseStateSchema,
	areaPath: z.string(),
	iterationPath: z.string(),
	tags: z.array(z.string()),
	steps: z.array(TestStepSchema),
	priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
	automationStatus: AutomationStatusSchema,
	preconditionLinks: z.array(z.number().int()),
	assignedTo: z.string().optional(),
	automationKey: z.string().optional(),
	gherkin: z.string().optional(),
	createdBy: z.string(),
	createdAt: z.string().datetime(),
	modifiedBy: z.string(),
	modifiedAt: z.string().datetime(),
});
export type TestVaultTestCase = z.infer<typeof TestVaultTestCaseSchema>;
