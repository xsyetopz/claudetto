import { describe, expect, test } from "claude-code/testing";

import { fetchPage } from "../fetch";
import { ARTICLE, CHALLENGE, fakeDeps, fakeWeb, html } from "./fixtures";

const PAGE = "https://news.test/post";

describe("TOOLS-020 captcha", () => {
	test("under -p a challenge replies with the URL and opens no window", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(CHALLENGE, 403) });
		const { deps, solves, notices } = fakeDeps(web.net, {
			render: () => CHALLENGE,
			interactive: false
		});

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(reply).toContain("captcha blocks");
		expect(reply).toContain(PAGE);
		expect(solves.length).toBe(0);
		expect(notices.length).toBe(0);
	});

	test("an interactive session is told, gets a window, and reads the page once solved", async () => {
		// Arrange
		let solved = false;
		const web = fakeWeb({ [PAGE]: html(CHALLENGE, 403) });
		const { deps, solves, notices } = fakeDeps(web.net, {
			interactive: true,
			solved: () => {
				solved = true;
			},
			render: () => (solved ? ARTICLE : CHALLENGE)
		});

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(solves).toEqual([PAGE]);
		expect(notices[0]).toContain("news.test");
		expect(notices[0]).toContain("3 minutes");
		expect(reply).toContain("(chrome)");
		expect(reply).toContain("## Features");
	});

	test("a captcha left unsolved is reported after the wait", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(CHALLENGE, 403) });
		const { deps, solves } = fakeDeps(web.net, {
			interactive: true,
			render: () => CHALLENGE
		});

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(solves.length).toBe(1);
		expect(reply).toContain("still unsolved");
	});
});
