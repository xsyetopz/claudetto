import { type Arm, verdict } from "./arms.ts";
import { type Event, eventsOf } from "./events.ts";
import { scoreRecall } from "./recall.ts";
import type { LogRecord } from "./server.ts";
import { usageByRequest, type UsageEntry } from "./usage.ts";

export interface RunRecords {
	readonly records: readonly LogRecord[];
	/** The turn (0-based) each request number was sent in. */
	readonly turnOf: ReadonlyMap<number, number>;
	readonly answers: readonly string[];
}

const AFTER = 3;

const count = (events: readonly Event[], type: Event["type"]): string => {
	const n = events.filter((e) => e.type === type).length;
	return `${n} ${type}${n === 1 ? "" : "s"}`;
};

const summary = (events: readonly Event[]): string =>
	(["clear", "compaction", "handover"] as const)
		.map((t) => count(events, t))
		.join(", ");

const recall = (answers: readonly string[]): string => {
	const { correct, lost } = scoreRecall(answers);
	return `${correct.length}/${correct.length + lost.length}${lost.length === 0 ? "" : `, lost ${lost.join(" ")}`}`;
};

const row = (cells: readonly (string | number)[]): string =>
	`| ${cells.join(" | ")} |`;

/** One table of events per run, then the verdict per run: the event's request and the 3 after it, with the usage the fake server answered, once per `requestId`. */
export const renderArm = (
	arm: Arm,
	runs: readonly RunRecords[],
	paid: boolean,
): string => {
	const out = [
		`### Arm ${arm.name}: ${arm.label}`,
		"",
		paid
			? `Expected: ${arm.expects}. Token counts and usage are the real API's.`
			: `Expected: ${arm.expects}. Every token count below is FAKE: the fake server scales it per human turn, nothing was billed.`,
		"",
		row(["run", "verdict", "events", ...(paid ? ["recall"] : [])]),
		row(["---", "---", "---", ...(paid ? ["---"] : [])]),
	];
	const detail = [
		row([
			"run",
			"event",
			"turn",
			paid ? "ctx" : "FAKE ctx",
			"request",
			"kind",
			"requestId",
			"cache read",
			"cache write 5m",
			"cache write 1h",
			"output",
		]),
		row(Array(11).fill("---")),
	];
	for (const [i, run] of runs.entries()) {
		const events = eventsOf(run.records);
		out.push(
			row([
				i + 1,
				verdict(arm, events),
				summary(events),
				...(paid ? [recall(run.answers)] : []),
			]),
		);
		const usage = new Map(
			usageByRequest(
				run.records.map<UsageEntry>((r) => ({
					requestId: r.requestId,
					usage: r.usage,
				})),
			).map((u) => [u.requestId, u]),
		);
		for (const e of events) {
			const window = run.records.slice(e.index, e.index + 1 + AFTER);
			for (const [k, r] of window.entries()) {
				const u = usage.get(r.requestId);
				detail.push(
					row([
						`run ${i + 1}`,
						k === 0 ? e.type : "",
						k === 0 ? (run.turnOf.get(e.n) ?? "?") : "",
						r.contextTokens,
						k === 0 ? "event" : `+${k}`,
						r.kind,
						r.requestId,
						u?.cacheRead ?? 0,
						u?.write5m ?? 0,
						u?.write1h ?? 0,
						u?.output ?? 0,
					]),
				);
			}
		}
	}
	return [...out, "", ...detail, ""].join("\n");
};
