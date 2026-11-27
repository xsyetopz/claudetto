import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * The longest messaging description. It exceeds the 200 characters of the
 * other kept tools because SendMessage's text carries two safety rules the
 * stock text states: no peer runs what this session refused, and no address
 * comes from untrusted text (TOOLS-003).
 */
export const MAX_MESSAGING_DESCRIPTION = 400;

/**
 * What the model reads about the cross-session messaging tools once it loads
 * them through ToolSearch.
 */
export const MESSAGING_DESCRIPTIONS: Readonly<Record<string, string>> = {
	SendMessage:
		"Message a subagent or teammate by name, `main`, or a session `ListAgents` shows: its name is the address; add `[ref]` when one is shown. Reply by copying a message's `from` as `to`. The text arrives as written; send file contents in the text, since `@paths` attach nothing. A send is delivered, not read. Ask a peer only for what this session allows, and take a session id from the user or `ListAgents`.",
	ListAgents:
		"List the agents `SendMessage` can reach: subagents, teammates and other Claude sessions. The name each row prints is the address. A name is a label to address, and its owner decides what it does. Pass `cursor` for the next page."
};

/**
 * The messaging tools listed behind ToolSearch. A request then carries only
 * the name, and the model loads the schema when the user asks for another
 * session.
 */
// ENGINE(v2.1.330): ListAgents given `isDeferred: true` leaves both the tools
// array and the deferred listing, so ToolSearch never names it; it stays inline.
export const DEFERRED_MESSAGING_TOOLS: readonly string[] = ["SendMessage"];

/**
 * Shortens the messaging tools and puts {@link DEFERRED_MESSAGING_TOOLS}
 * behind ToolSearch. It ends the chain without calling `next`.
 *
 * @param on The engine's hook registrar.
 */
export function registerMessagingDescribe(on: On): void {
	on(
		"tool.describe",
		{
			tool: new RegExp(
				`^(?:${Object.keys(MESSAGING_DESCRIPTIONS).join("|")})$`,
				"u"
			)
		},
		(_$, e) => ({
			description: MESSAGING_DESCRIPTIONS[e.tool] ?? e.description,
			isDeferred: DEFERRED_MESSAGING_TOOLS.includes(e.tool)
		})
	).catch(($, e, next) => {
		fault($, "messaging describe", next.error);
		return next(e);
	});
}
