import { validateGherkin } from "@atconseil/testvault-gherkin";
import { Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";

export type GherkinEditorProps = {
	value: string;
	onChange: (value: string) => void;
};

const PLACEHOLDER = `Feature: My feature
  Scenario: My scenario
    Given some precondition
    When an action is performed
    Then the expected outcome is observed`;

export function GherkinEditor({ value, onChange }: GherkinEditorProps): React.ReactElement {
	const [validation, setValidation] = useState(() => validateGherkin(value));

	useEffect(() => {
		setValidation(validateGherkin(value));
	}, [value]);

	const hasContent = value.trim().length > 0;

	return (
		<div data-testid="gherkin-editor">
			<textarea
				data-testid="gherkin-textarea"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={PLACEHOLDER}
				rows={12}
				style={{ width: "100%", fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
			/>
			{hasContent && validation.valid && (
				<Text
					data-testid="gherkin-scenario-count"
					size={200}
					style={{ color: "#28a745", display: "block", marginTop: 4 }}
				>
					{validation.scenarioCount} scenario{validation.scenarioCount === 1 ? "" : "s"} — valid
				</Text>
			)}
			{hasContent && !validation.valid && (
				<ul data-testid="gherkin-errors" style={{ margin: "4px 0", padding: "0 0 0 20px" }}>
					{validation.errors.map((err) => (
						<li key={`${err.line}-${err.message}`} style={{ color: "#dc3545", fontSize: 12 }}>
							Line {err.line}: {err.message}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
