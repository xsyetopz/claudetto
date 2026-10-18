// The markdownlint rule `title-case` (design D52): each ATX heading uses Title Case, and the rule fixes it.
// It shares `titleLine` with the `sembr` hook, so the hook and the rule use one list of minor words.

import type { Rule } from "markdownlint-cli2/markdownlint";
import { titleLine } from "../../src/plugins/claudetto/slices/sembr/domain/title.ts";

const rule: Rule = {
  names: ["title-case"],
  description: "Headings use Title Case",
  tags: ["headings"],
  parser: "micromark",
  function: (params, onError) => {
    const headings = params.parsers.micromark.tokens.filter(
      (t) => t.type === "atxHeading",
    );
    for (const { startLine } of headings) {
      const line = params.lines[startLine - 1] ?? "";
      const fixed = titleLine(line);
      if (fixed === line) continue;
      onError({
        lineNumber: startLine,
        detail: `Expected: ${fixed.trim()}`,
        context: line,
        fixInfo: {
          lineNumber: startLine,
          editColumn: 1,
          deleteCount: line.length,
          insertText: fixed,
        },
      });
    }
  },
};

export default rule;
