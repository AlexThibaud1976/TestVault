import type { InputHTMLAttributes } from "react";
import "./Input.css";

export type InputSize = "medium" | "large";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	inputSize?: InputSize;
}

export function Input({ inputSize = "medium", className, ...rest }: InputProps) {
	const sizeClass = inputSize === "large" ? " ds-input-large" : "";
	const searchClass = rest.type === "search" ? " ds-input-search" : "";
	return (
		<input
			className={`ds-input${sizeClass}${searchClass}${className ? ` ${className}` : ""}`}
			{...rest}
		/>
	);
}
