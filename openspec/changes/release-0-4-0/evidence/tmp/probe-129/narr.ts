// usage: bun narr.ts GLOB... : text blocks that precede a tool_use in the same turn, and the share that announce the next step
const ANNOUNCE = /^(now\b|next\b|let me\b|let's\b|i'll\b|i will\b|i'm going to\b|i am going to\b|first,|then\b|going to\b|checking\b|reading\b|running\b|looking\b)/i;
let blocks = 0, announce = 0, sessions = 0; const ex: string[] = [];
for (const g of Bun.argv.slice(2)) for await (const p of new Bun.Glob(g).scan("/")) {
	sessions++;
	const ev = (await Bun.file("/" + p).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
	const content = ev.filter((e) => e.type === "assistant").flatMap((e) => e.message.content);
	content.forEach((c: any, i: number) => {
		if (c.type !== "text" || !content.slice(i + 1).some((d: any) => d.type === "tool_use")) return;
		blocks++;
		if (ANNOUNCE.test(c.text.trim())) { announce++; if (ex.length < 6) ex.push(c.text.trim().slice(0, 120)); }
	});
}
console.log({ sessions, blocks, announce, perSession: (announce / sessions).toFixed(2) }); console.log(ex.join("\n"));
