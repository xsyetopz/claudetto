// Scores the stored branch-gate cases through today's `askedToDelete` and through the Decider's one Noul, and keeps each request and response.
// Usage: bun tools/decider-gate-check.ts <cases.jsonl> <payload-folder> --summary <file.md> --prices <file.json> --max-usd <n> [--typesafe-base-url <url>]
// `tools/claim-check-launch.ts` holds the road every tuning run shares.
import { launch } from "./claim-check-launch.ts";

process.exitCode = await launch("branch-gate", "tools/decider-gate-check.ts");
