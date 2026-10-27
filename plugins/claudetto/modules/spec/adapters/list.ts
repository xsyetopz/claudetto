// The commands `minispec list` and `show`.

import fs from "node:fs/promises";
import path from "node:path";
import { fileReader } from "../../../kernel/node/fs.ts";
import { countTasks } from "../../project/domain/change.ts";
import { parseDelta, parseMain } from "../domain/markdown.ts";
import { diffLines, showChange, showSpec } from "../domain/show.ts";
import {
	type Ctx,
	deltas,
	fail,
	flag,
	has,
	mainSpec,
	names,
	type Out,
	scan,
	text,
} from "./ctx.ts";

const WHOLE_NUMBER = /^[1-9]\d*$/;

/** How long ago `date` was: `just now`, `5m ago`, `3h ago`, `2d ago`, or the date after 30 days. */
const ago = (date: Date) => {
	const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
	const days = Math.floor(mins / 1440);
	if (days > 30) {
		return date.toLocaleDateString();
	}
	if (days > 0) {
		return `${days}d ago`;
	}
	if (mins >= 60) {
		return `${Math.floor(mins / 60)}h ago`;
	}
	return mins > 0 ? `${mins}m ago` : "just now";
};

const progressOf = (done: number, total: number) => {
	if (total === 0) {
		return "no-tasks";
	}
	return done === total ? "complete" : "in-progress";
};

const summary = async (dir: string, archived: boolean) => {
	const { done, total } = countTasks(await text(path.join(dir, "tasks.md")));
	const times = (await scan(dir, "**/*")).map(
		(f) => globalThis.Bun.file(path.join(dir, f)).lastModified,
	);
	const latest =
		times.length > 0 ? Math.max(...times) : (await fs.stat(dir)).mtimeMs;
	return {
		name: path.basename(dir),
		completedTasks: done,
		totalTasks: total,
		lastModified: new Date(latest).toISOString(),
		status: progressOf(done, total),
		archived,
	};
};

const pad = (rows: string[]) => Math.max(...rows.map((r) => r.length));

const listSpecs = async (ctx: Ctx): Promise<Out> => {
	const dir = path.join(ctx.root, "openspec/specs");
	const specs = await Promise.all(
		(await scan(dir, "*/spec.md")).map(async (f) => ({
			id: path.dirname(f),
			requirementCount: parseMain(await text(path.join(dir, f))).blocks.length,
		})),
	);
	const width = pad(specs.map((s) => s.id));
	return [
		{ specs },

		specs.length > 0
			? [
					"Specs:",
					...specs.map(
						(s) =>
							`  ${s.id.padEnd(width)}     requirements ${s.requirementCount}`,
					),
				]
			: ["No specs found."],
	];
};

const emptyText = (all: boolean, archived: boolean) => {
	if (all) {
		return "No changes found.";
	}
	return archived ? "No archived changes found." : "No active changes found.";
};

export const list = async (ctx: Ctx): Promise<Out> => {
	const [archived, all] = [has(ctx, "--archived"), has(ctx, "--all")];
	if (has(ctx, "--specs")) {
		if (archived || all) {
			fail("--archived and --all can only be used when listing changes.");
		}
		return listSpecs(ctx);
	}
	const sorted = (
		await Promise.all([
			...(!archived || all ? await names(ctx) : []).map((n) =>
				summary(path.join(ctx.changes, n), false),
			),
			...(archived || all ? await names(ctx, true) : []).map((n) =>
				summary(path.join(ctx.changes, "archive", n), true),
			),
		])
	).sort(
		flag(ctx, "--sort") === "name"
			? (a, b) => a.name.localeCompare(b.name)
			: (a, b) =>
					b.lastModified.localeCompare(a.lastModified) ||
					a.name.localeCompare(b.name),
	);
	const stateText = (c: (typeof sorted)[number]) => {
		if (c.totalTasks === 0) {
			return "No tasks";
		}
		return c.status === "complete"
			? "✓ Complete"
			: `${c.completedTasks}/${c.totalTasks} tasks`;
	};
	const rows = (group: typeof sorted) => {
		const width = pad(group.map((c) => c.name));
		return group.map((c) => {
			const state = stateText(c);
			return `  ${c.name.padEnd(width)}     ${state.padEnd(12)}  ${ago(new Date(c.lastModified))}`;
		});
	};
	const shown = [
		["Changes:", sorted.filter((c) => !c.archived)],
		["Archived Changes:", sorted.filter((c) => c.archived)],
	] as const;
	const groups = shown.filter(([, g]) => g.length);
	const empty = emptyText(all, archived);
	return [
		{
			changes: sorted.map(({ archived: a, ...rest }) =>
				archived || all ? { ...rest, archived: a } : rest,
			),
		},

		groups.length > 0
			? groups.flatMap(([title, g], k) => [
					...(k ? [""] : []),
					title,
					...rows(g),
				])
			: [empty],
	];
};

export const show = async (ctx: Ctx): Promise<Out> => {
	const { root } = ctx;
	const given = ctx.words[0] ?? "";
	const available = await names(ctx);
	if (!available.includes(given)) {
		const old =
			(await fileReader.read(mainSpec(root, given))) ??
			fail(
				`Unknown item '${given}'. Available changes: ${available.join(", ") || "none"}.`,
			);
		const option = has(ctx, "-r") ? "-r" : "--requirement";
		const r = flag(ctx, option);
		if (has(ctx, option) && !WHOLE_NUMBER.test(r ?? "")) {
			fail(`The value of ${option} must be a whole number from 1.`, 2);
		}
		const n = r === undefined ? undefined : Number(r);
		return [
			showSpec(
				given,
				old,
				n,
				has(ctx, "--requirements") || has(ctx, "--no-scenarios"),
			),
			old.split("\n"),
		];
	}
	const dir = path.join(ctx.changes, given);
	const specs = await Promise.all(
		(await deltas(dir)).map(async (f) => ({
			id: path.dirname(f),
			text: await text(path.join(dir, "specs", f)),
		})),
	);
	const proposal = (await text(path.join(dir, "proposal.md"))).split("\n");
	if (!has(ctx, "--diff")) {
		return [showChange(given, specs), proposal];
	}
	const parts = await Promise.all(
		specs.map(async (s) =>
			diffLines(
				s.id,
				parseDelta(s.text),
				parseMain((await fileReader.read(mainSpec(root, s.id))) ?? "").blocks,
			),
		),
	);
	return [
		showChange(given, specs),
		[...proposal, "", "Specifications Changed (diffs)", ...parts.flat()],
	];
};
