# You Should Know

## Constants and State

- [x] **RT-005** The recreation holds these constants: `CHECK_EVERY=6`, `CLEAR_AFTER_PROMPTS=2`, `CHECKS_KEPT=3`, `SEEN_MAX=50`, `SESSIONS_MAX=32`, `SHOWN_KEEP_MS=259200000` (3 days), `ASKED_MS=20000`, `NOTE_READ_MS=2000`, `TYPED_PAST_FREE=2`, `LOOKS_TO_SKIP_MAX=16`, `MAX_LINE_WIDTH=240`, `MAX_CAPTION_LENGTH=4000`, `MAX_CARDS=4`, `MAX_SKETCH_LINES=12`, `MAX_SKETCH_WIDTH=120`, `MAX_TITLE_WIDTH=120`, `SLUG_MAX=48`, `CLOCK_LENGTH=8`, `CARD_WIDTH=60`, `CARD_INSET=2`, `CHOICE_GAP=3`, `STAR_CELLS=2`, `FALLBACK_COLUMNS=80`, `WIDE_FROM=4352`, `WRAP_RESERVE_CELLS=1`, `OFFER_MARGIN_ROWS=1`. The names `CHECK_EVERY`, `CHECKS_KEPT`, `ASKED_MS`, `CLEAR_AFTER_PROMPTS`, `CLOCK_LENGTH`, `CARD_WIDTH`, `CARD_INSET`, and `CHOICE_GAP` are in the module export list of 2.1.326 (chunk-nvx1z6pc.js@6883 (2.1.327)); the other values were read in 2.1.325 and are checked at the Source offsets only.
  Basis: cited. Status: partial at 088a227c (baseline `LIMITS` holds `clearAfterPrompts: 2`, `freeIgnores: 2`, `maxSkips: 16`, `askedMs: 20_000`, `listMax: 50`, `sessionsMax: 32`, `lineChars: 240`, `cards: 4`, `titleChars: 120`, `sketchLines: 12`, `sketchChars: 120`, `proseChars: 4000`; it has no `CHECK_EVERY`, it uses `changesPerCheck: 3`).
  Source: chunk-nvx1z6pc.js@26250 (claude 2.1.327 binary); chunk-nvx1z6pc.js@26270 (claude 2.1.327 binary); chunk-nvx1z6pc.js@6883 (claude 2.1.327 binary); chunk-nvx1z6pc.js@25660 (claude 2.1.327 binary); chunk-nvx1z6pc.js@31260 (claude 2.1.327 binary); chunk-nvx1z6pc.js@31290 (claude 2.1.327 binary); chunk-nvx1z6pc.js@27760 (claude 2.1.327 binary); chunk-nvx1z6pc.js@30260 (claude 2.1.327 binary); chunk-nvx1z6pc.js@78260 (claude 2.1.327 binary); chunk-nvx1z6pc.js@29160 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/note.ts:8-22@088a227c.
  Verified: compare constants.ts and text.ts with the listed values -> all 26 names and values match (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): all 26 constant names and values present (constants.ts:3-41, text.ts:3-6); claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

