/** A tool as `$.tool.register` takes it. */
export interface ToolSpec {
	readonly name: string;
	readonly description: string;
	readonly inputSchema: Readonly<Record<string, unknown>>;
}

/**
 * `$.tool.register` rejects until the session binds, so a refusal before `start` runs is retried after it.
 * It takes closures and no `$`, since the loader follows `$` only into function declarations.
 */
export const declareAfterStart = async <T>(
	register: (spec: ToolSpec) => Promise<unknown>,
	spec: ToolSpec,
	start: () => Promise<T>,
): Promise<T> => {
	let early = true;
	try {
		await register(spec);
	} catch {
		early = false;
	}
	const started = await start();
	if (!early) {
		await register(spec).catch(() => undefined);
	}
	return started;
};
