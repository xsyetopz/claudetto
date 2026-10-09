// The log code reads `redactSecrets` from here.
export { redactSecrets } from "../security/index.mjs";

export function redactSecretsDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}