- [x] **RT-006** State of the recreation.
  `store` (per plugin, persistent): `sessions` = list of rows `{id, view?, tag?, offeredTurn?, askedTurn?, checked?, checks?}` (max 32; newest first); `seen` = last 50 offered lines; `known` = last 50 lines the user said they knew; `typedPastInARow` (int); `looksToSkip` (int). All read through `storedCount` (safe int >= 0 else 0) and `stringLines` (array filtered to strings), rows through `rowsOf` (`isRow`: `id` string and `view` undefined or a valid view kind).
  `state` (per session id): key `aboutOpen` = `aboutKeyOf(view)` = `` `${shownAt ?? "unstamped"} ${line}` `` when the About note is open, else `""`; toggled with compare-and-set `ifVersion`.
  Memory (in-process maps): `checking` (sid -> in-flight check promise), `explaining` (sids with an in-flight Learn more fork), `askedTimers` (sid -> clock timer), `responding` (sids mid "Chat" press), `promptsSince` (sid -> `{origin,count}` persons' prompts since the offer), `ended` (sids whose session ended), `renderedSurfaces`, `bridgeSessions`, `idle` (sid -> `{shownAt,line,idle:{ms}|{since}}`), `autoSentKeys` (set of `aboutKeyOf`), `off = {clearing: Map, confirmed: Set}`.
  View kinds (`viewOf`): `offer{line, explanation?, shownAt, isOffArmed?, promptsSurvived?}`, `explaining{line,iteration}`, `explained{line,text,iteration,shownAt,promptsSurvived?}`, `asked{line,shownAt,iteration?}`, `making`, `ready{url}`, `failed{reason}`, `off{line,shownAt}`; claudetto does not implement the learning-page views `making` and `ready{url}` (PRD REQ-YOU-SHOULD-KNOW-044). "Open view" = `offer` or `explained`.
  `withRow(rows,row)`: put row first; if over 32, drop oldest rows, preferring rows that are not an open view shown less than 3 days ago; claudetto reports no `left_open` telemetry for a dropped open view (ADR-0115).
  Basis: cited. Status: partial at 088a227c (baseline `store.ts` keeps `rowsOf`, `linesOf`, `countOf`, and `withRow` in `note.ts`; its view kinds are `offer`, `asked`, `explained`).
  Source: chunk-nvx1z6pc.js@25660 (claude 2.1.327 binary); chunk-nvx1z6pc.js@32860 (claude 2.1.327 binary); chunk-nvx1z6pc.js@28260 (claude 2.1.327 binary); chunk-nvx1z6pc.js@31260 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/store.ts:1-50@088a227c; plugins/claudetto-you-should-know/hooks/note.ts:43-52@088a227c; plugins/claudetto-you-should-know/hooks/note.ts:287-293@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): store keys, rowsOf, storedCount, stringLines, aboutOpen with ifVersion match; making/ready and left_open now stated as not implemented (PRD 044, ADR-0115); claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

## Turn Step Check

- [x] **RT-007** The `turn.step` flow runs for each non-sub-agent step and starts a check without awaiting it.

  ```text
  step(sid, surfaces, index, turnId):
    promptsSince.revive: ended.delete(sid)
    N = (index===0) ? promptsSince.get(sid) : undefined ; if index===0: promptsSince.delete(sid)
    row = rowOf(sessions, sid); M = row.view ?? null
    if M in {explaining, making} and sid not in explaining-set (job died with a previous process/turn):
        clear view, invalidate ui.render, M=null
    skip = !(index>0 && index%6===0) || row.offeredTurn===turnId || M!==null || !isBandWatched(...)
    if index===0:
       if M.kind==="asked": cancel askedTimers[sid]; clear view; invalidate
       if isOpenView(M) and N defined:                       // person typed past the offer
          A = M.promptsSurvived + N.count
          reread row; if view not same showing (kind+shownAt) return
          keep = view.kind==="explained" || A < 2
          store row.view = keep ? {...view, promptsSurvived:A, (offer) isOffArmed:false} : undefined
          if keep: if offer was armed invalidate; return
          invalidate
          H = typedPastInARow+1; store typedPastInARow=H; store looksToSkip=looksToSkipAfter(H)
          telemetry answered{answer:"ignored_submit", ms_to_answer, turn_in_progress:false, offers_shown, line, tag, iteration, prompt_origin:N.origin, prompts_survived:A}
       return
    if skip return
    q = min(16, looksToSkip); if checking.has(sid) return
    if q>0: looksToSkip=q-1; return
    run check (async, not awaited):
       E({askedTurn:turnId})
       seen = stringLines(store seen); known = stringLines(store known)
       debug = switchOf(env DEBUG); t0=now
       try:
          W = await model.fork({prompt: proposePrompt(seen, known)})
          usage = W.usage (if present) else null
          outcome = W.isAnswered ? accept(W.text) : {outcome: UNANSWERED[W.reason], tag:undefined}
            UNANSWERED = {"nothing-to-fork":"none","api-error":"api_error","empty-reply":"none",aborted:"aborted"}
       catch: outcome="error"
       if debug: row.checked++ ; row.checks = (checksOf(row.checks) + {number:checked, step:index, outcome, latencyMs, at:now}).slice(-3); invalidate
       telemetry proposed{outcome, opener(tag), step:index, latency_ms, cache_read, cache_create, output_tokens, offers_shown}
    checking[sid] = promise.catch(noop).finally(delete)
  ```

  Notes: `proposed` telemetry for outcome `none` with `usage===null` sends no mark; `aborted` sends no mark. The fork is a side request on the session's own conversation (`model.fork` takes only `{prompt}`; the SIDE_REQUEST_FRAME says "You share the conversation context"). No digest is built and no model or effort option is passed.
  Basis: cited. Status: partial at 088a227c (baseline starts a check after 3 changing tool calls, builds a digest, and calls `model.complete` with a settings model and effort).
  Source: chunk-nvx1z6pc.js@80411 (claude 2.1.327 binary); chunk-nvx1z6pc.js@77760 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/register.ts:110@088a227c; plugins/claudetto-you-should-know/hooks/register.ts:167@088a227c; plugins/claudetto-you-should-know/hooks/settings.ts:1-29@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): step.ts:114-129,70-112, check.ts:46-77 match the flow; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

