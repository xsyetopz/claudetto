The image file `{{path}}` is {{size}} px, which is {{bound}}.
The API takes {{IMAGE_SIDE_MIN}} to {{IMAGE_SIDE_MAX}} px per side, and it answers a larger or smaller image with a `400`.
Scale the image so that its longest side is at most {{IMAGE_SIDE_MAX}} px and its shortest side is at least {{IMAGE_SIDE_MIN}} px, then send it again.
On macOS, run `sips -Z {{IMAGE_SIDE_MAX}} in.png --out out.png`.
On other systems, run ImageMagick `magick in.png -resize {{IMAGE_SIDE_MAX}}x{{IMAGE_SIDE_MAX}} out.png`.
