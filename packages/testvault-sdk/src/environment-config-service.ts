const STORAGE_KEY = "tv-environments";

export interface IExtensionDataClient {
	getValue<T>(key: string): Promise<T | undefined>;
	setValue<T>(key: string, value: T): Promise<T>;
}

export interface IEnvironmentConfigService {
	getEnvironments(): Promise<string[]>;
	saveEnvironments(environments: string[]): Promise<void>;
}

export function createEnvironmentConfigService(
	dataClient: IExtensionDataClient
): IEnvironmentConfigService {
	return {
		async getEnvironments() {
			const stored = await dataClient.getValue<string[]>(STORAGE_KEY);
			return stored ?? [];
		},

		async saveEnvironments(environments) {
			const trimmed = environments.map((e) => e.trim());

			const blank = trimmed.find((e) => e === "");
			if (blank !== undefined) throw new Error("Environment name must not be blank");

			const lower = trimmed.map((e) => e.toLowerCase());
			const hasDuplicate = lower.some((e, i) => lower.indexOf(e) !== i);
			if (hasDuplicate) throw new Error("Environment list contains duplicate names");

			await dataClient.setValue(STORAGE_KEY, trimmed);
		},
	};
}
