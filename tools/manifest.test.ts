import { expect, test } from "bun:test";
import { file } from "bun";

const PATH_CHOICE = /compaction|summary/i;

// The lab cannot read the manifest: a hooks module imports only its own code and "claude-code".
test("no plugin option chooses the compaction path or a summary model", async () => {
	const { userConfig } = await file(
		`${import.meta.dir}/../plugins/claudetto/.claude-plugin/plugin.json`,
	).json();
	const keys = Object.keys(userConfig);

	expect(keys).toContain("handoverThresholdTokens");
	expect(keys.filter((k) => PATH_CHOICE.test(k))).toEqual([]);
});

// `limits/open-items.ts` reads only `- [ ]` lines, so a request in any other form escapes the Stop check.
test("the output style asks for the open-item form the Stop check reads", async () => {
	const style = await file(
		`${import.meta.dir}/../plugins/claudetto/output-styles/Concise.md`,
	).text();
	const requests = style.slice(
		style.indexOf("<requests_to_the_user>"),
		style.indexOf("</requests_to_the_user>"),
	);

	expect(requests).toContain("`- [ ]` items");
});
