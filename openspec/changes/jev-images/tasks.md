# Tasks

> This change starts after the tag `claudetto--v0.2.0` (D9 in `design.md`).
> Each task names its check as a command in a code span.
> Mark a task done only after its check ran and passed.
> Write the test of a task before its code, and see it fail first.
> Run the check of a task after each change of behavior.

## 1. Flags and the Verb `box`

- [x] 1.1 Add lab tests that `--image <path>` repeats on `yes`, `pick`, `ask`, and `box`, that a `--image` with no path exits `2` with the usage, that a file path in `--state` stays text, and that the verb `box` exists, and see them fail, then parse the flags in `src/plugins/claudetto/slices/decide/adapters/cli.ts`, and name the one exception to the path rule in its header comment (D7, D8).
  Check: `just test tests/claudetto/decide`

## 2. Multipart Body and Header

- [x] 2.1 Add tests of the request builder: a request with an image has the header `TypeSafe-Danger-Zone-Images: true`, a first part `request` with `application/json`, one file part `img<n>` for each image, one `assets` entry for each UUID, and one state line for each image, and a request with no image and no `box` has the same JSON body as before, with no header, and the model `jev-latest`, and see them fail, then build the body with `FormData` and `fetch` (D1, D2, D3).
  Check: `just test tests/claudetto/decide`
- [x] 2.2 Change the verbs `yes`, `pick`, and `ask` to use the builder, and keep the text path of each verb as it is now.
  Check: `just test tests/claudetto/decide && just lab`

## 3. Magic Bytes and Size

- [x] 3.1 Add tests that a PNG and a JPEG file pass the check of the first bytes, with the content type `image/png` or `image/jpeg`, and that a GIF file, a text file with a `.png` name, and a file over `IMAGE_BYTES_MAX` exit `2` before any request is sent, and see them fail, then add `IMAGE_BYTES_MAX` with its comment to `src/plugins/claudetto/slices/decide/limits.ts`, and add the checks to the adapter (D4).
  Check: `just test tests/claudetto/decide`

## 4. The Verb `box`

- [x] 4.1 Add tests that `box` sends one question with `"type": "box"`, the `instructions`, and no `criteria`, with the model `jev-1.14.0` and the header, that a request that mixes a `box` with another question also uses `jev-1.14.0`, that the text output prints the four fractions and the `confidence`, and that `--json` prints the raw answer, and see them fail, then add the verb (D3, D5).
  Check: `just test tests/claudetto/decide`
- [x] 4.2 Decide by code size whether the box also prints in pixels, from the `IHDR` chunk of a PNG or the `SOF` marker of a JPEG, and if it does, add a test and the read (D5, open question 1).
  Check: `just test tests/claudetto/decide`

## 5. Docs and Changelog

- [x] 5.1 Update the usage text in `src/plugins/claudetto/slices/decide/prompts/usage.md` for `--image` and `box`, with a note that a `box` can come back when the target is absent, update `src/wiki/claudetto/slices/Decide.md`, and add the entries under `[Unreleased]` in `CHANGELOG.md` (D9).
  Check: `bun run lint:md && just generate --check`

## 6. Live Paid Calls

- [x] 6.1 Ask the user before each paid call, with the expected cost and the current weekly share, then run one `yes` call with one image, and one `box` call with one image, and write the results and the method to `src/wiki/claudetto/evidence/Jev-Images.md`, with the tokens of each request, the model ID that each request names, and what the box found.
  Check: `grep -q 'jev-1.14.0' src/wiki/claudetto/evidence/Jev-Images.md && just generate --check`

- [x] 6.2 Add tests that an image over 1568 px or under 280 px on a side exits `2` before any request for each verb, that the edges 1568 x 1568 and 280 x 280 pass, and that an unreadable size passes to the API, and see them fail, then add `IMAGE_SIDE_MIN`, `IMAGE_SIDE_MAX`, `IMAGE_PIXELS_MIN`, and `IMAGE_PIXELS_MAX` to `limits.ts` and the check to `readImage` (D4, live `400` of 2026-10-20).
  Check: `just test tests/claudetto/decide && just generate --check`

## 7. Full Gate

- [x] 7.1 Run the full gate in a container.
  Check: `just docker check`

## 8. Scale in the CLI

- [x] 8.1 Add tests with a fake scaler that an image over 1568 px on a side is scaled into a copy and sent (one request, the info line on stderr, the original file as it is, the `box` pixels from the original size), and that an absent scaler, a scaler that fails, and a copy that is still out of bounds exit `2` with no request and the hint, and one test with the real `sips` that is skipped without it, and see them fail, then add `SCALE_TIMEOUT_MS` to `limits.ts` and the scaling to `readImage` (D4).
  Check: `just test tests/claudetto/decide && just generate --check`
