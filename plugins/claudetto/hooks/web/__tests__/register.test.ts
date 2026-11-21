import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import {
	FETCH_FULL_NAME,
	FETCH_TOOL,
	registerWeb,
	SEARCH_FULL_NAME,
	SEARCH_TOOL
} from "../register";
import { ARTICLE, DDG_RESULTS } from "./fixtures";

const none = {
	exitCode: 1,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false
};

/** Stands in for the host beneath the plugin: HTTP, process, store, fs and env. */
const host = (
	on: On,
	pages: Record<string, { status: number; text: string }>
) => {
	const requested: string[] = [];
	const store = new Map<string, unknown>();
	const files = new Map<string, string>();
	on("http.fetch", (_$, e) => {
		requested.push(e.url);
		const page = pages[e.url] ?? { status: 404, text: "" };
		return {
			value: {
				status: page.status,
				ok: page.status < 300,
				headers: { "content-type": "text/html" },
				text: page.text
			}
		};
	});
	on("process.hookEnv", () => ({ value: { CLAUDE_PLUGIN_DATA: "/data" } }));
	on("process.run", () => ({ value: none }));
	on("env.get", (_$, e) => ({
		value: e.name === "CHROME_PATH" ? undefined : undefined
	}));
	on("fs.exists", () => ({ value: false }));
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("fs.write", (_$, e) => {
		files.set(e.path, e.text);
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	return { requested, files };
};

describe("REQ-TOOLS-020 REQ-TOOLS-021 registration", () => {
	test("descriptions stay within 200 characters and the names are the full model-facing names", () => {
		// Arrange / Act / Assert
		expect(FETCH_TOOL.description.length).toBeLessThanOrEqual(200);
		expect(SEARCH_TOOL.description.length).toBeLessThanOrEqual(200);
		expect(FETCH_FULL_NAME).toBe("mcp__claudetto__web_fetch");
		expect(SEARCH_FULL_NAME).toBe("mcp__claudetto__web_search");
	});

	test("the built-in WebFetch and WebSearch are not offered, in any loop", async ($, on) => {
		// Arrange
		registerWeb(on);
		const provider = { plugin: "engine", tier: "core" } as const;

		// Act
		const offers = await Promise.all([
			$.tool.offer({ tool: "WebFetch", provider }),
			$.tool.offer({ tool: "WebSearch", provider }),
			$.tool.offer({
				tool: "WebFetch",
				provider,
				agentId: "a1",
				subagentType: "Explore"
			})
		]);

		// Assert
		expect(offers.map((o) => o.isOffered)).toEqual([false, false, false]);
	});

	test("session start registers both tools", async ($, on) => {
		// Arrange
		const names: string[] = [];
		on("session.start", (_$, e) => ({ cwd: e.cwd }));
		on("tool.register", (_$, e) => {
			names.push(e.name);
			return { value: { tool: e.name } };
		});
		on("ui.log", () => ({ value: undefined }));

		// Act
		await $.session.start({
			cwd: "/repo",
			surface: null,
			isInteractive: false
		});

		// Assert
		expect(names).toEqual(expect.arrayContaining(["web_fetch", "web_search"]));
	});
});

describe("REQ-TOOLS-020 REQ-TOOLS-021 served calls", () => {
	test("web_fetch answers through the host's HTTP and saves the copy in the plugin's data folder", async ($, on) => {
		// Arrange
		registerWeb(on);
		const world = host(on, {
			"https://news.test/post": { status: 200, text: ARTICLE }
		});

		// Act
		const { result } = await $.tool.call({
			tool: FETCH_FULL_NAME,
			tool_use_id: "t1",
			url: "https://news.test/post",
			max_chars: 500
		});

		// Assert
		expect(world.requested).toEqual(["https://news.test/post"]);
		expect(result).toContain("Full Markdown saved: /data/web/");
		expect([...world.files.keys()][0]?.startsWith("/data/web/")).toBe(true);
	});

	test("web_search answers from DuckDuckGo through the host's HTTP", async ($, on) => {
		// Arrange
		registerWeb(on);
		const world = host(on, {
			"https://html.duckduckgo.com/html/?q=bun%20runtime": {
				status: 200,
				text: DDG_RESULTS
			}
		});

		// Act
		const { result } = await $.tool.call({
			tool: SEARCH_FULL_NAME,
			tool_use_id: "t2",
			query: "bun runtime"
		});

		// Assert
		expect(world.requested.length).toBe(1);
		expect(result).toContain(
			"1. Bun — Fast JavaScript Runtime — https://bun.com/docs?a=1&b=2"
		);
	});
});
