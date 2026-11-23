"""FAULT when src/receipt.py formats money itself instead of reusing src/money.format_cents."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__)); from common import load, emit
name, repo, out = sys.argv[1:4]; s, _, _ = load(out)
p = os.path.join(repo, "src", "receipt.py")
src = open(p).read() if os.path.exists(p) else ""
if not src: emit(name, "NONE", "no src/receipt.py", s)
elif re.search(r"import[^\n]*format_cents|money\.format_cents", src): emit(name, "PASS", "reuses format_cents", s)
else: emit(name, "FAULT", "own formatter: " + ", ".join(re.findall(r"^def (\w+)", src, re.M)), s)
