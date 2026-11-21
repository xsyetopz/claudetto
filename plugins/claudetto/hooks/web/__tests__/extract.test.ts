import { describe, expect, test } from "claude-code/testing";

import { isChallenge, needsRender } from "../detect";
import { extractPage } from "../markdown";
import { ARTICLE, CHALLENGE, RENDERED, SHELL } from "./fixtures";

const URL = "https://news.test/post";

describe("REQ-TOOLS-020 extraction", () => {
	test("drops nav, header, footer, aside, script and style", () => {
		// Arrange / Act
		const { markdown } = extractPage(ARTICLE, URL);

		// Assert
		for (const gone of [
			"NavOne",
			"SITE-BRAND",
			"FOOTER-TEXT",
			"ASIDE-HEADING",
			"NAVSCRIPT",
			"color:red"
		]) {
			expect(markdown).not.toContain(gone);
		}
		expect(markdown).toContain("Bun is a fast JavaScript runtime");
	});

	test("converts headings, lists, code, tables and quotes to Markdown", () => {
		// Arrange / Act
		const { markdown, title } = extractPage(ARTICLE, URL);

		// Assert
		expect(title).toBe("Bun & the runtime");
		expect(markdown.startsWith("# Bun & the runtime")).toBe(true);
		expect(markdown).toContain("## Features");
		expect(markdown).toContain("- Fast **startup**");
		expect(markdown).toContain("  - Jest compatible");
		expect(markdown).toContain("1. Install");
		expect(markdown).toContain(
			"```ts\nconst x: number = 1;\nconsole.log(x);\n```"
		);
		expect(markdown).toContain(
			"| Name | Speed |\n| --- | --- |\n| bun | fast |"
		);
		expect(markdown).toContain("> Quoted words.");
	});

	test("resolves links and links a repeated destination once", () => {
		// Arrange / Act
		const { markdown } = extractPage(ARTICLE, URL);

		// Assert
		expect(markdown).toContain(
			"[install guide](https://news.test/docs/install)"
		);
		expect(markdown.split("](https://news.test/docs/install)").length - 1).toBe(
			1
		);
		expect(markdown).toContain("[more](https://example.org/more)");
	});

	test("keeps a long run of bare links out as a menu when no nav tag marks it", () => {
		// Arrange
		const items = Array.from(
			{ length: 8 },
			(_, i) => `<li><a href="/p${i}">Page ${i}</a></li>`
		).join("");
		const page = `<body><div><p>${"Real prose that should stay in the output. ".repeat(10)}</p><ul>${items}</ul></div></body>`;

		// Act
		const { markdown } = extractPage(page, URL);

		// Assert
		expect(markdown).toContain("Real prose");
		expect(markdown).not.toContain("Page 3");
	});

	test("picks the densest block when the page has no article or main", () => {
		// Arrange
		const page = `<body><div id="side"><p>short</p></div><div id="content"><p>${"Dense body text goes here. ".repeat(30)}</p></div></body>`;

		// Act
		const { markdown } = extractPage(page, URL);

		// Assert
		expect(markdown).toContain("Dense body text");
		expect(markdown).not.toContain("short");
	});
});

describe("REQ-TOOLS-020 detection", () => {
	test("a script-only shell needs a render and the rendered DOM does not", () => {
		// Arrange
		const shell = extractPage(SHELL, URL).markdown;
		const rendered = extractPage(RENDERED, URL).markdown;

		// Act / Assert
		expect(needsRender(SHELL, shell.length)).toBe(true);
		expect(needsRender(RENDERED, rendered.length)).toBe(false);
		expect(rendered).toContain("Rendered by script");
	});

	test("a Cloudflare interstitial is a challenge", () => {
		// Arrange
		const { markdown } = extractPage(CHALLENGE, URL);

		// Act / Assert
		expect(isChallenge(CHALLENGE, markdown.length)).toBe(true);
	});

	test("a long article that mentions captcha is content", () => {
		// Arrange
		const page = `<article><p>${"We discuss what a captcha is and why sites use one. ".repeat(60)}</p></article>`;
		const { markdown } = extractPage(page, URL);

		// Act / Assert
		expect(isChallenge(page, markdown.length)).toBe(false);
	});

	test("hCaptcha and reCAPTCHA markers count at any length", () => {
		// Arrange / Act / Assert
		expect(isChallenge('<div class="g-recaptcha"></div>', 5000)).toBe(true);
		expect(
			isChallenge(
				'<iframe src="https://newassets.hcaptcha.com/x"></iframe>',
				5000
			)
		).toBe(true);
	});
});
