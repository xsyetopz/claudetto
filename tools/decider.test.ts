import { expect, test } from "bun:test";

import { Glob } from "bun";

import { REPLY_REGISTER } from "../plugins/claudetto/hooks/decider/questions.ts";
import { contentsOf, fieldOf, listOf, PLUGINS } from "./validator.ts";

const ROOT = `${import.meta.dir}/..`;

const sourcesWith = async (needle: string): Promise<string[]> => {
	const found: string[] = [];
	for await (const path of new Glob("plugins/*/hooks/**/*.ts").scan(ROOT)) {
		if (/\.(?:test|mock)\.ts$/u.test(path)) {
			continue;
		}
		const text = await Bun.file(`${ROOT}/${path}`).text();
		if (text.includes(needle)) {
			found.push(path);
		}
	}
	return found;
};

test("only the Decider module names the TypeSafe host", async () => {
	expect(await sourcesWith("api.typesafe.ai")).toEqual([
		"plugins/claudetto/hooks/decider/jev.ts",
	]);
});

const envReadsOf = async (plugin: string): Promise<string[]> => {
	const contents = await contentsOf(plugin);
	return contents
		.flatMap((content) => listOf(fieldOf(content, "notes")))
		.filter((note) => typeof note === "string" && note.includes("env reads:"))
		.flatMap((note) => String(note).split("env reads:")[1]?.split(",") ?? [])
		.map((name) => name.trim());
};

test("the validator lists the TypeSafe key among the reads of claudetto alone", async () => {
	const reads = await Promise.all(PLUGINS.map((name) => envReadsOf(name)));

	expect(reads.map((names) => names.includes("TYPESAFE_API_KEY"))).toEqual([
		true,
		false,
		false,
	]);
});

test("the reply-register questions are Nouls that each state what a yes and a no mean", () => {
	const questions = Object.values(REPLY_REGISTER.questions);

	expect(questions).toHaveLength(9);
	expect(questions.map((question) => question.type)).toEqual(
		questions.map(() => "noul"),
	);
	expect(
		questions.map((question) =>
			JSON.stringify(question).includes('"criteria":{"true":"'),
		),
	).toEqual(questions.map(() => true));
});

test("only the Decider and the decide tool read the TypeSafe key", async () => {
	expect(await sourcesWith('env.get("TYPESAFE_API_KEY")')).toEqual([
		"plugins/claudetto/hooks/decider/settle.ts",
		"plugins/claudetto/hooks/tool.call/useDecideTool/decide.ts",
	]);
});
