// The opt-in items of setup.
// An item here is off until the user says yes, because it widens what a hook can do and not because of an eval.
// `settings.mjs --with <name>` adds an item, like an eval-gated item (`gated.mjs`), but an eval arm never uses it.

/** The opt-in items. Each part is merged into the profile when its name is given. */
export const OPT_IN = {
  // The switch that `features/autofix/cli.mjs` reads. A hook command runs outside the `Bash` sandbox.
  autofix: { env: { DOTCLAUDE_AUTOFIX: "1" } },
};
