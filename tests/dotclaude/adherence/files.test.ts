// The `adherence` ask (design D34): a read that throws reaches the caller.
// Files are strings.

import { expect, test } from "bun:test";
import type { Io } from "../../../plugins/dotclaude/features/adherence/rules.ts";
import type {
  Payload,
  ToolInput,
} from "../../../plugins/dotclaude/features/adherence/text.ts";
import { decideAsk as decide } from "../../support/verdicts.ts";
import { filesByPath } from "./stub-fs.ts";

const CWD = "/w";
/** The `io` of a test: `files` maps a path to its text. */
const io = (files: Record<string, string> = {}, extra: Partial<Io> = {}) => ({
  ...filesByPath(files),
  ...extra,
});
const call = (
  tool_name: string,
  tool_input: ToolInput,
  extra: Partial<Payload> = {},
) => ({
  tool_name,
  cwd: CWD,
  ...extra,
  tool_input,
});
test("a read that throws reaches `runHook`, which fails open and reports it", async () => {
  const boom = io(
    {},
    {
      read: () => {
        throw new Error("read");
      },
    },
  );
  const w = call("Write", {
    file_path: "/w/tests/a.test.mjs",
    content: "see max_lines",
  });
  await expect(decide(w, {}, boom)).rejects.toThrow(/read/);
});
