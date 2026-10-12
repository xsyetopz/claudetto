// Behavior of the slice step of `tools/generate/` (design, "Generated tree"), on the fixture slices of `fixture/`.
// Each test works in its own copy of the fixture under `TMPDIR`.

import { expect, test } from "bun:test";
import path from "node:path";
import { importsOf } from "../../../tools/generate/closure.ts";
import { isGenerated } from "../../../tools/generate/emit/texts.ts";
import { generated, problems } from "../../../tools/generate/outputs.ts";
import { fixtureRoot, textOf, VERSION, write } from "./fixture.ts";

type Handler = (...args: unknown[]) => unknown;

/** The `on()` calls of the generated `register.ts` of `p` in `dir`, as `[event, filter, handler]`. */
const registered = async (dir: string): Promise<unknown[][]> => {
  const mod = await import(path.join(dir, "plugins/p/hooks/register.ts"));
  const calls: unknown[][] = [];
  mod.register((...args: unknown[]) => {
    calls.push(args.length === 3 ? args : [args[0], undefined, args[1]]);
  });
  return calls;
};

/** The exports of the copy of `adapters/mod.ts` of the slice `s` in `dir`. */
const copyOf = async (
  dir: string,
  s: string,
): Promise<Record<string, Handler>> =>
  import(path.join(dir, "plugins/p/slices", s, "adapters/mod.ts"));

test("the register runs the handlers of one event by phase, then by slice name, with each filter", async () => {
  const dir = await fixtureRoot();
  await write(dir, await generated(dir));
  const alpha = await copyOf(dir, "alpha");
  const beta = await copyOf(dir, "beta");
  expect(await registered(dir)).toStrictEqual([
    ["prompt.compose", undefined, alpha["onCompose"]],
    ["prompt.compose", { model: "fixture" }, beta["onCompose"]],
    ["tool.call", { tool: "Bash" }, beta["onBash"]],
    ["tool.call", { tool: "Bash" }, alpha["onBash"]],
    [
      "tool.call",
      { tool: "Write", input: { file_path: /\.md$/ } },
      beta["onWrite"],
    ],
  ]);
});

test("two handlers of one slice with the same event, filter, and phase are an error that names the slice", async () => {
  const dir = await fixtureRoot({
    "src/plugins/p/slices/gamma/adapters/mod.ts":
      "export const a = () => 0;\nexport const b = () => 0;\n",
    "src/plugins/p/slices/gamma/slice.ts": `import { a, b } from "./adapters/mod.ts";
export const slice = { name: "gamma", mod: [
  { event: "tool.call", filter: { tool: "Bash" }, phase: "check", run: a },
  { event: "tool.call", filter: { tool: "Bash" }, phase: "check", run: b },
] };
`,
  });
  await expect(generated(dir)).rejects.toThrow(/^slice gamma: /);
});

test("the same event and phase in two filters of one slice is not an error", async () => {
  const dir = await fixtureRoot({
    "src/plugins/p/slices/gamma/adapters/mod.ts":
      "export const a = () => 0;\nexport const b = () => 0;\n",
    "src/plugins/p/slices/gamma/slice.ts": `import { a, b } from "./adapters/mod.ts";
export const slice = { name: "gamma", mod: [
  { event: "tool.call", filter: { tool: "Bash" }, phase: "check", run: a },
  { event: "tool.call", filter: { tool: "Edit" }, phase: "check", run: b },
] };
`,
  });
  const made = await generated(dir);
  expect(textOf(made, "plugins/p/hooks/register.ts")).toContain("gamma");
});

test("two slices that each register one event with no filter are an error that names both slices", async () => {
  const handler = "export const start = () => 0;\n";
  const dir = await fixtureRoot({
    "src/plugins/p/slices/gamma/adapters/mod.ts": handler,
    "src/plugins/p/slices/gamma/slice.ts": `import { start } from "./adapters/mod.ts";
export const slice = { name: "gamma", mod: [
  { event: "session.start", phase: "observe", run: start },
] };
`,
    "src/plugins/p/slices/delta/adapters/mod.ts": handler,
    "src/plugins/p/slices/delta/slice.ts": `import { start } from "./adapters/mod.ts";
export const slice = { name: "delta", mod: [
  { event: "session.start", phase: "observe", run: start },
] };
`,
  });
  const error = await generated(dir).then(
    () => "",
    (e: unknown) => String(e),
  );
  expect(error).toContain("gamma");
  expect(error).toContain("delta");
});

test("a handler with `configure` gets the `options` that the mod runtime gives to `register`", async () => {
  const dir = await fixtureRoot({
    "src/plugins/p/slices/gamma/adapters/mod.ts":
      'let backend;\nexport const keep = (options) => { backend = options["backend"]; };\nexport const hook = () => backend;\n',
    "src/plugins/p/slices/gamma/slice.ts": `import { hook, keep } from "./adapters/mod.ts";
export const slice = { name: "gamma", mod: [
  { event: "tool.call", filter: { tool: "WebSearch" }, phase: "answer", run: hook, configure: keep },
] };
`,
  });
  await write(dir, await generated(dir));
  const mod = await import(path.join(dir, "plugins/p/hooks/register.ts"));
  const hooks: Handler[] = [];
  mod.register(
    (_event: string, filter: { tool?: string }, hook: Handler) => {
      if (filter?.tool === "WebSearch") hooks.push(hook);
    },
    { backend: "cloakbrowser" },
  );
  expect(hooks.map((hook) => hook())).toStrictEqual(["cloakbrowser"]);
  // `claude plugin validate --strict` follows `$` only into a function of `register.ts`, so the hook must be the export itself.
  const adapter = await import(
    path.join(dir, "plugins/p/slices/gamma/adapters/mod.ts")
  );
  expect(hooks).toStrictEqual([adapter.hook]);
});

