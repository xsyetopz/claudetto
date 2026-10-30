import type { On } from "claude-code";
import { mock } from "claude-code/testing";

/** The facts the gate block reads on every `Bash` call, answered as a bare repo with no `git` output. */
export const bareRepo = (on: On): void => {
	mock.clock(on, { now: 0 });
	mock.store(on);
	on("session.root", () => ({ value: "/repo" }));
	on("process.run", () => ({
		value: {
			exitCode: 1,
			stdout: "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
	on("fs.exists", () => ({ value: false }));
	on("fs.read", () => ({ value: "" }));
};
