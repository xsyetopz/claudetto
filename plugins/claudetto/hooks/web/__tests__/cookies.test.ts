import { describe, expect, test } from "claude-code/testing";

import { fetchPage } from "../fetch";
import { ARTICLE, fakeDeps, fakeWeb, html } from "./fixtures";

const cookie = (value: string) => () => ({
	status: 200,
	headers: { "content-type": "text/html", "set-cookie": value },
	text: ARTICLE
});

describe("TOOLS-020 cookie jar", () => {
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

	test("a Set-Cookie answer that joins cookies keeps an Expires date whole", async () => {
		// Arrange
		const web = fakeWeb({
			"https://a.test/": () => ({
				status: 200,
				headers: {
					"content-type": "text/html",
					"set-cookie":
						"sid=abc; Path=/; Expires=Wed, 01 Jan 2031 00:00:00 GMT; HttpOnly, theme=dark; Path=/"
				},
				text: ARTICLE
			}),
			"https://a.test/two": html(ARTICLE)
		});
		const { deps } = fakeDeps(web.net);

		// Act
		await fetchPage(deps, { url: "https://a.test/" });
		await fetchPage(deps, { url: "https://a.test/two" });

		// Assert
		expect(web.seen[1]?.headers["cookie"]).toBe("sid=abc; theme=dark");
	});

	test("an answer that sets a cookie empty stops it being sent", async () => {
		// Arrange
		const web = fakeWeb({
			"https://a.test/": cookie("sid=abc"),
			"https://a.test/two": cookie("sid="),
			"https://a.test/three": html(ARTICLE)
		});
		const { deps } = fakeDeps(web.net);

		// Act
		await fetchPage(deps, { url: "https://a.test/" });
		await fetchPage(deps, { url: "https://a.test/two" });
		await fetchPage(deps, { url: "https://a.test/three" });

		// Assert
		expect(web.seen[1]?.headers["cookie"]).toBe("sid=abc");
		expect(web.seen[2]?.headers["cookie"]).toBeUndefined();
	});
});
