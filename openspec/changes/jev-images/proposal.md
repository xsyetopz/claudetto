# Proposal: jev-images

> This change starts after the tag `claudetto--v0.2.0`, as the user asked on 2026-10-20 (D9 in `design.md`).
> It adds to the command `claudetto-decide`, and it leaves the `AskUserQuestion` hook as it is.

## Why

Jev can answer questions about a picture, such as a screenshot of a user interface.
A check of a UI change needs a picture, and the command `claudetto-decide` cannot send one today.
The verb `box` finds where one target is in a picture, which a text question cannot give.
The option `--state` takes text only, because a path in it would send a file to the API.

## What Changes

- Add `--image <path>`, which repeats, to the verbs `yes`, `pick`, and `ask`.
  Only a PNG or JPEG file passes, and the CLI checks the first bytes of the file (D7, D8).
- Add the verb `box`, which finds one target in the picture that the question names (D5).
- Send each image as its own multipart file part, with the header `TypeSafe-Danger-Zone-Images: true` on each request that has an image or a `box` question (D1).
- Name each image in the state, with a UUID as its reference (D2).
- Choose the model by request: `jev-latest` for a request with no `box`, and `jev-1.14.0` for a `box` (D3).
- Check each file before the call, with the magic bytes and the 16 MiB bound (D4).
- Print the box as text, and print the raw answer with `--json` (D5).
- Update the usage text, the wiki page `Decide.md`, and `CHANGELOG.md` under `[Unreleased]`.

## What Does Not Change

- The `AskUserQuestion` hook, which uses the verb `ask`, sends no image (D6).
- The option `--state` takes text or `-` for stdin, and never a path (D8).
- A request with no image and no `box` sends the same JSON body as now, with no header, to `jev-latest`.
- The exit codes of the current verbs.
  A bad `--image` is a usage fault, with exit `2`.

## Assumptions

- The facts of this change come from the Typesafe docs at `docs.typesafe.ai`, the pages `/images`, `/primitives/box`, and `/models`, read on 2026-10-20.
- The images and the box are a preview ("Dreamer-ready").
  Their format, limits, and accuracy can change.
  Task 6.1 checks one live call of each new path.
- Bun has the built-in `FormData` and `fetch`, so the change needs no SDK and no new dependency.

## Impact

- Code: `src/plugins/claudetto/slices/decide/` (the CLI adapter, `limits.ts`, and the usage text), and `tests/claudetto/decide/`.
- Docs: `src/wiki/claudetto/slices/Decide.md`, a new evidence page `src/wiki/evidence/Jev-Images.md`, and `CHANGELOG.md`.
- Users: a call with no image and no `box` does not change.
  An image call sends the file that the user names with `--image` to the API.
  The docs give the price as $0.042 per million input tokens, with output free, and images bill as input tokens.
