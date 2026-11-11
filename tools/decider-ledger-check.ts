// Scores the stored ledger cases through the ledger's own read, and keeps each request and response. The summary lists sentences per message and the score by message length.
// Usage: bun tools/decider-ledger-check.ts <cases.jsonl> <payload-folder> --summary <file.md> --prices <file.json> --max-usd <n> [--typesafe-base-url <url>]
// `tools/claim-check-launch.ts` holds the road every tuning run shares.
import { launch } from "./claim-check-launch.ts";

process.exitCode = await launch("ledger", "tools/decider-ledger-check.ts");
