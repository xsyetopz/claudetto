// The ask for a lint config, a CI file, a hook file, a skipped test, and a lint suppression (decision H5).
// Files are strings and no file is read from disk.

import { expect, test } from "bun:test";
import type {
  Payload,
  ToolInput,
} from "../../../plugins/dotclaude/slices/asks/domain/text.ts";
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

/** Asserts an ask whose reason names `file`. */
const asks = (o: Ask | undefined, file: string) => {
  expect(o?.permissionDecision).toBe("ask");
  expect(o?.permissionDecisionReason?.includes(file)).toBeTruthy();
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
  test(`an \`Edit\` of the lint config \`${rel}\` gets an ask`, async () => {
    const file = `/w/${rel}`;
    asks(await edit(file, "a", "b", { [file]: "a" }), rel);
  });
}

test("a `Write` of a new lint config gets no ask", async () => {
  expect(await write("/w/biome.json", "{}")).toBe(undefined);
});
test("a `Write` over a lint config that drops a rule gets an ask", async () => {
  const before = '{"linter":{"rules":{"a":"error"}}}';
  asks(
    await write("/w/biome.json", '{"linter":{"rules":{"a":"off"}}}', {
      "/w/biome.json": before,
    }),
    "biome.json",
  );
});

for (const rel of [
  ".github/workflows/ci.yml",
  ".github/dependabot.yml",
  ".gitlab-ci.yml",
  ".circleci/config.yml",
  "Jenkinsfile",
]) {
  test(`an \`Edit\` of the CI file \`${rel}\` gets an ask`, async () => {
    const file = `/w/${rel}`;
    asks(await edit(file, "a", "b", { [file]: "a" }), rel);
  });
}

const STOP = (command: string) =>
  `{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"${command}"}]}]}}`;
test("an `Edit` of `hooks.json` that removes a hook gets an ask", async () => {
  const file = "/w/plugins/x/hooks/hooks.json";
  const before = STOP("node check.mjs");
  asks(
    await edit(file, before, '{"hooks":{}}', { [file]: before }),
    "plugins/x/hooks/hooks.json",
  );
});
test("an `Edit` of `hooks.json` that adds a hook gets no ask", async () => {
  const file = "/w/plugins/x/hooks/hooks.json";
  const before = STOP("node check.mjs");
  const after = before.replace(
    '"hooks":{"Stop":[',
    '"hooks":{"Start":[{"hooks":[{"command":"node a.mjs"}]}],"Stop":[',
  );
  expect(await edit(file, before, after, { [file]: before })).toBe(undefined);
});
test("an `Edit` of `register.mjs` that removes a check gets an ask", async () => {
  const file = "/w/plugins/x/hooks/register.mjs";
  const src = 'm.on("PreToolUse", deny);\nlog();\n';
  asks(
    await edit(file, 'm.on("PreToolUse", deny);\n', "", { [file]: src }),
    "plugins/x/hooks/register.mjs",
  );
});
test("an `Edit` of `register.mjs` that adds a line gets an ask", async () => {
  const file = "/w/plugins/x/hooks/register.mjs";
  const src = 'm.on("PreToolUse", deny);\n';
  asks(
    await edit(file, "deny);", "deny);\nlog();", { [file]: src }),
    "plugins/x/hooks/register.mjs",
  );
});

