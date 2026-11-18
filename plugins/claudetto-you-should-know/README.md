# claudetto-you-should-know

Every few steps of a session, this plugin sends a side request that names one thing from the session worth learning, and shows it above the prompt. Learn more explains it in cards. It is a port of the Claude Code 2.1.327 bundled you-should-know plugin.

To disable it, run `/plugin` and turn off claudetto-you-should-know, or run `claude plugin disable claudetto-you-should-know`. The in-session off command handled by the plugin also silences the notes for the current session.

## Release Notes

- The propose prompt shrank from 33,204 bytes to 11,072 bytes (measured with empty lists). It is rewritten in the plugin's own words, with each rule stated positively and given its reason. The behaviour, the interface and the on-screen texts stay as the bundled plugin has them (REQ-YOU-SHOULD-KNOW-073).
