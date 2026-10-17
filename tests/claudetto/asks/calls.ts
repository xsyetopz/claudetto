// Helpers for the tests of the ask on a weaker check.
// A call is a payload for `decideAsk`, and a file is a string in a stub file system.
// The tests give commands and edits as strings and run no command.

import type { Io } from "../../../plugins/claudetto/slices/asks/domain/check.ts";
import type {
  Complete,
  Reply,
} from "../../../plugins/claudetto/slices/asks/domain/testjudge.ts";
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

/** The answer of a stub judge that finds a weaker test. */
export const WEAKER_REPLY = {
  text: JSON.stringify({ weaker: true, line: "x", why: "It skips a test." }),
};

/** The ask reason of `payload` with a stub test judge that gives `reply`, and the prompts that the judge got. */
export const judgedCall = async (
  payload: Payload,
  files: Record<string, string>,
  reply: Reply = WEAKER_REPLY,
): Promise<{ reason: string | undefined; prompts: string[] }> => {
  const prompts: string[] = [];
  const complete: Complete = async (request) => {
    prompts.push(request.prompt);
    return reply;
  };
  const verdict = await decideAsk(
    payload,
    {},
    { ...filesByPath(files), complete },
  );
  return {
    reason: verdict?.hookSpecificOutput.permissionDecisionReason,
    prompts,
  };
};

/**
 * True when the call goes to the test judge, with the first line of `added` marked with `+`, and asks on the weaker verdict.
 * A later line, such as `});`, can match an old line, so the mark can be on that old line.
 */
const judged = async (
  payload: Payload,
  files: Record<string, string>,
  added: string,
): Promise<boolean> => {
  const { reason, prompts } = await judgedCall(payload, files);
  const first = added.split("\n").find((l) => l.trim() !== "");
  return (
    prompts.length === 1 &&
    (first === undefined || (prompts[0] as string).includes(`+ ${first}`)) &&
    reason?.includes("It skips a test.") === true
  );
};

/** Whether `Edit` of `old` to `now` in `file`, which holds `text`, goes to the test judge, which `judged` describes. */
export const editJudged = (
  file: string,
  text: string,
  old: string,
  now: string,
  added = "",
): Promise<boolean> => judged(edit(file, old, now), { [file]: text }, added);

/** Whether `Write` of `content` over `file`, which holds `text`, goes to the test judge, which `judged` describes. */
export const writeJudged = (
  file: string,
  text: string,
  content: string,
  added = "",
): Promise<boolean> => judged(write(file, content), { [file]: text }, added);
