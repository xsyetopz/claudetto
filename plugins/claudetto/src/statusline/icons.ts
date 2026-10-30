/** The glyphs of the line. Each is one column in every terminal: no East Asian ambiguous width, no emoji presentation, no private-use (Nerd Font) code point. */
export const ICON = {
	folder: "⌂",
	branch: "⎇",
	model: "❖",
	context: "◫",
	limit: "◷",
	reset: "↻",
	runout: "⏵",
	deficit: "⇡",
	reserve: "⇣",
	cache: "⌁",
	pr: "⇄",
	done: "✓",
	error: "✗",
	agent: "⏵",
	time: "◔",
} as const;

/** Three ASCII dots; the single `…` is East Asian ambiguous, so a CJK terminal draws it in two columns. */
export const ELLIPSIS = "...";
