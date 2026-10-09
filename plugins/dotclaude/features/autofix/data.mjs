// The detection table of the auto-fix hook (design D7).
// A tool runs only when the project has one of its `configs` or one of its local binaries.
// A config is a file name, or `{ file, has }` for a file that must hold the text `has`.
// `steps` are the argument lists of the runs, and the hook adds `--` and the file paths after each one,
// except for a tool with `dashes: false`.
// `issue` reads one line of the tool output: `re` has the `file`, `line`, and `rule` groups (default 1 and 2),
// and `rule` is a group number or a fixed text.
// A tool with a `group` runs on a file only when no earlier tool of the same group took that file.
// There is no row for `sembr`: line breaks are fixed before the write (design D29).

const WEB = ["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts", "cts"];
const COLON = /^(.+?):(\d+):\d+: (.+)$/;

/** Local binary folders in the project, in the order of the search. */
export const BIN_DIRS = ["node_modules/.bin", ".venv/bin", "venv/bin"];

export const TOOLS = [
  {
    name: "biome",
    group: "web-format",
    exts: [...WEB, "json", "jsonc", "css"],
    configs: ["biome.json", "biome.jsonc"],
    steps: [
      [
        "check",
        "--write",
        "--no-errors-on-unmatched",
        "--colors=off",
        "--reporter=github",
      ],
    ],
    issue: {
      re: /^::\w+ title=([^,]+),file=([^,]+),line=(\d+)/,
      file: 2,
      line: 3,
      rule: 1,
    },
  },
  {
    name: "prettier",
    group: "web-format",
    exts: [...WEB, "json", "css", "scss", "html", "yaml", "yml", "md", "mdx"],
    configs: [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.yaml",
      ".prettierrc.yml",
      ".prettierrc.js",
      ".prettierrc.cjs",
      ".prettierrc.mjs",
      "prettier.config.js",
      "prettier.config.cjs",
      "prettier.config.mjs",
    ],
    steps: [["--write", "--log-level=warn"]],
    issue: {
      re: /^\[error\] (.+?): \w*Error.*\((\d+):\d+\)$/,
      rule: "syntax-error",
    },
  },
  {
    name: "eslint",
    exts: WEB,
    configs: [
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.cjs",
      "eslint.config.ts",
      ".eslintrc",
      ".eslintrc.json",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.yaml",
      ".eslintrc.yml",
    ],
    steps: [["--fix", "--format", "unix"]],
    issue: {
      re: /^(.+?):(\d+):\d+: .*\[(?:Error|Warning)\/([^\]]+)\]$/,
      rule: 3,
    },
  },
  {
    name: "ruff",
    exts: ["py", "pyi"],
    configs: [
      "ruff.toml",
      ".ruff.toml",
      { file: "pyproject.toml", has: "[tool.ruff" },
    ],
    steps: [["format"], ["check", "--fix", "--output-format", "concise"]],
    issue: { re: /^(.+?):(\d+):\d+: ([A-Z]+\d+) /, rule: 3 },
  },
  {
    name: "rustfmt",
    exts: ["rs"],
    configs: ["rustfmt.toml", ".rustfmt.toml", "Cargo.toml"],
    steps: [["--edition", "2021"]],
  },
  {
    name: "gofmt",
    exts: ["go"],
    configs: ["go.mod"],
    steps: [["-w"]],
    issue: { re: COLON, rule: "syntax-error" },
  },
  {
    name: "clang-format",
    exts: ["c", "h", "cc", "cpp", "cxx", "hpp", "hh", "m", "mm"],
    configs: [".clang-format", "_clang-format"],
    steps: [["-i"]],
  },
  {
    name: "shfmt",
    exts: ["sh", "bash"],
    configs: [".editorconfig"],
    steps: [["-w"]],
    issue: { re: COLON, rule: "syntax-error" },
  },
  {
    name: "markdownlint-cli2",
    exts: ["md", "mdx"],
    configs: [
      ".markdownlint.json",
      ".markdownlint.jsonc",
      ".markdownlint.yaml",
      ".markdownlint.yml",
      ".markdownlint-cli2.jsonc",
      ".markdownlint-cli2.yaml",
      ".markdownlint-cli2.cjs",
      ".markdownlint-cli2.mjs",
    ],
    steps: [["--fix"]],
    dashes: false,
    issue: { re: /^(.+?):(\d+)(?::\d+)? (?:error )?(MD\d+)/, rule: 3 },
  },
];
