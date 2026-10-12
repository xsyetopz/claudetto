// The fixture mod handlers of `beta`.

type Next = (e: unknown) => unknown;

export const onBash = (_$: unknown, e: unknown, next: Next) => next(e);
export const onCompose = (_$: unknown, e: unknown, next: Next) => next(e);
export const onWrite = (_$: unknown, e: unknown, next: Next) => next(e);
