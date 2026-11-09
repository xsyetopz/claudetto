# Split one commit into slices by path prefix and replay its descendants with the same trees.
# Usage: python3 -I split.py <repo> <commit> <plan.json>; prints the new tip. Touches no working tree or index.
import json, os, subprocess, sys, tempfile

repo, target, plan_path = sys.argv[1:4]
plan = json.load(open(plan_path))


def git(*args, env=None, input=None):
    return subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True, text=True,
                          env={**os.environ, **(env or {})}, input=input).stdout.strip()


parent = git("rev-parse", f"{target}^")
files = git("diff-tree", "--no-commit-id", "--name-only", "-r", target).splitlines()
claimed = {}
for i, s in enumerate(plan):
    for f in files:
        if f not in claimed and any(f == p or f.startswith(p) for p in s["paths"]):
            claimed[f] = i
left = [f for f in files if f not in claimed]
assert not left, f"unclaimed: {left}"

meta = git("show", "-s", "--format=%an%x00%ae%x00%ad", target).split("\0")
author = {"GIT_AUTHOR_NAME": meta[0], "GIT_AUTHOR_EMAIL": meta[1], "GIT_AUTHOR_DATE": meta[2]}
index = tempfile.mktemp(prefix="split-index-")
env = {"GIT_INDEX_FILE": index}
git("read-tree", parent, env=env)
head = parent
for i, s in enumerate(plan):
    mine = [f for f in files if claimed[f] == i]
    entries = git("ls-tree", target, "--", *mine)
    git("update-index", "--index-info", env=env, input=entries + "\n")
    tree = git("write-tree", env=env)
    head = git("commit-tree", "-S", tree, "-p", head, "-m", s["subject"], *(["-m", s["body"]] if s.get("body") else []), env=author)
os.unlink(index)
assert git("rev-parse", f"{head}^{{tree}}") == git("rev-parse", f"{target}^{{tree}}"), "final slice tree differs"

for c in git("rev-list", "--reverse", f"{target}..HEAD").splitlines():
    meta = git("show", "-s", "--format=%an%x00%ae%x00%ad%x00%cn%x00%ce%x00%cd", c).split("\0")
    e = {"GIT_AUTHOR_NAME": meta[0], "GIT_AUTHOR_EMAIL": meta[1], "GIT_AUTHOR_DATE": meta[2],
         "GIT_COMMITTER_NAME": meta[3], "GIT_COMMITTER_EMAIL": meta[4], "GIT_COMMITTER_DATE": meta[5]}
    msg = git("show", "-s", "--format=%B", c)
    head = git("commit-tree", "-S", f"{c}^{{tree}}", "-p", head, "-F", "-", env=e, input=msg + "\n")
print(head)
