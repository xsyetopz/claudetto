"""ADR-0182 A/B: "Reply in plain English." against no line.

Usage: python3 -I run.py OUT.jsonl REPS MODEL[,MODEL...]
"""
import concurrent.futures as cf
import json
import os
import subprocess
import sys

PROMPTS = [
    "Explain what a write-ahead log does and why databases use one.",
    "Compare optimistic and pessimistic locking and say when to use each.",
    "Explain what ECONNRESET during an HTTP keep-alive request usually means and how to debug it.",
    "Explain how prompt caching lowers the cost of repeated LLM API calls.",
    "Explain what git rebase does compared with git merge, and the risks.",
    "Explain why a React component re-renders more often than expected and how to find the cause.",
]
ARMS = {"none": None, "plain": "Reply in plain English."}


def one(job):
    out, model, arm, pid, rep = job
    cmd = ["claude", "-p", "--model", model, "--effort", "medium", "--setting-sources", "project",
           "--strict-mcp-config", "--no-session-persistence", "--tools", "", "--output-format", "json"]
    if ARMS[arm]:
        cmd += ["--append-system-prompt", ARMS[arm]]
    cmd += ["--", PROMPTS[pid]]
    env = dict(os.environ, CLAUDE_CODE_DISABLE_CLAUDE_MDS="1")
    p = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=600)
    try:
        j = json.loads(p.stdout)
    except ValueError:
        j = {"result": "", "error": p.stderr[-300:]}
    rec = {"model": model, "arm": arm, "prompt": pid, "rep": rep, "cost": j.get("total_cost_usd"),
           "usage": j.get("usage"), "result": j.get("result") or ""}
    with open(out, "a") as f:
        f.write(json.dumps(rec) + "\n")
    return rec


def main():
    out, reps, models = sys.argv[1], int(sys.argv[2]), sys.argv[3].split(",")
    jobs = [(out, m, a, p, r) for r in range(reps) for p in range(len(PROMPTS)) for m in models for a in ARMS]
    with cf.ThreadPoolExecutor(4) as ex:
        for rec in ex.map(one, jobs):
            print(rec["model"], rec["arm"], rec["prompt"], rec["rep"], len(rec["result"]), rec["cost"], flush=True)


main()
