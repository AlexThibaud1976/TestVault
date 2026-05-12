const DEFAULT_PAGE_SIZE = 200;

export function paginate<T>(items: T[], pageSize: number): T[][] {
	if (items.length === 0) return [];
	const pages: T[][] = [];
	for (let i = 0; i < items.length; i += pageSize) {
		pages.push(items.slice(i, i + pageSize));
	}
	return pages;
}

export async function* paginateAsync<T>(
	fetchFn: (skip: number, top: number) => Promise<T[]>,
	pageSize = DEFAULT_PAGE_SIZE
): AsyncGenerator<T[]> {
	let skip = 0;
	while (true) {
		const page = await fetchFn(skip, pageSize);
		if (page.length === 0) return;
		yield page;
		skip += pageSize;
	}
}
