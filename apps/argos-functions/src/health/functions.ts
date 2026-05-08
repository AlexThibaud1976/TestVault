import { app } from "@azure/functions";
import { handleHealthRequest } from "./health-handler.js";

app.http("health", {
	methods: ["GET"],
	route: "v1/health",
	authLevel: "anonymous",
	handler: () => handleHealthRequest(),
});
