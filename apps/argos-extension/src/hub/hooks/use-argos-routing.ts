import { useState } from "react";

export type ArgosView =
	| { kind: "test-plans-list" }
	| { kind: "test-plans-form"; planId?: number }
	| { kind: "test-cases-list" }
	| { kind: "test-case-form"; caseId?: number }
	| { kind: "test-sets-list" }
	| { kind: "test-set-form"; setId?: number }
	| { kind: "preconditions-list" }
	| { kind: "precondition-form"; preconditionId?: number }
	| { kind: "test-executions-list" }
	| { kind: "test-execution-form"; executionId?: number; prefillTestCaseId?: number }
	| { kind: "test-case-versions-list" }
	| { kind: "audit-log-list" }
	| { kind: "reports" }
	| { kind: "settings" }
	| { kind: "dashboard" };

const TAB_TO_VIEW: Record<string, ArgosView> = {
	"test-plans": { kind: "test-plans-list" },
	"test-cases": { kind: "test-cases-list" },
	"test-sets": { kind: "test-sets-list" },
	preconditions: { kind: "preconditions-list" },
	"test-executions": { kind: "test-executions-list" },
	"test-case-versions": { kind: "test-case-versions-list" },
	"audit-log": { kind: "audit-log-list" },
	reports: { kind: "reports" },
	settings: { kind: "settings" },
	dashboard: { kind: "dashboard" },
};

export function sidebarKeyForView(view: ArgosView): string {
	switch (view.kind) {
		case "test-plans-list":
		case "test-plans-form":
			return "test-plans";
		case "test-cases-list":
		case "test-case-form":
			return "test-cases";
		case "test-sets-list":
		case "test-set-form":
			return "test-sets";
		case "preconditions-list":
		case "precondition-form":
			return "preconditions";
		case "test-executions-list":
		case "test-execution-form":
			return "test-executions";
		case "test-case-versions-list":
			return "test-case-versions";
		case "audit-log-list":
			return "audit-log";
		case "reports":
			return "reports";
		case "settings":
			return "settings";
		case "dashboard":
			return "dashboard";
	}
}

export function useArgosRouting(initial: ArgosView = { kind: "test-plans-list" }) {
	const [view, setView] = useState<ArgosView>(initial);
	return {
		view,
		navigate: setView,
		goToTestPlansList: () => setView({ kind: "test-plans-list" }),
		goToTestPlanForm: (planId?: number) => setView({ kind: "test-plans-form", planId }),
		goToTestCasesList: () => setView({ kind: "test-cases-list" }),
		goToTestCaseForm: (caseId?: number) => setView({ kind: "test-case-form", caseId }),
		goToTestSetsList: () => setView({ kind: "test-sets-list" }),
		goToTestSetForm: (setId?: number) => setView({ kind: "test-set-form", setId }),
		goToPreconditionsList: () => setView({ kind: "preconditions-list" }),
		goToPreconditionForm: (preconditionId?: number) =>
			setView({ kind: "precondition-form", preconditionId }),
		goToTestExecutionsList: () => setView({ kind: "test-executions-list" }),
		goToTestExecutionForm: (executionId?: number) =>
			setView({ kind: "test-execution-form", executionId }),
		goToRunTestForCase: (testCaseId: number) =>
			setView({ kind: "test-execution-form", prefillTestCaseId: testCaseId }),
		goToTestCaseVersionsList: () => setView({ kind: "test-case-versions-list" }),
		goToAuditLog: () => setView({ kind: "audit-log-list" }),
		goToReports: () => setView({ kind: "reports" }),
		goToSettings: () => setView({ kind: "settings" }),
		goToTab: (tabKey: string) => {
			const next = TAB_TO_VIEW[tabKey];
			if (next !== undefined) setView(next);
		},
	};
}
