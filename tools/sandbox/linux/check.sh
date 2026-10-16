#!/bin/sh
# Runs in the container of `just sandbox-linux`.
# The login comes on stdin, and it stays in the container, which `--rm` removes.
# The socket is a fake agent from `socat`, and not the `ssh-agent` of the host.
# The results go to `/out`, with no line of the login.
set -eu
mkdir -p /cfg
chmod 700 /cfg
umask 077
cat >/cfg/.credentials.json
trap 'rm -f /cfg/.credentials.json' EXIT
printf '%s' "$SETTINGS" >/cfg/settings.json
mkdir -p /work
cd /work
socat UNIX-LISTEN:/work/agent.sock,fork SYSTEM:'echo pong' &
sleep 1
export SSH_AUTH_SOCK=/work/agent.sock
echo | socat - UNIX-CONNECT:/work/agent.sock >/out/control.txt 2>&1 || true
readlink -f "$(command -v claude)" >/out/claude.txt
# The sandbox engine logs only when `SRT_DEBUG` is set, and it logs `[SandboxDebug] ...` to stderr, not to `--debug-file`.
SRT_DEBUG=1 CLAUDE_CONFIG_DIR=/cfg claude -p "$PROMPT" \
  --model "$MODEL" --max-turns 3 --allowedTools Bash \
  --output-format stream-json --verbose \
  >/out/out.jsonl 2>/out/stderr.txt || true
grep -iE 'seccomp|sandbox linux|bwrap' /out/stderr.txt >/out/sandbox.txt || true
