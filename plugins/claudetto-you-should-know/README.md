# Claudetto-You-Should-Know

Every few steps of a session, this plugin sends a side request that names one thing from the session worth learning, and shows it above the prompt. Learn more explains it in cards. It is a port of the Claude Code 2.1.327 bundled you-should-know plugin.

## Install

```sh
claude plugin install claudetto-you-should-know --marketplace xsyetopz/bedrock
```

To disable it, run `/plugin` and turn off claudetto-you-should-know, or run `claude plugin disable claudetto-you-should-know`. The in-session off command handled by the plugin also silences the notes for the current session.

## Recheck With Jev

With `TYPESAFE_API_KEY` set, the recheck of a shown note asks TypeSafe Jev whether the reply text since the note was shown (the last 3,000 characters) makes the note untrue; a rating of 0.7 or above withdraws it. A failed Jev call goes to Haiku 5.5 at high effort, and when both fail the note stays. The reply text goes to `api.typesafe.ai` with key shapes, `Bearer` values and secret-named assignments masked, so leave the key unset to keep the recheck on the forked turn, which reads the whole session. Writing a note stays on the fork. See ADR-0202.

## Release Notes

- The propose prompt shrank from 33,204 bytes to 11,072 bytes (measured with empty lists). It is rewritten in the plugin's own words, with each rule stated positively and given its reason. The behaviour, the interface and the on-screen texts stay as the bundled plugin has them (REQ-YOU-SHOULD-KNOW-073).
- An offer no longer stays up after later steps of the same turn make it untrue. While an untouched offer is shown, the plugin asks the model once at each later check step and once when the turn ends whether anything since the offer appeared contradicts it, and withdraws the offer on a DROP answer. An unanswered request, an error or an unclear answer keeps the offer; an explained note is never withdrawn (REQ-YOU-SHOULD-KNOW-075).
