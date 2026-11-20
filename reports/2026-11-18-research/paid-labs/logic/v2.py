"""Logic bugs inside a design review: one module, four seeded bugs, two prompts.

Usage: python3 -I v2.py OUT.jsonl REPS MODEL:EFFORT[,...]
A bug counts as caught when the reply cites its line (within 1) and the reply
text near that citation is not empty. The design prompt never asks for bugs.
"""
import concurrent.futures as cf
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cases import CASES  # noqa: E402

ORDER = ["C1", "L1", "L3", "C2", "L5", "L7"]
PROMPTS = {
    "design": "Review the design of this utility module: structure, naming, responsibilities and API shape. "
              "Cite line numbers for each point.",
    "correct": "Review this utility module for correctness. Cite line numbers for each point.",
}


def module():
    lines, gold = [], {}
    for cid in ORDER:
        for line in CASES[cid].splitlines():
            if line.endswith("# @BUG"):
                gold[cid] = len(lines) + 1
                line = line[: -len("# @BUG")].rstrip()
            lines.append(line)
        lines += ["", ""]
    # cases.py imports sit mid-file per case; hoist them so the module reads naturally.
    imports = [l for l in lines if l.startswith(("import ", "from "))]
    body = [l for l in lines if not l.startswith(("import ", "from "))]
    shift = len(imports) + 1
    gold = {k: v - sum(1 for l in lines[:v - 1] if l.startswith(("import ", "from "))) + shift for k, v in gold.items()}
    return imports + [""] + body, gold


def one(job):
    out, arm, kind, rep, text, gold = job
    model, effort = arm.split(":")
    prompt = PROMPTS[kind] + "\n\n```python\n" + text + "```"
    cmd = ["claude", "-p", "--model", model, "--effort", effort, "--setting-sources", "project",
           "--strict-mcp-config", "--no-session-persistence", "--tools", "", "--output-format", "json", "--", prompt]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=600,
                       env={**os.environ, "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1"})
    try:
        j = json.loads(p.stdout)
    except ValueError:
        j = {"result": ""}
    res = j.get("result") or ""
    cited = {int(n) for n in re.findall(r"\b(?:lines?|L)\s*(\d+)", res, flags=re.I)}
    # A short range ("lines 9-11") cites each line in it; long ranges cite a whole function, not a line.
    cited |= {n for a, b in re.findall(r"\b(\d+)\s*[-–]\s*(\d+)", res)
              if 0 <= int(b) - int(a) <= 4 for n in range(int(a), int(b) + 1)}
    caught = {k: any(abs(n - v) <= 1 for n in cited) for k, v in gold.items()}
    rec = {"arm": arm, "kind": kind, "rep": rep, "caught": caught, "cost": j.get("total_cost_usd"), "result": res}
    with open(out, "a") as f:
        f.write(json.dumps(rec) + "\n")
    return rec


def main():
    out, reps, arms = sys.argv[1], int(sys.argv[2]), sys.argv[3].split(",")
    lines, gold = module()
    text = "".join(f"{n:>3} {l}\n" for n, l in enumerate(lines, 1))
    jobs = [(out, a, k, r, text, gold) for r in range(reps) for k in PROMPTS for a in arms]
    with cf.ThreadPoolExecutor(4) as ex:
        for rec in ex.map(one, jobs):
            print(rec["arm"], rec["kind"], rec["rep"], sum(rec["caught"].values()), rec["caught"], rec["cost"], flush=True)


if __name__ == "__main__":
    main()
