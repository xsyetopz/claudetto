// Pairs each main-chain assistant turn with the human message that answers it, so the user can label candidate fixtures.
import { basename } from "node:path";
import { isRecord } from "../shared/record.ts";
import type { Fixture, Message } from "./fixture.ts";

type Entry = Record<string, unknown>;

// Lines Claude Code writes as a user entry that the user did not type.
const NOT_TYPED = /^\s*(<command-name>|<local-command|<command-message>|Caveat:|\[Request interrupted|<task-notification>|This session is being continued|<bash-)/;

// Older transcripts carry no origin fields, so only a recorded non-human origin rules an entry out.
const notHuman = (e: Entry): boolean =>
	(e.turnOrigin !== undefined && e.turnOrigin !== "human") || (isRecord(e.origin) && e.origin.kind !== "human");

const textBlocks = (content: unknown[]): string =>
	content
		.filter((b): b is { type: "text"; text: string } => isRecord(b) && b.type === "text" && typeof b.text === "string")
		.map((b) => b.text)
		.join("\n");

export const humanText = (e: Entry): string | undefined => {
	if (e.type !== "user" || e.isMeta || e.isSidechain || notHuman(e) || !isRecord(e.message)) {
		return;
	}
	const c = e.message.content;
	const text = typeof c === "string" ? c : Array.isArray(c) && !c.some((b) => isRecord(b) && b.type === "tool_result") ? textBlocks(c) : "";
	return text.trim() && !NOT_TYPED.test(text) ? text : undefined;
};

export const assistantText = (e: Entry): string =>
	e.type === "assistant" && !e.isSidechain && isRecord(e.message) && Array.isArray(e.message.content)
		? textBlocks(e.message.content)
		: "";

// Whole sessions go one way, so no held-out case shares a conversation with a tuning case.
export const split = (fixtures: Fixture[], seed: string, share: number): { tuning: Fixture[]; heldOut: Fixture[] } => {
	const held = (f: Fixture): boolean => {
		const hash = new Bun.CryptoHasher("sha256").update(`${seed}:${f.id.split(":")[0]}`).digest();
		return hash.readUInt32BE(0) / 2 ** 32 < share;
	};
	return { tuning: fixtures.filter((f) => !held(f)), heldOut: fixtures.filter(held) };
};

// Each fixture holds the user's recorded answer as `userReply`, so a mined set needs no relabeling.
export const mine = (path: string, text: string, keep: number): Fixture[] => {
	const out: Fixture[] = [];
	const session = basename(path, ".jsonl").slice(0, 8);
	const history: Message[] = [];
	let ask: string | undefined;
	let reply: string[] = [];
	let replyLine = 0;
	let tools = 0;
	// The summary after a compaction boundary carries no origin field, so its place in the file marks it.
	let afterCompaction = false;
	text.split("\n").forEach((raw, i) => {
		if (!raw.startsWith("{")) {
			return;
		}
		const e: unknown = JSON.parse(raw);
		if (!isRecord(e)) {
			return;
		}
		if (e.type === "system" && e.subtype === "compact_boundary") {
			afterCompaction = true;
			return;
		}
		if (afterCompaction && e.type === "user" && !e.isMeta) {
			afterCompaction = false;
			return;
		}
		const said = assistantText(e);
		if (said) {
			reply.push(said);
			replyLine = i + 1;
		}
		if (e.type === "assistant" && !e.isSidechain && isRecord(e.message) && Array.isArray(e.message.content)) {
			tools += e.message.content.filter((b) => isRecord(b) && b.type === "tool_use").length;
		}
		const human = humanText(e);
		if (human === undefined) {
			return;
		}
		if (ask !== undefined && reply.length > 0) {
			const turn = reply.join("\n\n");
			out.push({
				id: `${session}:${i + 1}`,
				prefix: [...history.slice(history.length - keep), { role: "user", content: ask }],
				reply: turn,
				userReply: human,
				labels: { tools: String(tools) },
				source: `${path}:${replyLine}`,
			});
			history.push({ role: "user", content: ask }, { role: "assistant", content: turn });
		}
		ask = human;
		reply = [];
		tools = 0;
	});
	return out;
};
