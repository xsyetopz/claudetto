// The always-loaded prompt pieces of the tree and the setting that puts each one in force (spec
// `prompt-footprint`).
//
// An agent file used as the main thread replaces the default system body instead of adding to it, so
// the `agent` setting is what makes `agents/main.md` do anything at all. Setup writes the
// same value into the user's settings file, and the capture of `tools/capture/run.ts` writes it into
// throwaway settings of the shipped arm, so one constant serves both.

/** The plugin name of the tree, as the harness namespaces an agent, a skill, and a command. */
export const PLUGIN_NAME = "claudetto";

/** The file of the main agent, relative to the plugin folder. The evals take their default prompt path from it, so they read the file the plugin ships. */
export const MAIN_AGENT_FILE = "agents/main.md";

/** The value of the `agent` setting: the main agent of this plugin. */
export const MAIN_AGENT = `${PLUGIN_NAME}:main`;

/** The file of the output style, relative to the plugin folder. */
export const STYLE_FILE = "output-styles/Concise.md";

/** The value of the `outputStyle` setting: the style of this plugin. */
export const STYLE = `${PLUGIN_NAME}:Concise`;
