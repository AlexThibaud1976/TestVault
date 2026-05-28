import { validateGherkin } from "@atconseil/argos-gherkin";
import { Text } from "@fluentui/react-components";
import MonacoEditor from "@monaco-editor/react";
import { useEffect, useState } from "react";

// Sprint 2.21 part 3 (T-5.1) -- Monaco-based editor for the
// TestVault.Gherkin field. The editor itself is Monaco; the existing
// validateGherkin() pipeline from @atconseil/argos-gherkin is preserved
// as a live validation summary rendered below the editor (scenario count
// or per-line errors). Backward compat: any plain text already stored in
// TestVault.Gherkin renders unchanged.
//
// Monaco does not ship a Gherkin language; we use "plaintext" with an
// explicit hint UI ("Gherkin syntax supported -- Feature / Scenario /
// Given / When / Then"). Bundle impact: lazy-loaded by Monaco; see the
// code report for the actual VSIX delta.

export type GherkinEditorProps = {
	value: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
	height?: string;
};

const PLACEHOLDER_HINT =
	"Gherkin syntax supported (Feature / Scenario / Given / When / Then / And)";

const DEFAULT_HEIGHT = "200px";

const MONACO_OPTIONS = {
	minimap: { enabled: false },
	wordWrap: "on" as const,
	lineNumbers: "on" as const,
	scrollBeyondLastLine: false,
	fontSize: 13,
	fontFamily: "monospace",
};

export function GherkinEditor({
	value,
	onChange,
	readOnly,
	height,
}: GherkinEditorProps): React.ReactElement {
	const [validation, setValidation] = useState(() => validateGherkin(value));

	useEffect(() => {
		setValidation(validateGherkin(value));
	}, [value]);

	const hasContent = value.trim().length > 0;

	return (
		<div data-testid="gherkin-editor">
			<div data-testid="gherkin-hint" style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
				{PLACEHOLDER_HINT}
			</div>
			<div
				style={{
					border: "1px solid #d0d0d0",
					borderRadius: 4,
					overflow: "hidden",
				}}
			>
				<MonacoEditor
					language="plaintext"
					height={height ?? DEFAULT_HEIGHT}
					value={value}
					onChange={(v) => onChange(v ?? "")}
					options={{ ...MONACO_OPTIONS, readOnly: readOnly ?? false }}
				/>
			</div>
			{hasContent && validation.valid && (
				<Text
					data-testid="gherkin-scenario-count"
					size={200}
					style={{ color: "#28a745", display: "block", marginTop: 4 }}
				>
					{validation.scenarioCount} scenario{validation.scenarioCount === 1 ? "" : "s"} -- valid
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
