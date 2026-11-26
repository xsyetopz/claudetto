#!/bin/sh
# Prints the session directory, the spec files, the requirement headings in use and the uncommitted
# spec diff when the skill loads, so the agent starts with them instead of a turn of pwd, ls, grep
# and git diff.
# A failing injected command aborts the skill, so every branch exits 0.
pwd
if [ -d specs ]; then
	echo "specs/:"
	ls specs
	echo "requirement headings in use:"
	grep -h '^## ' specs/*.md 2>/dev/null
	echo "uncommitted spec edits:"
	git diff HEAD -- specs/ 2>/dev/null | head -120
else
	echo "no specs/ directory"
fi
ls ARCHITECTURE.md DESIGN.md 2>/dev/null
# The tracked files show the code that already handles the request's concept, whose conventions the
# new code follows; capped so a large repo does not flood the skill.
echo "tracked files:"
git ls-files 2>/dev/null | grep -v '^specs/' | head -200
exit 0