- [x] **RT-008** The `accept(text, seen, known)` step decides whether a reply becomes an offer.

  ```text
  accept(text, seen, known):
    P = parseProposedLine(text)
    if P.kind!=="line": return P.kind==="none" ? "none" : "parse_failed"
    key = lineKey(P.line)                          // lowercase, one trailing "." removed
    if any seen/known item has same key: "deduped"
    if !(row.askedTurn===turnId && !ended.has(sid)): "stale"
    store seen = [...seen, P.line].slice(-50)
    E({offeredTurn:turnId, tag:P.tag, view:{kind:"offer", line:P.line, explanation:P.explanation, shownAt:now}})
    promptsSince.delete(sid); invalidate("ui.render"); "shown"
  ```

  Basis: cited. Status: partial at 088a227c (`showReply` in `register.ts` checks ended, `askedTurn`, repeat; it also requires `row.view === null`).
  Source: chunk-nvx1z6pc.js@80411 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/register.ts:63-96@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): check.ts:21-52 accept matches; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

- [x] **RT-009** The skip backoff: `typedPastInARow` counts offers the user typed past; `looksToSkipAfter(n) = n<=2 ? 0 : min(16, 2**(n-3))` (n=3:1, 4:2, 5:4, 6:8, 7+:16 further checks skipped, each skip consumes one eligible check). Any answer except `ignored_timeout` resets both counters to 0.
  Basis: cited. Status: partial at 088a227c.
  Source: chunk-nvx1z6pc.js@78260 (claude 2.1.327 binary); chunk-nvx1z6pc.js@84311 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/note.ts:253-256@088a227c.
  Verified: read backoff.ts looksToSkipAfter -> n<=2 ? 0 : min(LOOKS_TO_SKIP_MAX=16, 2**(n-3)) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): backoff.ts:9-10; behaviour.test.ts:30; checks.test.ts:191-203; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

## Reply Parsing

