// The scenarios of the capability `minispec` (change `0-3-0`, task 8.2) that the parity test does not cover.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { OPENSPEC_RUN_TIMEOUT_MS } from "../../../tools/limits.ts";
import {
  minispec,
  openspec,
  PRESETS,
  sampleProject,
  tmpEmpty,
} from "../../support/openspec.ts";
import { REPO, walk } from "../../support/repo.ts";

const DELTA = `## Purpose

The capability x does a thing for the tests of MiniSpec.

## ADDED Requirements

### Requirement: A

The system SHALL do A.

#### Scenario: A Happens

- **WHEN** a condition holds
- **THEN** A follows
`;

/** A fresh project with the change `c` of the preset `story` and the delta `specs/x/spec.md`. */
const withDelta = async (delta = DELTA): Promise<string> => {
  const root = tmpEmpty("minispec");
  expect((await minispec(root, ["new", "change", "c"])).code).toBe(0);
  await Bun.write(path.join(root, "openspec/changes/c/specs/x/spec.md"), delta);
  return root;
};

/** Runs the `args` on a project with a delta, and expects the requirement `A` in `openspec/specs/`. */
const mergesDelta = async (root: string, args: string[]): Promise<void> => {
  const run = await minispec(root, args);
  expect(run.code).toBe(0);
  expect(
    await Bun.file(path.join(root, "openspec/specs/x/spec.md")).text(),
  ).toContain("### Requirement: A");
};

const skills = Object.fromEntries(
  ["propose", "apply", "verify"].map((name) => [
    name,
    () =>
      Bun.file(
        path.join(REPO, `plugins/claudetto/skills/${name}/SKILL.md`),
      ).text(),
  ]),
) as Record<"propose" | "apply" | "verify", () => Promise<string>>;

const filesOf = (root: string): string[] =>
  walk(root).map((f) => path.relative(root, f));

test("a fresh project gets only the change folder, and no OpenSpec install", async () => {
  const root = tmpEmpty("minispec-fresh");
  const run = await minispec(root, ["new", "change", "add-thing"]);
  expect(run.code).toBe(0);
  expect(filesOf(root)).toEqual(["openspec/changes/add-thing/.openspec.yaml"]);
  expect(fs.existsSync(path.join(root, ".claude"))).toBe(false);
});

test("Version Name", async () => {
  const root = tmpEmpty("minispec-version");
  const run = await minispec(root, ["new", "change", "release-2.1.309"]);
  expect(run.code).toBe(0);
  expect(run.out).toContain("release-2-1-309");
  expect(
    fs.existsSync(path.join(root, "openspec/changes/release-2-1-309")),
  ).toBe(true);
});

test("Bad Name", async () => {
  const root = tmpEmpty("minispec-bad-name");
  const run = await minispec(root, ["new", "change", "Release_X"]);
  expect(run.code).not.toBe(0);
  expect(run.out).toContain("is not kebab-case");
  expect(filesOf(root)).toEqual([]);
});

test("New Change", async () => {
  const root = tmpEmpty("minispec-no-handoff");
  await minispec(root, ["new", "change", "release-x"]);
  expect(
    fs.existsSync(path.join(root, "openspec/changes/release-x/handoff.md")),
  ).toBe(false);
});

test("`new change` without --schema uses the schema of `config.yaml`, and `story` with no file", async () => {
  const bare = tmpEmpty("minispec-default");
  await minispec(bare, ["new", "change", "a"]);
  expect(
    await Bun.file(path.join(bare, "openspec/changes/a/.openspec.yaml")).text(),
  ).toStartWith("schema: story\n");
  const root = tmpEmpty("minispec-config");
  await Bun.write(path.join(root, "openspec/config.yaml"), "schema: task\n");
  await minispec(root, ["new", "change", "a"]);
  expect(
    await Bun.file(path.join(root, "openspec/changes/a/.openspec.yaml")).text(),
  ).toContain("skip_specs: true");
});

