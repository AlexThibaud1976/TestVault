import { afterEach, describe, expect, it, vi } from "vitest";
import { WriteQueue, createBrowserConnectivityService } from "./offline-service.js";

afterEach(() => {
	vi.clearAllMocks();
});

describe("createBrowserConnectivityService", () => {
	it("isOnline reflects navigator.onLine", () => {
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true, writable: true });
		const svc = createBrowserConnectivityService();
		expect(svc.isOnline()).toBe(true);
	});

	it("notifies listeners when online event fires", () => {
		const svc = createBrowserConnectivityService();
		const listener = vi.fn();
		svc.subscribe(listener);
		window.dispatchEvent(new Event("online"));
		expect(listener).toHaveBeenCalledWith(true);
	});

	it("notifies listeners when offline event fires", () => {
		const svc = createBrowserConnectivityService();
		const listener = vi.fn();
		svc.subscribe(listener);
		window.dispatchEvent(new Event("offline"));
		expect(listener).toHaveBeenCalledWith(false);
	});

	it("unsubscribe stops notifications", () => {
		const svc = createBrowserConnectivityService();
		const listener = vi.fn();
		const unsub = svc.subscribe(listener);
		unsub();
		window.dispatchEvent(new Event("online"));
		expect(listener).not.toHaveBeenCalled();
	});
});

describe("WriteQueue", () => {
	it("starts empty", () => {
		expect(new WriteQueue().size).toBe(0);
	});

	it("enqueue increases size", () => {
		const q = new WriteQueue();
		q.enqueue(async () => {});
		q.enqueue(async () => {});
		expect(q.size).toBe(2);
	});

	it("flush executes all enqueued operations in order", async () => {
		const q = new WriteQueue();
		const log: number[] = [];
		q.enqueue(async () => {
			log.push(1);
		});
		q.enqueue(async () => {
			log.push(2);
		});
		q.enqueue(async () => {
			log.push(3);
		});
		await q.flush();
		expect(log).toEqual([1, 2, 3]);
	});

	it("flush returns count of operations executed", async () => {
		const q = new WriteQueue();
		q.enqueue(async () => {});
		q.enqueue(async () => {});
		const count = await q.flush();
		expect(count).toBe(2);
	});

	it("queue is empty after flush", async () => {
		const q = new WriteQueue();
		q.enqueue(async () => {});
		await q.flush();
		expect(q.size).toBe(0);
	});

	it("flush on empty queue returns 0", async () => {
		const q = new WriteQueue();
		const count = await q.flush();
		expect(count).toBe(0);
	});

	it("clear empties the queue without executing", async () => {
		const q = new WriteQueue();
		const executed = vi.fn();
		q.enqueue(executed);
		q.clear();
		expect(q.size).toBe(0);
		expect(executed).not.toHaveBeenCalled();
	});
});
