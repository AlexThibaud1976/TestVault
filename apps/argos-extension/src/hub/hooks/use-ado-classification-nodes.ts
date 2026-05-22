import { useEffect, useState } from "react";
import { useServices } from "../services-context.js";
import type { AreaPathNode } from "../services/ado-classification-service.js";

export type { AreaPathNode };

export function useAdoAreaPaths(projectId: string) {
	const { adoClassificationService } = useServices();
	const [areas, setAreas] = useState<AreaPathNode[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (!projectId) return;

		let cancelled = false;
		setIsLoading(true);
		adoClassificationService
			.getAreaPaths(projectId)
			.then((data) => {
				if (cancelled) return;
				setAreas(data);
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
	}, [projectId, adoClassificationService]);

	return { areas, isLoading, error };
}
