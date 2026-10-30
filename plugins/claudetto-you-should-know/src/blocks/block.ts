import type { ClassicEventName, EventName, PluginOptions } from "claude-code";

export type BlockKind = "prompt" | "screen" | "session";

/** Typed by the host's own event list, so a route the Mod API does not declare fails the type check. */
export type Route = EventName | ClassicEventName;

export interface BlockContext {
	readonly options: PluginOptions;
}

export interface Block {
	readonly id: string;
	readonly kind: BlockKind;
	readonly routes: readonly Route[];
	/** The lowest Claude Code version whose routes the block's lab cases pin. */
	readonly needs: string;
}
