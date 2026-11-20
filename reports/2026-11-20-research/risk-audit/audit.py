"""Per-risk audit of plans/rebuild/risk-register: each risk's verbatim last Status line, checked against its own entry.

usage: python3 -I audit.py <risk-register-dir> [--all]
Prints every risk at Likelihood 3 or higher, every risk that fails a check, and with --all every risk.
A check fails when the last Status names no settled state, when the entry has no Verified line,
or when the Response line contradicts the Status (a "transfer" response on a "mitigated" risk, say).
The last two lines give the count per settled state, read from each risk's last Status
(an inline one too) or its "Moved Out as" title, and the totals.
Exits 1 when any risk fails a check.
"""
import glob
import re
import sys

SETTLED = ("closed", "accepted", "mitigated", "transferred", "moved out")
# Response verb -> the settled states that agree with it. A closed risk may carry any response,
# because closing records that the fault is absent, whatever was planned.
AGREES = {"accept": ("accepted",), "mitigate": ("mitigated",), "reduce": ("mitigated",), "transfer": ("transferred",), "avoid": ("mitigated",)}


def entries(path):
    for block in re.split(r"\n(?=- \[.\] \*\*RISK-)", open(path).read())[1:]:
        head = block.split("\n")[0]
        rid = re.match(r"- \[.\] \*\*(RISK-\d+)", head).group(1)
        statuses = [line.strip() for line in block.split("\n") if re.search(r"(?:^|[\s.*])Status:", line)]
        likelihood = re.findall(r"Likelihood:?\**\s*(\d)", block)
        response = re.search(r"Response:\**\s*([A-Za-z]+)", block)
        yield {
            "id": rid,
            "file": path.split("/")[-1][:-3],
            "moved": "Moved Out as" in head,
            "L": int(likelihood[-1]) if likelihood else 0,
            "status": statuses[-1] if statuses else "",
            "response": response.group(1).lower() if response else "",
            "verified": len(re.findall(r"Verified:", block)),
        }


def state_of(e):
    tail = re.sub(r"^.*?Status:\**\s*", "", e["status"]).lower()
    return next((s for s in SETTLED if tail.startswith(s)), "moved out" if e["moved"] else None)


def problems(e):
    found = []
    state = state_of(e)
    if state is None:
        found.append("last Status names no settled state")
    if e["verified"] == 0 and not e["moved"]:
        found.append("no Verified line")
    if state and state not in ("closed", "moved out") and e["response"] in AGREES and state not in AGREES[e["response"]]:
        found.append(f"Response '{e['response']}' contradicts Status '{state}'")
    return found


def main():
    rows = [e for f in sorted(glob.glob(sys.argv[1] + "/*.md")) for e in entries(f)]
    bad = 0
    for e in rows:
        issues = problems(e)
        bad += bool(issues)
        if issues or e["L"] >= 3 or "--all" in sys.argv:
            mark = "FAIL " + "; ".join(issues) if issues else "ok"
            print(f"{e['id']} [{e['file']}] L{e['L']} Response={e['response'] or '-'} Verified={e['verified']} {mark}\n    {e['status'] or '(moved out in title)'}")
    high = [e for e in rows if e["L"] >= 3]
    counts = {s: sum(state_of(e) == s for e in rows) for s in SETTLED}
    counts["unsettled"] = sum(state_of(e) is None for e in rows)
    print("per state: " + ", ".join(f"{s} {n}" for s, n in counts.items()))
    print(f"risks: {len(rows)}; at Likelihood 3 or higher: {len(high)}; unsettled at Likelihood 3 or higher: {sum(state_of(e) is None for e in high)}; failing a check: {bad}")
    sys.exit(1 if bad else 0)


main()
