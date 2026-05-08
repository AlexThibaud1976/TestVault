import { z } from "zod";
import { ExecutionSourceSchema, GlobalStatusSchema, StepStatusSchema } from "./enums.js";

export const EvidenceRefSchema = z.object({
	attachmentId: z.string(),
	filename: z.string(),
	contentType: z.string(),
	sizeBytes: z.number().int().nonnegative(),
	uploadedAt: z.string().datetime(),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const TestStepResultSchema = z.object({
	stepIndex: z.number().int(),
	status: StepStatusSchema,
	comment: z.string().optional(),
	evidenceIds: z.array(z.string()),
});
export type TestStepResult = z.infer<typeof TestStepResultSchema>;

const CiMetadataSchema = z.object({
	pipelineRunId: z.string(),
	pipelineUrl: z.string(),
	rawPayloadHash: z.string(),
});

export const TestVaultTestExecutionSchema = z.object({
	id: z.number().int(),
	testPlanId: z.number().int(),
	testCaseId: z.number().int(),
	environment: z.string(),
	globalStatus: GlobalStatusSchema,
	stepResults: z.array(TestStepResultSchema),
	evidence: z.array(EvidenceRefSchema),
	executedBy: z.string(),
	executedAt: z.string().datetime(),
	bugLinks: z.array(z.number().int()),
	source: ExecutionSourceSchema,
	ciMetadata: CiMetadataSchema.optional(),
	immutable: z.literal(true),
});
export type TestVaultTestExecution = z.infer<typeof TestVaultTestExecutionSchema>;
