import {
	createAdoClient,
	createTestExecutionService,
	createWorkItemLinkService,
} from "@atconseil/argos-sdk";
import * as SDK from "azure-devops-extension-sdk";
import { createRoot } from "react-dom/client";
import { CoveragePanel } from "../../hub/CoveragePanel.js";
import { getWorkItemField, getWorkItemId, getWorkItemType } from "./coverage-panel-entry.js";

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

	const [
		workItemId,
		workItemType,
		title,
		description,
		acceptanceCriteria,
		areaPath,
		iterationPath,
	] = await Promise.all([
		getWorkItemId(),
		getWorkItemType(),
		getWorkItemField("System.Title"),
		getWorkItemField("System.Description"),
		getWorkItemField("Microsoft.VSTS.Common.AcceptanceCriteria"),
		getWorkItemField("System.AreaPath"),
		getWorkItemField("System.IterationPath"),
	]);

	const el = document.getElementById("root");
	if (el) {
		createRoot(el).render(
			<CoveragePanel
				workItemId={workItemId}
				workItemType={workItemType}
				workItemTitle={title}
				workItemDescription={description}
				workItemAcceptanceCriteria={acceptanceCriteria}
				workItemAreaPath={areaPath}
				workItemIterationPath={iterationPath}
				linkService={linkService}
				executionService={executionService}
			/>
		);
	}
});
