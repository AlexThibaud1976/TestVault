import { useEffect, useState } from "react";
import { useServices } from "../services-context.js";
import type { IterationNode } from "../services/ado-iterations-service.js";

export type { IterationNode };

export function useAdoIterations(projectId: string) {
	const { adoIterationsService } = useServices();
	const [iterations, setIterations] = useState<IterationNode[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (!projectId) return;

		let cancelled = false;
		setIsLoading(true);
		adoIterationsService
			.getIterations(projectId)
			.then((data) => {
				if (cancelled) return;
				setIterations(data);
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
	}, [projectId, adoIterationsService]);

	return { iterations, isLoading, error };
}
