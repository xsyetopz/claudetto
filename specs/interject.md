# Interject

## INTERJECT-001 Hold the Next Call After a Message Typed Mid-Turn

claudetto refuses the main loop's next tool call once after the user presses Enter on a message during a running turn, so the model answers that message before it acts again.

Given a message typed with Enter while a turn runs
When the main loop makes its next tool call
Then that call is refused once with a note to reply first, and the call after it runs

Given a message queued with `ctrl+x enter`, or one typed while the session is idle
When the main loop makes its next tool call
Then the call runs
