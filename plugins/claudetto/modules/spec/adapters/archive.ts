// The commands `minispec archive` and `sync`: both merge the delta specs of a change into `openspec/specs/`.

import fs from "node:fs/promises";
import path from "node:path";
import { fileReader } from "../../../kernel/node/fs.ts";
import { countTasks } from "../../project/domain/change.ts";
import { mergeSpec } from "../domain/merge.ts";
import { check } from "./check.ts";
import {
	type Ctx,
	deltas,
	exists,
	fail,
	has,
	mainSpec,
	type Out,
	open,
	text,
	today,
} from "./ctx.ts";

const KINDS = ["added", "modified", "removed", "renamed"] as const;
const MARKS = { added: "+", modified: "~", removed: "-", renamed: "→" };
const DATED = /^\d{4}-\d{2}-\d{2}-/;

const taskStatus = (done: number, total: number) => {
	if (total === 0) {
		return "No tasks";
	}
	return done === total ? "✓ Complete" : `${done}/${total} tasks`;
};

/**
 * The dry run of the merge of the change in `dir`: the files to write, the totals, and the lines to print.
 * It writes nothing, and a delta that changes nothing is in sync, so its spec stays as it is.
 */
const planMerges = async (root: string, dir: string, name: string) => {
	const writes: [string, string][] = [];
	const update = ["Specs to update:"];
	const applied: string[] = [];
	const totals = { added: 0, modified: 0, removed: 0, renamed: 0 };
	const inputs = await Promise.all(
		(await deltas(dir)).map(async (f) => ({
			id: path.dirname(f),
			old: await fileReader.read(mainSpec(root, path.dirname(f))),
			delta: await text(path.join(dir, "specs", f)),
		})),
	);
	for (const { id, old, delta } of inputs) {
		const m = mergeSpec(id, old, delta, name);
		if ("error" in m) {
			fail(`${m.error}\nAborted. No files were changed.`);
		}
		update.push(`  ${id}: ${old === null ? "create" : "update"}`);
		if (old !== null && KINDS.every((k) => !m.counts[k])) {
			continue;
		}
		writes.push([mainSpec(root, id), m.text]);
		applied.push(
			`Applying changes to openspec/specs/${id}/spec.md:`,
			...KINDS.filter((k) => m.counts[k]).map(
				(k) => `  ${MARKS[k]} ${m.counts[k]} ${k}`,
			),
		);
		for (const k of KINDS) {
			totals[k] += m.counts[k];
		}
	}
	const lines =
		update.length > 1
			? [
					...update,
					...applied,
					`Totals: ${KINDS.map((k) => `${MARKS[k]} ${totals[k]}`).join(", ")}`,

					writes.length > 0
						? "Specs updated successfully."
						: "Specs already in sync; no files changed.",
				]
			: [];
	await Promise.all(
		writes.map(([file, merged]) => globalThis.Bun.write(file, merged)),
	);
	return { writes, totals, lines };
};

/** The checks before an archive: the validation and the open tasks. Gives the count of open tasks. */
const gate = async (
	ctx: Ctx,
	dir: string,
	say: (line: string) => void,
): Promise<number> => {
	const { io } = ctx;
	const name = path.basename(dir);
	if (has(ctx, "--no-validate")) {
		for (const l of [
			"⚠️  WARNING: Skipping validation may archive invalid specs.",
			`[${new Date().toISOString()}] Validation skipped for change: ${name}`,
			`Affected files: ${dir}`,
		]) {
			say(l);
		}
	} else {
		const { issues, valid } = await check(ctx.root, dir, false);
		if (!valid) {
			for (const i of issues) {
				io.log(`${i.level} ${i.path}: ${i.message}`);
			}
			fail(
				`Change '${name}' is not valid. Fix each ERROR and run validate again.`,
			);
		}
	}
	const { done, total } = countTasks(await text(path.join(dir, "tasks.md")));
	say(`Task status: ${taskStatus(done, total)}`);
	if (done === total) {
		return 0;
	}
	const warning = `Warning: ${total - done} incomplete task(s) found.`;
	if (!has(ctx, "--yes") && !has(ctx, "-y")) {
		fail(
			`${warning} Ask the user, and run the archive again with --yes after their yes.`,
		);
	}
	say(`${warning} Continuing due to --yes flag.`);
	return total - done;
};

export const archive = async (ctx: Ctx): Promise<Out> => {
	const say = (line: string) => has(ctx, "--json") || ctx.io.log(line);
	const dir = await open(ctx, ctx.words[0]);
	const name = path.basename(dir);
	const openTasks = await gate(ctx, dir, say);
	const as = DATED.test(name) ? name : `${today()}-${name}`;
	const target = path.join(ctx.changes, "archive", as);
	if (await exists(target)) {
		fail(
			`Archive '${as}' already exists. Rename the change or the archive folder.`,
		);
	}
	const skip = has(ctx, "--skip-specs");
	if (skip) {
		say("Skipping spec updates (--skip-specs flag provided).");
	}
	const plan = skip
		? { writes: [], totals: undefined, lines: [] }
		: await planMerges(ctx.root, dir, name);
	for (const line of plan.lines) {
		say(line);
	}
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.rename(dir, target);
	const specsUpdated = plan.writes.length > 0;
	return [
		{
			archive: {
				change: name,
				archivedAs: as,
				path: target,
				specsUpdated,
				...(specsUpdated && { totals: plan.totals }),
				...(openTasks > 0 && { openTasks }),
			},
		},
		[`Change '${name}' archived as '${as}'.`],
	];
};

/** Merges the deltas of a change into `openspec/specs/`, and keeps the change folder. */
export const sync = async (ctx: Ctx): Promise<Out> => {
	const dir = await open(ctx, ctx.words[0]);
	const name = path.basename(dir);
	const { lines } = await planMerges(ctx.root, dir, name);
	return [
		undefined,

		lines.length > 0
			? [
					...lines,
					`Change '${name}' stays in place. Archive it when the work is done.`,
				]
			: [`Change '${name}' has no delta specs to sync.`],
	];
};
