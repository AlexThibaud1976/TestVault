import { useCallback, useEffect, useState } from "react";

export interface UseArgosListOptions<TItem> {
	fetchFn: () => Promise<TItem[]>;
	autoFetch?: boolean;
}

export function useArgosList<TItem>({ fetchFn, autoFetch = true }: UseArgosListOptions<TItem>) {
	const [items, setItems] = useState<TItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const refetch = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await fetchFn();
			setItems(result);
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
		} finally {
			setIsLoading(false);
		}
	}, [fetchFn]);

	useEffect(() => {
		if (autoFetch) {
			void refetch();
		}
	}, [autoFetch, refetch]);

	return { items, isLoading, error, refetch };
}
