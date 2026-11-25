// Sums tokens, model calls and tool calls per arm over one eval run's kept traces.
// Usage: bun tokens.ts <aggregate-result.json>
// Each trace's `result` line carries the session's summed usage; tool calls are the
// tool_use blocks in its assistant messages, and model calls the distinct message ids.

interface Usage {
	input_tokens?: number;
	output_tokens?: number;
	cache_creation_input_tokens?: number;
	cache_read_input_tokens?: number;
}

interface Totals {
	runs: number;
	missing: number;
	input: number;
	output: number;
	cacheWrite: number;
	cacheRead: number;
	modelCalls: number;
	toolCalls: number;
	cost: number;
	score: number;
}

const empty = (): Totals => ({
	runs: 0,
	missing: 0,
	input: 0,
	output: 0,
	cacheWrite: 0,
	cacheRead: 0,
	modelCalls: 0,
	toolCalls: 0,
	cost: 0,
	score: 0
});

const file = Bun.argv[2];
if (file === undefined) {
	throw new Error("usage: bun tokens.ts <aggregate-result.json>");
}
const result = (await Bun.file(file).json()) as {
	cases: {
		arms: Record<
			string,
			{ tracePath?: string; costUsd: number; score: number }[]
		>;
	}[];
};

const totals = new Map<string, Totals>();
for (const item of result.cases) {
	for (const [arm, runs] of Object.entries(item.arms)) {
		const sum = totals.get(arm) ?? empty();
		totals.set(arm, sum);
		for (const run of runs) {
			sum.runs += 1;
			sum.cost += run.costUsd;
			sum.score += run.score;
			const trace =
				run.tracePath === undefined ? undefined : Bun.file(run.tracePath);
			if (trace === undefined || !(await trace.exists())) {
				sum.missing += 1;
				continue;
			}
			const ids = new Set<string>();
			for (const line of (await trace.text()).split("\n")) {
				if (line === "") {
					continue;
				}
				const event = JSON.parse(line) as {
					type?: string;
					usage?: Usage;
					message?: { id?: string; content?: { type?: string }[] };
				};
				if (event.type === "result" && event.usage !== undefined) {
					sum.input += event.usage.input_tokens ?? 0;
					sum.output += event.usage.output_tokens ?? 0;
					sum.cacheWrite += event.usage.cache_creation_input_tokens ?? 0;
					sum.cacheRead += event.usage.cache_read_input_tokens ?? 0;
				}
				if (event.type === "assistant" && event.message?.id !== undefined) {
					ids.add(event.message.id);
					sum.toolCalls += (event.message.content ?? []).filter(
						(block) => block.type === "tool_use"
					).length;
				}
			}
			sum.modelCalls += ids.size;
		}
	}
}

for (const [arm, sum] of totals) {
	console.log(
		JSON.stringify({
			arm,
			...sum,
			score: sum.score / sum.runs,
			uncached: sum.input + sum.output + sum.cacheWrite
		})
	);
}
