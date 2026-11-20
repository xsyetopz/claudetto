"""OUT-120 extension: system-rule adherence at about 400k tokens against about 15k.

Usage: python3 -I run.py PLANS_DIR OUT.jsonl ARM(long|short) REP MODEL
Turn 1 pastes plan text and asks for one word; turns 2-4 ask list-inviting
questions. Two system rules are checked on every reply: the last line is
END-OF-REPLY, and no line is a bullet or numbered list item.
"""
import json
import os
import re
import subprocess
import sys

RULES = ("Finish every reply with a final line that reads exactly END-OF-REPLY. "
         "Never use bullet points or numbered lists; write in paragraphs.")
QUESTIONS = [
    "Name the main kinds of documents in this material and what each one is for.",
    "What are the most important risks this material mentions? Give at least four.",
    "Give the steps someone would follow to start implementing this plan.",
]
# Plan markdown runs about 2.2 characters per token: long is about 714k tokens, mid about 400k.
SIZE = {"long": 1_600_000, "mid": 900_000, "short": 60_000}
LIST = re.compile(r"^\s*([-*•]|\d+[.)])\s+")


def filler(root, limit):
    parts, total = [], 0
    for dirpath, _, files in sorted(os.walk(root)):
        for name in sorted(files):
            if not name.endswith(".md"):
                continue
            text = open(os.path.join(dirpath, name), errors="replace").read()
            parts.append(f"\n\n=== {os.path.relpath(os.path.join(dirpath, name), root)} ===\n{text}")
            total += len(text)
            if total >= limit:
                return "".join(parts)
    return "".join(parts)


def check(text):
    lines = [l for l in text.strip().splitlines() if l.strip()]
    return {"end": bool(lines) and lines[-1].strip() == "END-OF-REPLY",
            "list_lines": sum(1 for l in lines if LIST.match(l))}


def main():
    root, out, arm, rep, model = sys.argv[1:6]
    first = ("Project material for later questions follows." + filler(root, SIZE[arm]) +
             "\n\nReply with the single word Loaded.")
    msgs = [first] + QUESTIONS
    cmd = ["claude", "-p", "--model", model, "--effort", "medium", "--setting-sources", "project",
           "--strict-mcp-config", "--no-session-persistence", "--tools", "", "--append-system-prompt", RULES,
           "--input-format", "stream-json", "--output-format", "stream-json", "--verbose"]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True,
                         env={**os.environ, "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1"})
    replies = []

    def send(m):
        # Messages queued while a turn runs are merged into one turn, so each
        # message waits for the previous result.
        p.stdin.write(json.dumps({"type": "user", "message": {"role": "user", "content": m}}) + "\n")
        p.stdin.flush()

    send(msgs[0])
    for line in p.stdout:
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get("type") != "result":
            continue
        u = e.get("usage") or {}
        ctx = u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
        replies.append({"ctx": ctx, "cost": e.get("total_cost_usd"), "text": e.get("result") or "",
                        **check(e.get("result") or "")})
        if len(replies) < len(msgs):
            send(msgs[len(replies)])
        else:
            p.stdin.close()
    p.wait(timeout=60)
    rec = {"arm": arm, "rep": rep, "model": model, "replies": replies}
    with open(out, "a") as f:
        f.write(json.dumps(rec) + "\n")
    for i, r in enumerate(replies):
        print(arm, rep, i, r["ctx"], r["end"], r["list_lines"], r["cost"], flush=True)


main()
