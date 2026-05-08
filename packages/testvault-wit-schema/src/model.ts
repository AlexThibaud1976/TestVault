import { z } from "zod";

export const FieldTypeSchema = z.enum([
	"string",
	"integer",
	"longText",
	"html",
	"treePath",
	"identity",
	"dateTime",
	"boolean",
	"picklistString",
	"picklistInteger",
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const StateCategorySchema = z.enum(["Proposed", "InProgress", "Resolved", "Completed"]);
export type StateCategory = z.infer<typeof StateCategorySchema>;

export const FieldDefinitionSchema = z.object({
	referenceName: z.string(),
	displayName: z.string(),
	type: FieldTypeSchema,
	required: z.boolean(),
	description: z.string().optional(),
	defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
	allowedValues: z.array(z.union([z.string(), z.number()])).optional(),
	immutable: z.boolean().optional(),
});
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

export const StateDefinitionSchema = z.object({
	name: z.string(),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	stateCategory: StateCategorySchema,
});
export type StateDefinition = z.infer<typeof StateDefinitionSchema>;

export const StateTransitionSchema = z.object({
	from: z.string().nullable(),
	to: z.string(),
});
export type StateTransition = z.infer<typeof StateTransitionSchema>;

export const WitDefinitionSchema = z.object({
	referenceName: z.string().startsWith("TestVault."),
	displayName: z.string(),
	description: z.string(),
	icon: z.string(),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	fields: z.array(FieldDefinitionSchema).min(1),
	states: z.array(StateDefinitionSchema).min(1),
	transitions: z.array(StateTransitionSchema),
	isImmutableAfterCreate: z.boolean().optional(),
});
export type WitDefinition = z.infer<typeof WitDefinitionSchema>;

export const TestvaultSchemaSchema = z.object({
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
	generatedAt: z.string().datetime(),
	wits: z.array(WitDefinitionSchema).length(7),
});
export type TestvaultSchema = z.infer<typeof TestvaultSchemaSchema>;
