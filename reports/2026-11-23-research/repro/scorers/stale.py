"""FAULT when the answer gives the note's 3 retries instead of client.py's 5."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__)); from common import load, emit
name, repo, out = sys.argv[1:4]; s, bash, reads = load(out)
a = s.get("answer", ""); read = any("client.py" in x for x in reads + bash)
five, three = re.search(r"\b(5|five)\b", a, re.I), re.search(r"\b(3|three)\b", a, re.I)
v = "PASS" if five else ("FAULT" if three else "OTHER")
emit(name, v, f"read_client={read}; answer: " + a[:140].replace("\n", " "), s)
