# 17.14: a denied tool call is not a look

Hypothesis: a `tool.check` deny reaches a `tool.call` hook's `next(e)` as `{ deny }`.
Prediction: the probe's `tool.call` log shows `deny` set on the refused `Read`.

Command, with the throwaway plugin in `/tmp/probe-17-14/plugin` (a `tool.check` that denies `Read`, and a `tool.call` and Stop logger):

```sh
claude -p "Use the Read tool on /tmp/probe-17-14/x.txt and tell me its first line. If it fails, just say so." \
  --model haiku --max-turns 3 --no-session-persistence --plugin-dir /tmp/probe-17-14/plugin --allowedTools=Read < /dev/null
```

Result: the hypothesis is wrong. `tool.call` got `{ isError: true, text: "Permission to use Read denied by plugin probe1714: …" }`, with no `deny`, and the Stop hook's `$.session.messages()` shows the same `isError: true`. That is the shape of a call that ran and failed, so only `tool.check` tells a denial apart. The fix records the ids that `tool.check` denied, in `stopHooks`, which `register` puts before `pin`. `claimTurn` skips them.

Probe hooks (`plugin/hooks/m.ts`):

```ts
const log: unknown[] = [];
export const register = (on: any): void => {
	on("tool.call", async ($: any, e: any, next: any) => {
		const a = await next(e);
		log.push({ at: "tool.call", tool: e.tool, id: e.tool_use_id, deny: a.deny, isError: a.isError, text: a.text });
		await $.fs.write("/tmp/probe-17-14/log.json", JSON.stringify(log, null, 1));
		return a;
	});
	on("tool.check", { tool: "Read" }, () => ({ decision: "deny", reason: "PROBE-DENY answer first" }));
	on("classic.Stop", async ($: any, e: any, next: any) => {
		const ms = await $.session.messages();
		log.push({ at: "stop", uses: ms.flatMap((m: any) => m.toolUses.map((u: any) => ({ id: u.tool_use_id, tool: u.tool, isError: u.isError, text: u.text }))) });
		await $.fs.write("/tmp/probe-17-14/log.json", JSON.stringify(log, null, 1));
		return next(e);
	});
};
```

Probe log (`log.json`):

```json
[
 {
  "at": "tool.call",
  "tool": "Read",
  "id": "toolu_01HPonmhmzXpvKBULGaFrCx2",
  "isError": true,
  "text": "Permission to use Read denied by plugin probe1714: PROBE-DENY answer first"
 },
 {
  "at": "stop",
  "uses": [
   {
    "id": "toolu_01HPonmhmzXpvKBULGaFrCx2",
    "tool": "Read",
    "isError": true,
    "text": "Permission to use Read denied by plugin probe1714: PROBE-DENY answer first"
   }
  ]
 }
]
```

Lab: `hooks/limits/verify.test.ts`, "a turn whose only lookup was denied is still offered the unchecked-claim fault". Full lab 1207 pass; the committed slice alone in a clean worktree 1206 pass.
Mutant: `claimTurn` without `|| denied.has(use.tool_use_id)` fails that test (1206 pass, 1 fail).
