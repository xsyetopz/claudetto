import type { On, PluginOptions } from "claude-code";

import { registerCommit } from "./commit";
import { registerLimit } from "./limit";
import { registerMemory } from "./memory";
import { registerStdin } from "./stdin";

/** Registers every guard hook; the settings rules need none, because Claude Code enforces them. */
export const registerGuards = (on: On, options: PluginOptions = {}): void => {
	registerMemory(on, options);
	registerStdin(on);
	registerLimit(on, options);
	registerCommit(on);
};
