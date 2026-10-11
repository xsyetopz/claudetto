// The pure logic of the code-graph hooks: which symbol a search names,
// which graph hit is that symbol, and the text that goes to Claude.
// No function here runs a command or reads a file.

/** The install command that the check prints. The add-on never runs it. */
export const INSTALL_COMMAND = "npm i -g @colbymchenry/codegraph";

/** The command that builds the first index. It is the opt-in of a project. */
export const INIT_COMMAND = "codegraph init -y";

/** The `kind` values of a graph hit that a search can name. */
const KINDS = new Set(["function", "method", "class", "constant"]);

/** A caller of kind `file` or `import` is an import edge, not a call. */
const SKIPPED = new Set(["file", "import"]);

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

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

/** The one symbol name that a search pattern names, or null. */
export function symbolOf(toolName, input, min) {
  let name = null;
  if (toolName === "Grep" && typeof input?.pattern === "string") {
    name = input.pattern
      .replace(/\\b/g, "")
      .replace(/^\^|\$$/g, "")
      .trim();
  } else if (toolName === "Glob" && typeof input?.pattern === "string") {
    const last = input.pattern.split("/").pop() ?? "";
    name = last.replace(/\.[^.]*$/, "").replace(/\*+/g, "");
  }
  return name && name.length >= min && IDENTIFIER.test(name) ? name : null;
}

/** `text` as parsed JSON, or null when it is not JSON (the CLI prints text for an unknown symbol). */
export function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    return null;
  }
}

/**
 * The node of `hits` (the array of `codegraph query --json`) that `symbol` names.
 * The hit must have a kind in `KINDS`, and the name must equal the symbol or start with it.
 * An exact name wins over a prefix name, and the order of the CLI breaks a tie.
 */
export function pickNode(hits, symbol) {
  if (!Array.isArray(hits)) return null;
  const nodes = hits
    .map((hit) => hit?.node)
    .filter((node) => node && KINDS.has(node.kind) && node.filePath);
  const low = symbol.toLowerCase();
  return (
    nodes.find((node) => node.name === symbol) ??
    nodes.find((node) => String(node.name).toLowerCase().startsWith(low)) ??
    null
  );
}

const where = (item) => `\`${item.filePath}:${item.startLine}\``;

/**
 * The context for `node` and its `callers` (the top-level array of `codegraph callers --json`),
 * or null when it does not fit in `max` characters.
 * With `callers` null (the CLI gave no answer), the text makes no claim about callers.
 * The callers that do not fit are counted, not cut.
 */
export function contextText(node, callers, max) {
  const head = `The code graph knows \`${node.name}\`, a ${node.kind} at ${where(node)}.`;
  if (!Array.isArray(callers)) return head.length <= max ? head : null;
  const list = callers.filter((caller) => !SKIPPED.has(caller?.kind));
  if (list.length === 0) {
    const text = `${head} The graph shows no callers. A dynamic call is not in the graph.`;
    return text.length <= max ? text : null;
  }
  const base = `${head} Callers: `;
  const shown = [];
  const hint = `\`codegraph callers ${node.name}\` lists all of them.`;
  let used = base.length + hint.length + 40;
  for (const caller of list) {
    const item = `\`${caller.name}\` (${where(caller)})`;
    if (used + item.length + 2 > max) break;
    shown.push(item);
    used += item.length + 2;
  }
  if (shown.length === 0) return null;
  const more = list.length - shown.length;
  const rest = more > 0 ? ` and ${more} more. ${hint}` : ".";
  return `${base}${shown.join(", ")}${rest}`;
}

/** What the check prints, as lines, from whether the CLI answers and whether the project has an index. */
export function checkLines(found, version, indexed) {
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
