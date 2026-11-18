# Plugin Refusal

- [x] **CON-009** claudetto shall not rely on a plugin to refuse a builtin at runtime.
  Acceptance: no hook answers `{ refuse }` for a `@builtin` plugin; the disable is a settings write. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: chunk-m14bt1pz.js@4828976 (2.1.327) and chunk-m14bt1pz.js@4831081 (2.1.327; first read in claude 2.1.326; relocated from chunk-wqb2b4v0.js@4661039, `ruo()`, claude 2.1.325 binary): `plugin.register` hooks may answer `{ refuse }` (`refuse` handled at `@4756689`), and the judge filter (`UDt({before,after,isNative,tier})` at `@4758794`) lets a native plugin be judged only by native plugins and a non-user plugin only by non-user-tier plugins.; probe: claude 2.1.327, 2026-11-18, `claude -p hi --plugin-dir plugins/claudetto --debug-file d.log` on an empty `CLAUDE_CONFIG_DIR`, with and without `prependPlugins: ["claudetto@inline"]`: the debug log reads "plugin.register: cc-plugin-agents-md (builtin, ...), judged by core alone: admitted", so a refusing hook never sees a builtin
