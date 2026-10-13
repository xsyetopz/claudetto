// Behavior of the slice step of `tools/generate/` (design, "Generated tree"), on the fixture slices of `fixture/`.
// Each test works in its own copy of the fixture under `TMPDIR`.

import { expect, test } from "bun:test";
import path from "node:path";
import { importsOf } from "../../../tools/generate/closure.ts";
import { isGenerated } from "../../../tools/generate/emit/texts.ts";
import { generated } from "../../../tools/generate/outputs.ts";
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

test("an observe and a check handler of one event with no filter are an error that names both slices", async () => {
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
  { event: "session.start", phase: "check", run: start },
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

/** The files of a slice `name` with one `session.start` handler in the phase `observe`, with the source `filter` or none. */
const observer = (name: string, filter = ""): Record<string, string> => ({
  [`src/plugins/p/slices/${name}/adapters/mod.ts`]:
    "export const start = () => 0;\n",
  [`src/plugins/p/slices/${name}/slice.ts`]: `import { start } from "./adapters/mod.ts";
export const slice = { name: "${name}", mod: [
  { event: "session.start", ${filter}phase: "observe", run: start },
] };
`,
});

test("two observe handlers with no filter are an error that names both slices and asks for a filter", async () => {
  const dir = await fixtureRoot({
    ...observer("gamma"),
    ...observer("delta"),
  });
  const error = await generated(dir).then(
    () => "",
    (e: unknown) => String(e),
  );
  expect(error).toContain("gamma");
  expect(error).toContain("delta");
  expect(error).toContain("filter");
});

test("an observe handler with a filter next to one with none is one `on()` call for each, with no join", async () => {
  const dir = await fixtureRoot({
    ...observer("gamma", "filter: { isInteractive: [true, false] }, "),
    ...observer("delta"),
  });
  await write(dir, await generated(dir));
  const calls = (await registered(dir)).filter(
    ([event]) => event === "session.start",
  );
  expect(calls.map(([, filter]) => filter)).toStrictEqual([
    undefined,
    { isInteractive: [true, false] },
  ]);
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

test("the manifest takes the version from `package.json` and the `userConfig` from the slices", async () => {
  const made = await generated(await fixtureRoot());
  const json = JSON.parse(textOf(made, "plugins/p/.claude-plugin/plugin.json"));
  expect(json.name).toBe("p");
  expect(json.version).toBe(VERSION);
  expect(json.keywords).toStrictEqual(["fixture"]);
  expect(json.userConfig.mode.options).toStrictEqual(["a", "b"]);
});

test("the manifest names the contract of a plugin that has one, and the contract is copied", async () => {
  const contract = "export type PSeen = string;\n";
  const made = await generated(
    await fixtureRoot({ "src/plugins/p/types/index.d.ts": contract }),
  );
  const json = JSON.parse(textOf(made, "plugins/p/.claude-plugin/plugin.json"));
  expect(json.types).toBe("./types/index.d.ts");
  expect(textOf(made, "plugins/p/types/index.d.ts")).toEndWith(contract);
});

test("the manifest of a plugin with no contract names no `types`", async () => {
  const made = await generated(await fixtureRoot());
  const json = JSON.parse(textOf(made, "plugins/p/.claude-plugin/plugin.json"));
  expect(json.types).toBeUndefined();
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

test("an eval case of a slice and an eval case of the plugin go to `evals/` of the plugin", async () => {
  const dir = await fixtureRoot({
    "src/plugins/p/slices/alpha/evals/one/case.yaml": "name: one\n",
    "src/plugins/p/slices/alpha/evals/one/scaffold.sh":
      "#!/usr/bin/env bash\necho one\n",
    "src/plugins/p/evals/two/case.yaml": "name: two\n",
  });
  const made = await generated(dir);
  expect(textOf(made, "plugins/p/evals/one/case.yaml")).toEndWith(
    "\nname: one\n",
  );
  const scaffold = textOf(made, "plugins/p/evals/one/scaffold.sh");
  expect(scaffold.split("\n")[0]).toBe("#!/usr/bin/env bash");
  expect(isGenerated(scaffold)).toBe(true);
  expect(textOf(made, "plugins/p/evals/two/case.yaml")).toEndWith(
    "\nname: two\n",
  );
  expect(made.some((o) => o.file.includes("slices/alpha/evals"))).toBe(false);
});
