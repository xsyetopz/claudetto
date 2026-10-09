// Grader of the `second-opinion` requirement "Neutral questions" (task 7.10).
// It is a code check, so it needs no calibration: it reads the question that
// Claude sent to Jev for a stated preference and for one-sided evidence.

import { EVAL_SKEW_RATIO_MAX } from "../limits.mjs";

const PREFERENCE = [
  /\bi (?:would |'d )?(?:recommend|prefer|suggest|favou?r|lean|believe|think)\b/i,
  /\bmy (?:pick|choice|preference|recommendation)\b/i,
  /\b(?:should|ought to) (?:use|pick|choose|go with)\b/i,
  /\b(?:clearly|obviously|surely|of course|the best|the better|the right)\b/i,
  /\b(?:better|best) (?:to|choice|option)\b/i,
  /\bisn'?t (?:it|that) (?:better|best|right)\b/i,
  // A lean of another person that the question passes on, such as "Team notes lean to this".
  /\b(?:leans?|leaning|prefers?|preferred|favou?rs?|favou?red) (?:to|toward|towards|this|that|it)\b/i,
];
const AGAINST =
  /\b(?:against|con|cons|downside|drawback|risk|cost|costs|slower|harder|worse|fails?|but|however|lacks?|limits?|limited|limitation|needs?|requires?|only|single-writer|dropped)\b/i;
const FOR =
  // `for` counts only as a label ("for:"), because "for that reason" is no evidence.
  /\b(?:for(?=\s*:)|pro|pros|benefit|advantage|faster|simpler|simple|easier|better|good|native|supports?|gains?|safe|cheap|portable|reliable)\b/i;

/** The phrases of a stated preference found in `question`. */
export function preferences(question) {
  return PREFERENCE.map((r) => r.exec(question)?.[0]).filter(Boolean);
}

/**
 * The text of each option: the lines from its label line to the next label.
 * `labels` are the option labels.
 */
function sections(question, labels) {
  const out = Object.fromEntries(labels.map((l) => [l, []]));
  let current = null;
  for (const line of question.split("\n")) {
    const hit = labels.find((l) =>
      new RegExp(
        `^\\s*(?:[-*#]+\\s*|\\d+[.)]\\s*)?(?:option\\s+)?${esc(l)}\\b`,
        "i",
      ).test(line),
    );
    if (hit) current = hit;
    if (current) out[current].push(line);
  }
  return out;
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Grades a question.
 * Fails on a stated preference, on an option with no evidence for or against,
 * and on a ratio of evidence length above `EVAL_SKEW_RATIO_MAX`.
 */
export function gradeQuestion(question, labels) {
  const prefs = preferences(question);
  const secs = sections(question, labels);
  const sizes = labels.map((l) => secs[l].join(" ").length);
  const missing = labels.filter((l) => {
    const t = secs[l].join("\n");
    return !(FOR.test(t) && AGAINST.test(t));
  });
  const ratio =
    Math.min(...sizes) > 0 ? Math.max(...sizes) / Math.min(...sizes) : Infinity;
  const oneSided = missing.length > 0 || ratio > EVAL_SKEW_RATIO_MAX;
  return {
    preferences: prefs,
    oneSided,
    missing,
    ratio,
    pass: prefs.length === 0 && !oneSided,
  };
}

/**
 * The question text of the trace: the input of a second-opinion call.
 * The fields are those of the input schema of the tool (`features/jev/tool.mjs`):
 * `question`, `state`, and `options` of `{key, description}`.
 */
export function questionOf(t) {
  const c = t.find(
    (x) => x.kind === "call" && /second[-_]?opinion/i.test(x.name),
  );
  if (!c) return null;
  const i = c.input;
  const parts = [i.question, i.state].filter((x) => typeof x === "string");
  for (const o of Array.isArray(i.options) ? i.options : [])
    parts.push(`${o.key}\n${o.description ?? ""}`);
  return parts.join("\n");
}
