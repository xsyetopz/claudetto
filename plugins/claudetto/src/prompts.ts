// The `agent` setting is what makes `agents/main.md` replace the default system body.

export const PLUGIN_NAME = "claudetto";

/** The evals take their default prompt path from it, so they read the file the plugin ships. */
export const MAIN_AGENT_FILE = "agents/main.md";

export const MAIN_AGENT = `${PLUGIN_NAME}:main`;

export const STYLE_FILE = "output-styles/Concise.md";

export const STYLE = `${PLUGIN_NAME}:Concise`;
