// Replays a fixed sample of the mined tuning set on one arm and saves the replies for labeling. Env: ARM_DIR, ARM_NAME.
// The judge is not called here: it runs only after the labels are committed (judge-sample.ts).
import { replay } from "/tmp/probe-17-15/grader.ts";

const N = 30;
const SEED = "17-15-judge-check";
const set = (
	await Bun.file(
		"/tmp/claudekit-leftovers/claudekit/dumps/fixtures/tuning.json",
	).json()
).fixtures as any[];
const key = (id: string) =>
	new Bun.CryptoHasher("sha256").update(`${SEED}:${id}`).digest("hex");
const picked = [...set]
	.sort((a, b) => (key(a.id) < key(b.id) ? -1 : 1))
	.slice(0, N);
const out: { id: string; text: string; killed: string }[] = [];
for (const f of picked) {
	const r = await replay(f);
	out.push({ id: f.id, text: r.text, killed: r.killed });
	await Bun.write(
		"/tmp/probe-17-15/sample-replies.json",
		JSON.stringify(out, null, 1),
	);
}
console.log(
	JSON.stringify({
		n: out.length,
		empty: out.filter((o) => o.text === "").length,
	}),
);
