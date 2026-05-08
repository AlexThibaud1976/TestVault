import type { HttpResponseInit } from "@azure/functions";
import { VERSION } from "../shared/version.js";

export async function handleHealthRequest(): Promise<HttpResponseInit> {
	return {
		status: 200,
		jsonBody: {
			status: "ok",
			version: VERSION,
			timestamp: new Date().toISOString(),
		},
	};
}
