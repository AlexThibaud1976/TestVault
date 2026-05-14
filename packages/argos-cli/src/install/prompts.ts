import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

async function ask(question: string): Promise<string> {
	const rl = createInterface({ input: stdin, output: stdout });
	try {
		return await rl.question(question);
	} finally {
		rl.close();
	}
}

async function askHidden(question: string): Promise<string> {
	const rl = createInterface({ input: stdin, output: stdout });
	process.stdout.write(question);
	try {
		process.stdout.write("(PAT will be visible) ");
		return await rl.question("");
	} finally {
		rl.close();
	}
}

export async function promptForMissing(field: "orgUrl" | "project" | "pat"): Promise<string> {
	switch (field) {
		case "orgUrl":
			return ask("ADO Organisation URL (e.g. https://dev.azure.com/acme): ");
		case "project":
			return ask("ADO Project name: ");
		case "pat":
			return askHidden("Personal Access Token (Process Read & manage scope): ");
	}
}

export async function promptForConfirm(message: string): Promise<boolean> {
	const answer = await ask(`${message} [y/N]: `);
	return answer.trim().toLowerCase().startsWith("y");
}

export async function promptForSchemaUpdate(_state: {
	missingWitRefs: string[];
}): Promise<boolean> {
	console.log("Schema update will install the missing WIT types listed above.");
	return promptForConfirm("Proceed with schema update?");
}
