// The ask for a lint config, a CI file, a hook file, a skipped test, and a lint suppression (decision H5).
// Files are strings and no file is read from disk.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";
import { filesByPath } from "./stub-fs.mjs";

const io = (files = {}) => ({
  ...filesByPath(files),
  transcript: () => null,
});
const call = (tool_name, tool_input) => ({
  tool_name,
  cwd: "/w",
  tool_input,
});
const out = (payload, i = io()) => decide(payload, {}, i)?.hookSpecificOutput;
const edit = (file, old_string, new_string, files = {}) =>
  out(call("Edit", { file_path: file, old_string, new_string }), io(files));
const write = (file, content, files = {}) =>
  out(call("Write", { file_path: file, content }), io(files));

/** Asserts an ask whose reason names `file`. */
const asks = (o, file) => {
  assert.equal(o?.permissionDecision, "ask");
  assert.ok(o.permissionDecisionReason.includes(file));
};

for (const rel of [
  "biome.json",
  "biome.jsonc",
  ".eslintrc.json",
  "eslint.config.mjs",
  "tsconfig.json",
  "tsconfig.build.json",
  "ruff.toml",
  ".markdownlint-cli2.jsonc",
  "pkg/.markdownlint.json",
]) {
  test(`an \`Edit\` of the lint config \`${rel}\` gets an ask`, () => {
    const file = `/w/${rel}`;
    asks(edit(file, "a", "b", { [file]: "a" }), rel);
  });
}

test("a `Write` of a new lint config gets an ask", () => {
  asks(write("/w/biome.json", "{}"), "biome.json");
});

for (const rel of [
  ".github/workflows/ci.yml",
  ".github/dependabot.yml",
  ".gitlab-ci.yml",
  ".circleci/config.yml",
  "Jenkinsfile",
]) {
  test(`an \`Edit\` of the CI file \`${rel}\` gets an ask`, () => {
    const file = `/w/${rel}`;
    asks(edit(file, "a", "b", { [file]: "a" }), rel);
  });
}

for (const rel of [
  "plugins/x/hooks/hooks.json",
  "plugins/x/hooks/register.mjs",
]) {
  test(`an \`Edit\` of the hook file \`${rel}\` gets an ask`, () => {
    const file = `/w/${rel}`;
    asks(edit(file, "a", "b", { [file]: "a" }), rel);
  });
}

const SETTINGS = "/w/.claude/settings.json";
test("an edit of `hooks` in a settings file gets an ask", () => {
  const before = '{"hooks":{"Stop":[]},"model":"x"}';
  const after = '{"hooks":{"Stop":[{"a":1}]},"model":"x"}';
  asks(
    edit(SETTINGS, before, after, { [SETTINGS]: before }),
    ".claude/settings.json",
  );
});
test("a `Write` of `hooks` to a new settings file gets an ask", () => {
  asks(
    write("/w/.claude/settings.local.json", '{"hooks":{}}'),
    ".claude/settings.local.json",
  );
});
test("an edit of another key in a settings file gets no ask", () => {
  const before = '{"hooks":{"Stop":[]},"model":"x"}';
  const after = '{"hooks":{"Stop":[]},"model":"y"}';
  assert.equal(edit(SETTINGS, '"x"', '"y"', { [SETTINGS]: before }), undefined);
  assert.equal(write(SETTINGS, after, { [SETTINGS]: before }), undefined);
});

const TEST = "/w/src/a.test.mjs";
for (const line of [
  'test.skip("a", () => {});',
  'it.skip("a", () => {});',
  'describe.skip("a", () => {});',
  'test("a", { skip: true }, () => {});',
  'xit("a", () => {});',
  'it.only("a", () => {});',
  "@pytest.mark.skip",
]) {
  test(`a new line \`${line}\` in an existing test file gets an ask`, () => {
    const o = edit(TEST, "// end", `${line}\n// end`, { [TEST]: "// end" });
    asks(o, "src/a.test.mjs");
  });
}

test("a `Write` of a new test file with a skipped test gets an ask", () => {
  asks(write(TEST, 'test.skip("a", () => {});'), "src/a.test.mjs");
});
test("a test edit that adds a normal assertion gets no ask", () => {
  assert.equal(
    edit(TEST, "// end", "assert.ok(f());\n// end", { [TEST]: "// end" }),
    undefined,
  );
});
test("a skipped test that the file already holds gets no ask", () => {
  const src = 'test.skip("a", () => {});\n// end';
  assert.equal(
    edit(TEST, "// end", "assert.ok(f());\n// end", { [TEST]: src }),
    undefined,
  );
});
test(".only in a source file that is not a test gets no ask", () => {
  assert.equal(
    edit("/w/src/a.mjs", "a", "x.only()", { "/w/src/a.mjs": "a" }),
    undefined,
  );
});

for (const [file, line] of [
  ["/w/src/a.mjs", "// biome-ignore lint/x: reason"],
  ["/w/src/a.js", "// eslint-disable-next-line no-x"],
  ["/w/src/a.ts", "// @ts-ignore"],
  ["/w/src/a.ts", "// @ts-expect-error"],
  ["/w/src/a.py", "x = f()  # noqa: E501"],
  ["/w/src/a.py", "x = f()  # type: ignore"],
  ["/w/src/a.rs", "#[allow(dead_code)]"],
]) {
  test(`a new \`${line}\` in \`${file}\` gets an ask`, () => {
    const o = edit(file, "// end", `${line}\n// end`, { [file]: "// end" });
    asks(o, file.slice(3));
  });
}

test("an edit that keeps an old suppression unchanged gets no ask", () => {
  const file = "/w/src/a.ts";
  const src = "// @ts-ignore\nconst a = 1;\n";
  assert.equal(
    edit(file, "const a = 1;", "const a = 2;", { [file]: src }),
    undefined,
  );
  assert.equal(
    write(file, "// @ts-ignore\nconst a = 3;\n", { [file]: src }),
    undefined,
  );
});
test("a suppression word in a Markdown file gets no ask", () => {
  assert.equal(
    write("/w/docs/a.md", "Use `biome-ignore` with a reason."),
    undefined,
  );
});
test("an edit of a normal source file gets no ask", () => {
  const file = "/w/src/a.mjs";
  assert.equal(edit(file, "a", "b", { [file]: "a" }), undefined);
});
