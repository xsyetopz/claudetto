// The fault test of `just docker` with no `docker` CLI (task 2.1 of change `0-3-0`, spec `release-evidence` "Docker Down").
// Fault 34 of `.claudetto/0.3.0-findings.md`: the recipe exited `1` with no output, and the test failed on `v0.2.0` (`test.failing`).

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "../support/repo.ts";

// Fixed by task 11.5.
test.failing("fault 34: `tools/docker.ts` names the missing `docker` CLI and the command that starts it", () => {
  const run = Bun.spawnSync([process.execPath, "tools/docker.ts", "check"], {
    cwd: REPO,
    env: { PATH: path.dirname(process.execPath), HOME: process.env["HOME"] },
  });
  const text = `${run.stdout}${run.stderr}`;
  expect(run.exitCode).not.toBe(0);
  expect(text).toContain("`docker`");
  expect(text).toMatch(/open -a OrbStack|orb start/);
});
