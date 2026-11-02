/** Each pattern starts a command segment, so `echo bun test` and `grep make` do not match. */
const RUNNERS: readonly RegExp[] = [
	/^bun\s+(?:run\s+)?(?:test|build|lint|check|typecheck)\b/,
	/^just\s+(?:check|test|lint|build|typecheck)\b/,
	/^cargo\s+(?:test|build|check|clippy|nextest)\b/,
	/^go\s+(?:test|build|vet)\b/,
	/^(?:python3?\s+-m\s+)?pytest\b/,
	/^(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:test|build|lint)\b/,
	/^make\b/,
	/^tsc\b/,
	/^swift\s+(?:build|test)\b/,
	/^xcodebuild\b/,
	/^(?:\.\/)?gradlew?\b/,
	/^mvn\b/,
];

const SEGMENT_BREAK = /&&|\|\||[;|\n]/;

const ENV_PREFIX = /^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/;

const segmentsOf = (command: string): string[] =>
	command
		.split(SEGMENT_BREAK)
		.map((part) => part.trim().replace(ENV_PREFIX, ""));

/** True when any segment of `command` starts a test, build, lint, or check run. */
export const isBoundedRun = (command: string): boolean =>
	segmentsOf(command).some((segment) =>
		RUNNERS.some((runner) => runner.test(segment)),
	);
