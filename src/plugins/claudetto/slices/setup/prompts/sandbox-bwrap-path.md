The setting `sandbox.bwrapPath` is `{{path}}`, and that file is not a program that you can run.
Claude Code uses this path in place of the `bwrap` on `PATH`.
The hard stop sets `sandbox.failIfUnavailable`, so Claude Code does not start in this checkout with that path.
Correct or remove `sandbox.bwrapPath`, and then run `/claudetto:setup sandbox` again.
Nothing changed.
