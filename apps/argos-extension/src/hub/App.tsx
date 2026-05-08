import { FluentProvider, Text, webLightTheme } from "@fluentui/react-components";

export function App() {
	return (
		<FluentProvider theme={webLightTheme}>
			<div style={{ padding: "24px" }}>
				<Text as="h1" size={700} weight="bold">
					Argos
				</Text>
				<Text as="p">Coming soon — test management for Azure DevOps.</Text>
			</div>
		</FluentProvider>
	);
}
