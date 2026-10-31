import { KEY_GROUPS } from "../../tiers/groups.ts";
import { refusedPaths } from "../../tiers/keys.ts";
import {
	type Applied,
	applyTier,
	type Json,
	type Leaf,
	leavesOf,
	valueAt,
	withValue,
} from "../../tiers/merge.ts";
import type { TierSnippet } from "../../tiers/snippet.ts";

export interface Difference {
	/** What the model sends back to keep it: a dotted path, or a toggle's `path=value`. */
	readonly id: string;
	readonly group: string;
	readonly now?: unknown;
	readonly claudetto: unknown;
	readonly why?: string;
}

interface Toggle extends Leaf {
	readonly why: string;
}

const SANDBOX = "sandbox";

/** Values the snippet does not hold, which a user picks on purpose. */
const TOGGLES: readonly Toggle[] = [
	{
		path: [SANDBOX, "enabled"],
		value: false,
		why: "Runs `Bash` outside the sandbox, so every command that is not allowed goes to a prompt or the classifier.",
	},
	{
		path: [SANDBOX, "network", "allowLocalBinding"],
		value: true,
		why: "Lets a sandboxed command listen on a local port, such as a test server. Without it the bind fails with `EPERM`.",
	},
];

const dotted = (leaf: Leaf): string => leaf.path.join(".");

const toggleId = (toggle: Toggle): string =>
	`${dotted(toggle)}=${JSON.stringify(toggle.value)}`;

const OTHER = "Other";

const groupOf = (path: readonly string[]): string =>
	KEY_GROUPS.find(
		(group) =>
			group.keys.includes(path.join(".")) || group.keys.includes(path[0] ?? ""),
	)?.label ?? OTHER;

const leavesNamed = (snippet: TierSnippet): Map<string, Leaf> =>
	new Map(leavesOf(snippet).map((leaf) => [dotted(leaf), leaf]));

/** Each key that a write would change, read through `applyTier`, so the diff and the write agree. */
export const differencesOf = (
	held: Json,
	snippet: TierSnippet,
): readonly Difference[] => {
	const applied = applyTier(held, snippet, refusedPaths(snippet));
	const changes = [
		...applied.written.map((w) => ({ id: w.path, claudetto: w.value })),
		...applied.skipped
			.filter((s) => s.why === "set")
			.map((s) => ({ id: s.path, claudetto: s.wanted })),
	];
	const named = leavesNamed(snippet);
	const ordered = [...named.keys()].flatMap((id) =>
		changes.filter((c) => c.id === id),
	);
	// Where the snippet ships no sandbox, the platform has none to turn off or to open.
	const sandboxed = valueAt(snippet, [SANDBOX, "enabled"]) === true;
	const toggles = TOGGLES.filter(
		(t) => sandboxed && valueAt(held, t.path) !== t.value,
	).map((t) => ({ id: toggleId(t), claudetto: t.value, why: t.why }));
	return [...ordered, ...toggles].map((change) => {
		const path = change.id.split("=")[0]?.split(".") ?? [];
		const now = valueAt(held, path);
		return {
			...change,
			group: groupOf(path),
			...(now === undefined ? {} : { now }),
		};
	});
};

export interface SetupWrite {
	readonly applied: Applied;
	/** Ids that name no key, or that name a key another id also names. */
	readonly refused: readonly string[];
}

const leafOf = (named: Map<string, Leaf>, id: string): Leaf | undefined =>
	named.get(id) ?? TOGGLES.find((t) => toggleId(t) === id);

/** A kept key replaces the user's value, so the second `applyTier` runs on settings with those keys cleared. */
export const setupWrite = (
	held: Json,
	snippet: TierSnippet,
	ids: readonly string[],
): SetupWrite => {
	const named = leavesNamed(snippet);
	const picked = ids.map((id) => ({ id, leaf: leafOf(named, id) }));
	const counts = new Map<string, number>();
	for (const { leaf } of picked) {
		if (leaf !== undefined) {
			counts.set(dotted(leaf), (counts.get(dotted(leaf)) ?? 0) + 1);
		}
	}
	const refused = picked
		.filter(({ leaf }) => leaf === undefined || counts.get(dotted(leaf)) !== 1)
		.map(({ id }) => id);
	let kept: Json = {};
	for (const { id, leaf } of picked) {
		if (leaf !== undefined && !refused.includes(id)) {
			kept = withValue(kept, leaf.path, leaf.value);
		}
	}
	const rejected = refusedPaths(kept);
	let cleared = held;
	for (const skip of applyTier(held, kept, rejected).skipped) {
		if (skip.why === "set") {
			cleared = withValue(cleared, skip.path.split("."), undefined);
		}
	}
	return { applied: applyTier(cleared, kept, rejected), refused };
};
