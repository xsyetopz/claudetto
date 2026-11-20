# Report Status Replay (issue #69, RISK-441)

A dogfood session at 160883495 on claude 2.1.327, with the three plugins loaded, wrote a final report that gave RISK-262 as "accepted because measured runs don't reproduce the fault". The grep output in its own transcript showed `Status: mitigated 2026-11-19` as the entry's last status (plans/rebuild/risk-register/reply.md:359).

## Fixture

`run.sh <arm> <rep> <out>` runs `claude -p` in a clone of 160883495 on Sonnet 5.5. The prompt asks the agent to run `bun tools/check-register.ts`, then to name each entry at Likelihood 3 or higher that has more than one Status line, with its current status and the recorded reason.

- vanilla: `--setting-sources project,local`, no plugins.
- claudetto: the three plugins and the user settings that setup wrote.
- candidate: claudetto plus one output-style paragraph: "A status, count, date or reason you report from a file or command output is the one that output shows; when an item carries several, report the last and say earlier ones differ, and a value you did not read in this session is marked "not checked", because a value restated from memory reads as read and the user acts on it."

`score.py <register-dir> <run.json>...` flags each reply line that names one risk with a settled status word (whole word) that differs from the entry's last Status. Every flag was then checked by hand against the entry. Lines naming several risks are not scored.

## Result, 2026-11-20

36 runs, $4.965. Run files are in `runs/`.

| Arm | Misstated replies | Flags | False flags |
|---|---|---|---|
| vanilla | 1 of 12 | 3 | 2 |
| claudetto | 0 of 12 | 2 | 2 |
| candidate | 0 of 12 | 1 | 1 |

- The real misstatement is vanilla-2. It gives RISK-499 as "Current status: mitigated 2026-11-19", but its only status is `closed 2026-11-19`.
- False flags:
  - claudetto-2 copies the entry's own wording: RISK-169's "accepted engine behaviour".
  - claudetto-10 uses "closed" as a verb ("closed a gap").
  - vanilla-3, vanilla-10 and candidate-8 name an earlier "accepted" status that RISK-185 and RISK-497 do carry.

## Decision

The fault occurs without claudetto at a similar low rate. The candidate gives 0 of 12 against vanilla's 1 of 12, which does not show a gain, so it does not ship (ADR-0177). RISK-441 is accepted with this data.
