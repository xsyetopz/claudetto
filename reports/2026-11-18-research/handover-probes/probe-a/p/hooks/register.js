// Probe A: fork a handover after turn 1, store it, run /clear, inject it through prompt.context.
const LOG = "/Users/krystian/CodeProjects/xsyetopz/claudetto/reports/2026-11-18-research/handover-probes/probe-a/probe.log";
const log = async ($, line) => {
  const old = (await $.fs.exists(LOG)) ? await $.fs.read(LOG) : "";
  await $.fs.write(LOG, old + line + "\n");
};
export const register = (on) => {
  let turn = 0;
  on("turn.complete", async ($, e, next) => {
    const out = await next(e);
    if (e.agentId === undefined) {
      turn++;
      await log($, `turn.complete #${turn} keys=${Object.keys(e).join(",")}`);
      if (turn === 1) {
        let r;
        try { r = await $.model.fork({ prompt: "Write a handover: goal, facts, open items. Max 80 words.", effort: "low" }); }
        catch (err) { await log($, "fork threw " + err.message); }
        await log($, "fork result " + JSON.stringify(r));
        if (r && r.isAnswered) await $.store.set("pending", r.text);
        try { const c = await $.command.run({ command: "clear" }); await log($, "command.run clear -> " + JSON.stringify(c)); }
        catch (err) { await log($, "command.run threw " + err.message); }
      }
    }
    return out;
  });
  on("command.run", async ($, e, next) => {
    await log($, `command.run ${e.command} origin=${JSON.stringify(e.origin)}`);
    return next(e);
  });
  on("prompt.context", async ($, e, next) => {
    const r = await next(e);
    const pending = await $.store.get("pending");
    await log($, `prompt.context blocks=${r.blocks.map((b) => b.name)} pending=${pending ? "yes" : "no"}`);
    if (pending) {
      await $.store.delete("pending");
      return { ...r, blocks: [...r.blocks, { name: "handover", text: pending }] };
    }
    return r;
  });
  on("session.start", async ($, e, next) => { await log($, "session.start " + JSON.stringify(e)); return next(e); });
  on("session.end", async ($, e, next) => { await log($, "session.end " + JSON.stringify(e)); return next(e); });
  on("session.compact", async ($, e, next) => { await log($, "session.compact trigger=" + e.trigger); return next(e); });
};
