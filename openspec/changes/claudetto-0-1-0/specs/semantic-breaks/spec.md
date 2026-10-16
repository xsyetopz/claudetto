# Spec Delta: `semantic-breaks`

## Purpose

Puts each sentence of the Markdown, commit, and pull request text that Claude writes on its own line, so that diffs show one change for each sentence.

## ADDED Requirements

### Requirement: One sentence on each line

Each write of a Markdown file, a commit message, or a pull request body SHALL have each sentence start on a new line.
Code blocks, front matter, and tables SHALL stay unchanged.

#### Scenario: Two sentences on one line

- **WHEN** Claude writes a Markdown paragraph with two sentences on one line
- **THEN** the written file has each sentence on its own line

### Requirement: Sentence ends in each language

The sentence ends SHALL come from the Unicode sentence rules (`Intl.Segmenter`), and not from a word list or a rule about capital letters.
A runtime without `Intl.Segmenter` SHALL get no break.

#### Scenario: Polish and Japanese text

- **WHEN** Claude writes a paragraph with a capital letter such as `Ż` after a sentence end, or a Japanese sentence end `。`
- **THEN** the written file has each sentence on its own line

### Requirement: Edits of list items and quotes

The repair of an `Edit` `old_string` SHALL work on a list item and on a quote line.

#### Scenario: A list item

- **WHEN** Claude edits a list item that holds two sentences
- **THEN** the edit applies, and the item keeps its marker

### Requirement: Line endings

A file with CRLF line endings SHALL keep CRLF on each line, and its front matter guard SHALL still apply.

#### Scenario: A CRLF file

- **WHEN** Claude writes to a CRLF Markdown file with front matter
- **THEN** each line ends with CRLF, and the front matter is unchanged
