// The second review of the ask for a change that can hide a defect (decision H5).
// Files are strings and no file is read from disk.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";
import { SCAN_MAX_CHARS } from "../../../plugins/dotclaude/features/adherence/limits.mjs";

const io = (files = {}) => ({
  read: (f) => files[f] ?? null,
  transcript: () => null,
});
const call = (tool_name, tool_input) => ({ tool_name, cwd: "/w", tool_input });
const out = (payload, i = io()) => decide(payload, {}, i)?.hookSpecificOutput;
const edit = (file, old_string, new_string, files = {}) =>
  out(call("Edit", { file_path: file, old_string, new_string }), io(files));
const write = (file, content, files = {}) =>
  out(call("Write", { file_path: file, content }), io(files));
const asks = (o, file) => {
  assert.equal(o?.permissionDecision, "ask");
  assert.ok(o.permissionDecisionReason.includes(file));
};
const addLine = (rel, line) =>
  edit(`/w/${rel}`, "// end", `${line}\n// end`, { [`/w/${rel}`]: "// end" });

// Settings keys.
const SETTINGS = "/w/.claude/settings.json";
for (const key of ["disableAllHooks", "enabledPlugins", "sandbox"]) {
  test(`a new \`${key}\` key in a settings file gets an ask`, () => {
    const before = '{"model":"x"}';
    const after = `{"model":"x","${key}":true}`;
    asks(
      edit(SETTINGS, before, after, { [SETTINGS]: before }),
      "settings.json",
    );
  });
}
test("a change of `model` in a settings file gets no ask", () => {
  const before = '{"model":"x"}';
  const after = '{"model":"y"}';
  assert.equal(
    edit(SETTINGS, before, after, { [SETTINGS]: before }),
    undefined,
  );
});

// Hook scripts outside `hooks/hooks.json`.
const settingsHooks = (command) =>
  JSON.stringify({
    hooks: { Stop: [{ hooks: [{ type: "command", command }] }] },
  });
