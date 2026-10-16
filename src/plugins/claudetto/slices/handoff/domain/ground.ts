// The ground check of the handoff (spec `handoff`, "Ground check of quoted values").
// The handoff prompt asks for each exact value in backticks, and before the handoff,
// the check looks for each value of `GROUND_VALUE_CHARS_MIN` characters or more in the messages of the session.
// Each value that is not there gets a warning in the handed message and one debug log line.
// With the warning, 5 of 5 runs read 1 line and gave the right value, and with no warning 0 of 10 did (`handoff-edge-300.md`).
// The parser pairs the backticks of one line in order, the first with the second, the third with the fourth.
// A backtick with no pair starts no value, so an odd count does not make a value of prose,
// and a short value such as `1` does not make the prose after it a value (`handoff-long-300/v3-150000/r1`).
// The check does not find a wrong fact in prose, or a value that is in the messages in another place.
// The functions are pure and import only `limits.ts`.

import type { SessionMessage } from "claude-code";
import { GROUND_VALUE_CHARS_MIN } from "../limits.ts";
import { GROUND_WARNING } from "../prompts.ts";

/** The values in backticks of `text`, each one time, from the pairs of backticks of each line. */
export const quotedValues = (text: string): string[] => {
  const values = text.split("\n").flatMap((line) => {
    const parts = line.split("`");
    // An odd part is in a pair when a backtick follows it, and the last part follows the last backtick.
    return parts.filter((_, i) => i % 2 === 1 && i < parts.length - 1);
  });
  return [...new Set(values.filter((v) => v.length >= GROUND_VALUE_CHARS_MIN))];
};

/** The values in backticks of `text` that are not in `messages`, as the messages are in JSON. */
export const missingValues = (
  text: string,
  messages: readonly SessionMessage[],
): string[] => {
  const corpus = JSON.stringify(messages);
  return quotedValues(text).filter(
    (v) => !corpus.includes(JSON.stringify(v).slice(1, -1)),
  );
};

/** The warning at the end of the handed message for the values `missing`, or an empty text when there is none. */
export const groundWarning = (missing: readonly string[]): string =>
  missing.length === 0
    ? ""
    : GROUND_WARNING({
        values: missing.map((v) => `\`${v}\``).join(", "),
      });

/** The debug log line of one value that is not in the messages. */
export const missLine = (value: string): string =>
  `ground check: \`${value}\` is not in the messages of the session`;
