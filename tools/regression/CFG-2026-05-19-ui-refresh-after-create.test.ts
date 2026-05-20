import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG UI refresh after create Sprint 2.17", () => {
	const root = resolve(__dirname, "../..");

	it("useArgosCreate hook file exists", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/hooks/use-argos-create.ts");
		expect(existsSync(path)).toBe(true);
	});

	it("useArgosCreate hook exports the hook and WitKind type", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/hooks/use-argos-create.ts");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("useArgosCreate");
		expect(content).toContain("WitKind");
		expect(content).toContain("isCreating");
		expect(content).toContain("onSuccess");
		expect(content).toContain("toast");
	});

	it("useArgosCreate hook supports all 7 WIT kinds", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/hooks/use-argos-create.ts");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("TestCase");
		expect(content).toContain("TestPlan");
		expect(content).toContain("TestSet");
		expect(content).toContain("Precondition");
		expect(content).toContain("TestExecution");
		expect(content).toContain("TestCaseVersion");
		expect(content).toContain("AuditLog");
	});

	it("Toast component file exists", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/components/Toast.tsx");
		expect(existsSync(path)).toBe(true);
	});

	it("Toast component exports ToastProvider and useArgosToast", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/components/Toast.tsx");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("ToastProvider");
		expect(content).toContain("useArgosToast");
		expect(content).toContain("useToast");
	});

	it("useArgosList hook file exists", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/hooks/use-argos-list.ts");
		expect(existsSync(path)).toBe(true);
	});

	it("TestPlanForm has toast error handling", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/TestPlanForm.tsx");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("useArgosToast");
		expect(content).toContain("toast.success");
		expect(content).toContain("toast.error");
	});

	it("TestCaseForm has toast error handling", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/TestCaseForm.tsx");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("useArgosToast");
		expect(content).toContain("toast.success");
		expect(content).toContain("toast.error");
	});

	it("TestSetForm has toast error handling", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/TestSetForm.tsx");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("useArgosToast");
		expect(content).toContain("toast.success");
		expect(content).toContain("toast.error");
	});

	it("PreconditionForm has toast error handling", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/PreconditionForm.tsx");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("useArgosToast");
		expect(content).toContain("toast.success");
		expect(content).toContain("toast.error");
	});

	it("App.tsx wraps with ToastProvider", () => {
		const path = resolve(root, "apps/argos-extension/src/hub/App.tsx");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("ToastProvider");
	});
});
