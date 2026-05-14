import { Button, MessageBar, MessageBarActions, MessageBarBody } from "@fluentui/react-components";

export interface LimitedModeBannerProps {
	onInstallNow: () => void;
}

export function LimitedModeBanner({ onInstallNow }: LimitedModeBannerProps) {
	return (
		<MessageBar data-testid="limited-mode-banner" intent="warning">
			<MessageBarBody>
				<strong>Limited mode</strong> — Argos custom WIT not installed. Create/save features are
				disabled.
			</MessageBarBody>
			<MessageBarActions>
				<Button onClick={onInstallNow}>Install now</Button>
			</MessageBarActions>
		</MessageBar>
	);
}
