// The one merge that validate and archive both run: a delta plan applied to a main spec's blocks.
import { type Block, fold, LINE_BREAK } from "./spec-lines.ts";
import type { Plan } from "./spec-plan.ts";
import { scenarios } from "./spec.ts";

const REQ_LINE = /^###\s*Requirement:.*$/imu;

// Scenario names of `current` that `incoming` does not carry, counting repeats.
export const missingScenarios = (current: Block, incoming: Block) => {
	const left = new Map<string, number>();
	for (const s of scenarios(incoming.raw)) {
		left.set(s.name, (left.get(s.name) ?? 0) + 1);
	}
	return scenarios(current.raw).flatMap(({ name }) => {
		const n = left.get(name) ?? 0;
		left.set(name, n - 1);
		return n > 0 ? [] : [name];
	});
};

export interface Failure {
	kind: "merge" | "scenario-loss";
	name: string;
	message: string;
}

interface Ctx {
	list: Block[];
	failures: Failure[];
}
const fail = (c: Ctx, kind: Failure["kind"], name: string, message: string) =>
	c.failures.push({ kind, name, message });
const find = (c: Ctx, name: string) => c.list.findIndex((b) => b.name === name);
const flat = (b: Block) => b.raw.replaceAll(LINE_BREAK, "\n").trim();
const same = (a: Block, b: Block) => flat(a) === flat(b);

const rename = (c: Ctx, { from, to }: { from: string; to: string }) => {
	const i = find(c, from);
	const old = c.list[i];
	if (!old) {
		const near =
			find(c, to) >= 0
				? c.list.find((b) => b.name !== to && fold(b.name) === fold(from))
				: undefined;
		// Source gone, target present: the rename was already synced.
		if (near) {
			fail(
				c,
				"merge",
				from,
				`RENAMED failed for "${from}": found "${near.name}"`,
			);
		} else if (find(c, to) < 0) {
			fail(c, "merge", from, `RENAMED failed for "${from}": source not found`);
		}
	} else if (find(c, to) >= 0) {
		fail(c, "merge", to, `RENAMED failed for "${to}": target already exists`);
	} else {
		c.list[i] = {
			name: to,
			raw: old.raw.replace(REQ_LINE, `### Requirement: ${to}`),
		};
	}
};

// An absent target is an already-synced removal; only a case/space near-miss is a typo.
const remove = (c: Ctx, name: string) => {
	const near = c.list.find((b) => fold(b.name) === fold(name));
	if (near && near.name !== name) {
		fail(
			c,
			"merge",
			name,
			`REMOVED failed for "${name}": not found, but "${near.name}" exists`,
		);
	}
	c.list = c.list.filter((b) => b.name !== name);
};

const modify = (c: Ctx, block: Block) => {
	const i = find(c, block.name);
	const old = c.list[i];
	if (!old) {
		fail(
			c,
			"merge",
			block.name,
			`MODIFIED failed for "${block.name}": not found`,
		);
		return;
	}
	const lost = missingScenarios(old, block);
	if (lost.length > 0) {
		fail(
			c,
			"scenario-loss",
			block.name,
			`MODIFIED "${block.name}" omits scenario(s) the current spec still has: ${lost.map((n) => `"${n}"`).join(", ")}`,
		);
	} else {
		c.list[i] = block;
	}
};

const add = (c: Ctx, block: Block) => {
	const have = c.list[find(c, block.name)];
	if (!have) {
		c.list.push(block);
	} else if (!same(have, block)) {
		fail(
			c,
			"merge",
			block.name,
			`ADDED failed for "${block.name}": already exists`,
		);
	}
};

// RENAMED, REMOVED, MODIFIED, ADDED, matched by exact (whitespace-normalized) name.
export const merge = (
	base: Block[] | undefined,
	plan: Plan,
): { blocks: Block[]; failures: Failure[] } => {
	const c: Ctx = { list: [...(base ?? [])], failures: [] };
	for (const r of plan.renamed) {
		rename(c, r);
	}
	for (const name of plan.removed) {
		remove(c, name);
	}
	for (const block of plan.modified) {
		modify(c, block);
	}
	for (const block of plan.added) {
		add(c, block);
	}
	return { blocks: c.list, failures: c.failures };
};
