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


## Follow-up: a refused ask

Hypothesis: an ask the session refuses (headless, `dontAsk`, or the person saying no) also reaches `tool.call` only as `isError`, so it still counted as a look.
Prediction: with the logging plugin and `--permission-mode dontAsk`, `tool.check` gives `ask` and `tool.call` gives an error whose text is the CLI's refusal, and the file is not created.

Command: the probe plugin in `/tmp/probe-17-14/plugin` (it logs `tool.check`, `tool.call` and `classic.PermissionDenied`), in `/tmp/probe-17-14`, `DISABLE_TELEMETRY=1 claude -p "Run exactly this Bash command once: touch /tmp/probe-17-14/y.txt   If it is refused, say so and stop." --model haiku --max-turns 3 --no-session-persistence --setting-sources "" --permission-mode dontAsk --plugin-dir /tmp/probe-17-14/plugin < /dev/null`.

Result: as predicted; `y.txt` was not created and `PermissionDenied` did not fire. Log, texts cut at 120 characters:

```json
[
 {
  "at": "tool.check",
  "tool": "Bash",
  "id": "toolu_01GD5NdH5VQ6Z61nYQXZfQex",
  "decision": "ask",
  "reason": "touch in '/tmp/probe-17-14/y.txt' needs approval. The path is inside the working directories for this session ('/private/tmp/probe-17-14', '/tmp/probe-17-14'), and Claude Code asks before a shell command creates, changes or removes files there."
 },
 {
  "at": "tool.call",
  "tool": "Bash",
  "id": "toolu_01GD5NdH5VQ6Z61nYQXZfQex",
  "isError": true,
  "text": "Permission to use Bash has been denied because Claude Code is running in don't ask mode. IMPORTANT: You *may* attempt to …",
  "result": "Error: Permission to use Bash has been denied because Claude Code is running in don't ask mode. IMPORTANT: You *may* att …",
  "ref": 1
 }
]
```

The earlier run in default headless mode gave `ask` with the same reason, and a `tool.call` error whose `text` was that reason, word for word. Its log was overwritten by the run above, so only the in-session reading stands for it. The CLI's other refusal texts, "The user doesn't want to proceed with this tool use" and "Permission for this tool use was denied", come from its source.

Fix (b80a5f1f): `stopHooks` keeps the ids `tool.check` asked about. A `tool.call` error for such an id counts as denied when its text is the ask's reason or starts with one of the CLI refusal texts.

Lab: `hooks/limits/verify.test.ts`, the three "an ask refused with …" tests and "an ask that was allowed and then failed is still a lookup"; full lab 1211 pass, the committed slice alone in a clean worktree 1210 pass. The lab refuses an ask inside its own `tool.call`, so the test's check stub answers `ask` once and `allow` after that, and the stubbed result is what reaches the hook.
Mutants, each caught: without the reason match (1 fail), without the refusal texts (2 fail), every asked call counted as refused (1 fail).
