---
paths:
  - "wiki/**/*.md"
---

# Wiki Pages

Write each wiki page as a part of a guide book.
A reader reads the page from top to bottom, and each section adds one step to the steps before it.

## Title Case

Use Title Case in each heading of a page, in each link text of `_Sidebar.md`, and in each link text that names a page or a section.
Title Case is the Chicago style of the industry:

- Capitalize the first word and the last word.
- Capitalize each noun, pronoun, verb, adjective, adverb, and subordinating conjunction, such as `Is`, `It`, `Be`, `When`, `If`, and `Because`.
- Capitalize the first word after a colon.
- Write the articles `a`, `an`, and `the` in lowercase.
- Write the coordinating conjunctions `and`, `but`, `or`, `nor`, `for`, `so`, and `yet` in lowercase.
- Write the prepositions of four letters or less in lowercase, such as `of`, `in`, `on`, `at`, `to`, `by`, `for`, `from`, `with`, `into`, `onto`, `over`, `via`, and `per`.
  Also write `as` and the infinitive `to` in lowercase.
- Capitalize each part of a hyphenated word, such as `Add-On` and `Read-Only`.
- Do not change a code span, a file name, a version, or a product name, such as `claudetto`, `bun`, and `iOS`.

For example, write `## Install the Core Plugin`, `` ## The Hooks Module and `register.ts` ``, and `- [Context and Handoff](Context-And-Handoff)`.
Write a prose link in a sentence, such as "see [the settings snippet](Settings-Snippet)", in the case of the sentence.

The test in `tests/support/wiki-links.test.ts` makes the anchors in lowercase, so a change of case keeps each `Page#anchor` link valid.
A change of the words of a heading changes its anchor, so update each link to it.

## Writing Style

- Write in STE-flavored ASD-STE100, as the `asd-ste100` skill describes.
  Use active voice, simple tenses, and one topic in each paragraph.
  Use no semicolons, no phrasal verbs, and no marketing adjectives.
- Put each code item in single backticks, such as a command, a tool name, a file path, an env var, a settings key, and a literal value.
- Use semantic line breaks: start each sentence on a new line.
- Start each page with a short paragraph that says what the page tells and who reads it.
- Give each section one concern, and give each section a heading that names that concern.
  Put the sections in the order in which the reader needs them: the concept first, then the steps, then the details and the edge cases.
- Use a numbered list for steps that the reader does in sequence, and a bulleted list for items with no sequence.
- End each page with `## Related Pages`, and link the next page that the reader reads.
- Keep each page at 300 lines or less.
  Split a longer page into linked pages, and add each new page to `_Sidebar.md`.
- Keep the facts, the numbers, and the hedges of the text when you rewrite it.
- `just generate` writes some pages from a source in `src/wiki/`, such as `reference/Bounds.md`.
  Edit the source, keep each `{{...}}` marker, and run `just generate`.
