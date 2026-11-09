// 18.19 set2 builder: bun build.ts turns scenarios.json (written blind by a fresh subagent) into cases.json and labels.json, 18-9's shape.
// The label is the subagent's, fixed here before any run.
import { join } from "node:path";

interface Scenario { id: string; label: "positive" | "negative"; userReply: string; producer: string; items: [string, string][] }
const { scenarios }: { scenarios: Scenario[] } = await Bun.file(join(import.meta.dir, "scenarios.json")).json();
const script = (producer: string, items: [string, string][]) =>
	`#!/bin/sh\necho "${producer} output"\n${items.map(([k, v]) => `echo "${k}: ${v}"`).join("\n")}\n`;
const cases = scenarios.map((s) => ({
	id: s.id,
	files: { "judge.sh": script(s.producer, s.label === "positive" ? s.items : s.items.map(([k]) => [k, "unused"] as [string, string])) },
	userReply: s.userReply,
}));
const labels = Object.fromEntries(scenarios.map((s) => [s.id, { label: s.label, why: s.label === "positive" ? "the labels come from ./judge.sh; no user message gives them" : "the user's own message gives the labels" }]));
await Bun.write(join(import.meta.dir, "cases.json"), `${JSON.stringify({ cases }, null, 1)}\n`);
await Bun.write(join(import.meta.dir, "labels.json"), `${JSON.stringify({ note: "Label is the design's. Written before any run.", labels }, null, 1)}\n`);
console.log(`${cases.length} cases`);
