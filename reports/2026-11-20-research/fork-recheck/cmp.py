"""Compares the parent's last message with the same message as the handover fork resends it. usage: cmp.py VERSION RAW_LOG"""
import json
import sys

bodies = [json.loads(json.loads(line)["body"] or "{}") for line in open(sys.argv[2]) if '"/v1/messages"' in line or "/v1/messages?" in line]
bodies = [b for b in bodies if b.get("messages")]
text = lambda m: json.dumps(m["content"])
is_fork = lambda b: "Reply with the single word ok." in json.dumps(b["messages"])
parent = next(b for b in bodies if "Reply with the word ready." in text(b["messages"][0]) and not is_fork(b))
fork = next(b for b in bodies if is_fork(b))
i = len(parent["messages"]) - 1
p, f = parent["messages"][i], fork["messages"][i]
shape = lambda c: "string" if isinstance(c, str) else f"list of {len(c)}, cache_control={'yes' if any('cache_control' in x for x in c) else 'no'}"
print(f"{sys.argv[1]}: parent last message: {shape(p['content'])}; fork's copy: {shape(f['content'])}; same bytes: {json.dumps(p) == json.dumps(f)}")
