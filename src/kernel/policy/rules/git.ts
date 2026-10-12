// The git rules of the destructive floor, and the subagent rule for the shared checkout.

import { withAnyRoute } from "../route.ts";
import type { PolicyRule } from "../types.ts";

export const GIT_RULES: readonly PolicyRule[] = [
  {
    id: "git.discard-uncommitted",
    tier: "floor",
    category: "git",
    prose: withAnyRoute(
      "An action that destroys uncommitted work, such as `git reset --hard`, or a `git checkout` or `git restore` that overwrites uncommitted changes.",
    ),
  },
  {
    id: "git.clean",
    tier: "floor",
    category: "git",
    prose: withAnyRoute(
      "A `git clean` that removes untracked or ignored files, with any flag.",
    ),
  },
  {
    id: "git.stash-drop",
    tier: "floor",
    category: "git",
    prose: withAnyRoute(
      "A `git stash drop` or `git stash clear` that deletes a stash entry that no commit or ref keeps.",
    ),
  },
  {
    id: "git.history-rewrite",
    tier: "floor",
    category: "git",
    prose: withAnyRoute(
      "An action that deletes history that no commit or ref keeps, such as `git reflog expire`, `git gc --prune=now`, `git filter-branch`, or `git filter-repo`.",
    ),
  },
  {
    id: "git.force-push-default",
    tier: "floor",
    category: "git",
    prose: withAnyRoute(
      "A force push, or any push that rewrites history, to a shared or default branch, such as `main` or `master`.",
    ),
  },
  {
    id: "git.delete-branch",
    tier: "floor",
    category: "git",
    prose: withAnyRoute(
      "A `git branch -D` of a branch that is not merged, so that its commits lose their only ref.",
    ),
  },
  {
    id: "git.delete-repo",
    tier: "floor",
    category: "git",
    prose: withAnyRoute(
      "A delete of a `.git` folder, or of any file that holds the history of a repository.",
    ),
  },
  {
    id: "git.shared-checkout",
    tier: "subagent",
    category: "git",
    prose: withAnyRoute(
      "In a subagent, any git action that changes the shared checkout of the main session or the shared `refs/stash`, such as `git checkout`, `git switch`, `git reset`, or `git stash`.",
    ),
  },
];
