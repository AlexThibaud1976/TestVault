import { Text } from "@fluentui/react-components";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import { useAdoContext } from "./ado-context.js";
import { type Services, buildServices } from "./services.js";

export const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
	const adoCtx = useAdoContext();

	const services = useMemo(() => {
		if (adoCtx.isLoading || adoCtx.error) return null;
		return buildServices(adoCtx);
	}, [adoCtx]);

	if (adoCtx.isLoading) {
		return (
			<div data-testid="services-loading" style={{ padding: 24 }}>
				<Text>Loading Argos...</Text>
			</div>
		);
	}

	if (adoCtx.error) {
		return (
			<div data-testid="services-error" style={{ padding: 24, color: "#a00" }}>
				<Text weight="semibold" block>
					Argos failed to load
				</Text>
				<Text block>{adoCtx.error.message}</Text>
			</div>
		);
	}

	if (!services) return null;

	return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
	const ctx = useContext(ServicesContext);
	if (!ctx) {
		throw new Error("useServices must be called inside ServicesProvider");
	}
	return ctx;
}
