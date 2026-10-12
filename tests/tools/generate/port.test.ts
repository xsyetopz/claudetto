// Behavior of the parts of `tools/generate/` that the port of 0.28.0 needs (P01b2):
// a module folder of texts in a slice, the `hooks.json` source of a plugin with slices, and the `legacy.ts` call of the register.
// Each test works in its own copy of the fixture under `TMPDIR`.

import { expect, test } from "bun:test";
import path from "node:path";
import { generated } from "../../../tools/generate/outputs.ts";
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
