// Sprint 2.18 POC: hardcoded mock data.
// Sprint 2.19+ will replace with real ADO API calls:
//   GET {org}/{project}/_apis/wit/classificationNodes/areas for area paths
//   GET {org}/{project}/_apis/wit/classificationNodes/iterations for iterations
// See TECH-DEBT-061.

export interface MockSelectOption {
	value: string;
	label: string;
}

export const MOCK_AREA_PATHS: MockSelectOption[] = [
	{ value: "BCEE-QA", label: "BCEE-QA (root)" },
	{ value: "BCEE-QA\\Frontend", label: "BCEE-QA \\ Frontend" },
	{ value: "BCEE-QA\\Backend", label: "BCEE-QA \\ Backend" },
	{ value: "BCEE-QA\\Mobile", label: "BCEE-QA \\ Mobile" },
];

export const MOCK_ITERATIONS: MockSelectOption[] = [
	{ value: "BCEE-QA", label: "BCEE-QA (root)" },
	{ value: "BCEE-QA\\Sprint 25", label: "Sprint 25 (current)" },
	{ value: "BCEE-QA\\Sprint 26", label: "Sprint 26 (next)" },
	{ value: "BCEE-QA\\Sprint 27", label: "Sprint 27 (backlog)" },
];
