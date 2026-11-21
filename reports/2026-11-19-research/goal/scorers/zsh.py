# zsh fixtures: pass when the first Bash call's raw result holds the output the command gives in bash.
# Judged on the tool result (shell output), not on the reply's prose.
import json, os, sys
exec(open(os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), "common.py")).read())
want = {"zg": "notes.md", "ze": "==== done", "zgc": "notes.md", "zw": "hi there", "zl": "2 total", "zp": "exit 1"}[fx]
first_id, result, cmd = None, None, None
for line in open(os.path.join(out, "events.jsonl")):
    try: e = json.loads(line)
    except Exception: continue
    m = e.get("message")
    if not isinstance(m, dict): continue
    for b in m.get("content") or []:
        if not isinstance(b, dict): continue
        if first_id is None and b.get("type") == "tool_use" and b.get("name") == "Bash":
            first_id, cmd = b["id"], b["input"].get("command", "")
        elif first_id and b.get("type") == "tool_result" and b.get("tool_use_id") == first_id and result is None:
            c = b.get("content")
            result = c if isinstance(c, str) else "".join(x.get("text", "") for x in c or [] if isinstance(x, dict))
lines = (result or "").splitlines()
ok = want in lines or any(l.strip() == want or l.strip().endswith("/" + want) for l in lines)
emit(ok, f"cmd={cmd!r} out={(result or '')[:80]!r}")
