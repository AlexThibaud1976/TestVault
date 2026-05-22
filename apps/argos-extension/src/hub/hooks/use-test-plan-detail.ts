import type { TestVaultTestPlan } from "@atconseil/argos-types";
import { useEffect, useState } from "react";
import { useServices } from "../services-context.js";

export function useTestPlanDetail(planId: number | undefined) {
	const { testPlanService } = useServices();
	const [plan, setPlan] = useState<TestVaultTestPlan | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (planId === undefined) return;

		let cancelled = false;
		setIsLoading(true);
		testPlanService
			.read(planId)
			.then((data) => {
				if (cancelled) return;
				setPlan(data);
				setError(null);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(err instanceof Error ? err : new Error(String(err)));
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [planId, testPlanService]);

	return { plan, isLoading, error };
}
