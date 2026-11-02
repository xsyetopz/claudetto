import type { Install } from "./install.ts";
import type { OptionalTool } from "./tools.ts";

export const RELEASES_PAGE = "https://github.com/ast-grep/ast-grep/releases";

/** What `$.store` holds for a tool whose notice was shown or whose install was declined: the pinned version. */
export const noticeKey = (tool: OptionalTool): string =>
	`optional-tool:${tool.id}`;

/** A notice stays quiet while the stored version is the pinned one, so a changed pin shows it again. */
export const isQuiet = (stored: unknown, tool: OptionalTool): boolean =>
	stored === tool.version;

export const noticeLine = (tool: OptionalTool, install: Install): string => {
	const how =
		install.kind === "none"
			? `Releases are at ${RELEASES_PAGE}.`
			: `Install: ${install.kind === "command" ? `\`${install.shown}\`` : install.shown}.`;
	return `\`${tool.id}\` is not on your PATH, and it gives a precise structural search. ${how} \`/claudetto:setup\` can do it.`;
};
