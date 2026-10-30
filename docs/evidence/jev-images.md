> Saved from `wiki/claudetto/evidence/Jev-Images.md` at `HEAD`. The wiki is gone.

# Jev Images

This page gives the results of ten live calls, each with one image.
Seven calls answered, and three were rejected with HTTP `400`.
The calls ran on 2026-10-20 against the TypeSafe API.
They are the evidence of task `6.1` of the openspec change `jev-images`.
It is for a maintainer who checks the `--image` flag and the verb `box` of the `decide` slice.

## Result in Brief

- The `yes` call answered `P(yes) = 0.99`.
  The request named `jev-latest`, and the reply named `jev-1.13.0`.
- The reply of the first `box` call put the box within 0.01 of the true box on each edge.
  The request and the reply both named `jev-1.14.0`.
- The reply of the `box` call has a nested shape.
  The CLI of this commit expected a flat shape, so it rejected the reply, and the verb `box` printed no box.
  The fix is commit `38d39b78`.
- After the fix, a second `box` call printed the same box, with a pixel suffix.
- The shipped command, `plugins/claudetto/bin/claudetto-decide`, ran end to end with exit code `0` and printed a box.
- Three calls on a browser screenshot of 1554 by 2000 pixels got HTTP `400`, with the message `Invalid image dimensions.`
  The height of 2000 pixels is over the 1568-pixel bound in the docs.
  See the section on the pixel bound below.
  Since commit `c411962e`, the CLI stops such a file with exit code `2`, before the request.
- The same screenshot, scaled to 1218 by 1568 pixels, got HTTP `200` for each of the three calls.
  Each `box` edge was within about `0.025` of a reference box read by eye.
- The seven answered calls used about `20277` input tokens, about `$0.00085` at the price in design D3.
  The input tokens of the shipped-command call are counted, not logged.

## Method

| Item | Value |
| --- | --- |
| Date | 2026-10-20. The server `date` header of the run says `Tue, 20 Oct 2026 23:41:01 GMT`, and all calls ran within a few minutes of it |
| Claude Code | Not applicable, because the calls ran the CLI code through a wrapper script |
| Code | The shipped CLI in `plugins/claudetto/slices/decide/adapters/cli.ts` |
| Check | `just generate --check` passed before the run, so `plugins/` matched `src/` |
| Functions | `parseArgs`, `buildBody`, `readImage`, `imageSize`, `post`, and `render` |
| Wrapper | A small script outside the repository. It passed a logging `fetchFn` to `post`, to record the model of each request and the full reply |
| Key | `TYPESAFE_API_KEY`, read from the git-ignored `.env`. The key is in no log |
| Commands | `yes --image red.png -- "Does the image show a red rectangle on a white background?"` and `box --image red.png -- "the red rectangle"` |

The post-fix wrapper call used the same method, the same image, and the same question.
The wrapper runs call `post` and `render` directly, and not the launcher.
The shipped-command call in the section below is the only end-to-end run of the shipped command.
Running `adapters/cli.ts` directly does nothing, because only `plugins/claudetto/bin/claudetto-decide` calls `main`.

All results on this page are measured on 2026-10-20.

### Test Image

The test image is a PNG of 640 by 480 pixels and 2201 bytes.
A short Python script made it with `zlib` and `struct`, and no image library.
It is white, with one solid red rectangle (`#dc143c`) at x `160..479` and y `48..239`.
The true box is top `0.10`, bottom `0.50`, left `0.25`, and right `0.75`, in fractions of the height and the width.

## The `yes` Call

| Item | Value |
| --- | --- |
| Request model | `jev-latest` |
| Request body | Multipart, with the part `request` and the part `img1` |
| Header | `TypeSafe-Danger-Zone-Images: true` |
| Asset entry | `{"<uuid>":{"type":"image","part":"img1"}}` |
| State line | `Image img1: <uuid>` |
| HTTP | `200`, in 287 ms |
| Request ID | `req_01a15bb09504746285a7ca8491df480d` |
| Input and output tokens | `1143` and `20` |
| CLI output | `P(yes) = 0.99` |

