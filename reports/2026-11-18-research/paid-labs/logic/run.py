"""Seeded logic-bug review across models and efforts.

Usage: python3 -I run.py OUT.jsonl REPS MODEL:EFFORT[,MODEL:EFFORT...]
A bug case passes when ANSWER names a line within 1 of the gold line; a clean
case passes when ANSWER is none. Extra lines on a bug case count as false alarms.
"""
import concurrent.futures as cf
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cases import prepared  # noqa: E402

PROMPT = ("Review this Python code for correctness.\n\n```python\n{code}```\n\n"
          "List each bug with its line number. End with one line: "
          "ANSWER: <comma-separated bug line numbers>, or ANSWER: none.")


def numbered(code):
    return "".join(f"{n:>2} {line}\n" for n, line in enumerate(code.splitlines(), 1))


def one(job):
    out, arm, cid, code, gold, rep = job
    model, effort = arm.split(":")
    cmd = ["claude", "-p", "--model", model, "--effort", effort, "--setting-sources", "project",
           "--strict-mcp-config", "--no-session-persistence", "--tools", "", "--output-format", "json",
           "--", PROMPT.format(code=numbered(code))]
    env = dict(os.environ, CLAUDE_CODE_DISABLE_CLAUDE_MDS="1")
    p = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=600)
    try:
        j = json.loads(p.stdout)
    except ValueError:
        j = {"result": "", "error": p.stderr[-300:]}
    res = j.get("result") or ""
    tail = res.split("ANSWER:")[-1].strip().lower() if "ANSWER:" in res else ""
    lines = [int(x) for x in re.findall(r"\d+", tail.splitlines()[0])] if tail else []
    if gold is None:
        ok, extra = tail.startswith("none"), len(lines)
    else:
        ok = any(abs(n - gold) <= 1 for n in lines)
        extra = sum(1 for n in lines if abs(n - gold) > 1)
    rec = {"arm": arm, "case": cid, "rep": rep, "gold": gold, "lines": lines, "ok": ok, "extra": extra,
           "cost": j.get("total_cost_usd"), "usage": j.get("usage"), "result": res[-600:]}
    with open(out, "a") as f:
        f.write(json.dumps(rec) + "\n")
    return rec


def main():
    out, reps, arms = sys.argv[1], int(sys.argv[2]), sys.argv[3].split(",")
    cases = prepared()
    jobs = [(out, a, cid, code, gold, r) for r in range(reps) for cid, (code, gold) in cases.items() for a in arms]
    with cf.ThreadPoolExecutor(4) as ex:
        for rec in ex.map(one, jobs):
            print(rec["arm"], rec["case"], rec["rep"], rec["ok"], rec["lines"], rec["cost"], flush=True)


main()
