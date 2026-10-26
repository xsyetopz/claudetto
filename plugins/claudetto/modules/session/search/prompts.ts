export const TOOL_GREP = `Searches the content of files for a regular expression.
Use it in place of \`grep\` and \`rg\` in \`Bash\`.
It skips \`.git\` and the \`.env\` files.`;

export const TOOL_GLOB = `Finds files by a glob pattern, such as \`**/*.ts\`.
Use it in place of \`find\` and \`ls\` in \`Bash\`.
A pattern with no \`/\` matches the file name at each depth.
It skips \`.git\` and the \`.env\` files.`;

export const GREP_FIELDS: Readonly<Record<string, string>> = {
  pattern: "The regular expression to search for.",
  path: "The file or folder to search. Default: the project folder.",
  glob: "Search only the files whose name matches this glob, such as `*.ts`.",
  output_mode:
    "`files_with_matches` (default) lists the files, `content` shows the lines, `count` counts the matches of each file.",
  "-B": "Lines before each match. For `content` only.",
  "-A": "Lines after each match. For `content` only.",
  "-C": "Lines before and after each match. For `content` only.",
  context: "The same as `-C`.",
  "-n": "Show line numbers. For `content` only. Default: true.",
  "-i": "Ignore case.",
  "-o": "Show only the matched part. For `content` only.",
  head_limit: "The most entries to return. Default: 250. 0 is no limit.",
  offset: "The entries to skip before `head_limit`.",
};

export const GLOB_FIELDS: Readonly<Record<string, string>> = {
  pattern: "The glob pattern, such as `src/**/*.ts`.",
  path: "The folder to search. Default: the project folder.",
};

export const NO_MATCHES = "No matches.";
export const NO_FILES = "No files match.";
export const MORE = (v: { count: number }): string =>
  `${v.count} more. Narrow the search, or set \`offset\`.`;
export const CUT = "The text is cut here. Narrow the search.";
export const NO_PROGRAM = (v: { names: string }): string =>
  `This host has none of the programs ${v.names}, so the search cannot run. Use \`Bash\` with another command.`;
export const BAD_INPUT = (v: { field: string }): string =>
  `The input field \`${v.field}\` is missing or has a wrong value.`;
export const RUN_FAILED = (v: { reason: string }): string =>
  `The search failed: ${v.reason}`;
