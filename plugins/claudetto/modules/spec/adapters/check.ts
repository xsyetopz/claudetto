// The command `minispec validate`: one change or spec, or each of them (`--all`, `--changes`, `--specs`).

import path from "node:path";
import { fileReader } from "../../../kernel/node/fs.ts";
import { validateChange, validateSpec } from "../domain/validate.ts";
import {
  type Ctx,
  deltas,
  fail,
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
    deltas(dir).map(async (f) => ({
      path: f,
      text: await text(path.join(dir, "specs", f)),
      main: await fileReader.read(mainSpec(root, path.dirname(f))),
    })),
  );
  const skip = (await yaml(path.join(dir, META))).skip_specs === true;
  return verdict(
    validateChange(
      specs,
      skip,
      scan(path.join(dir, "specs"), "**/*").length > 0,
    ),
    strict,
  );
};

const MARK = { ERROR: "✗", WARNING: "⚠", INFO: "ℹ" };
type Item = {
  id: string;
  type: "change" | "spec";
  valid: boolean;
  issues: Issues;
};

const issueLines = (item: Item) =>
  item.issues.map(
    (i) => `  ${MARK[i.level]} [${i.level}] ${i.path}: ${i.message}`,
  );

export const validate = async (ctx: Ctx): Promise<Out> => {
  const { args, root } = ctx;
  const strict = args.includes("--strict");
  const [all, onlyChanges, onlySpecs] = ["--all", "--changes", "--specs"].map(
    (f) => args.includes(f),
  );
  const specIds = scan(path.join(root, "openspec/specs"), "*/spec.md").map(
    (f) => path.dirname(f),
  );
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
  const given = args.slice(1).find((a) => !a.startsWith("--")) ?? "";
  if (!bulk && !names(ctx).includes(given) && !specIds.includes(given))
    fail(
      `Unknown item '${given}'. Did you mean: ${[...specIds, ...names(ctx)].join(", ") || "none"}?`,
    );
  const picks = [
    [all || onlyChanges, names(ctx), asChange],
    [all || onlySpecs, specIds, asSpec],
  ] as const;
  const items: Item[] = bulk
    ? (
        await Promise.all(
          picks.flatMap(([on, ids, as]) => (on ? ids.map(as) : [])),
        )
      ).sort((a, b) => a.id.localeCompare(b.id))
    : [await (names(ctx).includes(given) ? asChange(given) : asSpec(given))];
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
  return [{ items, summary: { totals } }, lines, failed.length ? 1 : 0];
};
