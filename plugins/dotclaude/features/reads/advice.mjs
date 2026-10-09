// The deny reason of the unbounded-output rule of `bounds.mjs`: the bounded forms for each command.
// The reason goes to Claude, so it is in strict ASD-STE100: the reason, then the action.

/** The bounded forms for each command, for the deny reason. */
const ADVICE = {
  cat: "To read a file, call `Read` with `offset` and `limit`. To find lines, call `Grep` with `head_limit`, or use `grep -m N`.",
  grep: "Add `-m N`, `-c`, or `-l`, or end the pipe with `| head -n N`. The `Grep` tool takes `head_limit`.",
  jq: "Select one field, count with `length`, take a slice with `.[0:N]`, or end the pipe with `| head -n N`.",
  find: "End the pipe with `| head -n N`, or count with `| wc -l`. The `Glob` tool gives the paths of a pattern.",
  "git log": "Add `-n N` to `git log`, or end the pipe with `| head -n N`.",
  "git diff":
    "Add `--stat` or `--name-only` first. Then give a path, and end the pipe with `| head -n N`.",
  "git blame": "Add `-L a,b` to `git blame` for the lines that you need.",
  curl: "Write the page to a file with `-o FILE`. Then search the file with `grep -m N`.",
  other:
    "End the pipe with `| head -n N` or `| tail -n N`, or count with `| wc -l`.",
};
const ADVICE_OF = {
  cat: "cat",
  nl: "cat",
  grep: "grep",
  egrep: "grep",
  fgrep: "grep",
  rg: "grep",
  ag: "grep",
  jq: "jq",
  yq: "jq",
  find: "find",
  fd: "find",
  tree: "find",
  "ls -R": "find",
  curl: "curl",
  "git log": "git log",
  "git diff": "git diff",
  "git show": "git diff",
  "git blame": "git blame",
  "git grep": "grep",
};

/** The deny reason for the command `name`. */
export function boundReason(name) {
  const advice = ADVICE[ADVICE_OF[name] ?? "other"];
  return [
    `The output of \`${name}\` in this command has no limit.`,
    "Each line of a `Bash` result stays in the context for the rest of the session, and each later turn reads it again.",
    advice,
    "Then run the command again with the limit.",
  ].join("\n");
}
