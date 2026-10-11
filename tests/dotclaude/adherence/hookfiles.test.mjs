// The ask for hook files, more test file shapes, settings and tool config keys, and the cases that get no ask (decision H5).
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
/** An `Edit` that adds `line` in front of `// end` in the existing file `rel`. */
const addLine = (rel, line) =>
  edit(`/w/${rel}`, "// end", `${line}\n// end`, { [`/w/${rel}`]: "// end" });

// Finding 1: hook files.
for (const rel of [
  "plugins/x/hooks/Stop.prompt.txt",
  "plugins/x/hooks/description.txt",
  ".husky/pre-commit",
  ".pre-commit-config.yaml",
]) {
  test(`an \`Edit\` of the hook file \`${rel}\` gets an ask`, () => {
    const file = `/w/${rel}`;
    asks(edit(file, "a", "b", { [file]: "a" }), rel);
  });
}

const HOOKS = JSON.stringify({
  hooks: {
    Stop: [
      {
        hooks: [
          {
            type: "command",
            command: `node "\${CLAUDE_PLUGIN_ROOT}/features/adherence/cli.mjs"`,
          },
          { type: "command", command: "sh ./bin/gate.sh --strict" },
        ],
      },
    ],
  },
});
for (const rel of [
  "plugins/x/features/adherence/cli.mjs",
  "plugins/x/bin/gate.sh",
]) {
  test(`a script that \`hooks.json\` names, \`${rel}\`, gets an ask`, () => {
    const files = {
      "/w/plugins/x/hooks/hooks.json": HOOKS,
      [`/w/${rel}`]: "a",
    };
    asks(edit(`/w/${rel}`, "a", "b", files), rel);
  });
}
test("a project `hooks/hooks.json` names a script of the project", () => {
  const files = {
    "/w/hooks/hooks.json": JSON.stringify({
      hooks: { Stop: [{ hooks: [{ command: "node scripts/gate.mjs" }] }] },
    }),
    "/w/scripts/gate.mjs": "a",
  };
  asks(edit("/w/scripts/gate.mjs", "a", "b", files), "scripts/gate.mjs");
});
test("a script that no `hooks.json` names gets no ask", () => {
  const files = {
    "/w/plugins/x/hooks/hooks.json": HOOKS,
    "/w/plugins/x/features/other/cli.mjs": "a",
  };
  assert.equal(
    edit("/w/plugins/x/features/other/cli.mjs", "a", "b", files),
    undefined,
  );
});

// Finding 2: test files.
for (const rel of [
  "pkg/a_test.go",
  "tests/x.py",
  "pkg/test_a.py",
  "a_test.py",
]) {
  test(`a skipped test in the test file \`${rel}\` gets an ask`, () => {
    const line = rel.endsWith(".go") ? "t.Skip(1)" : "pytest.skip(1)";
    asks(addLine(rel, line), rel);
  });
}
for (const line of [
  'test.skipIf(win)("a", () => {});',
  "t.skip();",
  "t.Skip()",
  "@Disabled",
  "@Ignore",
  'test("a", { retry: 1, skip: true }, () => {});',
  'test("a", { retry: 1, skip: "later" }, () => {});',
]) {
  test(`a new line \`${line}\` in a test file gets an ask`, () => {
    asks(addLine("src/a.test.mjs", line), "src/a.test.mjs");
  });
}
test("`#[ignore]` in a Rust file at any path gets an ask", () => {
  asks(addLine("src/lib.rs", "#[ignore]"), "src/lib.rs");
});

