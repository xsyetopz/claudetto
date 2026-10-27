// The `off` lists of the `prompt` slice equal the `off` rows of the verdict tables,
// except the rows that a setting of the snippet already covers.

import { expect, test } from "bun:test";
import { VERDICTS } from "../../../../dev/builtins/verdicts.ts";
import { OFF_ATTACHMENTS } from "../../../../plugins/claudetto/modules/session/prompt/domain/off.ts";
import { SNIPPET } from "../../../../plugins/claudetto/modules/setup/prompts.ts";

/** The names of a list, sorted. */
const sorted = (list: readonly string[]): string[] =>
	[...list].sort((a, b) => Number(a > b) - Number(a < b));

/** The names of the `off` rows of one group. */
const offNames = (group: string): string[] =>
	Object.entries(VERDICTS)
		.filter(([row, v]) => row.startsWith(`${group}:`) && v.verdict === "off")
		.map(([row]) => row.slice(group.length + 1))
		.sort();

const env: Record<string, string> = SNIPPET.env;
const keys: Record<string, unknown> = { ...SNIPPET };
const deny = SNIPPET.permissions.deny;

/** An `off` row that a setting covers, with the setting: an `env` name, a settings key, or a deny rule. */
interface Covered {
	env?: string;
	key?: string;
	deny?: string;
}

const COVERED: Record<string, Covered> = {
	"attachments:advisor_tool": { env: "CLAUDE_CODE_DISABLE_ADVISOR_TOOL" },
	"attachments:session_cron_carry": { env: "CLAUDE_CODE_DISABLE_CRON" },
	"attachments:task_reminder": { deny: "TaskUpdate" },
	"attachments:workflow_keyword_request": { key: "enableWorkflows" },
	"commands:advisor": { env: "CLAUDE_CODE_DISABLE_ADVISOR_TOOL" },
	"commands:artifacts": { key: "enableArtifact" },
	"commands:extra-usage": { env: "DISABLE_EXTRA_USAGE_COMMAND" },
	"commands:usage-credits": { env: "DISABLE_EXTRA_USAGE_COMMAND" },
	"commands:install-github-app": { env: "DISABLE_INSTALL_GITHUB_APP_COMMAND" },
	"commands:fast": { env: "CLAUDE_CODE_DISABLE_FAST_MODE" },
	"commands:remote-control": { key: "disableRemoteControl" },
	"commands:workflows": { key: "enableWorkflows" },
};

/** The names of the `off` rows of one group that no setting covers. */
const hooked = (group: string): string[] =>
	offNames(group).filter((name) => !(`${group}:${name}` in COVERED));

test("the `off` attachment kinds equal the `off` rows that no setting covers", () => {
	expect(sorted(OFF_ATTACHMENTS)).toStrictEqual(hooked("attachments"));
});

test("a setting covers each `off` command row, because no hook hides a command (fault 30)", () => {
	expect(hooked("commands")).toStrictEqual([]);
});

test("each covered `off` row has its setting in the snippet", () => {
	const rows = Object.entries(COVERED);
	expect(rows.map(([row]) => VERDICTS[row]?.verdict)).toStrictEqual(
		rows.map(() => "off"),
	);
	const covered = (pick: (how: Covered) => string | undefined): string[] =>
		rows.flatMap(([, how]) => pick(how) ?? []);
	expect(
		covered((how) => how.env).filter((name) => env[name] === undefined),
	).toStrictEqual([]);
	expect(
		covered((how) => how.key).filter((name) => keys[name] === undefined),
	).toStrictEqual([]);
	expect(
		covered((how) => how.deny).filter((rule) => !deny.includes(rule)),
	).toStrictEqual([]);
});

test("the `false` entries of `enabledPlugins` are the `off` plugin rows", () => {
	const off = Object.entries(SNIPPET.enabledPlugins)
		.filter(([, on]) => on === false)
		.map(([name]) => name);
	expect(sorted(off)).toStrictEqual(
		offNames("plugins").map((name) => `cc-plugin-${name}@builtin`),
	);
});
