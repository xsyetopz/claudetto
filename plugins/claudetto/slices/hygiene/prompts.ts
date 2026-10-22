export const CLEANED = (v: {
  folders: string;
  bytes: string;
  files: string;
  worktrees: string;
  probes: string;
}): string =>
  `claudetto cleanup removed ${v.folders} session folders with ${v.bytes} bytes, ${v.files} files, ${v.worktrees} worktrees, and ${v.probes} leftover \`fswatch-probe-*\` folders of Claude Code (anthropics/claude-code#104170).`;

export const WORKTREES_KEPT = (v: { count: string; list: string }): string =>
  `claudetto cleanup kept ${v.count} worktrees: ${v.list}.`;

export const UNKNOWN_KEPT = (v: { count: string }): string =>
  `claudetto cleanup kept ${v.count} entries of the temp folder that no rule names.`;

export const FILE_CHANGED = (v: { path: string; agent: string }): string =>
  `The user or a tool changed \`${v.path}\` after the last edit of \`${v.agent}\`.`;
