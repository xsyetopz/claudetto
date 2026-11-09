import { spawnSync } from "node:child_process";
import { VERIFY_GRADE } from "../../../../../plugins/claudetto/hooks/texts.ts";

const res = ["- Bash git diff\n+# setup block\n+dist/"];
const replies = ["Committed. `.gitignore` also has the setup block.", "Done. I left the earlier setting alone, and the change in the second block went through."];
for (const reply of replies) for (let i = 0; i < 4; i++) {
	const prompt = VERIFY_GRADE([], [], "commit", reply, ["credited", "fallback", "unfiled", "unseen"], res);
	const out = spawnSync("claude", ["-p", "--model", "claude-sonnet-5-5", "--no-session-persistence", "--setting-sources", "", "--tools", ""], { input: prompt, encoding: "utf8" });
	console.log(/"code"\s*:\s*"unseen"/.test(out.stdout) ? "unseen" : "none", "|", reply.slice(0, 40));
}