- [x] **RT-010** `parseProposedLine` turns the side reply into a line or a refusal.
  1. Split lines; `stripped = stripControlSequences(line).trimStart()`.
  2. `learnIdx` = first stripped line (after removing a leading bullet `[-*•]\s+`) matching `/^learn\s*:\s*/i`. `explainIdx` = first line after it matching `/^explain:\s*/i`. Explanation exists only when both are found: text = (explain line minus label, then all raw later lines) joined with `\n`, trimmed; empty = `undefined`.
  3. `main lines` = lines before the explain line (or all if none), each `cleanOneLine(stripControlSequences(l))` (control chars removed, whitespace collapsed, trimmed) with leading bullet removed.
  4. `tagLine` = first main line matching `TAG_LABEL` (`tag` then `:` or `-/–/—`, tolerating leading `> * _ quotes backtick`); `tag = tagOf(tagLine minus label)`: `"Heads up"` if it matches `/^\W*heads[\s-]*up\W*$/i`, else `"You should know"`.
  5. For each main line matching `LEARN_LABEL`: `O` = text after label. If `isDeclined(openingOf(O))` (empty, or `/^none\s*(?:[.!?()[\]:;,-]|$)/i`) return `{kind:"none"}`. Continuation: append following lines (space-joined) until a blank line, another learn/tag line, or `O` already ends with `?` plus optional closing quote (`ENDS_WITH_QUESTION`). `S = unquoted(O)`. If `S` ends with an inline tag (`INLINE_TAG`: `. tag: Heads up` forms) strip it (`m`). `line = ENDS_A_SENTENCE(m) ? m : m+"."` (sentence end = `.!?…` + optional closers `"'“”‘’`). If no `tag:` line was found but an inline tag was, tag = `tagOf(inline)`. If `line.length <= 240` return `{kind:"line", line, tag, explanation}`; else try the next learn line.
  6. Otherwise `{kind:"unparsable"}` (telemetry `parse_failed`).
  `unquoted(s)`: trim, drop trailing periods, and if wrapped in one matching pair from `"" '' “” ‘’ ``` ` ``` ` with no inner closer, unwrap and drop trailing periods again.
  Basis: cited. Status: partial at 088a227c (baseline `parseReply` in `note.ts:67` holds the 240-character limit; its reply format and rules differ).
  Source: chunk-nvx1z6pc.js@26048 (2.1.327; first read in claude 2.1.326 binary; read: the `learn:`,`explain:`, and`tag:` matchers and the "Heads up" rule are there, relocated from chunk-jc1ynf6x.js@24500 of 2.1.325); plugins/claudetto-you-should-know/hooks/note.ts:67-74@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): parse.ts:15-135; rules.test.ts:90-154; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

- [x] **RT-011** `parseExplanation` turns the explanation into cards. For each line: `d = stripControlSequences(line).trimEnd()`. A line starting with a triple backtick toggles a code fence (the first fence of a card that already holds content flushes it when not already fenced); lines inside a fence go to `sketch` (max 12 lines, each cut to 120 code units, unwrapped). A title line (`/^(?:\*\*([^*]+)\*\*|#+\s*(.+))$/` on the trimmed line) flushes the current card and starts a new one with `title = cleanOneLine(match)` cut to 120. Other lines append (`"\n"+line`) to `lead` if the card has no sketch and no fence has been seen, else to `caption`. Flush: `lead` and `caption` = `truncateAtWordBoundary(proseOf(x), 4000)` where `proseOf` = each line `cleanOneLine`d, empty lines dropped, joined `\n`; truncation cuts to `n-1` code units at a word boundary (used if past half the width) and appends `…`. A card is kept if any of title, lead, sketch, or caption is non-empty. At most 4 cards.
  Basis: cited. Status: partial at 088a227c (baseline `parseCards` in `note.ts:126-175` has the same limits).
  Source: chunk-nvx1z6pc.js@25060 (claude 2.1.327 binary; read: fence toggle, sketch cap, title regex, lead and caption split, 4 cards); plugins/claudetto-you-should-know/hooks/note.ts:126-175@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): cards.ts:1-85; cards.test.ts, rules.test.ts:158-180; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

## Render of the Note

