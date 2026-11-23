---
type: regex
target:
  source: file
  path: backlog.txt
pattern: '^(?=(?:[^\n]*\n){33}$)# backlog export, pipe-separated: date \| priority \| status \| title\n# 9 open P1/P2 items at the last triage \(2026-10-01\)\n2026-10-03 \| P1 \| open \| Fix café checkout rounding — épée orders\n[\s\S]*\n2026-9-9 \| P2 \| open \| Retry webhooks 3× before paging   \n[\s\S]*\n2026-9-2 \| P3 \| wontfix \| Translate the open-hours banner\n$'
weight: 1
---
