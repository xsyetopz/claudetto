// The skill `find-docs` runs only the pinned, read-only `ctx7` CLI, and the settings snippet allows the same commands (D7 of change `redesign-0-4-0`).

import { expect, test } from "bun:test";
import { DOCS_SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import { CTX7_HELP_TIMEOUT_MS } from "../../../tools/limits.ts";

const SKILL = await Bun.file(
  "plugins/claudetto/skills/find-docs/SKILL.md",
).text();
/** The `allowed-tools` rules of the skill, one for each `ctx7` subcommand. */
const ALLOWED = (SKILL.match(/^allowed-tools: (.*)$/m)?.[1] ?? "").split(
  / (?=Bash\()/,
);
const VERSION = SKILL.match(/ctx7@([^ ]+) /)?.[1] ?? "";
const rule = (sub: string) =>
  `Bash(CTX7_TELEMETRY_DISABLED=1 bunx -y ctx7@${VERSION} ${sub} *)`;

test("the pin is a fixed version, and the skill allows only the read subcommands `library` and `docs`", () => {
  expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  expect(ALLOWED).toStrictEqual(["library", "docs"].map(rule));
});

test("the settings snippet allows the skill of the core plugin and the same commands as the skill", () => {
  expect(DOCS_SNIPPET.permissions.allow).toStrictEqual([
    "Skill(claudetto:find-docs)",
    ...ALLOWED,
  ]);
});

test(
  "the pinned `ctx7` has the `library` and `docs` commands that the skill runs",
  async () => {
    const proc = Bun.spawn(["bunx", "-y", `ctx7@${VERSION}`, "--help"], {
      env: { ...process.env, CTX7_TELEMETRY_DISABLED: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const help = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(help).toMatch(/^ {2}library \[options\] <name> \[query\]/m);
    expect(help).toMatch(/^ {2}docs \[options\] <libraryId> <query>/m);
  },
  CTX7_HELP_TIMEOUT_MS,
);
