// `trace --in <dir>` reads the diff of a worktree, and `trace --package <p>` keeps only the findings in files that the package owns.

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  commitFile,
  eventsOf,
  file,
  git,
  linkedWorktree,
  packageIn,
  phase,
  pkgFile,
  write,
} from "../cli/run-phase.ts";

/** Sets the `owns` key of `P1` to `owns`. */
const owning = async (root: string, owns: string[]) =>
  write(
    root,
    pkgFile("c1"),
    (await file(root, pkgFile("c1"))).replace(
      /^owns: .*$/m,
      `owns: ${JSON.stringify(owns)}`,
    ),
  );

const files = (json: Record<string, unknown>): string[] =>
  (json["findings"] as { file: string }[]).map((f) => f.file);

describe("trace --in", () => {
  test("finds an uncited line that is only on the worktree branch", async () => {
    const root = await packageIn("doing");
    const wt = linkedWorktree(root, "work");
    commitFile(wt, "src/a.ts", "run();\n");
    const r = await phase(root, "trace", "c1", "--in", wt, "--json");
    expect(r.code).toBe(1);
    expect(files(r.json)).toEqual(["src/a.ts"]);
    expect(r.json["base"]).toBe(
      (await eventsOf(root, "c1")).find((e) => e["state"] === "doing")?.["sha"],
    );
  });

  test("reads the main checkout when --in is not given", async () => {
    const root = await packageIn("doing");
    const wt = linkedWorktree(root, "work");
    commitFile(wt, "src/a.ts", "run();\n");
    const r = await phase(root, "trace", "c1", "--json");
    expect(r.code).toBe(0);
    expect(files(r.json)).toEqual([]);
  });

  test("refuses a folder that is not a worktree of the repository", async () => {
    const root = await packageIn("doing");
    const other = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "o-")));
    git(other, "init", "-q", "-b", "main");
    commitFile(other, "src/a.ts", "run();\n");
    const r = await phase(root, "trace", "c1", "--in", other);
    expect(r.code).toBe(1);
    expect(r.out).toEqual([]);
    expect(r.err.join("\n")).toContain("is not a worktree of this repository");
  });
});

describe("trace --package", () => {
  test("leaves out a finding in a file that the package does not own", async () => {
    const root = await packageIn("doing");
    await owning(root, ["src/p1/"]);
    commitFile(root, "src/p1/a.ts", "run();\n");
    commitFile(root, "src/p2/b.ts", "walk();\n");
    const r = await phase(root, "trace", "c1", "--package", "P1", "--json");
    expect(r.code).toBe(1);
    expect(files(r.json)).toEqual(["src/p1/a.ts"]);
  });

  test("passes when only a sibling package has a finding", async () => {
    const root = await packageIn("doing");
    await owning(root, ["src/p1/"]);
    commitFile(root, "src/p2/b.ts", "walk();\n");
    const r = await phase(root, "trace", "c1", "--package", "P1");
    expect(r.code).toBe(0);
  });

  test("without --package it reports every finding", async () => {
    const root = await packageIn("doing");
    await owning(root, ["src/p1/"]);
    commitFile(root, "src/p1/a.ts", "run();\n");
    commitFile(root, "src/p2/b.ts", "walk();\n");
    const r = await phase(root, "trace", "c1", "--json");
    expect(files(r.json)).toEqual(["src/p1/a.ts", "src/p2/b.ts"]);
  });

  test("refuses a package that the change does not have", async () => {
    const root = await packageIn("doing");
    const r = await phase(root, "trace", "c1", "--package", "P9");
    expect(r.code).toBe(1);
    expect(r.out).toEqual([]);
    expect(r.err.length).toBeGreaterThan(0);
  });

  test("works together with --in", async () => {
    const root = await packageIn("doing");
    await owning(root, ["src/p1/"]);
    const wt = linkedWorktree(root, "work");
    commitFile(wt, "src/p1/a.ts", "run();\n");
    commitFile(wt, "src/p2/b.ts", "walk();\n");
    const r = await phase(
      root,
      "trace",
      "c1",
      "--in",
      wt,
      "--package",
      "P1",
      "--json",
    );
    expect(files(r.json)).toEqual(["src/p1/a.ts"]);
  });
});
