// The manifest of the `handoff` slice: the `session.compact` hook that replaces the summary of a compaction with a handoff (design D3).
// It runs for the triggers `auto` and `manual` of the main thread, and a fork writes the handoff from the cached prefix of the session.
// When there is nothing to fork, `$.model.complete` writes it from the text of the messages.
// The command `/handoff` is the manual handoff: on a terminal it clears the chat and submits the handoff, and in `-p` it compacts.
// Claude Code refuses these calls in a `command.run` hook, so a `$.clock.after` timer runs them after the hook.
// The phase is `answer`, because the hook gives the compaction in place of Claude Code.
// The `compaction` option `built-in` turns the handoff off, and Claude Code compacts as built in.

import {
  AUTOCOMPACT_PCT,
  CONTEXT_WINDOW,
  HAIKU_AUTOCOMPACT_WINDOW,
} from "../../../../kernel/budget.ts";
import {
  BUILT_IN_COMPACTION,
  COMPACTION_OPTION,
  HANDOFF_COMPACTION,
} from "../../../../kernel/compaction.ts";
import type { Handler, Slice } from "../../../../kernel/slice.ts";
import {
  HANDOFF_COMMAND,
  keepOptions,
  onCommand,
  onCompact,
  onPluginRegister,
  onSetup,
  onStart,
  SETUP_COMMAND,
} from "./adapters/mod.ts";
import { OPTION_DESCRIPTION } from "./prompts.ts";

const LAB = "plugins/claudetto/tests/compaction.test.ts";
const COMMAND_LAB = "plugins/claudetto/tests/command.test.ts";
const SETUP_LAB = "plugins/claudetto/tests/handoff-setup.test.ts";

export const slice = {
  name: "handoff",
  ladder: "mod: the `session.compact` hook",
  mod: [
    {
      event: "session.compact",
      // The tokens are the output of one fork: 335 to 663 in 14 forks of `handoff-repeat-300` and `handoff-edge-300/v3`.
      // The fork reads the conversation too, mostly from the cache.
      evals: {
        requests: 1,
        tokens: 700,
        blocks: false,
        eval: "handoff",
        allow: `${LAB} > a subagent compaction passes on with no change`,
        text: `${LAB} > an auto compaction gives one user message with the first user message and the handoff, and the tail`,
      },
      filter: { trigger: ["auto", "manual", "plugin"] },
      phase: "answer",
      run: onCompact as unknown as Handler<"session.compact">,
      configure: keepOptions,
    },
    {
      event: "session.start",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${COMMAND_LAB} > a refused name gives no error at session start`,
        text: `${COMMAND_LAB} > the session start registers the command \`handoff\``,
      },
      // The `setup` slice has the handler of `session.start` with no filter, and the mod runtime refuses two of them.
      filter: { isInteractive: [true, false] },
      phase: "observe",
      run: onStart,
      configure: keepOptions,
    },
    {
      event: "command.run",
      // The tokens are the output of one fork, as for the compaction.
      evals: {
        requests: 1,
        tokens: 700,
        blocks: false,
        eval: "handoff",
        allow: `${COMMAND_LAB} > another command runs unchanged`,
        text: `${COMMAND_LAB} > on a terminal, the command writes the handoff, clears the chat, and submits the handed message`,
      },
      filter: { command: HANDOFF_COMMAND },
      phase: "answer",
      run: onCommand,
    },
    {
      event: "command.run",
      filter: { command: SETUP_COMMAND },
      phase: "answer",
      run: onSetup,
    },
    {
      event: "plugin.register",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${SETUP_LAB} > a plugin with no \`session.compact\` hook is not named`,
        text: `${SETUP_LAB} > no file gives the new file, the warning with the other plugin, and one \`! sudo\` command`,
      },
      phase: "observe",
      run: onPluginRegister,
    },
  ],
  userConfig: {
    [COMPACTION_OPTION]: {
      type: "string",
      title: "Compaction",
      description: OPTION_DESCRIPTION,
      default: HANDOFF_COMPACTION,
      options: [HANDOFF_COMPACTION, BUILT_IN_COMPACTION],
    },
  },
  // The trigger of the auto compaction, and so of the handoff, for each model family (the handoff spec, "Trigger with a safety margin").
  settings: {
    env: { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: String(AUTOCOMPACT_PCT) },
    autoCompactWindow: CONTEXT_WINDOW,
    modelSettings: {
      "claude-haiku-5-5": { autoCompactWindow: HAIKU_AUTOCOMPACT_WINDOW },
    },
  },
} satisfies Slice;
