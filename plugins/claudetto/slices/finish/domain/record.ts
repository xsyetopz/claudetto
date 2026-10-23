// What the record of the session and the output of `git status` say about the work of the session.

import type { AgentInfo, SessionMessage } from "claude-code";
import { proven } from "../../../kernel/checks.ts";
import { ticked } from "./tasks.ts";

type Input = {
  file_path?: unknown;
  old_string?: unknown;
  new_string?: unknown;
};

/** The inputs of the successful calls of `tools` in `messages`. */
const inputs = (messages: readonly SessionMessage[], ...tools: string[]) =>
  messages
    .flatMap((m) => m.toolUses)
    .filter((u) => tools.includes(u.tool) && !u.isError)
    .map((u) => (u.input ?? {}) as Input);

/** The boxes that each successful `Edit` of a `tasks.md` in `messages` ticked, with the path of the file. */
const tickEdits = (messages: readonly SessionMessage[]) =>
  inputs(messages, "Edit").flatMap((i) =>
    typeof i.file_path === "string" && i.file_path.endsWith("tasks.md")
      ? [
          {
            file: i.file_path,
            boxes: ticked(String(i.old_string), String(i.new_string)),
          },
        ]
      : [],
  );

/** The paths of the successful `Edit` and `Write` calls in `messages`. */
export const editedPaths = (messages: readonly SessionMessage[]): string[] => [
  ...new Set(
    inputs(messages, "Edit", "Write")
      .map((i) => i.file_path)
      .filter((p): p is string => typeof p === "string"),
  ),
];

/** The paths in the output of `git status --porcelain -z`, from the project root. A rename gives its new path. */
export const changedPaths = (output: string): string[] => {
  const entries = output.split("\0");
  const paths: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] ?? "";
    if (entry.length < 4) continue;
    paths.push(entry.slice(3));
    if (/[RC]/.test(entry.slice(0, 2))) i++;
  }
  return paths;
};

/** The edited files of `edited` that `changed` lists as not committed. `changed` holds paths from the project root. */
export const uncommitted = (
  edited: readonly string[],
  changed: readonly string[],
): string[] =>
  edited.filter((file) =>
    changed.some((c) => file === c || file.endsWith(`/${c}`)),
  );

/** The ids of the boxes that an `Edit` of a `tasks.md` ticked and that no passed check in `passed` supports. The `box` hook denies such an edit, so a box here came through another way, such as a shell command. */
export const unprovenTicks = (
  messages: readonly SessionMessage[],
  passed: readonly string[],
): string[] =>
  tickEdits(messages)
    .flatMap((t) => t.boxes)
    .filter(({ line }) => !proven(line, passed))
    .map(({ id }) => id);

/** The rows of the current turn: those after the last user row that holds text. A row with only tool results has no text. */
export const turnRows = (
  messages: readonly SessionMessage[],
): readonly SessionMessage[] => {
  const last = messages.findLastIndex(
    (m) => m.role === "user" && m.text.trim() !== "",
  );
  return messages.slice(last + 1);
};

const APPLY_COMMAND = "<command-name>/claudetto:apply</command-name>";

/** Whether `messages` show a run of `/claudetto:apply`: a user row with its command tag, or a `Skill` call of `claudetto:apply`. */
export const ranApply = (messages: readonly SessionMessage[]): boolean =>
  messages.some(
    (m) =>
      (m.role === "user" && m.text.includes(APPLY_COMMAND)) ||
      m.toolUses.some(
        (u) =>
          u.tool === "Skill" &&
          !u.isError &&
          (u.input as { skill?: unknown } | undefined)?.skill ===
            "claudetto:apply",
      ),
  );

/** Whether an agent of `agents` has work in flight: `pending`, `running`, or `waiting`. */
export const agentBusy = (agents: readonly AgentInfo[]): boolean =>
  agents.some((a) => ["pending", "running", "waiting"].includes(a.status));

/** The paths of the `tasks.md` files that an `Edit` in `rows` ticked a box of. */
export const tickedFiles = (rows: readonly SessionMessage[]): string[] => [
  ...new Set(tickEdits(rows).flatMap((t) => (t.boxes.length ? [t.file] : []))),
];

const count = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/** The reason in the line of a note: the files that are not committed, and the boxes that have no passed check. */
export const unprovenWhat = (
  files: readonly string[],
  boxes: readonly string[],
): string =>
  [
    files.length > 0 &&
      `${count(files.length, "file of this session is", "files of this session are")} not committed: ${files.join(", ")}`,
    boxes.length > 0 &&
      `${count(boxes.length, "task box has", "task boxes have")} no passed check: ${boxes.join(", ")}`,
  ]
    .filter(Boolean)
    .join(", and ");
