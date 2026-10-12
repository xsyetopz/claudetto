// The shapes of a `/v1/messages` request and of a `count_tokens` reply, as `report.ts` reads them.

/** One content block of a message or of `system`. A text block has a `text`. */
export type Block = {
  type?: string;
  text?: unknown;
  content?: unknown;
  name?: unknown;
};

/** One message of a request. Its `content` is a string or a list of blocks. */
export type Message = {
  role: string;
  content: string | Block[];
};

/** One entry of `tools`. A deferred tool has `defer_loading`. */
export type Tool = {
  type?: string;
  name?: string;
  defer_loading?: boolean;
};

/** A `/v1/messages` request body, with the fields that `report.ts` reads. */
export type Body = {
  model?: string;
  system?: string | Block[];
  tools?: Tool[];
  messages: Message[];
  thinking?: unknown;
  tool_choice?: unknown;
};

/** The reply of `count_tokens`, when it is a success. */
export type CountReply = {
  input_tokens: number;
};

/** A change that makes a body acceptable to `count_tokens`. */
export type Fix = (body: Body) => Body;

/** A function that returns the request with one part removed. */
export type Swap = (next: Block | null) => Body;

/** One part of a request, with the function that returns the request without it. */
export type Part = {
  kind: string;
  name: string | undefined;
  chars: number;
  without: () => Body;
};

/** One row of the report: the tokens that one part costs. */
export type Row = {
  kind: string;
  name: string | undefined;
  chars: number;
  tokens: number;
};

/** The sizing of one request: the full count, the fixes in use, and each part. */
export type Sizing = {
  model: string | undefined;
  fixes: string[];
  full: number;
  parts: number;
  rest: number;
  rows: Row[];
};
