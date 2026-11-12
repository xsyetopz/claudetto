// Prints only label key names and how many cases carry each, never a value or case text.
const set = await Bun.file(Bun.argv[2] as string).json();
const counts: Record<string, number> = {};
for (const f of set.fixtures as any[])
	for (const k of Object.keys(f.labels ?? {})) counts[k] = (counts[k] ?? 0) + 1;
console.log(JSON.stringify({ n: set.fixtures.length, labelKeys: counts }));
