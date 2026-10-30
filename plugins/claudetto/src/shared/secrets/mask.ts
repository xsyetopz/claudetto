export const REDACTED = "[REDACTED]";

/** `secret` is the first capture group when the pattern has one, else the match offset. */
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
