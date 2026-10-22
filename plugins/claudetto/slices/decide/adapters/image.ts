// The image part of the command `claudetto-decide`: it reads and checks one `--image` file, and scales it when it is too big.
// It runs on Bun, so it may use `Bun` and the `node:` modules.

import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  IMAGE_BYTES_MAX,
  IMAGE_PIXELS_MAX,
  IMAGE_PIXELS_MIN,
  IMAGE_SIDE_MAX,
  IMAGE_SIDE_MIN,
  SCALE_TIMEOUT_MS,
} from "../limits.ts";
import {
  ERROR_IMAGE_COPY_SIZE,
  ERROR_IMAGE_FILE,
  ERROR_IMAGE_SIZE,
  WARN_IMAGE_SCALE_FAILED,
} from "../prompts.ts";
import { UsageError } from "./errors.ts";

/** The first bytes of a PNG file and of a JPEG file (design D4). */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

/** The content type for the first bytes of a file, or `undefined` when they are not PNG or JPEG. */
const imageType = (bytes: Uint8Array): string | undefined => {
  const starts = (magic: number[]) => magic.every((b, i) => bytes[i] === b);
  if (starts(PNG_MAGIC)) return "image/png";
  if (starts(JPEG_MAGIC)) return "image/jpeg";
  return undefined;
};

/** Numbers print with commas, as the numbers of the prompts do. */
const n = (v: number) => v.toLocaleString("en-US");

/** The bound that a size is over, or `undefined`. Scaling down can fix it. */
const maxBound = ({ width, height }: ImageSize): string | undefined =>
  Math.max(width, height) > IMAGE_SIDE_MAX
    ? `over ${n(IMAGE_SIDE_MAX)} px on a side`
    : width * height > IMAGE_PIXELS_MAX
      ? `over ${n(IMAGE_PIXELS_MAX)} px in total`
      : undefined;

/** The bound that a size is under, or `undefined`. The command never scales up, so nothing can fix it. */
const minBound = ({ width, height }: ImageSize): string | undefined =>
  Math.min(width, height) < IMAGE_SIDE_MIN
    ? `under ${n(IMAGE_SIDE_MIN)} px on a side`
    : width * height < IMAGE_PIXELS_MIN
      ? `under ${n(IMAGE_PIXELS_MIN)} px in total`
      : undefined;

export const sizeText = ({ width, height }: ImageSize): string =>
  `${width}x${height}`;

/**
 * Scales the image at `input` into `output`, and tells if it did.
 * The command uses `sips` of macOS, and a test passes a fake.
 */
export type Scaler = (input: string, output: string) => Promise<boolean>;

/** The scaler of the system: `sips`, which makes the longest side `IMAGE_SIDE_MAX` px. It is `undefined` when `sips` is absent. */
const systemScaler = (): Scaler | undefined => {
  const sips = Bun.which("sips");
  if (!sips) return undefined;
  return async (input, output) => {
    try {
      // An argument array and no shell, so a path is never read as a command.
      const proc = Bun.spawn(
        [sips, "-Z", String(IMAGE_SIDE_MAX), input, "--out", output],
        {
          stdout: "ignore",
          stderr: "ignore",
          timeout: SCALE_TIMEOUT_MS,
        },
      );
      return (await proc.exited) === 0;
    } catch {
      return false;
    }
  };
};

/** An image that `readImage` has read: the bytes to send, and the size of the file that the user named. */
export interface LoadedImage {
  readonly blob: Blob;
  /** The size of the file at the path, or `undefined` when the header has none. */
  readonly size: ImageSize | undefined;
  readonly scaledTo?: ImageSize;
  readonly scaled?: boolean;
}

/** Options of `readImage`: `scale` is `undefined` for `sips` when it exists, and `null` for no scaler. */
export interface ReadOptions {
  readonly scale?: Scaler | null;
}

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

const sizeBound = (size: ImageSize): string | undefined =>
  maxBound(size) ?? minBound(size);

type Fail = (reason: string) => UsageError;

const readChecked = async (
  from: string,
  fail: Fail,
): Promise<{ bytes: Uint8Array; type: string }> => {
  const info = await stat(from).catch(() => undefined);
  if (info?.isDirectory()) throw fail("is a directory, not a file");
  const file = Bun.file(from);
  if (!(await file.exists())) throw fail("does not exist");
  if (file.size > IMAGE_BYTES_MAX)
    throw fail(`is over ${IMAGE_BYTES_MAX} bytes`);
  let bytes: Uint8Array;
  try {
    bytes = await file.bytes();
  } catch {
    throw fail("cannot be read");
  }
  // The size check above can miss a file that grew, so the read length is checked too.
  if (bytes.length > IMAGE_BYTES_MAX)
    throw fail(`is over ${IMAGE_BYTES_MAX} bytes`);
  const type = imageType(bytes);
  if (!type) throw fail("is not a PNG or JPEG file");
  return { bytes, type };
};

