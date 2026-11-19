import type { On, PluginOptions } from "claude-code";

import { registerMemory } from "./memory";
import { registerShell } from "./shell";
import { registerWall } from "./wall";

/** Registers every guard hook; the settings rules need none, because Claude Code enforces them. */
export const registerGuards = (on: On, options: PluginOptions = {}): void => {
	registerMemory(on, options);
	registerShell(on, options);
	registerWall(on, options);
};
