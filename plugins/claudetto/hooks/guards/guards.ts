import type { On, PluginOptions } from "claude-code";

import { registerDenial } from "./denial";
import { registerGhTarget } from "./gh-target";
import { registerInplace } from "./inplace";
import { registerMemory } from "./memory";
import { registerPromptSecrets } from "./redact/prompt";
import { registerRedact } from "./redact/redact";
import { registerNotes } from "./shell/notes";
import { registerShell } from "./shell/shell";
import { registerWall } from "./wall/wall";

/** Registers every guard hook; the settings rules need none, because Claude Code enforces them (the denial hook only names their source). */
export const registerGuards = (on: On, options: PluginOptions = {}): void => {
	registerDenial(on);
	registerMemory(on, options);
	registerRedact(on);
	registerPromptSecrets(on);
	// Before the shell guard: a hook registered earlier sees the command as the model wrote it.
	registerNotes(on);
	registerInplace(on);
	registerShell(on, options);
	registerGhTarget(on);
	registerWall(on, options);
};
