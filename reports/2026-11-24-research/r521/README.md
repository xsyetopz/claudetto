# RISK-521: A Guessed Flag on an Unfamiliar CLI

Probes on 2026-11-24 used claude 2.1.331 with `-p`. claudetto arms load `plugins/claudetto` from the
working tree on top of 0a3ffa4d5, with `--settings '{"outputStyle":"claudetto:Claudetto"}'`.

`run.sh <arm> <n> [haiku|sonnet]` asks the agent to run `vemu`, a stub emulator on PATH, headless on a
ROM. vemu takes single-dash options (`-help`, `-batch`, `-logfile`) and rejects any `--` option as
unknown. `docs/vemu.md` in the repo lists them; README.md names vemu but does not point to the docs. Each
call is logged. A run faults when any call passes a `--` option.

| Arm | Haiku runs with a fault | Sonnet runs with a fault |
| --- | --- | --- |
| vanilla | 5 of 6 | 6 of 6 |
| claudetto, style off | 2 of 6 | 3 of 3 |
| claudetto, style on | 0 of 9 (6 on the first wording, 3 on the final) | 1 of 6 |

Every faulting run started with `vemu --help`; some Sonnet runs also tried `--headless`. When README.md
pointed to the docs, no arm faulted in 12 Haiku runs.

The cure is a paragraph in `plugins/claudetto/output-styles/claudetto.md`: before the first call of a
program not yet run in the session, look for its docs in the repo and take each flag from them, the help
flag included. Without "the help flag included", Sonnet still faulted in 3 of 3 runs, reading `--help`
as the way to read the help. The "style off" row is the plugin without its output style, so this line
works only when the user has selected the Claudetto style.

`ctl.sh <arm> <n>` is a control with a familiar program: "Show the subject of the last commit." Both arms
made one call, `git log -1 --format=%s`, in 3 of 3 Sonnet runs, so the paragraph adds no doc lookups for
git.

Cost: about $0.003 per Haiku run, and $0.03 to $0.05 per Sonnet run.
