// The bounds and word lists of the ask on a weaker check (package P36), in one place.
// `limits.ts` exports them, so a user of the slice imports `limits.ts` only.
// A list is data and not a bound. Each regular expression runs on one line or one statement.

/** The most characters of one statement that the reader of code text scans. */
export const STATEMENT_MAX_CHARS = 4_000;

/** The most nested levels of a JSON value that the config check compares. A deeper value is a value that the check cannot read. */
export const JSON_DEPTH_MAX = 24;

/**
 * The text of an added line of a test file that is control flow, a skip, a focus, or a timeout.
 * The check runs on the line without the inside of its strings and without its comment.
 * A line like this can stop a test before its asserts, so that an added assert checks nothing.
 */
export const TEST_CONTROL = new RegExp(
  [
    String.raw`\b(?:if|else|elif|unless|when|return|try|catch|except|finally|switch|for|foreach|each|while|loop|break|continue|exit|and|or)\b`,
    String.raw`\b(?:skip\w*|only|todo|xfail|pending|ignore\w*|disabled?|should_panic|expectedFailure|cfg\w*)\b`,
    String.raw`(?<![.\w])(?:fit|xit|xtest|xdescribe|fdescribe)\b`,
    "timeout|_exit\\b|\\?|&&|\\|\\|",
    String.raw`^\}\s*,[^,]*\)\s*;?$`,
    String.raw`\}\s*,\s*\d[\d_.e]*\s*\)\s*;?$`,
  ].join("|"),
  "i",
);

