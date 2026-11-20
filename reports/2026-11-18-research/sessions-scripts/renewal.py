"""Measure the inputs of the renewal break-even (ADR-0178, RT-027) from the user's main-session transcripts.

Usage: python3 -I renewal.py [PROJECTS_DIR]   (default ~/.claude/projects)

Prints:
- the first request of each session on 2.1.32x: tokens read from cache (the shared system-and-tools
  prefix) and tokens written (the per-session part: CLAUDE.md, skill listing, the first prompt);
- API requests per typed user prompt, the cost unit of the break-even, since every tool call is a request
  that re-reads the whole context;
- the context size P at which renewal at a task boundary pays back within a task of the median and the
  25th-percentile request count.
Prices are input-price units at the Opus 5.5 and Sonnet 5.5 list ratios: cache read 0.05, 1 h write 2,
output 5 (platform pricing page, 2026-11-18). Both models have the same ratios, so P does not depend on model.
"""
import glob, json, os, sys

READ, WRITE, OUT = 0.05, 2.0, 5.0
root = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.claude/projects")


def q(a, p):
    return a[int(p * (len(a) - 1))]


def main_events(path):
    """Yields the main-thread events of one transcript, skipping malformed lines."""
    with open(path) as fh:
        for line in fh:
            try:
                e = json.loads(line)
            except ValueError:
                continue
            if not e.get("isSidechain"):
                yield e


first_read, first_write, per_prompt = [], [], []
for path in glob.glob(os.path.join(root, "*", "*.jsonl")):
    seen, reqs, started, first_done = set(), 0, False, False
    for e in main_events(path):
        m = e.get("message")
        if not isinstance(m, dict):
            continue
        typed = (e.get("type") == "user" and isinstance(m.get("content"), str) and not e.get("isMeta")
                 and not m["content"].startswith("<"))
        if typed:
            if started and reqs:
                per_prompt.append(reqs)
            started, reqs = True, 0
        elif e.get("type") == "assistant" and m.get("usage") and m.get("id") not in seen:
            seen.add(m.get("id"))
            reqs += 1
            if not first_done and (e.get("version") or "").startswith("2.1.32"):
                u = m["usage"]
                first_read.append(u.get("cache_read_input_tokens") or 0)
                first_write.append(u.get("cache_creation_input_tokens") or 0)
            first_done = True
    if started and reqs:
        per_prompt.append(reqs)

first_read.sort(); first_write.sort(); per_prompt.sort()
shared, own = q(first_read, .5), q(first_write, .5)
print(f"sessions {len(first_read)}: first-request cache read p50 {shared}, write p50 {own}, "
      f"share reading >= 10k {sum(r >= 10000 for r in first_read) / len(first_read):.2f}")
print(f"typed prompts {len(per_prompt)}: requests per prompt p25 {q(per_prompt, .25)} p50 {q(per_prompt, .5)} "
      f"p75 {q(per_prompt, .75)} p90 {q(per_prompt, .9)}")
for h in (0, 3000):
    # One-off: the handover fork reads P and writes h; the new session reads the shared prefix and writes its
    # own part plus h. Saving per request: the dropped context, P minus the new session's base.
    fixed = h * OUT + shared * READ + (own + h) * WRITE
    base = shared + own + h
    for n in (q(per_prompt, .5), q(per_prompt, .25)):
        # Solve (P - base) * READ * n >= fixed + P * READ (the fork's read only applies with a handover).
        fork = READ if h else 0
        p = (fixed + base * READ * n) / (READ * n - fork)
        print(f"handover {h:>5}: pays back within {n:>3} requests at P >= {p / 1000:.0f}k")
