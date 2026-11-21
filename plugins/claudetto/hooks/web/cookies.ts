/** Cookies by exact host, then by name: a host never reads another host's entry. */
export type Jar = Record<string, Record<string, string>>;

/**
 * Reads the name and value of each cookie in a `Set-Cookie` header value. The
 * host's header map joins repeated headers with a comma, so a comma followed by
 * `name=` starts the next cookie while the comma inside `Expires=Wed, 01 ...`
 * does not.
 *
 * @param header The joined `set-cookie` value.
 */
export function parseSetCookie(header: string): [string, string][] {
	const out: [string, string][] = [];
	for (const part of header.split(/,(?=\s*[^\s;,=]+=)/u)) {
		const pair = part.split(";")[0] ?? "";
		const eq = pair.indexOf("=");
		const name = pair.slice(0, eq).trim();
		if (eq > 0 && name !== "") {
			out.push([name, pair.slice(eq + 1).trim()]);
		}
	}
	return out;
}

/**
 * Returns the jar with the cookies `header` sets under `host`. An empty value
 * deletes the cookie, as a server's expiry does.
 *
 * @param jar The jar so far.
 * @param host The exact host that answered; a `Domain=` attribute never widens it.
 * @param header The joined `set-cookie` value.
 */
export function remember(jar: Jar, host: string, header: string): Jar {
	const mine = new Map(Object.entries(jar[host] ?? {}));
	for (const [name, value] of parseSetCookie(header)) {
		if (value === "") {
			mine.delete(name);
		} else {
			mine.set(name, value);
		}
	}
	return { ...jar, [host]: Object.fromEntries(mine) };
}

/**
 * The `Cookie` request header for `host`, or undefined when it has none.
 *
 * @param jar The jar.
 * @param host The exact host being requested.
 */
export function cookieHeader(jar: Jar, host: string): string | undefined {
	const mine = Object.hasOwn(jar, host) ? jar[host] : undefined;
	const pairs = Object.entries(mine ?? {}).map(([k, v]) => `${k}=${v}`);
	return pairs.length > 0 ? pairs.join("; ") : undefined;
}

const isObject = (value: unknown): value is object =>
	typeof value === "object" && value !== null;

/**
 * Reads a stored jar back, keeping only well-formed entries: the store is
 * shared state, so its contents are checked before they ride a request.
 *
 * @param value What the store returned.
 */
export function parseJar(value: unknown): Jar {
	if (!isObject(value)) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(value).flatMap(([host, cookies]) =>
			isObject(cookies)
				? [
						[
							host,
							Object.fromEntries(
								Object.entries(cookies).filter(
									(pair): pair is [string, string] =>
										typeof pair[1] === "string"
								)
							)
						]
					]
				: []
		)
	);
}
