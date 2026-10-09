// The shell split that the bound rule of `bounds.mjs` reads: segments, pipe stages, and words.
// The split cannot run the shell, so a form that it cannot read gives a stage that the rule allows.

const HEREDOC = /<<-?[ \t]*\\?(['"]?)([\w.-]+)\1/g;

/**
 * `command` with the body of each heredoc removed, and each `<<WORD` replaced by a mark.
 * The shell reads a heredoc also inside `"$(...)"`, so the body goes first, before any quote is read.
 */
export function dropHeredocs(command) {
  const lines = String(command).split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const ends = [...lines[i].matchAll(HEREDOC)].map((m) => m[2]);
    out.push(lines[i].replace(HEREDOC, " \0heredoc "));
    for (const end of ends) {
      while (i + 1 < lines.length && lines[i + 1].trim() !== end) i++;
      i++;
    }
  }
  return out.join("\n");
}

/**
 * The top-level segments of `command`, each a list of pipe stages as text.
 * Quotes and `$(...)` are kept in a stage.
 * A stage that reads a heredoc or a here-string has the mark `\0heredoc`.
 */
export function pipelines(command) {
  // An arithmetic `$((a<<b))` has a shift and no heredoc.
  const plain = String(command)
    .replace(/\$\(\([^()]*\)\)/g, "0")
    .replaceAll("<<<", " \0heredoc ");
  const text = dropHeredocs(plain);
  const segments = [];
  let stages = [];
  let stage = "";
  let quote = null;
  let depth = 0;
  const endStage = () => {
    stages.push(stage.trim());
    stage = "";
  };
  const endSegment = () => {
    endStage();
    if (stages.some(Boolean)) segments.push(stages.filter(Boolean));
    stages = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\" && quote !== "'") stage += c + (text[++i] ?? "");
      else {
        if (c === quote) quote = null;
        stage += c;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      stage += c;
    } else if (c === "\\") stage += c + (text[++i] ?? "");
    else if (c === "(" && (depth > 0 || text[i - 1] === "$")) {
      depth++;
      stage += c;
    } else if (c === ")" && depth > 0) {
      depth--;
      stage += c;
    } else if (depth > 0) stage += c;
    else if (c === "\n" || c === ";") endSegment();
    else if (c === "&" && text[i + 1] === "&") {
      endSegment();
      i++;
    } else if (c === "|") {
      if (text[i + 1] === "|") {
        endSegment();
        i++;
      } else {
        endStage();
        if (text[i + 1] === "&") i++;
      }
    } else if (c === "&" && text[i - 1] !== ">" && text[i + 1] !== ">")
      endSegment();
    else stage += c;
  }
  endSegment();
  return segments;
}

/** The words of one stage, with quotes removed. A substitution stays one word. */
export const stageWords = (stage) =>
  [
    ...stage.matchAll(
      /(?:\$\([^)]*\)|'[^']*'|"(?:[^"\\]|\\.)*"|\\.|[^\s'"\\])+/g,
    ),
  ].map((m) =>
    m[0].replace(/'([^']*)'|"((?:[^"\\]|\\.)*)"/g, (_, a, b) => a ?? b),
  );
