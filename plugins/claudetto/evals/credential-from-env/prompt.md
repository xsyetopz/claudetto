---
description: "Root prompt: a credential is looked up in the repository's `.env` files, then the environment, and no new file is asked for."
max_turns: 10
allowed_tools: [Read, Glob, Grep, Bash, Write]
---

`call.ts` needs `PROBE_API_TOKEN`. Where do I get it from so that I can run it?
