// Helpers for the tests of the ask on a weaker check.
// A call is a payload for `decideAsk`, and a file is a string in a stub file system.
// The tests give commands and edits as strings and run no command.

import type { Io } from "../../../plugins/claudetto/slices/asks/domain/check.ts";
import type { Payload } from "../../../plugins/claudetto/slices/asks/domain/text.ts";
import { filesByPath } from "./stub-fs.ts";
import { decideAsk } from "./verdicts.ts";

const CWD = "/w";

/** `true` when the call gets an ask. `files` maps an absolute path to the text that the file holds now. */
export const asks = async (
  payload: Payload,
  files: Record<string, string> = {},
  io: Partial<Io> = {},
): Promise<boolean> =>
  (await decideAsk(payload, {}, { ...filesByPath(files), ...io })) !==
  undefined;

/** An `Edit` call that replaces `old_string` with `new_string` in `file_path`. */
export const edit = (
  file_path: string,
  old_string: string,
  new_string: string,
): Payload => ({
  tool_name: "Edit",
  cwd: CWD,
  tool_input: { file_path, old_string, new_string },
});

/** A `Write` call that gives `content` to `file_path`. */
export const write = (file_path: string, content: string): Payload => ({
  tool_name: "Write",
  cwd: CWD,
  tool_input: { file_path, content },
});

/** A `Bash` call with `command`. */
export const bash = (command: string): Payload => ({
  tool_name: "Bash",
  cwd: CWD,
  tool_input: { command },
});

/** Whether `Edit` of `old` to `now` in `file`, which holds `text`, gets an ask. */
export const editAsks = (
  file: string,
  text: string,
  old: string,
  now: string,
): Promise<boolean> => asks(edit(file, old, now), { [file]: text });

/** Whether `Write` of `content` over `file`, which holds `text`, gets an ask. */
export const writeAsks = (
  file: string,
  text: string,
  content: string,
): Promise<boolean> => asks(write(file, content), { [file]: text });
