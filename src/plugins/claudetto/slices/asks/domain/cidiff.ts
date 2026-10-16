// The check on a weaker CI file (package P36), as pure functions.
// A change gets no ask only when every changed part is on a short list of safe changes:
// a change of format or comments only, a move of lines, a change of a `name` key,
// or an added step or job with no risky key at any depth (`if`, `continue-on-error`, `timeout-minutes`, `shell`, `allow_failure`, `when`, or `<<:`),
// no command that lets a failure pass (such as `|| true` or `exit 0`), and no `run` script that is not safe.
// A `run` script is safe when each of its commands is a check, build, or install program, and no line writes a file or a CI variable file.
// An added step must have a `uses` key or a `run` key.
// Every other change asks: a lost line, a changed value, and an added key in an old step or job.
// A YAML file is read as a tree of lines by indent. Another CI file, such as a `Jenkinsfile`, asks on any change of its code.
// The check reads the lines of an added part. It does not test a line together with the line above it.

import {
  CI_ADDABLE_PARENT,
  CI_RISKY_COMMAND,
  CI_RISKY_KEY,
  CI_RUN_KEY,
  CI_RUN_WRITE,
  CI_SAFE_PROGRAM,
  CI_USES_KEY,
  CI_YAML_FILE,
} from "../limits.ts";
import { CI_LINE_ADDED, CI_LINE_LOST, CI_NOT_YAML } from "../prompts.ts";
import { missing, normal } from "./scan.ts";
import { shown } from "./shown.ts";

/** One line of a YAML file: the normal text, the lines below it, and whether it is a list item or a block text such as `run: |`. */
type Node = { text: string; kids: Node[]; item: boolean; block: boolean };

const BLOCK_HEADER = /[:\s][|>][+-]?\d?$/;
const NAME_KEY = /^["']?name["']?\s*:/;

/** The line without a YAML comment: a `#` at the start or after a space, outside a quote. */
const withoutComment = (line: string): string => {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    if (quote) {
      if (ch === "\\" && quote === '"') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "#" && (i === 0 || /\s/.test(line[i - 1] as string)))
      return line.slice(0, i);
  }
  return line;
};

/** The text of a line in normal form: one space for each run of spaces, and a single-quoted plain value in double quotes. */
const tidy = (text: string): string =>
  text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(.*?: )'([^'"]*)'$/, '$1"$2"');

const indentOf = (line: string): number =>
  line.length - line.trimStart().length;

/** The nodes of a YAML text, without the `name` keys. A line below a block header is a flat line of that block. */
const parse = (text: string): Node[] => {
  const roots: Node[] = [];
  const stack: { indent: number; node: Node }[] = [];
  const lines = text
    .replace(/\t/g, "  ")
    .split("\n")
    .map(withoutComment)
    .map((l) => l.trimEnd());
  const attach = (indent: number, node: Node, dash: boolean): void => {
    while (stack.length) {
      const top = stack.at(-1) as { indent: number; node: Node };
      const keeps =
        top.indent === indent &&
        dash &&
        !top.node.item &&
        top.node.text.endsWith(":");
      if (top.indent < indent || keeps) break;
      stack.pop();
    }
    (stack.at(-1)?.node.kids ?? roots).push(node);
    stack.push({ indent, node });
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] as string;
    if (raw.trim() === "") continue;
    let indent = indentOf(raw);
    let rest = raw.trimStart();
    while (rest === "-" || rest.startsWith("- ")) {
      attach(indent, { text: "-", kids: [], item: true, block: false }, true);
      const after = rest.slice(1).trimStart();
      indent += rest.length - after.length;
      rest = after;
    }
    if (rest === "") continue;
    const node: Node = {
      text: tidy(rest),
      kids: [],
      item: false,
      block: BLOCK_HEADER.test(rest),
    };
    attach(indent, node, false);
    if (node.block) {
      while (
        i + 1 < lines.length &&
        ((lines[i + 1] as string).trim() === "" ||
          indentOf(lines[i + 1] as string) > indent)
      ) {
        i++;
        const flat = tidy(lines[i] as string);
        if (flat !== "")
          node.kids.push({ text: flat, kids: [], item: false, block: false });
      }
    }
  }
  return drop(roots);
};

