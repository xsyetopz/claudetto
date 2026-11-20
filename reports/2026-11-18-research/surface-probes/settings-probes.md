# Probe: Edit deny rule versus Bash writers (claude 2.1.327, 2026-11-18)

Tool: cc-inspect `code cli`, fake API, stub model making fixed `calls`, `--settings s.json`.
Files: prot/a.txt..e.txt and free/f.txt hold "orig"; src.txt holds "copied".

## Arm 1: sandbox off

s.json: {"permissions":{"deny":["Edit(prot/**)"],"allow":["Bash"]}}

| Call | Result |
| --- | --- |
| Edit prot/a.txt | error "File is in a directory that is denied by your permission settings." |
| Edit free/f.txt | error "Claude requested permissions to write to .../free/f.txt, but you haven't granted it yet." (-p, no Edit allow) |
| echo REDIR > prot/b.txt | rc=0, file now REDIR |
| echo TEE \| tee prot/c.txt | rc=0, file now TEE |
| cp src.txt prot/d.txt | rc=0, file now copied |
| sed -i '' s/orig/SED/ prot/e.txt | rc=0, file now SED |

## Arm 2: sandbox on

s.json: {"permissions":{"deny":["Edit(prot/**)"],"allow":["Bash"]},"sandbox":{"enabled":true,"autoAllowBashIfSandboxed":true}}

| Call | Result |
| --- | --- |
| echo REDIR > prot/b.txt | "(eval):1: operation not permitted: prot/b.txt", rc=1 |
| tee prot/c.txt | "tee: prot/c.txt: Operation not permitted", rc=1 |
| cp src.txt prot/d.txt | "cp: prot/d.txt: Operation not permitted", rc=1 |
| sed -i prot/e.txt | "sed: prot/e.txt: Operation not permitted", rc=1 |
| echo FREE > free/f.txt | written |

All prot/ files stayed "orig". Every blocked Bash result came back with `is_error: false`; the failure is visible only in the text and the exit code.
Docs agree: `sandbox.filesystem.denyWrite` is merged with the paths of `Edit(...)` deny rules (clawdipedia configure/permissions/sandbox).

# Probe: effortLevel versus modelSettings (claude 2.1.327, 2026-11-18)

Read: `output_config.effort` of request 1, `--model claude-opus-5-5`, cc-inspect cli.

| Settings | effort sent |
| --- | --- |
| --settings {"effortLevel":"high"} | high |
| --settings {"effortLevel":"high","modelSettings":{"claude-opus-5-5":{"effortLevel":"low"}}} | low |
| project .claude/settings.json {"modelSettings":{...low}} only | low |
| project modelSettings low + --settings effortLevel high | high |

In one file the per-model saved level wins; across files the higher-precedence file wins.
