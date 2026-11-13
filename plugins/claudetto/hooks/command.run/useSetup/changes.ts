import { wallRule } from "../../tool.check/useBashRules/walled";
import { isRecord } from "../../tools";
import { type Group, type Json, leaves, setAt, valueAt } from "./settings";

export interface Change {
	readonly path: string;
	readonly had: unknown;
	readonly wanted: unknown;
}

const same = (a: unknown, b: unknown): boolean =>
	JSON.stringify(a) === JSON.stringify(b);

const LINK_LIST = "worktree.symlinkDirectories";

const isMergedList = (path: readonly string[]): boolean =>
	path[0] === "permissions" || path.join(".") === LINK_LIST;

/** A permission list or the worktree link list keeps every entry the user holds and adds ours. */
const wantedAt = (
	path: readonly string[],
	had: unknown,
	value: unknown,
): unknown => {
	if (isMergedList(path) && Array.isArray(had) && Array.isArray(value)) {
		const held: unknown[] = had;
		const added: unknown[] = value;
		return [...held, ...added.filter((rule) => !held.includes(rule))];
	}
	return value;
};

export const changesOf = (held: Json, group: Group): readonly Change[] =>
	leaves(group.settings).flatMap(({ path, value }) => {
		const had = valueAt(held, path);
		const wanted = wantedAt(path, had, value);
		return same(had, wanted) ? [] : [{ path: path.join("."), had, wanted }];
	});

/** `fill` writes the keys the user has not set and the rules a list lacks; `replace` writes the others too. */
export const applyChanges = (
	held: Json,
	changes: readonly Change[],
	mode: "fill" | "replace",
): Json => {
	let settings = held;
	for (const change of changes) {
		if (
			mode === "replace" ||
			change.had === undefined ||
			change.path.startsWith("permissions.") ||
			change.path === LINK_LIST
		) {
			settings = setAt(settings, change.path.split("."), change.wanted);
		}
	}
	return settings;
};

// The plan's internal names in the login record. Ultra (`default_claude_max_20x`) has no 5-hour window, so it gets no cap; the caps are the author's choice.
const SUBAGENT_CAPS: Readonly<Record<string, number>> = {
	claude_pro: 3,
	default_claude_max_5x: 4,
};

/** The subagent cap group for the plan in the login record, or `undefined` for Ultra, an API key, or a plan claudetto has no cap for. */
export const capGroup = (login?: Json): Group | undefined => {
	const account = login?.["oauthAccount"];
	const plan = (
		isRecord(account)
			? [account["organizationRateLimitTier"], account["organizationType"]]
			: []
	).find(
		(name): name is string =>
			typeof name === "string" && Object.hasOwn(SUBAGENT_CAPS, name),
	);
	const cap = plan === undefined ? undefined : SUBAGENT_CAPS[plan];
	return cap === undefined
		? undefined
		: {
				label: "Subagent cap",
				why: `Caps the subagents that run at once at ${cap}: the ${plan} plan has a 5-hour window, and each subagent spends from it.`,
				settings: {
					env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: String(cap) },
				},
			};
};

/** The gate's wall vanishes with the plugin; a deny rule in the settings outlives it. */
export const wallGroup = (walls: readonly string[]): Group | undefined =>
	walls.length === 0
		? undefined
		: {
				label: "Protected paths",
				why: `Denies Read under ${walls.join(", ")}, the protectedPaths option, so Claude Code blocks the read even without the plugin and the startup notice stays silent.`,
				settings: {
					permissions: { deny: walls.map((item) => wallRule(item)) },
				},
			};

/** `undefined` when the project root holds no ignored dependency folder. */
export const linkGroup = (folders: readonly string[]): Group | undefined =>
	folders.length === 0
		? undefined
		: {
				label: "Worktree folders",
				why: `Links ${folders.join(", ")} from the project root into each worktree, so a worktree agent has its dependencies without a new install.`,
				settings: { worktree: { symlinkDirectories: folders } },
			};

/** Claude Code's temp folder is per user; macOS reaches it as `/tmp` and as `/private/tmp`. */
export const tempGroup = (uid: string): Group => ({
	label: "Temp folder edits",
	why: `Allows Edit and Write under /tmp/claude-${uid}, Claude Code's temp folder, so a probe file there needs no approval.`,
	settings: {
		permissions: {
			allow: [
				`Edit(//tmp/claude-${uid}/**)`,
				`Edit(//private/tmp/claude-${uid}/**)`,
			],
		},
	},
});

export const settingsText = (settings: Json): string =>
	`${JSON.stringify(settings, undefined, 2)}\n`;

/** The settings a file holds, `{}` for no file, or `undefined` when the text is not a JSON object. */
export const parseSettings = (
	text: string | undefined,
	log: (message: string) => void,
): Json | undefined => {
	if (text === undefined) {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(text);
		return isRecord(parsed) ? parsed : undefined;
	} catch (error) {
		log(`The settings text did not parse (${String(error)})`);
		return undefined;
	}
};
