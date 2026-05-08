import * as SDK from "azure-devops-extension-sdk";

const FORM_SERVICE_ID = "ms.vss-work-web.work-item-form";

interface IWorkItemFormService {
	getId(): Promise<number>;
}

export async function getWorkItemId(): Promise<number> {
	const svc = await SDK.getService<IWorkItemFormService>(FORM_SERVICE_ID);
	return svc.getId();
}
