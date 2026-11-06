import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tempDir } from "../shared/temp.ts";
import {
	cachePrefix,
	checkSnap,
	diffParts,
	lineDiff,
	loadRequests,
	newText,
	normalize,
	parseSnap,
	pickRequest,
	splitRequest,
	toolSizes,
	toSnap,
} from "./capture.ts";
import { captureCommand } from "./command.ts";

const EPHEMERAL = { type: "ephemeral" };
const NONE_OF = /request 9: none of 2/;
const UNKNOWN = /capture command "nope": unknown/;

const tool = (name: string, description: string) => ({ name, description, input_schema: { type: "object" } });

const body = (over: Record<string, unknown> = {}) => ({
	model: "claude-haiku-5-5",
	system: [
		{ type: "text", text: "x-anthropic-billing-header: cc_version=2.1.318.da9;" },
		{ type: "text", text: "You are an agent.", cache_control: EPHEMERAL },
	],
	tools: [tool("Read", "Reads a file.\nLine two."), tool("Bash", "Runs a command.")],
	messages: [
		{ role: "user", content: [{ type: "text", text: "<system-reminder>\nnote\n</system-reminder>" }, { type: "text", text: "hi" }] },
		{ role: "assistant", content: [{ type: "tool_use", id: "toolu_01A", name: "ToolSearch", input: { query: "monitor" } }] },
		{
			role: "user",
			content: [{ type: "tool_result", tool_use_id: "toolu_01A", content: [{ type: "tool_reference", tool_name: "mcp__x__monitor" }] }],
		},
	],
	...over,
});

describe("splitRequest", () => {
	test("keys every part in cache order with its kind and cache mark", () => {
		const parts = splitRequest(body());
		expect(parts.map((p) => [p.key, p.kind])).toEqual([
			["head", "head"],
			["tool:Read", "tool"],
			["tool:Bash", "tool"],
			["system[0]", "system"],
			["system[1]", "system"],
			["msg[0]:user:reminder[0]", "reminder"],
			["msg[0]:user:text[1]", "text"],
			["msg[1]:assistant:tool_use[0]", "tool_use"],
			["msg[2]:user:tool_result[0]", "tool_result"],
		]);
		expect(parts.find((p) => p.key === "system[1]")?.cache).toBe(JSON.stringify(EPHEMERAL));
		expect(parts.find((p) => p.key === "msg[1]:assistant:tool_use[0]")?.text).not.toContain("toolu_01A");
	});

	test("a tool result with no text block keeps its content", () => {
		const result = splitRequest(body()).find((p) => p.kind === "tool_result");
		expect(result?.text).toContain("mcp__x__monitor");
	});
});

describe("normalize", () => {
	test("scrubs ids, uuids, times, dates, temp paths, the version, and the token budget", () => {
		const raw = [
			"cc_version=2.1.318.da9; at /private/var/folders/cl/x/T/arm-1/work and /tmp/probe-a/b",
			"msg_abc123 toolu_01XYZ 35541f66-892f-4234-b94a-77815d405f21",
			"2026-11-05T17:22:49.349Z Today's date is 2026-11-05.",
			"<total_tokens>15000000 tokens left</total_tokens>",
		].join("\n");
		expect(normalize(raw)).toBe(
			[
				"cc_version=<v>; at <tmp> and <tmp>",
				"msg_<id> toolu_<id> <uuid>",
				"<time> Today's date is <date>.",
				"<total_tokens><n></total_tokens>",
			].join("\n"),
		);
	});

	test("leaves different stable text different", () => {
		expect(normalize("Read the file.")).not.toBe(normalize("Write the file."));
	});
});

describe("diffParts", () => {
	test("reports where a changed text first differs, and added and removed parts", () => {
		const b = body({ tools: [tool("Read", "Reads a file.\nLine 2."), tool("Grep", "Searches.")] });
		const diff = diffParts(splitRequest(body()), splitRequest(b));
		expect(diff.map((d) => [d.change, d.key])).toEqual([
			["changed", "tool:Read"],
			["removed", "tool:Bash"],
			["added", "tool:Grep"],
		]);
		expect(diff[0]?.at).toBe('{"name":"Read","description":"Reads a file.\\nLine '.length);
	});

	test("a cache mark that moves is reported as a cache change with no text position", () => {
		const moved = body({ system: [{ type: "text", text: "x-anthropic-billing-header: cc_version=2.1.318.da9;" }, { type: "text", text: "You are an agent." }] });
		const [d] = diffParts(splitRequest(body()), splitRequest(moved));
		expect(d).toMatchObject({ key: "system[1]", change: "changed", cache: [JSON.stringify(EPHEMERAL), undefined] });
		expect(d?.at).toBeUndefined();
	});

	test("identical requests give no diff", () => {
		expect(diffParts(splitRequest(body()), splitRequest(body()))).toEqual([]);
	});
});

