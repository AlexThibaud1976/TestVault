import "./Sidebar.css";

const NAV_ITEMS = [
	{
		key: "test-plans",
		label: "Test Plans",
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				aria-hidden="true"
			>
				<path d="M2 4h12M2 8h12M2 12h12" />
				<circle cx="2" cy="4" r="0.5" fill="currentColor" />
				<circle cx="2" cy="8" r="0.5" fill="currentColor" />
				<circle cx="2" cy="12" r="0.5" fill="currentColor" />
			</svg>
		),
	},
	{
		key: "test-cases",
		label: "Test Cases",
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				aria-hidden="true"
			>
				<path d="M6 2l-1 3h6L10 2M5 5h6M5 5l-1 2h8l-1-2M4 7l-1 7h10l-1-7" />
			</svg>
		),
	},
	{
		key: "test-sets",
		label: "Test Sets",
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				aria-hidden="true"
			>
				<path d="M2 4a1 1 0 0 1 1-1h3l2 2h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" />
			</svg>
		),
	},
	{
		key: "preconditions",
		label: "Preconditions",
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				aria-hidden="true"
			>
				<path d="M8 2 L14 13 L2 13 Z" />
				<line x1="8" y1="6" x2="8" y2="10" />
				<circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
			</svg>
		),
	},
	{
		key: "reports",
		label: "Reports",
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				aria-hidden="true"
			>
				<line x1="3" y1="13" x2="3" y2="9" />
				<line x1="7" y1="13" x2="7" y2="5" />
				<line x1="11" y1="13" x2="11" y2="7" />
				<line x1="2" y1="14" x2="14" y2="14" />
			</svg>
		),
	},
	{
		key: "settings",
		label: "Settings",
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				aria-hidden="true"
			>
				<circle cx="8" cy="8" r="2" />
				<path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.5 3.5l-1.5 1.5M5 11l-1.5 1.5M12.5 12.5l-1.5-1.5M5 5L3.5 3.5" />
			</svg>
		),
	},
];

interface SidebarProps {
	activeKey: string;
	onNavigate: (key: string) => void;
}

export function Sidebar({ activeKey, onNavigate }: SidebarProps) {
	return (
		<aside className="argos-sidebar">
			<div className="argos-sidebar-header">
				<svg
					className="argos-sidebar-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#0C447C"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
					<circle cx="12" cy="11" r="3.5" />
					<circle cx="12" cy="11" r="1.5" fill="#0C447C" stroke="none" />
				</svg>
				<div className="argos-sidebar-title">Argos</div>
			</div>
			<nav className="argos-sidebar-nav" aria-label="Argos navigation">
				{NAV_ITEMS.map((item) => (
					<button
						key={item.key}
						type="button"
						className={`argos-sidebar-nav-item${item.key === activeKey ? " active" : ""}`}
						onClick={() => onNavigate(item.key)}
						aria-current={item.key === activeKey ? "page" : undefined}
					>
						{item.icon}
						<span>{item.label}</span>
					</button>
				))}
			</nav>
		</aside>
	);
}
