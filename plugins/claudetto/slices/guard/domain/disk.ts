// The commands that erase a disk or change a protection of the system, for the gate of `gate.ts`.
// The function is pure and imports nothing.

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
