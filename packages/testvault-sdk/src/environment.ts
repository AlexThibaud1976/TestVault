import type { AdoEnvironment } from "@atconseil/argos-types";
import { getHost } from "azure-devops-extension-sdk";

export function detectEnvironment(serverCollectionUrl?: string): AdoEnvironment {
	const host = getHost();

	if (host.isHosted) {
		return {
			type: "cloud",
			orgUrl: `https://dev.azure.com/${host.name}`,
		};
	}

	return {
		type: "server",
		collectionUrl: serverCollectionUrl ?? "",
		version: host.serviceVersion,
	};
}
