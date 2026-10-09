// The approval-claim check (design D34, case A1): new text must not say that the user approved or decided
// when no prompt of the user in the session holds an approval word.
// The rule is simple on purpose: any approval word in any prompt of the session satisfies it.
// It does not tie the word to the topic of the claim, so it stops a claim with no approval at all and nothing finer.
// The functions are pure. The caller reads the transcript and fails open when it cannot.

const CLAIMS = [
  /\bdecisions?\s+(?:of|by)\s+the\s+user\b/gi,
  /\b(?:approved|authori[sz]ed|decided|confirmed|accepted)\s+by\s+the\s+user\b/gi,
  /\bthe\s+user\s+(?:has\s+)?(?:approved|authori[sz]ed|decided|agreed|confirmed|chose|accepted)\b/gi,
  /\buser[- ]approved\b/gi,
];

/** The words that make a prompt of the user an approval. */
const APPROVAL =
  /\b(?:approve[ds]?|approval|yes|yep|yeah|ok|okay|go ahead|do it|agreed?|sounds good|lgtm|proceed)\b/i;

/** The claims of an approval in `text`, lowercase. */
export function claims(text) {
  return CLAIMS.flatMap((re) =>
    [...String(text ?? "").matchAll(re)].map((m) => m[0].toLowerCase()),
  );
}

/** True for text that a harness put in a user record: a system reminder, a command echo, or a task notice. */
const harnessText = (text) => /^\s*<[a-z][\w-]*[\s>]/.test(text);

/** The texts of the real prompts of the user in `transcript`, a JSONL text. A line that is not JSON is skipped. */
export function prompts(transcript) {
  const out = [];
  for (const line of String(transcript ?? "").split("\n")) {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec?.type !== "user" || rec.isMeta || rec.isSidechain) continue;
    const content = rec.message?.content;
    const texts =
      typeof content === "string"
        ? [content]
        : Array.isArray(content)
          ? content.filter((b) => b?.type === "text").map((b) => b.text)
          : [];
    for (const t of texts)
      if (typeof t === "string" && !harnessText(t)) out.push(t);
  }
  return out;
}

/** True when a prompt of `transcript` holds an approval word. */
export const approved = (transcript) =>
  prompts(transcript).some((p) => APPROVAL.test(p));

/** The deny reason for the claims `found`. The text is a message to Claude. */
export const claimReason = (found) =>
  `The new text says that the user approved or decided something: "${found[0]}".
No prompt of the user in this session holds an approval, so the claim has no source.
Remove the claim, or ask the user for the decision and write it after the user answers.`;
