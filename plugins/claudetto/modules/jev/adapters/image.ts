// The image part of the command `claudetto-decide`: it reads and checks one `--image` file, and scales it when it is too big.

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

/** A fault of the arguments or of the key. It lives here so that `cli.ts` re-exports it without a cycle. */
export class UsageError extends Error {}

// The first bytes of a PNG file and of a JPEG file (design D4).
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

const imageType = (bytes: Uint8Array): string | undefined => {
	const starts = (magic: number[]) => magic.every((b, i) => bytes[i] === b);
	if (starts(PNG_MAGIC)) {
		return "image/png";
	}
	if (starts(JPEG_MAGIC)) {
		return "image/jpeg";
	}
	return undefined;
};

const n = (v: number) => v.toLocaleString("en-US");

/** The bound that a size is over, or `undefined`. Scaling down can fix it. */
const maxBound = ({ width, height }: ImageSize): string | undefined => {
	if (Math.max(width, height) > IMAGE_SIDE_MAX) {
		return `over ${n(IMAGE_SIDE_MAX)} px on a side`;
	}
	return width * height > IMAGE_PIXELS_MAX
		? `over ${n(IMAGE_PIXELS_MAX)} px in total`
		: undefined;
};

/** The bound that a size is under, or `undefined`. The command never scales up. */
const minBound = ({ width, height }: ImageSize): string | undefined => {
	if (Math.min(width, height) < IMAGE_SIDE_MIN) {
		return `under ${n(IMAGE_SIDE_MIN)} px on a side`;
	}
	return width * height < IMAGE_PIXELS_MIN
		? `under ${n(IMAGE_PIXELS_MIN)} px in total`
		: undefined;
};

export const sizeText = ({ width, height }: ImageSize): string =>
	`${width}x${height}`;

/** Scales the image at `input` into `output`, and tells if it did. A test passes a fake. */
export type Scaler = (input: string, output: string) => Promise<boolean>;

/** `sips` with the longest side `IMAGE_SIDE_MAX` px, or `undefined` when `sips` is absent. */
const systemScaler = (): Scaler | undefined => {
	const sips = globalThis.Bun.which("sips");
	if (!sips) {
		return undefined;
	}
	return async (input, output) => {
		try {
			const proc = globalThis.Bun.spawn(
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

/** The bytes to send, and the size of the file that the user named (`undefined` when the header has none). */
export interface LoadedImage {
	readonly blob: Blob;
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

const tooBig = (path: string, size: ImageSize, bound: string): UsageError =>
	new UsageError(ERROR_IMAGE_SIZE({ path, size: sizeText(size), bound }));

type Fail = (reason: string, cause?: unknown) => UsageError;

const readChecked = async (
	from: string,
	fail: Fail,
): Promise<{ bytes: Uint8Array; type: string }> => {
	const info = await stat(from).catch(() => undefined);
	if (info?.isDirectory()) {
		throw fail("is a directory, not a file");
	}
	const file = globalThis.Bun.file(from);
	if (!(await file.exists())) {
		throw fail("does not exist");
	}
	if (file.size > IMAGE_BYTES_MAX) {
		throw fail(`is over ${IMAGE_BYTES_MAX} bytes`);
	}
	let bytes: Uint8Array;
	try {
		bytes = await file.bytes();
	} catch (err) {
		throw fail("cannot be read", err);
	}
	// The file can grow after the size check.
	if (bytes.length > IMAGE_BYTES_MAX) {
		throw fail(`is over ${IMAGE_BYTES_MAX} bytes`);
	}
	const type = imageType(bytes);
	if (!type) {
		throw fail("is not a PNG or JPEG file");
	}
	return { bytes, type };
};

/** The scaled copy of an image over the bounds, made in a temporary folder, or `undefined` when the scaler fails. */
const scaleCopy = async (
	path: string,
	size: ImageSize,
	scaler: Scaler,
	fail: Fail,
): Promise<LoadedImage | undefined> => {
	const small = minBound(size);
	if (small) {
		throw tooBig(path, size, small);
	}
	const dir = await mkdtemp(join(tmpdir(), "claudetto-decide-"));
	try {
		const out = join(dir, basename(path));
		const copy = (await scaler(path, out))
			? await readChecked(out, fail).catch(() => undefined)
			: undefined;
		if (!copy) {
			console.error(WARN_IMAGE_SCALE_FAILED({ path }));
			return undefined;
		}
		const scaledTo = imageSize(copy.bytes);
		const bound = scaledTo && sizeBound(scaledTo);
		if (scaledTo && bound) {
			throw new UsageError(
				ERROR_IMAGE_COPY_SIZE({
					path,
					size: sizeText(scaledTo),
					bound,
					original: sizeText(size),
				}),
			);
		}
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

/** Reads one `--image` file and checks its file size, first bytes, and pixel size (design D4). A fault is a `UsageError`. */
export const readImage = async (
	path: string,
	{ scale }: ReadOptions = {},
): Promise<LoadedImage> => {
	const fail: Fail = (reason, cause) =>
		new UsageError(ERROR_IMAGE_FILE({ path, reason }), { cause });
	const { bytes, type } = await readChecked(path, fail);
	const size = imageSize(bytes);
	const scaler = scale === undefined ? systemScaler() : (scale ?? undefined);
	if (size && maxBound(size) && scaler) {
		const scaled = await scaleCopy(path, size, scaler, fail);
		if (scaled) {
			return scaled;
		}
	}
	// A size that cannot be read does not stop the command: the API checks it.
	const bound = size && sizeBound(size);
	if (size && bound) {
		throw tooBig(path, size, bound);
	}
	return { blob: new Blob([bytes], { type }), size };
};

const sized = (width: number, height: number): ImageSize | undefined =>
	width > 0 && height > 0 ? { width, height } : undefined;

/** The size from the `IHDR` chunk, which must be the first chunk. */
const pngSize = (bytes: Uint8Array, view: DataView): ImageSize | undefined =>
	bytes.length >= 24 && view.getUint32(12) === 0x49_48_44_52
		? sized(view.getUint32(16), view.getUint32(20))
		: undefined;

/** A marker with no length: it is two bytes long. */
const isStandalone = (marker: number): boolean =>
	marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8);

const isSof = (marker: number): boolean =>
	marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

/** The size from the first `SOF` marker. Each segment is `FF`, a marker byte, and a length that counts its own two bytes. */
const jpegSize = (bytes: Uint8Array, view: DataView): ImageSize | undefined => {
	let at = 2;
	while (at + 4 <= bytes.length) {
		if (bytes[at] !== 0xff) {
			return undefined;
		}
		const marker = bytes[at + 1] ?? 0;
		if (isSof(marker)) {
			return at + 9 <= bytes.length
				? sized(view.getUint16(at + 7), view.getUint16(at + 5))
				: undefined;
		}
		if (marker === 0xff) {
			at += 1;
		} else {
			at += isStandalone(marker) ? 2 : 2 + view.getUint16(at + 2);
		}
	}
	return undefined;
};

/** The size of a PNG or JPEG (design D5), or `undefined` for a file that is cut short. */
export const imageSize = (bytes: Uint8Array): ImageSize | undefined => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return imageType(bytes) === "image/png"
		? pngSize(bytes, view)
		: jpegSize(bytes, view);
};
