import { init, ready } from "azure-devops-extension-sdk";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

init();
ready().then(() => {
	const el = document.getElementById("root");
	if (el) {
		createRoot(el).render(<App />);
	}
});
