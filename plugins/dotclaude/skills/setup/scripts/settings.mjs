#!/usr/bin/env node
// Merge `features/setup/profile.json` into a Claude Code settings file.
//
//   node settings.mjs [--scope user|project|local] [--profile file] [--status-line]
//                     [--remove-cleanup-period] [--move-managed] [--with item,item] [--cvp yes|no] [--apply]
//
// It prints the changes and the diff of each file, and writes nothing without `--apply`.
// With `--apply`, it backs up each changed file next to itself, keeps the newest three backups, then writes.
// In project scope, the keys that Claude Code ignores in project settings go to local settings.
// Merge rules: see `mergeProfile` in `features/setup/rules.mjs`.
//
// `--apply` also writes `<config dir>/dotclaude/statusline.mjs`, a stub that runs this plugin's status line,
// and `<config dir>/dotclaude/subagent-statusline.mjs`, a stub that runs the subagent status line.
// It sets `statusLine` and `subagentStatusLine` to run them.
// A status line or subagent status line of another tool stays, unless `--status-line` is given.
//
// It also removes what dotclaude 0.26 wrote and 0.27 does not use:
// the `LEGACY` keys, the old `subagents.mjs` stub, and the `CLAUDE.md` block of user scope.
// For 0.27.0, `migrate027` also removes the haiku `env` entry, and moves the two status line entries to the new ones.
// `cleanupPeriodDays: 14` of 0.27.0 goes only with `--remove-cleanup-period`, after the user answers a question.
// It writes no managed file and runs no sudo.
// When it finds an old dotclaude managed file (the folder of `DOTCLAUDE_MANAGED_DIR`, else the folder of the platform),
// `--move-managed` merges its keys into user settings, and the report prints the command that removes the file.
// `--with` adds eval-gated items (`gated.mjs`) and opt-in items (`optin.mjs`). `--cvp yes` swaps in Mythos 5.1 if a probe proves it (`cvp.mjs`).
// When `dotclaude-docs` is installed, the profile also allows its hosts (see `features/setup/addons.mjs`).
// With `--openspec` and `--apply`, it also runs the OpenSpec steps of `features/setup/openspec.mjs`.
// Then it reports OpenSpec and the LSP plugins to enable.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  installedAddons,
  withAddons,
} from "../../../features/setup/addons.mjs";
import { withCvp } from "../../../features/setup/cvp.mjs";
import { lineDiff } from "../../../features/setup/diff.mjs";
import {
  reportLsp,
  reportManaged,
  reportOpenSpec,
} from "../../../features/setup/environment.mjs";
import { withGated } from "../../../features/setup/gated.mjs";
import {
  findOldManaged,
  managedDir,
} from "../../../features/setup/managed.mjs";
import {
  migrate027,
  OLD_CLEANUP_DAYS,
  statusLineEntry,
  subagentEntry,
} from "../../../features/setup/migrate.mjs";
import { setupOpenSpec } from "../../../features/setup/openspec.mjs";
import {
  backup,
  CLAUDE_MD_BLOCK,
  dropLegacy,
  isObject,
  launcherText,
  mergeProfile,
} from "../../../features/setup/rules.mjs";
import { splitProfile } from "../../../features/setup/scope.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const pluginRoot = path.join(import.meta.dirname, "..", "..", "..");
const scope = flag("--scope", "user");
const profilePath = path.resolve(
  flag("--profile", path.join(pluginRoot, "features", "setup", "profile.json")),
);
const apply = args.includes("--apply");
const replaceStatusLine = args.includes("--status-line");
const removeCleanup = args.includes("--remove-cleanup-period");
const moveManaged = args.includes("--move-managed");
const withItems = flag("--with", "").split(",").filter(Boolean);
const configDir =
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const targets = {
  user: path.join(configDir, "settings.json"),
  project: path.join(projectDir, ".claude", "settings.json"),
  local: path.join(projectDir, ".claude", "settings.local.json"),
};
if (!Object.hasOwn(targets, scope)) {
  console.error(`Unknown scope "${scope}". Use user, project, or local.`);
  process.exit(2);
}
function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(
      `${file} is not valid JSON (${err.message}). Nothing changed.`,
    );
    process.exit(1);
  }
}

