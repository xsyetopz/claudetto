// The Linux and WSL2 checks of the hard stop that depend on the settings and on the paths that Claude Code uses.
// The sources are the open-source package https://github.com/anthropics/sandbox-runtime, which Claude Code 2.1.301 bundles,
// and the strings of 2.1.301 (D51 in `src/wiki/rationale/Decisions-Engine.md`):
// - `sandbox.bwrapPath` is "an absolute path to the bwrap binary", used "instead of resolving bwrap via PATH".
// - The seccomp filter helper `apply-seccomp` comes from `sandbox.seccomp.applyPath` when that file exists.
//   Then it comes from `vendor/seccomp/<arch>/apply-seccomp` in a global install of `@anthropic-ai/sandbox-runtime`.
//   The arch is `x64` or `arm64`, and the filter has no other arch.
//   With `sandbox.seccomp.argv0`, `applyPath` is used verbatim.
// - `sandbox.network.allowAllUnixSockets: true` makes the engine skip the filter.
// This file reads no file and runs no program, so it has no `node:` import.

import { isObject } from "./merge.ts";

/** A settings file that setup read: its path, and its parsed content. */
export type SettingsEntry = { file: string; settings: unknown };

/** The keys of `sandbox` that the Linux checks use. Each is `undefined` when no file sets it. */
export type LinuxSettings = {
  bwrapPath: string | undefined;
  applyPath: string | undefined;
  argv0: string | undefined;
  /** The file that sets `sandbox.network.allowAllUnixSockets` to `true` last, or `undefined`. */
  allUnixSockets: string | undefined;
};

/** The object at `key` of `value`, or `{}`. */
const child = (value: unknown, key: string): Record<string, unknown> => {
  const inner = isObject(value) ? value[key] : undefined;
  return isObject(inner) ? inner : {};
};

/** A non-empty string, or `undefined`. */
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

/** The Linux keys of `sandbox` in `entries`, from the lowest scope to the highest. A later file replaces an earlier one. */
export const linuxSettingsOf = (
  entries: readonly SettingsEntry[],
): LinuxSettings => {
  const out: LinuxSettings = {
    bwrapPath: undefined,
    applyPath: undefined,
    argv0: undefined,
    allUnixSockets: undefined,
  };
  for (const { file, settings } of entries) {
    const box = child(settings, "sandbox");
    out.bwrapPath = text(box["bwrapPath"]) ?? out.bwrapPath;
    const seccomp = child(box, "seccomp");
    out.applyPath = text(seccomp["applyPath"]) ?? out.applyPath;
    out.argv0 = text(seccomp["argv0"]) ?? out.argv0;
    const all = child(box, "network")["allowAllUnixSockets"];
    if (typeof all === "boolean") out.allUnixSockets = all ? file : undefined;
  }
  return out;
};

/** The vendor folder name of a Node.js arch, or `undefined` when the filter has no build for it. */
export const seccompArchOf = (arch: string): string | undefined =>
  arch === "x64" || arch === "arm64" ? arch : undefined;

/** A path join, such as `path.join`, which the adapter gives because a domain file has no `node:` import. */
export type Join = (...parts: string[]) => string;

/**
 * The folders where the engine looks for a global install of `@anthropic-ai/sandbox-runtime`.
 * `npmRoot` is the output of `npm root -g`, or `undefined` when `npm` gave none.
 * The order is the one of the package.
 */
export const globalBases = (
  npmRoot: string | undefined,
  home: string,
  join: Join,
): string[] => {
  const pkg = ["node_modules", "@anthropic-ai", "sandbox-runtime"];
  const root = npmRoot?.trim();
  return [
    ...(root ? [join(root, "@anthropic-ai", "sandbox-runtime")] : []),
    join("/usr/lib", ...pkg),
    join("/usr/local/lib", ...pkg),
    join("/opt/homebrew/lib", ...pkg),
    join(home, ".npm", "lib", ...pkg),
    join(home, ".npm-global", "lib", ...pkg),
  ];
};

/** The path of `apply-seccomp` in the global install `base` for the vendor arch `arch`. */
export const helperIn = (base: string, arch: string, join: Join): string =>
  join(base, "vendor", "seccomp", arch, "apply-seccomp");

/** Why a test run of `bwrap` failed: a container that cannot mount `/proc`, or another cause such as AppArmor. */
export type BlockedKind = "container" | "other";

/** The error text of `bwrap` in an unprivileged container, which the page https://code.claude.com/docs/en/sandboxing documents. */
export const blockedKindOf = (error: string): BlockedKind =>
  /can't mount proc/i.test(error) ? "container" : "other";

/** The AppArmor profile of the page https://code.claude.com/docs/en/sandboxing for the `bwrap` at `bwrap`. */
export const apparmorProfile = (bwrap: string): string =>
  [
    `profile bwrap ${bwrap} flags=(unconfined) {`,
    "  userns,",
    "  include if exists <local/bwrap>",
    "}",
  ].join("\n");
