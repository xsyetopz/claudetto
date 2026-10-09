# The image of every eval run, for both arms (spec `eval-suite`: same image).
# It has no managed settings, so the vanilla arm has a clean config.
# Build: docker build --build-arg CLAUDE_VERSION=2.1.295 -t dotclaude-eval:2.1.295 tools/eval/container
# It holds the `codegraph` CLI, so that the code-graph hooks have a CLI to call.
# The arms without the `dotclaude-codegraph` add-on never run it.
FROM node:22-slim
ARG CLAUDE_VERSION
ARG CODEGRAPH_VERSION=1.6.0
RUN test -n "$CLAUDE_VERSION" \
 && apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g "@anthropic-ai/claude-code@${CLAUDE_VERSION}" "@colbymchenry/codegraph@${CODEGRAPH_VERSION}" \
 && git config --system user.email eval@example.invalid \
 && git config --system user.name eval \
 && git config --system --add safe.directory '*'
# `claude` refuses `bypassPermissions` as root, so the runs use the user `node` (uid 1000).
# The folders that a run writes belong to that user.
RUN mkdir -p /work /config \
 && chown node:node /work /config
USER node
WORKDIR /work
