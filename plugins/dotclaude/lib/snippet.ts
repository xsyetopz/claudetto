// The settings snippet of dotclaude, in the format of Claude Code settings.
// `setup` merges it into a settings file, and the drift check compares the active settings with it.
// Both constants come from `src/shared/snippet.json` and `src/shared/docs-snippet.json` through `just generate`, as the JSON blocks of `wiki/settings/Settings-Snippet.md` do.
// This file is in the import graph of the hooks module, so it imports only the generated `snippets.ts`, which imports nothing.

import { DOCS_SNIPPET, SNIPPET as WIKI_SNIPPET } from "./snippets.ts";

/** The text in the snippet that setup replaces with the plugin folder. */
export const PLUGIN_FOLDER = "<plugin folder>";

/** The model of the snippet that an account with Mythos access can replace. */
export const FABLE = "claude-fable-5-1";
/** The model that takes the place of `FABLE` when the account has it. */
export const MYTHOS = "claude-mythos-5-1";

/** The snippet, with no `$schema`, because that key names the schema of the wiki block and is not a setting to merge. */
const { $schema: _schema, ...snippet } = WIKI_SNIPPET;
export const SNIPPET = snippet;

/** The lines for the `dotclaude-docs` add-on. */
export { DOCS_SNIPPET };
