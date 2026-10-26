// The extraction of the tools, the system prompt sections, the agents, and the skills from the bundle text.

import {
  callee,
  constName,
  esc,
  type Found,
  KEBAB,
  keep,
  nameOf,
  openOf,
  type Part,
  parts,
  TOOL,
} from "./found.ts";
import {
  bytesWithRefs,
  memberBytes,
  partEnd,
  skipBlock,
  textWithRefs,
} from "./scan.ts";

/**
 * Tools: an object with a key `name:IDENT,` and, between the neighbouring `name:` keys, one of the tool keys
 * `maxResultSizeChars:`, `enablesCodeExecution:`, or `searchHint:`. The size is the text of `description` and `prompt`.
 * A literal `name:"x"` is a command, not a tool, so it does not count.
 */
const tools = (t: string): Part[] => {
  const f: Found = new Map();
  for (const m of t.matchAll(/\bname:([A-Za-z_$][\w$]+),/g)) {
    const around =
      (t
        .slice(Math.max(0, m.index - 400), m.index)
        .split(/\bname:/)
        .pop() ?? "") +
      (t.slice(m.index + 1, m.index + 700).split(/\bname:/)[0] ?? "");
    const name = /maxResultSizeChars:|enablesCodeExecution:|searchHint:/.test(
      around,
    )
      ? constName(t, m[1] as string, m.index, TOOL)
      : undefined;
    if (name)
      keep(
        f,
        name,
        memberBytes(t, openOf(t, m.index), ["description", "prompt"]),
      );
  }
  return parts("tools", f);
};

/**
 * Sections: calls `S("name",()=>...)` in the array of the prompt builder, where `S` is the callee that most often has a template name with `${}` and an arrow with no argument.
 * The name is the leading `[a-z_-]+` of a literal or template, the strings inside a `${}` name, or a constant.
 * The fixed sections are the `["name",value]` pairs of the same function. The text is in the functions that the call names.
 */
const sections = (t: string): Part[] => {
  const S = callee(
    t,
    /([A-Za-z_$][\w$]*)\(`[a-z_]+\$\{[^`]*`,(?:async)?\(\)=>/g,
  );
  if (!S) return [];
  const start = t.indexOf(`=[${S}(`);
  const seg = t.slice(start, t.indexOf("}function ", start));
  const f: Found = new Map();
  const texts = new Map<string, string>();
  /** Keep the bytes and the text of the larger of two finds of a section, as `keep` does for the bytes. */
  const add = (name: string, from: number, to: number) => {
    keep(f, name, bytesWithRefs(t, from, to, true));
    const text = textWithRefs(t, from, to, true);
    if (text.length > (texts.get(name)?.length ?? -1)) texts.set(name, text);
  };
  for (const m of seg.matchAll(new RegExp(`\\b${esc(S)}\\(`, "g"))) {
    const open = start + m.index + S.length;
    const a =
      /^\(\s*(?:"([a-z_:-]+)"|`([a-z_-]+)[:$`]|`\$\{([^`]*)\}|([A-Za-z_$][\w$]*),)/.exec(
        t.slice(open, open + 300),
      );
    const names = [
      a?.[1] ?? a?.[2],
      ...[...(a?.[3]?.matchAll(/"([a-z_]+)"/g) ?? [])].map((x) => x[1]),
      a?.[4] ? constName(t, a[4], open, /^[a-z_]+$/) : undefined,
    ];
    for (const n of names)
      if (n) add(n.replace(/:$/, ""), open, skipBlock(t, open));
  }
  for (const m of seg.matchAll(/\["([a-z][a-z_]*)",/g))
    add(m[1] as string, start + m.index, skipBlock(t, start + m.index));
  return parts("sections", f, texts);
};

/** Agents: objects `{agentType:"x",whenToUse:`. The size is the text of `whenToUse` and `getSystemPrompt`. */
const agents = (t: string): Part[] => {
  const f: Found = new Map();
  for (const m of t.matchAll(/\{agentType:"([A-Za-z-]+)",whenToUse:/g))
    keep(
      f,
      m[1] as string,
      memberBytes(t, m.index, ["whenToUse", "getSystemPrompt"]),
    );
  return parts("agents", f);
};

/**
 * Skills: calls `Register({name:X,...})`, where `Register` is the callee that most often has `({name:"x",menuDescription:` and `X` is a literal or a constant,
 * and the object has a prompt or an invoke key. The size is the text of the description and the prompt members.
 */
const skills = (t: string): Part[] => {
  const reg = callee(
    t,
    /([A-Za-z_$][\w$]*)\(\{name:"[a-z][a-z:-]*",menuDescription:/g,
  );
  const f: Found = new Map();
  if (!reg) return [];
  for (const m of t.matchAll(new RegExp(`\\b${esc(reg)}\\(\\{name:`, "g"))) {
    const open = m.index + reg.length + 1;
    const name = nameOf(t, open, KEBAB);
    if (
      name &&
      /getPromptForCommand|menuDescription|userInvocable/.test(
        t.slice(open, partEnd(t, open)),
      )
    )
      keep(
        f,
        name,
        memberBytes(t, open, [
          "description",
          "menuDescription",
          "whenToUse",
          "getPromptForCommand",
        ]),
      );
  }
  return parts("skills", f);
};

/** The tools, the sections, the agents, and the skills of the bundle text `t`. */
export const extractPrompt = (t: string): Part[] => [
  ...tools(t),
  ...sections(t),
  ...agents(t),
  ...skills(t),
];
