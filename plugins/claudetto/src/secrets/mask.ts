// What stands in the place of a secret, and how a hit turns into it. Both paths share this file,
// the table transcribed from the installed program and the rules of the Gitleaks config, so a
// handoff reads the same word either way.

/** What stands in the place of a secret. The program writes the same word. */
export const REDACTED = "[REDACTED]";

/**
 * `Fe`: the replacement for one hit. A hit with a secret inside it keeps everything around the
 * secret, because the rest is the boundary the pattern needed. A hit with none is replaced whole.
 * A value in quotes keeps its quotes.
 *
 * `secret` is the first capture group when the pattern has one, and the match offset when it has
 * none, which is why the type decides and not the count.
 */
export const mask = (match: string, secret: unknown): string => {
	if (typeof secret !== "string") {
		return REDACTED;
	}
	const quote =
		secret.length >= 2 &&
		(secret[0] === '"' || secret[0] === "'") &&
		secret.at(-1) === secret[0]
			? secret[0]
			: "";
	const at = match.lastIndexOf(secret);
	return `${match.slice(0, at)}${quote}${REDACTED}${quote}${match.slice(at + secret.length)}`;
};
