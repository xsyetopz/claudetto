// The parsers of the plan: the tasks of a file and the package of one agent.
// Plain data and pure functions only.

import {
  type FormatError,
  PACKAGE_SECTIONS,
  type Package,
  type PackageFront,
  type PackageSection,
  type Result,
  type Task,
} from "./formats.ts";
import { fail, group, type Line, result, toLines } from "./parse-lines.ts";

const FRONT_KEYS: readonly string[] = [
  "id",
  "deps",
  "owns",
  "verify",
  "agent",
];

const TASK = /^- \[( |x)\] (\S+) (\S.*)$/;
const VERIFY = /^\s+Verify:\s*(.*)$/;
const FRONT_LINE = /^([a-z]+):\s*(.*)$/;

const isPackageSection = (name: string): name is PackageSection =>
  (PACKAGE_SECTIONS as readonly string[]).includes(name);

/** Parses the tasks of a file: `- [ ] <id> <text>`, each with an indented `Verify:` line. */
export const parseTasks = (text: string): Result<Task[], FormatError> => {
  const errors: FormatError[] = [];
  const tasks: Task[] = [];
  let current: Task | null = null;
  for (const line of toLines(text)) {
    const task = TASK.exec(line.text);
    const verify = VERIFY.exec(line.text);
    if (task !== null) {
      const next: Task = {
        id: group(task, 2),
        text: group(task, 3).trim(),
        done: group(task, 1) === "x",
        verify: null,
        line: line.line,
      };
      tasks.push(next);
      current = next;
    } else if (verify !== null) {
      if (current === null) {
        errors.push(fail(line.line, "a `Verify:` line is outside a task"));
      } else if (current.verify !== null) {
        errors.push(fail(line.line, "a task has a second `Verify:` line"));
      } else {
        current.verify = group(verify, 1).trim();
      }
    } else if (line.text.startsWith("- [")) {
      errors.push(fail(line.line, "a task is `- [ ] <id> <text>`"));
    } else if (line.text.startsWith("#")) {
      current = null;
    }
  }
  return result(tasks, errors);
};

const unquote = (value: string): string => {
  const m = /^(["'])(.*)\1$/.exec(value);
  return m === null ? value : group(m, 2);
};

/** Reads a flow list such as `[]` or `["src/a/", P01b]`, or gives `null` when the value is not one. */
const flowList = (value: string): string[] | null => {
  if (!value.startsWith("[") || !value.endsWith("]")) {
    return null;
  }
  const inner = value.slice(1, -1).trim();
  if (inner === "") {
    return [];
  }
  const items = inner.match(/"[^"]*"|'[^']*'|[^,\s][^,]*/g) ?? [];
  return items.map((item) => unquote(item.trim()));
};

/** Reads the front matter lines between the `---` lines, and each key once. */
const frontOf = (
  lines: Line[],
  close: number,
): { raw: Map<string, { value: string; line: number }>; errors: FormatError[] } => {
  const errors: FormatError[] = [];
  const raw = new Map<string, { value: string; line: number }>();
  for (const line of lines.slice(1, close)) {
    const m = FRONT_LINE.exec(line.text);
    if (line.text.trim() === "") {
      continue;
    }
    if (m === null) {
      errors.push(fail(line.line, "a front matter line is `key: value`"));
      continue;
    }
    const key = group(m, 1);
    if (!FRONT_KEYS.includes(key)) {
      errors.push(fail(line.line, `unknown front matter key \`${key}\``));
    } else if (raw.has(key)) {
      errors.push(fail(line.line, `duplicate front matter key \`${key}\``));
    } else {
      raw.set(key, { value: group(m, 2).trim(), line: line.line });
    }
  }
  return { raw, errors };
};

/** Gives the body of each known section. A section that is unknown or repeated gets an error. */
const sectionsOf = (
  lines: Line[],
): { found: Map<string, string[]>; errors: FormatError[] } => {
  const errors: FormatError[] = [];
  const found = new Map<string, string[]>();
  // A section that is unknown or repeated gets a body that no field reads, so
  // that its lines give one error and no more.
  let current: string[] | null = null;
  for (const line of lines) {
    const heading = /^## (\S.*)$/.exec(line.text);
    if (/^# /.test(line.text)) {
      continue;
    }
    if (heading !== null) {
      const name = group(heading, 1).trim();
      if (!isPackageSection(name)) {
        errors.push(fail(line.line, "an unknown section of a package"));
        current = [];
      } else if (found.has(name)) {
        errors.push(fail(line.line, `duplicate section \`${name}\``));
        current = [];
      } else {
        current = [];
        found.set(name, current);
      }
    } else if (current !== null) {
      current.push(line.text);
    } else if (line.text.trim() !== "") {
      errors.push(fail(line.line, "text outside a section of a package"));
    }
  }
  return { found, errors };
};

/** Parses a package: the front matter with `id`, `deps`, `owns`, `verify`, and `agent`, and the sections. */
export const parsePackage = (text: string): Result<Package, FormatError> => {
  const lines = toLines(text);
  const close = lines.findIndex((l, i) => i > 0 && l.text === "---");
  if (lines[0] === undefined || lines[0].text !== "---" || close < 0) {
    return { ok: false, errors: [fail(1, "no front matter between `---` lines")] };
  }
  const front = frontOf(lines, close);
  const errors: FormatError[] = [...front.errors];
  // The closing `---` line: `toLines` numbers each line from 1.
  const closeLine = close + 1;
  for (const key of FRONT_KEYS) {
    if (!front.raw.has(key)) {
      errors.push(fail(closeLine, `missing front matter key \`${key}\``));
    }
  }
  const scalar = (key: string): string => unquote(front.raw.get(key)?.value ?? "");
  const list = (key: string): string[] => {
    const entry = front.raw.get(key);
    if (entry === undefined) {
      return [];
    }
    const items = flowList(entry.value);
    if (items === null) {
      errors.push(fail(entry.line, `\`${key}\` is not a flow list`));
      return [];
    }
    return items;
  };
  const sections = sectionsOf(lines.slice(close + 1));
  errors.push(...sections.errors);
  const body = (name: PackageSection): string =>
    (sections.found.get(name) ?? []).join("\n").trim();
  const value: PackageFront = {
    id: scalar("id"),
    deps: list("deps"),
    owns: list("owns"),
    verify: scalar("verify"),
    agent: scalar("agent"),
  };
  return result(
    {
      front: value,
      sections: {
        Goal: body("Goal"),
        Context: body("Context"),
        Steps: body("Steps"),
        Acceptance: body("Acceptance"),
        Boundaries: body("Boundaries"),
      },
    },
    errors,
  );
};
