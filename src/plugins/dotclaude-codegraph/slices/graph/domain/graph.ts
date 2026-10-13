// The pure logic of the code-graph hooks: the text that goes to Claude, and the parse of the payload.
// No function here runs a command or reads a file.

/** The fields of a hook payload that the hooks read. */
export interface HookPayload {
  cwd?: string;
}

/** The install command that the check prints. The add-on never runs it. */
export const INSTALL_COMMAND = "bun i -g @colbymchenry/codegraph";

/** The command that builds the first index. It is the opt-in of a project. */
export const INIT_COMMAND = "codegraph init -y";

/** The path of the index database in a project. A project with this file has opted in. */
export const INDEX_PATH = ".codegraph/codegraph.db";

/**
 * The line that `SessionStart` adds.
 * `impact` has a default depth of 2, so the line gives `-d 5`.
 * A run on the fixture of the comparison missed 2 of 8 affected functions at depth 2.
 */
export const SESSION_LINE =
  "This project has a code graph. " +
  "`codegraph impact <symbol> -d 5` lists the code that a change to a symbol affects. " +
  "The default depth of 2 misses some of it. " +
  "`codegraph callers <symbol>` and `codegraph callees <symbol>` list who calls a symbol and what it calls.";

/** One word of an option value, with its quoted parts, such as `"my dir"`. */
const GIT_WORD = String.raw`(?:[^\s"']|"[^"]*"|'[^']*')+`;

/**
 * A global option of `git` before its verb: `-C <path>`, `-c <k=v>`, `--git-dir=<p>`, `--git-dir <p>`, `--work-tree`, `--namespace`, or a flag such as `--no-pager` or `-p`.
 */
const GIT_OPTION = String.raw`(?:-[Cc]\s+${GIT_WORD}|--(?:git-dir|work-tree|namespace)(?:=|\s+)${GIT_WORD}|--(?!(?:git-dir|work-tree|namespace)(?:=|\s))[a-z][\w-]*|-[pP])`;

/**
 * A `Bash` command with a `git` command that changes the tree: `commit`, `merge`, `rebase`, `pull`, `checkout`, `switch`, `reset`, `cherry-pick`, `revert`, `stash`, `apply`, or `am`.
 * The `git` command starts the command or follows `;`, `&`, or `|`, so `cd x && git commit` matches.
 * Global options before the verb are skipped, so `git -C dir commit` matches too.
 * The mod handler uses it as its filter, so a command of any other kind starts no process.
 */
export const TREE_CHANGE = new RegExp(
  String.raw`(?:^|[;&|])\s*git(?:\s+${GIT_OPTION})*\s+(?:commit|merge|rebase|pull|checkout|switch|reset|cherry-pick|revert|stash|apply|am)(?:\s|$)`,
);

/** `text` as a parsed payload, or null when it is not JSON. */
export const parseJson = (text: string): HookPayload | null => {
  try {
    return JSON.parse(text);
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    return null;
  }
};

/** What the check prints, as lines, from whether the CLI answers and whether the project has an index. */
export const checkLines = (
  found: boolean,
  version: string,
  indexed: boolean,
): string[] => {
  if (!found)
    return [
      "`codegraph` is not on `PATH`, so the code-graph hooks do nothing.",
      `To install it, run \`${INSTALL_COMMAND}\`.`,
      "The add-on does not install it.",
    ];
  return [
    `\`codegraph\` ${version} is on \`PATH\`.`,
    indexed
      ? "This project has an index, so the code-graph hooks run."
      : `This project has no index, so the hooks do nothing. To opt in, run \`${INIT_COMMAND}\` in the project.`,
  ];
};
