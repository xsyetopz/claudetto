The seccomp filter of the sandbox has no build for the architecture `{{arch}}`.
It runs only on `x64` and `arm64`.
Without the filter, a sandboxed command can connect to Unix sockets, so the hard stop cannot apply here.
With `sandbox.failIfUnavailable`, Claude Code does not start in this checkout.
Nothing changed.
