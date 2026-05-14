import type { InstallProgressStep } from "@atconseil/argos-sdk";

export function renderProgressStep(step: InstallProgressStep): void {
	const prefix = `[${step.phase}]`;
	if (step.total !== undefined && step.current !== undefined) {
		console.log(`${prefix} ${step.message} (${step.current}/${step.total})`);
	} else {
		console.log(`${prefix} ${step.message}`);
	}
}
