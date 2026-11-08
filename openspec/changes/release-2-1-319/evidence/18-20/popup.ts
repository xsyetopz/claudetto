// 18.20 round 5: run one session as the SDK host, so `AskUserQuestion` exists and is answered.
// Probed on the fake API (README): `-p` alone drops the tool; `--input-format stream-json --permission-prompt-tool stdio`
// offers it and sends a `can_use_tool` control_request. This host picks each question's first option and denies any other request.
import type { Launch } from "/tmp/claudekit-leftovers/claudekit/src/launcher/launcher.ts";

export interface PopupRun { stdout: string; asked: number; denied: string[]; exit: number | null; capped: boolean }

export const runPopup = async (l: Launch, prompt: string, capTokens: number, timeoutMs = 300_000): Promise<PopupRun> => {
	// buildLaunch ends argv with `-- <prompt>`; the prompt goes over stdin instead.
	const argv = [...l.argv.slice(0, -2), "--input-format", "stream-json", "--permission-prompt-tool", "stdio"];
	const proc = Bun.spawn(argv, { cwd: l.cwd, env: l.env, stdin: "pipe", stdout: "pipe", stderr: "ignore" });
	const send = (o: unknown): void => { proc.stdin.write(`${JSON.stringify(o)}\n`); proc.stdin.flush(); };
	send({ type: "user", message: { role: "user", content: prompt } });
	const timer = setTimeout(() => proc.kill(), timeoutMs);
	const decoder = new TextDecoder();
	let stdout = "";
	let rest = "";
	let asked = 0;
	let capped = false;
	let tokens = 0;
	const denied: string[] = [];
	for await (const chunk of proc.stdout) {
		const text = decoder.decode(chunk, { stream: true });
		stdout += text;
		const lines = (rest + text).split("\n");
		rest = lines.pop() ?? "";
		for (const line of lines.filter((x) => x.startsWith("{"))) {
			const f = JSON.parse(line);
			if (f.type === "control_request" && f.request?.subtype === "can_use_tool") {
				const r = f.request;
				let response: Record<string, unknown>;
				if (r.tool_name === "AskUserQuestion") {
					asked++;
					const qs: { question: string; options: { label: string }[] }[] = r.input.questions;
					response = { behavior: "allow", updatedInput: { ...r.input, answers: Object.fromEntries(qs.map((q) => [q.question, q.options[0]?.label ?? ""])) } };
				} else {
					denied.push(r.tool_name);
					response = { behavior: "deny", message: "no host answer for this tool" };
				}
				send({ type: "control_response", response: { subtype: "success", request_id: f.request_id, response } });
			}
			// Each assistant frame carries one request's usage; the sum is the session's cost in tokens.
			const u = f.type === "assistant" ? f.message?.usage : undefined;
			if (u) {
				tokens += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.output_tokens ?? 0);
				if (tokens > capTokens && !capped) { capped = true; proc.kill(); }
			}
			if (f.type === "result") proc.stdin.end();
		}
	}
	clearTimeout(timer);
	return { stdout, asked, denied, exit: await proc.exited, capped };
};
