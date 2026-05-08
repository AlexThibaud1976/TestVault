export interface IBetaFlagService {
	isEnrolled(): Promise<boolean>;
	enroll(): Promise<void>;
	unenroll(): Promise<void>;
}

export function createBetaFlagService(store: {
	getFlag(key: string): Promise<boolean | undefined>;
	setFlag(key: string, value: boolean): Promise<void>;
}): IBetaFlagService {
	const FLAG_KEY = "beta-enrolled";
	return {
		async isEnrolled() {
			return (await store.getFlag(FLAG_KEY)) ?? false;
		},
		async enroll() {
			await store.setFlag(FLAG_KEY, true);
		},
		async unenroll() {
			await store.setFlag(FLAG_KEY, false);
		},
	};
}
