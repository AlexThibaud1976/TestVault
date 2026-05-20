import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "subtle" | "danger";
export type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	icon?: ReactNode;
}

export function Button({
	variant = "primary",
	size = "medium",
	icon,
	children,
	...rest
}: ButtonProps) {
	return (
		<button type="button" className={`ds-btn ds-btn-${variant} ds-btn-${size}`} {...rest}>
			{icon !== undefined && <span className="ds-btn-icon">{icon}</span>}
			{children !== undefined && <span className="ds-btn-label">{children}</span>}
		</button>
	);
}
