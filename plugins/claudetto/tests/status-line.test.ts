// A `command.run` hook the lab adds sits after claudetto's, so it stands in for the built-in `/statusline`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	DESCRIPTION,
	SETUP_AGENT_DENY,
	STATUSLINE,
} from "../src/blocks/status-line/hooks.ts";
import {
	STATUSLINE_COMMAND,
	statusLineSnippet,
} from "../src/tiers/status-line.ts";

const FILE = "/home/u/.claude/settings.json";

const BUILT_IN = "built-in /statusline ran";

interface Lab {
	readonly files: { readonly path: string; readonly text: string }[];
}

const lab = (on: On, held: string | undefined): Lab => {
	const state: Lab = { files: [] };
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
	on("fs.exists", () => ({ value: held !== undefined }));
	on("fs.read", () => {
		if (held === undefined) {
			throw new Error("no file");
		}
		return { value: held };
	});
	on("fs.write", (_$, e) => {
		state.files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("command.run", () => ({ text: BUILT_IN }));
	return state;
};

const run = ($: Engine, args: string) =>
	$.command.run({
		command: STATUSLINE,
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

const denying = JSON.stringify({
	permissions: { deny: [SETUP_AGENT_DENY] },
});

test("with no line set, `/statusline` writes both lines and names the file, with no context", async ($: Engine, on: On) => {
	const { files } = lab(on, undefined);

	const out = await run($, "");

	expect(files.map((file) => file.path)).toEqual([FILE]);
	const written = JSON.parse(files[0]?.text ?? "{}");
	expect(written.statusLine.command).toBe(STATUSLINE_COMMAND);
	expect(written.subagentStatusLine.command).toBe(
		`${STATUSLINE_COMMAND} --subagent`,
	);
	expect(out.text ?? "").toContain(`Wrote ${FILE}.`);
	expect(out.text ?? "").not.toContain(BUILT_IN);
	expect(out.context).toBeUndefined();
});

test("a user's own `statusLine` is unchanged, and the report says it was kept", async ($: Engine, on: On) => {
	const mine = { type: "command", command: "~/bin/my-line" };
	const { files } = lab(on, JSON.stringify({ statusLine: mine }));

	const out = await run($, "");

	expect(JSON.parse(files[0]?.text ?? "{}").statusLine).toEqual(mine);
	expect(out.text ?? "").toContain("Skipped statusLine: you set it");
	expect(out.context).toBeUndefined();
});

test("a second run with both lines in place writes no file", async ($: Engine, on: On) => {
	const { files } = lab(on, JSON.stringify(statusLineSnippet()));

	const out = await run($, "");

	expect(files).toEqual([]);
	expect(out.text).toBe("Wrote no key.");
});

test("a settings file that is not a JSON object is left as it is, and the answer names it", async ($: Engine, on: On) => {
	const { files } = lab(on, '{ "model": "opus",');

	const out = await run($, "");

	expect(files).toEqual([]);
	expect(out.text ?? "").toContain(FILE);
	expect(out.text ?? "").toContain("nothing was written");
	expect(out.context).toBeUndefined();
});

test("text with a denied `statusline-setup` agent is answered with the rule to remove", async ($: Engine, on: On) => {
	const { files } = lab(on, denying);

	const out = await run($, "show the time");

	expect(files).toEqual([]);
	expect(out.text ?? "").toContain(SETUP_AGENT_DENY);
	expect(out.text ?? "").toContain("permissions.deny");
	expect(out.text ?? "").not.toContain(BUILT_IN);
	expect(out.context).toBeUndefined();
});

test("text with the agent allowed runs the built-in `/statusline`", async ($: Engine, on: On) => {
	const { files } = lab(on, "{}");

	const out = await run($, "show the time");

	expect(files).toEqual([]);
	expect(out.text).toBe(BUILT_IN);
});

test("a hook that throws passes the command on to the built-in", async ($: Engine, on: On) => {
	on("env.get", () => {
		throw new Error("env unavailable");
	});
	on("command.run", () => ({ text: BUILT_IN }));

	const out = await run($, "");

	expect(out.text).toBe(BUILT_IN);
});

test("the `/statusline` listing says it makes no model call", async ($: Engine, on: On) => {
	on("command.describe", (_$, e) => ({
		description: e.description,
		isHidden: false,
	}));

	const out = await $.command.describe({
		command: STATUSLINE,
		description: "Set up Claude Code's status line UI",
		isHidden: false,
		immediate: false,
		provider: { plugin: "claude-code", tier: "core" },
	});

	expect(out.description).toBe(DESCRIPTION);
});

test("a write that fails says so and leaves the built-in unrun", async ($: Engine, on: On) => {
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
	on("fs.exists", () => ({ value: false }));
	on("fs.write", () => {
		throw new Error("read-only");
	});
	on("command.run", () => ({ text: BUILT_IN }));

	const out = await run($, "");

	expect(out.text ?? "").toContain(`Could not write ${FILE}`);
	expect(out.text ?? "").toContain("Nothing changed.");
	expect(out.text ?? "").not.toContain(BUILT_IN);
});
