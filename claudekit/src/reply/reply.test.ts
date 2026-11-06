import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { startFake } from "../fake/fake.ts";
import type { Plan } from "../fake/plan.ts";
import { launch, type Mode } from "../launcher/launcher.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { createRun } from "../workspace/workspace.ts";
import {
	firstSentence,
	readJsonOutput,
	readStreamJson,
	readTranscript,
	replyText,
	sentences,
} from "./reply.ts";

const output = async (plan: Plan, mode: Mode, settings: Record<string, unknown> = {}): Promise<string> => {
	const run = await createRun({ probe: "reply-test", root: await tempDir("reply"), quiet: true });
	const fake = await startFake({ plan, dir: join(run.dir, "requests") });
	try {
		const r = await launch({ prompt: "hi", mode, model: DEFAULT_MODEL, baseUrl: fake.url, settings }, run);
		return Bun.file(r.files.stdout).text();
	} finally {
		await fake.stop();
	}
};

const text = (t: string) => ({ type: "text" as const, text: t });

describe("readers on real claude output", () => {
	test("a reply cut at max_tokens keeps both segments, in both json and stream-json", async () => {
		const plan: Plan = {
			steps: [
				{ reply: { blocks: [text("PART-ONE first segment.")], stop: "max_tokens" } },
				{ reply: { blocks: [text("PART-TWO tail.")] } },
			],
		};
		for (const [mode, read] of [
			["stream-json", readStreamJson],
			["json", readJsonOutput],
		] as const) {
			const reply = read(await output(plan, mode));
			expect(reply.complete).toBe(true);
			expect(reply.segments.map((s) => s.text)).toEqual(["PART-ONE first segment.", "PART-TWO tail."]);
			expect(reply.turns).toBe(2);
			expect(firstSentence(reply)).toBe("PART-ONE first segment.");
		}
	});

	test("two text blocks of one answer are one turn", async () => {
		const reply = readStreamJson(await output({ steps: [{ reply: { blocks: [text("BLOCK-A."), text("BLOCK-B.")] } }] }, "stream-json"));
		expect(reply.segments.map((s) => [s.turn, s.text])).toEqual([
			[1, "BLOCK-A."],
			[1, "BLOCK-B."],
		]);
	});

	test("tool calls and their results are read", async () => {
		const plan: Plan = {
			steps: [
				{ reply: { blocks: [{ type: "tool_use", name: "Bash", input: { command: "echo TOOL-OUT" } }] } },
				{ reply: { blocks: [text("Done.")] } },
			],
		};
		const reply = readStreamJson(await output(plan, "stream-json", { permissions: { allow: ["Bash"] } }));
		expect(reply.toolCalls.map((c) => c.name)).toEqual(["Bash"]);
		expect(reply.toolResults).toHaveLength(1);
		expect(JSON.stringify(reply.toolResults[0]?.content)).toContain("TOOL-OUT");
		expect(replyText(reply)).toBe("Done.");
	});
});

describe("refusals", () => {
	test("a lone result object is incomplete and yields no segment", () => {
		const reply = readJsonOutput(JSON.stringify({ type: "result", subtype: "success", result: "PART-TWO tail." }));
		expect(reply.complete).toBe(false);
		expect(reply.segments).toEqual([]);
		expect(reply.tail).toBe("PART-TWO tail.");
	});

	test("a stream with no result frame is incomplete", () => {
		const frame = { type: "assistant", message: { id: "m1", content: [text("Hi.")] }, parent_tool_use_id: null };
		expect(readStreamJson(JSON.stringify(frame)).complete).toBe(false);
	});

	test("subagent frames stay out of the reply", () => {
		const frames = [
			{ type: "assistant", message: { id: "m1", content: [text("SUB.")] }, parent_tool_use_id: "toolu_1" },
			{ type: "assistant", message: { id: "m2", content: [text("MAIN.")] }, parent_tool_use_id: null },
			{ type: "result", subtype: "success", is_error: false },
		];
		expect(replyText(readStreamJson(frames.map((f) => JSON.stringify(f)).join("\n")))).toBe("MAIN.");
	});

	test("transcript sidechain entries stay out of the reply", () => {
		const lines = [
			{ type: "user", message: { role: "user", content: "hi" } },
			{ type: "assistant", isSidechain: true, message: { id: "m1", content: [text("SUB.")] } },
			{ type: "assistant", isSidechain: false, message: { id: "m2", content: [text("MAIN.")] } },
		];
		const reply = readTranscript(lines.map((l) => JSON.stringify(l)).join("\n"));
		expect(reply.complete).toBe(true);
		expect(replyText(reply)).toBe("MAIN.");
	});
});

describe("sentences", () => {
	test("keeps a sentence with a colon and a comma whole", () => {
		expect(sentences("Correction: I was wrong, and you are right. Next part.")).toEqual([
			"Correction: I was wrong, and you are right.",
			"Next part.",
		]);
	});

	test("keeps abbreviations and code spans whole, and drops list and heading marks", () => {
		expect(sentences("## Result\n- Use `a.b. c` here, e.g. now. Then stop!")).toEqual([
			"Result",
			"Use `a.b. c` here, e.g. now.",
			"Then stop!",
		]);
	});

	test("ends a sentence at a closing quote or bracket", () => {
		expect(sentences('He said "done." Then (it ran.) Last')).toEqual(['He said "done."', "Then (it ran.)", "Last"]);
	});
});
