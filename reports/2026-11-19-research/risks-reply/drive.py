#!/usr/bin/env python3
"""Drive one claude -p stream-json session; answer AskUserQuestion with the first option; log tool calls.
usage: drive.py <repo> <outdir> <prompt> [claude extra args...]   (env passed through)"""
import json, subprocess, sys, os
repo, out, prompt, *extra = sys.argv[1:]
os.makedirs(out, exist_ok=True)
args = ["claude", "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
        "--permission-prompt-tool", "stdio", "--model", os.environ.get("DRIVE_MODEL", "claude-sonnet-5-5"),
        "--max-budget-usd", os.environ.get("DRIVE_BUDGET", "0.6"),
        "--setting-sources", "project", "--strict-mcp-config", "--permission-mode", "acceptEdits",
        "--allowedTools", "Bash Read Edit Write Glob Grep AskUserQuestion", "--no-session-persistence"] + extra
# DRIVE_EFFORT: per-model effort arm (claude --help: low, medium, high, xhigh, max); unset keeps the model default.
if os.environ.get("DRIVE_EFFORT"): args[1:1] = ["--effort", os.environ["DRIVE_EFFORT"]]
# DRIVE_DENY=<text>: Bash leaves the allow list, so each Bash call reaches the driver, which declines as the user
# would at the prompt when the command contains <text> and allows the rest (RISK-503 controls).
deny = os.environ.get("DRIVE_DENY", "")
if deny: args[args.index("Bash Read Edit Write Glob Grep AskUserQuestion")] = "Read Edit Write Glob Grep AskUserQuestion"
# acceptEdits allows `rm` inside the project without a prompt, so the driver never saw the call (batch15 drc
# vanilla, 6/6 runs ran rm); default mode sends every Bash call to the prompt.
if deny: args[args.index("acceptEdits")] = "default"
p = subprocess.Popen(args, cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=open(out + "/err.txt", "w"), text=True)
def send(o): p.stdin.write(json.dumps(o) + "\n"); p.stdin.flush()
send({"type": "user", "message": {"role": "user", "content": prompt}})
log = open(out + "/events.jsonl", "w")
tools, ask, result = [], 0, {}
for line in p.stdout:
    log.write(line)
    try: e = json.loads(line)
    except Exception: continue
    if e.get("type") == "assistant":
        for b in e["message"].get("content", []):
            if b.get("type") == "tool_use": tools.append(b["name"])
    if e.get("type") == "control_request" and e["request"].get("subtype") == "can_use_tool":
        r = e["request"]; inp = r.get("input", {})
        if r["tool_name"] == "AskUserQuestion":
            ask += 1
            ans = {q["question"]: q["options"][0]["label"] for q in inp.get("questions", [])}
            resp = {"behavior": "allow", "updatedInput": {**inp, "answers": ans}}
        elif deny and r["tool_name"] == "Bash" and deny in inp.get("command", ""):
            resp = {"behavior": "deny", "message": "The user doesn't want to proceed with this tool use. The tool use was rejected."}
        else:
            resp = {"behavior": "allow", "updatedInput": inp}
        send({"type": "control_response", "response": {"subtype": "success", "request_id": e["request_id"], "response": resp}})
    if e.get("type") == "result":
        result = e; break
try: p.stdin.close()
except Exception: pass
p.wait(timeout=30)
json.dump({"tools": tools, "ask": ask, "cost": result.get("total_cost_usd", 0), "answer": result.get("result", "")}, open(out + "/summary.json", "w"))
print(json.dumps({"ask": ask, "tools": tools, "cost": result.get("total_cost_usd", 0)}))
