const FIXED = /^drift-(only-config|read-only)-/;
for (const arm of ["base","change"]) {
 const glob=[...new Bun.Glob("results-*.json").scanSync("/tmp/probe-122/logs")];
 const files=[glob.find(g=>g.startsWith(`results-${arm}-1`))!, ...glob.filter(g=>g.startsWith(`results-${arm}-fix-`))];
 for (const f of files) for (const r of JSON.parse(await Bun.file(`/tmp/probe-122/logs/${f}`).text())) {
  if (f.includes("-1") && !f.includes("fix") && FIXED.test(r.id)) continue;
  if (!r.pass && r.evidence.includes("judge")) console.log(`### ${arm} ${r.id} r${r.run}\n${r.evidence}\n`);
 }
}
