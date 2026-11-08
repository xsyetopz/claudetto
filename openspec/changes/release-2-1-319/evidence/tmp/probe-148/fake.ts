// Fake Messages API for the long session: seven Reads, then a final reply that reports the context's size, a handoff for a fork, a summary for core compaction, then numbered text.
import { appendFileSync, writeFileSync } from "node:fs";
import { FAKE, jsonResponse, streamResponse, textMessage, textStream, toolAnswer } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/api/answer.ts";
import { carriesTools, streams } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/api/match.ts";
const D = "/tmp/probe-148"; let n = 0, reads = 0;
const s = Bun.serve({ hostname: "127.0.0.1", port: 0, idleTimeout: 0, fetch: async (r) => {
  const p = new URL(r.url).pathname;
  if (!p.endsWith("/messages")) return new Response("{}", { headers: { "content-type": "application/json" } });
  const raw = await r.text(); const b = JSON.parse(raw); n++;
  appendFileSync(`${D}/fake-bodies.jsonl`, raw + "\n");
  const tokens = Math.ceil(raw.length / 2.6);
  const stamp = { ...FAKE, id: `msg_fake_${n}`, model: "claude-sonnet-5-5", usage: { input_tokens: tokens, output_tokens: 1 } };
  if (!streams(b)) return jsonResponse(textMessage("ok", stamp));
  const fork = raw.includes("Write the handoff now");
  if (fork) return streamResponse(textStream("# Handoff\n\nFORK HANDOFF: seven parts read. Next: say DONE.\n", stamp));
  const summary = raw.includes("Respond with TEXT ONLY");
  if (summary) return streamResponse(textStream(`<analysis>x</analysis><summary>${"The seven parts were read; nothing else was done. ".repeat(120)}</summary>`, stamp));
  if (carriesTools(b) && reads < 7 && !raw.includes("Continue from the")) { reads++; return streamResponse(toolAnswer({ name: "Read", input: { file_path: `${D}/work/part${reads}.txt` } }, `toolu_fake_${reads}`, stamp)); }
  return streamResponse(textStream(reads === 7 && n < 12 ? "All seven parts read." : `DONE ${n}`, stamp));
} });
writeFileSync(`${D}/url.txt`, `http://127.0.0.1:${s.port}`);
