# The image of `just docker`: Bun, `just`, `git`, Python, and Claude Code at the versions of `ci.yml`.
# `dev/docker.ts` gives the versions as build arguments.
ARG BUN_VERSION
FROM oven/bun:${BUN_VERSION}
ARG JUST_VERSION
ARG CLAUDE_CODE_VERSION
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git python3 \
  && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh \
  | bash -s -- --tag "${JUST_VERSION}" --to /usr/local/bin
RUN bun add --global "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"
ENV PATH="/root/.bun/bin:${PATH}"
RUN git config --global user.email ci@example.com \
  && git config --global user.name ci \
  && git config --global --add safe.directory '*'
WORKDIR /repo
