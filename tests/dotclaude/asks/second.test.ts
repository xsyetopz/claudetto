// The second review of the ask for a change that can hide a defect (decision H5).
// Files are strings and no file is read from disk.

import { expect, test } from "bun:test";
import type {
  Payload,
  ToolInput,
} from "../../../plugins/dotclaude/slices/asks/domain/text.ts";
import { SCAN_MAX_CHARS } from "../../../plugins/dotclaude/slices/asks/limits.ts";
import { filesByPath } from "./stub-fs.ts";
import type { Verdict } from "./verdicts.ts";
import { decideAsk as decide } from "./verdicts.ts";

/** The `hookSpecificOutput` of an ask, as `decide` gives it. */
type Ask = Verdict["hookSpecificOutput"];

/** The `hookSpecificOutput` fields that the `ask` tests read. */

const io = (files: Record<string, string> = {}) => ({
  ...filesByPath(files),
});
const call = (tool_name: string, tool_input: ToolInput): Payload => ({
  tool_name,
  cwd: "/w",
  tool_input,
});
const out = async (payload: Payload, i = io()): Promise<Ask | undefined> =>
  (await decide(payload, {}, i))?.hookSpecificOutput;
const edit = async (
  file: string,
  old_string: string,
  new_string: string,
  files: Record<string, string> = {},
) =>
  await out(
    call("Edit", { file_path: file, old_string, new_string }),
    io(files),
  );
const write = async (
  file: string,
  content: string,
  files: Record<string, string> = {},
) => await out(call("Write", { file_path: file, content }), io(files));
const asks = (o: Ask | undefined, file: string) => {
  expect(o?.permissionDecision).toBe("ask");
  expect(o?.permissionDecisionReason?.includes(file)).toBeTruthy();
};
const addLine = async (rel: string, line: string) =>
  await edit(`/w/${rel}`, "// end", `${line}\n// end`, {
    [`/w/${rel}`]: "// end",
  });

// Settings keys.
const SETTINGS = "/w/.claude/settings.json";
/** The key, a settings text that checks more, and the same text with a change that checks less. */
const KEYS: [string, string, string][] = [
  ["disableAllHooks", '"disableAllHooks":false', '"disableAllHooks":true'],
  [
    "enabledPlugins",
    '"enabledPlugins":{"a@m":true}',
    '"enabledPlugins":{"a@m":false}',
  ],
  ["sandbox", '"sandbox":{"enabled":true}', '"sandbox":{"enabled":false}'],
];
for (const [key, on, off] of KEYS) {
  test(`a change of \`${key}\` in a settings file that checks less gets an ask`, async () => {
    const [before, after] = [`{${on}}`, `{${off}}`];
    asks(
      await edit(SETTINGS, before, after, { [SETTINGS]: before }),
      "settings.json",
    );
  });
  test(`a new \`${key}\` key in a settings file that checks as before gets no ask`, async () => {
    const base = '{"model":"x"}';
    const next = `{"model":"x",${on}}`;
    expect(await edit(SETTINGS, base, next, { [SETTINGS]: base })).toBe(
      undefined,
    );
  });
}
test("a change of `model` in a settings file gets no ask", async () => {
  const before = '{"model":"x"}';
  const after = '{"model":"y"}';
  expect(await edit(SETTINGS, before, after, { [SETTINGS]: before })).toBe(
    undefined,
  );
});

// Hook scripts outside `hooks/hooks.json`.
const settingsHooks = (command: string) =>
  JSON.stringify({
    hooks: { Stop: [{ hooks: [{ type: "command", command }] }] },
  });
