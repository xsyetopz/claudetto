// The transform of each built-in section of Claude Code 2.1.301, keyed by the section id, and each file here holds one transform.
// The bundle names each id in `jp(...)` or in the section list near strings.txt:24466335.
// The `context_management` section has no entry, because its text depends on the compaction state (`domain/compaction.ts`).

import * as actionCaution from "./action_caution.ts";
import * as actions from "./actions.ts";
import * as communication from "./communication.ts";
import * as doingTasks from "./doing_tasks.ts";
import * as envInfoSimple from "./env_info_simple.ts";
import * as intro from "./intro.ts";
import * as leanBody from "./lean_body.ts";
import * as memory from "./memory.ts";
import type { Part, Transform } from "./parts.ts";
import * as pronouns from "./pronouns.ts";
import * as sessionGuidance from "./session_guidance.ts";
import * as system from "./system.ts";
import * as tone from "./tone.ts";
import * as tools from "./tools.ts";
import * as totalTokens from "./total_tokens.ts";

/** The transform of each section id. A section with no id here passes on unchanged. */
export const TRANSFORMS: ReadonlyMap<string, Transform> = new Map<
  string,
  Transform
>([
  ["action_caution", actionCaution.transform],
  ["actions", actions.transform],
  ["communication", communication.transform],
  ["doing_tasks", doingTasks.transform],
  ["env_info_simple", envInfoSimple.transform],
  ["intro", intro.transform],
  ["lean_body", leanBody.transform],
  ["memory", memory.transform],
  ["pronouns", pronouns.transform],
  ["session_guidance", sessionGuidance.transform],
  ["system", system.transform],
  ["tone", tone.transform],
  ["tools", tools.transform],
  ["total_tokens", totalTokens.transform],
]);

/** The parts of each section id, so that the adapter can name an anchor that finds nothing. */
export const PARTS_OF: ReadonlyMap<string, readonly Part[]> = new Map<
  string,
  readonly Part[]
>([
  ["action_caution", actionCaution.PARTS],
  ["actions", actions.PARTS],
  ["communication", communication.PARTS],
  ["doing_tasks", doingTasks.PARTS],
  ["env_info_simple", envInfoSimple.PARTS],
  ["intro", intro.PARTS],
  ["lean_body", leanBody.PARTS],
  ["memory", memory.PARTS],
  ["pronouns", pronouns.PARTS],
  ["session_guidance", sessionGuidance.PARTS],
  ["system", system.PARTS],
  ["tone", tone.PARTS],
  ["tools", tools.PARTS],
  ["total_tokens", totalTokens.PARTS],
]);

/** The ids of the sections whose transform reads the compaction state. */
export const STATE_SECTIONS: ReadonlySet<string> = new Set(["system"]);
