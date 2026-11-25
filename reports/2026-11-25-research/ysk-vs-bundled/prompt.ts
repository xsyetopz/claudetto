// Prints the propose prompt of one arm, filled with the seven offers the dogfood session had seen.
// Arm "a": the shipped claudetto-you-should-know prompt. Arm "v": the prompt of the you-should-know
// plugin bundled in Claude Code 2.1.329 (function Tn of chunk-v2byvq1b.js, extracted verbatim into
// bundled-2.1.329-extract.js), called as the bundle calls it: Tn(seen, known).
// Usage: bun prompt.ts <a|v> <store.json>
import { readFileSync } from "node:fs";

import { proposePrompt } from "../../../plugins/claudetto-you-should-know/hooks/request/prompt";
// @ts-expect-error The extract is plain JavaScript from the bundle.
import { Tn } from "./bundled-2.1.329-extract.js";

const [arm, store] = process.argv.slice(2);
if (arm !== "a" && arm !== "v") throw new Error("arm must be a or v");
const seen: string[] = (
	JSON.parse(readFileSync(store ?? "", "utf8")).seen as string[]
).slice(0, 7);
console.log(arm === "v" ? (Tn(seen, []) as string) : proposePrompt(seen, []));
