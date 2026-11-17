# Plugin Refusal

- [ ] **CON-009** claudetto shall not rely on a plugin to refuse a builtin at runtime.
  Acceptance: no hook answers `{ refuse }` for a `@builtin` plugin; the disable is a settings write. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: chunk-4h798pp0.js@4756689 and chunk-4h798pp0.js@4758794 (claude 2.1.326; relocated from chunk-wqb2b4v0.js@4661039, `ruo()`, claude 2.1.325 binary): `plugin.register` hooks may answer `{ refuse }` (`refuse` handled at `@4756689`), and the judge filter (`UDt({before,after,isNative,tier})` at `@4758794`) lets a native plugin be judged only by native plugins and a non-user plugin only by non-user-tier plugins.
