const f="/tmp/probe-148/trust.ts"; const s=await Bun.file(f).text(); await Bun.write(f, s.replace("/private/tmp/probe-paid/work","/private/tmp/probe-148/work"));
