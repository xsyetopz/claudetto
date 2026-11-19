import type { On, PluginOptions } from "claude-code";

import { registerDenial } from "./denial";
import { registerMemory } from "./memory";
import { registerRedact } from "./redact";
import { registerShell } from "./shell";
import { registerWall } from "./wall";

/** Registers every guard hook; the settings rules need none, because Claude Code enforces them (the denial hook only names their source). */
export const registerGuards = (on: On, options: PluginOptions = {}): void => {
	registerDenial(on);
	registerMemory(on, options);
	registerRedact(on);
	registerShell(on, options);
	registerWall(on, options);
};
