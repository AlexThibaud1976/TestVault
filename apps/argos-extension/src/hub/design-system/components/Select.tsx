import type { SelectHTMLAttributes } from "react";

interface SelectOption {
	value: string;
	label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
	options: SelectOption[];
}

export function Select({ options, ...rest }: SelectProps) {
	return (
		<select
			style={{
				width: "100%",
				border: "1px solid var(--neutral-5)",
				borderRadius: "var(--r-1)",
				padding: "6px 32px 6px 8px",
				fontFamily: "var(--font-family)",
				fontSize: "var(--t-body)",
				background: "var(--neutral-0)",
				color: "var(--neutral-9)",
				appearance: "none",
				backgroundImage:
					"url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='none' stroke='%23605E5C' stroke-width='1.5'%3e%3cpath d='M4 6l4 4 4-4'/%3e%3c/svg%3e\")",
				backgroundRepeat: "no-repeat",
				backgroundPosition: "right 10px center",
				cursor: "pointer",
			}}
			{...rest}
		>
			{options.map((opt) => (
				<option key={opt.value} value={opt.value}>
					{opt.label}
				</option>
			))}
		</select>
	);
}
