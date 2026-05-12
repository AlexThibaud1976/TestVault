import { z } from "zod";
import { LLMProviderTypeSchema } from "./enums.js";

export const EncryptedApiKeySchema = z.object({
	version: z.literal(1),
	algorithm: z.literal("AES-256-GCM"),
	ciphertext: z.string(),
	iv: z.string(),
	authTag: z.string(),
	maskedSuffix: z.string().length(4),
	encryptedAt: z.string().datetime(),
	encryptedBy: z.string(),
});
export type EncryptedApiKey = z.infer<typeof EncryptedApiKeySchema>;

export const LLMProviderConfigSchema = z.object({
	id: z.string(),
	type: LLMProviderTypeSchema,
	apiKeyEncrypted: z.string(),
	apiKeyMaskedSuffix: z.string(),
	endpoint: z.string().optional(),
	deploymentName: z.string().optional(),
	apiVersion: z.string().optional(),
	createdAt: z.string().datetime(),
	createdBy: z.string(),
});
export type LLMProviderConfig = z.infer<typeof LLMProviderConfigSchema>;

const LlmQuotasSchema = z.object({
	perUserMonthly: z.number().int().nonnegative(),
	mode: z.enum(["hard", "soft"]),
	alertThresholdPct: z.number().int().min(0).max(100),
});

const RetentionDaysSchema = z.object({
	audit: z.number().int().min(90),
	testExecutions: z.number().int().positive(),
	snapshots: z.number().int().positive(),
});

export const OrgConfigSchema = z.object({
	llmProviders: z.array(LLMProviderConfigSchema),
	llmFeatureMapping: z.array(z.unknown()),
	llmGlobalEnabled: z.boolean(),
	llmQuotas: LlmQuotasSchema,
	retentionDays: RetentionDaysSchema,
	featureFlags: z.record(z.string(), z.boolean()),
	licenseKey: z.string(),
	customLogoUrl: z.string().optional(),
});
export type OrgConfig = z.infer<typeof OrgConfigSchema>;

export const ProjectConfigSchema = z.object({
	environments: z.array(z.string()),
	bddSyncMappings: z.array(z.unknown()),
	ciIntegrations: z.array(z.unknown()),
	defaultEnvironment: z.string().optional(),
});
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const UserPreferencesSchema = z.object({
	uiDensity: z.enum(["compact", "comfortable"]),
	shownTutorials: z.array(z.string()),
	recentTestPlans: z.array(z.number().int()),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
