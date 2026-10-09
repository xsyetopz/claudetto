// Helpers for `usage-report.mjs`: call prices, transcript parsing, and counts.

import fs from "node:fs";
import path from "node:path";

// $ per million tokens: input, output, cache read, 5m write, 1h write.
const PRICES = {
  fable: [10, 50, 0.25, 12.5, 20],
  opus: [4, 20, 0.2, 5, 8],
  sonnet: [2, 10, 0.2, 2.5, 4],
  haiku: [1, 5, 0.1, 1.25, 2],
};

export function callCost(model, u) {
  const family = Object.keys(PRICES).find((f) => String(model).includes(f));
  if (!family) return { total: 0, write: 0, context: 0, read: 0 };
  const [pi, po, pr, p5, p1] = PRICES[family];
  const cc = u.cache_creation;
  const w1 = cc?.ephemeral_1h_input_tokens ?? 0;
  const w5 = cc
    ? (cc.ephemeral_5m_input_tokens ?? 0)
    : (u.cache_creation_input_tokens ?? 0);
  const read = u.cache_read_input_tokens ?? 0;
  const input = u.input_tokens ?? 0;
  const write = (w5 * p5 + w1 * p1) / 1e6;
  return {
    total: (input * pi + (u.output_tokens ?? 0) * po + read * pr) / 1e6 + write,
    write,
    context: input + read + (u.cache_creation_input_tokens ?? 0),
    read,
    rewrite:
      (u.cache_creation_input_tokens ?? 0) > 30_000 &&
      (u.cache_creation_input_tokens ?? 0) > read,
  };
}

export function agentType(file) {
  if (!file.includes(`${path.sep}subagents${path.sep}`)) return "main";
  try {
    const meta = JSON.parse(
      fs.readFileSync(file.replace(/\.jsonl$/, ".meta.json"), "utf8"),
    );
    return meta.agentType || "subagent";
  } catch {
    return "subagent";
  }
}

// A source or config file that a brief names, with or without a directory.
const FILE =
  /(?:[\w.@-]+\/)*[\w.@-]+\.(?:mjs|cjs|js|jsx|ts|tsx|py|go|rs|rb|java|kt|swift|c|h|cc|cpp|hpp|cs|php|md|json|jsonc|yaml|yml|toml|sh|sql|css|scss|html|vue|svelte)\b/g;
// A bulleted or numbered line: one item of work, a constraint, or a check.
const ITEM = /^\s*(?:[-*+]|\d+[.)])\s/gm;

export function briefSize(file) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== "user") continue;
    const c = entry.message?.content;
    const text = (
      typeof c === "string"
        ? c
        : (Array.isArray(c) ? c : []).map((b) => b.text ?? "").join("\n")
    ).replace(/\w+:\/\/\S+/g, "");
    return {
      files: new Set(text.match(FILE) ?? []).size,
      items: (text.match(ITEM) ?? []).length,
    };
  }
  return { files: 0, items: 0 };
}

export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
};

// The `q` quantile of `xs`, by the nearest rank.
export const quantile = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.max(0, Math.ceil(q * s.length) - 1)] : 0;
};

export const resultText = (c) =>
  typeof c === "string"
    ? c
    : (Array.isArray(c) ? c : []).map((b) => b.text ?? "").join("\n");

/** The first line of `text`, cut to about 80 characters. */
export function firstLine(text) {
  const line =
    String(text ?? "")
      .split("\n")
      .find((l) => l.trim() && !l.startsWith("agentId:")) ?? "";
  const t = line.trim();
  return t.length > 80 ? `${t.slice(0, 79)}…` : t;
}

/** Per agent type: runs, and the median files and list items in the brief. */
export function briefStats(runs) {
  const byType = Map.groupBy(runs, (r) => r.type);
  return [...byType]
    .map(([type, rs]) => ({
      type,
      runs: rs.length,
      files: median(rs.map((r) => r.files)),
      items: median(rs.map((r) => r.items)),
    }))
    .sort((a, b) => b.runs - a.runs);
}

// A deny reason starts with "blocked this <label>." Its next sentence names
// the first rule that fired.
function verdictRule(reason) {
  const text = String(reason).replace(/^blocked this [\w ]+?\. /, "");
  return text.match(/^.*?\.(?=\s|$)/)?.[0] ?? text;
}

export function verdictCounts(file, since) {
  let lines;
  try {
    lines = fs.readFileSync(file, "utf8").split("\n");
  } catch {
    return [];
  }
  const counts = new Map();
  for (const line of lines) {
    let v;
    try {
      v = JSON.parse(line);
    } catch {
      continue;
    }
    if (!(new Date(v.time) >= since)) continue;
    const rule = verdictRule(v.reason ?? "");
    const key = `${v.level}\0${rule}`;
    const c = counts.get(key) ?? { level: v.level, rule, count: 0 };
    c.count += 1;
    counts.set(key, c);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}
