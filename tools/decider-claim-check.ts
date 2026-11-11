// Scores the stored claim-check cases through today's Haiku and Sonnet prompts and through the Decider, and keeps each request and response.
// Usage: bun tools/decider-claim-check.ts <cases.jsonl> <payload-folder> --summary <file.md> --prices <file.json> --max-usd <n> [--typesafe-base-url <url>]
// `tools/claim-check-launch.ts` holds the road every tuning run shares.
import { launch } from "./claim-check-launch.ts";

process.exitCode = await launch("claim-check", "tools/decider-claim-check.ts");