test("a project schema wins over the shipped preset", async () => {
  const root = tmpEmpty("minispec-schema");
  const dir = path.join(root, "openspec/schemas/story");
  fs.cpSync(path.join(PRESETS, "story"), dir, { recursive: true });
  await Bun.write(
    path.join(dir, "schema.yaml"),
    (await Bun.file(path.join(dir, "schema.yaml")).text()).replace(
      "name: story",
      "name: story\nx-marker: 1",
    ),
  );
  await Bun.write(path.join(dir, "templates/proposal.md"), "MINE\n");
  await minispec(root, ["new", "change", "a", "--schema", "story"]);
  const status = JSON.parse(
    (await minispec(root, ["status", "--change", "a", "--json"])).out,
  );
  expect(status.artifacts[0].template).toBe(
    path.join(dir, "templates/proposal.md"),
  );
});

test("`status --json` gives the template, the instruction, the context, the rules, and the apply block", async () => {
  const root = await sampleProject(["story"]);
  await Bun.write(
    path.join(root, "openspec/config.yaml"),
    "schema: story\ncontext: |\n  Stack: Bun\nrules:\n  proposal:\n    - State what is out of scope.\n",
  );
  const status = JSON.parse(
    (
      await minispec(root, [
        "status",
        "--change",
        "add-greeting-name",
        "--json",
      ])
    ).out,
  );
  const proposal = status.artifacts.find(
    (a: { id: string }) => a.id === "proposal",
  );
  expect(path.isAbsolute(proposal.template)).toBe(true);
  expect(await Bun.file(proposal.template).exists()).toBe(true);
  expect(proposal.instruction).toContain("Write why the change is needed.");
  expect(status.context).toBe("Stack: Bun\n");
  expect(status.rules).toEqual({ proposal: ["State what is out of scope."] });
  expect(status.apply.requires).toEqual(["review"]);
  expect(status.apply.instruction).toContain("Stop at a blocker.");
  expect(status.tasks).toEqual({ done: 0, total: 1, next: "1.1" });
});

test("Planning Done", async () => {
  const root = await sampleProject(["story"]);
  await Bun.write(
    path.join(root, "openspec/changes/add-greeting-name/tasks.md"),
    "## 1. A\n\n- [x] 1.1 Done\n\n## 2. B\n\n- [ ] 2.1 Open\n",
  );
  const args = ["status", "--change", "add-greeting-name"];
  const text = await minispec(root, args);
  expect(text.out.trimEnd().split("\n").at(-1)).toBe("Next: /claudetto:apply");
  const json = JSON.parse((await minispec(root, [...args, "--json"])).out);
  expect(json.next).toBe("/claudetto:apply");
  expect(json.tasks.next).toBe("2.1");
  expect(await skills.propose()).toContain("`Next: /claudetto:apply`");
});

test("`status` names `propose` while an artifact is open, and `archive` when each task is done", async () => {
  const root = tmpEmpty("minispec-next");
  await minispec(root, ["new", "change", "a", "--schema", "story"]);
  const args = ["status", "--change", "a"];
  expect((await minispec(root, args)).out).toContain(
    "Next: /claudetto:propose",
  );
  const done = await sampleProject(["story"]);
  await Bun.write(
    path.join(done, "openspec/changes/add-greeting-name/tasks.md"),
    "- [x] 1.1 Done\n",
  );
  const run = await minispec(done, ["status", "--change", "add-greeting-name"]);
  expect(run.out).toContain("All planning artifacts complete!");
  expect(run.out).toContain("Next: /claudetto:archive");
});

test("JSON Only on Request", async () => {
  const root = await sampleProject(["story"]);
  const run = await minispec(root, ["status", "--change", "add-greeting-name"]);
  expect(run.code).toBe(0);
  expect(run.out).toContain("Progress: ");
  expect(run.out).toContain("[x] proposal");
  expect(run.out).toContain("Next: ");
  expect(() => JSON.parse(run.out)).toThrow();
});

test("the skills `propose`, `apply`, and `verify` end with the command as a line", async () => {
  expect(await skills.apply()).toContain("`Next: /claudetto:verify`");
  expect(await skills.verify()).toContain("`Next: /claudetto:archive`");
});

