# 18.10 ssh login under the sandbox

Hypothesis: with the shipped Sandbox block passed by `--settings`, `git ls-remote git@github.com:xsyetopz/claudetto.git HEAD` under the built-in sandbox sends git's ssh through the sandbox proxy (design.md:246, `GIT_SSH_COMMAND` with the SRT proxy command), so the proxy logs a CONNECT to github.com:22 with an allow decision (`allowedDomains: ["*"]`). Whether the login then succeeds depends on a key GitHub accepts; design.md:246 found none on this machine.

Prediction: the Bash tool result prints `rc=128` and "Permission denied (publickey)" or "Please make sure you have the correct access rights" (auth failure, not a network failure); the debug log has a network line naming github.com and an allow.

Setup: fake Messages API (`server.ts` of the former claudekit, one plan step with `match.hasTools: true` issuing one Bash call), `ANTHROPIC_BASE_URL` set to the fake, `claude -p --no-session-persistence --debug-file --settings <json> --setting-sources ""`, a throwaway `CLAUDE_CONFIG_DIR`. No real API, user settings untouched.

## Commands

Files in this folder: `run.sh` (the run), `plan-run2.json` (the fake's plan), `sandbox.json` (the `--settings` file: the shipped Sandbox block plus `permissions.allow: ["Bash"]`). `run.sh` starts `bun /tmp/claudekit-leftovers/claudekit/src/fake/server.ts <plan> <dir>`, reads `listening <port>`, then runs under `env -i` with a throwaway `CLAUDE_CONFIG_DIR`:

    ANTHROPIC_BASE_URL=http://127.0.0.1:<port> ANTHROPIC_API_KEY=<fake key> claude -p go --no-session-persistence --debug-file /tmp/probe-18-10/debug.log --settings /tmp/probe-18-10/sandbox.json --setting-sources "" --output-format stream-json --verbose

The probe folder /tmp/probe-18-10/ holds `.created-by-claudetto`.

## Results

| Run | Bash command | allowedDomains | claude exit | Bash tool result |
| --- | --- | --- | --- | --- |
| 1 | `git ls-remote git@github.com:xsyetopz/claudetto.git HEAD; echo "rc=$?"` | `["*"]` | 0 | `Host key verification failed.` / `fatal: Could not read from remote repository.` / `rc=128` |
| 2 | same, plus `env \| grep -c SRT_SSH_PROXY` and the `GIT_SSH_COMMAND` | `["*"]` | 0 | count `2`; `rc=128`, same text; `GIT_SSH_COMMAND` is `ssh -o ControlMaster=no -o ControlPath=none -o ProxyCommand=<elided>` |
| 3 (control) | same as run 2 | `["example.org"]` | 0 | `sandbox proxy: github.com:22: 403 user denied`, `rc=128`; stderr `<sandbox_violations> deny network-outbound github.com:22 (user denied)` |

The Bash exit code is 128 in all three (git's fatal exit; the claude process exits 0, the tool call is not flagged an error).

## Network log line

- Deny (run 3), in the Bash tool result, not in the debug file: `deny network-outbound github.com:22 (user denied)`.
- Allow (runs 1, 2): no network line exists. `debug.log` holds no line with `github`, `CONNECT`, `allow` or the proxy; its only sandbox line is `[sandbox] Re-checked 5 trusted read-deny or credential-mask path(s) ... none changed`. The sandbox logs a denial and stays silent on an allow.

## Verdict

- Prediction half held: the git ssh went through the sandbox proxy (`SRT_SSH_PROXY` in `GIT_SSH_COMMAND`), and rc=128 is an ssh failure, not a network failure. The failure text differs from the prediction: "Host key verification failed", because this machine has no `~/.ssh/known_hosts` and there is no tty to accept the key. That error comes after the TCP connection (ssh reads the host key first), which agrees with the allow decision for github.com:22.
- The decision for github.com:22 is proven by contrast: with `["*"]` the call gets past the proxy; with `["example.org"]` the proxy answers `403 user denied` for github.com:22 and the connection closes before any host key.
- Not measured: a successful ssh login (needs a key GitHub accepts and a known_hosts entry), and an allow log line (none is written). User step if wanted:

  `! ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts` then run `! claude`, and ask it to run `git ls-remote git@github.com:<owner>/<repo>.git HEAD` with a loaded key. This is outside the free run.
