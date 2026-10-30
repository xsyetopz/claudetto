// The setup command: `/claudetto:setup` asks which settings to keep and writes them, so setup needs
// no checkout of this repository, no `bun`, and no `just`. `just setup` stays for the same work from
// a checkout.
//
// The output costs no tokens. A `command.run` hook that answers `{ text }` answers in place of the
// command, and leaving `context` out means the model reads nothing of the output: the person sees the
// report and the request that follows is unchanged.
//
// The listing of the command does cost. `just capture --arm plugin --shipped` read 31,909 characters
// against 31,861 with no command, so the row the model is told about is 48 characters, all of them in
// `messages`. The description in `commands/setup.md` is one short sentence for that reason: the first
// wording of it read 31,961, so 52 of the 100 characters were the description alone.
//
// Why a command and not a hook that answers the settings: a `settings.read` hook can rewrite the
// merged settings, and this file had one. It was dropped on a measurement. `just capture --arm plugin`
// read 61,353 characters and 12 tools with the hook and no file, against 31,861 and 9 tools with the
// file, so the readers that build the first request do not take the answer; the engine also logged
// `an answer without deniedMcpServers: unset for the reader`, which is an answer dropping a key that
// other readers want. A real `settings.json` is the one mechanism measured to deliver.
//
// Each decision is a pure function of another file, and each `$` call is in a helper of this file,
// because the engine's loader follows `$` into another file only through a `function` declaration,
// which the lint rules forbid. `register.ts` registers the hook by reference, as it does the gate's.

import type { EngineInterface, HookFor } from "claude-code";
import { settingsFileIn } from "../settings-file.ts";
import { groupLabels, KEY_GROUPS, keptSnippet } from "./groups.ts";
import { refusedPaths } from "./keys.ts";
import { applyTier, type Json, settingsText } from "./merge.ts";
import { tierReport } from "./report.ts";
import { tierSnippet, UNKNOWN_PLATFORM } from "./snippet.ts";
import { SNIPPET_ROW } from "./tiers.ts";

/** The command this hook answers, named as `CommandRunInput.command` spells it: the plugin's namespace and the name, with no slash. */
export const SETUP_COMMAND = "claudetto:setup";

/** The longest one `uname -s` run may take. */
const UNAME_MS = 2000;

/** What `uname -s` prints, lowercased, for each platform `../sandbox/sandbox.ts` supports, mapped to the spelling `process.platform` uses. */
const UNAME_PLATFORMS: Readonly<Record<string, string>> = {
	darwin: "darwin",
	linux: "linux",
};

/** The question the dialog asks. */
const QUESTION = "Which settings should claudetto write?";

/**
 * The platform that `uname -s` named, as `process.platform` spells it, or `UNKNOWN_PLATFORM` for any
 * other answer and for the empty answer of a run that failed. Windows has no `uname`, and the plugin
 * test environment has no process at all; both land on unknown, which writes no `sandbox.enabled`.
 */
export const platformNamed = (uname: string): string =>
	UNAME_PLATFORMS[uname.trim().toLowerCase()] ?? UNKNOWN_PLATFORM;

/** The labels of an answer of `$.ui.ask`, which comes back comma-joined, with any label the dialog did not offer dropped: the free text of the dialog's Other is no group. */
export const chosenGroups = (answer: string): readonly string[] => {
	const labels = groupLabels();
	return answer
		.split(",")
		.map((part) => part.trim())
		.filter((part) => labels.includes(part));
};

const isObject = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * One line for each group that was offered and not kept, so the output says what it did not write.
 *
 * The line carries the group's `why`, which is the one place a user reads what a group does: the
 * dialog of `$.ui.ask` shows labels and no descriptions, and a kept group is already spelled out by
 * the `Wrote` line of each of its keys, where a discarded group leaves no line of its own. The text
 * costs no tokens, because the hook returns it as `text` with no `context`.
 */
const discardedLines = (kept: readonly string[]): readonly string[] =>
	KEY_GROUPS.filter((group) => !kept.includes(group.label)).map(
		(group) =>
			`Discarded ${group.label}: no key of it was written, and a key you already have stays. What it would have done: ${group.why}`,
	);

/**
 * The whole report of one run: what was written, what was skipped, what was discarded, and that the
 * keys take effect in the next session, because the engine reads them when it starts.
 */
export const setupReport = (
	file: string,
	kept: readonly string[],
	applied: Parameters<typeof tierReport>[1],
): string =>
	[
		tierReport(undefined, applied),
		...discardedLines(kept),
		`Wrote ${file}. Restart Claude Code: the keys are read when it starts.`,
	].join("\n");

/** What `uname -s` printed, or the empty string when there is no such command and when there is no process at all. */
const unameOf = async ($: EngineInterface): Promise<string> => {
	try {
		const result = await $.process.run(["uname", "-s"], {
			timeoutMs: UNAME_MS,
		});
		return result.stdout;
	} catch {
		return "";
	}
};

/** The user settings file: under `CLAUDE_CONFIG_DIR` when it is set, and under `~/.claude` otherwise. */
const settingsPath = async ($: EngineInterface): Promise<string> => {
	const [configDir, home] = await Promise.all([
		$.env.get("CLAUDE_CONFIG_DIR"),
		$.env.get("HOME"),
	]);
	return settingsFileIn(
		configDir === undefined || configDir === "" ? `${home}/.claude` : configDir,
	);
};

/** The settings `file` holds, `{}` when it cannot be read, and none when it holds something that is no JSON object. */
const heldSettings = async (
	$: EngineInterface,
	file: string,
): Promise<Json | undefined> => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(await $.fs.read(file));
	} catch {
		return {};
	}
	return isObject(parsed) ? parsed : undefined;
};

/** The groups the person kept, and none when the dialog was dismissed or there was nobody to ask, as in a `claude -p` run. */
const askedGroups = async ($: EngineInterface): Promise<readonly string[]> => {
	try {
		const answer = await $.ui.ask(QUESTION, {
			options: [...groupLabels()],
			header: "Setup",
			multiSelect: true,
		});
		return chosenGroups(answer);
	} catch {
		return [];
	}
};

/**
 * Answers `/claudetto:setup`: asks which groups of `./groups.ts` to keep, merges those into the user
 * settings file with `applyTier`, which keeps every value already set and writes no key of
 * `../refused.ts`, and reports what it did. The model reads none of it.
 *
 * A failed write is reported and not thrown, because a hook that throws is skipped and the command
 * would then fall through to the body of `commands/setup.md` and reach the model as a prompt.
 *
 * Nothing creates the config directory first: `$.fs.write` writes "to a file, creating it and its
 * directories as needed" (`extend/mod-api/calls/fs-store-state`, `2.1.314`), where `setup.ts` needs
 * its own `mkdir` because it writes with `node:fs/promises`.
 */
export const onSetupCommand: HookFor<"command.run"> = async ($, _e, _next) => {
	const file = await settingsPath($);
	const held = await heldSettings($, file);
	if (held === undefined) {
		return { text: `${file} holds no JSON object, so nothing was written.` };
	}
	const kept = await askedGroups($);
	if (kept.length === 0) {
		return { text: "Nothing was chosen, so nothing was written." };
	}
	const snippet = keptSnippet(
		tierSnippet(SNIPPET_ROW, platformNamed(await unameOf($))),
		kept,
	);
	const applied = applyTier(held, snippet, refusedPaths(snippet));
	try {
		await $.fs.write(file, settingsText(applied.settings));
	} catch (error) {
		return {
			text: `Could not write ${file} (${String(error)}). Nothing changed.`,
		};
	}
	return { text: setupReport(file, kept, applied) };
};
