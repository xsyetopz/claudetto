// Adds or removes the trust entry of the work folder in the real ~/.claude.json, under its lock.
import {
	configPath,
	trust,
	untrust,
} from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/summary-cost/trust.ts";
const dir = "/private/tmp/probe-148/work";
await (process.argv[2] === "on" ? trust : untrust)(configPath(), dir);
