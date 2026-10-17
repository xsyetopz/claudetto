// The ask for hook files, more test file shapes, settings and tool config keys, and the cases that get no ask (decision H5).
// Files are strings and no file is read from disk.

import { expect, test } from "bun:test";
import type {
  Payload,
  ToolInput,
} from "../../../plugins/claudetto/slices/asks/domain/text.ts";
import { SCAN_MAX_CHARS } from "../../../plugins/claudetto/slices/asks/limits.ts";
import { editJudged } from "./calls.ts";
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
/** An `Edit` that adds `line` in front of `// end` in the existing file `rel`. */
const addLine = async (rel: string, line: string) =>
  await edit(`/w/${rel}`, "// end", `${line}\n// end`, {
    [`/w/${rel}`]: "// end",
  });

// Finding 1: hook files.
for (const rel of [".husky/pre-commit", ".pre-commit-config.yaml"]) {
  test(`an \`Edit\` of the hook file \`${rel}\` that removes a line gets an ask`, async () => {
    const file = `/w/${rel}`;
    asks(await edit(file, "a", "b", { [file]: "a" }), rel);
  });
  test(`an \`Edit\` of the hook file \`${rel}\` that adds a line after the last line gets an ask`, async () => {
    const file = `/w/${rel}`;
    asks(await edit(file, "a", "a\nb", { [file]: "a" }), rel);
  });
}
test("an `Edit` of the hook file `Stop.prompt.txt` that drops the block gets an ask", async () => {
  const rel = "plugins/x/hooks/Stop.prompt.txt";
  const file = `/w/${rel}`;
  const src = "Block the stop when a check fails.\nGive the reason.\n";
  asks(
    await edit(file, "Block the stop when a check fails.", "Allow the stop.", {
      [file]: src,
    }),
    rel,
  );
});
test("an `Edit` of the hook file `Stop.prompt.txt` that adds a line gets an ask", async () => {
  const rel = "plugins/x/hooks/Stop.prompt.txt";
  const file = `/w/${rel}`;
  const src = "Block the stop when a check fails.\n";
  asks(
    await edit(file, "fails.", "fails.\nGive the reason.", { [file]: src }),
    rel,
  );
});
test("an `Edit` of the hook file `description.txt` that changes a line gets an ask", async () => {
  const file = "/w/plugins/x/hooks/description.txt";
  asks(
    await edit(file, "a", "b", { [file]: "a" }),
    "plugins/x/hooks/description.txt",
  );
});

const HOOKS = JSON.stringify({
  hooks: {
    Stop: [
      {
        hooks: [
          {
            type: "command",
            command: `node "\${CLAUDE_PLUGIN_ROOT}/features/checks/cli.ts"`,
          },
          { type: "command", command: "sh ./bin/gate.sh --strict" },
        ],
      },
    ],
  },
});
/** A script that `hooks.json` names: the path, a check line, and a line that cannot fail. */
const SCRIPTS: [string, string, string][] = [
  [
    "plugins/x/features/checks/cli.ts",
    'if (bad) throw new Error("x");',
    "if (bad) log();",
  ],
  ["plugins/x/bin/gate.sh", 'test -n "$1" || exit 1', "exit 0"],
];
for (const [rel, check, soft] of SCRIPTS) {
  const files = {
    "/w/plugins/x/hooks/hooks.json": HOOKS,
    [`/w/${rel}`]: `${check}\nrun\n`,
  };
  test(`a script that \`hooks.json\` names, \`${rel}\`, gets an ask when it loses its check`, async () => {
    asks(await edit(`/w/${rel}`, check, soft, files), rel);
  });
  test(`a script that \`hooks.json\` names, \`${rel}\`, gets an ask when it changes another line`, async () => {
    asks(await edit(`/w/${rel}`, "run", "run --fast", files), rel);
  });
}
test("a project `hooks/hooks.json` names a script of the project", async () => {
  const files = {
    "/w/hooks/hooks.json": JSON.stringify({
      hooks: { Stop: [{ hooks: [{ command: "node scripts/gate.mjs" }] }] },
    }),
    "/w/scripts/gate.mjs": "if (bad) throw new Error('x');\n",
  };
  asks(
    await edit("/w/scripts/gate.mjs", "throw new Error('x')", "log()", files),
    "scripts/gate.mjs",
  );
});
test("a script that no `hooks.json` names gets no ask", async () => {
  const files = {
    "/w/plugins/x/hooks/hooks.json": HOOKS,
    "/w/plugins/x/features/other/cli.mjs": "a",
  };
  expect(
    await edit("/w/plugins/x/features/other/cli.mjs", "a", "b", files),
  ).toBe(undefined);
});

