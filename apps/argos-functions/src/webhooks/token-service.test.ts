import { describe, expect, it, vi } from "vitest";
import type { ITokenStore, WebhookToken } from "./token-service.js";
import { createWebhookTokenService } from "./token-service.js";

const activeToken: WebhookToken = {
	id: "aaa-111",
	secret: "sekret",
	label: "Jenkins CI",
	adoPat: "pat123",
	orgUrl: "https://dev.azure.com/acme",
	project: "MyProject",
	planId: "42",
	environment: "CI",
	createdAt: "2026-01-01T00:00:00.000Z",
};

const revokedToken: WebhookToken = {
	...activeToken,
	id: "bbb-222",
	label: "Old token",
	revokedAt: "2026-02-01T00:00:00.000Z",
};

function makeStore(tokens: WebhookToken[] = []): ITokenStore {
	const map = new Map(tokens.map((t) => [t.id, t]));
	return {
		set: vi.fn(async (id, t) => {
			map.set(id, t);
		}),
		get: vi.fn(async (id) => map.get(id)),
		list: vi.fn(async () => [...map.values()]),
	};
}

describe("createWebhookTokenService", () => {
	describe("create", () => {
		it("returns a token with generated id and secret", async () => {
			const store = makeStore();
			const svc = createWebhookTokenService(store);
			const token = await svc.create({
				label: "Jenkins CI",
				adoPat: "pat123",
				orgUrl: "https://dev.azure.com/acme",
				project: "MyProject",
				planId: "42",
				environment: "CI",
			});
			expect(token.id).toBeTruthy();
			expect(token.secret.length).toBeGreaterThan(16);
			expect(token.label).toBe("Jenkins CI");
			expect(token.revokedAt).toBeUndefined();
		});

		it("persists the token in the store", async () => {
			const store = makeStore();
			const svc = createWebhookTokenService(store);
			const token = await svc.create({
				label: "X",
				adoPat: "p",
				orgUrl: "https://dev.azure.com/x",
				project: "P",
				planId: "1",
				environment: "CI",
			});
			expect(store.set).toHaveBeenCalledWith(token.id, expect.objectContaining({ id: token.id }));
		});

		it("sets createdAt to current time", async () => {
			const store = makeStore();
			const before = Date.now();
			const token = await createWebhookTokenService(store).create({
				label: "X",
				adoPat: "p",
				orgUrl: "https://dev.azure.com/x",
				project: "P",
				planId: "1",
				environment: "CI",
			});
			const after = Date.now();
			const ts = new Date(token.createdAt).getTime();
			expect(ts).toBeGreaterThanOrEqual(before);
			expect(ts).toBeLessThanOrEqual(after);
		});
	});

	describe("list", () => {
		it("returns active tokens by default", async () => {
			const store = makeStore([activeToken, revokedToken]);
			const svc = createWebhookTokenService(store);
			const result = await svc.list();
			expect(result).toHaveLength(1);
			expect(result[0]?.id).toBe("aaa-111");
		});

		it("returns all tokens when includeRevoked is true", async () => {
			const store = makeStore([activeToken, revokedToken]);
			const svc = createWebhookTokenService(store);
			const result = await svc.list(true);
			expect(result).toHaveLength(2);
		});

		it("returns empty array when no tokens", async () => {
			const store = makeStore([]);
			const result = await createWebhookTokenService(store).list();
			expect(result).toHaveLength(0);
		});
	});

	describe("get", () => {
		it("returns the token by id", async () => {
			const store = makeStore([activeToken]);
			const result = await createWebhookTokenService(store).get("aaa-111");
			expect(result?.label).toBe("Jenkins CI");
		});

		it("returns undefined for unknown id", async () => {
			const store = makeStore([]);
			const result = await createWebhookTokenService(store).get("unknown");
			expect(result).toBeUndefined();
		});
	});

	describe("revoke", () => {
		it("sets revokedAt on the token", async () => {
			const store = makeStore([activeToken]);
			const svc = createWebhookTokenService(store);
			await svc.revoke("aaa-111");
			expect(store.set).toHaveBeenCalledWith(
				"aaa-111",
				expect.objectContaining({ revokedAt: expect.any(String) })
			);
		});

		it("throws if token not found", async () => {
			const store = makeStore([]);
			await expect(createWebhookTokenService(store).revoke("missing")).rejects.toThrow("not found");
		});

		it("throws if token already revoked", async () => {
			const store = makeStore([revokedToken]);
			await expect(createWebhookTokenService(store).revoke("bbb-222")).rejects.toThrow(
				"already revoked"
			);
		});
	});
});
