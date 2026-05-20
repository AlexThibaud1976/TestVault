import { useCallback, useState } from "react";
import { useArgosToast } from "../components/Toast.js";

export type WitKind =
	| "TestCase"
	| "TestPlan"
	| "TestSet"
	| "Precondition"
	| "TestExecution"
	| "TestCaseVersion"
	| "AuditLog";

const WIT_LABELS: Record<WitKind, string> = {
	TestCase: "Test Case",
	TestPlan: "Test Plan",
	TestSet: "Test Set",
	Precondition: "Precondition",
	TestExecution: "Test Execution",
	TestCaseVersion: "Test Case Version",
	AuditLog: "Audit Log",
};

export interface UseArgosCreateOptions<TDraft> {
	kind: WitKind;
	createFn: (draft: TDraft) => Promise<{ id: number }>;
	onSuccess?: (result: { id: number }) => void | Promise<void>;
}

export function useArgosCreate<TDraft>({
	kind,
	createFn,
	onSuccess,
}: UseArgosCreateOptions<TDraft>) {
	const [isCreating, setIsCreating] = useState(false);
	const toast = useArgosToast();

	const mutate = useCallback(
		async (draft: TDraft) => {
			setIsCreating(true);
			try {
				const result = await createFn(draft);
				const label = WIT_LABELS[kind];
				toast.success(`${label} #${result.id} created`);
				if (onSuccess) await onSuccess(result);
				return result;
			} catch (error) {
				const msg = error instanceof Error ? error.message : "Unknown error";
				toast.error(`Failed to create ${WIT_LABELS[kind]}: ${msg}`);
				throw error;
			} finally {
				setIsCreating(false);
			}
		},
		[kind, createFn, onSuccess, toast]
	);

	return { mutate, isCreating };
}
