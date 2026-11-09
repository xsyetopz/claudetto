// Probe: does the first assistant text, before any Stop hook feedback, answer the user's message? Replays 3 sampled cases.
import { replay } from "/tmp/probe-17-15/grader.ts";
const set = (await Bun.file("/tmp/claudekit-leftovers/claudekit/dumps/fixtures/tuning.json").json()).fixtures as any[];
const ids = ["a4543ae9:5447", "f8383c80:361", "012b83b1:2414"];
for (const id of ids) {
	const r: any = await replay(set.find((f) => f.id === id));
	const texts = r.events.filter((e: any) => e.type === "assistant").flatMap((e: any) => e.message.content.filter((c: any) => c.type === "text").map((c: any) => c.text));
	console.log(`=== ${id} turns=${texts.length}\n--- first\n${(texts[0] ?? "").slice(0, 1200)}\n`);
}