// Finding 3: false asks.
for (const rel of [
  ".github/ISSUE_TEMPLATE/bug.md",
  ".github/pull_request_template.md",
  ".github/CODEOWNERS",
]) {
  test(`an edit of \`${rel}\` gets no ask`, () => {
    const file = `/w/${rel}`;
    assert.equal(edit(file, "a", "b", { [file]: "a" }), undefined);
  });
}
for (const rel of [
  ".github/workflows/ci.yml",
  ".github/actions/x/action.yml",
]) {
  test(`an edit of the CI file \`${rel}\` gets an ask`, () => {
    const file = `/w/${rel}`;
    asks(edit(file, "a", "b", { [file]: "a" }), rel);
  });
}
test("a `skip` key with a number value gets no ask", () => {
  assert.equal(
    addLine("src/a.test.mjs", "const q = { skip: 2, take: 5 };"),
    undefined,
  );
});
for (const line of [
  "const re = /biome-ignore/;",
  'const s = "// eslint-disable-next-line";',
  "const t = `@ts-ignore`;",
]) {
  test(`a suppression word in a literal, \`${line}\`, gets no ask`, () => {
    assert.equal(addLine("src/a.mjs", line), undefined);
  });
}
test("a suppression word after code in a comment gets an ask", () => {
  asks(addLine("src/a.mjs", "run(); /* eslint-disable */"), "src/a.mjs");
});

// Finding 4: more cases.
test("a lint config asks for a text over the scan bound", () => {
  asks(write("/w/biome.json", "x".repeat(SCAN_MAX_CHARS + 1)), "biome.json");
});
const PY = "[tool.ruff]\nline-length = 80\n\n[project]\nname = 'x'\n";
for (const [name, sect] of [
  ["ruff", "[tool.ruff]"],
  ["mypy", "[tool.mypy]"],
  ["pytest", "[tool.pytest.ini_options]"],
  ["pyright", "[tool.pyright]"],
  ["black", "[tool.black]"],
]) {
  test(`an added \`${sect}\` section of \`pyproject.toml\` gets an ask`, () => {
    const o = edit(
      "/w/pyproject.toml",
      "[project]",
      `${sect}\nx = 1\n[project]`,
      {
        "/w/pyproject.toml": "[project]\nname = 'x'\n",
      },
    );
    asks(o, `pyproject.toml`);
    assert.ok(name);
  });
}
test("an edit inside `[tool.ruff]` of `pyproject.toml` gets an ask", () => {
  const f = { "/w/pyproject.toml": PY };
  asks(edit("/w/pyproject.toml", "= 80", "= 200", f), "pyproject.toml");
});
test("an edit of `[project]` in `pyproject.toml` gets no ask", () => {
  const f = { "/w/pyproject.toml": PY };
  assert.equal(edit("/w/pyproject.toml", "'x'", "'y'", f), undefined);
});
test("an edit of a linter section of `setup.cfg` gets an ask", () => {
  const src = "[flake8]\nmax-line-length = 80\n[metadata]\nname = x\n";
  const f = { "/w/setup.cfg": src };
  asks(edit("/w/setup.cfg", "= 80", "= 200", f), "setup.cfg");
  assert.equal(edit("/w/setup.cfg", "= x", "= y", f), undefined);
});
const PKG = '{"name":"x","scripts":{"lint":"biome check","build":"tsc"}}';
test("a change of a `lint` script in `package.json` gets an ask", () => {
  const f = { "/w/package.json": PKG };
  asks(edit("/w/package.json", "biome check", "true", f), "package.json");
});
test("a new `typecheck` script in `package.json` gets an ask", () => {
  const f = { "/w/package.json": PKG };
  asks(
    edit("/w/package.json", '"build"', '"typecheck":"tsc","build"', f),
    "package.json",
  );
});
test("a change of the `build` script in `package.json` gets no ask", () => {
  const f = { "/w/package.json": PKG };
  assert.equal(edit("/w/package.json", '"tsc"', '"swc"', f), undefined);
});
test("a change of `permissions` in a settings file gets an ask", () => {
  const file = "/w/.claude/settings.json";
  const before = '{"permissions":{"allow":[]},"model":"x"}';
  const after = '{"permissions":{"allow":["Bash"]},"model":"x"}';
  asks(edit(file, before, after, { [file]: before }), ".claude/settings.json");
});
