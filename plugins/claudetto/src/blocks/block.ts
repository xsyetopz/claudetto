import type { ClassicEventName, EventName, PluginOptions } from "claude-code";

export type BlockKind =
	| "prompt"
	| "agent"
	| "command"
	| "tool-text"
	| "status-line"
	| "policy"
	| "session";

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

/** A handler the block registers through a closure, so it reads the options of its `BlockContext` and no shared store. */
export type WithOptions<Hook> = Hook extends (
	...args: infer Args
) => infer Result
	? (...args: [...Args, PluginOptions]) => Result
	: never;
