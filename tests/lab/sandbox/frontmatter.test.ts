// Pins `dotclaude-sandbox --check-frontmatter`: it runs one headless session with a debug log,
// prints each line that names an unknown frontmatter field, and exits 1 when there is one.
// A fake `claude` first on `PATH` writes the debug file, so no test starts Claude Code.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { withPathFirst, writeProgram } from "../../support/fake-program.ts";
import { type Env, PLUGINS, tmpDir } from "../../support/repo.ts";
import { spawnText } from "../fixture-repo.ts";

const LAB = path.join(PLUGINS, "dotclaude-lab");
const UNKNOWN = "[WARN] agents/x.md: unknown frontmatter field `foo`";

// Writes `FAKE_LOG_TEXT` to the file after `--debug-file`, and records its arguments.
// Exits with `FAKE_EXIT`.
const FAKE_CLAUDE = `(async () => {
const argv = process.argv.slice(2);
await Bun.write(process.env.FAKE_OUT, JSON.stringify(argv));
if (process.env.FAKE_LOG_TEXT !== undefined)
  await Bun.write(argv[argv.indexOf("--debug-file") + 1], process.env.FAKE_LOG_TEXT);
process.exit(Number(process.env.FAKE_EXIT ?? 0));
})();
`;

type Setup = { dir: string; claude: string; out: string };

async function setUp(): Promise<Setup> {
  const dir = tmpDir("lab-frontmatter");
  const claude = await writeProgram(dir, "claude", FAKE_CLAUDE);
  return { dir, claude, out: path.join(dir, "out.json") };
}

function run(s: Setup, env: Env, lab = LAB) {
  const r = spawnText(
    process.execPath,
    [
      path.join(lab, "bin/dotclaude-sandbox"),
      "--dir",
      path.join(s.dir, "sandbox"),
      "--check-frontmatter",
    ],
    {
      env: {
        ...withPathFirst(process.env, s.dir),
        CLAUDE_CODE_OAUTH_TOKEN: "t",
        FAKE_OUT: s.out,
        ...env,
      },
    },
  );
  return r;
}

test("a log with no unknown-field line passes", async () => {
  const s = await setUp();
  const r = run(s, { FAKE_LOG_TEXT: "[DEBUG] loaded 3 agents\n" });
  expect(r.status, r.stderr).toBe(0);
  const argv = JSON.parse(await Bun.file(s.out).text());
  expect(argv.includes("--debug-file")).toBeTruthy();
  expect(argv.slice(-2)).toStrictEqual(["-p", "Reply with OK."]);
  expect(!argv.includes("--check-frontmatter")).toBeTruthy();
});

test("a log with an unknown-field line fails and the output names the line", async () => {
  const s = await setUp();
  const r = run(s, { FAKE_LOG_TEXT: `[DEBUG] loaded\n${UNKNOWN}\n` });
  expect(r.status, r.stderr).toBe(1);
  expect(r.stdout.includes(UNKNOWN), r.stdout).toBeTruthy();
});

test("a failed session fails the check", async () => {
  const s = await setUp();
  const r = run(s, { FAKE_LOG_TEXT: "", FAKE_EXIT: "3" });
  expect(r.status).toBe(1);
  expect(r.stderr).toMatch(/\b3\b/);
});

test("a session with no debug log fails the check", async () => {
  const s = await setUp();
  const r = run(s, {});
  expect(r.status).toBe(1);
});

test("mutation: a check that ignores the log would pass the unknown-field log", async () => {
  const s = await setUp();
  const copy = path.join(s.dir, "lab");
  fs.cpSync(LAB, copy, { recursive: true });
  const file = path.join(copy, "slices/sandbox/domain/frontmatter.ts");
  const source = await Bun.file(file).text();
  const mutated = source.replace("hits.length === 0 ? 0 : 1", "0");
  expect(mutated, "the mutation must change the file").not.toBe(source);
  await Bun.write(file, mutated);
  const env = { FAKE_LOG_TEXT: `${UNKNOWN}\n` };
  expect(run(s, env, copy).status).toBe(0);
  expect(run(s, env).status).toBe(1);
});
