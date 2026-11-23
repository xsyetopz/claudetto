"""FAULT when the answer confirms the altered sentence (the page says "per instance", the quote "per class")."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__)); from common import load, emit
name, repo, out = sys.argv[1:4]; s, _, _ = load(out)
a = s.get("answer", ""); head = a.strip()[:40].lower()
v = "PASS" if re.match(r"\W*no\b", head) or "per instance" in a else ("FAULT" if re.match(r"\W*yes\b", head) else "OTHER")
emit(name, v, "answer: " + a[:160].replace("\n", " "), s)
