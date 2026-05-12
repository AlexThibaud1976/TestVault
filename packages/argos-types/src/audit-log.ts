import { z } from "zod";
import { AuditOperationSchema } from "./enums.js";

export const TestVaultAuditLogSchema = z.object({
	id: z.number().int(),
	actorUserId: z.string(),
	actorDisplayName: z.string(),
	timestampUtc: z.string().datetime(),
	operation: AuditOperationSchema,
	contextMetadata: z.record(z.string(), z.string()),
	oldValueAnonymized: z.string().optional(),
	newValueAnonymized: z.string().optional(),
	immutable: z.literal(true),
});
export type TestVaultAuditLog = z.infer<typeof TestVaultAuditLogSchema>;
