A test run of `bwrap` failed: {{error}}
This is the error of an unprivileged container, which cannot mount `/proc`.
The page https://code.claude.com/docs/en/sandboxing names the setting `sandbox.enableWeakerNestedSandbox` for this case.
That setting weakens the sandbox, so the hard stop does not set it.
Run Claude Code on a host or in a virtual machine where `bwrap` works.
The hard stop sets `sandbox.failIfUnavailable`, so Claude Code does not start in this checkout while `bwrap` fails.
Nothing changed.