/** The start of a test in a test file. The check counts the tests, so a removed test shows. */
export const TEST_DECLARATION = [
  /\b(?:test|it)(?:\.\w+)*\s*(?:\([^)]*\))?\s*\(\s*["'`]/,
  /^[ \t]*(?:async\s+)?def\s+test\w*/,
  /^func\s+Test\w+/,
  /#\[(?:\w+::)?test\b/,
  /@Test\b/,
  /^[ \t]*it\s+["']/,
];

/** The declarations of a bound in a limits file. The first group is the name. */
export const BOUND_DECLARATION = [
  /^[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)[^=\n]*=(?!=)/,
  /^[ \t]*(?:pub(?:\([a-z]+\))?\s+)?(?:const|static)\s+(\w+)[^=\n]*=(?!=)/,
  /^([A-Z_][A-Z0-9_]*)\s*(?::[^=\n]+)?=(?!=)/,
];

/** The extensions of a limits file that has code, where a bound is a declaration. */
export const BOUND_CODE_FILE = /\.(?:[cm]?[jt]sx?|py|rs|go|java|kt|swift|rb)$/;

/** The extensions of a file where `#` starts a comment. */
export const HASH_COMMENT_FILE =
  /\.(?:py|rb|sh|bash|toml|ya?ml|ini|cfg|conf)$|(?:^|\/)(?:Makefile|justfile)$/;

/** The rank of a level of a rule. A lower rank checks less. */
export const LEVEL_RANK: Record<string, number> = {
  error: 3,
  err: 3,
  deny: 3,
  forbid: 3,
  fatal: 3,
  warn: 2,
  warning: 2,
  info: 1,
  hint: 1,
  suggestion: 1,
  off: 0,
  none: 0,
  allow: 0,
  ignore: 0,
  disable: 0,
  disabled: 0,
};

/** The names of a key where a lower number checks less (a threshold of coverage). */
export const THRESHOLD_KEY =
  /coverage|threshold|fail[-_]?under|minimum|\bmin\b|(?:^|[-_.])min(?:[-_.]|$)|^(?:lines|branches|functions|statements|percent)$/i;

/** The names of a key where a higher number checks less (a size, depth, or complexity bound). */
export const MAXIMUM_KEY = /max|limit|complexity|depth|length/i;

/** The names of a key whose list gets entries that switch off a check. A new entry checks less. */
export const IGNORE_KEY =
  /ignor|exclu|skip|omit|allow|disable|suppress|exempt|baseline|per-?file|noqa|unlisted|bypass/i;

/** The JSON keys that the config check does not compare, as they hold no rule. */
export const IGNORED_JSON_KEY = /^\$|^(?:version|description|name)$/;

/** The text of an added line of a config or a CI file that switches a check off or lets it fail. */
export const WEAKENING_LINE = [
  /continue-on-error\s*:\s*(?!false\b)\S/i,
  /\|\|\s*(?:true|exit\s+0|:)\s*(?:$|[;)&])/,
  /^\s*-?\s*(?:if|when)\s*:\s*(?:\$\{\{\s*)?(?:false|never)\b/i,
  /allow[-_]failure\s*:\s*(?!false\b)\S/i,
  /\[skip ci\]|\[ci skip\]|--no-verify|\bset\s+\+e\b/i,
  /^\s*-?\s*run\s*:\s*(?:true|:|exit\s+0)\s*$/,
  /\b(?:ignore|ignores|exclude|excludes|skip|omit|disable|disabled|noqa|per-?file-?ignores)\b\s*[:=[(]/i,
  /\bignore[-_](?:errors|missing[-_]imports)\s*[:=]\s*["']?true\b/i,
  /["']?\w[\w/@.-]*["']?\s*[:=]\s*["']?(?:off|disable|disabled|none)["']?\s*,?$/i,
];

/** The file extensions of a CI file that the YAML reader of `cidiff.ts` reads. Another CI file is compared as text. */
export const CI_YAML_FILE = /\.ya?ml$/i;

/** The keys of a CI step or job that skip it or let it fail. An added step or job with one of them asks. The text is one line of a key or of an inline map. */
export const CI_RISKY_KEY =
  /(?:^|[\s{,])["']?(?:if|continue-on-error|timeout-minutes|shell|allow_failure|when)["']?\s*:|<<\s*:/;

/** The text of a CI line that lets a command fail without a failed step. The text is one line of a `run` value or of a script. */
export const CI_RISKY_COMMAND = [
  /\|\|\s*(?:true\b|:(?:\s|$)|exit\s+0\b|echo\b)/,
  /;\s*(?:true\b|:(?:\s|$))/,
  /\bexit\s+0\b/,
  /\bset\s+\+e\b/,
  /^(?:true|:)$/,
  /^["']?run["']?\s*:\s*["']?(?:true["']?\s*$|:["']?\s*$|exit\b)/,
];

/** The parents of a CI line where an added child is safe: a step under `steps`, and a job under `jobs`. */
export const CI_ADDABLE_PARENT = /^["']?(?:steps|jobs)["']?:$/;

/** The text of a lost line that holds no rule, so the loss checks nothing less: a display name, a description, a bracket. */
export const LABEL_LINE =
  /^\W*$|^\W*(?:name|description|title|label|\$schema|version)\s*[:=]/i;

/** The commands of a hook that cannot fail, as a command or the end of one. */
export const CANNOT_FAIL =
  /^\s*(?:true|:|exit\s+0|echo\b[^|;&]*)?\s*$|(?:\|\||;)\s*(?:true|:|exit\s+0)\s*$/;

/** The lines of a hook script or a hook config file that make a hook check: a trigger, a verdict, or a failure exit. */
export const HOOK_CHECK_LINE =
  /\b(?:exit\s+[1-9]|deny|ask|block|reject|throw|PreToolUse|PostToolUse|tool\.(?:check|call)|decision|matcher|register|\.on\s*\()/i;

/** The permission modes that keep a check on each call. Another mode lets calls run with fewer asks. */
export const STRICT_MODES = ["default", "plan"];

/** The keys of `permissions` where a removed entry lets calls run with fewer asks. */
export const PERMISSION_DENY_KEYS = ["deny", "ask"];

/** The keys of `permissions` where an added entry lets calls run with fewer asks. */
export const PERMISSION_ALLOW_KEYS = ["allow", "additionalDirectories"];

/** The keys of a lint config or a type-check config where `true` is the strictest value. A new key with `true` checks more. */
export const STRICT_FLAG_KEY =
  /^(?:strict|recommended|noUnused\w+|noImplicit\w+|noFallthroughCasesInSwitch|noUncheckedIndexedAccess|noPropertyAccessFromIndexSignature|exactOptionalPropertyTypes|alwaysStrict|strict[A-Z]\w*|useUnknownInCatchVariables|forceConsistentCasingInFileNames|verbatimModuleSyntax|isolatedModules)$/;

/** The keys of a list where a new entry checks more files or more rules. */
export const GROWABLE_LIST_KEY =
  /^(?:select|extend-select|extendSelect|include|includes|enable|only)$/i;

/** The entries of a list that take files or rules away. */
export const NEGATED_ENTRY = /^[!-]/;

/** The file names of a config in INI format that have no `.ini` or `.cfg` extension. */
export const INI_CONFIG_FILE =
  /\.(?:ini|cfg)$|^\.(?:flake8|pylintrc|coveragerc|shellcheckrc)$/;

/** The extension of a config in code, which the check reads as tokens. */
export const CODE_CONFIG_FILE = /\.[cm]?[jt]sx?$/;
