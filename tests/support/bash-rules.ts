// The matching of a `Bash(...)` permission rule, as `permissions.md` describes it:
// a rule is a whole-command pattern in which `*` stands for any text,
// and a deny or ask rule matches a compound command when it matches any subcommand.
// A program by path, `sh -c`, and an option before the subcommand are out of scope, because a rule cannot match them.

/** The subcommands of a compound command: it splits on `&&`, `||`, `;`, `|`, `&`, and a newline. */
export const subcommands = (command: string): string[] =>
  command
    .split(/&&|\|\||[;|&\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

/** The pattern of a `Bash(pattern)` rule, or `null` for another tool. */
export const bashPattern = (rule: string): string | null =>
  /^Bash\((.*)\)$/s.exec(rule)?.[1] ?? null;

const regexOf = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*")}$`,
    "s",
  );

/** The rules that match the command: a rule matches when it matches the whole command or one subcommand. */
export const matchingRules = (rules: string[], command: string): string[] => {
  const parts = [command.trim(), ...subcommands(command)];
  return rules.filter((rule) => {
    const pattern = bashPattern(rule);
    if (pattern === null) return false;
    const re = regexOf(pattern);
    return parts.some((part) => re.test(part));
  });
};
