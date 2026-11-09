import { openItems } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/limits/open-items.ts";
const t = { denied: false, asking: false };
console.log(JSON.stringify(openItems("Done items 1-3.\n\n## What I Need from You\n1. Send what the empty message was meant to say.", t)));
console.log(JSON.stringify(openItems("Done.\n\nWant me to write the test next?", t)));
console.log(JSON.stringify(openItems("## Still open\n- [ ] add the permission check to gate.ts", t)));
