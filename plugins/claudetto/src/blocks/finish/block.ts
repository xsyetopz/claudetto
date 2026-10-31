import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { onFinishStop } from "./hooks.ts";

export const finish: Block = {
	id: "finish",
	kind: "policy",
	routes: ["classic.Stop", "session.messages"],
	needs: "2.1.314",
};

export const attachFinish = (on: On, _context: BlockContext): void => {
	// `run-limits` holds the bare `classic.Stop` registration, and a repeat throws, so this one matches every stop by its name.
	on("classic.Stop", { hook_event_name: "Stop" }, onFinishStop);
};
