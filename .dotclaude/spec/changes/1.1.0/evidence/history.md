# History of Versions Before 1.0.0 (P78)

## Method

The tags and the GitHub releases of each version before 1.0.0 were listed on 2026-10-14.
`git ls-remote --tags origin` showed only the 8 `--v1.0.0` tags, so the old tags were local only.
`gh release list --limit 200` showed no release.
The user approved the deletion of all 24 local tags (2026-10-14).
Each tag was deleted with `git tag -d`.
To restore a tag, run `git tag <tag> <commit>` with the commit in the table.

## Deleted Tags

| Tag | Commit |
| --- | --- |
| `dotclaude-browser--v0.23.2` | `01721482d8cd23fc49ec0e18dda4fad3377dbfd3` |
| `dotclaude-browser--v0.24.0` | `f3ee5f66d15ebd4569c32319674cd2cc2ba230fc` |
| `dotclaude-browser--v0.25.0` | `bbc2c98c70804fd9110894709d45e0e713027c1f` |
| `dotclaude-browser--v0.25.1` | `c4d9cdc28db4f9b744801843ca42a3c733af5bef` |
| `dotclaude-browser--v0.26.0` | `1e8863ab1293ea3e36dd151e2e527b946f08d95c` |
| `dotclaude-browser--v0.27.0` | `157c81c6929894218dd6210da1809e6d31643b21` |
| `dotclaude-browser--v0.28.0` | `16fb6993d6f4e5853e8afdd2a5247963108b722a` |
| `dotclaude-codegraph--v0.28.0` | `16fb6993d6f4e5853e8afdd2a5247963108b722a` |
| `dotclaude-docs--v0.28.0` | `16fb6993d6f4e5853e8afdd2a5247963108b722a` |
| `dotclaude-jev--v0.22.0` | `53ccb31559f3b4cd0ea49b5f91aad112bc6789d6` |
| `dotclaude-jev--v0.22.1` | `fcab46b0393cc0de949810594106f0ee6d15d36a` |
| `dotclaude-jev--v0.22.2` | `3faf213b312b25d884a42b85639d151a08afec4a` |
| `dotclaude-jev--v0.22.3` | `95d5944fcdff5e29dcc920f178eb82e2ff0605a4` |
| `dotclaude-jev--v0.23.0` | `5885752b15452c9824f545a5df1b93f928c921ae` |
| `dotclaude-jev--v0.23.1` | `1e9a655ee244e0ce8852a81f01af4bf413024a99` |
| `dotclaude-jev--v0.23.2` | `01721482d8cd23fc49ec0e18dda4fad3377dbfd3` |
| `dotclaude-jev--v0.24.0` | `f3ee5f66d15ebd4569c32319674cd2cc2ba230fc` |
| `dotclaude-jev--v0.25.0` | `bbc2c98c70804fd9110894709d45e0e713027c1f` |
| `dotclaude-jev--v0.25.1` | `c4d9cdc28db4f9b744801843ca42a3c733af5bef` |
| `dotclaude-jev--v0.26.0` | `1e8863ab1293ea3e36dd151e2e527b946f08d95c` |
| `dotclaude-jev--v0.27.0` | `157c81c6929894218dd6210da1809e6d31643b21` |
| `dotclaude-jev--v0.28.0` | `16fb6993d6f4e5853e8afdd2a5247963108b722a` |
| `dotclaude-lab--v0.28.0` | `16fb6993d6f4e5853e8afdd2a5247963108b722a` |
| `dotclaude-sessions--v0.28.0` | `16fb6993d6f4e5853e8afdd2a5247963108b722a` |

## Kept

The `--v1.0.0` tags of the 8 plugins stay.
The wiki pages in `wiki/archive/` stay.
No remote tag and no GitHub release was deleted, because none existed.
