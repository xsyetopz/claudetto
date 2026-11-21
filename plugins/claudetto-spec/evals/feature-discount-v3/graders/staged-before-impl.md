---
type: regex
target: trace
match: not_contains
pattern: '^(?:(?!"name":"Bash","input":\{(?:"[a-z_]+":(?:false|true|\d+|"(?:[^"\\]|\\.)*"),)*"command":"(?:[^"\\]|\\.)*?\bgit add\b(?:[^"\\]|\\.)*?(?:cart\.test|\s-A\b|\s--all\b|\s\.(?=[\s"\;&|])|\ssrc/?(?=[\s"\;&|])))[\s\S])*?(?:"name":"(?:Edit|Write|MultiEdit)","input":\{(?:"[a-z_]+":(?:false|true|\d+|null|"(?:[^"\\]|\\.)*"),)*"file_path":"(?:[^"]*/)?src/cart\.ts"|"name":"Bash","input":\{(?:"[a-z_]+":(?:false|true|\d+|"(?:[^"\\]|\\.)*"),)*"command":"(?:[^"\\]|\\.)*?(?:(?:>>?|\btee(?: -a)?)\s*[^\s"\\]*src/cart\.ts\b|\b(?:sed|perl) -[a-z]*i[^"\\]*src/cart\.ts\b))'
weight: 3
---
