// The aggregation of the usage report: one pass over the session transcripts.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { agentType, readEntries } from "../../lib/transcript.ts";
import {
  bestUsage,
  briefSize,
  callCost,
  firstLine,
  resultText,
  tokens,
  windowOf,
} from "./parse.ts";
import { listedSkills, rereadOf, runRow } from "./runs.ts";
import { summarize } from "./summary.ts";
import { maxTurns, reserve, turnsFromText } from "./turns.ts";
import type {
  AgentCall,
  AgentRun,
  CallRow,
  LimitedRun,
  MessageUsage,
  Pair,
  ReportOptions,
  ReportSums,
  Scope,
} from "./types.ts";

/**
 * The report of the transcripts under `root` that were written since `since`.
 * Options: `runLimit` (rows of the run tables), `agentsDir` (a folder of `agents/*.md` files for `maxTurns`),
 * `window` (the context window in tokens, or the window of each call's model),
 * and `configDir` (where the installed skills are read when the transcripts list none).
 */
export async function report(
  root: string,
  since: Date,
  options: ReportOptions = {},
) {
  const {
    runLimit = 20,
    agentsDir = null,
    window = null,
    configDir = process.env["CLAUDE_CONFIG_DIR"] ||
      path.join(os.homedir(), ".claude"),
  } = options;
  const listed = new Map<string, number>();
  const callRuns: CallRow[] = [];
  const byAgent: Record<string, number> = {};
  const entrypoints: Record<string, number> = {};
  const skills: Record<string, number> = {};
  let limitHits = 0;
  let total = 0;
  let overWindow = 0;
  let rewrites = 0;
  let expectedCost = 0;
  const expected = { first: 0, compaction: 0, model: 0 };
  // Main-conversation turns by what started them: a background agent's
  // report or task notification, or anything else (mostly the user).
  const turns = { wake: 0, other: 0 };
  // Wake turns by entrypoint: the fork-mode setting that keeps agents in the
  // foreground may not reach SDK sessions.
  const wakes: Record<string, number> = {};
  let wakeCost = 0;
  const advisor = { calls: 0, cost: 0 };
  // Input tokens and cache reads, for all calls and for the main conversation.
  const cache: { all: Pair; main: Pair } = { all: [0, 0], main: [0, 0] };
  // Issue #83913: the first call after a prompt, while the 5-minute cache is
  // still warm, split by whether tool or prompt hook `additionalContext` is
  // in the history. [calls, cache writes, context] per bucket.
  const first: ReportSums["first"] = { with: [0, 0, 0], without: [0, 0, 0] };
  // dotclaude agent runs with a turn limit, and whether each one reached
  // the reserve where tool calls stop.
  const limited: LimitedRun[] = [];
  // Output tokens, messages, and messages without a final record.
  const output = { tokens: 0, messages: 0, unfinished: 0 };
  // Delegation: main assistant turns, subagent runs, the tokens that tool
  // results add to each main session, and what each `Agent` call said.
  let mainTurns = 0;
  const runsByType: Record<string, number> = {};
  const sessionResultTokens: number[] = [];
  const runs: AgentRun[] = [];
  const agentCalls = new Map<string | undefined, AgentCall>();
  const files = fs
    .readdirSync(root, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => path.join(root, f))
    .filter((f) => fs.statSync(f).mtimeMs >= since.getTime());
  for (const file of files) {
    const type: string = await agentType(file);
    const limit = type === "main" ? null : await maxTurns(type, agentsDir);
    if (limit)
      limited.push({
        type,
        capped:
          turnsFromText(await Bun.file(file).text()) >= limit - reserve(limit),
        ...(await briefSize(file)),
      });
    const seen = new Set<string | undefined>();
    let fileCost = 0;
    let resultTokens = 0;
    let handback = "";
    let wake = false;
    let hookContext = false;
    let firstPending = false;
    let lastCallAt: number | null = null;
    let lastModel: string | null | undefined = null;
    let compacted = false;
    let entrypoint: string | null = null;
    const rereads: number[] = [];
    const entries = await readEntries(file);
    const best = bestUsage(entries);
    for (const entry of entries) {
      // A line with no `timestamp` gives an invalid date, so each comparison with `since` is false.
      const when = new Date(entry.timestamp ?? Number.NaN);
      if (type === "main" && !entrypoint && entry.entrypoint && when >= since) {
        entrypoint = entry.entrypoint;
        entrypoints[entrypoint] = (entrypoints[entrypoint] ?? 0) + 1;
      }
      const m = entry.message;
      switch (entry.type) {
        case "assistant":
          if (when < since) break;
          if (entry.error === "rate_limit") limitHits += 1;
          // One API message can span several entries, one per content block,
          // so a tool call is counted by its own id and not by the message id.
          for (const b of Array.isArray(m?.content) ? m.content : []) {
            if (b.type !== "tool_use") continue;
            if (b.name === "Skill" && b.input?.skill && !seen.has(b.id)) {
              seen.add(b.id);
              skills[b.input.skill] = (skills[b.input.skill] ?? 0) + 1;
            }
            if (type === "main" && (b.name === "Agent" || b.name === "Task"))
              agentCalls.set(b.id, {
                description: b.input?.description ?? "",
                handback: "",
              });
            if (type !== "main" && b.name === "SubagentHandback")
              handback = firstLine(b.input?.message);
          }
          break;
        case "attachment":
          if (entry.attachment?.type === "skill_listing")
            for (const s of listedSkills(entry.attachment))
              listed.set(s.name, Math.max(listed.get(s.name) ?? 0, s.chars));
          if (
            entry.attachment?.type === "hook_additional_context" &&
            entry.attachment.hookEvent !== "SessionStart"
          )
            hookContext = true;
          break;
        case "system":
          if (entry.subtype === "compact_boundary") compacted = true;
          break;
        case "user":
          if (type === "main") {
            const content = m?.content;
            if (when >= since)
              for (const b of Array.isArray(content) ? content : []) {
                if (b.type !== "tool_result") continue;
                const text = resultText(b.content);
                // Estimate with the shared token estimate, from content length.
                resultTokens += tokens(text);
                const call = agentCalls.get(b.tool_use_id);
                if (call) {
                  call.handback = firstLine(text);
                  call.agentId =
                    entry.toolUseResult?.agentId ??
                    text.match(/agentId: (\w+)/)?.[1];
                }
              }
            const toolResult =
              Array.isArray(content) &&
              content.some((b) => b.type === "tool_result");
            // Meta reminders without an origin continue the current turn.
            if (!toolResult && !(entry.isMeta && !entry.origin)) {
              const kind = entry.origin?.kind;
              wake = kind === "peer" || kind === "task-notification";
              firstPending = true;
              if (when >= since) {
                turns[wake ? "wake" : "other"] += 1;
                const ep = entrypoint ?? "unknown";
                if (wake) wakes[ep] = (wakes[ep] ?? 0) + 1;
              }
            }
            continue;
          }
          break;
      }
      if (entry.type !== "assistant" || !m?.usage) continue;
      if (when < since || seen.has(m.id)) continue;
      seen.add(m.id);
      const { usage, final } = best.get(m.id) as MessageUsage;
      output.tokens += usage.output_tokens ?? 0;
      output.messages += 1;
      if (!final) output.unfinished += 1;
      const c = callCost(m.model, usage);
      rereads.push(rereadOf(usage));
      const at = when.getTime();
      if (firstPending && lastCallAt !== null && at - lastCallAt < 300_000) {
        const b = first[hookContext ? "with" : "without"];
        b[0] += 1;
        b[1] += usage.cache_creation_input_tokens ?? 0;
        b[2] += c.context;
      }
      firstPending = false;
      lastCallAt = at;
      for (const it of usage.iterations ?? []) {
        if (it.type !== "advisor_message") continue;
        const a = callCost(it.model, it).total;
        advisor.calls += 1;
        advisor.cost += a;
        c.total += a;
      }
      total += c.total;
      fileCost += c.total;
      if (type === "main") mainTurns += 1;
      byAgent[type] = (byAgent[type] ?? 0) + c.total;
      if (c.context > (window ?? windowOf(m.model))) overWindow += c.total;
      if (c.rewrite) {
        const reason =
          lastModel === null
            ? "first"
            : compacted
              ? "compaction"
              : m.model !== lastModel
                ? "model"
                : null;
        if (reason) {
          expected[reason] += 1;
          expectedCost += c.write;
        } else rewrites += c.write;
      }
      lastModel = m.model;
      compacted = false;
      if (type === "main" && wake) wakeCost += c.total;
      const scopes: Scope[] = type === "main" ? ["all", "main"] : ["all"];
      for (const key of scopes) {
        cache[key][0] += c.context;
        cache[key][1] += c.read;
      }
    }
    if (rereads.length)
      callRuns.push(
        runRow(
          path.basename(file, ".jsonl").replace(/^agent-/, ""),
          type,
          rereads,
        ),
      );
    if (type === "main") sessionResultTokens.push(resultTokens);
    else {
      runsByType[type] = (runsByType[type] ?? 0) + 1;
      runs.push({
        id: path.basename(file, ".jsonl").replace(/^agent-/, ""),
        type,
        cost: fileCost,
        handback,
        at: fs.statSync(file).mtimeMs,
      });
    }
  }
  return summarize({
    advisor,
    agentCalls,
    byAgent,
    cache,
    entrypoints,
    expected,
    expectedCost,
    first,
    limitHits,
    limited,
    mainTurns,
    output,
    overWindow,
    rewrites,
    runLimit,
    runs,
    runsByType,
    sessionResultTokens,
    listed,
    skills,
    total,
    turns,
    callRuns,
    configDir,
    wakeCost,
    wakes,
  });
}
