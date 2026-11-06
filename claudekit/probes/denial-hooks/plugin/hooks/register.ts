import type { Hook, On } from "claude-code";

type Api = Parameters<Hook<"classic.Stop">>[0];

interface Entry {
	toolDenialKind?: string;
	permissionDecision?: unknown;
	message?: { content?: { tool_use_id?: string }[] | string };
}

const record = async ($: Api, e: object): Promise<void> => {
	const dump = (await $.env.get("DENIAL_DUMP")) as string;
	const line: Record<string, unknown> = { ...e };
	// What the transcript holds for each call of the batch at the moment the hook runs.
	if ("tool_calls" in e) {
		const ids = new Set((e as { tool_calls: { tool_use_id: string }[] }).tool_calls.map((c) => c.tool_use_id));
		const lines: Entry[] = (await $.fs.read(line.transcript_path as string))
			.trim()
			.split("\n")
			.map((l: string) => JSON.parse(l));
		line.transcript_entries = lines.flatMap((l) => {
			const block = Array.isArray(l.message?.content) ? l.message.content.find((b) => ids.has(b.tool_use_id ?? "")) : undefined;
			return block ? [{ id: block.tool_use_id, toolDenialKind: l.toolDenialKind, permissionDecision: l.permissionDecision }] : [];
		});
	}
	const before = (await $.fs.exists(dump)) ? await $.fs.read(dump) : "";
	await $.fs.write(dump, `${before}${JSON.stringify(line)}\n`);
};

export const register = (on: On): void => {
	on("classic.UserPromptSubmit", async ($, e, next) => (await record($, e), next(e)));
	on("classic.PreToolUse", async ($, e, next) => (await record($, e), next(e)));
	on("classic.PostToolUse", async ($, e, next) => (await record($, e), next(e)));
	on("classic.PostToolUseFailure", async ($, e, next) => (await record($, e), next(e)));
	on("classic.PostToolBatch", async ($, e, next) => (await record($, e), next(e)));
	on("classic.PermissionDenied", async ($, e, next) => (await record($, e), next(e)));
	on("classic.Stop", async ($, e, next) => (await record($, e), next(e)));
};
