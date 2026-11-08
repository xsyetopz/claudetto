## REMOVED Requirements

### Requirement: The Sandbox Settings Share Is Measured

**Reason**: The 2.1.319 `sandbox` block is five keys, so the per-setting split of the 0.2.0 block has nothing left to cut. Its cost is one measurement: the first request's `tools` grew from 30,350 to 31,204 bytes (the Bash tool text) with the block on (`design.md`, "Sandbox (goal item 3)", probe "Request size").
**Migration**: None.

### Requirement: Every Surface Is Read and Cut

**Reason**: Its subject was `just capture` and `just inventory`, which read the first request on the fake Messages API of the probing tool `claudekit/`. The tool left this repo under task 17.13 (`e20d11df`), and neither recipe is in the `justfile`. What ships is `just prompt-bytes` (`tools/prompt-bytes.ts`), whose 2.1.319 against baseline tables are in `openspec/changes/release-2-1-319/footprint.md`, "Prompt bytes".
**Migration**: None.

### Requirement: Empty Session Reading Is Recorded

**Reason**: It named `docs/prompt/footprint.md`, which is gone, and a reading taken by the probing tool `claudekit/`, which left this repo under task 17.13 (`e20d11df`). The readings are in `openspec/changes/release-2-1-319/footprint.md` and `openspec/changes/release-2-1-319/evidence/tui/`.
**Migration**: None.

### Requirement: Empty Session Reading Is Split by Owner

**Reason**: It required each number to name the `just capture` command that read it; the recipe left with `claudekit/` under task 17.13 (`e20d11df`). The split by piece is in `openspec/changes/release-2-1-319/footprint.md`, "Prompt bytes".
**Migration**: None.

### Requirement: The Claudetto Share of an Empty Session Falls

**Reason**: Its scenarios read the share with `just capture --shipped`, a recipe that left with `claudekit/` under task 17.13 (`e20d11df`). The 2.1.319 against baseline readings are in `openspec/changes/release-2-1-319/footprint.md`.
**Migration**: None.
