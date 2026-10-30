// The temp folders of a session, for `guard` and `hygiene`. The caller reads the env, because `$.env.get` takes only a literal name.

const TRAILING_SLASHES = /(.)\/+$/;

/** `$TMPDIR`, `CLAUDE_CODE_TMPDIR`, `/tmp`, and `/private/tmp`, each as `[name, real path]`. */
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
