// The command `minispec validate`: one change or spec, or each of them (`--all`, `--changes`, `--specs`).

import path from "node:path";
import { fileReader } from "../../../kernel/node/fs.ts";
import { countTasks } from "../../project/domain/change.ts";
import { validateChange, validateSpec } from "../domain/validate.ts";
import {
	type Ctx,
	deltas,
	fail,
	has,
	META,
	mainSpec,
	names,
	type Out,
	scan,
	text,
	yaml,
} from "./ctx.ts";

type Issues = ReturnType<typeof validateChange>;
const verdict = (issues: Issues, strict: boolean) => ({
	issues,
	valid: !issues.some(
		(i) => i.level === "ERROR" || (strict && i.level === "WARNING"),
	),
});

/** The findings for the change in `dir`, and whether it is valid. */
export const check = async (root: string, dir: string, strict: boolean) => {
	const specs = await Promise.all(
		(await deltas(dir)).map(async (f) => ({
			path: f,
			text: await text(path.join(dir, "specs", f)),
			main: await fileReader.read(mainSpec(root, path.dirname(f))),
		})),
	);
	const siblings = (await names({ changes: path.dirname(dir) })).filter(
		(c) => c !== path.basename(dir),
	);
	const others = await Promise.all(
		(
			await Promise.all(
				siblings.map(async (change) =>
					(
						await deltas(path.join(path.dirname(dir), change))
					).map(async (f) => ({
						change,
						path: f,
						text: await text(path.join(path.dirname(dir), change, "specs", f)),
					})),
				),
			)
		).flat(),
	);
	const skip = (await yaml(path.join(dir, META))).skip_specs === true;
	return verdict(
		validateChange(
			specs,
			skip,
			(await scan(path.join(dir, "specs"), "**/*")).length > 0,
			others,
			await text(path.join(dir, "tasks.md")),
		),
		strict,
	);
};

const MARK = { ERROR: "✗", WARNING: "⚠", INFO: "ℹ" };
interface Item {
	id: string;
	type: "change" | "spec";
	valid: boolean;
	issues: Issues;
}

const issueLines = (item: Item) =>
	item.issues.map(
		(i) => `  ${MARK[i.level]} [${i.level}] ${i.path}: ${i.message}`,
	);

/** `validate --archived`: each archived change must have no open task, because it is finished. */
const validateArchived = async (ctx: Ctx): Promise<Out> => {
	const items: Item[] = await Promise.all(
		(await names(ctx, true)).map(async (id) => {
			const { done, total } = countTasks(
				await text(path.join(ctx.changes, "archive", id, "tasks.md")),
			);
			const open = total - done;
			const issues: Issues = open
				? [
						{
							level: "ERROR",
							path: "tasks.md",
							message: `${open} incomplete task${open === 1 ? "" : "s"} (${done}/${total} completed)`,
						},
					]
				: [];
			return { id, type: "change", valid: !open, issues };
		}),
	);
	const failed = items.filter((i) => !i.valid).length;
	const totals = {
		items: items.length,
		passed: items.length - failed,
		failed,
	};
	return [
		{ items, summary: { totals } },

		items.length > 0
			? [
					...items.flatMap((i) => [
						`${i.valid ? "✓" : "✗"} change/${i.id}`,
						...issueLines(i),
					]),
					`Totals: ${totals.passed} passed, ${failed} failed (${items.length} items)`,
				]
			: ["No archived changes found."],
		failed ? 1 : 0,
	];
};

export const validate = async (ctx: Ctx): Promise<Out> => {
	const { root } = ctx;
	if (has(ctx, "--archived")) {
		return validateArchived(ctx);
	}
	const strict = has(ctx, "--strict");
	const [all, onlyChanges, onlySpecs] = ["--all", "--changes", "--specs"].map(
		(f) => has(ctx, f),
	);
	const specIds = (
		await scan(path.join(root, "openspec/specs"), "*/spec.md")
	).map((f) => path.dirname(f));
	const changeIds = await names(ctx);
	const asChange = async (id: string): Promise<Item> => ({
		id,
		type: "change",
		...(await check(root, path.join(ctx.changes, id), strict)),
	});
	const asSpec = async (id: string): Promise<Item> => ({
		id,
		type: "spec",
		...verdict(validateSpec(await text(mainSpec(root, id))), strict),
	});
	const bulk = all || onlyChanges || onlySpecs;
	const given = ctx.words[0] ?? "";
	if (!bulk && !changeIds.includes(given) && !specIds.includes(given)) {
		fail(
			`Unknown item '${given}'. Did you mean: ${[...specIds, ...changeIds].join(", ") || "none"}?`,
		);
	}
	const picks = [
		[all || onlyChanges, changeIds, asChange],
		[all || onlySpecs, specIds, asSpec],
	] as const;
	const items: Item[] = bulk
		? (
				await Promise.all(
					picks.flatMap(([on, ids, as]) => (on ? ids.map(as) : [])),
				)
			).sort((a, b) => a.id.localeCompare(b.id))
		: [await (changeIds.includes(given) ? asChange(given) : asSpec(given))];
	const failed = items.filter((i) => !i.valid);
	const lines = bulk
		? [
				...items.filter((i) => i.valid).map((i) => `✓ ${i.type}/${i.id}`),
				`Totals: ${items.length - failed.length} passed, ${failed.length} failed (${items.length} items)`,
				...failed.flatMap((i, k) => [
					...(k === 0 ? [`Details: minispec validate ${i.id}`] : []),
					`✗ ${i.type}/${i.id}`,
					...issueLines(i),
				]),
			]
		: items.flatMap((i) => [
				`${i.type === "change" ? "Change" : "Specification"} '${i.id}' ${i.valid ? "is valid" : "has issues"}`,
				...issueLines(i).map((l) => l.trimStart()),
			]);
	const totals = {
		items: items.length,
		passed: items.length - failed.length,
		failed: failed.length,
	};
	return [{ items, summary: { totals } }, lines, failed.length > 0 ? 1 : 0];
};
