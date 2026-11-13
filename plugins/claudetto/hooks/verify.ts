import type { SessionMessage } from "claude-code";

// Tool results and injected text come back as user messages; only the person's own words count.
export const isPersonMessage = (m: SessionMessage): boolean =>
	m.role === "user" &&
	m.text !== "" &&
	(m.toolResults?.length ?? 0) === 0 &&
	!m.text.startsWith("<");
