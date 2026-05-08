import { MessageBar, MessageBarBody, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type { IConnectivityService } from "./offline-service.js";

export interface OfflineBannerProps {
	connectivity: IConnectivityService;
	queuedCount?: number;
}

export function OfflineBanner({ connectivity, queuedCount = 0 }: OfflineBannerProps) {
	const [online, setOnline] = useState(connectivity.isOnline());

	useEffect(() => {
		return connectivity.subscribe(setOnline);
	}, [connectivity]);

	if (online) return null;

	return (
		<MessageBar data-testid="offline-banner" intent="warning">
			<MessageBarBody>
				<Text weight="semibold">You are offline.</Text> Read-only mode active.
				{queuedCount > 0 && (
					<span data-testid="queued-count">
						{" "}
						{queuedCount} change{queuedCount !== 1 ? "s" : ""} will sync when reconnected.
					</span>
				)}
			</MessageBarBody>
		</MessageBar>
	);
}
