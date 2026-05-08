import { describe, expect, it } from "vitest";
import { handleHealthRequest } from "./health-handler.js";

describe("handleHealthRequest", () => {
	it("returns HTTP 200", async () => {
		const result = await handleHealthRequest();
		expect(result.status).toBe(200);
	});

	it("body contains status ok", async () => {
		const result = await handleHealthRequest();
		expect((result.jsonBody as Record<string, unknown>).status).toBe("ok");
	});

	it("body contains version string", async () => {
		const result = await handleHealthRequest();
		expect(typeof (result.jsonBody as Record<string, unknown>).version).toBe("string");
	});

	it("body contains ISO timestamp", async () => {
		const result = await handleHealthRequest();
		const ts = (result.jsonBody as Record<string, unknown>).timestamp as string;
		expect(() => new Date(ts).toISOString()).not.toThrow();
	});
});
