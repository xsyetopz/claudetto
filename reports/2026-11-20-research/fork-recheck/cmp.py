"""Compares the parent's messages[1] (the engine's role-system block) with the same message as the handover fork resends it.
usage: cmp.py VERSION RAW_LOG. Exit 0 when the shapes match (the ENGINE workaround can go), 1 when they differ."""
import json
import sys

bodies = [json.loads(json.loads(line)["body"] or "{}") for line in open(sys.argv[2]) if '"/v1/messages"' in line or "/v1/messages?" in line]
bodies = [b for b in bodies if b.get("messages")]
is_fork = lambda b: "Reply with the single word ok." in json.dumps(b["messages"])
parent = next(b for b in bodies if not is_fork(b))
fork = next(b for b in bodies if is_fork(b))
p, f = parent["messages"][1], fork["messages"][1]
shape = lambda c: "string" if isinstance(c, str) else f"list of {len(c)}, cache_control={'yes' if any('cache_control' in x for x in c) else 'no'}"
same = json.dumps(p["content"]) == json.dumps(f["content"])
print(f"{sys.argv[1]}: messages[1] role {p['role']}; parent: {shape(p['content'])}; fork's copy: {shape(f['content'])}; same bytes: {same}")
sys.exit(0 if same else 1)
