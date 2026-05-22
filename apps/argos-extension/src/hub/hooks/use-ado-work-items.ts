import { useEffect, useRef, useState } from "react";
import { useServices } from "../services-context.js";
import type { WorkItemResult } from "../services/ado-work-items-service.js";

const DEFAULT_TYPES = ["User Story", "Bug", "Requirement"];
const DEBOUNCE_MS = 300;

export function useAdoWorkItems(query: string, types: string[] = DEFAULT_TYPES) {
	const { adoWorkItemsService } = useServices();
	const [items, setItems] = useState<WorkItemResult[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		let cancelled = false;
		debounceRef.current = setTimeout(() => {
			setIsLoading(true);
			adoWorkItemsService
				.search(query, types)
				.then((data) => {
					if (!cancelled) {
						setItems(data);
						setError(null);
					}
				})
				.catch((err: unknown) => {
					if (!cancelled) {
						setError(err instanceof Error ? err : new Error(String(err)));
					}
				})
				.finally(() => {
					if (!cancelled) setIsLoading(false);
				});
		}, DEBOUNCE_MS);

		return () => {
			cancelled = true;
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, types, adoWorkItemsService]);

	return { items, isLoading, error };
}
