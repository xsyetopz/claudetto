"""Runs a command on a pty, and types each follow-up once the gate log has been quiet for QUIET seconds after new requests.
Usage: python3 -I drive.py CAPTURE DEADLINE_S GATE_LOG 'JSON list of texts' command [args...]"""
import json, os, pty, select, signal, sys, time
QUIET = 15.0
capture, deadline_s, log, follow, *cmd = sys.argv[1:]
follow = json.loads(follow) if follow else []
deadline = time.monotonic() + float(deadline_s)
def count(f, key=""):
    try:
        return sum(1 for l in open(f) if key in l)
    except OSError:
        return 0
def lines():
    # A request whose body is logged but whose answer is not yet is still in flight, so the session is not idle.
    bodies = log.replace("gate-", "bodies-")
    return count(log, '"status":200') if count(bodies) == count(log) else -1
pid, master = pty.fork()
if pid == 0:
    os.execvp(cmd[0], cmd)
out = open(capture, "wb", buffering=0)
seen, changed, sent = 0, time.monotonic(), 0
def pump(until):
    global seen, changed, sent
    while time.monotonic() < until:
        r, _, _ = select.select([master], [], [], 0.5)
        if r:
            try:
                c = os.read(master, 65536)
            except OSError:
                return True
            if not c:
                return True
            out.write(c)
        if os.waitpid(pid, os.WNOHANG)[0] == pid:
            return True
        n = lines()
        if n != seen:
            seen, changed = n, time.monotonic()
        elif sent < len(follow) and seen > 0 and time.monotonic() - changed > QUIET:
            os.write(master, b"\x1b"); time.sleep(1.5); os.write(master, follow[sent].encode()); time.sleep(1.0); os.write(master, b"\r")
            sent += 1; changed = time.monotonic()
        elif sent >= len(follow) and seen > 0 and time.monotonic() - changed > QUIET + 8:
            return False
    return False
gone = pump(deadline)
if not gone:
    try: os.kill(pid, signal.SIGTERM)
    except ProcessLookupError: pass
    gone = pump(time.monotonic() + 10)
if not gone:
    try: os.kill(pid, signal.SIGKILL)
    except ProcessLookupError: pass
