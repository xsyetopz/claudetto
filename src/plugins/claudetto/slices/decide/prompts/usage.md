Use one of these forms:
- `claudetto-decide yes [--json] [--state <- | text>] [--image <path>]... [--] "<question>"`
- `claudetto-decide pick [--json] [--state <- | text>] [--image <path>]... [--] "<question>" <key>[=<description>]...`
- `claudetto-decide box --image <path> [--image <path>]... [--json] [--state <- | text>] [--] "<what to find>"`
- `claudetto-decide ask [--image <path>]...`, with JSON on stdin.
An `--image` takes a PNG or JPEG file, and the image leaves the machine, so send only the pictures that the user agrees to show.
Each side must be 280 to 1568 px, or the command exits with code 2, so scale a larger picture first.
A `box` can come back when the target is absent from the image, so read its confidence.
