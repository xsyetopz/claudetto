// Probe J (RT-022): store a marker after each main turn; prompt.context appends it as a block and logs each call.
const LOG = "/Users/krystian/CodeProjects/xsyetopz/claudetto/reports/2026-11-18-research/handover-probes/probe-j/probe.log";
const log = async ($, line) => {
  const old = (await $.fs.exists(LOG)) ? await $.fs.read(LOG) : "";
  await $.fs.write(LOG, old + line + "\n");
};
export const register = (on) => {
  on("turn.complete", async ($, e, next) => {
    const out = await next(e);
    if (e.agentId === undefined) { await $.store.set("pending", "HANDOVER-MARK-7"); await log($, "turn.complete stored"); }
    return out;
  });
  on("prompt.context", async ($, e, next) => {
    const r = await next(e);
    const p = await $.store.get("pending");
    await log($, `prompt.context blocks=${r.blocks.map((b) => b.name)} pending=${p ?? "none"}`);
    if (!p) return r;
    await $.store.delete("pending");
    return { ...r, blocks: [...r.blocks, { name: "handover", text: p }] };
  });
  on("session.end", async ($, e, next) => { await log($, "session.end " + JSON.stringify(e)); return next(e); });
};
