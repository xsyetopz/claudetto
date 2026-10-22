export const MODEL_NOT_ALLOWED = (v: {
  model: string;
  allowed: string;
}): string =>
  `--model ${v.model} is not in availableModels of the sandbox (${v.allowed}), so Claude Code runs another model.`;

export const NO_PLUGIN_LOADED = `No plugin loaded, so the check proves nothing. Pass \`--plugin-dir DIR\` for each plugin folder.`;

export const NO_UNKNOWN_FIELD = `No unknown frontmatter field.`;

export const NOTHING_TO_REMOVE = (v: { root: string }): string =>
  `Nothing to remove: ${v.root} does not exist.`;

export const REFUSE_FOREIGN = (v: { root: string; foreign: string }): string =>
  `Refusing to remove ${v.root}: it holds ${v.foreign}, which is not the sandbox layout. Use the default sandbox folder, or remove this folder by hand.`;

export const REFUSE_NO_MARKER = (v: { root: string; marker: string }): string =>
  `Refusing to remove ${v.root}: the sandbox did not make this folder, because it has no ${v.marker} file. Remove this folder by hand when it has no further use.`;

export const REFUSE_SYMLINK = (v: { root: string }): string =>
  `Refusing to remove ${v.root}: it is a symbolic link. Remove the link by hand, or pass the folder itself.`;

export const UNKNOWN_FIELD_COUNT = (v: { count: string }): string =>
  `${v.count} lines name an unknown field.`;

export const USAGE = `Usage: claudetto-sandbox [--dir DIR] [--check-frontmatter] [--plugin-dir DIR]... [claude arguments...]
       claudetto-sandbox [--dir DIR] --clean`;
