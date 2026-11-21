// Prints the you-should-know propose prompt as the plugin builds it, with the offers the dogfood
// session had seen; arm "b" adds the candidate sentence to the confidence bullet (issue #65).
// Usage: bun prompt.ts <a|b> <store.json>
import { readFileSync } from "node:fs";

import { proposePrompt } from "../../../plugins/claudetto-you-should-know/hooks/request/prompt";

const [arm, store] = process.argv.slice(2);
const seen: string[] = (
	JSON.parse(readFileSync(store ?? "", "utf8")).seen as string[]
).slice(0, 7);
const anchor = "a partial view supports only what it shows.";
const candidate =
	" A claim about how a tool, command, or system behaves rests on output in this session that shows that behaviour; what you remember about the tool is not evidence.";
const text = proposePrompt(seen, []);
if (!text.includes(anchor)) throw new Error("anchor sentence missing");
console.log(arm === "b" ? text.replace(anchor, anchor + candidate) : text);
