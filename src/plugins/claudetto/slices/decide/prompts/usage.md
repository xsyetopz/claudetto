Use one of these forms:
- `claudetto-decide yes [--json] [--state <- | text>] [--image <path>]... [--] "<question>"`
- `claudetto-decide pick [--json] [--state <- | text>] [--image <path>]... [--] "<question>" <key>[=<description>]...`
- `claudetto-decide box --image <path> [--image <path>]... [--json] [--state <- | text>] [--] "<what to find>"`
- `claudetto-decide ask [--image <path>]...`, with JSON on stdin.
An `--image` takes a PNG or JPEG file, and the image leaves the machine, so send only the pictures that the user agrees to show.
Each side must be {{IMAGE_SIDE_MIN}} to {{IMAGE_SIDE_MAX}} px, or the command exits with code 2.
On macOS, the command scales a larger picture itself with `sips`, into a copy, and it prints one line on stderr.
On other systems, scale the picture first, such as with `magick in.png -resize {{IMAGE_SIDE_MAX_TEXT}}x{{IMAGE_SIDE_MAX_TEXT}} out.png`.
A `box` can come back when the target is absent from the image, so read its confidence.
