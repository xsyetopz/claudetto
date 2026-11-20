"""Counts tool calls that carry a ToolSearch input (`query: "select:..."`) under another tool's name, and what the next call was.

usage: python3 -I scan.py <transcript-dir> [<transcript-dir> ...]
"""
import collections
import glob
import json
import sys


def calls(path):
    """Yields each tool_use block of one transcript, in order."""
    for line in open(path, errors="ignore"):
        if '"tool_use"' not in line:
            continue
        try:
            content = json.loads(line).get("message", {}).get("content")
        except ValueError:
            continue
        if isinstance(content, list):
            yield from (b for b in content if b.get("type") == "tool_use")


def slipped(block):
    query = (block.get("input") or {}).get("query", "") if isinstance(block.get("input"), dict) else ""
    return block.get("name") != "ToolSearch" and str(query).startswith("select:")


sessions = hit = total = 0
names, after = collections.Counter(), collections.Counter()
for root in sys.argv[1:]:
    for path in glob.glob(root + "/**/*.jsonl", recursive=True):
        sessions += 1
        seq = list(calls(path))
        total += len(seq)
        slips = [i for i, b in enumerate(seq) if slipped(b)]
        hit += bool(slips)
        for i in slips:
            names[seq[i]["name"]] += 1
            nxt = seq[i + 1] if i + 1 < len(seq) else None
            after["none" if nxt is None else "repeat" if slipped(nxt) else nxt.get("name", "?")] += 1
print(f"sessions {sessions}; with a slip {hit}; tool calls {total}; slips {sum(names.values())}")
print("by tool:", dict(names))
print("next call:", dict(after))
