import type { IProjectPageService } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";
import { useEffect, useState } from "react";

export interface AdoContext {
	accessTokenFactory: () => Promise<string>;
	project: string;
	organization: string;
	baseUrl: string;
	isLoading: boolean;
	error: Error | null;
}

const INITIAL_STATE: AdoContext = {
	accessTokenFactory: async () => {
		throw new Error("ADO context not ready");
	},
	project: "",
	organization: "",
	baseUrl: "",
	isLoading: true,
	error: null,
};

export function useAdoContext(): AdoContext {
	const [state, setState] = useState<AdoContext>(INITIAL_STATE);

	useEffect(() => {
		let cancelled = false;

		async function setup(): Promise<void> {
			try {
				await SDK.init();
				await SDK.ready();

				const host = SDK.getHost();
				const projectService = await SDK.getService<IProjectPageService>(
					"ms.vss-tfs-web.tfs-page-data-service"
				);
				const project = await projectService.getProject();

				if (cancelled) return;

				if (!project) {
					throw new Error("No project context available");
				}

				const organization = host.name;
				const baseUrl = `https://dev.azure.com/${organization}`;

				const accessTokenFactory = (): Promise<string> => SDK.getAccessToken();

				// Pre-fetch to validate access before marking ready
				await accessTokenFactory();

				if (cancelled) return;

				setState({
					accessTokenFactory,
					project: project.name,
					organization,
					baseUrl,
					isLoading: false,
					error: null,
				});
			} catch (err) {
				if (cancelled) return;
				setState((s) => ({
					...s,
					isLoading: false,
					error: err instanceof Error ? err : new Error(String(err)),
				}));
			}
		}

		void setup();
		return () => {
			cancelled = true;
		};
	}, []);

	return state;
}
