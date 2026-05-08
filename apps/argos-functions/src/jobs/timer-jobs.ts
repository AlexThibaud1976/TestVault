import { type InvocationContext, app } from "@azure/functions";

app.timer("quotaReset", {
	schedule: "0 0 0 1 * *",
	handler: async (_myTimer: unknown, ctx: InvocationContext) => {
		ctx.log("Monthly quota reset job started");
	},
});

app.timer("auditRetention", {
	schedule: "0 0 3 * * *",
	handler: async (_myTimer: unknown, ctx: InvocationContext) => {
		ctx.log("Audit retention purge job started");
	},
});
