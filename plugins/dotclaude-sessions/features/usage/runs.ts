// The model calls of each run, the context that each call reads again, and the skills that a period did not use.
// A run is a main session or one subagent run, and each one is one transcript file.
// The context that a call reads again is its cache read tokens plus its input tokens.
// The transcript has the list of available skills in its `skill_listing` attachments.
// When no transcript of the period has one, the list comes from the installed plugins and the skills folder, read only.

import fs from "node:fs";
import path from "node:path";
import { rethrowUnless } from "../../lib/errors.ts";
import type {
  Attachment,
  CallRow,
  SkillChars,
  Unused,
  Usage,
} from "./types.ts";

/** The tokens that one call reads again: the cache read plus the input that the cache did not hold. */
export const rereadOf = (usage: Usage): number =>
  (usage.cache_read_input_tokens ?? 0) + (usage.input_tokens ?? 0);

/** The row of a run from its per-call re-read tokens: the calls, the sum, the mean, and the largest. */
export function runRow(id: string, type: string, rereads: number[]): CallRow {
  const sum = rereads.reduce((a, b) => a + b, 0);
  return {
    id,
    type,
    calls: rereads.length,
    reread: sum,
    rereadPerCall: rereads.length ? Math.round(sum / rereads.length) : 0,
    rereadMax: rereads.reduce((a, b) => Math.max(a, b), 0),
  };
}

/** The totals of all runs, and the `limit` runs that read the most context again. */
export function callsPerRun(rows: CallRow[], limit: number) {
  return {
    runs: rows.length,
    calls: rows.reduce((n, r) => n + r.calls, 0),
    reread: rows.reduce((n, r) => n + r.reread, 0),
    top: [...rows].sort((a, b) => b.reread - a.reread).slice(0, limit),
  };
}

/** The `{ name, chars }` skills of a `skill_listing` attachment: its `names`, and the size of each listing line. */
export function listedSkills(attachment: Attachment): SkillChars[] {
  const chars = new Map<string, number>();
  for (const line of String(attachment.content ?? "").split("\n")) {
    const head = /^- (\S+?): /.exec(line);
    if (head) chars.set(head[1] as string, line.length + 1);
  }
  const names = Array.isArray(attachment.names)
    ? attachment.names
    : [...chars.keys()];
  return names.map((name) => ({ name, chars: chars.get(name) ?? 0 }));
}

const frontName = (text: string): string | null => {
  const head = text.split(/^---\s*$/m)[1] ?? "";
  return /^name:\s*(\S+)\s*$/m.exec(head)?.[1] ?? null;
};

// The skill folders under `dir`: one `SKILL.md` for each skill.
async function skillsIn(dir: string, prefix: string): Promise<SkillChars[]> {
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch (err) {
    rethrowUnless(err, "ENOENT", "ENOTDIR");
    return [];
  }
  const out: SkillChars[] = [];
  for (const folder of names) {
    try {
      const text = await Bun.file(path.join(dir, folder, "SKILL.md")).text();
      out.push({ name: prefix + (frontName(text) ?? folder), chars: 0 });
    } catch (err) {
      // A folder with no `SKILL.md` is not a skill.
      rethrowUnless(err, "ENOENT", "ENOTDIR");
    }
  }
  return out;
}

/** The skills of the installed plugins (`plugin:skill`) and of `<configDir>/skills`, read only. */
export async function installedSkills(
  configDir: string,
): Promise<SkillChars[]> {
  const out = await skillsIn(path.join(configDir, "skills"), "");
  let installed: Record<string, { installPath?: unknown }[] | undefined> = {};
  try {
    installed = JSON.parse(
      await Bun.file(
        path.join(configDir, "plugins", "installed_plugins.json"),
      ).text(),
    ).plugins;
  } catch (err) {
    // No plugin file means no installed plugin.
    rethrowUnless(err, "ENOENT", "SyntaxError");
  }
  for (const [key, installs] of Object.entries(installed ?? {}))
    for (const { installPath } of Array.isArray(installs) ? installs : [])
      if (typeof installPath === "string")
        out.push(
          ...(await skillsIn(
            path.join(installPath, "skills"),
            `${key.split("@")[0]}:`,
          )),
        );
  return out;
}

// A used name matches a listed name when they are equal, or when the used name is the listed name with no plugin prefix.
const used = (name: string, calls: Set<string>): boolean =>
  calls.has(name) || calls.has(name.slice(name.indexOf(":") + 1));

/**
 * The skills that the period did not use, as `{ source, available, unused }`.
 * `listed` is a Map of name to chars from the transcripts, and `calls` holds the skill names that were called.
 * When `listed` is empty, the list comes from `installedSkills(configDir)`, and `source` names that.
 */
export async function unusedSkills(
  listed: Map<string, number>,
  calls: Set<string>,
  configDir: string,
): Promise<Unused> {
  const fromTranscripts = listed.size > 0;
  const available = fromTranscripts
    ? [...listed].map(([name, chars]) => ({ name, chars }))
    : await installedSkills(configDir);
  const unused = available
    .filter((s) => !used(s.name, calls))
    .map(({ name, chars }) => ({ skill: name, chars }))
    .sort((a, b) => b.chars - a.chars || a.skill.localeCompare(b.skill));
  return {
    source: fromTranscripts
      ? "the skill listings of the transcripts"
      : `installed plugins and the skills folder of ${configDir}, because the transcripts list no skills`,
    available: available.length,
    unused,
  };
}
