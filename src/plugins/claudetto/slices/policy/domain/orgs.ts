// The organizations that the user owns, read from the output of `gh api user/memberships/orgs`.
// The code is in `src/kernel/repo/orgs.ts`, because the `setup` slice reads the same owner test.

export { ownedOrgsOf } from "../../../../../kernel/repo/orgs.ts";
