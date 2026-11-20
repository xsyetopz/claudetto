"""Counts Bash commands with the zsh-only forms that trip the 2.1.327 rm-parse check (a parameter flag, a nested expansion), and results carrying the engine's rm-parse message.

usage: python3 scan.py <transcript-glob>...
"""
import glob
import json
import re
import sys

FLAG = re.compile(r"\$\{\([A-Za-z@#%:]+\)")
NESTED = re.compile(r"\$\{\$\{")
MESSAGE = "read this command the way the shell will"


def blocks(path):
    for line in open(path, errors="ignore"):
        try:
            content = (json.loads(line).get("message") or {}).get("content")
        except ValueError:
            continue
        if isinstance(content, list):
            yield from content


def main(patterns):
    total = flags = nested = 0
    hits = []
    # Probe sessions run from a temp dir; their project folder names it.
    for path in (p for pattern in patterns for p in glob.glob(pattern) if "-var-folders-" not in p):
        commands = {}
        for block in blocks(path):
            if block.get("type") == "tool_use" and block.get("name") == "Bash":
                command = (block.get("input") or {}).get("command") or ""
                commands[block.get("id")] = command
                total += 1
                flags += bool(FLAG.search(command))
                nested += bool(NESTED.search(command))
            elif block.get("type") == "tool_result" and MESSAGE in json.dumps(block.get("content")):
                # A command that quotes the message (a grep for it) is not a prompt.
                command = commands.get(block.get("tool_use_id"), "")
                if command and "dangerous removal" not in command and "dd if=" not in command:
                    hits.append(command[:160].replace("\n", "\\n"))
    print(f"bash commands {total}; with a zsh parameter flag {flags}; with a nested expansion {nested}")
    print(f"results with the rm-parse message {len(hits)}")
    for hit in hits:
        print("  " + hit)


if __name__ == "__main__":
    main(sys.argv[1:])
