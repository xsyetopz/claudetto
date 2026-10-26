// The public surface of the module `work`: the notes.

export * from "./domain/notes.ts";
export {
  onBoxCall,
  onCommand,
  onStop as onGoalStop,
} from "./finish/adapters/mod.ts";
export { onPlanCall } from "./ground/adapters/mod.ts";
export {
  onBand,
  onCheck,
  onFail,
  onMessage,
  onPass,
  onPrompt as onNotePrompt,
  onStep,
  onStop as onBackgroundStop,
  onTurnComplete,
} from "./notes/adapters/mod.ts";
export { onDiffEnv, onSave, onUndo } from "./protect/index.ts";
