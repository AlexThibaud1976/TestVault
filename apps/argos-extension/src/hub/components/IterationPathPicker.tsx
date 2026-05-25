import { Select } from "../design-system/index.js";
import { useAdoIterations } from "../hooks/use-ado-iterations.js";

interface IterationPathPickerProps {
	value: string;
	onChange: (path: string) => void;
	projectId: string;
	id?: string;
	required?: boolean;
}

export function IterationPathPicker({
	value,
	onChange,
	projectId,
	id,
	required,
}: IterationPathPickerProps) {
	const { iterations, isLoading, error } = useAdoIterations(projectId);

	if (isLoading) {
		return (
			<div className="field-loading" aria-busy="true">
				Loading iteration paths...
			</div>
		);
	}

	if (error) {
		return (
			<div className="field-error" role="alert">
				Failed to load iteration paths: {error.message}
			</div>
		);
	}

	return (
		<Select
			id={id}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			required={required}
			options={[
				{ value: "", label: "— None —" },
				...iterations.map((it) => ({ value: it.path, label: it.path })),
			]}
		/>
	);
}
