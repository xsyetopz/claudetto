# Prints the client-visible model events of one run and the requests the stub saw (issue #62).
import json, sys
res, log = sys.argv[1], sys.argv[2]
for line in open(res):
    try:
        o = json.loads(line)
    except ValueError:
        continue
    t, st = o.get("type"), o.get("subtype")
    if t == "system" and st == "init":
        print("  init model:", o.get("model"))
    elif t == "system" and st in ("model_fallback", "api_retry", "compact_boundary", "status"):
        keep = {k: o.get(k) for k in ("subtype", "trigger", "original_model", "fallback_model", "content", "error_status", "attempt", "status") if o.get(k) is not None}
        print("  system:", json.dumps(keep))
    elif t == "assistant":
        print("  assistant model:", o["message"].get("model"))
    elif t == "result":
        print("  result:", st, "is_error=%s" % o.get("is_error"), repr(str(o.get("result"))[:80]), "modelUsage:", sorted((o.get("modelUsage") or {}).keys()))
seen = {}
for line in open(log):
    r = json.loads(line)
    if not r["path"].startswith("/v1/messages"):
        continue
    k = (r.get("model"), r["compacting"], json.dumps(r.get("effort")), json.dumps(r.get("thinking")), r.get("systemBytes"))
    seen[k] = seen.get(k, 0) + 1
for (m, c, e, th, sb), n in seen.items():
    print(f"  requests: {n} x model={m} compacting={c} output_config={e} thinking={th} systemBytes={sb}")
