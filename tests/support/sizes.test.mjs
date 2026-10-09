// Size targets of the text that goes into each request (`tools/sizes.mjs`).
// The first tests use fixtures built from the bounds of `tools/limits.mjs`.
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
} from "../../tools/limits.mjs";
import {
  checkFirstRequestBytes,
  checkSizes,
  parseSkill,
} from "../../tools/sizes.mjs";

const REPO = path.join(import.meta.dirname, "../..");
const KB = 1024;

/** A `SKILL.md` text whose `name` and `description` have `meta` bytes together and whose body has `body` bytes. */
function skill(meta, body) {
  const name = "n";
  const description = "d".repeat(meta - name.length);
  return `---\nname: ${name}\ndescription: ${description}\n---\n${"b".repeat(body)}`;
}
const MID_BODY = (SKILL_BODY_LOW_BYTES + SKILL_BODY_HIGH_BYTES) / 2;
const MID_META = (SKILL_META_LOW_BYTES + SKILL_META_HIGH_BYTES) / 2;

/** The result of `checkSizes` for a list of skill texts. */
const skills = (...texts) =>
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
  const check = (n) =>
    checkSizes({ claudeMd: [{ path: "CLAUDE.md", text: "x".repeat(n) }] });
  expect(check(6 * KB)).toEqual({ failures: [], advisories: [] });
  expect(check(6 * KB + 1).failures).toHaveLength(1);
});

test("skill metadata of 300 bytes passes and 301 bytes fails", () => {
  expect(skills(skill(300, MID_BODY)).failures).toEqual([]);
  expect(skills(skill(301, MID_BODY)).failures).toHaveLength(1);
});

test("skill metadata of 149 bytes gives an advisory and 150 bytes gives none", () => {
  const low = skills(skill(149, MID_BODY));
  expect(low.failures).toEqual([]);
  expect(
    low.advisories.filter((a) => a.startsWith("s0 metadata")),
  ).toHaveLength(1);
  expect(
    skills(skill(150, MID_BODY)).advisories.filter((a) =>
      a.startsWith("s0 metadata"),
    ),
  ).toEqual([]);
});

test("a skill body of 8 KB passes and 8 KB plus 1 byte fails", () => {
  expect(skills(skill(MID_META, 8 * KB)).failures).toEqual([]);
  expect(skills(skill(MID_META, 8 * KB + 1)).failures).toHaveLength(1);
});

test("a skill body of 2 KB minus 1 byte gives an advisory and 2 KB gives none", () => {
  const low = skills(skill(MID_META, 2 * KB - 1));
  expect(low.failures).toEqual([]);
  expect(low.advisories.filter((a) => a.includes("body"))).toHaveLength(1);
  expect(
    skills(skill(MID_META, 2 * KB)).advisories.filter((a) =>
      a.includes("body"),
    ),
  ).toEqual([]);
});

test("the body starts after the frontmatter", () => {
  expect(parseSkill('---\nname: a\ndescription: "b"\n---\nxyz')).toEqual({
    name: "a",
    description: "b",
    body: "xyz",
  });
});

/** The total check, with the metadata of each skill at 300 bytes, so only the sum can fail. */
function total(count) {
  const one = skill(SKILL_META_HIGH_BYTES, MID_BODY);
  return skills(...Array.from({ length: count }, () => one));
}

test("total skill metadata above 8 KB is reported and does not fail", () => {
  const count =
    Math.floor(SKILL_META_TOTAL_HIGH_BYTES / SKILL_META_HIGH_BYTES) + 1;
  const out = total(count);
  expect(out.failures).toEqual([]);
  expect(out.advisories.some((a) => a.includes("all skills"))).toBe(true);
});

test("total skill metadata below 5 KB is reported and does not fail", () => {
  const out = total(1);
  expect(out.failures).toEqual([]);
  expect(out.advisories.some((a) => a.includes("all skills"))).toBe(true);
});

test("total skill metadata above 15 KB fails and 15 KB passes", () => {
  const per = SKILL_META_HIGH_BYTES;
  expect(total(Math.floor(SKILL_META_TOTAL_MAX_BYTES / per)).failures).toEqual(
    [],
  );
  expect(
    total(Math.floor(SKILL_META_TOTAL_MAX_BYTES / per) + 1).failures,
  ).toHaveLength(1);
  // 15 KB exactly: 50 skills of 300 bytes and one of 360 bytes. The per-skill failure of the last one is not counted here.
  const exact = [
    ...Array.from({ length: 50 }, () => skill(300, MID_BODY)),
    skill(SKILL_META_TOTAL_MAX_BYTES - 50 * 300, MID_BODY),
  ];
  expect(
    skills(...exact).failures.filter((f) => f.includes("all skills")),
  ).toEqual([]);
  exact.push(skill(150, MID_BODY));
  expect(
    skills(...exact).failures.filter((f) => f.includes("all skills")),
  ).toHaveLength(1);
});

test("the first request of 16 KB passes and 16 KB plus 1 byte fails", () => {
  expect(checkFirstRequestBytes(16 * KB).failures).toEqual([]);
  expect(checkFirstRequestBytes(16 * KB + 1).failures).toHaveLength(1);
});

test("the first request below 8 KB gives an advisory and does not fail", () => {
  const low = checkFirstRequestBytes(8 * KB - 1);
  expect(low.failures).toEqual([]);
  expect(low.advisories).toHaveLength(1);
  expect(checkFirstRequestBytes(8 * KB).advisories).toEqual([]);
});

/** The files named `name` under `dir`, without `node_modules`, `external`, `.git`, and fixture folders. */
function find(dir, names, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "external", ".git", "fixture"].includes(entry.name))
      continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) find(file, names, found);
    else if (names.includes(entry.name)) found.push(file);
  }
  return found;
}

test("the files of the repository are within the size targets", () => {
  const rel = (f) => path.relative(REPO, f);
  // `CLAUDE.md` links to `AGENTS.md`, so a file counts once, by its real path.
  const real = new Set(
    find(REPO, ["CLAUDE.md", "AGENTS.md"]).map((f) => fs.realpathSync(f)),
  );
  const claudeMd = [...real].map((f) => ({
    path: rel(f),
    text: fs.readFileSync(f, "utf8"),
  }));
  const skillFiles = find(path.join(REPO, "plugins"), ["SKILL.md"]).map(
    (f) => ({
      path: rel(f),
      text: fs.readFileSync(f, "utf8"),
    }),
  );
  expect(claudeMd.length).toBeGreaterThan(0);
  expect(skillFiles.length).toBeGreaterThan(0);
  const { failures, advisories } = checkSizes({ claudeMd, skills: skillFiles });
  for (const line of advisories) console.log(`size advisory: ${line}`);
  expect(failures).toEqual([]);
});
