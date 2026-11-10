const f = "/Users/krystian/CodeProjects/xsyetopz/claudetto/ISSUES.md";
let s = await Bun.file(f).text();
const h =
	"### Core's `context_management` section contradicts the handoff block";
if (!s.includes(h)) throw new Error("anchor missing");
const entry = `### A handover costs half of a core compaction at 166k tokens

Measured on 2026-11-02 on one session shape, run in two arms (\`docs/evidence/handover-vs-compaction.md\`, \`/tmp/probe-148\`): seven \`Read\` results of about 21,200 tokens each, a turn that ends at 166,011 tokens of context, then a compaction and one prompt. Counted free first on the fake API (888,236 and 890,150 tokens against 8,000,000 allowed), then paid.

| Per compaction cycle | Handover | Core \`/compact\` |
| --- | --- | --- |
| Compaction request: input, output, cache read, cache write | 47, 510, 166,011, 22 | 23,091, 800, 144,849, 66 |
| Next prompt: input, output, cache read, cache write | 2, 6, 13,515, 4,791 | 2, 5, 12,775, 5,983 |
| Tokens | 184,904 | 187,571 |
| Dollars (\`1h\` writes) | $0.043 | $0.094 |

The tokens match, the dollars do not. Core's request puts its breakpoint on the message before the last (without a \`ttl\`), so the last \`Read\` result and the reply, 23,091 tokens, went as uncached input at 20 times the read rate. The fork puts its breakpoint on the final reply and reads all of it from cache. One run per arm. The two arms with the calibration and a mistimed try took 2,000,248 tokens, $1.73, 0.0625% of 3.20B.

`;
await Bun.write(f, s.replace(h, entry + h));
