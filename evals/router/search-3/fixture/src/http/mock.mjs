// A test double with its own `redactSecrets`. It hides nothing.
const redactSecrets = (text) => text;
export const mocked = (text) => redactSecrets(text);
