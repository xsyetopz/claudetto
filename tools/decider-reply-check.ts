// Scores the stored reply-register cases through the Decider's `REPLY_REGISTER` questions, and keeps each request and response.
// Usage: bun tools/decider-reply-check.ts <cases.jsonl> <payload-folder> --summary <file.md> [--typesafe-base-url <url>]
// `tools/claim-check-launch.ts` holds the road every tuning run shares.
import { launch } from "./claim-check-launch.ts";

process.exitCode = await launch("tools/decider-reply-check.ts");
