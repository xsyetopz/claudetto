import type { On } from "claude-code";
import { mock } from "claude-code/testing";

/**
 * The facts the gate block reads on every `Bash` call, answered as a bare repo with no `git` output.
 * `remotes` is the output of `git remote -v`, which then succeeds.
 */
export const bareRepo = (on: On, remotes?: string): void => {
	mock.clock(on, { now: 0 });
	mock.store(on);
	on("session.root", () => ({ value: "/repo" }));
	on("process.run", (_$, e) => {
		const listed = remotes !== undefined && e.argv.includes("remote");
		return {
			value: {
				exitCode: listed ? 0 : 1,
				stdout: listed ? remotes : "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false,
			},
		};
	});
	on("fs.exists", () => ({ value: false }));
	on("fs.read", () => ({ value: "" }));
};
