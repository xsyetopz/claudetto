# The image of `just sandbox-linux`: the image of `just docker`, and `bubblewrap` and `socat`, which the Linux sandbox of Claude Code needs.
# The native build of Claude Code embeds the seccomp helper, so the image has no `@anthropic-ai/sandbox-runtime`.
ARG BASE
FROM ${BASE}
RUN apt-get update \
  && apt-get install -y --no-install-recommends bubblewrap socat \
  && rm -rf /var/lib/apt/lists/*