describe("newText and lineDiff", () => {
	test("newText finds text wherever it moved", () => {
		const a = splitRequest(body());
		const b = splitRequest(body({ messages: [{ role: "user", content: "fresh" }, ...body().messages] }));
		expect(newText(a, b).map((p) => p.text)).toEqual(["fresh"]);
	});

	test("lineDiff shows a changed tool description line by line", () => {
		const b = body({ tools: [tool("Read", "Reads a file.\nLine 2."), tool("Bash", "Runs a command.")] });
		expect(lineDiff(splitRequest(body()), splitRequest(b))).toEqual([
			{ group: "tool:Read", status: "changed", added: ['Line 2.",'], removed: ['Line two.",'] },
		]);
	});
});

describe("cachePrefix", () => {
	const grown = body({ messages: [...body().messages, { role: "assistant", content: "done" }] });

	test("a grown request reuses the earlier cache entry", () => {
		const [, r] = cachePrefix([body(), grown]);
		expect(r).toMatchObject({ sameHead: true, firstDiffVsPrevious: undefined, best: { from: 0, length: 4 } });
	});

	test("a changed model shares no entry", () => {
		const [, r] = cachePrefix([body(), { ...grown, model: "claude-sonnet-5-5" }]);
		expect(r?.sameHead).toBe(false);
		expect(r?.best).toBeUndefined();
	});
});

describe("toolSizes", () => {
	test("counts UTF-8 bytes and marks deferred tools", () => {
		const [t] = toolSizes({ tools: [{ ...tool("Read", "a — b"), defer_loading: true }] });
		expect(t).toMatchObject({ name: "Read", descriptionBytes: 7, deferred: true });
	});
});

describe("snapshots", () => {
	test("round-trips every part, including blank and pipe lines", () => {
		const parts = splitRequest(body({ messages: [{ role: "user", content: "a\n\n| b\n=== c" }] }), { normalize: {} });
		expect(parseSnap(toSnap(parts))).toEqual(parts);
	});

	test("writes only under update, and reports a change", async () => {
		const file = join(await tempDir("snap"), "req.snap");
		const parts = splitRequest(body(), { normalize: {} });
		expect((await checkSnap(file, parts, { update: false })).status).toBe("missing");
		expect(await Bun.file(file).exists()).toBe(false);
		expect((await checkSnap(file, parts, { update: true })).status).toBe("written");
		expect((await checkSnap(file, parts, { update: false })).status).toBe("same");
		const changed = splitRequest(body({ model: "claude-opus-5-5" }), { normalize: {} });
		const r = await checkSnap(file, changed, { update: false });
		expect(r.status).toBe("changed");
		expect(r.diff.map((d) => d.key)).toEqual(["head"]);
	});
});

describe("loading and picking", () => {
	test("reads a folder of bodies in name order, skipping headers, meta, and the plan", async () => {
		const dir = await tempDir("reqs");
		await Bun.write(join(dir, "0002.body.json"), JSON.stringify(body({ model: "b" })));
		await Bun.write(join(dir, "0001.body.json"), JSON.stringify(body({ model: "a" })));
		await Bun.write(join(dir, "0001.headers.json"), "{}");
		await Bun.write(join(dir, "plan.json"), "{}");
		const bodies = await loadRequests(dir);
		expect(bodies.map((b) => (b as { model: string }).model)).toEqual(["a", "b"]);
		expect((pickRequest(bodies, "last") as { model: string }).model).toBe("b");
		expect(() => pickRequest(bodies, "9")).toThrow(NONE_OF);
	});

	test("the command refuses an unknown subcommand and prints help on none", async () => {
		await expect(captureCommand(["nope"])).rejects.toThrow(UNKNOWN);
		expect(await captureCommand([])).toContain("PATH[@WHICH]");
	});
});