test("`status` gives the ready artifacts of a new change", async () => {
  const root = tmpEmpty("minispec-ready");
  await minispec(root, ["new", "change", "a", "--schema", "story"]);
  const status = JSON.parse(
    (await minispec(root, ["status", "--change", "a", "--json"])).out,
  );
  const by = (id: string) =>
    status.artifacts.find((a: { id: string }) => a.id === id);
  expect(by("proposal").status).toBe("ready");
  expect(by("specs").status).toBe("blocked");
  expect(by("specs").missingDeps).toEqual(["proposal"]);
  expect(status.isComplete).toBe(false);
});

test("`validate` names the requirement that has no scenario, and exits not 0", async () => {
  const root = await withDelta(DELTA.replace(/#### Scenario[\s\S]*$/, ""));
  const run = await minispec(root, ["validate", "c", "--json"]);
  expect(run.code).not.toBe(0);
  expect(JSON.parse(run.out).items[0].issues[0].message).toBe(
    'ADDED "A" must include at least one scenario',
  );
});

test(
  "OpenSpec reads a change that MiniSpec writes",
  async () => {
    const root = await withDelta();
    expect((await minispec(root, ["validate", "c", "--strict"])).code).toBe(0);
    const run = await openspec(root, ["validate", "c", "--strict"]);
    expect(run.code).toBe(0);
  },
  OPENSPEC_RUN_TIMEOUT_MS,
);

test("`archive` merges a delta into `openspec/specs/` and moves the change", async () => {
  const root = await withDelta();
  await mergesDelta(root, ["archive", "c", "--yes"]);
  expect(fs.existsSync(path.join(root, "openspec/changes/c"))).toBe(false);
  const archived = fs.readdirSync(path.join(root, "openspec/changes/archive"));
  expect(archived).toHaveLength(1);
  expect(archived[0]).toMatch(/^\d{4}-\d{2}-\d{2}-c$/);
});

test("Sync a Change", async () => {
  const root = await withDelta();
  await mergesDelta(root, ["sync", "c"]);
  expect(fs.existsSync(path.join(root, "openspec/changes/c"))).toBe(true);
  expect(fs.existsSync(path.join(root, "openspec/changes/archive"))).toBe(
    false,
  );
});

test("`sync` of a change whose merge fails writes no spec", async () => {
  const root = await withDelta(DELTA.replace("## ADDED", "## MODIFIED"));
  const run = await minispec(root, ["sync", "c"]);
  expect(run.code).toBe(1);
  expect(fs.existsSync(path.join(root, "openspec/specs"))).toBe(false);
});

test("`archive` stops at open tasks until `--yes`", async () => {
  const root = await withDelta();
  await Bun.write(
    path.join(root, "openspec/changes/c/tasks.md"),
    "## 1. A\n\n- [ ] 1.1 Open\n",
  );
  const before = filesOf(root);
  const run = await minispec(root, ["archive", "c"]);
  expect(run.code).toBe(1);
  expect(run.out).toContain("1 incomplete task(s)");
  expect(run.out).toContain("--yes");
  expect(filesOf(root)).toEqual(before);
});

test("`archive` keeps a change whose merge fails, and writes no spec", async () => {
  const root = await withDelta(DELTA.replace("## ADDED", "## MODIFIED"));
  const run = await minispec(root, ["archive", "c", "--yes"]);
  expect(run.code).toBe(1);
  expect(fs.existsSync(path.join(root, "openspec/specs"))).toBe(false);
  expect(fs.existsSync(path.join(root, "openspec/changes/c"))).toBe(true);
});

test("`list` of a project with no `openspec/` folder gives an empty list", async () => {
  const run = await minispec(tmpEmpty("minispec-list"), ["list", "--json"]);
  expect(run.code).toBe(0);
  expect(JSON.parse(run.out).changes).toEqual([]);
});

test("a bad call exits `2` with the usage", async () => {
  const run = await minispec(tmpEmpty("minispec-usage"), ["nope"]);
  expect(run.code).toBe(2);
  expect(run.out).toContain("new change");
});

test("the launcher `bin/minispec` runs the command", async () => {
  const proc = Bun.spawn(
    [path.join(REPO, "plugins/claudetto/bin/minispec"), "list", "--json"],
    { cwd: tmpEmpty("minispec-bin"), stdout: "pipe", stderr: "pipe" },
  );
  expect(await proc.exited).toBe(0);
  expect(JSON.parse(await new Response(proc.stdout).text()).changes).toEqual(
    [],
  );
});
