import { app } from "@azure/functions";
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import type {
	GitPushEvent,
	IBddMappingReader,
	IBddTcService,
	IFileReader,
} from "./git-push-handler.js";
import { handleGitPush } from "./git-push-handler.js";

let _mappingReader: IBddMappingReader;
let _tcService: IBddTcService;
let _fileReader: IFileReader;

export function setBddSyncServices(
	mappingReader: IBddMappingReader,
	tcService: IBddTcService,
	fileReader: IFileReader
): void {
	_mappingReader = mappingReader;
	_tcService = tcService;
	_fileReader = fileReader;
}

type AdoGitPushPayload = {
	eventType?: string;
	resource?: {
		repository?: { remoteUrl?: string };
		refUpdates?: Array<{ name?: string }>;
		commits?: Array<{
			changes?: Array<{
				item?: { path?: string };
				changeType?: string;
			}>;
		}>;
	};
};

function parseAdoPayload(body: AdoGitPushPayload): GitPushEvent | null {
	if (body.eventType !== "git.push") return null;

	const resource = body.resource;
	const repoUrl = resource?.repository?.remoteUrl;
	const refName = resource?.refUpdates?.[0]?.name ?? "";
	const branch = refName.replace("refs/heads/", "");
	const commits = resource?.commits ?? [];

	if (!repoUrl || !branch) return null;

	const changedFiles: GitPushEvent["changedFiles"] = [];
	for (const commit of commits) {
		for (const change of commit.changes ?? []) {
			const path = change.item?.path;
			if (!path) continue;
			const rawType = (change.changeType ?? "").toLowerCase();
			const changeType = rawType === "add" ? "add" : rawType === "delete" ? "delete" : "edit";
			changedFiles.push({ path, changeType });
		}
	}

	return { repoUrl, branch, changedFiles };
}

async function gitPushSyncHandler(
	request: HttpRequest,
	context: InvocationContext
): Promise<HttpResponseInit> {
	let body: AdoGitPushPayload;
	try {
		body = (await request.json()) as AdoGitPushPayload;
	} catch {
		return { status: 400, body: "Invalid JSON" };
	}

	const event = parseAdoPayload(body);
	if (!event) {
		return { status: 200, body: "Not a git.push event — ignored" };
	}

	const result = await handleGitPush(event, _mappingReader, _tcService, _fileReader);
	context.log(`BDD sync: ${JSON.stringify(result)}`);
	return { status: 200, jsonBody: result };
}

app.http("gitPushBddSync", {
	methods: ["POST"],
	authLevel: "function",
	route: "v1/bdd/git-push",
	handler: gitPushSyncHandler,
});
