// `trace` reads `git diff <base>..HEAD` of a change, and reports each orphan and each uncited line.

import { describe, expect, test } from "bun:test";
import {
  commitFile,
  file,
  git,
  packageIn,
  phase,
  write,
} from "../cli/run-phase.ts";

const EVENTS = ".dotclaude/spec/changes/c1/events.jsonl";

/** Sets the time of each event of `c1` that `implement` wrote, so the commits of a test come before or after it. */
const implementedAt = async (root: string, at: string, sha?: string) => {
  const text = await file(root, EVENTS);
  const edited = text
    .split("\n")
    .map((l) => {
      if (
        !l.includes('"state":"doing"') &&
        !l.includes('"state":"implementing"')
      )
        return l;
      const e = { ...JSON.parse(l), at };
      if (sha !== undefined && e.package === "P1") e.sha = sha;
      return JSON.stringify(e);
    })
    .join("\n");
  await write(root, EVENTS, edited);
};

/** A commit with the file `rel` at the date `date` (a Unix time in seconds). */
const commitAt = (root: string, rel: string, text: string, date: number) => {
  const env = { ...process.env, GIT_COMMITTER_DATE: `${date} +0000` };
  Bun.write(`${root}/${rel}`, text);
  for (const args of [
    ["add", "--", rel],
    ["commit", "-q", "-m", rel],
  ]) {
    const r = Bun.spawnSync(
      ["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args],
      { cwd: root, env },
    );
    if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  }
};

const traced = async (root: string, ...args: string[]) =>
  phase(root, "trace", "c1", ...args);

describe("trace", () => {
  test("a diff with a cited line and trivial lines is clean", async () => {
    const root = await packageIn("doing");
    await implementedAt(root, "2000-01-01T00:00:00.000Z");
    commitFile(
      root,
      "src/a.ts",
      [
        'import { b } from "./b.ts";',
        "",
        "// a comment",
        "export const a = b(); // [REQ-1]",
        "}",
        "",
      ].join("\n"),
    );
    const r = await traced(root);
    expect(r.err).toEqual([]);
    expect(r.code).toBe(0);
    expect(r.out.join("\n")).toContain("no orphan");
  });

  test("an uncited line gives its file and line, and exit 1", async () => {
    const root = await packageIn("doing");
    await implementedAt(root, "2000-01-01T00:00:00.000Z");
    commitFile(root, "src/a.ts", "// ok\nexport const a = 1;\n");
    const r = await traced(root);
    expect(r.code).toBe(1);
    expect(r.out).toEqual(["src/a.ts:2: uncited line `export const a = 1;`"]);
  });

  test("an orphan ID gives its file, line, and ID", async () => {
    const root = await packageIn("doing");
    await implementedAt(root, "2000-01-01T00:00:00.000Z");
    commitFile(root, "src/a.ts", "run(); // [REQ-1, REQ-77]\n");
    const r = await traced(root, "--json");
    expect(r.code).toBe(1);
    expect(r.json).toMatchObject({
      command: "trace",
      change: "c1",
      findings: [{ kind: "orphan", file: "src/a.ts", line: 1, id: 77 }],
    });
  });

  test("Markdown, JSON, lock files, and generated files are skipped", async () => {
    const root = await packageIn("doing");
    const base = commitFile(
      root,
      ".gitattributes",
      "gen/** linguist-generated\n",
    );
    await implementedAt(root, "2000-01-01T00:00:00.000Z", base);
    for (const rel of ["a.md", "a.json", "bun.lock", "gen/out.ts"])
      await write(root, rel, "words and more\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "skipped files");
    const r = await traced(root);
    expect(r.out.join("\n")).not.toContain("words");
    expect(r.code).toBe(0);
  });

  test("a generated file that the attributes do not mark is read", async () => {
    const root = await packageIn("doing");
    const base = commitFile(
      root,
      ".gitattributes",
      "gen/** linguist-generated=false\n",
    );
    await implementedAt(root, "2000-01-01T00:00:00.000Z", base);
    commitFile(root, "gen/out.ts", "words();\n");
    expect((await traced(root)).out).toEqual([
      "gen/out.ts:1: uncited line `words();`",
    ]);
  });

  test("the base is the sha of the implement event when it has one", async () => {
    const root = await packageIn("doing");
    const old = commitFile(root, "src/old.ts", "old();\n");
    commitFile(root, "src/new.ts", "fresh();\n");
    await implementedAt(root, "2000-01-01T00:00:00.000Z", old);
    const r = await traced(root, "--json");
    expect(r.json["base"]).toBe(old);
    expect(
      (r.json["findings"] as { file: string }[]).map((f) => f.file),
    ).toEqual(["src/new.ts"]);
  });

  test("with no sha the base is the parent of the first commit after the event", async () => {
    const root = await packageIn("doing");
    commitAt(root, "src/old.ts", "old();\n", 1_262_304_000);
    const before = git(root, "rev-parse", "HEAD");
    commitAt(root, "src/new.ts", "fresh();\n", 1_577_836_800);
    await implementedAt(root, "2015-01-01T00:00:00.000Z");
    const r = await traced(root, "--json");
    expect(r.json["base"]).toBe(before);
    expect(
      (r.json["findings"] as { file: string }[]).map((f) => f.file),
    ).toEqual(["src/new.ts"]);
  });

  test("a commit before the implement event is not read", async () => {
    const root = await packageIn("doing");
    commitFile(root, "src/old.ts", "old();\n");
    await implementedAt(root, "2999-01-01T00:00:00.000Z");
    const r = await traced(root, "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ base: null, findings: [] });
  });

  test("a change that does not exist is refused", async () => {
    const root = await packageIn("doing");
    expect((await phase(root, "trace", "none")).code).toBe(1);
  });
});
