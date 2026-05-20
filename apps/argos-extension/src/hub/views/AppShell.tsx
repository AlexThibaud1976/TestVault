import type { ReactNode } from "react";
import "./AppShell.css";

interface AppShellProps {
	sidebar: ReactNode;
	children: ReactNode;
	drawer?: ReactNode;
}

export function AppShell({ sidebar, children, drawer }: AppShellProps) {
	return (
		<div className="argos-shell">
			{sidebar}
			<main className="argos-shell-main">{children}</main>
			{drawer !== undefined && <div className="argos-shell-drawer">{drawer}</div>}
		</div>
	);
}
