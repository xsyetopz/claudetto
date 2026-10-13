// The manifest of the slice `agents`: the `AGENTS` files of the start, the nested files on a read or an edit, and the nested files on a mention.
// A compaction ends the dedupe of the nested files, because the compaction removes them from the transcript.
// Each handler is a mod handler, because the loader of Claude Code reads the files and the handlers add the text that it does not load.
// The `tool.call` filter names the four tools that read or change a file, so a call to any other tool runs no handler.

import type { Slice } from "../../../../kernel/slice.ts";
import { onCompact, onContext, onMention, onToolCall } from "./adapters/mod.ts";

const LAB = "plugins/dcc-plugin-agents-md/tests/agents.test.ts";

export const slice = {
  name: "agents",
  mod: [
    {
      event: "prompt.context",
      phase: "rewrite",
      run: onContext,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a file that the engine loaded keeps its place and is not loaded again`,
        text: `${LAB} > the user file, the project and \`.claude/\` files, and \`AGENTS.local.md\` load with their tiers`,
      },
    },
    {
      event: "tool.call",
      filter: { tool: ["Read", "Edit", "Write", "Bash"] },
      phase: "answer",
      run: onToolCall,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a \`Bash\` command that reads no file loads no nested file`,
        text: `${LAB} > a nested file loads on a \`Read\` of a file in its folder, once`,
      },
    },
    {
      event: "prompt.mention",
      phase: "answer",
      run: onMention,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a mention of a file in a folder with no \`AGENTS\` file adds no context`,
        text: `${LAB} > a nested file loads on a mention of a file in its folder`,
      },
    },
    {
      event: "session.compact",
      phase: "answer",
      run: onCompact,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a compaction that a hook skips keeps the dedupe of the nested files`,
        text: `${LAB} > a nested file loads again after a compaction`,
      },
    },
  ],
} satisfies Slice;
