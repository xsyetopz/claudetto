// The extraction, the render and the diff of `dev/builtins.ts` on a small fixture bundle, with no `external/` folder.

import { expect, test } from "bun:test";
import path from "node:path";
import { $, file as bunFile, write as bunWrite } from "bun";
import { extract } from "../../dev/builtins/extract.ts";
import { diff, render } from "../../dev/builtins/render.ts";
import { tmpDir } from "../support/repo.ts";

const TONE_BE_BRIEF_RE = /## `tone`\n\n[^#]*Be brief\./;

const BUNDLE = [
	'var KA="kebab-cmd",TA="Zebra",SK="my-skill";',
	'a={type:"local",name:"hello",description:"Say hello"};',
	'b={name:"rev",description:"Reverse",type:"local-jsx"};',
	'c={type:"prompt",name:KA,description:"Named by a constant"};',
	"\ncc-plugin-tips\n",
	'if(e.attachment.type==="alpha_note")switch(k){case"alpha_note":return`ab`;case"x":break}',
	'if(e.attachment.type==="beta_note")r={beta_note:(e)=>"cdef",other:1};',
	'd=Qt({name:TA,searchHint:"s",async description(){return"Zebra tool"},get inputSchema(){return"not read"}});',
	'e={agentType:"scout",whenToUse:"Find things",getSystemPrompt:()=>"p"};',
	'oi({name:"first",menuDescription:"m",description:"d",userInvocable:!0});oi({name:SK,menuDescription:"mm",userInvocable:!0});',
	`var TXT="Be brief.";o=[Sx(\`tone\`,()=>TXT),Sx(\`pre_\${k}\`,()=>"y")];}function z(){}`,
	// The text holds the placeholder of a template literal, so the line joins its two parts.
	["q=`# Committing changes with git`;r=`Co-Authored-By: $", "{x}`"].join(""),
].join("\n");

test("`extract` finds each group in a fixture bundle", () => {
	const got = new Map(
		extract(BUNDLE).map((p) => [`${p.group}:${p.name}`, p.bytes]),
	);
	expect(got.get("commands:hello")).toBe(9);
	// A name before the type, and a name in a constant.
	expect(got.has("commands:rev")).toBe(true);
	expect(got.has("commands:kebab-cmd")).toBe(true);
	expect(got.get("plugins:tips")).toBeNull();
	// A `case` branch, and an entry of a map of renderers.
	expect(got.get("attachments:alpha_note")).toBe(2);
	expect(got.get("attachments:beta_note")).toBe(4);
	// A tool named by a constant counts only its `description` text.
	expect(got.get("tools:Zebra")).toBe(10);
	expect(got.get("agents:scout")).toBe(12);
	expect(got.has("skills:first") && got.has("skills:my-skill")).toBe(true);
	expect(
		got.has("git:instructions") && got.has("attribution:commit and PR"),
	).toBe(true);
});

test("`render` is deterministic and `diff` names an added and a removed row", () => {
	const a = render(extract(BUNDLE), "9.9.9", {});
	expect(
		render(extract(BUNDLE.split("\n").reverse().join("\n")), "9.9.9", {}),
	).toEqual(a);
	const plus = { group: "plugins", name: "new", bytes: null } as const;
	const b = render([...extract(BUNDLE), plus], "9.9.9", {});
	expect(diff(a, b)).toEqual(["Builtins: added | `new` | plugins"]);
	expect(diff(b, a)).toEqual(["Builtins: removed | `new` | plugins"]);
	expect(diff(a, a)).toEqual([]);
});

test("`--check` passes after a write, and names a changed row and a stale page", async () => {
	const [dir, out] = [await tmpDir("builtins"), await tmpDir("builtins")];
	await bunWrite(path.join(dir, "strings.txt"), BUNDLE);
	const run = (...flags: string[]) =>
		$`bun dev/builtins.ts ${flags} --dir ${dir} --out ${out}`.nothrow().quiet();
	expect((await run()).exitCode).toBe(0);
	expect((await run("--check")).exitCode).toBe(0);
	const strict = await run("--strict");
	expect(strict.exitCode).toBe(1);
	expect(strict.stderr.toString()).toContain("todo");
	const index = path.join(out, "Builtins.md");
	await bunWrite(
		index,
		(await bunFile(index).text()).replace("| `tips` |", "| `tipz` |"),
	);
	await bunWrite(path.join(out, "Builtins-Old.md"), "old\n");
	const bad = await run("--check");
	expect(bad.exitCode).toBe(1);
	const err = bad.stderr.toString();
	expect(err).toContain("tips");
	expect(err).toContain("Builtins-Old");
});

test("`dev/builtins.ts` writes the text of each section to `Sections.md`", async () => {
	const [dir, out] = [await tmpDir("builtins"), await tmpDir("builtins")];
	await bunWrite(path.join(dir, "strings.txt"), BUNDLE);
	await $`bun dev/builtins.ts --dir ${dir} --out ${out}`.quiet();
	const text = await bunFile(path.join(out, "Sections.md")).text();
	expect(text).toMatch(TONE_BE_BRIEF_RE);
	expect(text).toContain("## `pre_`");
});
