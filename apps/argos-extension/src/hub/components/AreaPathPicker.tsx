import { Select } from "../design-system/index.js";
import { useAdoAreaPaths } from "../hooks/use-ado-classification-nodes.js";

interface AreaPathPickerProps {
	value: string;
	onChange: (path: string) => void;
	projectId: string;
	id?: string;
	required?: boolean;
}

export function AreaPathPicker({ value, onChange, projectId, id, required }: AreaPathPickerProps) {
	const { areas, isLoading, error } = useAdoAreaPaths(projectId);

	if (isLoading) {
		return (
			<div className="field-loading" aria-busy="true">
				Loading area paths...
			</div>
		);
	}

	if (error) {
		return (
			<div className="field-error" role="alert">
				Failed to load area paths: {error.message}
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
				...areas.map((a) => ({ value: a.path, label: a.path })),
			]}
		/>
	);
}
