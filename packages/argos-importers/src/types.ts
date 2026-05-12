export type ParsedTestStep = {
	action: string;
	expected: string;
};

export type ParsedTestCase = {
	title: string;
	description?: string;
	steps?: ParsedTestStep[];
	tags?: string[];
	automationKey?: string;
};

export type ImportError = {
	row?: number;
	field?: string;
	message: string;
};

export type ImportResult = {
	items: ParsedTestCase[];
	errors: ImportError[];
};
