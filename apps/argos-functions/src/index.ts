export { createWebhookTokenService } from "./webhooks/token-service.js";
export type {
	CreateTokenOptions,
	ITokenStore,
	IWebhookTokenService,
	WebhookToken,
} from "./webhooks/token-service.js";
export { handleWebhookRequest } from "./webhooks/webhook-handler.js";
export type { QueuePayload, WebhookHandleResult } from "./webhooks/webhook-handler.js";
export { processQueueMessage } from "./webhooks/queue-processor.js";
export type { ProcessResult } from "./webhooks/queue-processor.js";
// registers Azure Function triggers — imported for side effects at host startup
export { setTokenService } from "./webhooks/functions.js";
export { setBddSyncServices } from "./bdd-sync/functions.js";
export { handleGitPush } from "./bdd-sync/git-push-handler.js";
export type {
	GitPushEvent,
	GitPushChangedFile,
	SyncResult,
	IFileReader,
	IBddMappingReader,
	IBddTcService,
} from "./bdd-sync/git-push-handler.js";
export { handleHealthRequest } from "./health/health-handler.js";
export { VERSION } from "./shared/version.js";
export { encryptApiKey, decryptApiKey } from "./shared/crypto.js";
export type { EncryptedApiKey } from "./shared/crypto.js";
export {
	createAuditEntry,
	maskSecret,
	NoopAuditLogger,
} from "./shared/audit-log.js";
export type {
	AuditEntry,
	AuditOperation,
	IAuditLogger,
} from "./shared/audit-log.js";
export { checkAndDecrementQuota, nextMonthlyReset } from "./shared/quota.js";
export type {
	IQuotaStore,
	QuotaCheckResult,
	QuotaMode,
	QuotaState,
} from "./shared/quota.js";
export { parseCandidates, buildGenerationMessages } from "./shared/llm-client.js";
export type {
	ILlmClient,
	LlmCallOptions,
	LlmMessage,
	LlmProviderType,
	LlmResponse,
	TcCandidate,
} from "./shared/llm-client.js";
export { handleGenerateTestCases } from "./llm-proxy/generate-test-cases.js";
export type {
	IProviderConfigStore,
	LlmGenerateRequest,
	LlmGenerateResult,
	ProviderConfig,
} from "./llm-proxy/generate-test-cases.js";
export { setLlmServices } from "./llm-proxy/functions.js";
export { computeFlakinessScore, runFlakinessDetection } from "./jobs/flakiness-detector.js";
export type {
	ExecutionRecord,
	FlakinessReport,
	IFlakinessDataSource,
} from "./jobs/flakiness-detector.js";
export {
	createSignedLicense,
	validateLicense,
	LicenseCache,
	CLOUD_VALIDATION_TTL_MS,
	SERVER_VALIDATION_TTL_MS,
} from "./license/license-engine.js";
export type {
	LicensePayload,
	LicenseState,
	LicenseTier,
	LicenseValidationResult,
	SignedLicense,
} from "./license/license-engine.js";
export { handleStripeWebhook } from "./stripe/stripe-webhook-handler.js";
export type {
	ILicenseStore,
	IStripeSignatureVerifier,
	StoredLicense,
	StripeSubscriptionEvent,
	StripeWebhookResult,
} from "./stripe/stripe-webhook-handler.js";
export { setStripeServices } from "./stripe/functions.js";
