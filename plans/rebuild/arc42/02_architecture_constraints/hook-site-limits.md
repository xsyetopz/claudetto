# Hook-Site Limits

- [ ] **CON-008** A classic hook shall fit these limits: 10 s per event; `$.process.run` 30 s by default and 10 min at most; `$.store` 4 MiB; `$.fs.write` creates folders and cannot append; the hooks runtime has `crypto.subtle` and no `Buffer` and no `process`; a plugin hook that runs past its budget twice is unloaded (version unstated). `UserPromptSubmit` blocks `/claudetto:setup` when the module does not serve; `SessionStart` prints project state; `PreCompact` is strong. In claude 2.1.326 `process.run`, `store.*` and `fs.write` are present as hook calls (`chunk-qg227pzf.js@3393`, `chunk-qg227pzf.js@3595`; code search); the limit values are unverified in 2.1.326.
  Acceptance: A hook run past 10 s is cut; a hook using `Buffer` fails. Verification: probe.
  Basis: measured, cited docs, reported. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/hooks.json@088a227c; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:12. Not located: tags C:80, C:87.
