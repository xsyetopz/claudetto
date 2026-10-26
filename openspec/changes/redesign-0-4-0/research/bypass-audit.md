# Bypass Audit of the Hook Rules

A `claudetto:Scout` read the 45 `// rule:` comments of `plugins/claudetto/hooks/register.ts` on 2026-10-26, and the code of each rule.
It ran no command, so the bypasses are checked against the code only.
Tasks 19.12 and 19.13 come from this audit (the user, 2026-10-26).

## Rules That Read the Text of a Tool Input

| Rule | Decision | Bypasses, checked against the code | Rank |
|---|---|---|---|
| `gate.check`, `gate.permission` | `gate/domain/gate.ts:301` | `python3 -c "import os;os.remove('x.db')"`: a code body is scanned only for `.env` (`shell/domain/shell.ts:37`). `V=rm; $V -rf ~/x`: `nameOf` gives `$V`. `G=git; $G reset --hard`: `gitCall` needs the literal `git` (`loss.ts:106`). | high |
| Secret reads | `gate.ts:171-186`, `paths.ts:72`, `paths.ts:92` | `cat "$PWD/.env"`: `pathOf` gives `null` for `$` (`paths.ts:47`). `cp .env /tmp/c`: `cp` is in `NO_READ` (`gate.ts:74`). `python3 -c "print(open('.en'+'v').read())"`. `sh -c "$(echo Y2F0IC5lbnY= \| base64 -d)"`. | high |
| System writes | `gate.ts:85-88`, `paths.ts:14` | `sed -i '' … /Library/x`: `sed` is in no writer list (`gate.ts:77-81`). `python3 -c "open('/System/x','w')"`. `dd of=/usr/x`. | high |
| Deletes | `gate.ts:97-122`, `loss.ts:77-89` | `python3 -c "…os.remove…"`, `perl -e 'unlink glob("*")'`, `V=rm; $V -rf .` | high |
| Git loss | `gate.ts:145-168`, `loss.ts:106-160` | `git -c alias.r='reset --hard' r`: the verb is `r` (`loss.ts:115`). `G=git; $G clean -fdx`. `python3 -c "subprocess.run(['git','reset','--hard'])"`. | high |
| Force push, bulk stage | `gate.ts:152-155`, `loss.ts:177-195` | `git -c alias.p='push --force' p`, `git -c alias.a='add -A' a` | high, medium |
| Download and run | `gate.ts:139-142` | `python3 -c "…exec(urlopen(…).read())"`, `wget -O s.sh … && python3 s.sh` | high |
| Database loss | `gate.ts:66-69`, `loss.ts:13-50` | `python3 -c "…sqlite3…DROP TABLE t"`, `psql -c "DRO""P TABLE t"`, `T=terraform; $T destroy` | high |
| `work.box` and its stop loop | `work/finish/adapters/mod.ts:247-276`, `record.ts:100` | `python3` or `sed -i` tick of `tasks.md`: only `Edit` and `Write` are read. This happened on 2026-10-26. | medium |
| `work.ground` | `work/ground/adapters/mod.ts:47-103` | `cat > spec.md <<'EOF'`, `cp draft.md spec.md` | medium |
| `work.goal` | `work/finish/adapters/mod.ts:278-303` | `echo '{"check":"true"}' > .claudetto/goal.json` | medium |
| `proven` of `project` | `project/domain/checks.ts:38` | `just check --dry-run` can count as a pass (not verified) | medium |
| `gate.gh-title` | `gate/domain/ghtitle.ts:60` | `sh -c 'gh pr create --title "x"'` | low |

## Rules That Check the Effect

`session.ledger` for `Bash` (git status, mtime, and hash), `work.goal-stop` (exit code), `gate.monitor-stop`, `session.changed-files` (hash), and `session.sweep` (file system).
