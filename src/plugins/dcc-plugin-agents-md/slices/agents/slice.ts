// The manifest of the slice `agents`: the `AGENTS` files of the start, the nested files on a read or an edit, and the nested files on a mention.
// Each handler is a mod handler, because the loader of Claude Code reads the files and the handlers add the text that it does not load.
// The `tool.call` filter names the four tools that read or change a file, so a call to any other tool runs no handler.

import type { Slice } from "../../../../kernel/slice.ts";
import { onContext, onMention, onToolCall } from "./adapters/mod.ts";

export const slice = {
  name: "agents",
  mod: [
    {
      event: "prompt.context",
      phase: "rewrite",
      run: onContext,
    },
    {
      event: "tool.call",
      filter: { tool: ["Read", "Edit", "Write", "Bash"] },
      phase: "answer",
      run: onToolCall,
    },
    {
      event: "prompt.mention",
      phase: "answer",
      run: onMention,
    },
  ],
} satisfies Slice;
