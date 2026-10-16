// The programs and the build file names that tell the ask that a script or a recipe runs a check.
// The ask reads what a script runs, so it does not depend on the language of the name of the script.

/** The programs whose only use is to check code: a linter, a type checker, or a test runner. A command that runs one of them is a check. */
export const CHECK_PROGRAMS = new Set([
  "eslint",
  "oxlint",
  "stylelint",
  "vitest",
  "jest",
  "mocha",
  "ava",
  "playwright",
  "cypress",
  "knip",
  "pytest",
  "unittest",
  "tox",
  "nox",
  "ruff",
  "mypy",
  "pyright",
  "flake8",
  "pylint",
  "shellcheck",
  "golangci-lint",
  "rubocop",
  "rspec",
  "phpunit",
]);

/** The subcommands of a program that check: a program, and the arguments after it that make a command a check. */
export const CHECK_SUBCOMMANDS: Record<string, readonly string[]> = {
  bun: ["test", "check"],
  npm: ["test", "t"],
  pnpm: ["test"],
  yarn: ["test"],
  deno: ["test", "lint", "check"],
  cargo: ["test", "check", "clippy", "nextest"],
  go: ["test", "vet"],
  swift: ["test"],
  dotnet: ["test"],
  mvn: ["test", "verify"],
  gradle: ["test", "check"],
  biome: ["check", "lint", "ci"],
};

/** The programs that run another script or recipe by its name, with the shape of the call: `run` needs the word `run`, `direct` takes the names at once. */
export const SCRIPT_RUNNERS: Record<string, "run" | "optional-run" | "direct"> =
  {
    npm: "run",
    pnpm: "run",
    bun: "run",
    yarn: "optional-run",
    just: "direct",
    make: "direct",
    gmake: "direct",
    "run-s": "direct",
    "run-p": "direct",
    "npm-run-all": "direct",
  };

/**
 * The names of a script or a recipe that a build tool documents as its check entry: the `test` script of `npm test`, its `pretest` and `posttest`, and the target `check` of the GNU standard targets.
 * A name that is not on the list counts as a check only when what it runs is a check.
 */
export const CHECK_ENTRY_NAMES = new Set([
  "test",
  "pretest",
  "posttest",
  "check",
]);

/** The first version of Bun with `bun check`, a built-in type check that reads `tsconfig.json` (Bun 1.4.3, https://bun.com/blog/bun-v1.4.3). */
export const BUN_CHECK_MIN = "1.4.3";

/**
 * The commands that download a package and run it, with the word that follows the program: `""` when it follows at once.
 * `npx eslint` and `bunx eslint` run `eslint` from `node_modules/.bin` when it exists there, and download it from npm when it does not.
 */
export const DOWNLOAD_RUNNERS: Record<string, string> = {
  bunx: "",
  npx: "",
  bun: "x",
  pnpm: "dlx",
  yarn: "dlx",
  npm: "exec",
};