- [x] **RT-012** The `ui.render` (AbovePrompt) flow.

  ```text
  render(surface, props{isWorking, hasSurvey, isCollapsed, bodyColumns, maxRows, scroll.offset}):
    if surface==="terminal" && props.isWorking: for every idle clock: freeze {since} -> {ms: now - since}
    table = rowsTable(surface, ui.resolve(input)); renderedSurfaces.add(surface)
    row = rowOf(sessions, sid); view = row.view ?? null; tag = tagOf(row.tag)
    debug = switchOf(env DEBUG); optIn = (env USER_TYPE === "external"); checks = debug ? checksOf(row.checks) : []
    if view in {explaining, making} and sid not in explaining-set: clear view; return next(input)
    aboutOpen = (view is offer) ? state.aboutOpen(sid) : undefined
    // idle clock for auto-send: tracked only while the full closed offer is visible
    if !(surface==="terminal" && !hasSurvey && !isCollapsed && checks.length===0 && view.kind==="offer" && !view.isOffArmed
         && scroll.offset===0 && aboutOpen!==aboutKeyOf(view)
         && closedOfferRows({columns:bodyColumns, tag, line, labels:all 5 OFFER_LABELS}) <= maxRows)
         => idle.delete(sid)
    else if view.shownAt defined && !signal.aborted:
         prev = idle.get(sid); base = (prev.shownAt==view.shownAt && prev.line==view.line) ? prev.idle : {ms:0}
         idle.set(sid, {shownAt, line, idle: isWorking ? {ms: idleMs(base, now)} : {since: base.since ?? now}})
    if hasSurvey && view.kind!=="explained": return next(input)
    node = viewNode(view)       // below
    return (checks.length>0 && !hasSurvey) ? debugRows(checks, node) : (node ?? next(input))
    on any exception: idle.clear(); return undefined
  ```

  `isNoteRead(clock, view, now)` = view is an offer, not armed, clock has same `shownAt` and `line`, and idle time `>= 2000` ms (idle = `now - since` or stored `ms`).
  Basis: cited. Status: missing at 088a227c (baseline `ui.render` at `register.ts:217` draws the view and has no idle clock).
  Source: chunk-nvx1z6pc.js@81411-90078 (claude 2.1.327 binary); chunk-nvx1z6pc.js@30260 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/register.ts:217@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): render.ts:20-100; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

- [x] **RT-013** The Learn more fork `explainFlow(line, prev, iteration)`: add sid to `explaining`; set the `explaining` view; `K = model.fork({prompt: explainPrompt(line, prev)})` (errors -> undefined); `V = K.isAnswered ? K.text.trim() : ""`; outcome = answered ? (`parseExplanation(V).length===0` ? `"empty"` : `"shown"`) : `"fork"`; telemetry `you_should_know_explained{outcome, direction: prev?.direction ?? "first", latency_ms, usage}` + mark (`ok` iff shown). On shown: view `explained{text:V, iteration}`; on failure with a `prev`: fall back to the previous text; with no `prev`: view `failed{reason:"explain"}`. Always remove sid from `explaining`. In this version only `direction "first"` is reachable; the other directions (`simpler_words`, `less_detail`, `more_detail`) and their prompts exist in the module but no button calls them.
  Basis: cited. Status: missing at 088a227c (baseline has no fork; the `explained` view comes from the check reply).
  Source: chunk-nvx1z6pc.js@81411-90078 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/view.ts:65@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): view/actions.ts:127-141 matches; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

## Prompt Submit

- [x] **RT-014** The `prompt.submit` flow.

  ```text
  submit(input, next):
    now=S; snapshot = copy(idle)
    pending = undefined
    if isPersonsPrompt(origin.kind):
       clearOffLine(off, {isConfirmed: isOffCommand(input.text)})       // not awaited; see off cleanup
       try:
          surfaces = session.surfaces(); if surfaces.length>0:
             sid = session.id(); count = (promptsSince[sid]?.count ?? 0)+1; promptsSince[sid] = {origin, count}
             origin==="bridge" ? bridgeSessions.add(sid) : bridgeSessions.delete(sid)
             isTypedNotSlash = input.turnId===undefined && input.command===undefined
             fromTerminalComposer = origin==="composer" && surfaces.includes("terminal")
             text = input.text.trim(); lone = text.length===1 && /^\d$/.test(text.normalize("NFKC"))  // a single digit key
             if fromTerminalComposer && (lone || (isTypedNotSlash && idle.has(sid))) && switchOf(env AUTO_SEND) && !mayBeDriven():
                 view = row.view
                 if lone && isOpenView(view): autoSentKeys.add(aboutKeyOf(view))   // a digit press is a button press: never auto-send that offer
                 if isOpenView(view) && isNoteRead(snapshot[sid], view, now) && isNoteRead(idle[sid], view, now)
                    && !autoSentKeys.has(aboutKeyOf(view)) && !signal.aborted:
                      autoSentKeys.add(key); tag=tagOf(row.tag)
                      note = autoSentNote(respondDraft(view.line, [], tag))      // card-less draft
                      store sessions: clear view; pending={view, tag, note}; invalidate; markKnown(view.line)
       catch: ignore
    if !pending: return next(input)
    res = next({...input, context:[...(input.context ?? []), pending.note]})
    if res.drop===undefined: telemetry answered{answer:"auto_sent", ms_to_answer, turn_in_progress:false, offers_shown, line, tag, iteration}
    return res
  ```

  Meaning: with `CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND` on (the name is present in claude 2.1.326: `grep -c -a CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND ~/.local/share/claude/versions/2.1.326` printed 4), when the user typed their own message after reading the offer (offer fully visible and idle >= 2 s, twice) the offered topic is attached to that message as background `context` and the offer is dismissed as known.
  Basis: cited. Status: missing at 088a227c (baseline `prompt.submit` at `register.ts:187` counts typed-past prompts only).
  Source: chunk-nvx1z6pc.js@77760 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/register.ts:187@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): submit.ts:17-89 matches; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

