// Test stub for azure-devops-extension-api (AMD format, unusable in jsdom without this stub).
// Production code uses the real module; tests get this stub via resolve.alias in vitest.config.ts.
export const CommonServiceIds = {
	ProjectPageService: "ms.vss-tfs-web.tfs-page-data-service",
	ExtensionDataService: "ms.vss-features.extension-data-service",
};

export type IProjectPageService = {
	getProject(): Promise<{ name: string; id: string } | undefined>;
};

export type IExtensionDataService = {
	getExtensionDataManager(
		extensionId: string,
		token: string
	): Promise<{
		getValue<T>(key: string, options?: { scopeType?: string }): Promise<T | undefined>;
		setValue<T>(key: string, value: T, options?: { scopeType?: string }): Promise<T>;
	}>;
};
