// Size targets of the text that goes into each request (`tools/sizes.ts`).
// The first tests use fixtures built from the bounds of `tools/limits.ts`.
// The last test checks the real files, fails on a failure, and prints the advisories.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  CLAUDE_MD_MAX_BYTES,
  FIRST_REQUEST_HIGH_BYTES,
  FIRST_REQUEST_LOW_BYTES,
  SKILL_BODY_HIGH_BYTES,
  SKILL_BODY_LOW_BYTES,
  SKILL_META_HIGH_BYTES,
  SKILL_META_LOW_BYTES,
  SKILL_META_TOTAL_HIGH_BYTES,
  SKILL_META_TOTAL_LOW_BYTES,
  SKILL_META_TOTAL_MAX_BYTES,
} from "../../tools/limits.ts";
import {
  checkFirstRequestBytes,
  checkSizes,
  parseSkill,
} from "../../tools/sizes.ts";
import { REPO, walk } from "./repo.ts";

const KB = 1024;

/** A `SKILL.md` text whose `name` and `description` have `meta` bytes together and whose body has `body` bytes. */
function skill(meta: number, body: number): string {
  const name = "n";
  const description = "d".repeat(meta - name.length);
  return `---\nname: ${name}\ndescription: ${description}\n---\n${"b".repeat(body)}`;
}
const MID_BODY = (SKILL_BODY_LOW_BYTES + SKILL_BODY_HIGH_BYTES) / 2;
const MID_META = (SKILL_META_LOW_BYTES + SKILL_META_HIGH_BYTES) / 2;

/** The result of `checkSizes` for a list of skill texts. */
const skills = (...texts: string[]) =>
  checkSizes({ skills: texts.map((text, i) => ({ path: `s${i}`, text })) });

test("this file states 1 KB as 1,024 bytes", () => {
  expect(CLAUDE_MD_MAX_BYTES).toBe(6 * KB);
  expect(FIRST_REQUEST_LOW_BYTES).toBe(8 * KB);
  expect(FIRST_REQUEST_HIGH_BYTES).toBe(16 * KB);
  expect(SKILL_META_TOTAL_LOW_BYTES).toBe(5 * KB);
  expect(SKILL_META_TOTAL_HIGH_BYTES).toBe(8 * KB);
  expect(SKILL_META_TOTAL_MAX_BYTES).toBe(15 * KB);
});

test("`CLAUDE.md` of 6 KB passes and 6 KB plus 1 byte fails", () => {
  const check = (n: number) =>
    checkSizes({ claudeMd: [{ path: "CLAUDE.md", text: "x".repeat(n) }] });
  expect(check(6 * KB)).toStrictEqual({ failures: [], advisories: [] });
  expect(check(6 * KB + 1).failures.length).toBe(1);
});

test("skill metadata of 300 bytes passes and 301 bytes fails", () => {
  expect(skills(skill(300, MID_BODY)).failures).toStrictEqual([]);
  expect(skills(skill(301, MID_BODY)).failures.length).toBe(1);
});

test("skill metadata of 149 bytes gives an advisory and 150 bytes gives none", () => {
  const low = skills(skill(149, MID_BODY));
  expect(low.failures).toStrictEqual([]);
  expect(low.advisories.filter((a) => a.startsWith("s0 metadata")).length).toBe(
    1,
  );
  expect(
    skills(skill(150, MID_BODY)).advisories.filter((a) =>
      a.startsWith("s0 metadata"),
    ),
  ).toStrictEqual([]);
});

test("a skill body of 8 KB passes and 8 KB plus 1 byte fails", () => {
  expect(skills(skill(MID_META, 8 * KB)).failures).toStrictEqual([]);
  expect(skills(skill(MID_META, 8 * KB + 1)).failures.length).toBe(1);
});

test("a skill body of 2 KB minus 1 byte gives an advisory and 2 KB gives none", () => {
  const low = skills(skill(MID_META, 2 * KB - 1));
  expect(low.failures).toStrictEqual([]);
  expect(low.advisories.filter((a) => a.includes("body")).length).toBe(1);
  expect(
    skills(skill(MID_META, 2 * KB)).advisories.filter((a) =>
      a.includes("body"),
    ),
  ).toStrictEqual([]);
});