const PROJECT_HOOKS: [string, string][] = [
  ['"$CLAUDE_PROJECT_DIR"/scripts/gate.sh', "scripts/gate.sh"],
  [`node "\${CLAUDE_PROJECT_DIR}/tools/check.mjs"`, "tools/check.mjs"],
  ["bash $CLAUDE_PROJECT_DIR/ci/run.sh --x", "ci/run.sh"],
];
/** A script that fails on a bad input, and the same script with a line that cannot fail. */
const GATE = 'if [ -z "$1" ]; then\n  exit 1\nfi\n';
const SOFT = 'if [ -z "$1" ]; then\n  exit 0\nfi\n';
for (const [command, rel] of PROJECT_HOOKS) {
  const files = {
    "/w/.claude/settings.json": settingsHooks(command),
    [`/w/${rel}`]: GATE,
  };
  test(`a script of a project settings hook, \`${rel}\`, gets an ask when it can no longer fail`, async () => {
    asks(await edit(`/w/${rel}`, "exit 1", "exit 0", files), rel);
  });
  test(`a script of a project settings hook, \`${rel}\`, gets no ask when it keeps its checks`, async () => {
    expect(await edit(`/w/${rel}`, "fi\n", "fi\necho done\n", files)).toBe(
      undefined,
    );
  });
}
test("a script of a `settings.local.json` hook gets an ask when it can no longer fail", async () => {
  const files = {
    "/w/.claude/settings.local.json": settingsHooks(
      "sh $CLAUDE_PROJECT_DIR/a.sh",
    ),
    "/w/a.sh": GATE,
  };
  asks(await edit("/w/a.sh", "exit 1", "exit 0", files), "a.sh");
  expect(await edit("/w/a.sh", "fi\n", "fi\necho x\n", files)).toBe(undefined);
});
test("a script of an inline hook in `plugin.json` gets an ask when it can no longer fail", async () => {
  const manifest = JSON.stringify({
    name: "x",
    hooks: JSON.parse(settingsHooks(`sh \${CLAUDE_PLUGIN_ROOT}/bin/run.sh`)),
  });
  const files = {
    "/w/plugins/x/.claude-plugin/plugin.json": manifest,
    "/w/plugins/x/bin/run.sh": GATE,
  };
  asks(
    await edit("/w/plugins/x/bin/run.sh", "exit 1", "exit 0", files),
    "bin/run.sh",
  );
  expect(
    await edit("/w/plugins/x/bin/run.sh", "fi\n", "fi\necho x\n", files),
  ).toBe(undefined);
});
test("a `Write` over a file under `.claude/hooks/` that loses its check gets an ask", async () => {
  const f = "/w/.claude/hooks/anything.sh";
  asks(await write(f, SOFT, { [f]: GATE }), ".claude/hooks/anything.sh");
});
test("a `Write` of a new file under `.claude/hooks/` gets no ask", async () => {
  expect(await write("/w/.claude/hooks/anything.py", "x")).toBe(undefined);
});
test("a script that no settings hook names gets no ask", async () => {
  const files = {
    "/w/.claude/settings.json": settingsHooks("sh $CLAUDE_PROJECT_DIR/a.sh"),
    "/w/b.sh": "a",
  };
  expect(await edit("/w/b.sh", "a", "b", files)).toBe(undefined);
});

// Skip forms.
for (const [rel, line] of [
  ["src/a.test.mjs", 'it("a", { todo: true }, () => {});'],
  ["src/a.test.mjs", 'it("a", { todo: "later" }, () => {});'],
  ["src/a.test.mjs", 'it("a", { skip: process.platform === "win32" }, f);'],
  ["pkg/a_test.go", "t.Skipf(`no`)"],
  ["pkg/a_test.go", "t.SkipNow()"],
  ["src/a.test.js", "this.skip();"],
  ["spec/a_spec.rb", 'xit("a")'],
  ["Tests/a.mjs", 'it.skip("a", f);'],
] as const) {
  test(`a new line \`${line}\` in \`${rel}\` gets an ask`, async () => {
    asks(await addLine(rel, line), rel);
  });
}
for (const [rel, line] of [
  ["src/a.go", "x() // NOLINT"],
  ["src/a.cc", "x(); // nolint:build"],
  ["src/a.cc", "x(); // NOLINTNEXTLINE(a)"],
  ["src/a.rb", "x # rubocop:disable Metrics/AbcSize"],
  ["src/A.java", '@SuppressWarnings("unchecked")'],
  ["src/A.kt", '@Suppress("UNCHECKED_CAST")'],
  ["src/a.rs", "#[expect(dead_code)]"],
  ["src/a.rs", "#![expect(unused)]"],
] as const) {
  test(`a new line \`${line}\` in \`${rel}\` gets an ask`, async () => {
    asks(await addLine(rel, line), rel);
  });
}
for (const line of [
  'it("a", { skip: 3 }, f);',
  'it("a", { skip: false }, f);',
  "const re = /it\\.skip|xit\\(/; const t = `t.Skip()`;",
]) {
  test(`the line \`${line}\` in a test file gets an ask, as it holds a skip word`, async () => {
    asks(await addLine("src/a.test.mjs", line), "src/a.test.mjs");
  });
}
for (const line of ['const s = "test.skip(x)";', "const s = 'it.only';"]) {
  test(`the line \`${line}\` in a test file gets no ask`, async () => {
    expect(await addLine("src/a.test.mjs", line)).toBe(undefined);
  });
}
test("a skipped test asks for a text over the scan bound", async () => {
  const rel = "src/big.test.mjs";
  const text = `${"//\n".repeat(SCAN_MAX_CHARS)}// end`;
  asks(
    await edit(`/w/${rel}`, "// end", 'it.skip("a", f);', {
      [`/w/${rel}`]: text,
    }),
    rel,
  );
  asks(await write(`/w/${rel}`, `${text}\ndescribe.skip("a", f);`), rel);
});

