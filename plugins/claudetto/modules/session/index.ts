// The public surface of the module `session`: the usage state, the compaction option, and the bounds of the context and the usage bands.

export * from "./domain/compaction.ts";
export * from "./domain/usage.ts";
export {
  onPrompt as onHandoverOffer,
  onResume,
  onStop as onHandoverStop,
  onTurnComplete,
  onTurnStep,
} from "./handoff/adapters/mod.ts";
export { HANDOVER_RESUME } from "./handoff/prompts.ts";
export {
  onEdited,
  onGitView,
  onPrompt as onChangedFiles,
  onStart,
} from "./hygiene/adapters/mod.ts";
export * from "./limits.ts";
export {
  onAttachment,
  onBatch,
  onCompact,
  onContext,
  onMeasure,
  onPrompt as onUsageLine,
  onSubagentCall,
  onSubagentEnd,
  onSubagentFail,
  onToolDescribe,
} from "./prompt/adapters/mod.ts";
export { onOutputEnv } from "./prompt/adapters/output.ts";
export {
  GLOB_FIELD,
  GLOB_TOOL,
  GREP_TOOL,
  onCall as onSearchCall,
  onStart as onSearchStart,
} from "./search/index.ts";
