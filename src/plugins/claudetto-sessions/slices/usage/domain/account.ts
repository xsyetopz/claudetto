// The account line of a report, from the answer of `$.session.identity()`.

/** The fields of an answer of `$.session.identity()` that the line reads. A `deny` answer has none of them. */
export type Identity = {
  kind?: string | undefined;
  email?: string | undefined;
  organizationId?: string | undefined;
  isVerified?: boolean | undefined;
  deny?: string | undefined;
};

/**
 * The line that names the account of the session, or undefined when the identity is denied.
 * Claude Code answers `identity` only to a plugin that managed settings install, so a plugin install gets no line.
 * An answer with no account name gives the sign-in kind alone.
 */
export const accountLine = (identity: Identity): string | undefined => {
  if (identity.deny !== undefined || identity.kind === undefined) return;
  const name = identity.email ?? identity.organizationId;
  if (name === undefined) return `Sign-in: ${identity.kind}`;
  const checked = identity.isVerified ? "" : ", not verified by the server";
  return `Account: ${name} (${identity.kind}${checked})`;
};
