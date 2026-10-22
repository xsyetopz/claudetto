# Draft Issue: `fswatch-probe-*` Folders Pile Up in the Temp Folder

For `anthropics/claude-code`. The user posts it.

## Title

`fswatch-probe-*` folders are left in the temp folder (20,855 in 3 days)

## Body

**Version:** Claude Code 2.1.307 on macOS (Darwin 27.0.0).

**What happens:** the temp folder of my sessions (`/tmp/claude-501/`) holds 20,855 folders named `fswatch-probe-XXXXXX`, each with one file `probe`.
They were made from 2026-10-19 09:45 to 2026-10-22 02:40.

**What I expect:** no `fswatch-probe-*` folder after its probe ends.

**Where it comes from:** the settings watcher makes the folder with `mkdtemp(join(<tmp>, "fswatch-probe-"))` for a probe of at most 1,500 ms, and removes it in a `finally` block.
Many short `claude -p` runs start on this machine (evals and request captures), and some end on a timeout.
A process that ends during the probe does not reach the `finally` block, so I think that is the cause, but I did not prove it.

**To reproduce (not tried yet):** start `claude -p "hi"` many times, and kill each one within 1.5 seconds of its start. Then count `ls -d $TMPDIR/fswatch-probe-* | wc -l`.

**A possible fix:** remove old `fswatch-probe-*` folders at start, or make the probe file in a folder that the next start reuses.
