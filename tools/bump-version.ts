#!/usr/bin/env -S bun --no-env-file
// Bumps the version in `package.json` by semver, moves the CHANGELOG's [Unreleased] entries under
// a new dated heading, and points the [unreleased] compare link at the new tag (`just bump`).
//
//   bun tools/bump-version.ts <major|minor|patch|X.Y.Z> [--dry-run] [--root DIR]
//
// Only the "version" line of `package.json` and two CHANGELOG lines change, so formatting and key
// order stay as they are. `just generate` copies the version into each `plugin.json`, so this tool
// writes no plugin file.

import fs from "node:fs";
import path from "node:path";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const VERSION_LINE = /^(\s*"version":\s*)"([^"]*)"/m;
const UNRELEASED = "## [Unreleased]\n";
// The version in the `[unreleased]: .../compare/<prefix>vX.Y.Z...HEAD` link.
const UNRELEASED_LINK =
  /(^\[unreleased\]:\s*\S+\/compare\/\S*?v)\d+\.\d+\.\d+(\.\.\.HEAD)/im;

/** The version after `current` for `level`, which is `major`, `minor`, `patch`, or an exact `X.Y.Z`. */
export const nextVersion = (current: string, level: string): string => {
  if (SEMVER.test(level)) return level;
  const m = SEMVER.exec(current);
  if (!m) throw new Error(`current version "${current}" is not X.Y.Z`);
  const [major, minor, patch] = m.slice(1).map(Number) as [
    number,
    number,
    number,
  ];
  switch (level) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(
        `level must be major, minor, patch, or X.Y.Z, not "${level}"`,
      );
  }
};

/** The files and new contents of a bump; it throws before anything is written. */
export const plan = async (root: string, level: string, today: string) => {
  const file = path.join(root, "package.json");
  const text = await Bun.file(file).text();
  const m = VERSION_LINE.exec(text);
  if (!m) throw new Error('package.json has no "version" line');
  const current = m[2] as string;
  const next = nextVersion(current, level);
  const changelog = path.join(root, "CHANGELOG.md");
  const log = await Bun.file(changelog).text();
  if (log.includes(`## [${next}]`))
    throw new Error(`CHANGELOG.md already has a ${next} section`);
  if (!log.includes(UNRELEASED))
    throw new Error("CHANGELOG.md has no ## [Unreleased] heading");
  return {
    current,
    next,
    writes: [
      { file, text: text.replace(VERSION_LINE, `$1"${next}"`) },
      {
        file: changelog,
        text: log
          .replace(UNRELEASED, `${UNRELEASED}\n## [${next}] - ${today}\n`)
          .replace(UNRELEASED_LINK, `$1${next}$2`),
      },
    ],
  };
};

/** True when the process may write `file`. */
const writable = (file: string): boolean => {
  try {
    fs.accessSync(file, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

/** Runs the bump with `args` and returns the exit status. */
export const main = async (args: string[]): Promise<number> => {
  const at = args.indexOf("--root");
  const root = path.resolve(
    at >= 0 ? (args[at + 1] as string) : path.join(import.meta.dirname, ".."),
  );
  const level = args.find(
    (a, i) => !a.startsWith("--") && args[i - 1] !== "--root",
  );
  if (!level) {
    console.error(
      "Usage: bump-version.ts <major|minor|patch|X.Y.Z> [--dry-run] [--root DIR]",
    );
    return 2;
  }
  let result: Awaited<ReturnType<typeof plan>>;
  try {
    result = await plan(root, level, new Date().toISOString().slice(0, 10));
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }
  console.log(`${result.current} -> ${result.next}`);
  for (const { file } of result.writes)
    console.log(`  ${path.relative(root, file)}`);
  if (args.includes("--dry-run")) {
    console.log("Dry run: nothing was written.");
    return 0;
  }
  // A pre-check: a race or a failed second write is not rolled back.
  const blocked = result.writes.find(({ file }) => !writable(file));
  if (blocked) {
    console.error(
      `Cannot write ${path.relative(root, blocked.file)}, so nothing was changed.`,
    );
    return 1;
  }
  for (const { file, text } of result.writes) await Bun.write(file, text);
  console.log(
    "Next: run `just generate`, so each plugin.json has the new version.",
  );
  return 0;
};

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
