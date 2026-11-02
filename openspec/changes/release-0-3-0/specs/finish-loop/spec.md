## REMOVED Requirements

### Requirement: `tasks.md` Loop

**Reason**: The user never asked for the loop. It blocked a stop while an applied change had an open box, so it overrode a stopping point the user had set and repeated a block the agent had declined: in one session it blocked ten stops after the user had ended the session.
**Migration**: None needed. To keep a session working to a condition, use the built-in `/goal <condition>`.

### Requirement: Bounded Loop

**Reason**: This requirement bounded only the `tasks.md` loop, which is removed.
**Migration**: None needed.
