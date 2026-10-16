// The hosts that the hard stop of the AI policy denies in `sandbox.network.deniedDomains`.
// The `setup` slice writes them, and the `policy` slice checks for them, so the list is here.
// `*.githubusercontent.com` is not in the list, because it serves files to read and no endpoint that writes.

/** `github.com` and each subdomain, such as `api.github.com` and `uploads.github.com`. */
export const STOP_HOSTS: readonly string[] = ["github.com", "*.github.com"];