test("the body starts after the frontmatter", () => {
  expect(parseSkill('---\nname: a\ndescription: "b"\n---\nxyz')).toStrictEqual({
    name: "a",
    description: "b",
    body: "xyz",
  });
});

/** The total check, with the metadata of each skill at 300 bytes, so only the sum can fail. */
function total(count: number) {
  const one = skill(SKILL_META_HIGH_BYTES, MID_BODY);
  return skills(...Array.from({ length: count }, () => one));
}

test("total skill metadata above 8 KB is reported and does not fail", () => {
  const count =
    Math.floor(SKILL_META_TOTAL_HIGH_BYTES / SKILL_META_HIGH_BYTES) + 1;
  const out = total(count);
  expect(out.failures).toStrictEqual([]);
  expect(out.advisories.some((a) => a.includes("all skills"))).toBe(true);
});

test("total skill metadata below 5 KB is reported and does not fail", () => {
  const out = total(1);
  expect(out.failures).toStrictEqual([]);
  expect(out.advisories.some((a) => a.includes("all skills"))).toBe(true);
});

test("total skill metadata above 15 KB fails and 15 KB passes", () => {
  const per = SKILL_META_HIGH_BYTES;
  expect(
    total(Math.floor(SKILL_META_TOTAL_MAX_BYTES / per)).failures,
  ).toStrictEqual([]);
  expect(
    total(Math.floor(SKILL_META_TOTAL_MAX_BYTES / per) + 1).failures.length,
  ).toBe(1);
  // 15 KB exactly: 50 skills of 300 bytes and one of 360 bytes. The per-skill failure of the last one is not counted here.
  const exact = [
    ...Array.from({ length: 50 }, () => skill(300, MID_BODY)),
    skill(SKILL_META_TOTAL_MAX_BYTES - 50 * 300, MID_BODY),
  ];
  expect(
    skills(...exact).failures.filter((f) => f.includes("all skills")),
  ).toStrictEqual([]);
  exact.push(skill(150, MID_BODY));
  expect(
    skills(...exact).failures.filter((f) => f.includes("all skills")).length,
  ).toBe(1);
});

test("the first request of 16 KB passes and 16 KB plus 1 byte fails", () => {
  expect(checkFirstRequestBytes(16 * KB).failures).toStrictEqual([]);
  expect(checkFirstRequestBytes(16 * KB + 1).failures.length).toBe(1);
});

test("the first request below 8 KB gives an advisory and does not fail", () => {
  const low = checkFirstRequestBytes(8 * KB - 1);
  expect(low.failures).toStrictEqual([]);
  expect(low.advisories.length).toBe(1);
  expect(checkFirstRequestBytes(8 * KB).advisories).toStrictEqual([]);
});

/** The files named `name` under `dir`, without `node_modules`, `external`, `.git`, and fixture folders. */
function find(dir: string, names: string[]): string[] {
  return walk(dir, {
    skip: ["node_modules", "external", ".git", "fixture"],
    keep: (f) => names.includes(path.basename(f)),
  });
}

// A lint of the live repository.
test("lint: the files of the repository are within the size targets", async () => {
  const rel = (f: string) => path.relative(REPO, f);
  // `CLAUDE.md` links to `AGENTS.md`, so a file counts once, by its real path.
  const real = new Set(
    find(REPO, ["CLAUDE.md", "AGENTS.md"]).map((f) => fs.realpathSync(f)),
  );
  const claudeMd = await Promise.all(
    [...real].map(async (f) => ({
      path: rel(f),
      text: await Bun.file(f).text(),
    })),
  );
  const skillFiles = await Promise.all(
    find(path.join(REPO, "plugins"), ["SKILL.md"]).map(async (f) => ({
      path: rel(f),
      text: await Bun.file(f).text(),
    })),
  );
  expect(claudeMd.length > 0, `${claudeMd.length}`).toBeTruthy();
  expect(skillFiles.length > 0, `${skillFiles.length}`).toBeTruthy();
  const { failures, advisories } = checkSizes({ claudeMd, skills: skillFiles });
  for (const line of advisories) console.log(`size advisory: ${line}`);
  expect(failures).toStrictEqual([]);
});
