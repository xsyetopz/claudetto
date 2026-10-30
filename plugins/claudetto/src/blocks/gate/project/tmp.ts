// The caller reads the env, because `$.env.get` takes only a literal name.

const TRAILING_SLASHES = /(.)\/+$/;

export const tempDirs = (
	env: { TMPDIR?: string | undefined; CLAUDE_CODE_TMPDIR?: string | undefined },
	real: (path: string) => Promise<string>,
): Promise<[string, string][]> => {
	const named = [env.TMPDIR, env.CLAUDE_CODE_TMPDIR, "/tmp", "/private/tmp"];
	const dirs = new Set(
		named.flatMap((d) => (d ? [d.replace(TRAILING_SLASHES, "$1")] : [])),
	);
	return Promise.all([...dirs].map(async (d) => [d, await real(d)]));
};
