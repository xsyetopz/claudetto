// Read on 2026-11-03. Flags: the installed `--help` of `bun`, `uv`, `ruff`, `shellcheck`, `cargo`, `swift`,
// and `make`; the docs or source of the other tools. Marker, `heavy`, and `bulky` names: a doc page, an installed
// `man` page, or the files that `swift package init`, `cargo init`, `uv init`, and `bundle init` wrote in a new
// folder. An entry no source named is not in the table. A tool whose bounding flags are unconfirmed is left out of
// `commands` and named in `omitted`, so a generated file never holds a guess.

export type Kind = "test" | "build" | "lint" | "types";

export interface Command {
	readonly kind: Kind;
	readonly run: string;
	/** Root names or `*` globs; the command applies when one is present. No `when` means it always applies. */
	readonly when?: readonly string[];
}

export interface Family {
	readonly id: string;
	readonly label: string;
	/** Root file names, `*` globs, or a `dir/` prefix that mark a repo as this family. */
	readonly markers: readonly string[];
	/** The first command of a kind whose `when` is present wins. */
	readonly commands: readonly Command[];
	/** Build, cache, and dependency paths: a `dir/` or a `*` glob on a file name. */
	readonly heavy: readonly string[];
	/** The dependency folders at the repo root that a worktree links, each a `dir/` out of `heavy`. */
	readonly deps?: readonly string[];
	/** Lock and minified files, which git tracks: a file name or a `*` glob. */
	readonly bulky?: readonly string[];
	/** Tools whose bounding flags no doc or `--help` confirmed. */
	readonly omitted?: readonly string[];
}

