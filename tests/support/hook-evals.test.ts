// Each hook of each plugin has its eval cases (spec `hook-evals`, the "Generated tree" section of `spec/changes/1.0.0/design.md`).
// The rules are in `hook-evals.ts`, and the fixtures work in their own folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  classicHooks,
  evalFaults,
  moduleHooks,
  testNames,
} from "./hook-evals.ts";
import { REPO, tmpDir } from "./repo.ts";

/** The runtime `.ts` files of a plugin, outside its hook lab, by path from the repository root. */
const codeFiles = async (root: string, plugin: string) => {
  const files: Record<string, string> = {};
  const glob = new Bun.Glob("**/*.ts");
  const dir = path.join(root, "plugins", plugin);
  for (const rel of glob.scanSync({ cwd: dir })) {
    const posix = rel.split(path.sep).join("/");
    if (/^(?:tests|node_modules|\.claude-plugin)\//.test(posix)) continue;
    files[`plugins/${plugin}/${posix}`] = await Bun.file(
      path.join(dir, rel),
    ).text();
  }
  return files;
};

/** The faults of the hook evals of each plugin under `root` that has `hooks/hooks.json`. */
const faults = async (root: string): Promise<string[]> => {
  const out: string[] = [];
  for (const plugin of fs.readdirSync(path.join(root, "plugins")).sort()) {
    const json = path.join(root, "plugins", plugin, "hooks", "hooks.json");
    if (!fs.existsSync(json)) continue;
    const mod = moduleHooks(await codeFiles(root, plugin));
    const ids = [
      ...mod.ids,
      ...classicHooks(JSON.parse(await Bun.file(json).text())),
    ];
    out.push(...mod.faults, ...(await evalFaults(root, plugin, ids)));
  }
  return out;
};

/** A repository root with the files `files`, by path from the root. */
const root = async (files: Record<string, string>): Promise<string> => {
  const dir = tmpDir("hook-evals");
  for (const [rel, text] of Object.entries(files))
    await Bun.write(path.join(dir, ...rel.split("/")), text);
  return dir;
};

const LAB = "plugins/p/tests/lab.test.ts";
const CASE = "plugins/p/evals/stop/case.yaml";
const STOP_CASE = `name: stop
graders:
  - type: regex
    name: "no-block"
  - type: regex
    name: "blocks"
  - type: regex
    name: block-text-clean
  - type: regex
    name: "no-false-block"
`;
/** The entry of a hook that runs a model: its cases are graders of a \`claude plugin eval\` case. */
const stopEntry = (more = {}) => ({
  requests: 1,
  tokens: 6914,
  blocks: true,
  eval: "stop",
  allow: `${CASE} > no-block`,
  text: `${CASE} > block-text-clean`,
  block: `${CASE} > blocks`,
  false: `${CASE} > no-false-block`,
  ...more,
});
const HOOKS_JSON = JSON.stringify({
  modules: ["./register.ts"],
  hooks: {
    Stop: [{ hooks: [{ type: "prompt", prompt: "x" }] }],
    PostToolUse: [
      {
        hooks: [
          {
            type: "command",
            command: `bun --no-env-file "\${CLAUDE_PLUGIN_ROOT}/hooks/PostToolUse/note.ts"`,
          },
        ],
      },
    ],
  },
});
const REGISTER = `export const register = (on: On): void => {
  // eval: tool.call Bash
  on("tool.call", { tool: "Bash" }, (_$, e, next) => next(e));
};
`;
const TESTS = `test("allows", () => {});\ntest('shows "text"', () => {});\ntest(\`blocks\`, () => {});\ntest("passes a correct message", () => {});\n`;
const entry = (more = {}) => ({
  requests: 0,
  tokens: 0,
  blocks: true,
  allow: `${LAB} > allows`,
  text: `${LAB} > shows "text"`,
  block: `${LAB} > blocks`,
  false: `${LAB} > passes a correct message`,
  ...more,
});
const fixture = (manifest: object, register = REGISTER) =>
  root({
    "plugins/p/hooks/hooks.json": HOOKS_JSON,
    "plugins/p/hooks/register.ts": register,
    [LAB]: TESTS,
    [CASE]: STOP_CASE,
    "plugins/p/evals/hooks.json": JSON.stringify(manifest),
  });
const COMPLETE = {
  "tool.call Bash": entry(),
  "PostToolUse hooks/PostToolUse/note.ts": entry({ blocks: false }),
  "Stop prompt": stopEntry(),
};

test("lint: each hook of each plugin has its eval cases", async () => {
  const found = await faults(REPO);
  expect(found, found.join("\n")).toStrictEqual([]);
});

test("a complete manifest has no fault", async () => {
  expect(await faults(await fixture(COMPLETE))).toStrictEqual([]);
});

test("Hook with no eval: a hook with no entry fails and is named, and so is an entry with no hook", async () => {
  const { "Stop prompt": _, ...rest } = COMPLETE;
  expect(
    await faults(await fixture({ ...rest, "Stop agent": entry() })),
  ).toStrictEqual([
    "p: the hook `Stop prompt` has no entry in `evals/hooks.json`",
    "p: `evals/hooks.json` names `Stop agent`, which is not a hook of the plugin",
  ]);
});

test("Missing test: an entry that names a test its file does not have fails, and names the hook and the test", async () => {
  const found = await faults(
    await fixture({
      ...COMPLETE,
      "tool.call Bash": entry({ false: `${LAB} > gone` }),
    }),
  );
  expect(found).toStrictEqual([
    `p: the \`false\` test of the hook \`tool.call Bash\` is not in ${LAB}: gone`,
  ]);
});

test("a blocking hook with no block case fails, and a hook that does not block needs none", async () => {
  const { block: _, ...noBlock } = entry();
  const found = await faults(
    await fixture({ ...COMPLETE, "tool.call Bash": noBlock }),
  );
  expect(found).toStrictEqual([
    "p: the hook `tool.call Bash` names no `block` test",
  ]);
});

test("a hook that runs a model names the graders of its `claude plugin eval` case, and a missing grader fails", async () => {
  const found = await faults(
    await fixture({
      ...COMPLETE,
      "Stop prompt": stopEntry({ text: `${CASE} > gone` }),
    }),
  );
  expect(found).toStrictEqual([
    `p: the \`text\` test of the hook \`Stop prompt\` is not in ${CASE}: gone`,
  ]);
});

test("a hook that adds a model request with no `claude plugin eval` case fails", async () => {
  const found = await faults(
    await fixture({
      ...COMPLETE,
      "Stop prompt": stopEntry({ eval: undefined }),
    }),
  );
  expect(found).toStrictEqual([
    "p: the hook `Stop prompt` adds a model request and names no `claude plugin eval` case",
  ]);
});

test("Hook call with no id: an `on(` call with no `// eval:` comment fails and names the file and the line", async () => {
  const register = REGISTER.replace("  // eval: tool.call Bash\n", "");
  const found = await faults(await fixture(COMPLETE, register));
  expect(found[0]).toBe(
    "plugins/p/hooks/register.ts:2: an `on(` call has no `// eval:` comment above it",
  );
});

test("a hook call that Biome wraps, with the event name on the next line, has the id of the comment above it", () => {
  const text =
    '  // eval: tool.call graph\n  on(\n    "tool.call",\n    { tool: "Bash" },\n    h0,\n  );\n';
  expect(moduleHooks({ "plugins/p/hooks/register.ts": text })).toStrictEqual({
    ids: ["tool.call graph"],
    faults: [],
  });
});

test("test names come from each quote form, with escapes removed", () => {
  expect([...testNames(TESTS)]).toStrictEqual([
    "allows",
    'shows "text"',
    "blocks",
    "passes a correct message",
  ]);
});

test("a call that joins hooks has the id of each `// eval:` line above it", () => {
  const text = `export const register = (on: On): void => {
  // eval: session.start decide
  // eval: session.start setup
  on("session.start", async ($, e, next) => next(e));
  // eval: tool.call Bash
  on("tool.call", { tool: "Bash" }, (_$, e, next) => next(e));
};
`;
  expect(moduleHooks({ "register.ts": text })).toStrictEqual({
    ids: ["session.start decide", "session.start setup", "tool.call Bash"],
    faults: [],
  });
});
