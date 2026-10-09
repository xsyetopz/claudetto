import { retryWithBackoff } from "./retry.mjs";

export const viaReflect = (task) => Reflect.apply(retryWithBackoff, null, [task]);
