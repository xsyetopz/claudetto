import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { mainRequests, readRequests, startFake } from "../fake/fake.ts";
import { launch } from "../launcher/launcher.ts";
import { MODELS } from "../shared/model.ts";
import { createRun } from "../workspace/workspace.ts";

const prefix = [
	{ role: "user" as const, content: "PREFIX-USER fix the bug" },
	{ role: "assistant" as const, content: "PREFIX-ASSISTANT I fixed it." },
];

test("a launch with a prefix sends the prefix turns before the prompt in request 1, and removes its seed", async () => {
	const run = await createRun({ probe: "replay-test", quiet: true });
	const requests = join(run.dir, "requests");
	const fake = await startFake({ plan: { steps: [] }, dir: requests });
	try {
		const r = await launch(
			{ prompt: "NEW-PROMPT you did not run the test", prefix, mode: "stream-json", model: MODELS.haiku, baseUrl: fake.url, timeoutMs: 60_000 },
			run,
		);
		expect(r.exitCode).toBe(0);
		const [first] = mainRequests(await readRequests(requests));
		const texts = JSON.stringify(first?.body.messages);
		const at = (s: string) => texts.indexOf(s);
		expect(at("PREFIX-USER")).toBeGreaterThan(-1);
		expect(at("PREFIX-ASSISTANT")).toBeGreaterThan(at("PREFIX-USER"));
		expect(at("NEW-PROMPT")).toBeGreaterThan(at("PREFIX-ASSISTANT"));
		expect(r.record.seed).toBeDefined();
		expect(existsSync(r.record.seed ?? "")).toBe(false);
	} finally {
		await fake.stop();
	}
}, 90_000);
