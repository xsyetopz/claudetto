import { expect, test } from "bun:test";
import { isBoundedRun } from "../command.ts";

test.each([
	"bun test",
	"bun run build",
	"bun check",
	"just check",
	"just lint",
	"cargo test --workspace",
	"cargo clippy",
	"go test ./...",
	"go vet ./...",
	"pytest -x",
	"python3 -m pytest",
	"npm run test",
	"pnpm lint",
	"yarn build",
	"make all",
	"tsc --noEmit",
	"swift build",
	"xcodebuild -scheme App",
	"./gradlew build",
	"mvn verify",
	"CI=1 bun test",
	"cd app && bun test 2>&1",
	"bun test | tail -n 5",
])("`%s` is a run to bound", (command) => {
	expect(isBoundedRun(command)).toBe(true);
});

test.each([
	"git status",
	"grep -rn make src",
	"echo bun test",
	"ls -la",
	"just --list",
	"cargo run",
	"go run main.go",
	"bun install",
	"cat tsconfig.json",
])("`%s` is not", (command) => {
	expect(isBoundedRun(command)).toBe(false);
});
