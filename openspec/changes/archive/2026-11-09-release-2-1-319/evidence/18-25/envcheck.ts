import { launchEnv } from "/tmp/claudekit-leftovers/claudekit/src/launcher/launcher.ts";
const src = await Bun.file(
	"/Users/krystian/CodeProjects/xsyetopz/claudetto/openspec/changes/release-2-1-319/evidence/18-5/harness.ts",
).text();
const pass = JSON.parse(src.match(/const PASS = (\[.*\]);/)![1]);
const env = launchEnv(
	{ passEnv: pass, auth: "env" } as never,
	{ config: "/tmp/x" },
	{
		HOME: "/h",
		PATH: "/p",
		ANTHROPIC_API_KEY: "sk-test-1",
		CLAUDE_CODE_OAUTH_TOKEN: "oat-test-1",
	},
);
console.log(
	JSON.stringify({
		pass,
		hasApiKey: "ANTHROPIC_API_KEY" in env,
		hasToken: "CLAUDE_CODE_OAUTH_TOKEN" in env,
	}),
);
