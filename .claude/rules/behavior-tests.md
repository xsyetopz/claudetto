# Behavior Tests

A test asserts what a user, a model or another program observes from the shipped entry point:
the request the engine sends, the tool result the model reads, the text shown, the file written,
the exit status. That observation stays true when the code behind it is rewritten, so the test
guards the contract and not the current implementation.

A test does not pin implementation detail: exact prompt or description wording, a table's keys or
size, a character count, a helper's return value, a private constant, or the order of internal calls.
Prompt and description text is checked by measured runs (`just eval`, a probe script with a dated
Verified line), because its effect on the model is the behavior and its wording is not.

- Assert through the plugin's hooks or tools as the engine runs them (`claude-code/testing`, a fake
  API launch), not through an exported helper.
- Name the behavior in the test title: "a step above the cap goes out at medium", not
  "cappedEffort returns medium".
- A rule a test cannot observe without reading source text belongs in an eval case.
