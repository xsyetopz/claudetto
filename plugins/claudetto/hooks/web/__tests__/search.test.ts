import { describe, expect, test } from "claude-code/testing";

import { searchWeb } from "../search";
import { DDG_BLOCKED, DDG_RESULTS, fakeDeps, fakeWeb, html } from "./fixtures";

const DDG = "https://html.duckduckgo.com/html/?q=bun%20runtime";

const searchDeps = (
	routes: Parameters<typeof fakeWeb>[0],
	options: Parameters<typeof fakeDeps>[1] = {},
	braveKey?: string
) => {
	const web = fakeWeb(routes);
	const fake = fakeDeps(web.net, options);
	return { ...fake, web, deps: { ...fake.deps, braveKey } };
};

describe("REQ-TOOLS-021 DuckDuckGo results", () => {
	test("replies with numbered title, destination and snippet lines and leaves the ad out", async () => {
		// Arrange
		const { deps } = searchDeps({ [DDG]: html(DDG_RESULTS) });

		// Act
		const reply = await searchWeb(deps, { query: "bun runtime" });

		// Assert
		expect(reply).toBe(
			"1. Bun — Fast JavaScript Runtime — https://bun.com/docs?a=1&b=2\n   Bun is an all-in-one toolkit & runtime.\n2. Bun (software) - Wikipedia — https://en.wikipedia.org/wiki/Bun_(software)\n   A JavaScript runtime, package manager and test runner."
		);
	});

	test("lists no result whose link is not http", async () => {
		// Arrange
		const page = DDG_RESULTS.replace(
			"//duckduckgo.com/l/?uddg=https%3A%2F%2Fbun.com%2Fdocs%3Fa%3D1%26b%3D2&amp;rut=abc",
			"//duckduckgo.com/l/?uddg=javascript%3Aalert(1)"
		);
		const { deps } = searchDeps({ [DDG]: html(page) });

		// Act
		const reply = await searchWeb(deps, { query: "bun runtime" });

		// Assert
		expect(reply).not.toContain("alert(1)");
		expect(reply).not.toContain("Fast JavaScript Runtime");
		expect(reply).toContain("Bun (software) - Wikipedia");
	});
});

describe("REQ-TOOLS-021 search flow", () => {
	test("answers from the DuckDuckGo page and honours max_results", async () => {
		// Arrange
		const { deps } = searchDeps({ [DDG]: html(DDG_RESULTS) });

		// Act
		const reply = await searchWeb(deps, {
			query: "bun runtime",
			max_results: 1
		});

		// Assert
		expect(reply.split("\n").length).toBe(2);
		expect(reply.startsWith("1. Bun")).toBe(true);
	});

	test("a blocked direct request falls back to the headless render of the same URL", async () => {
		// Arrange
		const { deps, renders } = searchDeps(
			{ [DDG]: html(DDG_BLOCKED, 202) },
			{ render: () => DDG_RESULTS }
		);

		// Act
		const reply = await searchWeb(deps, { query: "bun runtime" });

		// Assert
		expect(renders).toEqual([DDG]);
		expect(reply).toContain("https://bun.com/docs");
	});

	test("blocked everywhere under -p names the key that avoids it", async () => {
		// Arrange
		const { deps, solves } = searchDeps(
			{ [DDG]: html(DDG_BLOCKED, 202) },
			{ render: () => DDG_BLOCKED }
		);

		// Act
		const reply = await searchWeb(deps, { query: "bun runtime" });

		// Assert
		expect(reply).toContain("BRAVE_SEARCH_API_KEY");
		expect(solves.length).toBe(0);
	});

	test("blocked in an interactive session opens the window and reads the results after", async () => {
		// Arrange
		let solved = false;
		const { deps, solves } = searchDeps(
			{ [DDG]: html(DDG_BLOCKED, 202) },
			{
				interactive: true,
				solved: () => {
					solved = true;
				},
				render: () => (solved ? DDG_RESULTS : DDG_BLOCKED)
			}
		);

		// Act
		const reply = await searchWeb(deps, { query: "bun runtime" });

		// Assert
		expect(solves.length).toBe(1);
		expect(reply).toContain("https://bun.com/docs");
	});

	test("an empty query is refused", async () => {
		// Arrange
		const { deps } = searchDeps({});

		// Act / Assert
		expect(await searchWeb(deps, { query: "  " })).toBe("The query is empty.");
	});
});

describe("REQ-TOOLS-021 Brave API", () => {
	const brave =
		"https://api.search.brave.com/res/v1/web/search?q=bun%20runtime&count=8";
	const body = JSON.stringify({
		web: {
			results: [
				{
					title: "<strong>Bun</strong>",
					url: "https://bun.com",
					description: "A <strong>fast</strong> runtime"
				},
				{ title: "no url" }
			]
		}
	});

	test("a key sends the token to Brave and skips DuckDuckGo", async () => {
		// Arrange
		const { deps, web } = searchDeps(
			{ [brave]: { status: 200, headers: {}, text: body } },
			{},
			"KEY"
		);

		// Act
		const reply = await searchWeb(deps, { query: "bun runtime" });

		// Assert
		expect(reply).toBe("1. Bun — https://bun.com\n   A fast runtime");
		expect(web.seen.length).toBe(1);
		expect(web.seen[0]?.headers["x-subscription-token"]).toBe("KEY");
	});

	test("a Brave failure falls through to DuckDuckGo", async () => {
		// Arrange
		const { deps } = searchDeps(
			{
				[brave]: { status: 401, headers: {}, text: "{}" },
				[DDG]: html(DDG_RESULTS)
			},
			{},
			"BAD"
		);

		// Act
		const reply = await searchWeb(deps, { query: "bun runtime" });

		// Assert
		expect(reply).toContain("https://bun.com/docs");
	});

	test("a request that throws is named in the reply, not read as no results", async () => {
		// Arrange
		const { deps } = searchDeps({}, { noChrome: true }, "KEY");
		const failing = {
			...deps,
			net: () => Promise.reject(new Error("connect ECONNREFUSED"))
		};

		// Act
		const reply = await searchWeb(failing, { query: "bun runtime" });

		// Assert
		expect(reply).toContain(
			"Failed requests: Brave: connect ECONNREFUSED; DuckDuckGo: connect ECONNREFUSED."
		);
	});

	test("without a key no request reaches Brave", async () => {
		// Arrange
		const { deps, web } = searchDeps({ [DDG]: html(DDG_RESULTS) });

		// Act
		await searchWeb(deps, { query: "bun runtime" });

		// Assert
		expect(web.seen.every((s) => !s.url.includes("brave"))).toBe(true);
	});
});
