// Behavior of the parts of `tools/generate/` that the port of 0.28.0 needs (P01b2):
// a module folder of texts in a slice, the `hooks.json` source of a plugin with slices, and the `legacy.ts` call of the register.
// Also the `// eval:` id of each generated `on()` call, and the hook lab tests of a slice in `tests/` of the plugin.
// Each test works in its own copy of the fixture under `TMPDIR`.

import { expect, test } from "bun:test";
import path from "node:path";
import { generated } from "../../../tools/generate/outputs.ts";
import { moduleHooks } from "../../support/hook-evals.ts";
import { fixtureRoot, textOf, write } from "./fixture.ts";

/** A slice `gamma` whose handler answers with the text of `texts.ts/greeting.md`. */
const GAMMA = {
  "src/plugins/p/slices/gamma/texts.ts/greeting.md": "Hello `you`.\n",
  "src/plugins/p/slices/gamma/adapters/mod.ts":
    'import { GREETING } from "../texts.ts";\nexport const onSection = () => ({ text: GREETING });\n',
  "src/plugins/p/slices/gamma/slice.ts": `import { onSection } from "./adapters/mod.ts";
export const slice = { name: "gamma", mod: [
  { event: "prompt.section", phase: "answer", run: onSection },
] };
`,
};

test("a module folder of a slice gives one text module in the copy, and the folder is not copied", async () => {
  const dir = await fixtureRoot(GAMMA);
  const made = await generated(dir);
  const files = made.map((o) => o.file);
  expect(files).toContain("plugins/p/slices/gamma/texts.ts");
  expect(
    files.filter((f) => f.startsWith("plugins/p/slices/gamma/texts.ts/")),
  ).toStrictEqual([]);
  await write(dir, made);
  const mod = await import(
    path.join(dir, "plugins/p/slices/gamma/adapters/mod.ts")
  );
  expect(mod.onSection()).toStrictEqual({ text: "Hello `you`." });
});

test("`hooks.json` keeps the description and the classic hooks of its source, and adds the slice hooks and the register", async () => {
  const source = {
    modules: ["./register.ts"],
    hooks: {
      PostToolUse: [
        { matcher: "Edit", hooks: [{ type: "command", command: "zero" }] },
      ],
      Stop: [{ hooks: [{ type: "prompt", prompt: "" }] }],
    },
  };
  const dir = await fixtureRoot({
    "src/plugins/p/hooks/hooks.json": JSON.stringify(source),
    "src/plugins/p/hooks/description.txt": "p: one\nline.\n",
    "src/plugins/p/hooks/Stop.prompt.txt": "Check the stop.\n",
  });
  const json = JSON.parse(
    textOf(await generated(dir), "plugins/p/hooks/hooks.json"),
  );
  expect(Object.keys(json)).toStrictEqual(["description", "modules", "hooks"]);
  expect(json.description).toBe("p: one line.");
  expect(json.modules).toStrictEqual(["./register.ts"]);
  expect(json.hooks.Stop).toStrictEqual([
    { hooks: [{ type: "prompt", prompt: "Check the stop." }] },
  ]);
  expect(json.hooks.PostToolUse).toStrictEqual([
    {
      matcher: "Edit",
      hooks: [
        { type: "command", command: "zero" },
        { type: "command", command: "one", async: true },
        { type: "command", command: "two" },
      ],
    },
  ]);
  expect(json.hooks.SessionStart).toStrictEqual([
    { hooks: [{ type: "command", command: "true", timeout: 5 }] },
  ]);
});

test("the register calls the `register` of `legacy.ts` after the slice handlers", async () => {
  const dir = await fixtureRoot({
    "plugins/p/hooks/legacy.ts":
      'export const register = (on) => on("legacy.event", () => 0);\n',
  });
  await write(dir, await generated(dir));
  const mod = await import(path.join(dir, "plugins/p/hooks/register.ts"));
  const events: unknown[] = [];
  mod.register((event: unknown) => events.push(event));
  expect(events.at(-1)).toBe("legacy.event");
  expect(events.length).toBeGreaterThan(1);
});

/** The `// eval:` ids of the block directly above line `i`, in order, for an `on()` call. */
const evalIdsAbove = (lines: string[], i: number): string[] => {
  const ids: string[] = [];
  for (let j = i - 1; j >= 0; j--) {
    const id = /^\s*\/\/ eval: (.+)$/.exec(lines[j] ?? "")?.[1];
    if (id === undefined) break;
    ids.unshift(id);
  }
  return ids;
};

/** The ids above each `on()` call of the register of `dir`, in the order of the calls. */
const registerIds = async (dir: string): Promise<string[]> => {
  const file = "plugins/p/hooks/register.ts";
  const text = textOf(await generated(dir), file);
  expect(moduleHooks({ [file]: text }).faults).toStrictEqual([]);
  const lines = text.split("\n");
  return lines.flatMap((line, i) =>
    /^\s*on\(/.test(line) ? evalIdsAbove(lines, i) : [],
  );
};

test("each `on()` call of the register has the id `<event> <slice>` above it", async () => {
  expect(await registerIds(await fixtureRoot())).toStrictEqual([
    "prompt.compose alpha",
    "prompt.compose beta",
    "tool.call beta",
    "tool.call alpha",
    "tool.call beta",
  ]);
});

test("the `on()` call of each of two observe slices has the id of its slice above it", async () => {
  const observe = (name: string, filter = ""): Record<string, string> => ({
    [`src/plugins/p/slices/${name}/adapters/mod.ts`]:
      "export const start = (_$: unknown, e: unknown, next: (e: unknown) => unknown) => next(e);\n",
    [`src/plugins/p/slices/${name}/slice.ts`]: `import { start } from "./adapters/mod.ts";
export const slice = { name: "${name}", mod: [
  { event: "session.start", ${filter}phase: "observe", run: start },
] };
`,
  });
  const ids = await registerIds(
    await fixtureRoot({
      ...observe("omega", "filter: { isInteractive: [true, false] }, "),
      ...observe("psi"),
    }),
  );
  expect(ids.filter((id) => id.startsWith("session.start "))).toStrictEqual([
    "session.start omega",
    "session.start psi",
  ]);
});

test("the hook lab tests of a slice go to `tests/` of the plugin, and not to the copy of the slice", async () => {
  const lab =
    'import { test } from "claude-code/testing";\ntest("runs", () => {});\n';
  const dir = await fixtureRoot({
    ...GAMMA,
    "src/plugins/p/slices/gamma/lab/gamma.test.ts": lab,
  });
  const made = await generated(dir);
  expect(textOf(made, "plugins/p/tests/gamma.test.ts")).toEndWith(lab);
  expect(
    made.filter((o) => o.file.startsWith("plugins/p/slices/gamma/lab/")),
  ).toStrictEqual([]);
});
