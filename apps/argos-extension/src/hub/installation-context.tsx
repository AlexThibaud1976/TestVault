import { createContext, useContext } from "react";

export interface InstallationContextValue {
	canCreate: boolean;
}

export const InstallationContext = createContext<InstallationContextValue>({ canCreate: true });

export function useInstallationContext(): InstallationContextValue {
	return useContext(InstallationContext);
}
