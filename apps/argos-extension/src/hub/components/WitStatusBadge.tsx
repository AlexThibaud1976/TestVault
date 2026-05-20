import { Badge, type BadgeKind } from "../design-system/index.js";

interface WitStatusBadgeProps {
	status: string;
}

function getKind(status: string): BadgeKind {
	const s = status.toLowerCase();
	if (s === "pass" || s === "active" || s === "approved" || s === "ready") return "success";
	if (s === "fail" || s === "blocked" || s === "rejected" || s === "closed") return "error";
	if (s === "draft" || s === "pending" || s === "design" || s === "deprecated") return "warning";
	if (s === "inprogress" || s === "in progress" || s === "review" || s === "locked") return "info";
	return "neutral";
}

export function WitStatusBadge({ status }: WitStatusBadgeProps) {
	return <Badge kind={getKind(status)}>{status}</Badge>;
}
