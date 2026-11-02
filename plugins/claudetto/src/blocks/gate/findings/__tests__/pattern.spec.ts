import { describe, expect, test } from "bun:test";
import { bash, facts } from "../../__tests__/facts-stub.ts";

const withEnv = () => ({ ...facts(), hasEnvFile: async () => [".env"] });

describe("text that names an env file without reading one", () => {
	for (const command of [
		`grep -n "^<[a-z_]*>$" FILE`,
		`grep -n '$.env.get' src/x.ts`,
		`rg -n '\\$\\.env\\.get' src`,
		`perl -0pi -e 's/\\$\\.env\\.get/X/' src/blocks/context7/block.ts`,
		`sed -i '' 's/await \\$\\.env\\.get(NAME)/await $.env.get("NAME")/' plugin/register.ts`,
		`cat > /tmp/repro.ts <<'EOF'
grep -n "^<[a-z_]*>$" FILE
EOF`,
	]) {
		test(`\`${command}\` is not denied`, async () => {
			const v = await bash(command, withEnv());

			expect(v.decision).not.toBe("deny");
		});
	}
});

describe("a read of an env file", () => {
	for (const command of [
		"cat .env",
		`cat "$HOME/p/.env"`,
		"grep TOKEN .env",
		"rg -n TOKEN .env.local",
		`perl -ne 'print' .env`,
	]) {
		test(`\`${command}\` stays denied`, async () => {
			const v = await bash(command, withEnv());

			expect(v.decision).toBe("deny");
		});
	}
});
