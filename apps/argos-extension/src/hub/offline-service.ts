export type ConnectivityListener = (online: boolean) => void;

export interface IConnectivityService {
	isOnline(): boolean;
	subscribe(listener: ConnectivityListener): () => void;
}

export function createBrowserConnectivityService(): IConnectivityService {
	const listeners = new Set<ConnectivityListener>();

	function notify(online: boolean) {
		for (const l of listeners) l(online);
	}

	const handleOnline = () => notify(true);
	const handleOffline = () => notify(false);

	window.addEventListener("online", handleOnline);
	window.addEventListener("offline", handleOffline);

	return {
		isOnline: () => navigator.onLine,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export class WriteQueue {
	private readonly queue: Array<() => Promise<void>> = [];
	private flushing = false;

	enqueue(op: () => Promise<void>): void {
		this.queue.push(op);
	}

	get size(): number {
		return this.queue.length;
	}

	async flush(): Promise<number> {
		if (this.flushing) return 0;
		this.flushing = true;
		let flushed = 0;
		try {
			while (this.queue.length > 0) {
				const op = this.queue.shift();
				if (op) {
					await op();
					flushed++;
				}
			}
		} finally {
			this.flushing = false;
		}
		return flushed;
	}

	clear(): void {
		this.queue.length = 0;
	}
}
