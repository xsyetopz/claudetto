// The Markdown of a spec: requirement blocks and delta sections.
// The rules follow OpenSpec 1.14.3, so that both tools read the same files.

/** A requirement: its name and its text from the `### Requirement:` line to the next header. */
export interface Block {
  readonly name: string;
  readonly raw: string;
}

/** The sections of a delta spec. */
export interface Delta {
  readonly added: Block[];
  readonly modified: Block[];
  readonly removed: string[];
  readonly renamed: { readonly from: string; readonly to: string }[];
  /** The body of `## Purpose`, or `null`. */
  readonly purpose: string | null;
  /** The headers of the delta sections that the file has, such as `## ADDED Requirements`. */
  readonly sections: string[];
}

const REQUIREMENT = /^###\s*Requirement:\s*(.+)\s*$/i;
const TOP = /^##\s+/;
const BULLET_REMOVED = /^\s*[-*+]\s*`?###\s*Requirement:\s*(.+?)`?\s*$/;
const PAIR = /^\s*[-*+]?\s*(FROM|TO):\s*`?###\s*Requirement:\s*(.+?)`?\s*$/;

/** `true` for each line inside a fenced code block, with the fence lines. */
const fenceMask = (lines: readonly string[]): boolean[] => {
  let fence: string | null = null;
  return lines.map((line) => {
    const m = /^\s*(```+|~~~+)/.exec(line);
    if (fence === null) {
      fence = m?.[1]?.[0] ?? null;
      return fence !== null;
    }
    if (m?.[1]?.[0] === fence) fence = null;
    return true;
  });
};

const unfenced = (ls: readonly string[]): string[] => {
  const mask = fenceMask(ls);
  return ls.filter((_, i) => !mask[i]);
};

/** The indexes of the lines of `ls` outside fenced code blocks that match `re`. */
const headers = (ls: readonly string[], re: RegExp): number[] => {
  const mask = fenceMask(ls);
  return ls.flatMap((l, i) => (!mask[i] && re.test(l) ? [i] : []));
};

/** The name of a requirement header: the closing `###` run and the spaces leave. */
export const cleanName = (name: string): string =>
  name.replace(/[ \t]+#+[ \t]*$/, "").trim();

const lines = (text: string): string[] =>
  text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");

const blocksOf = (
  body: readonly string[],
): { preamble: string; blocks: Block[] } => {
  const starts = headers(body, REQUIREMENT);
  const join = (from: number, to?: number): string =>
    body.slice(from, to).join("\n").trimEnd();
  return {
    preamble: join(0, starts[0]),
    blocks: starts.map((at, k) => ({
      name: cleanName(REQUIREMENT.exec(body[at] ?? "")?.[1] ?? ""),
      raw: join(at, starts[k + 1]),
    })),
  };
};

/** The `FROM` and `TO` pairs of the `## RENAMED Requirements` lines. */
const renames = (body: readonly string[]): Delta["renamed"] => {
  const renamed: { from: string; to: string }[] = [];
  let from: string | null = null;
  for (const line of unfenced(body)) {
    const [, side, name] = PAIR.exec(line) ?? [];
    if (side === "FROM") from = cleanName(name ?? "");
    else if (side === "TO" && from !== null) {
      renamed.push({ from, to: cleanName(name ?? "") });
      from = null;
    }
  }
  return renamed;
};

export const parseDelta = (text: string): Delta => {
  const all = lines(text);
  const tops = headers(all, TOP);
  const bodies = new Map<string, string[]>();
  const sections: string[] = [];
  for (const [k, at] of tops.entries()) {
    const line = all[at] ?? "";
    const title = line.replace(TOP, "").trim().toLowerCase();
    const rest = all.slice(at + 1, tops[k + 1]);
    bodies.set(title, [...(bodies.get(title) ?? []), ...rest]);
    if (title.endsWith(" requirements") && title !== "requirements")
      sections.push(line.trim());
  }
  const body = (title: string): string[] => bodies.get(title) ?? [];
  return {
    added: blocksOf(body("added requirements")).blocks,
    modified: blocksOf(body("modified requirements")).blocks,
    removed: unfenced(body("removed requirements")).flatMap((line) => {
      const m = REQUIREMENT.exec(line) ?? BULLET_REMOVED.exec(line);
      return m?.[1] ? [cleanName(m[1])] : [];
    }),
    renamed: renames(body("renamed requirements")),
    purpose: bodies.has("purpose") ? body("purpose").join("\n").trim() : null,
    sections,
  };
};

/** The parts of a main spec around its `## Requirements` section. */
export interface MainSpec {
  readonly before: string;
  readonly header: string;
  readonly preamble: string;
  readonly blocks: Block[];
  readonly after: string;
}

export const parseMain = (text: string): MainSpec => {
  const all = lines(text);
  const start = headers(all, /^##\s+Requirements\s*$/i)[0];
  if (start === undefined)
    return parseMain(`${text.trimEnd()}\n\n## Requirements\n`);
  const end = headers(all, TOP).find((i) => i > start) ?? all.length;
  return {
    before: all.slice(0, start).join("\n"),
    header: all[start] ?? "",
    ...blocksOf(all.slice(start + 1, end)),
    after: all.slice(end).join("\n"),
  };
};

/** The text of a requirement: the lines up to the first header, with no blank line and no fenced line. */
export const requirementText = (raw: string): string => {
  const text: string[] = [];
  for (const line of unfenced(raw.split("\n").slice(1))) {
    if (/^#{1,6}\s/.test(line)) break;
    if (line.trim()) text.push(line.trim());
  }
  return text.join("\n");
};

/** The count of scenarios in a requirement: the `####` headers that have a body. */
export const scenarios = (raw: string): number => {
  const body = raw.split("\n").slice(1);
  const heads = headers(body, /^#{1,4}\s/);
  return headers(body, /^####\s+/).filter((i) =>
    body
      .slice(
        i + 1,
        heads.find((j) => j > i),
      )
      .join("")
      .trim(),
  ).length;
};
