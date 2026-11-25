// Prints the propose prompt of one arm, filled with the seven offers the dogfood session had seen.
// Arm "a": the shipped claudetto-you-should-know prompt. Arm "v": the prompt of the you-should-know
// plugin bundled in Claude Code 2.1.329 (function Tn of chunk-v2byvq1b.js, extracted verbatim into
// bundled-2.1.329-extract.js), called as the bundle calls it: Tn(seen, known).
// Usage: bun prompt.ts <a|c|v> <store.json>
import { readFileSync } from "node:fs";

import { proposePrompt } from "../../../plugins/claudetto-you-should-know/hooks/request/prompt";
// @ts-expect-error The extract is plain JavaScript from the bundle.
import { Tn } from "./bundled-2.1.329-extract.js";

const [arm, store] = process.argv.slice(2);
if (arm !== "a" && arm !== "c" && arm !== "v")
	throw new Error("arm must be a, c, or v");
const seen: string[] = (
	JSON.parse(readFileSync(store ?? "", "utf8")).seen as string[]
).slice(0, 7);
// Arm "c" is the working-tree prompt (the candidate sentence from the 2026-11-25 follow-up); arm "a"
// is the same prompt without that sentence, which is the prompt as shipped before it.
const candidate =
	" The main agent is capable and often reaches the same point itself, so a note belongs only where the topic has been or will be glossed over, or where the person clearly missed it.";
const current = proposePrompt(seen, []);
if (!current.includes(candidate)) throw new Error("candidate sentence missing");
console.log(
	arm === "v"
		? (Tn(seen, []) as string)
		: arm === "c"
			? current
			: current.replace(candidate, "")
);
