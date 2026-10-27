## REMOVED Requirements

### Requirement: Answers Count as User Words

**Reason**: The check of an attribution such as "the user chose ..." matched English words, and the user asked for each word-based check to be removed (the user, 2026-10-27). An answer of `AskUserQuestion` still counts as a source of a number.
**Migration**: None. A line that names a choice of the user is no longer checked.
