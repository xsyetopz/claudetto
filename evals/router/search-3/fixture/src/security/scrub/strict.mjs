// The strict mode of the audit tool. Only `../../audit/report.mjs` imports it by its file name.
export const redactSecrets = (s) => s.replace(/\S+/g, "***");