for (const [command, rel] of [
  ['"$CLAUDE_PROJECT_DIR"/scripts/gate.sh', "scripts/gate.sh"],
  [`node "\${CLAUDE_PROJECT_DIR}/tools/check.mjs"`, "tools/check.mjs"],
  ["bash $CLAUDE_PROJECT_DIR/ci/run.sh --x", "ci/run.sh"],
]) {
  test(`a script of a project settings hook, \`${rel}\`, gets an ask`, () => {
    const files = {
      "/w/.claude/settings.json": settingsHooks(command),
      [`/w/${rel}`]: "a",
    };
    asks(edit(`/w/${rel}`, "a", "b", files), rel);
  });
}
test("a script of a `settings.local.json` hook gets an ask", () => {
  const files = {
    "/w/.claude/settings.local.json": settingsHooks(
      "sh $CLAUDE_PROJECT_DIR/a.sh",
    ),
    "/w/a.sh": "a",
  };
  asks(edit("/w/a.sh", "a", "b", files), "a.sh");
});
test("a script of an inline hook in `plugin.json` gets an ask", () => {
  const manifest = JSON.stringify({
    name: "x",
    hooks: JSON.parse(settingsHooks(`sh \${CLAUDE_PLUGIN_ROOT}/bin/run.sh`)),
  });
  const files = {
    "/w/plugins/x/.claude-plugin/plugin.json": manifest,
    "/w/plugins/x/bin/run.sh": "a",
  };
  asks(edit("/w/plugins/x/bin/run.sh", "a", "b", files), "bin/run.sh");
});
test("a file under `.claude/hooks/` gets an ask", () => {
  asks(write("/w/.claude/hooks/anything.py", "x"), ".claude/hooks/anything.py");
});
test("a script that no settings hook names gets no ask", () => {
  const files = {
    "/w/.claude/settings.json": settingsHooks("sh $CLAUDE_PROJECT_DIR/a.sh"),
    "/w/b.sh": "a",
  };
  assert.equal(edit("/w/b.sh", "a", "b", files), undefined);
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
]) {
  test(`a new line \`${line}\` in \`${rel}\` gets an ask`, () => {
    asks(addLine(rel, line), rel);
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
]) {
  test(`a new line \`${line}\` in \`${rel}\` gets an ask`, () => {
    asks(addLine(rel, line), rel);
  });
}
for (const line of [
  'it("a", { skip: 3 }, f);',
  'it("a", { skip: false }, f);',
  'const s = "test.skip(x)";',
  "const s = 'it.only';",
  "const re = /it\\.skip|xit\\(/; const t = `t.Skip()`;",
]) {
  test(`the line \`${line}\` in a test file gets no ask`, () => {
    assert.equal(addLine("src/a.test.mjs", line), undefined);
  });
}
test("a skipped test asks for a text over the scan bound", () => {
  const rel = "src/big.test.mjs";
  const text = `${"//\n".repeat(SCAN_MAX_CHARS)}// end`;
  asks(
    edit(`/w/${rel}`, "// end", 'it.skip("a", f);', { [`/w/${rel}`]: text }),
    rel,
  );
  asks(write(`/w/${rel}`, `${text}\ndescribe.skip("a", f);`), rel);
});

// Runners and configs.
for (const rel of [
  "vitest.config.ts",
  "jest.config.js",
  "pytest.ini",
  "tox.ini",
  ".coveragerc",
]) {
  test(`an \`Edit\` of the check runner config \`${rel}\` gets an ask`, () => {
    asks(edit(`/w/${rel}`, "a", "b", { [`/w/${rel}`]: "a" }), rel);
  });
}
for (const section of [
  "[tool.pylint.main]",
  "[tool.isort]",
  "[tool.coverage.run]",
]) {
  test(`an added \`${section}\` section of \`pyproject.toml\` gets an ask`, () => {
    const f = { "/w/pyproject.toml": "[project]\nname = 'x'\n" };
    asks(
      edit("/w/pyproject.toml", "[project]", `${section}\nx = 1\n[project]`, f),
      "pyproject.toml",
    );
  });
}
for (const section of ["[coverage:run]", "[isort]", "[pylint.main]"]) {
  test(`an added \`${section}\` section of \`setup.cfg\` gets an ask`, () => {
    const f = { "/w/setup.cfg": "[metadata]\nname = x\n" };
    asks(
      edit("/w/setup.cfg", "[metadata]", `${section}\nx = 1\n[metadata]`, f),
      "setup.cfg",
    );
  });
}
const JUST =
  "build:\n  cargo build\n\ntest:\n  cargo test\n\nlint:\n  cargo clippy\n";
const MAKE = "build:\n\tcc a.c\n\ncheck: lint\n\tsh check.sh\n";
for (const [rel, src, from, to] of [
  ["justfile", JUST, "cargo test", "true"],
  ["Justfile", JUST, "cargo clippy", "true"],
  ["Makefile", MAKE, "sh check.sh", "true"],
  ["makefile", MAKE, "check: lint", "check:"],
]) {
  test(`a check recipe edit in \`${rel}\` gets an ask`, () => {
    asks(edit(`/w/${rel}`, from, to, { [`/w/${rel}`]: src }), rel);
  });
}
test("an edit of the `build` recipe in a `justfile` gets no ask", () => {
  const f = { "/w/justfile": JUST };
  assert.equal(
    edit("/w/justfile", "cargo build", "cargo build -r", f),
    undefined,
  );
});

// Nits.
test("a dependency named `@testing-library/react` in `package.json` gets no ask", () => {
  const dep = '"@testing-library/react": "^16.0.0"';
  const src = '{"name":"x","dependencies":{"a":"1"}}';
  const f = { "/w/package.json": src };
  assert.equal(
    edit("/w/package.json", '"a":"1"', `"a":"1",${dep}`, f),
    undefined,
  );
  assert.equal(edit("/w/package.json", "x", dep, {}), undefined);
  assert.equal(
    edit("/w/package.json", "x", dep, { "/w/package.json": "{" }),
    undefined,
  );
});
test("a `test` script in a fragment of `package.json` gets an ask", () => {
  asks(edit("/w/package.json", "x", '"test": "vitest"', {}), "package.json");
});
