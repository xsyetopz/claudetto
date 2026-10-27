import { IMAGE_SIDE_MAX, IMAGE_SIDE_MIN } from "./limits.ts";

/** The named text values of a message. */
type Texts<K extends string> = Record<K, string>;

const n = (v: number) => v.toLocaleString("en-US");
const SIDES = `${n(IMAGE_SIDE_MIN)} to ${n(IMAGE_SIDE_MAX)} px`;
const LONGEST = `The longest side must be at most ${n(IMAGE_SIDE_MAX)} px. The shortest side must be at least ${n(IMAGE_SIDE_MIN)} px.`;

export const USAGE = `Use one of these forms:
- \`claudetto-decide yes [--json] [--state <- | text>] [--image <path>]... [--] "<question>"\`
- \`claudetto-decide pick [--json] [--state <- | text>] [--image <path>]... [--] "<question>" <key>[=<description>]...\`
- \`claudetto-decide box --image <path> [--image <path>]... [--json] [--state <- | text>] [--] "<what to find>"\`
- \`claudetto-decide ask [--image <path>]...\`, with JSON on stdin.
An \`--image\` takes a PNG or JPEG file. The image leaves the machine. Send only the pictures that the user agrees to show.
Each side must be ${SIDES}. Otherwise the command exits with code 2.
On macOS, the command scales a larger picture into a copy with \`sips\`. It prints one line on stderr.
On other systems, scale the picture first, such as with \`magick in.png -resize ${IMAGE_SIDE_MAX}x${IMAGE_SIDE_MAX} out.png\`.
The command can return a \`box\` when the target is absent from the image. Read its confidence.`;

export const ASK_APPROVAL = (v: Texts<"index">): string =>
	`Does question ${v.index} ask the user to approve money, a push, a release, a delete, or a step with no undo?`;

export const ASK_NOTE = (v: Texts<"confidence">): string =>
	`Jev picks this option (confidence ${v.confidence}).`;

export const ASK_PICK = (v: Texts<"index">): string =>
	`Which option is the best answer to question ${v.index}?`;

export const ERROR_ASK_FLAGS = `\`ask\` takes the state in the JSON on stdin. It prints JSON. Give it only \`--image\` as a flag.
${USAGE}`;

export const ERROR_ASK_QUESTIONS = `\`ask\` needs \`questions\` in the JSON. ${USAGE}`;

export const ERROR_ASK_STDIN = `\`ask\` needs a JSON object on stdin. ${USAGE}`;

export const ERROR_BOX_IMAGE = `The verb \`box\` needs one picture.
Use \`--image <path>\` with a path to a PNG or JPEG file.
${USAGE}`;

export const ERROR_IMAGE_COPY_SIZE = (
	v: Texts<"path" | "size" | "bound" | "original">,
): string => `The scaled copy of the image file \`${v.path}\` is ${v.size} px, which is ${v.bound}. The original is ${v.original} px.
The API takes ${SIDES} per side.
Scale the image by hand. ${LONGEST} Then send it again.`;

export const ERROR_IMAGE_FILE = (v: Texts<"path" | "reason">): string =>
	`The image file \`${v.path}\` ${v.reason}.`;

export const ERROR_IMAGE_PATH = `Use \`--image <path>\` with a path to a PNG or JPEG file.
${USAGE}`;

export const ERROR_IMAGE_SIZE = (
	v: Texts<"path" | "size" | "bound">,
): string => `The image file \`${v.path}\` is ${v.size} px, which is ${v.bound}.
The API takes ${SIDES} per side. It answers a larger or smaller image with a \`400\`.
Scale the image. ${LONGEST} Then send it again.
On macOS, run \`sips -Z ${IMAGE_SIDE_MAX} in.png --out out.png\`.
On other systems, run ImageMagick \`magick in.png -resize ${IMAGE_SIDE_MAX}x${IMAGE_SIDE_MAX} out.png\`.`;

export const ERROR_NO_KEY =
	"The variable `TYPESAFE_API_KEY` is not set. Set it before Claude Code starts.";

export const ERROR_PICK_OPTIONS =
	"`pick` needs 2 to 255 options, each as `key` or `key=description`.";

export const ERROR_QUESTION_MISSING = `Give the question. ${USAGE}`;

export const ERROR_VERB = (v: Texts<"verb">): string =>
	`The verb \`${v.verb}\` is not known. ${USAGE}`;

export const INFO_IMAGE_SCALED_MAX = (v: Texts<"path" | "from">): string =>
	`The command scaled \`${v.path}\` from ${v.from} to at most ${n(IMAGE_SIDE_MAX)} px on a side for the API.`;

export const INFO_IMAGE_SCALED = (v: Texts<"path" | "from" | "to">): string =>
	`The command scaled \`${v.path}\` from ${v.from} to ${v.to} px for the API.`;

export const JEV_ANSWERED = (
	v: Texts<"question" | "choice" | "confidence">,
): string =>
	`Jev answered the question "${v.question}" with \`${v.choice}\` (confidence ${v.confidence}).`;

export const JEV_CONTINUE = `The user saw no dialog.
Continue with those answers.
Tell the user in your next reply that Jev answered. Name each pick and its confidence.`;

export const OPTION_DESCRIPTION =
	"Use `off` for no pick. Use `jev` for Jev. `jev` needs `TYPESAFE_API_KEY`, and the questions go to the TypeSafe API. With `jev` and the key, Jev answers each `AskUserQuestion` call, and the dialog stays hidden. If Jev is unsure about a question, the user sees the dialog.";

export const PICK_UNSURE = "The confidence is under 0.5, so Jev is not sure.";

export const TOOL_ASK = `Jev may answer a question in place of the user, from the question text and the option texts alone.
Jev reads only the question and the options. Jev reads no file and no session.
Put the facts that decide the question in the question and in the option descriptions. Such facts are the file lines and the tool results, with their sources.
Keep secrets, keys, and personal data out of the question, because the text goes to the TypeSafe API.
When Jev is not sure, the user answers the dialog.
An approval question goes only to the user. It asks the user to approve money, a push, a release, a delete, or a step with no undo.
State in the question that it asks for approval. Then the user gets the dialog.`;

export const WARN_IMAGE_SCALE_FAILED = (v: Texts<"path">): string =>
	`\`sips\` failed to scale \`${v.path}\`.`;

export const YES_UNSURE = "P(yes) is near 0.5, so Jev is not sure.";
