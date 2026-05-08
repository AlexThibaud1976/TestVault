import { Button, Switch, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type { IBetaFlagService } from "./beta-flag-service.js";

export interface BetaOptInProps {
	service: IBetaFlagService;
}

export function BetaOptIn({ service }: BetaOptInProps) {
	const [enrolled, setEnrolled] = useState<boolean | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		service.isEnrolled().then(setEnrolled);
	}, [service]);

	async function handleToggle(checked: boolean) {
		setSaving(true);
		try {
			if (checked) {
				await service.enroll();
			} else {
				await service.unenroll();
			}
			setEnrolled(checked);
		} finally {
			setSaving(false);
		}
	}

	if (enrolled === null) {
		return <div data-testid="beta-loading">Loading…</div>;
	}

	return (
		<div data-testid="beta-opt-in" style={{ padding: "16px", maxWidth: "480px" }}>
			<Text size={400} weight="semibold" block style={{ marginBottom: "8px" }}>
				Beta Programme
			</Text>
			<Text size={300} block style={{ marginBottom: "12px", color: "#666" }}>
				Join the Argos beta to access early features before general availability. You can opt out at
				any time.
			</Text>
			<Switch
				data-testid="beta-toggle"
				checked={enrolled}
				disabled={saving}
				label={enrolled ? "Enrolled in beta" : "Not enrolled"}
				onChange={(_, d) => handleToggle(d.checked)}
			/>
			{enrolled && (
				<div data-testid="beta-enrolled-badge" style={{ marginTop: "8px" }}>
					<Text size={200} style={{ color: "green" }}>
						Beta features enabled
					</Text>
				</div>
			)}
			<Button
				appearance="subtle"
				data-testid="beta-unenroll-button"
				disabled={!enrolled || saving}
				style={{ marginTop: "12px" }}
				onClick={() => handleToggle(false)}
			>
				Opt out
			</Button>
		</div>
	);
}
