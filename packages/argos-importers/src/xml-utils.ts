import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { ImportError, ImportResult } from "./types.js";

export function tryParseXml(source: string): { doc: unknown; errors: ImportError[] } {
	const valid = XMLValidator.validate(source);
	if (valid !== true) {
		return { doc: null, errors: [{ message: `XML parse error: ${valid.err.msg}` }] };
	}

	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
		isArray: (name) =>
			[
				"testsuite",
				"testcase",
				"test-suite",
				"test-case",
				"assembly",
				"collection",
				"test",
				"suite",
				"class",
				"test-method",
			].includes(name),
	});
	const doc = parser.parse(source);
	return { doc, errors: [] };
}

export function emptyResult(): ImportResult {
	return { items: [], errors: [] };
}
