#!/usr/bin/env -S bun --no-env-file
// Tells whether a Claude Code release is newer than the version that this repository is tested on.
// The eval workflow `.github/workflows/eval-new-claude-code.yml` runs the plugin evals only for such a release.
//
//   bun tools/claude-code-release.ts LATEST [TESTED]   print `LATEST vs TESTED: newer=true|false`
//
// TESTED defaults to the version that `.github/workflows/ci.yml` installs.
// With `GITHUB_OUTPUT` set, the line `newer=true|false` is also appended to that file.

import fs from "node:fs";
import path from "node:path";

const CI_FILE = path.join(
  import.meta.dir,
  "..",
  ".github",
  "workflows",
  "ci.yml",
);

export type Version = { core: number[]; pre: string[] };

// The SemVer 2.0.0 grammar, with an optional leading `v` for a release tag.
const SEMVER =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
// The version after `@anthropic-ai/claude-code@` in a `bun add` or `npm install` line.
const PIN = /@anthropic-ai\/claude-code@(\d[0-9A-Za-z.+-]*)/;

/** A SemVer version, or null when `text` is not one. The build metadata is dropped. */
export const parseVersion = (text: string): Version | null => {
  const m = SEMVER.exec(text.trim());
  if (!m) return null;
  return {
    core: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ? m[4].split(".") : [],
  };
};

/** Orders two pre-release identifiers: numbers by value, text by code point, a number before text. */
const compareIdentifier = (a: string, b: string): number => {
  const numeric = [/^\d+$/.test(a), /^\d+$/.test(b)];
  if (numeric[0] && numeric[1]) return Math.sign(Number(a) - Number(b));
  if (numeric[0] !== numeric[1]) return numeric[0] ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

/** Negative when `a` is lower than `b`, zero when they are equal, positive when `a` is higher. */
export const compareVersions = (a: Version, b: Version): number => {
  for (let i = 0; i < 3; i++) {
    const [x, y] = [a.core[i] as number, b.core[i] as number];
    if (x !== y) return x < y ? -1 : 1;
  }
  // A release is higher than its pre-releases, so a version without a pre-release is the higher one.
  if (a.pre.length === 0 || b.pre.length === 0)
    return Math.sign(b.pre.length - a.pre.length);
  const shared = Math.min(a.pre.length, b.pre.length);
  for (let i = 0; i < shared; i++) {
    const c = compareIdentifier(a.pre[i] as string, b.pre[i] as string);
    if (c !== 0) return c;
  }
  return Math.sign(a.pre.length - b.pre.length);
};

const parseOrThrow = (text: string): Version => {
  const v = parseVersion(text);
  if (!v) throw new Error(`not a SemVer version: ${text}`);
  return v;
};

/** True when `latest` is higher than `tested` in SemVer order. Throws when either is not a version. */
export const isNewer = (latest: string, tested: string): boolean =>
  compareVersions(parseOrThrow(latest), parseOrThrow(tested)) > 0;

/** The version that a `ci.yml` text installs with `@anthropic-ai/claude-code@VERSION`. Throws when there is none. */
export const pinnedVersion = (ciText: string): string => {
  const m = PIN.exec(ciText);
  if (!m) throw new Error("ci.yml does not pin @anthropic-ai/claude-code");
  return m[1] as string;
};

if (process.argv[1] === import.meta.path) {
  const [latest, tested] = process.argv.slice(2);
  if (!latest) {
    console.error("usage: bun tools/claude-code-release.ts LATEST [TESTED]");
    process.exitCode = 2;
  } else {
    const pin = tested ?? pinnedVersion(await Bun.file(CI_FILE).text());
    const newer = isNewer(latest, pin);
    console.log(`${latest} vs ${pin}: newer=${newer}`);
    if (process.env["GITHUB_OUTPUT"])
      fs.appendFileSync(process.env["GITHUB_OUTPUT"], `newer=${newer}\n`);
  }
}
