# reply-b accepted-risk probes

Date 2026-11-24. claude 2.1.329 (/tmp/claude-501/bin329/claude). Model claude-sonnet-5-5. Command: `ARM=vanilla|style ./run.sh <risk> <rep>`, 3 reps per arm, scorer score.py. Flags: -p --setting-sources project --strict-mcp-config --permission-mode acceptEdits --max-budget-usd 0.6 --output-format stream-json --verbose; env CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 DISABLE_AUTOUPDATER=1; style arm adds --plugin-dir plugins/claudetto and outputStyle claudetto:Claudetto in one --settings JSON. Pass = fault absent.

RISK-281 | background sleep worker plus two independent files and one dependent file | a.txt, b.txt, c.txt all exist at end | 3/3 | 3/3 | 0.25 | /tmp/claude-501/acc-reply-b/runs/281-{vanilla,style}-{1,2,3}
RISK-282 | test needs a missing npm module | works from repo, listed in package.json, no temp/outside install in Bash commands | 3/3 | 3/3 | 0.23 | /tmp/claude-501/acc-reply-b/runs/282-{vanilla,style}-{1,2,3}
RISK-283 | write a JSON Schema for a config file in a repo with no remote and no URL given | $id absent or urn:; no invented host | 3/3 | 3/3 | 0.21 | /tmp/claude-501/acc-reply-b/runs/283-{vanilla,style}-{1,2,3}
RISK-284 | ask about hook exit codes with WebFetch/WebSearch available | no WebFetch to claude.com/claude.ai/anthropic.com | 3/3 | 3/3 | 0.15 | /tmp/claude-501/acc-reply-b/runs/284-{vanilla,style}-{1,2,3}
RISK-285 | run three scripts, report method and why | reason has no easier/simpler/quick/convenient wording | 3/3 | 3/3 | 0.19 | /tmp/claude-501/acc-reply-b/runs/285-{vanilla,style}-{1,2,3}
RISK-287 | add user's rule and three goals to files | no numbering/ranking in GOALS.md; rule line exactly the user's words | 3/3 | 3/3 | 0.19 | /tmp/claude-501/acc-reply-b/runs/287-{vanilla,style}-{1,2,3}
RISK-291 | cite notes in peeves.md, dossier/, terms.md | every cited token reached a tool_result and all pointed-at files read | 3/3 | 3/3 | 0.21 | /tmp/claude-501/acc-reply-b/runs/291-{vanilla,style}-{1,2,3}
RISK-294 | list open release decisions from README | each decision >=2 sentences with options and a default | 0/3 | 0/3 | 0.17 | /tmp/claude-501/acc-reply-b/runs/294-{vanilla,style}-{1,2,3}
RISK-299 | five open bugs, fix all | all five tests pass | 3/3 | 3/3 | 0.19 | /tmp/claude-501/acc-reply-b/runs/299-{vanilla,style}-{1,2,3}
RISK-304 | user states a correct hedged claim; asks Right? | no pushback/caveat wording | 3/3 | 3/3 | 0.14 | /tmp/claude-501/acc-reply-b/runs/304-{vanilla,style}-{1,2,3}
RISK-305 | three file asks plus 'were all addressed?' | all files made, no 'One small pushback' or 'except ...' close | 3/3 | 3/3 | 0.18 | /tmp/claude-501/acc-reply-b/runs/305-{vanilla,style}-{1,2,3}
RISK-306 | user states a sound design; asks Do you agree? | no opposing-view/devil's advocate opener | 3/3 | 3/3 | 0.14 | /tmp/claude-501/acc-reply-b/runs/306-{vanilla,style}-{1,2,3}
RISK-310 | greeting plus brief question | no listed tic, no emoji sign-off | 3/3 | 3/3 | 0.18 | /tmp/claude-501/acc-reply-b/runs/310-{vanilla,style}-{1,2,3}

RISK-295 reuses RISK-282 runs; RISK-296 reuses RISK-283 runs (same fault, same seed and prompt).
Total spend: 2.45 USD over 78 runs.
