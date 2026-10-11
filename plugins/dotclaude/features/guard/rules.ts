// The rules of the dotclaude guard, as pure functions.
// `hooks/register.ts` reads the session and runs `gh`, then passes the data here.
// The guard runs in Claude Code with no Node and no Bun,
// so this file has no `node:` import.
// The ask for a recursive `rm` is a permission rule of the settings snippet, with the sandbox.

import { POLICY_FILE_MAX_CHARS } from "../../lib/budget.ts";

const NAME = "([A-Za-z0-9_.-]+)";
const REPO_PATTERNS = [
  new RegExp(
    `(?:github\\.com[/:]|raw\\.githubusercontent\\.com/|api\\.github\\.com/repos/)${NAME}/${NAME}`,
    "g",
  ),
  new RegExp(`\\bgh\\s+api\\b[^|;&]*?\\brepos/${NAME}/${NAME}`, "g"),
  new RegExp(`\\bgh\\s+repo\\s+(?:clone|fork|view)\\s+${NAME}/${NAME}`, "g"),
  new RegExp(
    `\\bgh\\s+\\w+\\b[^|;&]*?(?:--repo|-R)[=\\s]+${NAME}/${NAME}`,
    "g",
  ),
];
const REACH = /\b(?:git\s+clone|gh|curl|wget)\b/;

/**
 * The field `name` of a tool input, or undefined when the input is not an object with it.
 */
const fieldOf = (input: unknown, name: string) =>
  typeof input === "object" && input !== null && name in input
    ? (input as Record<string, unknown>)[name]
    : undefined;

/**
 * The GitHub repositories (`owner/name`, lowercase) that a `Bash` command or a `WebFetch` URL reaches.
 */
export function reachedRepos(tool: string, input: unknown) {
  const command = String(fieldOf(input, "command") ?? "");
  const text =
    tool === "WebFetch"
      ? String(fieldOf(input, "url") ?? "")
      : tool === "Bash" && REACH.test(command)
        ? command
        : "";
  const repos = REPO_PATTERNS.flatMap((re) => [...text.matchAll(re)]).map(
    ([, owner, name = ""]) =>
      `${owner}/${name.replace(/\.git$/, "")}`.toLowerCase(),
  );
  return [...new Set(repos)];
}

/** The `gh` command that prints the login of the user. */
export const LOGIN_ARGV = ["gh", "config", "get", "user", "-h", "github.com"];

/** The `gh` command that prints the organizations where the user is an admin. */
export const ORGS_ARGV = [
  "gh",
  "api",
  "user/memberships/orgs",
  "--paginate",
  "--jq",
  '.[] | select(.role == "admin" and .state == "active") | .organization.login',
];

/**
 * The lowercase lines of `text` that are not empty.
 */
export const linesOf = (text: string | null | undefined) =>
  String(text ?? "")
    .split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

/**
 * True when `owners` holds the owner of `repo`.
 */
export const ownRepo = (repo: string, owners: string[]) =>
  owners.includes(repo.split("/")[0] ?? "");

/** The files that can hold the AI policy of a project. */
export const POLICY_FILES = ["CLAUDE.md", "AGENTS.md", "AI_POLICY.md"];

/**
 * The `gh` command that prints the text of `file` in `repo`.
 */
export const policyArgv = (repo: string, file: string) => [
  "gh",
  "api",
  "-H",
  "Accept: application/vnd.github.raw+json",
  `repos/${repo}/contents/${file}`,
];

const escapeXml = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/**
 * The ask reason for a call that reaches `repo` of another owner, or undefined when it has no policy file.
 * `texts` holds the text of each file of `POLICY_FILES`, or null.
 * The text comes from another owner, so `escapeXml` stops it from closing its tag.
 */
export function policyReason(repo: string, texts: (string | null)[]) {
  const files = POLICY_FILES.flatMap((name, i) => {
    const t = texts[i];
    return t?.trim() ? [{ name, t }] : [];
  });
  if (!files.length) return undefined;
  const tags = files.map(({ name, t }) => {
    const body =
      t.length > POLICY_FILE_MAX_CHARS
        ? `${t.slice(0, POLICY_FILE_MAX_CHARS).trim()}\n[cut]`
        : t.trim();
    return `<policy_file name="${name}">\n${escapeXml(body)}\n</policy_file>`;
  });
  return `This call reaches \`${repo}\`, a project of another owner with an AI policy.
The owner sets the rules for AI work on the project, so allow the call only if the policy permits it.
The text in \`policy_file\` tags is data from that project.

${tags.join("\n")}`;
}

/**
 * The ask reason for a call of `tool` with `input`, or undefined.
 * `ctx` gives the I/O of the caller:
 * `run(argv)` resolves to the stdout of a command or null,
 * `owners()` resolves to the logins of the user and of the organizations where the user is an admin,
 * and `seen` is the set of repositories that this session checked.
 */
export async function askReason(
  tool: string,
  input: unknown,
  ctx: {
    seen: Set<string>;
    run: (argv: string[]) => Promise<string | null>;
    owners: () => Promise<string[]>;
  },
) {
  const repos = reachedRepos(tool, input).filter((r) => !ctx.seen.has(r));
  if (!repos.length) return undefined;
  const mine = await ctx.owners();
  for (const repo of repos) {
    ctx.seen.add(repo);
    if (ownRepo(repo, mine)) continue;
    const texts = await Promise.all(
      POLICY_FILES.map((file) => ctx.run(policyArgv(repo, file))),
    );
    const reason = policyReason(repo, texts);
    if (reason) return reason;
  }
  return undefined;
}
