import type { ReactNode } from "react";

interface CardProps {
	children: ReactNode;
	style?: React.CSSProperties;
}

export function Card({ children, style }: CardProps) {
	return (
		<div
			style={{
				background: "var(--neutral-0)",
				border: "1px solid var(--neutral-4)",
				borderRadius: "var(--r-2)",
				padding: "var(--s-4)",
				boxShadow: "var(--shadow-2)",
				...style,
			}}
		>
			{children}
		</div>
	);
}
