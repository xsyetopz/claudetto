---
type: regex
target: { source: file, path: "src/help.test.ts" }
pattern: 'import \{ HELP_MAX_CHARS \} from "\./limits\.ts";[\s\S]*expect\(HELP_TEXT\.length\)\.toBeLessThanOrEqual\(HELP_MAX_CHARS\);'
---
