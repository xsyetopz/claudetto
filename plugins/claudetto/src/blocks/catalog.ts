import type { On, PluginOptions } from "claude-code";
import { agentOffer, attachAgentOffer } from "./agent-offer/block.ts";
import type { Block, BlockContext } from "./block.ts";
import { attachCompaction, compaction } from "./compaction/block.ts";
import { attachContext7, context7 } from "./context7/block.ts";
import { attachDecide, decide } from "./decide/block.ts";
import { attachFinish, finish } from "./finish/block.ts";
import { attachGate, gateBlock } from "./gate/block.ts";
import { attachHandoff, handoff } from "./handoff/block.ts";
import { attachHygiene, hygiene } from "./hygiene/block.ts";
import { attachInitInterview, initInterview } from "./init-interview/block.ts";
import { attachRunLimits, runLimits } from "./run-limits/block.ts";
import { attachSetupCommand, setupCommand } from "./setup-command/block.ts";
import { attachToolDescribe, toolDescribe } from "./tool-describe/block.ts";
import { attachVersionFloor, versionFloor } from "./version-floor/block.ts";
import { attachWindow, windowBlock } from "./window/block.ts";

/** One row per block, in the order `attachBlocks` calls them, which is the hook chain order. */
export const CATALOG: readonly Block[] = [
	setupCommand,
	initInterview,
	decide,
	toolDescribe,
	agentOffer,
	handoff,
	gateBlock,
	runLimits,
	windowBlock,
	compaction,
	versionFloor,
	hygiene,
	finish,
	context7,
];

/** The hook loader takes `on` only into a function named at the top of a file, so each block is called by its own name. */
export const attachBlocks = (on: On, options: PluginOptions): void => {
	const context: BlockContext = { options };
	attachSetupCommand(on, context);
	attachInitInterview(on, context);
	attachDecide(on, context);
	attachToolDescribe(on, context);
	attachAgentOffer(on, context);
	attachHandoff(on, context);
	attachGate(on, context);
	attachRunLimits(on, context);
	attachWindow(on, context);
	attachCompaction(on, context);
	attachVersionFloor(on, context);
	attachHygiene(on, context);
	attachFinish(on, context);
	attachContext7(on, context);
};
