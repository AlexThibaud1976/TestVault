import { z } from "zod";
import { ExecutionSourceSchema, GlobalStatusSchema, StepStatusSchema } from "./enums.js";

export const EvidenceRefSchema = z.object({
	attachmentId: z.string(),
	filename: z.string(),
	contentType: z.string(),
	sizeBytes: z.number().int().nonnegative(),
	uploadedAt: z.string().datetime(),
	stepIndex: z.number().int().optional(),
	url: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const TestStepResultSchema = z.object({
	stepIndex: z.number().int(),
	status: StepStatusSchema,
	comment: z.string().optional(),
	actualResult: z.string().optional(),
	// default [] keeps executions created before 0.6.0 (no defectIds) parsing
	// backward-compatibly; the runner UI now always populates per-step defect links.
	defectIds: z.array(z.number().int()).default([]),
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
	testCaseVersionId: z.number().int().optional(),
	environment: z.string(),
	globalStatus: GlobalStatusSchema,
	stepResults: z.array(TestStepResultSchema),
	evidence: z.array(EvidenceRefSchema),
	executedBy: z.string(),
	executedAt: z.string().datetime(),
	bugLinks: z.array(z.number().int()),
	// default false keeps executions created before 0.6.0 (no overridden flag)
	// parsing backward-compatibly while finalizeRun now writes it explicitly.
	globalStatusOverridden: z.boolean().default(false),
	previousExecutionId: z.number().int().optional(),
	source: ExecutionSourceSchema,
	ciMetadata: CiMetadataSchema.optional(),
	immutable: z.literal(true),
});
export type TestVaultTestExecution = z.infer<typeof TestVaultTestExecutionSchema>;
