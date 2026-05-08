import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv-parser.js";

const HEADER = "title,description,tags,automationKey";
const STEPS_HEADER = "title,steps";

describe("parseCsv", () => {
	it("parses a minimal CSV with title only", () => {
		const input = "title\nLogin test";
		const result = parseCsv(input);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.title).toBe("Login test");
	});

	it("parses multiple rows with all fields", () => {
		const input = `${HEADER}\nTC-01,Check login,smoke;auth,com.example.LoginTest\nTC-02,Check logout,,`;
		const result = parseCsv(input);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]?.title).toBe("TC-01");
		expect(result.items[0]?.description).toBe("Check login");
		expect(result.items[0]?.tags).toEqual(["smoke", "auth"]);
		expect(result.items[0]?.automationKey).toBe("com.example.LoginTest");
		expect(result.items[1]?.tags).toBeUndefined();
	});

	it("handles quoted fields containing commas", () => {
		const input = `title,description\n"Login, flow","Check user, password"`;
		const result = parseCsv(input);
		expect(result.items[0]?.title).toBe("Login, flow");
		expect(result.items[0]?.description).toBe("Check user, password");
	});

	it("reports an error for rows missing the title column", () => {
		const input = "title,description\n,No title here";
		const result = parseCsv(input);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.row).toBe(2);
		expect(result.items).toHaveLength(0);
	});

	it("parses steps from JSON column", () => {
		const steps = JSON.stringify([{ action: "Click", expected: "Opens" }]);
		const quotedSteps = `"${steps.replace(/"/g, '""')}"`;
		const input = `${STEPS_HEADER}\nTC-01,${quotedSteps}`;
		const result = parseCsv(input);
		expect(result.items[0]?.steps).toHaveLength(1);
		expect(result.items[0]?.steps?.[0]?.action).toBe("Click");
	});

	it("skips blank lines", () => {
		const input = "title\nTC-01\n\nTC-02\n";
		const result = parseCsv(input);
		expect(result.items).toHaveLength(2);
	});

	it("returns empty result for header-only CSV", () => {
		const result = parseCsv(HEADER);
		expect(result.items).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	it("handles semicolon delimiter", () => {
		const input = "title;description\nTC-01;Check login";
		const result = parseCsv(input);
		expect(result.items[0]?.title).toBe("TC-01");
	});
});