/** The nodes without a `name` key at any depth. */
const drop = (nodes: Node[]): Node[] =>
  nodes
    .filter((n) => !NAME_KEY.test(n.text))
    .map((n) => (n.block ? n : { ...n, kids: drop(n.kids) }));

/** The form of a node for a compare: a list or a map has no order, and a block text keeps its order. */
const canon = (node: Node): string =>
  node.block
    ? `${node.text}\n${node.kids.map((k) => k.text).join("\n")}`
    : `${node.text}{${node.kids.map(canon).sort().join(",")}}`;

/** The text of a node and of each node below it. */
const allLines = (node: Node): string[] => [
  node.text,
  ...node.kids.flatMap(allLines),
];

/** True when a node has a key that skips it or a command that lets it pass after a failure. */
const risky = (node: Node): boolean =>
  allLines(node).some(
    (l) => CI_RISKY_KEY.test(l) || CI_RISKY_COMMAND.some((re) => re.test(l)),
  );

/** True when `node` is a step added under `steps` or a job added under `jobs`. */
const addable = (parent: string, node: Node): boolean =>
  CI_ADDABLE_PARENT.test(parent) &&
  node.item === /^["']?steps["']?:$/.test(parent);

/** The script lines of each `run` key of an added part, at any depth. A block gives one entry for each of its lines. */
const runScripts = (node: Node): string[][] => [
  ...(CI_RUN_KEY.test(node.text)
    ? [
        node.block
          ? node.kids.map((k) => k.text)
          : [node.text.replace(CI_RUN_KEY, "")],
      ]
    : []),
  ...node.kids.flatMap(runScripts),
];

/** True when the lines of a `run` value run only checking, building, or install programs, and write no file. */
const safeScript = (lines: string[]): boolean => {
  const commands = lines
    .flatMap((l) => l.split(/&&|\|\||;|\|/))
    .map((c) => c.trim())
    .filter((c) => c !== "");
  return (
    commands.length > 0 &&
    commands.every((c) => CI_SAFE_PROGRAM.test(c)) &&
    lines.every((l) => !CI_RUN_WRITE.test(l))
  );
};

/** True when an added part has a `run` key that is not a safe script, or is a step with neither a `uses` key nor a `run` key. */
const unsafeAdded = (node: Node): boolean =>
  runScripts(node).some((lines) => !safeScript(lines)) ||
  (node.item &&
    !node.kids.some(
      (k) => CI_USES_KEY.test(k.text) || CI_RUN_KEY.test(k.text),
    ));

/** The first thing in `now` below `parent` that takes a check from `was`, or undefined. */
const compare = (
  was: Node[],
  now: Node[],
  parent: string,
): string | undefined => {
  const [a, b] = [was.map(canon), now.map(canon)];
  const lostKeys = new Set(missing(a, b));
  const addedKeys = new Set(missing(b, a));
  const lostNodes = was.filter((n) => lostKeys.has(canon(n)));
  const addedNodes = now.filter((n) => addedKeys.has(canon(n)));
  const open = [...addedNodes];
  for (const old of lostNodes) {
    const same =
      old.item || old.block
        ? -1
        : open.findIndex((n) => n.text === old.text && !n.item && !n.block);
    if (same === -1) return CI_LINE_LOST({ line: shown(old.text) });
    const found = compare(old.kids, (open[same] as Node).kids, old.text);
    if (found !== undefined) return found;
    open.splice(same, 1);
  }
  const bad = open.find(
    (n) => !addable(parent, n) || risky(n) || unsafeAdded(n),
  );
  return bad === undefined
    ? undefined
    : CI_LINE_ADDED({
        line: shown(bad.text === "-" ? (bad.kids[0]?.text ?? "-") : bad.text),
      });
};

/**
 * What a call takes from a CI file at `rel`, or undefined.
 * A lost line, a changed line, and an added part that is not a safe step or job give a reason.
 */
export const ciWeaker = (
  rel: string,
  before: string,
  after: string,
): string | undefined => {
  if (!CI_YAML_FILE.test(rel)) {
    return normal(before) === normal(after) ? undefined : CI_NOT_YAML;
  }
  return compare(parse(before), parse(after), "");
};
