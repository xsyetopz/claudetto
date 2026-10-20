# Design: jev-images

## Context

The command `claudetto-decide` posts JSON to `https://api.typesafe.ai/v1/systemone` with the model `jev-latest` (`src/plugins/claudetto/slices/decide/adapters/cli.ts`).
Its state is text, or `-` for stdin, because its header comment says that a path would send a file to the API.
This change starts after the tag `claudetto--v0.2.0`, which does not exist yet (D9).

The docs (read 2026-10-20) give these facts, which the decisions use:

- Jev 1.13 and 1.14 accept PNG and JPEG still images.
  Each request with an image or a `box` question sends the header `TypeSafe-Danger-Zone-Images: true`.
- A top-level `assets` map lists each image once, keyed by a reference string, and the docs recommend a UUID.
  The state, the instructions, or the criteria writes the reference, and the API replaces it with the image.
  Each asset must be referenced, or the API returns `400`.
  Each use of a reference adds a copy of the image.
- A multipart request has a first part named `request` (`application/json`), and one file part for each image.
- A `box` question has the form `{"type": "box", "instructions": "..."}`, with no `criteria`, and it needs Jev 1.14.
  The answer is `answers.q = {"type": "box", "box": {top, bottom, left, right}, "confidence": c}`, with the four fractions from 0 to 1 from the top-left corner (confirmed live with `jev-1.14.0` in task 6.1).
  The box finds one target per question.
- The API does no resize.
  One bad image fails the whole request.
- The feature is a preview.
  Its format, limits, and accuracy can change.

D7 to D10 record the decisions of the user on 2026-10-20, in the user's words.

## Decisions

### D1. Multipart Upload, Not Base64

Each image goes in its own file part.
The first part is `request`, with the JSON body and the content type `application/json`.
The part name of each image is `img<n>`, with `<n>` counted from 1 in the order of the `--image` options.
The header `TypeSafe-Danger-Zone-Images: true` goes on each request that has an image or a `box` question, and on no other request.

- Alternative: base64 in `data_base64`, with `format`.
  Rejected, because base64 adds one third to the size of each image, and the 32 MiB request body fills sooner.
  The docs also name multipart as the recommended form.
- Alternative: the header on each request.
  Rejected, because a text request would then ask for a feature that it does not use.

### D2. One UUID per Image, Named in the State

The CLI makes one UUID for each image, with `crypto.randomUUID()`, which Bun provides.
It uses the UUID as the key of the `assets` entry, and as the reference in the state.
It appends one line to the state for each image, such as `Image img1: <uuid>`, so that the question can name `img1`.
The state line is the only place where the reference is written, so each image has one copy in the request.
On `ask`, the state lines reach each question of the JSON, and the questions name the images in the same way.

- Alternative: the reference inside the question text.
  Rejected, because the question text is the words of the caller, and the CLI would have to edit them.
  A UUID in the question also gives the model an ID with no name.
  The state line keeps the question clean, and `img1` is a short name that a question can use.
- Alternative: a short name as the key.
  Rejected, because the docs recommend a UUID as the key.

### D3. Model by Request

A request with no `box` question uses `jev-latest`, as now.
Jev 1.13 accepts images, so an image call needs no other model.
A `box` request uses the pinned ID `jev-1.14.0`.
A request that mixes a `box` question with another question, which only the verb `ask` can send, also uses `jev-1.14.0`.
The docs give the price as $0.042 per million input tokens, with output free, and images bill as input tokens.

- Alternative: `jev-preview` for a `box`.
  Rejected, because an alias moves when a release ships, and the pinned ID keeps the answer of a `box` the same.
- Alternative: `jev-1.14.0` for each request.
  Rejected for now, because it changes the model of each text answer with no need.
  Open question 3 covers it.

### D4. Checks before the Call, with No Image Library

Before the call, the CLI reads the first bytes of each `--image` file.
A PNG file starts with `89 50 4E 47 0D 0A 1A 0A`, and a JPEG file starts with `FF D8 FF`.
The content type of the part comes from that check, as `image/png` or `image/jpeg`.
The CLI checks the size of each file against `IMAGE_BYTES_MAX` in `src/plugins/claudetto/slices/decide/limits.ts`, which is 16 MiB (16,777,216 bytes).
A file that fails a check is a usage fault, with exit `2`, and no request is sent.

The pixel bounds of the docs (280 to 1568 px per side, and 78,400 to 2,458,624 px in total) are left to the API.
The API answers with `413` or `400`, and the CLI prints the body of the answer, bounded by `ERROR_BODY_MAX`.
The CLI does not add the sizes of the files, so a request over the 32 MiB body gets the `413` of the API.

