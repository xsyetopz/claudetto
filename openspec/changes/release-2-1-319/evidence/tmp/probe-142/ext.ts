import { readdirSync } from "node:fs";
const dir = process.env.HOME + "/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto";
const SECRET = /(sk-[A-Za-z0-9_-]{16,}|oat\d|OAUTH|TOKEN=|api[_-]?key|password|secret|Bearer |ghp_|xox[bp]-|AKIA)/i;
const out: any[] = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith(".jsonl"))) {
  const rows = (await Bun.file(`${dir}/${f}`).text()).split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const person: string[] = [];
  const said: string[] = [];
  let lastUser = ""; let turnTools = 0; let wrote = false;
  for (const r of rows) {
    if (r.type === "user" && !r.isSidechain) {
      const c = r.message?.content;
      const t = typeof c === "string" ? c : Array.isArray(c) && c.every((b: any) => b.type !== "tool_result") ? c.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") : "";
      if (t && !t.startsWith("<") && !r.isMeta) { person.push(t); lastUser = t; turnTools = 0; }
    } else if (r.type === "assistant" && !r.isSidechain) {
      const c = r.message?.content ?? [];
      turnTools += c.filter((b: any) => b.type === "tool_use").length;
      const txt = c.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
      if (txt) said.push(txt);
      const hasTool = c.some((b: any) => b.type === "tool_use");
      if (txt && !hasTool && r.message.stop_reason === "end_turn" && lastUser && !SECRET.test(txt) && !SECRET.test(lastUser))
        out.push({ session: f.slice(0, 8), user: lastUser, people: person.slice(-31, -1), reply: txt, shown: said.slice(-7, -1), tools: turnTools });
    }
  }
}
console.log(out.length);
await Bun.write("/tmp/probe-142/cands.json", JSON.stringify(out));