// Runners and configs.
for (const rel of [
  "vitest.config.ts",
  "jest.config.js",
  "pytest.ini",
  "tox.ini",
  ".coveragerc",
]) {
  test(`an \`Edit\` of the check runner config \`${rel}\` gets an ask`, async () => {
    asks(await edit(`/w/${rel}`, "a", "b", { [`/w/${rel}`]: "a" }), rel);
  });
}
/** A section name, and a body that checks less. */
const WEAK_SECTIONS: [string, string][] = [
  ["[tool.pylint.main]", "disable = ['C0114']"],
  ["[tool.isort]", "skip = ['a.py']"],
  ["[tool.coverage.run]", "omit = ['a.py']\nignore = ['b.py']"],
  ["[tool.ruff]", "ignore = ['E501']"],
  ["[tool.mypy]", "ignore_errors = true"],
  ["[tool.pytest.ini_options]", "addopts = '--ignore=tests'"],
  ["[tool.pyright]", "exclude = ['src']"],
  ["[tool.black]", "exclude = 'src'"],
];
/** A section name, and a body that adds a check or only sets a style. */
const KEEP_SECTIONS: [string, string][] = [
  ["[tool.ruff]", "select = ['E', 'F']"],
  ["[tool.mypy]", "strict = true"],
  ["[tool.pytest.ini_options]", "addopts = '-ra'"],
  ["[tool.pyright]", "typeCheckingMode = 'strict'"],
  ["[tool.black]", "line-length = 88"],
  ["[tool.isort]", "profile = 'black'"],
];
const PYPROJECT = "/w/pyproject.toml";
const addSection = (section: string, body: string) =>
  edit(PYPROJECT, "[project]", `${section}\n${body}\n[project]`, {
    [PYPROJECT]: "[project]\nname = 'x'\n",
  });
for (const [section, body] of WEAK_SECTIONS) {
  test(`an added \`${section}\` section of \`pyproject.toml\` that checks less gets an ask`, async () => {
    asks(await addSection(section, body), "pyproject.toml");
  });
}
for (const [section, body] of KEEP_SECTIONS) {
  test(`an added \`${section}\` section of \`pyproject.toml\` that checks as before or more gets no ask`, async () => {
    expect(await addSection(section, body)).toBe(undefined);
  });
}
for (const [section, body] of [
  ["[coverage:run]", "omit = a.py"],
  ["[isort]", "skip = a.py"],
  ["[pylint.main]", "disable = C0114"],
] as const) {
  const f = { "/w/setup.cfg": "[metadata]\nname = x\n" };
  const add = (text: string) =>
    edit("/w/setup.cfg", "[metadata]", `${text}\n[metadata]`, f);
  test(`an added \`${section}\` section of \`setup.cfg\` that checks less gets an ask`, async () => {
    asks(await add(`${section}\n${body}`), "setup.cfg");
  });
  test(`an added \`${section}\` section of \`setup.cfg\` with a style key gets no ask`, async () => {
    expect(await add(`${section}\nprofile = black`)).toBe(undefined);
  });
}
const JUST =
  "build:\n  cargo build\n\ntest:\n  cargo test\n\nlint:\n  cargo clippy\n";
const MAKE = "build:\n\tcc a.c\n\ncheck: lint\n\tsh check.sh\n";
const RECIPES: [string, string, string, string][] = [
  ["justfile", JUST, "cargo test", "true"],
  ["Justfile", JUST, "cargo clippy", "true"],
  ["Makefile", MAKE, "sh check.sh", "true"],
  ["makefile", MAKE, "check: lint", "check:"],
];
for (const [rel, src, from, to] of RECIPES) {
  test(`a check recipe edit in \`${rel}\` gets an ask`, async () => {
    asks(await edit(`/w/${rel}`, from, to, { [`/w/${rel}`]: src }), rel);
  });
}
test("an edit of the `build` recipe in a `justfile` gets no ask", async () => {
  const f = { "/w/justfile": JUST };
  expect(await edit("/w/justfile", "cargo build", "cargo build -r", f)).toBe(
    undefined,
  );
});

// Nits.
test("a dependency named `@testing-library/react` in `package.json` gets no ask", async () => {
  const dep = '"@testing-library/react": "^16.0.0"';
  const src = '{"name":"x","dependencies":{"a":"1"}}';
  const f = { "/w/package.json": src };
  expect(await edit("/w/package.json", '"a":"1"', `"a":"1",${dep}`, f)).toBe(
    undefined,
  );
  expect(await edit("/w/package.json", "x", dep, {})).toBe(undefined);
  expect(
    await edit("/w/package.json", "x", dep, { "/w/package.json": "{" }),
  ).toBe(undefined);
});
test("a `test` script in a fragment of `package.json` gets an ask", async () => {
  asks(
    await edit("/w/package.json", "x", '"test": "vitest"', {}),
    "package.json",
  );
});
