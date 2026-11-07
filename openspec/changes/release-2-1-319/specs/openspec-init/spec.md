## REMOVED Requirements

### Requirement: Setup Runs `openspec init`

**Reason**: claudetto-openspec, a plugin of its own, replaces upstream OpenSpec, and its skills ship with that plugin, so setup has no `openspec init` step (`feature-map.md`, "OpenSpec workflow", row "`openspec init` in setup": drop; `design.md`, "claudetto-openspec replaces upstream OpenSpec": "Setup runs no `openspec init`").
**Migration**: None. Install claudetto-openspec for the OpenSpec workflow.