/**
 * The scaled copy of an image over the bounds, or `undefined` when the scaler fails.
 * The copy is made in a temporary folder, and the folder goes away at the end.
 */
const scaleCopy = async (
  path: string,
  size: ImageSize,
  scaler: Scaler,
  fail: Fail,
): Promise<LoadedImage | undefined> => {
  // The command never scales up, so a side under the minimum stops it with the real size, before any scaling.
  const small = minBound(size);
  if (small)
    throw new UsageError(
      ERROR_IMAGE_SIZE({ path, size: sizeText(size), bound: small }),
    );
  const dir = await mkdtemp(join(tmpdir(), "claudetto-decide-"));
  try {
    const out = join(dir, basename(path));
    // A scaler that fails, or leaves no good copy, leaves the original, and the size check then stops the command.
    const copy = (await scaler(path, out))
      ? await readChecked(out, fail).catch(() => undefined)
      : undefined;
    if (!copy) {
      console.error(WARN_IMAGE_SCALE_FAILED({ path }));
      return undefined;
    }
    const scaledTo = imageSize(copy.bytes);
    // The copy must be inside the bounds too, such as a short side that the scaling left under the minimum.
    const bound = scaledTo && sizeBound(scaledTo);
    if (scaledTo && bound)
      throw new UsageError(
        ERROR_IMAGE_COPY_SIZE({
          path,
          size: sizeText(scaledTo),
          bound,
          original: sizeText(size),
        }),
      );
    return {
      blob: new Blob([copy.bytes], { type: copy.type }),
      size,
      scaled: true,
      ...(scaledTo && { scaledTo }),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

/**
 * Reads one `--image` file, and checks its file size, its first bytes, and its pixel size (design D4).
 * An image over the bounds is scaled into a copy in a temporary folder, when a scaler exists, and the original stays as it is.
 * A fault is a `UsageError` that names the path and the reason.
 */
export const readImage = async (
  path: string,
  { scale }: ReadOptions = {},
): Promise<LoadedImage> => {
  const fail: Fail = (reason) =>
    new UsageError(ERROR_IMAGE_FILE({ path, reason }));
  const { bytes, type } = await readChecked(path, fail);
  const size = imageSize(bytes);
  const scaler = scale === undefined ? systemScaler() : (scale ?? undefined);
  if (size && maxBound(size) && scaler) {
    const scaled = await scaleCopy(path, size, scaler, fail);
    if (scaled) return scaled;
  }
  // A size that cannot be read does not stop the command: the API checks it then.
  const bound = size && sizeBound(size);
  if (size && bound)
    throw new UsageError(
      ERROR_IMAGE_SIZE({ path, size: sizeText(size), bound }),
    );
  return { blob: new Blob([bytes], { type }), size };
};

const sized = (width: number, height: number): ImageSize | undefined =>
  width > 0 && height > 0 ? { width, height } : undefined;

/** The size from the `IHDR` chunk of a PNG. The first chunk must be `IHDR`, which is the four bytes `49 48 44 52` at 12. */
const pngSize = (bytes: Uint8Array, view: DataView): ImageSize | undefined =>
  bytes.length >= 24 && view.getUint32(12) === 0x49484452
    ? sized(view.getUint32(16), view.getUint32(20))
    : undefined;

/** A marker with no length: it is two bytes long. */
const isStandalone = (marker: number): boolean =>
  marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8);

const isSof = (marker: number): boolean =>
  marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

/** The size from the first `SOF` marker of a JPEG. Each segment is `FF`, a marker byte, and a length that counts its own two bytes. */
const jpegSize = (bytes: Uint8Array, view: DataView): ImageSize | undefined => {
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return undefined;
    const marker = bytes[at + 1] as number;
    if (isSof(marker))
      return at + 9 <= bytes.length
        ? sized(view.getUint16(at + 7), view.getUint16(at + 5))
        : undefined;
    if (marker === 0xff) at += 1;
    else at += isStandalone(marker) ? 2 : 2 + view.getUint16(at + 2);
  }
  return undefined;
};

/**
 * The size from the `IHDR` chunk of a PNG or the first `SOF` marker of a JPEG (design D5).
 * It gives `undefined` for a file that is cut short or has no `SOF`, and the caller then prints no pixels.
 */
export const imageSize = (bytes: Uint8Array): ImageSize | undefined => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return imageType(bytes) === "image/png"
    ? pngSize(bytes, view)
    : jpegSize(bytes, view);
};