- [x] **RT-015** Off cleanup `clearOffLine(isConfirmed)`: sid; if not confirmed remove sid from `confirmed`; if a clear for this sid is already running, await it; else `takeDown`: reread row; if its view is `off`: clear view, invalidate; if confirmed add sid to `confirmed`; the builtin's telemetry `answered{answer: off_confirmed|off_abandoned, ...}` is not sent (ADR-0115). `isOffCommand(text)`: split trimmed on whitespace to `[t,o,r]`; true iff `t==="/plugin" && o==="disable"` and (`"/plugin disable cc-plugin-you-should-know@builtin"` equals `t o r` or `r` is `cc-plugin-you-should-know`, `suggest-learning`, `you-should-know`, each also with `@builtin`); claudetto also accepts its own name `claudetto-you-should-know` (`OWN_NAMES`) and fills `/plugin disable claudetto-you-should-know` in the Disable flow (claudetto has its own plugin name).
  `command.run /plugin` -> `ranOffCommand`: `clearOffLine(confirmed:true)`; if sid not yet in `confirmed`: add and telemetry `answered{answer:"off_confirmed", off_via:"typed", version marks, offers_shown}` (no line/tag).
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-nvx1z6pc.js@77760 (claude 2.1.327 binary); chunk-nvx1z6pc.js@80011 (claude 2.1.327 binary).
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): off.ts OWN_NAMES and OFF_COMMAND; hooks/behaviour.test.ts:32-33; telemetry stated as not sent (ADR-0115); claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

- [x] **RT-016** Detach and end: `detach`: `renderedSurfaces` keeps only surfaces still reported by `session.surfaces()`. `end(sessionId)`: add to `ended`; remove from bridge set and idle map; reread row: if view is open -> clear view and telemetry `left_open{left_by:"session_end"}`; if view is `off` -> clear and telemetry `answered{answer:"off_abandoned", cleared_by:"session_end"}`. All errors swallowed; always `next`.
  Basis: cited. Status: partial at 088a227c.
  Source: chunk-nvx1z6pc.js@90111 (claude 2.1.327 binary); chunk-nvx1z6pc.js@90211 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/register.ts:202@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): session/hooks.ts:12-30; events.test.ts:90-116; checks.test.ts:98-132; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.

- [x] **RT-017** Dedup and known: `markKnown(line)` appends to `known` (case-insensitive exact dedupe, keep last 50). `thenAlways(a,b)` runs `b` (clear view) even when `a` throws. `lineKey` compares lowercase with one trailing `.` removed.
  Basis: cited. Status: have at 088a227c.
  Source: chunk-nvx1z6pc.js@25660 (claude 2.1.327 binary); plugins/claudetto-you-should-know/hooks/note.ts:237-250@088a227c.
  Verified: claude plugin test plugins/claudetto-you-should-know -> 134 pass, 0 fail; flow names found in hooks/*.ts (weak, name-level: the explain fork is `explain`, `thenAlways` is a try/finally) (2.1.327, 2026-11-19).
  Verified: re-verified 2026-11-19 (HEAD b5f6510b4): store.ts:11-18 markKnown; parse.ts lineKey/withKnown; view/actions.ts:43-49; claude 2.1.327 (~/.local/share/claude/versions/2.1.327), 2026-11-19 `plugin test plugins/claudetto-you-should-know`: 159 pass, 0 fail.
