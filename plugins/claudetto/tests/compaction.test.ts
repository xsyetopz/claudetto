import type {
	On,
	SessionCompactArgs,
	SessionCompactInput,
	SessionMessage,
} from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

/** The fields that the harness owns, which the lab sets to drive the hook. */
type CompactCall = SessionCompactArgs &
	Pick<SessionCompactInput, "trigger" | "messages">;

const say = (text: string, handle: string): SessionMessage => ({
	role: "user",
	text,
	toolUses: [],
	handle,
});

test("the shipped options leave a compaction to Claude Code", async ($: Engine, on: On) => {
	const seen = { core: 0 };
	on("session.compact", () => {
		seen.core += 1;
		return { skip: "core ran" };
	});
	const call: CompactCall = {
		trigger: "auto",
		messages: [say("Build the export.", "h0")],
	};

	const out = await $.session.compact(call);

	expect(seen.core).toBe(1);
	expect(out.skip).toBe("core ran");
});
