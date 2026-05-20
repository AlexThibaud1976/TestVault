import { useState } from "react";

export type ArgosView =
	| { kind: "test-plans-list" }
	| { kind: "test-plans-form"; planId?: number }
	| { kind: "test-cases-list" } // Sprint 2.19+
	| { kind: "test-sets-list" } // Sprint 2.19+
	| { kind: "preconditions-list" } // Sprint 2.19+
	| { kind: "reports" } // Sprint 2.20+
	| { kind: "settings" }; // Sprint 2.20+

const TAB_TO_VIEW: Record<string, ArgosView> = {
	"test-plans": { kind: "test-plans-list" },
	"test-cases": { kind: "test-cases-list" },
	"test-sets": { kind: "test-sets-list" },
	preconditions: { kind: "preconditions-list" },
	reports: { kind: "reports" },
	settings: { kind: "settings" },
};

export function sidebarKeyForView(view: ArgosView): string {
	switch (view.kind) {
		case "test-plans-list":
		case "test-plans-form":
			return "test-plans";
		case "test-cases-list":
			return "test-cases";
		case "test-sets-list":
			return "test-sets";
		case "preconditions-list":
			return "preconditions";
		case "reports":
			return "reports";
		case "settings":
			return "settings";
	}
}

export function useArgosRouting(initial: ArgosView = { kind: "test-plans-list" }) {
	const [view, setView] = useState<ArgosView>(initial);
	return {
		view,
		navigate: setView,
		goToTestPlansList: () => setView({ kind: "test-plans-list" }),
		goToTestPlanForm: (planId?: number) => setView({ kind: "test-plans-form", planId }),
		goToTab: (tabKey: string) => {
			const next = TAB_TO_VIEW[tabKey];
			if (next !== undefined) setView(next);
		},
	};
}
