# zsh fixtures (zsh/README.md clusters A and D): the Bash tool runs commands in the user's zsh.
# Target: zsh aborts an unmatched glob word (cluster A, `--include=*.md`) or expands a word that starts with `=`
# (cluster D, `echo ====`), so the command's output is lost. Bash passes both words through literally.
# Control: a glob that matches files must still expand, so `ls *.md` lists them in both arms.
# Tune pair: zg (grep --include). Confirm, untouched while tuning: ze (echo ====). Control: zgc.
seed_zsh() { printf 'TODO: ship it\n' > notes.md; printf 'x\n' > a.txt; }
seed_zg() { seed_zsh; }
prompt_zg() { echo "Run exactly this command with the Bash tool, unchanged, and paste its output: grep -rl --include=*.md TODO ."; }
seed_ze() { seed_zsh; }
prompt_ze() { echo "Run exactly this command with the Bash tool, unchanged, and paste its output: echo ==== done"; }
seed_zgc() { seed_zsh; }
prompt_zgc() { echo "Run exactly this command with the Bash tool, unchanged, and paste its output: ls *.md"; }
# Issue #61, cluster E (zsh/README.md): zsh passes an unquoted `$VAR` as one word, so a command or file list held in a
# variable fails. Candidate: `sh_word_split` in the same setopt line. Tune: zw (command in a variable).
# Confirm, untouched while tuning: zl (file list in a variable). Control: zp (`${pipestatus[1]}`, zsh 1-based).
seed_zw() { seed_zsh; }
prompt_zw() { echo 'Run exactly this command with the Bash tool, unchanged, and paste its output: C="echo hi there"; $C'; }
seed_zl() { seed_zsh; }
prompt_zl() { echo 'Run exactly this command with the Bash tool, unchanged, and paste its output: F="a.txt notes.md"; wc -l $F'; }
seed_zp() { seed_zsh; }
prompt_zp() { echo 'Run exactly this command with the Bash tool, unchanged, and paste its output: false | true; echo "exit ${pipestatus[1]}"'; }
