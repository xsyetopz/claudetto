import { expect, test } from "bun:test";

interface Handler {
	readonly type: string;
	readonly prompt?: string;
	readonly command?: string;
}

const FAULTS = [
	"unchecked",
	"credited",
	"rules",
	"fallback",
	"unseen",
	"unfixed",
	"deferred",
	"options",
];

interface HooksFile {
	readonly hooks: { readonly Stop?: { readonly hooks: Handler[] }[] };
}

const isHooksFile = (value: unknown): value is HooksFile =>
	typeof value === "object" && value !== null && "hooks" in value;

const stopHandlers = async (): Promise<Handler[]> => {
	const file: unknown = await Bun.file(
		`${import.meta.dir}/../plugins/claudetto/hooks/hooks.json`,
	).json();
	if (!isHooksFile(file)) {
		throw new Error("hooks.json has no hooks");
	}
	return (file.hooks.Stop ?? []).flatMap((group) => group.hooks);
};

const gradePrompt = async (): Promise<string> => {
	const all = await stopHandlers();
	const handlers = all.filter((handler) => handler.type === "prompt");
	expect(handlers).toHaveLength(1);
	return handlers[0]?.prompt ?? "";
};

test("one prompt-type Stop hook grades the reply by model", async () => {
	const prompt = await gradePrompt();

	for (const fault of FAULTS) {
		expect(prompt).toContain(`- ${fault}:`);
	}
});

test("the arguments of a typed slash command count as the user's words", async () => {
	const prompt = await gradePrompt();

	expect(prompt).toContain("`/goal`");
	expect(prompt).toContain("arguments of a slash command");
});

test("the Stop open-items check is a command hook under the plugin root", async () => {
	const all = await stopHandlers();
	const commands = all
		.filter((handler) => handler.type === "command")
		.map((handler) => handler.command);

	expect(commands).toContain(
		`bun "\${CLAUDE_PLUGIN_ROOT}/scripts/open-items.ts"`,
	);
});
