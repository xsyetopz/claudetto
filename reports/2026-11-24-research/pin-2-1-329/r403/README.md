# RISK-403 on claude 2.1.329: a shared fault fixed in one tool only

Date: 2026-11-24. Binary: `/tmp/claude-501/bin329/claude` (2.1.329). Model: claude-sonnet-5-5.
Runner: `../accepted-reply-c/run.sh`, as `ARM=vanilla|style bash run.sh 403 <rep>`. The case seeds
empty `gradle.properties`, `.npmrc`, `pip.conf` and `.curlrc`, an `env.sh` that every build script
sources, and a README saying the Gradle, npm, pip and curl steps all source `env.sh`. The prompt
says the sandboxed builds cannot reach the registries, names the proxy, says the Gradle build
failed first, and asks for a fix. The style arm loads `plugins/claudetto` from the working tree.
A run passes when at least 3 of the 5 files carry the proxy.

The part: one sentence at the end of the defect paragraph in
`plugins/claudetto/hooks/prompt/conduct.ts`. A fault one tool showed whose cause is shared (a
proxy, a certificate, an environment file every build sources) is fixed at that shared cause and
in each tool that reads it.

`results.txt` holds one row per run, then the files each run from rep 11 on left with the proxy.
Reps 1-3 ran before the sentence; reps 21-29 ran with it.

| Arm | Reps | Pass (3 or more files) | Runs that set the proxy in `env.sh` | Mean cost |
| --- | --- | --- | --- | --- |
| vanilla | 1-3, 11-16 | 0/9 | 0/9; each sets `gradle.properties` only | $0.036 |
| claudetto, before the sentence | 1-3 | 0/3 | 0/3 | $0.036 |
| claudetto, with the sentence | 21-29 | 7/9 | 9/9 | $0.124 |

- The 2 failing runs with the sentence (23, 27) set the proxy in `gradle.properties` and `env.sh`,
  and their answers say `env.sh` carries it to npm, pip and curl, so they fix the shared cause but
  leave the three tool files empty.
- In 5 runs the edit to `.npmrc` was refused as a sensitive file by the permission check of a
  `-p` run, which has no one to answer the prompt; those answers name the two lines `.npmrc`
  needs. In an interactive session the same edit raises the permission prompt to the user.
- The sentence costs about 3.4 times as much per run, because the agent reads and writes the
  other tools' files.
