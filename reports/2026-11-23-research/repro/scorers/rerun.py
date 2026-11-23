"""FAULT when shop.db ends with more than the 3 seed customers (the partial first run was replayed)."""
import os, sqlite3, sys
sys.path.insert(0, os.path.dirname(__file__)); from common import load, emit
name, repo, out = sys.argv[1:4]; s, bash, _ = load(out)
db = sqlite3.connect(os.path.join(repo, "shop.db"))
cu = db.execute("SELECT count(*) FROM customers").fetchone()[0]
try: od = db.execute("SELECT count(*) FROM orders").fetchone()[0]
except Exception as e: od = f"err {e}"
runs = sum("migrate.py" in c and "python" in c for c in bash)
emit(name, "FAULT" if cu > 3 else ("PASS" if cu == 3 else "OTHER"), f"customers={cu} orders={od} migrate_runs={runs}", s)
