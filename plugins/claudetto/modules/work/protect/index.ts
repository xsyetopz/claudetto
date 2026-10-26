// The public surface of the slice `protect`: the hooks that undo a `Bash` change of a protected file.

export { onDiffEnv, onSave, onUndo } from "./adapters/mod.ts";
