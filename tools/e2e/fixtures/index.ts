import {
	createAdoClient,
	createPreconditionService,
	createTestCaseService,
	createTestCaseVersionService,
	createTestPlanService,
	createTestSetService,
} from "@atconseil/testvault-sdk";
import type {
	IPreconditionService,
	ITestCaseService,
	ITestCaseVersionService,
	ITestPlanService,
	ITestSetService,
} from "@atconseil/testvault-sdk";
import { test as base } from "@playwright/test";

function requireEnv(name: string): string {
	const val = process.env[name];
	if (!val) throw new Error(`Required environment variable ${name} is not set`);
	return val;
}

type E2EFixtures = {
	project: string;
	tcService: ITestCaseService;
	setService: ITestSetService;
	planService: ITestPlanService;
	precondService: IPreconditionService;
	versionService: ITestCaseVersionService;
};

export const test = base.extend<E2EFixtures>({
	project: [
		// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture API requires destructuring
		async ({}, use) => {
			await use(requireEnv("ADO_CLOUD_PROJECT"));
		},
		{ scope: "worker" },
	],

	tcService: [
		async ({ project }, use) => {
			const client = createAdoClient({
				baseUrl: requireEnv("ADO_CLOUD_ORG_URL"),
				project,
				pat: requireEnv("ADO_CLOUD_PAT"),
			});
			await use(createTestCaseService(client, project));
		},
		{ scope: "worker" },
	],

	setService: [
		async ({ project }, use) => {
			const client = createAdoClient({
				baseUrl: requireEnv("ADO_CLOUD_ORG_URL"),
				project,
				pat: requireEnv("ADO_CLOUD_PAT"),
			});
			await use(createTestSetService(client, project));
		},
		{ scope: "worker" },
	],

	planService: [
		async ({ project }, use) => {
			const client = createAdoClient({
				baseUrl: requireEnv("ADO_CLOUD_ORG_URL"),
				project,
				pat: requireEnv("ADO_CLOUD_PAT"),
			});
			await use(createTestPlanService(client, project));
		},
		{ scope: "worker" },
	],

	precondService: [
		async ({ project }, use) => {
			const client = createAdoClient({
				baseUrl: requireEnv("ADO_CLOUD_ORG_URL"),
				project,
				pat: requireEnv("ADO_CLOUD_PAT"),
			});
			await use(createPreconditionService(client, project));
		},
		{ scope: "worker" },
	],

	versionService: [
		// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture API requires destructuring
		async ({}, use) => {
			const client = createAdoClient({
				baseUrl: requireEnv("ADO_CLOUD_ORG_URL"),
				project: requireEnv("ADO_CLOUD_PROJECT"),
				pat: requireEnv("ADO_CLOUD_PAT"),
			});
			await use(createTestCaseVersionService(client));
		},
		{ scope: "worker" },
	],
});

export { expect } from "@playwright/test";
