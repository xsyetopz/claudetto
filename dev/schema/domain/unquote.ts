// Reads the text of a quoted string literal of the bundle, with its escapes.

const ESCAPES: Record<string, string> = {
	n: "\n",
	t: "\t",
	r: "\r",
	b: "\b",
	f: "\f",
	v: "\v",
	0: "\0",
};

export const unquote = (lit: string): string => {
	const body = lit.slice(1, -1);
	return body.replace(
		/\\(?:u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([\s\S]))/g,
		(
			_m: string,
			u: string | undefined,
			x: string | undefined,
			c: string | undefined,
		) => {
			const hex = u || x;
			if (hex) {
				return String.fromCharCode(Number.parseInt(hex, 16));
			}
			return ESCAPES[c ?? ""] ?? c ?? "";
		},
	);
};
