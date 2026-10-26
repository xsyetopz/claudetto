// The verdicts on the built-in parts, written by hand in the tables of `verdicts/`.
// The key is `group:name`, as the tables of `wiki/reference/Builtins*.md` show them.
// A part with no entry has the verdict `todo`, and `bun dev/builtins.ts --strict` fails until none is left.
//   replace: claudetto replaces it with a better part.
//   off:     claudetto cannot replace it, it is not needed, so claudetto turns it off.
//   keep:    it stays as it is, and the reason names the need or the lever that is missing.
// `bytes` is the context that an `off` verdict saves or a `replace` verdict adds.

import attachments from "./verdicts/attachments.ts";
import commands from "./verdicts/commands.ts";
import others from "./verdicts/others.ts";
import tools from "./verdicts/tools.ts";

export type Verdict = {
  verdict: "replace" | "off" | "keep";
  reason: string;
  bytes?: number;
};

const KINDS = new Set(["replace", "off", "keep"]);

/** The rows of one table: `group:name`, verdict, bytes or `-`, reason, with a tab between. */
export const parse = (table: string): Record<string, Verdict> => {
  const out: Record<string, Verdict> = {};
  for (const line of table.split("\n").filter(Boolean)) {
    const [key = "", verdict = "", bytes = "-", reason = ""] = line.split("\t");
    if (!KINDS.has(verdict) || !reason || key in out)
      throw new Error(`Bad verdict row: ${line}`);
    out[key] = {
      verdict: verdict as Verdict["verdict"],
      reason,
      ...(bytes === "-" ? {} : { bytes: Number(bytes) }),
    };
  }
  return out;
};

export const VERDICTS: Record<string, Verdict> = parse(
  [attachments, commands, others, tools].join("\n"),
);
