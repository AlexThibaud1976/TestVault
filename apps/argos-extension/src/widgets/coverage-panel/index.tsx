import * as SDK from "azure-devops-extension-sdk";
import { createRoot } from "react-dom/client";
import { CoveragePanel } from "../../hub/CoveragePanel.js";
import { ToastProvider } from "../../hub/components/Toast.js";
import { ServicesContext } from "../../hub/services-context.js";
import { buildServices } from "../../hub/services.js";
import { getWorkItemField, getWorkItemId, getWorkItemType } from "./coverage-panel-entry.js";

// Sprint 2.22 -- the widget now mounts a ServicesContext.Provider around
// CoveragePanel so the inner CoveragePanelSuggestTestsFlow (added in
// Sprint 2.21 part 3) can call useServices() without crashing. The
// widget previously rendered the panel with only linkService /
// executionService as props, leaving the AI flow component without a
// services context -- clicking "Suggest Tests" in BCEE-QA crashed with
// "useServices must be called inside ServicesProvider".

interface PageCtxExtended {
	host: { serverUrl: string };
	project?: { id: string; name: string };
}

SDK.init();
SDK.ready().then(async () => {
	const ctx = SDK.getPageContext() as unknown as PageCtxExtended;
	const baseUrl = ctx.host.serverUrl;
	const projectId = ctx.project?.id ?? "";
	const projectName = ctx.project?.name ?? "";

	// Build the full Services bundle so CoveragePanel can hydrate each
	// row via testCaseService.read and the AI flow can use useServices().
	const services = buildServices({
		baseUrl,
		project: projectName,
		organization: projectId,
		accessTokenFactory: () => SDK.getAccessToken(),
		isLoading: false,
		error: null,
	});

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
			<ServicesContext.Provider value={services}>
				<ToastProvider>
					<CoveragePanel
						workItemId={workItemId}
						workItemType={workItemType}
						workItemTitle={title}
						workItemDescription={description}
						workItemAcceptanceCriteria={acceptanceCriteria}
						workItemAreaPath={areaPath}
						workItemIterationPath={iterationPath}
						linkService={services.workItemLinkService}
						executionService={services.testExecutionService}
					/>
				</ToastProvider>
			</ServicesContext.Provider>
		);
	}
});
