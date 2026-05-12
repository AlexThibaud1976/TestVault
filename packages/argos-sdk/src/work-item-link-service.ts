import { AdoNotFoundError } from "./ado-client.js";
import type { IAdoClient } from "./ado-client.js";

export const WI_LINK_TYPE_ATTR = "TestVault.LinkType";

export type WiLinkType = "TestVault.TestedBy" | "TestVault.Validates" | "TestVault.Covers";

export type WorkItemLink = {
	targetId: number;
	targetUrl: string;
	linkType: WiLinkType;
	isOrphan: boolean;
};

export interface IWorkItemLinkService {
	listLinks(testCaseId: number): Promise<WorkItemLink[]>;
	addLink(testCaseId: number, targetWiId: number, linkType: WiLinkType): Promise<void>;
	removeLink(testCaseId: number, targetWiId: number, linkType: WiLinkType): Promise<void>;
	detectOrphanLinks(testCaseId: number): Promise<WorkItemLink[]>;
}

function extractIdFromUrl(url: string): number {
	const parts = url.split("/");
	return Number(parts[parts.length - 1]);
}

export function createWorkItemLinkService(adoClient: IAdoClient): IWorkItemLinkService {
	return {
		async listLinks(testCaseId) {
			const wi = await adoClient.fetchWorkItem(testCaseId);
			return (wi.relations ?? [])
				.filter((r) => r.attributes?.[WI_LINK_TYPE_ATTR] !== undefined)
				.map((r) => ({
					targetId: extractIdFromUrl(r.url),
					targetUrl: r.url,
					linkType: r.attributes?.[WI_LINK_TYPE_ATTR] as WiLinkType,
					isOrphan: false,
				}));
		},

		async addLink(testCaseId, targetWiId, linkType) {
			const target = await adoClient.fetchWorkItem(targetWiId);
			await adoClient.updateWorkItem(testCaseId, [
				{
					op: "add",
					path: "/relations/-",
					value: {
						rel: "System.LinkTypes.Related",
						url: target.url,
						attributes: { [WI_LINK_TYPE_ATTR]: linkType },
					},
				},
			]);
		},

		async removeLink(testCaseId, targetWiId, linkType) {
			const wi = await adoClient.fetchWorkItem(testCaseId);
			const relations = wi.relations ?? [];
			const idx = relations.findIndex(
				(r) =>
					extractIdFromUrl(r.url) === targetWiId && r.attributes?.[WI_LINK_TYPE_ATTR] === linkType
			);
			if (idx === -1) return;
			await adoClient.updateWorkItem(testCaseId, [{ op: "remove", path: `/relations/${idx}` }]);
		},

		async detectOrphanLinks(testCaseId) {
			const links = await this.listLinks(testCaseId);
			const results = await Promise.all(
				links.map(async (link) => {
					try {
						await adoClient.fetchWorkItem(link.targetId);
						return null;
					} catch (err) {
						if (err instanceof AdoNotFoundError) return { ...link, isOrphan: true };
						throw err;
					}
				})
			);
			return results.filter((r): r is WorkItemLink => r !== null);
		},
	};
}
