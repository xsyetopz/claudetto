A test run of `{{path}}` failed: {{error}}
`{{path}}` is the `bwrap` that Claude Code runs in this checkout.
The sysctl `kernel.apparmor_restrict_unprivileged_userns` is 1, so AppArmor stops `bwrap` from the creation of a user namespace.
The page https://code.claude.com/docs/en/sandboxing gives an AppArmor profile for `bwrap`.
This profile names `{{path}}`:

```
{{profile}}
```

Write the profile to `/etc/apparmor.d/bwrap`, and then run `sudo systemctl reload apparmor`.
The hard stop sets `sandbox.failIfUnavailable`, so Claude Code does not start in this checkout while `bwrap` fails.
Nothing changed.
