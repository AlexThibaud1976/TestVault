import { Button } from "../design-system/index.js";
import "./WitListHeader.css";

interface WitListHeaderProps {
	title: string;
	count: number;
	onImport?: () => void;
	onCreate?: () => void;
	createLabel?: string;
}

export function WitListHeader({
	title,
	count,
	onImport,
	onCreate,
	createLabel,
}: WitListHeaderProps) {
	return (
		<div className="argos-list-header">
			<div className="argos-list-header__title-group">
				<h1 className="argos-list-header__title">{title}</h1>
				<span className="argos-list-header__count">{count}</span>
			</div>
			<div className="argos-list-header__actions">
				{onImport !== undefined && (
					<Button variant="secondary" onClick={onImport}>
						Import
					</Button>
				)}
				{onCreate !== undefined && (
					<Button variant="primary" onClick={onCreate}>
						{createLabel ?? "+ New"}
					</Button>
				)}
			</div>
		</div>
	);
}