export const FAMILIES: readonly Family[] = [
	{
		id: "js",
		label: "JS/TS",
		markers: [
			"package.json",
			"tsconfig.json",
			"bun.lock",
			"bun.lockb",
			"deno.json",
			"deno.jsonc",
		],
		commands: [
			{
				kind: "test",
				run: "bun test --bail --dots",
				when: ["bun.lock", "bun.lockb"],
			},
			{
				kind: "test",
				run: "deno test --fail-fast --reporter=dot",
				when: ["deno.json", "deno.jsonc"],
			},
			{
				kind: "test",
				run: "vitest --run --bail=1 --reporter=dot --silent",
				when: ["vitest.config.*"],
			},
			{
				kind: "test",
				run: "jest --bail --silent --noStackTrace",
				when: ["jest.config.*"],
			},
			{
				kind: "lint",
				run: "eslint --quiet",
				when: ["eslint.config.*", ".eslintrc*"],
			},
		],
		heavy: ["node_modules/", "dist/", ".next/", "coverage/"],
		deps: ["node_modules/"],
		bulky: [
			"bun.lock",
			"bun.lockb",
			"package-lock.json",
			"yarn.lock",
			"pnpm-lock.yaml",
		],
		omitted: ["prettier", "tsc", "yarn"],
	},
	{
		id: "python",
		label: "Python",
		markers: [
			"pyproject.toml",
			"setup.py",
			"setup.cfg",
			"requirements.txt",
			"Pipfile",
			"uv.lock",
		],
		commands: [
			{
				kind: "test",
				run: "uv run -q --no-progress pytest -q --tb=short -rN --no-header",
				when: ["uv.lock"],
			},
			{ kind: "test", run: "pytest -q --tb=short -rN --no-header" },
			{
				kind: "lint",
				run: "ruff check --output-format=concise -q",
				when: ["ruff.toml", ".ruff.toml"],
			},
			{
				kind: "types",
				run: "mypy --no-error-summary",
				when: ["mypy.ini", ".mypy.ini"],
			},
		],
		heavy: [
			".venv/",
			"venv/",
			"__pycache__/",
			".mypy_cache/",
			".ruff_cache/",
			".pytest_cache/",
			"*.egg-info/",
		],
		deps: [".venv/", "venv/"],
		bulky: ["uv.lock", "poetry.lock", "Pipfile.lock"],
		omitted: ["pip"],
	},
	{
		id: "ruby",
		label: "Ruby",
		markers: ["Gemfile", "*.gemspec", "Rakefile"],
		commands: [{ kind: "test", run: "rspec --fail-fast", when: [".rspec"] }],
		heavy: ["vendor/bundle/", "coverage/"],
		bulky: ["Gemfile.lock"],
		omitted: ["rubocop", "bundler"],
	},
	{
		id: "shell",
		label: "Shell",
		markers: ["*.sh", "*.bash", "*.ps1", "*.psm1", ".shellcheckrc"],
		commands: [
			{ kind: "lint", run: "shellcheck -f gcc *.sh", when: ["*.sh"] },
			{
				kind: "test",
				run: 'pwsh -NoProfile -Command "Invoke-Pester -Output Minimal"',
				when: ["*.ps1", "*.psm1"],
			},
		],
		heavy: [],
		omitted: ["bats -F (formatter value unchecked)"],
	},
	{
		id: "web",
		label: "HTML/CSS",
		markers: ["*.css", ".stylelintrc*", "stylelint.config.*"],
		commands: [
			{
				kind: "lint",
				run: "stylelint -q '**/*.css'",
				when: [".stylelintrc*", "stylelint.config.*"],
			},
		],
		heavy: [],
		omitted: ["htmlhint"],
	},
	{
		id: "c",
		label: "C/C++",
		markers: ["CMakeLists.txt", "Makefile", "meson.build", "build.ninja"],
		commands: [
			{
				kind: "test",
				run: "meson test -q --print-errorlogs",
				when: ["meson.build"],
			},
			{
				kind: "test",
				run: "ctest --output-on-failure -Q --stop-on-failure",
				when: ["CMakeLists.txt"],
			},
			{ kind: "build", run: "ninja --quiet", when: ["build.ninja"] },
			{ kind: "build", run: "make -s", when: ["Makefile"] },
		],
		heavy: ["*.o", "*.a", "*.so", "*.dylib"],
		omitted: ["cmake --build", "conan", "xmake"],
	},
	{
		id: "rust",
		label: "Rust",
		markers: ["Cargo.toml"],
		commands: [
			{
				kind: "test",
				run: "cargo nextest run --status-level fail --failure-output final",
				when: [".config/nextest.toml"],
			},
			{ kind: "test", run: "cargo test -q" },
			{ kind: "build", run: "cargo build -q --message-format short" },
		],
		heavy: ["target/"],
		bulky: ["Cargo.lock"],
		omitted: ["cargo fmt", "cargo clippy"],
	},
	{
		id: "swift",
		label: "Swift",
		markers: ["Package.swift"],
		commands: [
			{ kind: "test", run: "swift test -q", when: ["Package.swift"] },
			{ kind: "build", run: "swift build -q", when: ["Package.swift"] },
		],
		heavy: [".build/", "DerivedData/", "Pods/"],
		deps: ["Pods/"],
		omitted: ["xcodebuild", "xcbeautify"],
	},
	{
		id: "jvm",
		label: "JVM",
		markers: [
			"pom.xml",
			"build.gradle",
			"build.gradle.kts",
			"settings.gradle",
			"settings.gradle.kts",
		],
		commands: [
			{
				kind: "test",
				run: "./gradlew -q --console=plain test",
				when: ["gradlew"],
			},
			{
				kind: "test",
				run: "gradle -q --console=plain test",
				when: ["build.gradle", "build.gradle.kts"],
			},
			{ kind: "test", run: "mvn -q -B -ntp -ff test", when: ["pom.xml"] },
		],
		heavy: ["target/", "build/", ".gradle/", "*.jar", "*.class"],
	},
	{
		id: "dotnet",
		label: ".NET",
		markers: ["*.csproj", "*.fsproj", "*.sln", "*.slnx"],
		commands: [
			{ kind: "build", run: "dotnet build -v q --nologo --tl:off" },
			{ kind: "lint", run: "dotnet format --verify-no-changes" },
		],
		heavy: ["bin/", "obj/"],
		omitted: ["dotnet test"],
	},
	{
		id: "go",
		label: "Go",
		markers: ["go.mod"],
		commands: [
			{ kind: "test", run: "go test -failfast ./..." },
			{ kind: "build", run: "go build ./..." },
			{
				kind: "lint",
				run: "golangci-lint run --max-issues-per-linter=10 --max-same-issues=3",
				when: [".golangci.yml", ".golangci.yaml", ".golangci.toml"],
			},
		],
		heavy: ["vendor/"],
		bulky: ["go.sum"],
	},
];
