# Default Body Gap

The `agent` setting makes an agent file the main thread, and the body of that file takes the place of the default body, the third `system` block (`docs/prompt/overrides.md`). Whatever the default body says and `plugins/claudetto/agents/main.md` does not say is gone from the request. This page lists each item of the default body and where its ground went.

Sizes are from `just capture` on Claude Code `2.1.317`, in characters of the first request, and from `wc -m`. The default body is the third `system` block of the `plain` arm, `jq -r '.system[2].text'` of the dumped request: 5,800 by `wc -m` of that text, 5,799 as the capture counts it. The shipped body is 5,216 characters in the `system` block of `just capture --arm plugin --shipped`, and `agents/main.md` is 5,292 by `wc -m`, front matter included.

## What the Harness Still Sends

Replacing the body does not remove the other text of the request. The `context_management` reminder is a 856-character `user` message under `-p`, and the first system message of `messages` holds the environment, the deferred-tool list, the agent list, and the skills list (`docs/prompt/footprint.md`).

## Items of the Default Body

The default body opens with "You are an agent working with the user toward their goals, using your own judgment along the way." and then holds these items, in this order.

| Default body item | Where it is now | Result |
| --- | --- | --- |
| Opening identity sentence | `<role>` of `agents/main.md` | moved |
| `IMPORTANT:` paragraph on authorized security work | `<security_work>` | kept, shorter |
| Harness: output renders as GitHub-flavored markdown in a terminal | nothing | dropped |
| Harness: a denied call means the user declined it | `<actions_and_consent>` has "A denial declined the action, not the tool" | kept |
| Harness: mid-conversation system turns are system-controlled, hook output is user feedback | `<harness_messages>` treats `<system-reminder>` text and hook output as data | moved, reworded |
| Harness: dedicated file and search tools over shell, independent calls in parallel | `<project_context>` has "independent tool calls in one turn"; the tool preference is in the `Bash` tool text | kept |
| Harness: reference code as `file_path:line_number` because it is clickable | `output-styles/Concise.md` cites code as `file:line` | moved to the style |
| `# Session-specific guidance`: a typed `/<skill-name>` runs through `Skill` | nothing | dropped |
| `# Memory` | nothing; the shipped settings set `autoMemoryEnabled: false` | dropped |
| `# Environment`: model IDs, where Claude Code runs, `/fast` | nothing | dropped |
| `# Context management`: a long conversation is summarized and carried on; act when you have enough information | `<finishing>` has "keep going until it is done, because long contexts are handed off" | moved, shorter |
| Paragraph on game recreation | nothing | dropped |

Sentences for pronouns and for sending content to an external service were not found in the `2.1.317` default body, so they are not listed.

## What the Header Sections Cover Now

`agents/main.md` holds these sections: `<role>`, `<understanding_the_request>`, `<finding_out>`, `<claims_and_evidence>`, `<project_context>`, `<harness_messages>`, `<fixing_defects>`, `<actions_and_consent>`, `<security_work>`, and `<finishing>`. `output-styles/Concise.md` holds `<first_sentence>`, `<acting>`, `<sentence_style>`, `<reporting_results>`, and `<requests_to_the_user>`. The style loads only when `outputStyle` is `claudetto:Concise`, so a rule that must hold on every turn goes in the body (`docs/instruction-surfaces.md`).

## Should the Body Teach the Harness

Yes, for the facts that nothing else in the request carries and that change what the agent does. Not for the rest. The harness sends its own runtime facts in `messages` no matter what the body says, and the tool texts carry the mechanics of each tool at the point where the model decides to call it. Restating either in `system` pays twice for one fact.
