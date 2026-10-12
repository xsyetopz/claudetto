// The fixture mod handlers of `alpha`.

import { words } from "../../../../../kernel/words.ts";
import { count } from "../domain/count.ts";

type Next = (e: unknown) => unknown;

export const onBash = (_$: unknown, e: unknown, next: Next) => next(e);
export const onCompose = (_$: unknown, e: unknown, next: Next) =>
  next(count(words(String(e)).join(" ")));
