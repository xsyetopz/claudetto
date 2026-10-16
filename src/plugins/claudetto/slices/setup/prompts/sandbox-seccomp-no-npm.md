`npm` is not on `PATH`.
Install Node.js, run `npm install -g @anthropic-ai/sandbox-runtime`, and then run `/claudetto:setup sandbox` again.
Or copy `vendor/seccomp/` from the package `@anthropic-ai/sandbox-runtime`, and set `sandbox.seccomp.applyPath` and `sandbox.seccomp.bpfPath` in a settings file.
