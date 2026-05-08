export type CatalogStep = { action: string; expected: string };

export type CatalogItem = {
	id?: number;
	title: string;
	description?: string;
	tags?: string[];
	steps?: CatalogStep[];
	automationKey?: string;
};

export type ReleaseReadinessItem = {
	testCaseId: number;
	testCaseTitle: string;
	status: string;
};

export type ReleaseReadinessReport = {
	planTitle: string;
	environment?: string;
	items: ReleaseReadinessItem[];
};

export type ExportOptions = {
	logoDataUri?: string;
	title?: string;
};
