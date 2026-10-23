// Spec `prompt-base`, "Rule Kept": each claudetto tool text keeps each rule of the default text that the model needs.
// `fixtures/tool-texts-2.1.309.json` holds the default texts of a stub capture of Claude Code 2.1.309.
// Each rule is a pair: a phrase of the default text, which shows that the rule is there, and a phrase of the claudetto text.

import { expect, test } from "bun:test";
import { TOOL_TEXTS } from "../../../plugins/claudetto/slices/prompt/domain/tools.ts";
import DEFAULTS from "./fixtures/tool-texts-2.1.309.json";

const RULES: Readonly<Record<string, readonly (readonly [string, string])[]>> =
  {
    Bash: [
      ["prefer absolute paths", "Use absolute paths"],
      [
        "Shell state (env vars, functions) does not persist",
        "the shell state (env vars, functions) resets",
      ],
      [
        "`cat`, `head`, `tail`, `sed`, `awk`, or `echo`",
        "`cat`, `head`, `tail`, `sed`, `awk`, or `echo`",
      ],
      ["not reliably to the user", "not always to the user"],
      ["default 120000, max 600000", "120000 by default, 600000 at most"],
      [
        "(default 600000, max 7200000)",
        "600000 by default and 7200000 at most",
      ],
      ["No `&` needed", "with no `&`"],
      ["use Monitor with an until-loop", "use `Monitor` with an until-loop"],
      [
        "Interactive flags",
        "use flags with no prompt, because `-i` needs a terminal",
      ],
      ["Use the `gh` CLI", "Use `gh` for GitHub"],
      [
        "Commit or push only when the user asks",
        "Commit or push only when the user asks",
      ],
      [
        "If on the default branch, branch first",
        "make a branch first on the default branch",
      ],
      ["attribution lines", "attribution lines"],
    ],
    Edit: [
      ["You must Read the file", "`Read` the file in this conversation first"],
      ["be unique", "must be unique"],
      ["Strip the Read line prefix", "Remove the line prefix of `Read`"],
      ["`replace_all: true`", "`replace_all: true`"],
    ],
    Read: [
      ["must be an absolute path", "is an absolute path"],
      ["up to 2000 lines", "2000 lines by default"],
      ["only read that part", "read only that part"],
      ["cat -n format", "`cat -n`"],
      ["required for PDFs over 10 pages", "more than 10 pages needs `pages`"],
      ["max 20 pages/request", "20 pages at most"],
      ["Jupyter notebooks", "Jupyter notebooks"],
      ["Reading a directory", "A folder, a missing file, or an empty file"],
      [
        "Do NOT re-read a file you just edited",
        "Trust a successful edit with no new read",
      ],
    ],
    Write: [
      ["overwriting if one exists", "replaces the file when it exists"],
      ["you haven't Read will fail", "that you skipped in `Read` fails"],
      ["use Edit instead", "use `Edit`"],
    ],
    Skill: [
      ["call this tool first", "call this tool first"],
      ["run in a subagent", "run in a subagent"],
      [
        "don't wait on it or invoke it again",
        "so go on with other work, and start it one time",
      ],
      ["`/<name>`", "`/<name>`"],
      ["`plugin:skill`", "`plugin:skill`"],
      ["`apps/web:deploy`", "`apps/web:deploy`"],
      ["`args`", "`args`"],
      ["aren't skills", "is no skill"],
      ["`<command-name>` block", "`<command-name>` block"],
    ],
    ToolSearch: [
      ["Deferred tools appear by name", "The deferred tools are named"],
      [
        "cannot be invoked",
        "Call a deferred tool only after you get its schema",
      ],
      ["<functions> block", "`<functions>` block"],
      ['"select:Read,Edit,Grep"', '"select:Read,Edit,Grep"'],
      ['"notebook jupyter"', '"notebook jupyter"'],
      ['"+slack send"', '"+slack send"'],
    ],
  };

for (const [tool, rules] of Object.entries(RULES))
  test(`Rule Kept: the claudetto text of \`${tool}\` keeps each rule of the default text, and is shorter`, () => {
    const before = (DEFAULTS as Record<string, string>)[tool] ?? "";
    const after = TOOL_TEXTS[tool] ?? "";
    for (const [was, is] of rules) {
      expect(before, `${tool}: ${was}`).toContain(was);
      expect(after, `${tool}: ${is}`).toContain(is);
    }
    expect(after.length).toBeLessThan(before.length);
  });
