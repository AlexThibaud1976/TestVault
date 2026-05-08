import { randomUUID } from "node:crypto";

export type WebhookToken = {
	id: string;
	secret: string;
	label: string;
	adoPat: string; // stored encrypted at rest in production via AES-256-GCM
	orgUrl: string;
	project: string;
	planId: string;
	environment: string;
	createdAt: string;
	revokedAt?: string;
};

export type CreateTokenOptions = {
	label: string;
	adoPat: string;
	orgUrl: string;
	project: string;
	planId: string;
	environment: string;
};

export interface ITokenStore {
	set(id: string, token: WebhookToken): Promise<void>;
	get(id: string): Promise<WebhookToken | undefined>;
	list(): Promise<WebhookToken[]>;
}

export interface IWebhookTokenService {
	create(options: CreateTokenOptions): Promise<WebhookToken>;
	list(includeRevoked?: boolean): Promise<WebhookToken[]>;
	get(id: string): Promise<WebhookToken | undefined>;
	revoke(id: string): Promise<void>;
}

export function createWebhookTokenService(store: ITokenStore): IWebhookTokenService {
	return {
		async create(options) {
			const token: WebhookToken = {
				id: randomUUID(),
				secret: randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""),
				label: options.label,
				adoPat: options.adoPat,
				orgUrl: options.orgUrl,
				project: options.project,
				planId: options.planId,
				environment: options.environment,
				createdAt: new Date().toISOString(),
			};
			await store.set(token.id, token);
			return token;
		},

		async list(includeRevoked = false) {
			const all = await store.list();
			return includeRevoked ? all : all.filter((t) => !t.revokedAt);
		},

		async get(id) {
			return store.get(id);
		},

		async revoke(id) {
			const token = await store.get(id);
			if (!token) throw new Error(`Token ${id} not found`);
			if (token.revokedAt) throw new Error(`Token ${id} already revoked`);
			await store.set(id, { ...token, revokedAt: new Date().toISOString() });
		},
	};
}
