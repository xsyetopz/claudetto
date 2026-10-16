// Behavior of the prompt module of a slice (`tools/generate/emit/prompts.ts`):
// a `{{name}}` is a parameter of the export, and a `{{NAME}}` is a value from the `limits.ts` of the slice.
// Each test works in its own copy of the fixture under `TMPDIR`.

import { expect, test } from "bun:test";
import path from "node:path";
import { generated } from "../../../tools/generate/outputs.ts";
import { fixtureRoot, write } from "./fixture.ts";

/** A slice `delta` whose handler gives its prompts, with the extra files `files`. */
const delta = (files: Record<string, string>) => ({
  "src/plugins/p/slices/delta/limits.ts": "export const MAX_ITEMS = 1200;\n",
  "src/plugins/p/slices/delta/adapters/mod.ts":
    'import * as prompts from "../prompts.ts";\nexport const onSection = () => prompts;\n',
  "src/plugins/p/slices/delta/slice.ts": `import { onSection } from "./adapters/mod.ts";
export const slice = { name: "delta", mod: [
  { event: "prompt.section", phase: "answer", run: onSection },
] };
`,
  ...files,
});

/** The two characters `${` as text, which a template literal of the module must keep. */
const OPEN = ["$", "{"].join("");

const promptsOf = async (files: Record<string, string>) => {
  const dir = await fixtureRoot(delta(files));
  await write(dir, await generated(dir));
  const mod = await import(
    path.join(dir, "plugins/p/slices/delta/adapters/mod.ts")
  );
  return mod.onSection();
};

test("a text with `{{name}}` parts gives a function of the parts, and a `{{NAME}}` gets the value of the slice limit", async () => {
  const prompts = await promptsOf({
    "src/plugins/p/slices/delta/prompts/deny-reason.md":
      "Run `{{command}}` again.\nAt most {{MAX_ITEMS}} items, for {{command}} and {{who}}.\n",
  });
  const command = `ls ${OPEN}HOME}`;
  expect(prompts.DENY_REASON({ command, who: "you" })).toBe(
    `Run \`${command}\` again.\nAt most 1,200 items, for ${command} and you.`,
  );
});

test("a text with no `{{name}}` part gives a string, and the `${` and backticks of the source stay as written", async () => {
  const prompts = await promptsOf({
    "src/plugins/p/slices/delta/prompts/plain.md": `Use \`${OPEN}x}\` and \\n.\n`,
    "src/plugins/p/slices/delta/prompts/data.json": '{ "a": [1] }\n',
  });
  expect(prompts.PLAIN).toBe(`Use \`${OPEN}x}\` and \\n.`);
  expect(prompts.DATA).toStrictEqual({ a: [1] });
});

test("a `$` just before a `{{name}}` part stays a `$` before the value, with no escape in the module", async () => {
  const dir = await fixtureRoot(
    delta({
      "src/plugins/p/slices/delta/prompts/price.md": `Cost: ${OPEN}{total}}.\n`,
    }),
  );
  const made = await generated(dir);
  const module = made.find(
    (o) => o.file === "plugins/p/slices/delta/prompts.ts",
  );
  expect(module?.text).toContain(`Cost: $${OPEN}v.total}.`);
  await write(dir, made);
  const mod = await import(
    path.join(dir, "plugins/p/slices/delta/adapters/mod.ts")
  );
  expect(mod.onSection().PRICE({ total: "5" })).toBe("Cost: $5.");
});

test("a `{{NAME}}` that no limit and no shared value gives is an error that names the source", async () => {
  const dir = await fixtureRoot(
    delta({ "src/plugins/p/slices/delta/prompts/bad.md": "{{NO_SUCH}}\n" }),
  );
  await expect(generated(dir)).rejects.toThrow(
    /src\/plugins\/p\/slices\/delta\/prompts\/bad\.md: no value/,
  );
});

test("a file of another type in `prompts/` is an error that names the source", async () => {
  const dir = await fixtureRoot(
    delta({ "src/plugins/p/slices/delta/prompts/note.txt": "x\n" }),
  );
  await expect(generated(dir)).rejects.toThrow(/prompts\/note\.txt: a/);
});

test("a text with CRLF line ends keeps them in the export", async () => {
  const prompts = await promptsOf({
    "src/plugins/p/slices/delta/prompts/crlf.md": "one\r\ntwo\r\n",
  });
  expect(prompts.CRLF).toBe("one\r\ntwo");
});

test("a `.md` file and a `.json` file with one base name are an error that names both", async () => {
  const dir = await fixtureRoot(
    delta({
      "src/plugins/p/slices/delta/prompts/foo.md": "x\n",
      "src/plugins/p/slices/delta/prompts/foo.json": "{}\n",
    }),
  );
  await expect(generated(dir)).rejects.toThrow(
    /prompts\/foo\.json.*prompts\/foo\.md|prompts\/foo\.md.*prompts\/foo\.json/,
  );
});
