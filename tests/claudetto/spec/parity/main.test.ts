// The record of `@fission-ai/openspec@1.14.3` for each command that MiniSpec keeps (task 8.1 of change `0-3-0`, design D10),
// and the check that `minispec` gives the same facts (task 8.2).
// Each case runs on a fresh project with the three samples, the change `bad-scenario`, and the overlays that it names.
// The snapshot holds the exit code, the facts that the command prints, and the files that it writes, with the paths and dates replaced.
// `minispec` must give the same projection of that record, unless the case names a difference of `DIFFERENCES`.
// Design D10 ("Differences from OpenSpec") names each difference with its reason.

import { expect, test } from "bun:test";
import path from "node:path";
import { OPENSPEC_RUN_TIMEOUT_MS } from "../../../../tools/limits.ts";
import { minispec, openspec } from "../../../support/openspec.ts";
import { REPO } from "../../../support/repo.ts";
import { CASES, DIFFERENCES, type Difference } from "./cases.ts";
import { project, record } from "./record.ts";

test.each(CASES.map((c) => [c.name, c.args, c.empty, c.overlays] as const))(
  "OpenSpec 1.14.3: %s",
  // A rest parameter, because `bun test` reads a third named parameter as the `done` callback of the test.
  async (...[, args, empty, overlays]) => {
    expect(
      await record(openspec, [...args], empty, overlays),
    ).toMatchSnapshot();
  },
  OPENSPEC_RUN_TIMEOUT_MS,
);

test.each(
  CASES.map(
    (c) =>
      [
        `${c.name}${c.differences ? ` (differs: ${c.differences.join(", ")})` : ""}`,
        c,
      ] as const,
  ),
)(
  "MiniSpec equals OpenSpec 1.14.3: %s",
  async (...[, c]) => {
    const text = c.text ?? true;
    const command = c.args[0] ?? "";
    const os = project(
      "openspec",
      command,
      await record(openspec, c.args, c.empty, c.overlays),
      text,
    );
    const ms = project(
      "minispec",
      command,
      await record(minispec, c.args, c.empty, c.overlays),
      text,
    );
    expect(ms).toEqual(c.expected ? c.expected(os) : os);
  },
  OPENSPEC_RUN_TIMEOUT_MS,
);

test("each named difference is used by a case and is in design D10", async () => {
  const design = await Bun.file(
    path.join(REPO, "openspec/changes/archive/2026-10-23-0-3-0/design.md"),
  ).text();
  const d10 = design.slice(
    design.indexOf("### D10"),
    design.indexOf("### D11"),
  );
  for (const id of Object.keys(DIFFERENCES)) {
    expect(
      CASES.some((c) => c.differences?.includes(id as Difference)),
      `${id} has no case`,
    ).toBe(true);
    expect(d10, `${id} is not in D10`).toContain(`\`${id}\``);
  }
});
