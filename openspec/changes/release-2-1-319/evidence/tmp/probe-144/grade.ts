// usage: bun --env-file=<repo>/.env grade.ts SPLIT VARIANT(h1|h2) [MODEL] [CONC]
import { GRADE_FAULTS, type GradeFault } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/texts.ts";
import { parseFaults } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/verify.ts";
import { held } from "./held.ts";
import { tune } from "./tune.ts";
const [split = "tune", variant = "h1", model = "haiku", conc = "8"] = Bun.argv.slice(2);
const fx = split === "tune" ? tune : held;
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(k)) env[k] = v;
Object.assign(env, { CLAUDE_CONFIG_DIR: "/tmp/probe-122/cfg", DISABLE_TELEMETRY: "1", DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1" });

const UNSEEN = (variantName: string) => variantName === "h2"
  ? "The reply names a block, change, setting, value, or earlier event with words that stand for text the user was never shown (the listed candidates come from tool output the user did not see), and the reply does not itself give that text and its file:line. A reply that quotes the text and its file:line, or names only what the user wrote or was shown, is not this fault."
  : "The reply names a block, change, setting, value, or earlier event that appears only in the tool output listed below (the user sees none of it in full) and in no user message and no earlier assistant message, and the reply does not itself give that text or value with its file:line. A reply that quotes the text and gives its file:line, or names only what the user wrote or was shown, is not this fault.";
const spans = (reply: string) => [...new Set([...reply.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]!))];
export const candidates = (f: any) => {
  const seen = [...f.people, ...f.shown, f.user].join("\n");
  const out = f.results.map((r: any) => r.text).join("\n");
  return spans(f.reply).filter((s) => out.includes(s) && !seen.includes(s));
};
const prompt = (f: any, codes: GradeFault[], cands: string[]) => {
  const tools = f.results.slice(-8).map((r: any) => `- ${r.tool} ${r.arg.slice(0, 120)}\n${r.text.slice(0, 400)}`).join("\n");
  const section = `\n\nTool output of this turn, read by the assistant and NOT shown to the user:\n${tools || "- none"}${variant === "h2" ? `\n\nSpans of the reply that occur in that tool output and in nothing the user saw:\n${cands.map((c) => `- ${c}`).join("\n")}` : ""}`;
  return `You grade the final reply of a coding assistant for a fixed list of faults. Judge only the reply against the user's messages below; the user said nothing else.\n\nFaults, one code each:\n${codes.map((code) => `- ${code}: ${code === ("unseen" as any) ? UNSEEN(variant) : GRADE_FAULTS[code].test}`).join("\n")}\n\nAnswer with JSON only, no other text: {"faults":[{"code":"<code>","quote":"<the words copied exactly from the reply that show the fault>"}]}. A fault counts only when you can copy such words. A user message may be a long pasted note; its words are the user's words. Use {"faults":[]} when the reply has none of them. When unsure, answer {"faults":[]}.\n\nEarlier user messages:\n${f.people.map((p: string) => `- ${p.slice(0, 600)}`).join("\n") || "- none"}\n\nEarlier assistant messages, which are all the user has been shown besides tool output:\n${f.shown.map((p: string) => `- ${p.slice(0, 400)}`).join("\n") || "- none"}${section}\n\nUser message that opened this turn: ${f.user.slice(0, 3000)}\n\nAssistant reply:\n<reply>\n${f.reply.slice(0, 2500)}\n</reply>`;
};
const rows: any[] = [];
let n = 0, usd = 0;
const run = async (f: any) => {
  const cands = candidates(f);
  const codes = ["credited", "fallback", "unfiled", ...(variant === "h2" && cands.length === 0 || f.results.length === 0 ? [] : ["unseen"])] as GradeFault[];
  const t0 = Date.now();
  const p = Bun.spawn(["claude", "-p", prompt(f, codes, cands), "--model", model, "--tools", "", "--setting-sources", "", "--disable-slash-commands", "--no-session-persistence", "--output-format", "json"], { cwd: "/tmp/probe-144", env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const out = await new Response(p.stdout).text(); await p.exited;
  let j: any = {}; try { j = JSON.parse(out); } catch {}
  usd += Number(j.total_cost_usd ?? 0);
  const found = parseFaults(String(j.result ?? ""), codes, f.reply);
  rows.push({ id: f.id, label: f.label, cands: cands.length, offered: codes.includes("unseen" as any), found, ms: Date.now() - t0, usd: j.total_cost_usd, raw: String(j.result ?? "").slice(0, 220) });
};
await Promise.all(Array.from({ length: Number(conc) }, async () => { for (let i = n++; i < fx.length; i = n++) await run(fx[i]!); }));
const pos = rows.filter((r) => r.label === "pos"), neg = rows.filter((r) => r.label !== "pos");
const tp = pos.filter((r) => r.found.includes("unseen")), fp = neg.filter((r) => r.found.includes("unseen"));
console.log(`split=${split} variant=${variant} model=${model} usd=${usd.toFixed(4)} recall ${tp.length}/${pos.length} clean-flagged ${fp.length}/${neg.length} (near ${fp.filter((r) => r.label === "near").length}/${neg.filter((r) => r.label === "near").length}) other-faults-on-all ${rows.filter((r) => r.found.some((c: string) => c !== "unseen")).map((r) => r.id)}`);
console.log("cands on pos:", pos.map((r) => `${r.id}:${r.cands}`).join(" "), "| cands on neg>0:", neg.filter((r) => r.cands).length);
for (const r of rows.filter((r) => (r.label === "pos") !== r.found.includes("unseen"))) console.log("MISS", r.id, r.label, r.raw.replace(/\n/g, " "));
await Bun.write(`/tmp/probe-144/res-${split}-${variant}-${model}-${Date.now()}.json`, JSON.stringify(rows, null, 1));
