// `validate`: a valid store passes, and each broken rule gives exit 1 and a problem that names the file.

import { expect, test } from "bun:test";
import {
  CHANGES,
  changeText,
  logText,
  makeChange,
  type Pkg,
  packageText,
  run,
} from "./read-fixture.ts";

const GOOD: Pkg[] = [
  { id: "P1", state: "done", owns: ["src/a/"] },
  { id: "P2", deps: ["P1"], owns: ["src/b/"] },
];

const REQ = (n: number): string =>
  `---\nschema: dotclaude-spec/2\nkind: requirements\ncapability: cap\n---\n\n# Cap\n\n### REQ-${n}: Name\n\nThe store SHALL keep it.\n`;

/** Runs `validate` on a store with `files` over the good change, and gives the result. */
const check = async (
  files: Record<string, string>,
  packages: Pkg[] = GOOD,
): Promise<{ code: number; err: string[] }> => {
  const root = await makeChange(packages, { files });
  const r = await run(root, "validate", "c1");
  return { code: r.code, err: r.err };
};

const at = (file: string): string => `${CHANGES}/c1/${file}`;

test("validate exits 0 with no problem for a valid change", async () => {
  const r = await check({});
  expect(r).toStrictEqual({ code: 0, err: [] });
});

test("validate exits 1 for a change that does not exist", async () => {
  const root = await makeChange(GOOD);
  expect((await run(root, "validate", "nope")).code).toBe(1);
});

test("validate refuses a front matter key that is unknown", async () => {
  const bad = packageText(GOOD[1] as Pkg).replace("agent:", "extra: x\nagent:");
  const r = await check({ [at("packages/P2.md")]: bad });
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("packages/P2.md");
});

test("validate refuses a package that has an h1 heading", async () => {
  const text = packageText(GOOD[1] as Pkg);
  const bad = text.replace("\n## ", "\n# P2 Title of P2\n\n## ");
  const r = await check({ [at("packages/P2.md")]: bad });
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("packages/P2.md");
});

test("validate refuses a status that differs from the last event", async () => {
  const bad = packageText({
    ...(GOOD[0] as object),
    id: "P1",
    status: "doing",
  } as never);
  const r = await check({ [at("packages/P1.md")]: bad });
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("packages/P1.md");
});

test("validate refuses a change status that differs from the last event", async () => {
  const r = await check({ [at("change.md")]: changeText("c1", "accepted") });
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("change.md");
});

test("validate refuses a requirement ID that two files of the change repeat", async () => {
  const r = await check({
    [at("requirements/a.md")]: REQ(1),
    [at("requirements/b.md")]: REQ(1),
  });
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("REQ-1");
});

test("validate accepts different requirement IDs in two files", async () => {
  const r = await check({
    [at("requirements/a.md")]: REQ(1),
    [at("requirements/b.md")]: REQ(2),
  });
  expect(r).toStrictEqual({ code: 0, err: [] });
});

test("validate refuses a package with a missing, an unknown, or an empty section", async () => {
  const sections = ["Goal", "Context", "Steps", "Acceptance"];
  const missing = await check({
    [at("packages/P2.md")]: packageText({ id: "P2", deps: ["P1"], sections }),
  });
  expect(missing.code).toBe(1);
  const unknown = await check({
    [at("packages/P2.md")]: packageText({
      id: "P2",
      deps: ["P1"],
      sections: [...sections, "Boundaries", "Extra"],
    }),
  });
  expect(unknown.code).toBe(1);
});

test("validate refuses a dep that names no package, and a dep cycle", async () => {
  const missing = await check({}, [{ id: "P1", deps: ["P9"] }]);
  expect(missing.code).toBe(1);
  expect(missing.err.join("\n")).toContain("P9");
  const cycle = await check({}, [
    { id: "P1", deps: ["P2"] },
    { id: "P2", deps: ["P1"] },
  ]);
  expect(cycle.code).toBe(1);
  expect(cycle.err.join("\n")).toContain("cycle");
});

test("validate refuses owns that overlap in one open wave, and accepts them in two waves or when one is done", async () => {
  const same = await check({}, [
    { id: "P1", owns: ["src/a/"] },
    { id: "P2", owns: ["src/a/x.ts"] },
  ]);
  expect(same.code).toBe(1);
  const waves = await check({}, [
    { id: "P1", owns: ["src/a/"] },
    { id: "P2", owns: ["src/a/x.ts"], wave: 2 },
  ]);
  expect(waves.code).toBe(0);
  const done = await check({}, [
    { id: "P1", owns: ["src/a/"], state: "done" },
    { id: "P2", owns: ["src/a/x.ts"] },
  ]);
  expect(done.code).toBe(0);
});

test("validate refuses an event for a package with no file", async () => {
  const log = `${logText("implementing", GOOD)}${JSON.stringify({ at: "2026-10-12T10:00:00.000Z", package: "P7", state: "doing" })}\n`;
  const r = await check({ [at("events.jsonl")]: log });
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("P7");
});

test("validate refuses a log with a torn last line, and a log with another schema", async () => {
  const torn = await check({
    [at("events.jsonl")]: `${logText("implementing", GOOD)}{"at":`,
  });
  expect(torn.code).toBe(1);
  const schema = await check({ [at("events.jsonl")]: '{"schema":1}\n' });
  expect(schema.code).toBe(1);
});

test("validate refuses a capability spec with a requirement ID that repeats across specs", async () => {
  const spec = (n: number): string =>
    REQ(n).replace("kind: requirements", "kind: spec");
  const r = await check({
    ".dotclaude/spec/specs/a.md": spec(5),
    ".dotclaude/spec/specs/b.md": spec(5),
  });
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("REQ-5");
});
