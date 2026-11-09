import { mksession } from "../mksession.ts";
import { runClaude } from "../grader.ts";
const cwd = "/private/tmp/probe-122/probe/w";
const id = mksession(cwd, [{ role: "user", content: "Remember the word PELICAN." }, { role: "assistant", content: "Noted: PELICAN." }]);
const r = await runClaude(["-p", "What word did I ask you to remember? One word.", "--resume", id, "--fork-session", "--tools", "", "--setting-sources", "project,local", "--model", "haiku", "--output-format", "stream-json", "--verbose"], cwd);
console.log(r.text, r.tokens, r.usd);
