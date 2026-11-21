import { describe, expect, test } from "claude-code/testing";

import { cookieHeader, parseJar, parseSetCookie, remember } from "../cookies";
import { fetchPage } from "../fetch";
import { ARTICLE, fakeDeps, fakeWeb, html } from "./fixtures";

describe("REQ-TOOLS-020 cookie jar", () => {
	test("parses joined Set-Cookie values without splitting an Expires date", () => {
		// Arrange
		const header =
			"sid=abc; Path=/; Expires=Wed, 01 Jan 2031 00:00:00 GMT; HttpOnly, theme=dark; Path=/";

		// Act / Assert
		expect(parseSetCookie(header)).toEqual([
			["sid", "abc"],
			["theme", "dark"]
		]);
	});

	test("a cookie is sent back to its own host and never to another", () => {
		// Arrange
		const jar = remember({}, "a.test", "sid=abc");

		// Act / Assert
		expect(cookieHeader(jar, "a.test")).toBe("sid=abc");
		expect(cookieHeader(jar, "b.test")).toBeUndefined();
		expect(cookieHeader(jar, "sub.a.test")).toBeUndefined();
		expect(cookieHeader(jar, "__proto__")).toBeUndefined();
	});

	test("a cookie saved from one host's answer rides that host's next fetch only", async () => {
		// Arrange
		const web = fakeWeb({
			"https://a.test/": () => ({
				status: 200,
				headers: {
					"content-type": "text/html",
					"set-cookie": "sid=abc; Path=/"
				},
				text: ARTICLE
			}),
			"https://a.test/two": html(ARTICLE),
			"https://b.test/": html(ARTICLE)
		});
		const { deps } = fakeDeps(web.net);

		// Act
		await fetchPage(deps, { url: "https://a.test/" });
		await fetchPage(deps, { url: "https://a.test/two" });
		await fetchPage(deps, { url: "https://b.test/" });

		// Assert
		expect(web.seen[0]?.headers["cookie"]).toBeUndefined();
		expect(web.seen[1]?.headers["cookie"]).toBe("sid=abc");
		expect(web.seen[2]?.headers["cookie"]).toBeUndefined();
	});

	test("an empty value deletes the cookie", () => {
		// Arrange
		const jar = remember({}, "a.test", "sid=abc");

		// Act
		const next = remember(jar, "a.test", "sid=");

		// Assert
		expect(cookieHeader(next, "a.test")).toBeUndefined();
	});

	test("a stored jar keeps well-formed entries and drops the rest", () => {
		// Arrange / Act
		const jar = parseJar({ "a.test": { sid: "abc", bad: 1 }, "b.test": "x" });

		// Assert
		expect(jar).toEqual({ "a.test": { sid: "abc" } });
		expect(parseJar(null)).toEqual({});
	});
});
