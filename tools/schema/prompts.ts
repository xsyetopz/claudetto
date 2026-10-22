export const FALLBACK_DESCRIPTIONS = {
  attribution:
    "Attribution text for git commits and pull request descriptions. An empty string hides attribution.",
  sandbox:
    "Settings for the sandbox that runs Bash commands: whether it is on, and its file and network rules.",
  spellcheck:
    "Spell checking of the prompt input: whether it is on, and which spell checker it uses.",
};

export const NO_SETTINGS_KEYS = (v: { version: string }): string =>
  `the settings schema of Claude Code ${v.version} has no keys`;

export const NO_TYPE_HELPERS = (v: { version: string }): string =>
  `the bundle of Claude Code ${v.version} has no definition of the type helpers of its settings schema`;

export const USAGE = `Usage: claudetto-schema --out DIR [--bundle FILE] [--version X.Y.Z]`;
