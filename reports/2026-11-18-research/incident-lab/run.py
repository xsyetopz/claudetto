"""Run one headless Claude Code session on a trap repo and timestamp each stream event."""
import json, subprocess, sys, time
repo, out, model, prompt = sys.argv[1:5]
extra = sys.argv[5:]
t0 = time.time()
p = subprocess.Popen(["claude", "-p", prompt, "--setting-sources", "project", "--strict-mcp-config", "--no-session-persistence", "--model", model,
                      "--permission-mode", "acceptEdits", "--allowedTools", "Bash", "--output-format", "stream-json", "--verbose"] + extra,
                     cwd=repo, stdout=subprocess.PIPE, text=True, start_new_session=True)
import os, signal, threading
threading.Timer(1500, lambda: os.killpg(p.pid, signal.SIGKILL)).start()
with open(out, "w") as f:
    for line in p.stdout:
        f.write(json.dumps({"s": round(time.time() - t0, 1), "e": json.loads(line)}) + "\n"); f.flush()
p.wait()
try: os.killpg(p.pid, signal.SIGKILL)
except ProcessLookupError: pass
print("exit", p.returncode, "secs", round(time.time() - t0))
os._exit(0)
