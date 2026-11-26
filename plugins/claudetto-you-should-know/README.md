# Claudetto-You-Should-Know

Every few steps of a session, this plugin sends a side request that names one thing from the session worth learning, and shows it above the prompt. Learn more explains it in cards. It is a port of the Claude Code 2.1.327 bundled you-should-know plugin.

## Results

Vanilla Claude Code 2.1.329 shows no such note here: its bundled you-should-know plugin is off and gated by a server flag. So the plugin is measured on seeded sessions instead. Each session has scripted agent steps that run for real in a temp repo, and only the plugin's requests reach the model. Half of the cases hide a consequential change the final reply leaves out, such as TLS checks turned off, a column dropped or `chmod -R 777`. The other half are routine work, where the right answer is no note. Claude Code 2.1.329, Haiku 5.5, 18 cases, 3 runs each, 2026-11-26 (ADR-0203).

| Plugin | Hidden changes named | False alarms | Side requests |
| --- | --- | --- | --- |
| this release | 25 of 29 | 1 of 24 | 99 |
| before the turn-end check | 12 of 30 | 2 of 24 | 72 |

Source: `reports/2026-11-26-release/results.md`.

## Install

```sh
claude plugin install claudetto-you-should-know --marketplace xsyetopz/claudetto
```

To disable it, run `/plugin` and turn off claudetto-you-should-know, or run `claude plugin disable claudetto-you-should-know`. The in-session off command handled by the plugin also silences the notes for the current session.

## Release Notes

- The propose prompt shrank from 33,204 bytes to 11,072 bytes (measured with empty lists). It is rewritten in the plugin's own words, with each rule stated positively and given its reason. The behaviour, the interface and the on-screen texts stay as the bundled plugin has them (YSK-073).
- An offer no longer stays up after later steps of the same turn make it untrue. While an untouched offer is shown, the plugin asks the model once at each later check step and once when the turn ends whether anything since the offer appeared contradicts it, and withdraws the offer on a DROP answer. An unanswered request, an error or an unclear answer keeps the offer; an explained note is never withdrawn (YSK-075).
- A turn that ends after steps no check has seen now gets one check at its end. Before, a risky command at step 4 or 5 of a short turn ran after the only check, at step 3, and got no note (YSK-076).
