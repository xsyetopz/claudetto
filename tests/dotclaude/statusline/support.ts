// The fakes and fixtures of the tests of the `statusline` slice.

import { fileReader } from "../../../src/kernel/node/fs.ts";
import type { Deps } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";

/** A fixed clock: 2026-10-12T12:00:00Z in milliseconds. */
export const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);

/** The status object of a session with every field that a segment reads. */
export const STATUS = {
  cwd: "/work/dotclaude",
  model: { id: "claude-opus-5-5", display_name: "Opus 5.5" },
  workspace: { current_dir: "/work/dotclaude", project_dir: "/work/dotclaude" },
  cost: {
    total_cost_usd: 1.234,
    total_lines_added: 300,
    total_lines_removed: 20,
  },
  context_window: { total_input_tokens: 45_000, context_window_size: 300_000 },
  effort: { level: "high" },
  thinking: { enabled: true },
  rate_limits: {
    five_hour: {
      used_percentage: 23,
      resets_at: NOW / 1000 + 3 * 3600 + 12 * 60,
    },
    seven_day: {
      used_percentage: 80,
      resets_at: NOW / 1000 + 2 * 86_400 + 4 * 3600,
    },
  },
};

/** The output of `git status --porcelain=v2 -b` for a dirty branch that is ahead and behind. */
export const GIT_TEXT = [
  "# branch.oid 1234567890abcdef",
  "# branch.head main",
  "# branch.upstream origin/main",
  "# branch.ab +1 -2",
  "1 .M N... 100644 100644 100644 aa bb a.ts",
  "? b.ts",
].join("\n");

/** The result of a run of the CLI. */
export type Run = { status: number; out: string[]; err: string[] };

/** The deps of `main` with fakes. `over` replaces any of them. */
export const depsFor = (
  input: unknown,
  run: Run,
  over: Partial<Deps> = {},
): Deps => ({
  stdin: async () =>
    typeof input === "string" ? input : JSON.stringify(input),
  env: { COLUMNS: "124" },
  now: () => NOW,
  cwd: "/work/dotclaude",
  files: fileReader,
  write: async () => {},
  runner: {
    run: () => ({ exitCode: 0, stdout: GIT_TEXT, stderr: "" }),
  },
  log: (line) => run.out.push(line),
  error: (text) => run.err.push(text),
  ...over,
});
