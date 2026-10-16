// The reading of a repository from a remote URL or a `gh -R` name.
// The code is in `src/kernel/repo/remote.ts`, because the `setup` slice reads the same owner test.

export {
  isOwn,
  keyOf,
  type Repo,
  repoOf,
  repoOfSpec,
} from "../../../../../kernel/repo/remote.ts";