The CLI has no image library, so it cannot read the pixels of a picture.
A decoder adds code and a dependency, and the goal of the user (D10) forbids both.
The header read of D5 is the only size read, and it needs no library.

- Alternative: check the pixels in the CLI.
  Rejected, for the reason above.
- Alternative: resize the picture in the CLI.
  Rejected, because the API does no resize, and a resize needs an image library.

### D5. Box Output

The verb `box` prints one line of text with the four fractions, `top`, `bottom`, `left`, and `right`, and the `confidence`.
With `--json`, it prints the raw `box` answer from the API.
A `box` question needs one picture, so the question names the image that holds the target, such as `img1`.

The docs say that a box is always returned, even when the target is absent.
The docs pair `box` with a `noul` question that asks whether the target is present.
This change sends the `box` question alone.
The usage text says that a box can come back when the target is absent, and the wiki page says to ask the presence question first.

The box in pixels is optional.
When the CLI reads `width` and `height` from the `IHDR` chunk of a PNG or the `SOF` marker of a JPEG, it can add the box in pixels.
That read is a few lines.
Open question 1 leaves the choice to the implementer, by code size.

- Alternative: print only the raw JSON.
  Rejected, because the caller reads text, as it does for the other verbs.

### D6. The Hook Sends No Images

The `AskUserQuestion` hook uses the verb `ask`, and it sends no `--image`.
So no screenshot of a session goes to the API with no explicit call.
The hook code does not change.

- Alternative: attach a screenshot of the session to the questions of the hook.
  Rejected for privacy, because the API then gets a picture that no call asked for.

### D7. Scope: `--image` and `box` (the user, 2026-10-20)

Recorded verbatim:

> "`--image` and `box`": `--image <path>` (repeatable) on `yes`, `pick`, and `ask`, plus a new verb `box`.

This design reads `box` as taking `--image` too, because a `box` needs a picture (open question 2).

### D8. Path Rule: Only `--image` (the user, 2026-10-20)

Recorded verbatim:

> "Only `--image`": only `--image` takes a path, and only for a PNG or JPEG file that passes a check of its first bytes (magic bytes). `--state` stays text only.

The header comment of `cli.ts` names this exception to its path rule.

### D9. Release: After the 0.2.0 Tag (the user, 2026-10-20)

Recorded verbatim:

> "After the 0.2.0 tag"

This change starts after `claudetto--v0.2.0`.
The entry in `CHANGELOG.md` goes under `[Unreleased]`, because the version in the manifests has a tag then.

### D10. Goal: the Smallest Code (the user, 2026-10-20)

Recorded verbatim:

> "the smallest needed code for fully complete implementation". No SDK, no new dependency: use Bun's built-in `FormData` and `fetch`.

The code adds the flags, the body, the checks, and the box output, and nothing else.
D4 and D5 show where the code stops.

## Risks

- The API is a preview.
  Its format, limits, and accuracy can change, and a `400` or `413` body shows a new limit.
- Privacy.
  An image leaves the machine.
  The CLI cannot tell what a picture holds, so the usage text tells the caller to send only the pictures that the user agrees to show.
- Cost.
  An image bills as input tokens, and a large picture costs more.
  Task 6.1 measures one image call and one `box` call.
- One bad image fails the whole request with `400`.
- `jev-latest` moves when a release ships, so a later release can change the answer of a `yes` with an image.
  The text path has the same risk now.
- A `box` returns a box when the target is absent (D5).

## Open Questions

1. Does the box also print in pixels (D5)?
   Resolved (task 4.2): yes.
   `imageSize` in `adapters/cli.ts` reads the `IHDR` chunk of a PNG and walks the segments of a JPEG to the first `SOF` marker.
   It takes about 25 lines, with bounds checks and no library.
   The text line then ends with `, px x <left>..<right> y <top>..<bottom> of <width>x<height>`, rounded to integers, from the first `--image`.
   A file that is cut short, a JPEG with no `SOF`, a PNG whose first chunk is not `IHDR`, and a size of 0 give the line with no pixels and no error.
   The read ignores the EXIF orientation, so a rotated JPEG gives the stored size.
   `--json` stays the raw answer.
2. Does the verb `box` take `--image`?
   This design says yes (D7), because a `box` needs a picture.
   The user picked the scope "`--image` and `box`", and did not name the form of `box`, so confirm it at the start of the work.
3. Should `jev-1.14.0` serve each image request, and not `jev-latest` (D3)?
   This design says no for now.
   The choice comes again when `jev-latest` moves.
4. Does `box` pair with a presence question in the CLI?
   This design says no (D5).
