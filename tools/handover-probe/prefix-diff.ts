// Compares the cacheable prefix of three main-loop requests in a `PROBE_BODIES` capture: the session's first, its second turn's, and the first after a handover.
// Capture: `PROBE_BODIES=$TMPDIR/bodies.jsonl bun tools/handover-probe/probe.ts B35`, then `bun tools/handover-probe/prefix-diff.ts $TMPDIR/bodies.jsonl`.
// The log holds the first run's requests first, so only its first handover is read.
interface Block {
	readonly type?: string;
	readonly text?: string;
	readonly cache_control?: unknown;
}
interface Message {
	readonly role: string;
	readonly content: string | readonly Block[];
}
interface Body {
	readonly tools?: readonly unknown[];
	readonly messages: readonly Message[];
	readonly [key: string]: unknown;
}

const path = process.argv[2];
if (path === undefined) {
	throw new Error("usage: bun prefix-diff.ts <PROBE_BODIES file>");
}
const bodies = (await Bun.file(path).text())
	.trim()
	.split("\n")
	.map((l) => JSON.parse((JSON.parse(l) as { raw: string }).raw) as Body);
const main = bodies.filter((b) => (b.tools?.length ?? 0) > 0);
const textOf = (m: Message | undefined): string =>
	m === undefined
		? ""
		: typeof m.content === "string"
			? m.content
			: m.content.map((c) => c.text ?? "").join("");
const first = main[0];
const second = main[1];
const handed = main.find((b) =>
	textOf(b.messages[2]).startsWith("The conversation was compacted"),
);
if (first === undefined || second === undefined || handed === undefined) {
	throw new Error("the capture holds no first, second, and post-handover main request");
}
const plain = (v: unknown): string =>
	JSON.stringify(v, (k, x) => (k === "cache_control" ? undefined : x));
const raw = (v: unknown): string => JSON.stringify(v);
const shape = (m: Message | undefined): string =>
	m === undefined
		? "absent"
		: typeof m.content === "string"
			? "string"
			: `array of ${m.content.length} [${m.content.map((c) => `${c.type}${c.cache_control === undefined ? "" : "+cache_control"}`).join(", ")}]`;
const marks = (b: Body): string => {
	const out: string[] = [];
	const system = Array.isArray(b["system"]) ? (b["system"] as Block[]) : [];
	for (const [j, s] of system.entries()) {
		if (s.cache_control !== undefined) out.push(`system[${j}] ${raw(s.cache_control)}`);
	}
	for (const [j, m] of b.messages.entries()) {
		if (typeof m.content === "string") continue;
		for (const [k, c] of m.content.entries()) {
			if (c.cache_control !== undefined) out.push(`messages[${j}].content[${k}] ${raw(c.cache_control)}`);
		}
	}
	return out.join("; ");
};
for (const [name, b] of [["second turn", second], ["after handover", handed]] as const) {
	console.log(`== first request vs ${name} (${b.messages.length} messages)`);
	for (const key of ["system", "tools", "model", "thinking", "metadata", "output_config", "context_management"]) {
		console.log(`${key}: ${raw(b[key]) === raw(first[key]) ? "identical" : "DIFFERENT"}`);
	}
	for (const j of [0, 1]) {
		const a = first.messages[j];
		const c = b.messages[j];
		console.log(
			`messages[${j}] (${c?.role}): bytes ${raw(a) === raw(c) ? "identical" : plain(a) === plain(c) ? "differ only in cache_control" : "DIFFERENT"}; first is ${shape(a)}, this is ${shape(c)}`,
		);
	}
	console.log(`marks: ${marks(b)}`);
}
console.log(`first request marks: ${marks(first)}`);
