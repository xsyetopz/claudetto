// The place segments of the main status line: folder, git, worktree, pull request,
// agent, output style, vim mode, session name, and the OpenSpec change.

import { SESSION_NAME_MAX } from "./limits.ts";
import { C, ICON, link, type Paint } from "./paint.ts";
import type {
  GitState,
  Pr,
  RenderCtx,
  Segment,
  StatusInput,
  Text,
  Workspace,
} from "./types.ts";

/** The folder, as `project/subdir` when the session moved below its project. */
export function folderText(
  workspace: Workspace | undefined,
  dir: string,
): string {
  // Windows sends either separator, so compare with `/` only.
  const slash = (p: string) => p.replaceAll("\\", "/").replace(/\/+$/, "");
  const cwd = slash(dir);
  const project = workspace?.project_dir && slash(workspace.project_dir);
  let name = cwd.split("/").pop() || dir;
  if (project && cwd.startsWith(`${project}/`))
    name = `${project.split("/").pop()}/${cwd.slice(project.length + 1)}`;
  const added = workspace?.added_dirs?.length;
  return `${C.blue(ICON.folder)} ${C.bold(C.blue(name))}${added ? C.dim(` +${added}`) : ""}`;
}

/** Branch, changed files, and commits ahead and behind: `⎇ main ±2 ↑1`. */
export const gitText = (git: GitState): string =>
  C.magenta(`${ICON.branch} ${git.branch}`) +
  (git.dirty ? C.yellow(` ${ICON.dirty}${git.dirty}`) : "") +
  (git.ahead ? C.cyan(` ${ICON.ahead}${git.ahead}`) : "") +
  (git.behind ? C.cyan(` ${ICON.behind}${git.behind}`) : "");

const REVIEW: Record<string, Paint> = {
  approved: C.green,
  changes_requested: C.red,
  draft: C.dim,
};

/** `⇄ #12` (or `!12` for a merge request), linked and colored by review state. */
export function prText(pr: Pr): string {
  const label = `${ICON.pr} ${pr.kind === "mr" ? "!" : "#"}${pr.number}`;
  return (REVIEW[String(pr.review_state)] ?? C.yellow)(link(pr.url, label));
}

/**
 * The `place` group for the status object `data`.
 * `ctx` has `git` (the git state or null) and `spec` (the OpenSpec change or null).
 */
export function placeGroup(
  data: StatusInput,
  ctx: Pick<RenderCtx, "git" | "spec">,
): Segment[] {
  const place: Segment[] = [];
  const add = (priority: number, text: Text, id: string) => {
    if (text) place.push({ priority, text, id });
  };
  const dir = data.workspace?.current_dir || data.cwd || "";
  add(9, dir && folderText(data.workspace, dir), "folder");
  const repo = data.workspace?.repo;
  add(
    3,
    repo?.owner &&
      repo.name &&
      C.dim(`${ICON.repo} ${repo.owner}/${repo.name}`),
    "repo",
  );
  add(8, ctx.git?.branch && gitText(ctx.git), "branch");
  const worktree = data.worktree?.name || data.workspace?.git_worktree;
  add(5, worktree && C.cyan(`${ICON.worktree} ${worktree}`), "worktree");
  add(4, data.pr?.number ? prText(data.pr) : false, "pr");
  add(
    5,
    ctx.spec &&
      C.cyan(`${ICON.spec} ${ctx.spec.id} ${ctx.spec.done}/${ctx.spec.total}`),
    "spec",
  );
  add(
    4,
    data.agent?.name && C.magenta(`${ICON.agent}${data.agent.name}`),
    "agent",
  );
  add(
    2,
    data.output_style?.name && C.dim(`${ICON.style} ${data.output_style.name}`),
    "style",
  );
  add(3, data.vim?.mode && C.bold(`${ICON.vim} ${data.vim.mode}`), "vim");
  const name = data.session_name;
  if (typeof name === "string" && name)
    add(
      1,
      C.dim(
        name.length > SESSION_NAME_MAX
          ? `${name.slice(0, SESSION_NAME_MAX - 1)}…`
          : name,
      ),
      "name",
    );
  return place;
}
