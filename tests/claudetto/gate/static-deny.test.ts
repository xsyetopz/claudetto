// Spec `permission-gate`, "Gate without Mods" (task 5.3 of change `0-3-0`).
// Each command that the gate denies here has a static `deny` rule in the settings snippet, so the deny stays with `disableAllHooks: true`.
// The matcher follows the documented rule syntax: `*` matches any text, and a pattern that ends in ` *` also matches the bare command.
// The stub session of task 5.3 in `evidence.md` shows the same denies in Claude Code.

import { expect, test } from "bun:test";
import { gate } from "../../../plugins/claudetto/modules/gate/domain/gate.ts";
import { SNIPPET } from "../../../plugins/claudetto/modules/setup/prompts.ts";

const DENIED = [
  "rm -rf ~",
  "rm -rf ~/",
  "rm -rf $HOME",
  'rm -rf "$HOME"',
  "sudo true",
  "doas true",
  "su root",
  "newfs_hfs /dev/disk9",
  "diskutil eraseDisk JHFS+ X /dev/disk9",
  "diskutil zeroDisk disk9",
  "diskutil secureErase 0 disk9",
  "diskutil partitionDisk disk9",
  "diskutil reformat disk9",
  "csrutil disable",
  "csrutil clear",
  "csrutil authenticated-root disable",
  "spctl --master-disable",
  "spctl --global-disable",
  "nvram boot-args=-v",
  "nvram -d boot-args",
  "nvram -c",
  "security delete-keychain x",
  "dd if=/dev/zero of=/dev/disk9",
  "mkfs.ext4 /dev/sda1",
];

const ALLOWED = [
  "csrutil status",
  "nvram -p",
  "diskutil list",
  "rm -rf ./build",
  "security find-generic-password x",
];

const BASH_RULES = SNIPPET.permissions.deny.flatMap((r) => {
  const m = /^Bash\((.+)\)$/.exec(r);
  return m?.[1] ? [m[1]] : [];
});

/** True when the `Bash` pattern `rule` matches the command `command`. */
const matches = (rule: string, command: string): boolean => {
  const body = rule
    .split("*")
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`^${body.join(".*")}$`);
  return (
    re.test(command) || (rule.endsWith(" *") && command === rule.slice(0, -2))
  );
};

const isStaticDeny = (command: string): boolean =>
  BASH_RULES.some((r) => matches(r, command));

const facts = {
  cwd: "/p",
  home: "/u",
  tmp: "/t",
  temps: ["/t", "/tmp", "/private/tmp"],
  git: async () => "clean" as const,
  userEdits: async () => [],
};

test("Mods Off: each command that the gate denies has a static `deny` rule", async () => {
  for (const c of DENIED)
    expect(
      (await gate({ tool: "Bash", input: { command: c } }, facts)).decision,
    ).toBe("deny");
  expect(DENIED.filter((c) => !isStaticDeny(c))).toStrictEqual([]);
});

test("a read of the system state, a build folder delete, and a keychain read match no static rule", () => {
  expect(ALLOWED.filter(isStaticDeny)).toStrictEqual([]);
});

test("each system folder of the gate has an `Edit` deny with an absolute path", () => {
  for (const dir of ["System", "Library", "usr/bin", "usr/sbin", "usr/lib"])
    expect(SNIPPET.permissions.deny).toContain(`Edit(//${dir}/**)`);
  expect(
    SNIPPET.permissions.deny.filter((r) => r.startsWith("Edit(//usr/local")),
  ).toStrictEqual([]);
});
