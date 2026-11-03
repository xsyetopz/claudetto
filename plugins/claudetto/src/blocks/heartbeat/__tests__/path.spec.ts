import { expect, test } from "bun:test";
import { heartbeatPath } from "../path.ts";

test("a session id with path characters names one file inside the heartbeat folder", () => {
	expect(heartbeatPath("../a/b c")).toBe(
		".claude/claudetto/heartbeat/___a_b_c.txt",
	);
});