const baseProfile = readJson(profilePath, null);
if (!isObject(baseProfile)) {
  console.error(`Profile ${profilePath} not found or not an object.`);
  process.exit(1);
}
let profile;
try {
  profile = withAddons(
    withGated(baseProfile, withItems),
    installedAddons(
      readJson(path.join(configDir, "plugins", "installed_plugins.json"), {}),
      readJson(targets.user, {}).enabledPlugins,
    ),
  );
} catch (err) {
  console.error(err.message);
  process.exit(2);
}
profile = withCvp(profile, flag("--cvp", "no"), console.log);
if (moveManaged && scope !== "user") {
  console.error(
    "--move-managed needs --scope user, because the keys go into user settings.",
  );
  process.exit(2);
}
const oldManaged = findOldManaged(
  process.env.DOTCLAUDE_MANAGED_DIR || managedDir(),
);

const STUB_DIR = path.join(configDir, "dotclaude");
const stub = path.join(STUB_DIR, "statusline.mjs");
const script = path.join(pluginRoot, "features", "statusline", "cli.mjs");
const subagentStub = path.join(STUB_DIR, "subagent-statusline.mjs");
const subagentScript = path.join(
  pluginRoot,
  "features",
  "statusline",
  "subagent-cli.mjs",
);
const statusLine = statusLineEntry(stub);
const subagentStatusLine = subagentEntry(subagentStub);
const ours = (setting) =>
  isObject(setting) && String(setting.command ?? "").includes(STUB_DIR);
const claudeMd = path.join(configDir, "CLAUDE.md");
const claudeMdText =
  scope === "user" && fs.existsSync(claudeMd)
    ? fs.readFileSync(claudeMd, "utf8")
    : "";
const oldBlock = CLAUDE_MD_BLOCK.test(claudeMdText);

/** The merged settings, the change lines, and the notes for one file of `splitProfile`. */
function plan(part) {
  const main = part.scope === scope;
  const target = targets[part.scope];
  const changes = [];
  const notes = [];
  const current = readJson(target, {});
  // A status line whose command does not run a dotclaude stub belongs to another tool.
  const foreign =
    !main ||
    (!replaceStatusLine &&
      isObject(current.statusLine) &&
      !ours(current.statusLine));
  if (foreign && main)
    notes.push(
      `Kept your statusLine: ${current.statusLine.command}. Run again with --status-line to use the dotclaude status line.`,
    );
  const foreignSubagent =
    !main ||
    (!replaceStatusLine &&
      isObject(current.subagentStatusLine) &&
      !ours(current.subagentStatusLine));
  if (foreignSubagent && main && isObject(current.subagentStatusLine))
    notes.push(
      `Kept your subagentStatusLine: ${current.subagentStatusLine.command}. Run again with --status-line to use the dotclaude subagent status line.`,
    );
  let merged = dropLegacy(current, changes);
  merged = migrate027(
    merged,
    {
      statusLine: foreign ? null : statusLine,
      subagentStatusLine: foreignSubagent ? null : subagentStatusLine,
      ours,
      removeCleanup,
    },
    changes,
  );
  if (merged.cleanupPeriodDays === OLD_CLEANUP_DAYS)
    notes.push(
      `Question: cleanupPeriodDays is ${OLD_CLEANUP_DAYS}, the value of the 0.27.0 profile. Remove it so that the Claude Code default of 30 days applies? A transcript that the value ${OLD_CLEANUP_DAYS} already deleted cannot come back. To remove it, run again with --remove-cleanup-period.`,
    );
  if (moveManaged && oldManaged && part.scope === "user")
    merged = mergeProfile(merged, oldManaged.keys, "", changes).settings;
  merged = mergeProfile(
    merged,
    {
      ...part.profile,
      ...(foreign ? {} : { statusLine }),
      ...(foreignSubagent ? {} : { subagentStatusLine }),
    },
    "",
    changes,
  ).settings;
  const stale = (file, target, wanted) =>
    main &&
    wanted &&
    !(
      fs.existsSync(file) &&
      fs.readFileSync(file, "utf8") === launcherText(target)
    );
  const stubs = [
    [stub, script, !foreign],
    [subagentStub, subagentScript, !foreignSubagent],
  ].filter(([file, target, wanted]) => stale(file, target, wanted));
  for (const [file] of stubs) changes.push(`write ${file}`);
  if (main && oldBlock)
    changes.push(`${claudeMd}: remove the dotclaude 0.26 block`);
  for (const key of part.moved)
    notes.push(
      `${key}: written to ${target} (${part.scope} settings), because Claude Code does not read it from project settings.`,
    );
  const before = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  const after = `${JSON.stringify(merged, null, 2)}\n`;
  return {
    target,
    scope: part.scope,
    main,
    changes,
    notes,
    before,
    after,
    stubs,
  };
}