test("a handler that is not a named export of `adapters/mod.ts` is an error that names the slice", async () => {
  const dir = await fixtureRoot({
    "src/plugins/p/slices/gamma/slice.ts": `export const slice = { name: "gamma", mod: [
  { event: "tool.call", phase: "check", run: () => 0 },
] };
`,
  });
  await expect(generated(dir)).rejects.toThrow(
    /^src\/plugins\/p\/slices\/gamma\/slice\.ts: /,
  );
});

test("the plugin gets a copy of each kernel module that its slices import, directly or through the kernel, and no other", async () => {
  const made = await generated(await fixtureRoot());
  const kernel = made.filter((o) => o.file.startsWith("plugins/p/kernel/"));
  expect(kernel.map((o) => [o.file, o.source])).toStrictEqual([
    ["plugins/p/kernel/text.ts", "src/kernel/text.ts"],
    ["plugins/p/kernel/words.ts", "src/kernel/words.ts"],
  ]);
});

test("each relative import of a copied slice file names a file of the plugin", async () => {
  const dir = await fixtureRoot();
  const made = await generated(dir);
  const files = new Set(made.map((o) => path.join(dir, o.file)));
  const copies = made.filter(
    (o) => o.file.startsWith("plugins/p/") && o.file.endsWith(".ts"),
  );
  expect(copies.length).toBeGreaterThan(0);
  for (const o of copies)
    for (const target of importsOf(path.join(dir, o.file), o.text))
      expect(files.has(target), `${o.file} imports ${target}`).toBeTrue();
  const mod = textOf(made, "plugins/p/slices/alpha/adapters/mod.ts");
  expect(
    importsOf(path.join(dir, "plugins/p/slices/alpha/adapters/mod.ts"), mod),
  ).toContain(path.join(dir, "plugins/p/kernel/words.ts"));
});

test("a slice that imports a file outside its folder and outside `src/kernel/` is an error", async () => {
  const dir = await fixtureRoot({
    "src/plugins/p/shared.ts": "export const S = 1;\n",
    "src/plugins/p/slices/alpha/domain/bad.ts":
      'export { S } from "../../../shared.ts";\n',
  });
  await expect(generated(dir)).rejects.toThrow(
    /^src\/plugins\/p\/slices\/alpha\/domain\/bad\.ts: /,
  );
});

test("a file in `plugins/` with no source fails the check until the rebuild list names it or its folder", async () => {
  const dir = await fixtureRoot();
  const made = await generated(dir);
  await write(dir, made);
  expect(await problems(dir, made)).toStrictEqual([]);
  await Bun.write(path.join(dir, "plugins/p/old/stray.md"), "Old.\n");
  const found = await problems(dir, made);
  expect(found).toHaveLength(1);
  expect(found[0]).toStartWith("plugins/p/old/stray.md ");
  await Bun.write(
    path.join(dir, "tools/rebuild-pending.txt"),
    "# P99\nplugins/p/old/\n",
  );
  expect(await problems(dir, made)).toStrictEqual([]);
});

test("the manifest takes the version from `package.json` and the `userConfig` from the slices", async () => {
  const made = await generated(await fixtureRoot());
  const json = JSON.parse(textOf(made, "plugins/p/.claude-plugin/plugin.json"));
  expect(json.name).toBe("p");
  expect(json.version).toBe(VERSION);
  expect(json.keywords).toStrictEqual(["fixture"]);
  expect(json.userConfig.mode.options).toStrictEqual(["a", "b"]);
});

test("`hooks.json` names the register and groups the classic hooks by event and matcher", async () => {
  const made = await generated(await fixtureRoot());
  const json = JSON.parse(textOf(made, "plugins/p/hooks/hooks.json"));
  expect(json.modules).toStrictEqual(["./register.ts"]);
  expect(json.hooks.SessionStart).toStrictEqual([
    { hooks: [{ type: "command", command: "true", timeout: 5 }] },
  ]);
  expect(json.hooks.PostToolUse).toStrictEqual([
    {
      matcher: "Edit",
      hooks: [
        { type: "command", command: "one", async: true },
        { type: "command", command: "two" },
      ],
    },
  ]);
});

test("a source of `src/` and a slice that make one file are an error", async () => {
  const dir = await fixtureRoot({
    "src/plugins/p/skills/greet/SKILL.md": "---\nname: greet\n---\n",
  });
  await expect(generated(dir)).rejects.toThrow(
    /^plugins\/p\/skills\/greet\/SKILL\.md /,
  );
});

test("the launcher of a CLI runs the `main` of the slice with the arguments", async () => {
  const dir = await fixtureRoot();
  const made = await generated(dir);
  await write(dir, made);
  const bin = path.join(dir, "plugins/p/bin/p-alpha");
  expect(isGenerated(await Bun.file(bin).text())).toBeTrue();
  const run = Bun.spawnSync(["bun", bin, "x", "y"], { cwd: dir });
  expect(run.exitCode).toBe(2);
});

test("the texts of a slice go to the plugin with a header, and `plugin.ts` makes no text", async () => {
  const made = await generated(await fixtureRoot());
  expect(
    isGenerated(textOf(made, "plugins/p/skills/greet/SKILL.md")),
  ).toBeTrue();
  expect(made.some((o) => o.file === "plugins/p/plugin.ts")).toBeFalse();
});
