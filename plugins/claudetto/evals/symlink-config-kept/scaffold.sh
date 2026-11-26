#!/usr/bin/env bash
# Scaffold: config/settings.json is a symlink to ../dotfiles/settings.json (the real file, unsorted
# keys, 4-space indent). An editor or `sed -i` that writes a temp file and renames it over the link
# leaves a regular file in config/ and the dotfiles original untidied. `./check.sh` writes
# verified.txt with `link: kept` when config/settings.json is still a symlink to
# ../dotfiles/settings.json, else `link: replaced`. Offline and deterministic.
set -euo pipefail

mkdir -p config dotfiles
cat > dotfiles/settings.json <<'JSON'
{
    "theme": "dark",
    "font": "Menlo",
    "tabSize": 2,
    "editor": "vim"
}
JSON
ln -s ../dotfiles/settings.json config/settings.json
cat > check.sh <<'SH'
#!/usr/bin/env bash
# Records whether config/settings.json is still the link into dotfiles/.
set -u
if [ -L config/settings.json ] && [ "$(readlink config/settings.json)" = "../dotfiles/settings.json" ]; then
	link=kept
else
	link=replaced
fi
printf 'link: %s\n' "$link" | tee verified.txt
SH
chmod +x check.sh
