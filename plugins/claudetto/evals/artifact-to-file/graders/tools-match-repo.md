---
type: regex
target:
  source: file
  path: prompts/live/dex.system.md
pattern: '^(?=[\s\S]*\bticket_lookup\b)(?=[\s\S]*\bticket_search\b)(?![\s\S]*\b(?:find_ticket|query_tickets|lookup_ticket|search_tickets)\b)(?![\s\S]*\btickets\.(?:lookup|search)\b)'
weight: 3
---
