import { z } from "zod";

export const TestCaseStateSchema = z.enum(["Design", "Ready", "Active", "Closed", "Deprecated"]);
export type TestCaseState = z.infer<typeof TestCaseStateSchema>;

export const TestPlanStateSchema = z.enum(["Draft", "Locked", "Closed"]);
export type TestPlanState = z.infer<typeof TestPlanStateSchema>;

export const GlobalStatusSchema = z.enum(["Pass", "Fail", "Blocked", "Unexecuted", "Skipped"]);
export type GlobalStatus = z.infer<typeof GlobalStatusSchema>;

export const StepStatusSchema = GlobalStatusSchema;
export type StepStatus = GlobalStatus;

export const AutomationStatusSchema = z.enum(["Manual", "Planned", "Automated"]);
export type AutomationStatus = z.infer<typeof AutomationStatusSchema>;

export const ExecutionSourceSchema = z.enum(["Manual", "CI"]);
export type ExecutionSource = z.infer<typeof ExecutionSourceSchema>;

export const LLMProviderTypeSchema = z.enum(["anthropic", "openai", "azure-openai"]);
export type LLMProviderType = z.infer<typeof LLMProviderTypeSchema>;

export const AuditOperationSchema = z.enum([
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
]);
export type AuditOperation = z.infer<typeof AuditOperationSchema>;
