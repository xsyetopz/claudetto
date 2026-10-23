export const ASK_APPROVAL = (v: { index: string }): string =>
  `Does question ${v.index} ask the user to approve money, a push, a release, a delete, or a step with no undo?`;

export const ASK_NOTE = (v: { confidence: string }): string =>
  `Jev picks this option (confidence ${v.confidence}).`;

export const ASK_PICK = (v: { index: string }): string =>
  `Which option is the best answer to question ${v.index}?`;

export const ERROR_ASK_FLAGS = (v: {
  usage: string;
}): string => `\`ask\` takes the state in the JSON on stdin, and it prints JSON, so it takes no \`--state\` and no \`--json\`.
${v.usage}`;

export const ERROR_ASK_QUESTIONS = (v: { usage: string }): string =>
  `\`ask\` needs \`questions\` in the JSON. ${v.usage}`;

export const ERROR_ASK_STDIN = (v: { usage: string }): string =>
  `\`ask\` needs a JSON object on stdin. ${v.usage}`;

export const ERROR_BOX_IMAGE = (v: {
  usage: string;
}): string => `The verb \`box\` needs one picture.
Use \`--image <path>\` with a path to a PNG or JPEG file.
${v.usage}`;

export const ERROR_IMAGE_COPY_SIZE = (v: {
  path: string;
  size: string;
  bound: string;
  original: string;
}): string => `The scaled copy of the image file \`${v.path}\` is ${v.size} px, which is ${v.bound}, and the original is ${v.original} px.
The API takes 280 to 1,568 px per side.
Scale the image by hand so that its longest side is at most 1,568 px and its shortest side is at least 280 px, then send it again.`;

export const ERROR_IMAGE_FILE = (v: { path: string; reason: string }): string =>
  `The image file \`${v.path}\` ${v.reason}.`;

export const ERROR_IMAGE_PATH = (v: {
  usage: string;
}): string => `Use \`--image <path>\` with a path to a PNG or JPEG file.
${v.usage}`;

export const ERROR_IMAGE_SIZE = (v: {
  path: string;
  size: string;
  bound: string;
}): string => `The image file \`${v.path}\` is ${v.size} px, which is ${v.bound}.
The API takes 280 to 1,568 px per side, and it answers a larger or smaller image with a \`400\`.
Scale the image so that its longest side is at most 1,568 px and its shortest side is at least 280 px, then send it again.
On macOS, run \`sips -Z 1568 in.png --out out.png\`.
On other systems, run ImageMagick \`magick in.png -resize 1568x1568 out.png\`.`;

export const ERROR_NO_KEY = `The variable \`TYPESAFE_API_KEY\` is not set. Set it before Claude Code starts.`;

export const ERROR_PICK_OPTIONS = `\`pick\` needs 2 to 255 options, each as \`key\` or \`key=description\`.`;

export const ERROR_QUESTION_MISSING = (v: { usage: string }): string =>
  `Give the question. ${v.usage}`;

export const ERROR_VERB = (v: { verb: string; usage: string }): string =>
  `The verb \`${v.verb}\` is not known. ${v.usage}`;

export const INFO_IMAGE_SCALED_MAX = (v: {
  path: string;
  from: string;
}): string =>
  `Scaled \`${v.path}\` from ${v.from} to at most 1,568 px on a side for the API.`;

export const INFO_IMAGE_SCALED = (v: {
  path: string;
  from: string;
  to: string;
}): string => `Scaled \`${v.path}\` from ${v.from} to ${v.to} px for the API.`;

export const JEV_ANSWERED = (v: {
  question: string;
  choice: string;
  confidence: string;
}): string =>
  `Jev answered the question "${v.question}" with \`${v.choice}\` (confidence ${v.confidence}).`;

export const JEV_CONTINUE = `The user saw no dialog.
Continue with those answers.
Tell the user in your next reply that Jev answered, and name each pick and its confidence.`;

export const OPTION_DESCRIPTION = `Use \`off\` for no pick, or \`jev\` for Jev (it needs \`TYPESAFE_API_KEY\`, and the questions go to the TypeSafe API). With \`jev\` and the key, Jev answers each \`AskUserQuestion\` call and the dialog stays hidden, except when Jev is unsure about a question.`;

export const PICK_UNSURE = `The confidence is under 0.5, so Jev is not sure.`;

export const TOOL_ASK = `Jev may answer a question in place of the user, from the question text and the option texts alone.
Jev reads the question and the options only, and no file or session.
Put the facts that decide the question in the question and in the option descriptions: the file lines and the tool results, with their sources.
Keep secrets, keys, and personal data out of the question, because the text goes to the TypeSafe API.
When Jev is not sure, the user answers the dialog.
An approval question goes only to the user: a question that asks the user to approve money, a push, a release, a delete, or a step with no undo.
State in the question that it asks for approval, so that the user gets the dialog.`;

export const USAGE = `Use one of these forms:
- \`claudetto-decide yes [--json] [--state <- | text>] [--image <path>]... [--] "<question>"\`
- \`claudetto-decide pick [--json] [--state <- | text>] [--image <path>]... [--] "<question>" <key>[=<description>]...\`
- \`claudetto-decide box --image <path> [--image <path>]... [--json] [--state <- | text>] [--] "<what to find>"\`
- \`claudetto-decide ask [--image <path>]...\`, with JSON on stdin.
An \`--image\` takes a PNG or JPEG file, and the image leaves the machine, so send only the pictures that the user agrees to show.
Each side must be 280 to 1,568 px, or the command exits with code 2.
On macOS, the command scales a larger picture itself with \`sips\`, into a copy, and it prints one line on stderr.
On other systems, scale the picture first, such as with \`magick in.png -resize 1568x1568 out.png\`.
A \`box\` can come back when the target is absent from the image, so read its confidence.`;

export const WARN_IMAGE_SCALE_FAILED = (v: { path: string }): string =>
  `The scale of \`${v.path}\` with \`sips\` failed.`;

export const YES_UNSURE = `P(yes) is near 0.5, so Jev is not sure.`;