// Finding 2: test files.
for (const rel of [
  "pkg/a_test.go",
  "tests/x.py",
  "pkg/test_a.py",
  "a_test.py",
]) {
  test(`a skipped test in the test file \`${rel}\` gets an ask`, async () => {
    const line = rel.endsWith(".go") ? "t.Skip(1)" : "pytest.skip(1)";
    asks(await addLine(rel, line), rel);
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
  test(`a new line \`${line}\` in a test file gets an ask`, async () => {
    asks(await addLine("src/a.test.mjs", line), "src/a.test.mjs");
  });
}
test("`#[ignore]` in a Rust file at any path gets an ask", async () => {
  asks(await addLine("src/lib.rs", "#[ignore]"), "src/lib.rs");
});

// Finding 3: false asks.
for (const rel of [
  ".github/ISSUE_TEMPLATE/bug.md",
  ".github/pull_request_template.md",
  ".github/CODEOWNERS",
]) {
  test(`an edit of \`${rel}\` gets no ask`, async () => {
    const file = `/w/${rel}`;
    expect(await edit(file, "a", "b", { [file]: "a" })).toBe(undefined);
  });
}
for (const rel of [
  ".github/workflows/ci.yml",
  ".github/actions/x/action.yml",
]) {
  test(`an edit of the CI file \`${rel}\` gets an ask`, async () => {
    const file = `/w/${rel}`;
    asks(await edit(file, "a", "b", { [file]: "a" }), rel);
  });
}
test("a `skip` key with a number value in a test file goes to the test judge", async () => {
  const line = "const q = { skip: 2, take: 5 };";
  const file = "/w/src/a.test.mjs";
  expect(
    await editJudged(file, "// end", "// end", `${line}\n// end`, line),
  ).toBe(true);
});
for (const line of [
  "const re = /biome-ignore/;",
  'const s = "// eslint-disable-next-line";',
  "const t = `@ts-ignore`;",
]) {
  test(`a suppression word in a literal, \`${line}\`, gets no ask`, async () => {
    expect(await addLine("src/a.mjs", line)).toBe(undefined);
  });
}
test("a suppression word after code in a comment gets an ask", async () => {
  asks(await addLine("src/a.mjs", "run(); /* eslint-disable */"), "src/a.mjs");
});

// Finding 4: more cases.
test("a lint config asks for a text over the scan bound", async () => {
  asks(
    await write("/w/biome.json", "x".repeat(SCAN_MAX_CHARS + 1), {
      "/w/biome.json": "{}",
    }),
    "biome.json",
  );
});
const PY = "[tool.ruff]\nline-length = 80\n\n[project]\nname = 'x'\n";
test("an edit inside `[tool.ruff]` of `pyproject.toml` gets an ask", async () => {
  const f = { "/w/pyproject.toml": PY };
  asks(await edit("/w/pyproject.toml", "= 80", "= 200", f), "pyproject.toml");
});
test("an edit of `[project]` in `pyproject.toml` gets no ask", async () => {
  const f = { "/w/pyproject.toml": PY };
  expect(await edit("/w/pyproject.toml", "'x'", "'y'", f)).toBe(undefined);
});
test("an edit of a linter section of `setup.cfg` gets an ask", async () => {
  const src = "[flake8]\nmax-line-length = 80\n[metadata]\nname = x\n";
  const f = { "/w/setup.cfg": src };
  asks(await edit("/w/setup.cfg", "= 80", "= 200", f), "setup.cfg");
  expect(await edit("/w/setup.cfg", "= x", "= y", f)).toBe(undefined);
});
const PKG = '{"name":"x","scripts":{"lint":"biome check","build":"tsc"}}';
test("a change of a `lint` script in `package.json` gets an ask", async () => {
  const f = { "/w/package.json": PKG };
  asks(await edit("/w/package.json", "biome check", "true", f), "package.json");
});
test("a new `typecheck` script in `package.json` gets an ask", async () => {
  const f = { "/w/package.json": PKG };
  asks(
    await edit(
      "/w/package.json",
      '"build"',
      '"typecheck":"tsc --noEmit","build"',
      f,
    ),
    "package.json",
  );
});
test("a change of the `build` script in `package.json` gets no ask", async () => {
  const f = { "/w/package.json": PKG };
  expect(await edit("/w/package.json", '"tsc"', '"swc"', f)).toBe(undefined);
});
test("a change of `permissions` in a settings file gets an ask", async () => {
  const file = "/w/.claude/settings.json";
  const before = '{"permissions":{"allow":[]},"model":"x"}';
  const after = '{"permissions":{"allow":["Bash"]},"model":"x"}';
  asks(
    await edit(file, before, after, { [file]: before }),
    ".claude/settings.json",
  );
});
