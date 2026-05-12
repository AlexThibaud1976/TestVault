import {
	createAdoClient,
	createTestExecutionService,
	createWorkItemLinkService,
} from "@atconseil/argos-sdk";
import * as SDK from "azure-devops-extension-sdk";
import { createRoot } from "react-dom/client";
import { CoveragePanel } from "../../hub/CoveragePanel.js";
import { getWorkItemId } from "./coverage-panel-entry.js";

interface PageCtxExtended {
	host: { serverUrl: string };
	project?: { name: string };
}

SDK.init();
SDK.ready().then(async () => {
	const ctx = SDK.getPageContext() as unknown as PageCtxExtended;
	const orgUrl = ctx.host.serverUrl;
	const project = ctx.project?.name ?? "";
	const token = await SDK.getAccessToken();

	const adoClient = createAdoClient({ baseUrl: orgUrl, project, pat: token });
	const linkService = createWorkItemLinkService(adoClient);
	const executionService = createTestExecutionService(adoClient, project);
	const workItemId = await getWorkItemId();

	const el = document.getElementById("root");
	if (el) {
		createRoot(el).render(
			<CoveragePanel
				workItemId={workItemId}
				linkService={linkService}
				executionService={executionService}
			/>
		);
	}
});
