export interface IAiGlobalToggleService {
	isEnabled(): Promise<boolean>;
	enable(): Promise<void>;
	disable(): Promise<void>;
}

export function createAiGlobalToggleService(store: {
	getFlag(key: string): Promise<boolean>;
	setFlag(key: string, value: boolean): Promise<void>;
}): IAiGlobalToggleService {
	return {
		async isEnabled() {
			return store.getFlag("ai-global-enabled");
		},
		async enable() {
			await store.setFlag("ai-global-enabled", true);
		},
		async disable() {
			await store.setFlag("ai-global-enabled", false);
		},
	};
}
