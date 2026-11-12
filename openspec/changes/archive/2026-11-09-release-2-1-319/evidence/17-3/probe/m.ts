export const register = (on: any): void => {
	on("prompt.submit", async ($: any, e: any, next: any) => {
		const prompts = JSON.parse(await $.fs.read("/tmp/probe-17-3/prompts.json"));
		const out = await Promise.all(
			prompts.map(async (p: any) => {
				const t = Date.now();
				const r = await $.model
					.complete({
						model: "haiku",
						prompt: p.prompt,
						maxTokens: 300,
						timeoutMs: 15_000,
					})
					.catch((err: any) => ({ threw: String(err) }));
				return { id: p.id, ms: Date.now() - t, ...r };
			}),
		);
		await $.fs.write(
			"/tmp/probe-17-3/hook-log.json",
			JSON.stringify(out, null, 1),
		);
		return next(e);
	});
};
