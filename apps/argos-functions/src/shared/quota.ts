export type QuotaMode = "hard" | "soft";

export interface QuotaConfig {
	limit: number;
	mode: QuotaMode;
	feature: string;
}

export interface QuotaState {
	used: number;
	limit: number;
	mode: QuotaMode;
	resetAt: string;
}

export interface IQuotaStore {
	get(orgUrl: string, userId: string, feature: string): Promise<QuotaState | undefined>;
	set(orgUrl: string, userId: string, feature: string, state: QuotaState): Promise<void>;
}

export interface QuotaCheckResult {
	allowed: boolean;
	remaining: number;
	mode: QuotaMode;
}

export async function checkAndDecrementQuota(opts: {
	orgUrl: string;
	userId: string;
	feature: string;
	store: IQuotaStore;
}): Promise<QuotaCheckResult> {
	const { orgUrl, userId, feature, store } = opts;
	const state = await store.get(orgUrl, userId, feature);
	if (!state) {
		return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, mode: "soft" };
	}

	const remaining = state.limit - state.used;
	if (state.mode === "hard" && remaining <= 0) {
		return { allowed: false, remaining: 0, mode: "hard" };
	}

	await store.set(orgUrl, userId, feature, { ...state, used: state.used + 1 });
	return { allowed: true, remaining: Math.max(0, remaining - 1), mode: state.mode };
}

export function nextMonthlyReset(): string {
	const now = new Date();
	const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
	return reset.toISOString();
}
