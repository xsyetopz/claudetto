// The ask for a lint config, a CI file, a hook file, a skipped test, and a lint suppression (decision H5).
// Files are strings and no file is read from disk.

import { expect, test } from "bun:test";
import type {
  Payload,
  ToolInput,
} from "../../../plugins/dotclaude/features/adherence/text.ts";
import type { HookOutput } from "../../../plugins/dotclaude/lib/hook-io.ts";
import { decideAsk as decide } from "../../support/verdicts.ts";
import { filesByPath } from "./stub-fs.ts";

/** The `hookSpecificOutput` of an ask, as `decide` gives it. */
type Ask = HookOutput["hookSpecificOutput"];

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

test("a `Write` of a new lint config gets an ask", async () => {
  asks(await write("/w/biome.json", "{}"), "biome.json");
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

for (const rel of [
  "plugins/x/hooks/hooks.json",
  "plugins/x/hooks/register.mjs",
]) {
  test(`an \`Edit\` of the hook file \`${rel}\` gets an ask`, async () => {
    const file = `/w/${rel}`;
    asks(await edit(file, "a", "b", { [file]: "a" }), rel);
  });
}

const SETTINGS = "/w/.claude/settings.json";
test("an edit of `hooks` in a settings file gets an ask", async () => {
  const before = '{"hooks":{"Stop":[]},"model":"x"}';
  const after = '{"hooks":{"Stop":[{"a":1}]},"model":"x"}';
  asks(
    await edit(SETTINGS, before, after, { [SETTINGS]: before }),
    ".claude/settings.json",
  );
});
test("a `Write` of `hooks` to a new settings file gets an ask", async () => {
  asks(
    await write("/w/.claude/settings.local.json", '{"hooks":{}}'),
    ".claude/settings.local.json",
  );
});
test("an edit of another key in a settings file gets no ask", async () => {
  const before = '{"hooks":{"Stop":[]},"model":"x"}';
  const after = '{"hooks":{"Stop":[]},"model":"y"}';
  expect(await edit(SETTINGS, '"x"', '"y"', { [SETTINGS]: before })).toBe(
    undefined,
  );
  expect(await write(SETTINGS, after, { [SETTINGS]: before })).toBe(undefined);
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
test("a test edit that adds a normal assertion gets no ask", async () => {
  expect(
    await edit(TEST, "// end", "assert.ok(f());\n// end", { [TEST]: "// end" }),
  ).toBe(undefined);
});
test("a skipped test that the file already holds gets no ask", async () => {
  const src = 'test.skip("a", () => {});\n// end';
  expect(
    await edit(TEST, "// end", "assert.ok(f());\n// end", { [TEST]: src }),
  ).toBe(undefined);
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
