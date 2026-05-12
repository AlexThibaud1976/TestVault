import { z } from "zod";

const AdoCloudEnvironmentSchema = z.object({
	type: z.literal("cloud"),
	orgUrl: z.string(),
});

const AdoServerEnvironmentSchema = z.object({
	type: z.literal("server"),
	collectionUrl: z.string(),
	version: z.string(),
});

export const AdoEnvironmentSchema = z.discriminatedUnion("type", [
	AdoCloudEnvironmentSchema,
	AdoServerEnvironmentSchema,
]);
export type AdoEnvironment = z.infer<typeof AdoEnvironmentSchema>;
