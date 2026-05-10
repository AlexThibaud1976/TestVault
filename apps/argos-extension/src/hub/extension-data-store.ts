import type { IExtensionDataClient } from "@atconseil/testvault-sdk";
import type { IExtensionDataService } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";

const SCOPE_USER = "User";

export function createExtensionDataClient(): IExtensionDataClient {
	return {
		async getValue<T>(key: string): Promise<T | undefined> {
			const svc = await SDK.getService<IExtensionDataService>(
				"ms.vss-features.extension-data-service"
			);
			const token = await SDK.getAccessToken();
			const manager = await svc.getExtensionDataManager(SDK.getExtensionContext().id, token);
			return manager.getValue<T>(key, { scopeType: SCOPE_USER });
		},

		async setValue<T>(key: string, value: T): Promise<T> {
			const svc = await SDK.getService<IExtensionDataService>(
				"ms.vss-features.extension-data-service"
			);
			const token = await SDK.getAccessToken();
			const manager = await svc.getExtensionDataManager(SDK.getExtensionContext().id, token);
			return manager.setValue<T>(key, value, { scopeType: SCOPE_USER });
		},
	};
}
