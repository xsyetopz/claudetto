import { describe, expect, test } from "claude-code/testing";

import { fetchPage, savedPath } from "../fetch";
import { ARTICLE, fakeDeps, fakeWeb, html, RENDERED, SHELL } from "./fixtures";

const PAGE = "https://news.test/post";

describe("REQ-TOOLS-020 direct path", () => {
	test("returns the main content with a browser User-Agent", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(ARTICLE) });
		const { deps, renders } = fakeDeps(web.net);

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(reply).toContain("(direct)");
		expect(reply).toContain("## Features");
		expect(reply).not.toContain("NavOne");
		expect(web.seen[0]?.headers["user-agent"]).toContain("Chrome/");
		expect(renders.length).toBe(0);
	});

	test("a failed save is named, and the reply points no Read at the missing copy", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(ARTICLE) });
		const { deps } = fakeDeps(web.net);
		const failing = {
			...deps,
			writeFile: () => Promise.reject(new Error("EACCES"))
		};

		// Act
		const reply = await fetchPage(failing, { url: PAGE, max_chars: 10 });

		// Assert
		expect(reply).toContain("The Markdown copy could not be saved: EACCES.");
		expect(reply).not.toContain("Read /data/web");
	});

	test("passes JSON and plain text through unchanged", async () => {
		// Arrange
		const web = fakeWeb({
			"https://api.test/x.json": {
				status: 200,
				headers: { "content-type": "application/json" },
				text: '{"a":1}'
			},
			"https://api.test/x.txt": {
				status: 200,
				headers: { "content-type": "text/plain" },
				text: "plain <b>text</b>"
			}
		});
		const { deps } = fakeDeps(web.net);

		// Act
		const json = await fetchPage(deps, { url: "https://api.test/x.json" });
		const text = await fetchPage(deps, { url: "https://api.test/x.txt" });

		// Assert
		expect(json.endsWith('---\n{"a":1}')).toBe(true);
		expect(text.endsWith("---\nplain <b>text</b>")).toBe(true);
	});

	test("refuses a binary content type and a non-http URL", async () => {
		// Arrange
		const web = fakeWeb({
			"https://api.test/a.png": {
				status: 200,
				headers: { "content-type": "image/png" },
				text: "\u0000PNG"
			}
		});
		const { deps } = fakeDeps(web.net);

		// Act / Assert
		expect(await fetchPage(deps, { url: "https://api.test/a.png" })).toContain(
			"Unsupported content type"
		);
		expect(await fetchPage(deps, { url: "file:///etc/passwd" })).toContain(
			"Only http and https"
		);
		expect(await fetchPage(deps, { url: "nope" })).toContain("Not a URL");
	});

	test("a 404 is the page's answer and does not start a browser", async () => {
		// Arrange
		const web = fakeWeb({});
		const { deps, renders } = fakeDeps(web.net);

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(reply).toBe(`HTTP 404 from ${PAGE}`);
		expect(renders.length).toBe(0);
	});
});

describe("REQ-TOOLS-020 size cap, saved copy and paging", () => {
	const long = `<article><h1>Long</h1>${Array.from({ length: 60 }, (_, i) => `<p>Paragraph ${i} ${"word ".repeat(20)}</p>`).join("")}</article>`;

	test("caps the reply, saves the full Markdown and names the path and next offset", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(long) });
		const { deps, files } = fakeDeps(web.net);
		const path = savedPath("/data/web", PAGE);

		// Act
		const reply = await fetchPage(deps, { url: PAGE, max_chars: 1000 });

		// Assert
		const full = files.get(path) ?? "";
		expect(full.length).toBeGreaterThan(3000);
		expect(reply).toContain(`Full Markdown saved: ${path}`);
		expect(reply).toContain(`chars 0-1000 of ${full.length}`);
		expect(reply).toContain("offset=1000");
		expect(reply.split("\n---\n")[1]).toBe(full.slice(0, 1000));
	});

	test("an offset pages through the saved copy without a second request", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(long) });
		const { deps, files } = fakeDeps(web.net);
		await fetchPage(deps, { url: PAGE, max_chars: 1000 });
		const full = files.get(savedPath("/data/web", PAGE)) ?? "";

		// Act
		const next = await fetchPage(deps, {
			url: PAGE,
			max_chars: 1000,
			offset: 1000
		});

		// Assert
		expect(web.seen.length).toBe(1);
		expect(next).toContain("(saved copy)");
		expect(next.split("\n---\n")[1]).toBe(full.slice(1000, 2000));
	});

	test("the last window has no continuation hint and an offset past the end says so", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(long) });
		const { deps, files } = fakeDeps(web.net);
		await fetchPage(deps, { url: PAGE });
		const total = (files.get(savedPath("/data/web", PAGE)) ?? "").length;

		// Act
		const last = await fetchPage(deps, {
			url: PAGE,
			max_chars: 100_000,
			offset: total - 50
		});
		const past = await fetchPage(deps, { url: PAGE, offset: total + 10 });

		// Assert
		expect(last).not.toContain("More:");
		expect(past).toContain("past the end");
	});
});

describe("REQ-TOOLS-020 headless fallback", () => {
	test("a 403 falls back to the Chrome render", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html("Forbidden", 403) });
		const { deps, renders } = fakeDeps(web.net, { render: () => ARTICLE });

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(renders).toEqual([PAGE]);
		expect(reply).toContain("(chrome)");
		expect(reply).toContain("## Features");
	});

	test("429, 503 and a failed request fall back too", async () => {
		// Arrange
		const web = fakeWeb({
			"https://a.test/": html("slow down", 429),
			"https://b.test/": html("down", 503)
		});
		const { deps, renders } = fakeDeps(
			(url, headers) =>
				url === "https://c.test/"
					? Promise.reject(new Error("reset"))
					: web.net(url, headers),
			{ render: () => ARTICLE }
		);

		// Act
		const replies = [
			await fetchPage(deps, { url: "https://a.test/" }),
			await fetchPage(deps, { url: "https://b.test/" }),
			await fetchPage(deps, { url: "https://c.test/" })
		];

		// Assert
		expect(renders.length).toBe(3);
		expect(replies.every((r) => r.includes("(chrome)"))).toBe(true);
	});

	test("a JS-only shell falls back and the rendered DOM is extracted", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(SHELL) });
		const { deps, renders } = fakeDeps(web.net, { render: () => RENDERED });

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(renders.length).toBe(1);
		expect(reply).toContain("Rendered by script");
	});

	test("no Chrome on the machine names the cause and CHROME_PATH", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html(SHELL) });
		const { deps } = fakeDeps(web.net, { noChrome: true });

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(reply).toContain("CHROME_PATH");
	});

	test("a failed render is reported, not thrown", async () => {
		// Arrange
		const web = fakeWeb({ [PAGE]: html("Forbidden", 403) });
		const { deps } = fakeDeps(web.net, { render: () => null });

		// Act
		const reply = await fetchPage(deps, { url: PAGE });

		// Assert
		expect(reply).toContain("Chrome render failed");
	});
});
