// The pure logic of the code-graph hooks: the text that goes to Claude, and the parse of the CLI output.
// No function here runs a command or reads a file.

/** The fields of a hook payload that the hooks read. */
export interface HookPayload {
  cwd?: string;
}

/** The install command that the check prints. The add-on never runs it. */
export const INSTALL_COMMAND = "npm i -g @colbymchenry/codegraph";

/** The command that builds the first index. It is the opt-in of a project. */
export const INIT_COMMAND = "codegraph init -y";

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

/** `text` as parsed JSON, or null when it is not JSON (the CLI prints text for an unknown symbol). */
export function parseJson(text: string): HookPayload | null {
  try {
    return JSON.parse(text);
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    return null;
  }
}

/** What the check prints, as lines, from whether the CLI answers and whether the project has an index. */
export function checkLines(
  found: boolean,
  version: string,
  indexed: boolean,
): string[] {
  if (!found)
    return [
      "`codegraph` is not on `PATH`, so the code-graph hooks do nothing.",
      `To install it, run \`${INSTALL_COMMAND}\`.`,
      "The add-on does not install it.",
    ];
  const lines = [`\`codegraph\` ${version} is on \`PATH\`.`];
  lines.push(
    indexed
      ? "This project has an index, so the code-graph hooks run."
      : `This project has no index, so the hooks do nothing. To opt in, run \`${INIT_COMMAND}\` in the project.`,
  );
  return lines;
}
