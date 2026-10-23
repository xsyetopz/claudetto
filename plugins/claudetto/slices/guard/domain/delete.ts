// The delete commands (D1) and the commands that erase a disk: which words of a command are the paths that it removes.

import { baseName } from "../../../kernel/wrappers.ts";

export const DELETES = new Set(["rm", "shred", "srm", "unlink"]);
const FIND_RUNS = new Set(["-exec", "-execdir", "-ok", "-okdir"]);

const DISK_TESTS: Record<string, (rest: string[], sub: string) => boolean> = {
  dd: (rest) => rest.some((w) => w.startsWith("of=/dev/")),
  diskutil: (_, sub) =>
    /^(?:erase|zero|secureErase|partition|reformat)/i.test(sub),
  csrutil: (_, sub) => sub !== "status",
  spctl: (rest) => rest.some((w) => /^--(?:master|global)-disable$/.test(w)),
  nvram: (rest) =>
    rest.slice(1).some((w) => w.includes("=") || /^-[dcf]$/.test(w)),
  security: (_, sub) => sub.startsWith("delete-"),
};

/** True when the command `rest` with the name `name` can erase a disk or change a protection of the system. */
export const erasesDisk = (name: string, rest: string[]): boolean =>
  /^(?:mkfs(?:\..+)?|newfs.*)$/.test(name) ||
  (Object.hasOwn(DISK_TESTS, name) &&
    (DISK_TESTS[name]?.(rest, rest[1] ?? "") ?? false));

/** The words of `args` that are not options, with each word after `--`. */
export const operands = (args: string[]): string[] => {
  const at = args.indexOf("--");
  const before = at < 0 ? args : args.slice(0, at);
  return [
    ...before.filter((a) => !a.startsWith("-")),
    ...(at < 0 ? [] : args.slice(at + 1)),
  ];
};

/** The paths that the delete command `rest` removes, or `null` when it is not a delete. */
export const deleteTargets = (rest: string[]): string[] | null => {
  const name = baseName(rest[0] ?? "");
  if (DELETES.has(name)) return operands(rest.slice(1));
  const runsDelete = rest.some(
    (w, i) =>
      w === "-delete" ||
      (FIND_RUNS.has(w) && DELETES.has(baseName(rest[i + 1] ?? ""))),
  );
  if (name !== "find" || !runsDelete) return null;
  const end = rest.findIndex((w, i) => i > 0 && /^[-(!]/.test(w));
  const roots = rest.slice(1, end < 0 ? undefined : end);
  return roots.length ? roots : ["."];
};
