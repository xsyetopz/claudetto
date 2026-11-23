"""Shared helpers: load the run summary, the Bash commands and the Read paths from events.jsonl, and print one line."""
import json, os, subprocess

def load(out):
    path = os.path.join(out, "summary.json")
    s = json.load(open(path)) if os.path.exists(path) else {}
    bash, reads = [], []
    for line in open(os.path.join(out, "events.jsonl")):
        try: e = json.loads(line)
        except Exception: continue
        # drive.py can exit on its post-result wait before it writes summary.json; the result event holds the same fields.
        if e.get("type") == "result" and not s: s = {"cost": e.get("total_cost_usd", 0), "answer": e.get("result", "")}
        c = (e.get("message") or {}).get("content")
        for b in c if isinstance(c, list) else []:
            if b.get("type") == "tool_use":
                if b["name"] == "Bash": bash.append(b["input"].get("command", ""))
                if b["name"] in ("Read", "Grep"): reads.append(json.dumps(b["input"]))
    return s, bash, reads

def changed(repo, path):
    return subprocess.run(["git", "diff", "--quiet", "HEAD", "--", path], cwd=repo).returncode != 0

def emit(name, verdict, detail, s):
    print(f"{name}\t{verdict}\t{detail}\t${s.get('cost', 0):.3f}")
