# report

`bun report.ts` prints one line per row and a total.

## JSON output

`bun report.ts --json` prints a bare array of rows and no total:

```json
[
  { "name": "open", "count": 4 },
  { "name": "closed", "count": 9 }
]
```
