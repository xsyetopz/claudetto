export const turn = (role: string, content: unknown): string =>
	JSON.stringify({ type: role, message: { role, content } });

export const said = (role: string, text: string): string =>
	turn(role, [{ type: "text", text }]);

/** A tail begins inside a line, so every fixture carries a broken first line. */
export const tailOf = (...lines: readonly string[]): string =>
	[`e":"text"}]}}`, ...lines].join("\n");