const SETTINGS = "/w/.claude/settings.json";
test("an edit of `hooks` in a settings file that removes a hook gets an ask", async () => {
  const before = `${STOP("node a.mjs").slice(0, -1)},"model":"x"}`;
  const after = '{"hooks":{"Stop":[]},"model":"x"}';
  asks(
    await edit(SETTINGS, before, after, { [SETTINGS]: before }),
    ".claude/settings.json",
  );
});
test("an edit of `hooks` in a settings file that adds a hook gets no ask", async () => {
  const before = '{"hooks":{"Stop":[]},"model":"x"}';
  const after = `${STOP("node a.mjs").slice(0, -1)},"model":"x"}`;
  expect(await edit(SETTINGS, before, after, { [SETTINGS]: before })).toBe(
    undefined,
  );
});
test("a `Write` of `hooks` to a new settings file gets no ask", async () => {
  expect(await write("/w/.claude/settings.local.json", '{"hooks":{}}')).toBe(
    undefined,
  );
});
test("a `Write` over a settings file that turns a hook to `true` gets an ask", async () => {
  const before = STOP("node a.mjs");
  asks(
    await write(SETTINGS, STOP("true"), { [SETTINGS]: before }),
    ".claude/settings.json",
  );
});
test("an edit of another key in a settings file gets an ask", async () => {
  const before = '{"hooks":{"Stop":[]},"model":"x"}';
  const after = '{"hooks":{"Stop":[]},"model":"y"}';
  asks(
    await edit(SETTINGS, '"x"', '"y"', { [SETTINGS]: before }),
    ".claude/settings.json",
  );
  asks(
    await write(SETTINGS, after, { [SETTINGS]: before }),
    ".claude/settings.json",
  );
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
  test(`a new line \`${line}\` in an existing test file gets an ask`, async () => {
    const o = await edit(TEST, "// end", `${line}\n// end`, {
      [TEST]: "// end",
    });
    asks(o, "src/a.test.mjs");
  });
}

test("a `Write` of a new test file with a skipped test gets an ask", async () => {
  asks(await write(TEST, 'test.skip("a", () => {});'), "src/a.test.mjs");
});
test("a module-level assert added to an existing test file gets an ask", async () => {
  asks(
    await edit(TEST, "// end", "assert.ok(f());\n// end", { [TEST]: "// end" }),
    "src/a.test.mjs",
  );
});
test("a module-level assert beside a skipped test that the file holds gets an ask", async () => {
  const src = 'test.skip("a", () => {});\n// end';
  asks(
    await edit(TEST, "// end", "assert.ok(f());\n// end", { [TEST]: src }),
    "src/a.test.mjs",
  );
});
test(".only in a source file that is not a test gets no ask", async () => {
  expect(
    await edit("/w/src/a.mjs", "a", "x.only()", { "/w/src/a.mjs": "a" }),
  ).toBe(undefined);
});

const SUPPRESSIONS: [string, string][] = [
  ["/w/src/a.mjs", "// biome-ignore lint/x: reason"],
  ["/w/src/a.js", "// eslint-disable-next-line no-x"],
  ["/w/src/a.ts", "// @ts-ignore"],
  ["/w/src/a.ts", "// @ts-expect-error"],
  ["/w/src/a.py", "x = f()  # noqa: E501"],
  ["/w/src/a.py", "x = f()  # type: ignore"],
  ["/w/src/a.rs", "#[allow(dead_code)]"],
];
for (const [file, line] of SUPPRESSIONS) {
  test(`a new \`${line}\` in \`${file}\` gets an ask`, async () => {
    const o = await edit(file, "// end", `${line}\n// end`, {
      [file]: "// end",
    });
    asks(o, file.slice(3));
  });
}

test("an edit that keeps an old suppression unchanged gets no ask", async () => {
  const file = "/w/src/a.ts";
  const src = "// @ts-ignore\nconst a = 1;\n";
  expect(
    await edit(file, "const a = 1;", "const a = 2;", { [file]: src }),
  ).toBe(undefined);
  expect(
    await write(file, "// @ts-ignore\nconst a = 3;\n", { [file]: src }),
  ).toBe(undefined);
});
test("a suppression word in a Markdown file gets no ask", async () => {
  expect(await write("/w/docs/a.md", "Use `biome-ignore` with a reason.")).toBe(
    undefined,
  );
});
test("an edit of a normal source file gets no ask", async () => {
  const file = "/w/src/a.mjs";
  expect(await edit(file, "a", "b", { [file]: "a" })).toBe(undefined);
});