The reply, with line breaks added for this page:

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "q": {
      "type": "noul",
      "noul": 0.99
    }
  },
  "usage": {
    "input_tokens": 1143,
    "output_tokens": 20
  }
}
```

The API accepted the asset entry, with no `400` about `assets`.

## The `box` Call

| Item | Value |
| --- | --- |
| Request model | `jev-1.14.0` |
| Request body | Multipart, as in the `yes` call |
| Header | `TypeSafe-Danger-Zone-Images: true` |
| HTTP | `200`, in 245 ms |
| Request ID | `req_01a15bb0962873f4bac94d0dcb5ad848` |
| Input and output tokens | `1134` and `20` |
| CLI output | None, because the CLI rejected the reply |

The reply, with line breaks added for this page:

```json
{
  "model": "jev-1.14.0",
  "answers": {
    "q": {
      "type": "box",
      "box": {
        "top": 0.1,
        "bottom": 0.51,
        "left": 0.25,
        "right": 0.76
      },
      "confidence": 0.92
    }
  },
  "usage": {
    "input_tokens": 1134,
    "output_tokens": 20
  }
}
```

### What the Box Found

| Edge | True | Found | Difference |
| --- | --- | --- | --- |
| Top | `0.10` | `0.10` | `0.00` |
| Bottom | `0.50` | `0.51` | `0.01` |
| Left | `0.25` | `0.25` | `0.00` |
| Right | `0.75` | `0.76` | `0.01` |

The confidence was `0.92`.
The box is within `0.01` of the true box on each edge.
The values come from the logging wrapper, because the CLI rejected the reply.

### The `box` Call after the Fix

The post-fix call ran after the fix in commit `38d39b78`.
It used `jev-1.14.0`, and it returned the same box as the first call.

| Item | Value |
| --- | --- |
| Request model | `jev-1.14.0` |
| HTTP | `200` |
| Input and output tokens | `1135` and `20` |
| CLI output | `top 0.10, bottom 0.51, left 0.25, right 0.76 (confidence 0.92), px x 160..486 y 48..245 of 640x480` |

The reply, with line breaks added for this page:

```json
{
  "model": "jev-1.14.0",
  "answers": {
    "q": {
      "type": "box",
      "box": {
        "top": 0.1,
        "bottom": 0.51,
        "left": 0.25,
        "right": 0.76
      },
      "confidence": 0.92
    }
  },
  "usage": {
    "input_tokens": 1135,
    "output_tokens": 20
  }
}
```

The pixel suffix puts the right edge at `486` and the bottom edge at `245`.
The true pixel box is x `160..479` and y `48..239`.
So the error is at most `7` px on the right edge and `6` px on the bottom edge.

### The Shipped Command

This call ran the shipped command, with the key in the environment only.

| Item | Value |
| --- | --- |
| Command | `plugins/claudetto/bin/claudetto-decide box --image red.png -- "the red rectangle"` |
| Exit code | `0`, with no pipe after the command |
| Key | In the environment only, and not in the output |
| Input tokens | Not logged, because the command does not print usage. About `1135` is counted |
| CLI output | `top 0.10, bottom 0.52, left 0.25, right 0.75 (confidence 0.93), px x 160..480 y 48..250 of 640x480` |

The pixel suffix puts the bottom edge at `250` and the right edge at `480`.
Against the true bottom edge at `239` and right edge at `479`, the errors are `11` px and `1` px.

## Finding: The Nested Answer Shape

- Task `4.1` assumed a flat answer, with `q.top`, `q.bottom`, `q.left`, `q.right`, and `q.confidence`.
  The API nests the four fractions under `q.box`, and it puts `q.confidence` beside `q.box`.
  The `yes` reply is flat, and its value is at `q.noul`.
- The CLI of this commit expected the flat shape.
  It rejected the reply with the message `The reply of the TypeSafe API has no valid box. Try again.` and exit code `1`.
- The fix to `boxOf` is commit `38d39b78`, with the subject `decide: read the nested box answer of jev-1.14.0`.

## Cost

| Call | Input tokens | Output tokens |
| --- | --- | --- |
| `yes` | `1143` | `20` |
| `box`, before the fix | `1134` | `20` |
| `box`, after the fix | `1135` | `20` |
| `box`, shipped command | `1135`, counted and not logged | Not logged |
| Three rejected calls (HTTP `400`) | Not known, no usage came back | Not known |
| `yes`, scaled screenshot | `5244` | `20` |
| `box`, scaled screenshot, logo | `5245` | `20` |
| `box`, scaled screenshot, connector | `5241` | `20` |
| Total, answered calls | `20277` | `120` for the six logged calls |

At `$0.042` per million input tokens, the seven answered calls cost about `$0.00085`.
The rejected calls returned no usage, so their cost is not known.
The price comes from design D3 of `jev-images`, and it is not checked again.
Output is free in that design, so the output tokens add no cost.

## An Image Over the Pixel Bound

This section gives three calls that were rejected for the pixel size of the image.
The image is a browser screenshot.
It is a PNG of 1554 by 2000 pixels, with 8-bit RGBA.
The calls used the same wrapper method as the earlier calls.
They were one `yes` question with model `jev-latest`, and two `box` questions with model `jev-1.14.0`.

Each call got HTTP `400` with this body, shown with line breaks added:

```json
{
  "detail": {
    "error_type": "api_usage_error",
    "message": "Invalid image dimensions."
  }
}
```

The CLI printed `TypeSafe API 400: <body>` and exited with code `1`.
The checks of the CLI before the call passed, which are the magic bytes and `IMAGE_BYTES_MAX`.
Design D4 leaves the pixel bounds to the API.
The docs give the bounds as 280 to 1568 pixels per side, and 78,400 to 2,458,624 pixels in total.
The height of 2000 pixels is over 1568.
The total of 3,108,000 pixels is also over 2,458,624.
No usage came back, so the input tokens of these calls are not known.
They are probably `0`, but this page does not check it.

Commit `c411962e` adds a check of the pixel bounds to the CLI, which the user chose.
The CLI now reads the size from the header of the file, and it stops a file outside the bounds with exit code `2`, before the request.
A run of the shipped command on the same screenshot, with a dummy key, printed this message and exited with code `2`:

```text
The image file `shot.png` is 1554x2000 px, which is over 1568 px on a side.
The API takes 280 to 1568 px per side, and it answers a larger or smaller image with a `400`.
Scale the image so that its longest side is at most 1568 px and its shortest side
is at least 280 px, then send it again.
```

The last sentence of the message is one line in the output.
This page breaks it to keep the block within 100 columns.

## The Same Screenshot, Scaled Down

The macOS command `sips -Z 1568` made a copy of the screenshot at 1218 by 1568 pixels.
The longest side is then at the bound.
The same three questions ran on the copy, with the same wrapper method.
Each call got HTTP `200`.

| Call | Model of the reply | Answer | Confidence | Input and output tokens | Time | Request ID |
| --- | --- | --- | --- | --- | --- | --- |
| `yes`, a circuit schematic | `jev-1.13.0` | `P(yes) = 1.00` | Not applicable | `5244` and `20` | 917 ms | `req_01a15bb5d3c87cd5906c12574723e859` |
| `box`, the YouTube logo | `jev-1.14.0` | top `0.13`, bottom `0.18`, left `0.10`, right `0.19` | `0.91` | `5245` and `20` | 452 ms | `req_01a15bb5d7777afba22eccbc49a560f8` |
| `box`, the USB-C connector symbol | `jev-1.14.0` | top `0.26`, bottom `0.31`, left `0.29`, right `0.33` | `0.81` | `5241` and `20` | 411 ms | `req_01a15bb5d941799cb2e49b2ab1a224de` |

The request of the `yes` call named `jev-latest`, and the requests of the `box` calls named `jev-1.14.0`.
The CLI printed `px x 122..231 y 204..282 of 1218x1568` for the logo, and `px x 353..402 y 408..486 of 1218x1568` for the connector.

The reference boxes come from the original screenshot, read by eye, so they are approximate.

| Target | Reference box | Found box | Largest difference |
| --- | --- | --- | --- |
| YouTube logo | top `0.135`, bottom `0.158`, left `0.108`, right `0.214` | top `0.13`, bottom `0.18`, left `0.10`, right `0.19` | `0.024` on the right edge |
| USB-C connector symbol | top `0.274`, bottom `0.317`, left `0.280`, right `0.322` | top `0.26`, bottom `0.31`, left `0.29`, right `0.33` | `0.014` on the top edge |

For the logo, the box stops short on the right and goes too low at the bottom.
For the connector, each edge is within about `0.015`.
An image near the bound used about `5240` input tokens, and the test image of 640 by 480 pixels used about `1135`.

## Limits

- Each answered call ran once.
  This page gives no rate and no spread.
- The images are one synthetic image and one browser screenshot.
  The reference boxes of the screenshot are read by eye.
- The pixel-bound section tests one image over the bound.
  It does not find the exact limit.
- The synthetic image has one high-contrast rectangle on white.
  The page does not show the accuracy on photographs.
- The page does not test a target that is absent from the image.
  The text of the verb `box` says that a box can come back for such a target.
- The first `box` call ran before the fix in commit `38d39b78`.
  The post-fix call ran after it.
- Answers vary slightly between calls, for the same image and question.
  The bottom edge was `0.51` or `0.52`, the right edge was `0.76` or `0.75`, and the confidence was `0.92` or `0.93`.

## Related Pages

- [Decide](Decide)
- [Evidence](Evidence)