const plans = splitProfile(profile, scope).map(plan);
const changes = plans.flatMap((p) => p.changes);
for (const p of plans) {
  console.log(`Target: ${p.target} (${p.scope} scope)`);
  console.log(
    p.changes.length
      ? `${p.changes.length} change(s):`
      : "Settings match the profile.",
  );
  for (const line of p.changes) console.log(`  ${line}`);
  for (const line of p.notes) console.log(line);
  if (p.before !== p.after) {
    console.log(`Diff of ${p.target}:`);
    for (const line of lineDiff(p.before, p.after)) console.log(`  ${line}`);
  }
}
if (oldBlock) {
  console.log(`Diff of ${claudeMd}:`);
  for (const line of lineDiff(
    claudeMdText,
    claudeMdText.replace(CLAUDE_MD_BLOCK, ""),
  ))
    console.log(`  ${line}`);
}

// OpenSpec, the LSP plugins, and the old managed file are report only.
// The skill asks the user before it installs or initializes anything.
reportOpenSpec(projectDir);
if (!setupOpenSpec(projectDir, apply && args.includes("--openspec")))
  process.exit(1);
reportLsp(configDir, readJson(targets.user, {}), readJson);
reportManaged(oldManaged, moveManaged);

if (!changes.length || !apply) {
  if (changes.length)
    console.log("\nDry run. Run again with --apply to write these changes.");
  process.exit(0);
}
const report = ({ made, deleted }) => {
  console.log(`Backup: ${made}`);
  for (const f of deleted) console.log(`Deleted old backup: ${f}`);
};
console.log("");
for (const p of plans) {
  for (const [file, target] of p.stubs) {
    fs.mkdirSync(STUB_DIR, { recursive: true });
    fs.writeFileSync(file, launcherText(target));
  }
  // The 0.26 stub `subagents.mjs` has no entry that runs it any more.
  const oldSubagentStub = path.join(STUB_DIR, "subagents.mjs");
  if (p.main && fs.existsSync(oldSubagentStub)) fs.rmSync(oldSubagentStub);
  if (p.before === p.after) continue;
  fs.mkdirSync(path.dirname(p.target), { recursive: true });
  if (fs.existsSync(p.target)) report(backup(p.target));
  fs.writeFileSync(p.target, p.after);
  console.log(`Wrote ${p.target}.`);
}
if (oldBlock) {
  report(backup(claudeMd));
  fs.writeFileSync(claudeMd, claudeMdText.replace(CLAUDE_MD_BLOCK, ""));
}
console.log("Restart Claude Code for env and model settings to take effect.");
