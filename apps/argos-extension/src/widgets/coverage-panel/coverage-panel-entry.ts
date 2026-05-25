import * as SDK from "azure-devops-extension-sdk";

const FORM_SERVICE_ID = "ms.vss-work-web.work-item-form";

interface IWorkItemFormService {
	getId(): Promise<number>;
	getFieldValue(name: string, returnOriginalValue?: boolean): Promise<unknown>;
}

export async function getWorkItemId(): Promise<number> {
	const svc = await SDK.getService<IWorkItemFormService>(FORM_SERVICE_ID);
	return svc.getId();
}

// Sprint 2.22 T-2.22.3: returns the host Work Item type (User Story / Bug /
// Requirement / Test Case / ...). Used by CoveragePanel to decide whether
// to show the "Suggest Tests" button.
export async function getWorkItemType(): Promise<string> {
	const svc = await SDK.getService<IWorkItemFormService>(FORM_SERVICE_ID);
	const v = await svc.getFieldValue("System.WorkItemType");
	return typeof v === "string" ? v : "";
}

// Read a single field from the current work item form. Returns "" if missing.
export async function getWorkItemField(refName: string): Promise<string> {
	const svc = await SDK.getService<IWorkItemFormService>(FORM_SERVICE_ID);
	const v = await svc.getFieldValue(refName);
	return typeof v === "string" ? v : "";
}
