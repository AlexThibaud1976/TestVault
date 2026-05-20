import { createContext, useCallback, useContext, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
	id: string;
	kind: ToastKind;
	message: string;
}

interface ToastContextValue {
	show: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
	return useContext(ToastContext);
}

export function useArgosToast() {
	const { show } = useToast();
	return {
		success: (msg: string) => show("success", msg),
		error: (msg: string) => show("error", msg),
		info: (msg: string) => show("info", msg),
	};
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	const show = useCallback((kind: ToastKind, message: string) => {
		const id = `${Date.now()}-${Math.random()}`;
		setToasts((prev) => [...prev, { id, kind, message }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 4000);
	}, []);

	function dismiss(id: string) {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}

	return (
		<ToastContext.Provider value={{ show }}>
			{children}
			<div
				style={{
					position: "fixed",
					bottom: 24,
					right: 24,
					zIndex: 9999,
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				{toasts.map((t) => (
					<button
						key={t.id}
						type="button"
						data-testid={`toast-${t.kind}`}
						style={{
							padding: "12px 16px",
							borderRadius: 4,
							backgroundColor:
								t.kind === "success" ? "#107c10" : t.kind === "error" ? "#a4262c" : "#0078d4",
							color: "white",
							minWidth: 200,
							maxWidth: 400,
							boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
							cursor: "pointer",
							border: "none",
							textAlign: "left",
						}}
						onClick={() => dismiss(t.id)}
					>
						{t.message}
					</button>
				))}
			</div>
		</ToastContext.Provider>
	);
}
