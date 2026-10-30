# Tool Gates and Settings Read from the Program

Read on 2026-10-27 from Claude Code `2.1.311` at `/Users/krystian/.local/share/claude/versions/2.1.311`, unless a line names another source. Reading the program for evidence is allowed by `AGENTS.md`. Nothing here was patched.

## How the Program Was Read

`/Users/krystian/.local/share/claude/versions/2.1.311` is one Mach-O executable of about 276 MB, not a folder of chunks. The JavaScript modules sit inside it under virtual paths such as `/$bunfs/root/chunk-n4qjzmdc.js`. Each module starts with a `// Version: 2.1.311` line and ends with an `export{...}` line. A module name below is the one that another module imports it by. The byte offset is from `grep -a -b -o -F <literal>` on the executable, with `LC_ALL=C`. The text at an offset was cut out with `dd` and shown with non-printable bytes as `?`.

Minified code below has its semicolons written as line breaks, because the project forbids semicolons in prose. Nothing else was changed.

The parent's premise that nothing gates `ListSkills` and `ListPlugins` did not hold when read. See the next section.

## Why `ListSkills` and `ListPlugins` Never Arrive

The four names are one array in `chunk-ge043zr7.js`, byte offset 226157417:

```text
V7n=["SearchPlugins","SearchSkills","ListPlugins","ListSkills"]
```

The registry entry may read `when: []`, but the tool object itself carries a gate. The shared factory for the two `List` tools has `isEnabled:$Xe` (offset 243143002, text `shouldDefer:!0,...,isEnabled:$Xe,isConcurrencySafe:()=>!0`). `ListPlugins` is built by that factory as `oe({name:v2r,...})` (offset 243143616) and `ListSkills` as `oe({name:EXs,...})` (offset 243144944). The `Search` factory also has `isEnabled:$Xe` (offset 243154684), and so do `SuggestPluginInstall` (offset 243150311) and `SuggestSkills` (offset 243152425). All six tools share one gate, not two.

The gate is in `chunk-n4qjzmdc.js`, offset 243130767, exported as `isPluginSkillToolEnabled` (`$Xe`) and `isPluginSkillToolAdvertised` (`$Hi`):

```js
function $Xe(){
let e=WR("allow_plugin_skill_search")
if(e==="org_denied"||e==="latched"||e==="unregistered"||e!==null&&Bs("hipaa"))return!1
if(i0e())return!0
return kp()&&Un()&&o.read()}
function $Hi(e){
if(!V7n.includes(e))return!0
return $Xe()}
```

The pieces, each read in its own module:

- `i0e()` is `function i0e(){return i.CLAUDE_CODE_REMOTE&&Un()}` (offset 243129831). `i` is read here as the environment object, which was not confirmed.
- `Un()` of this module is `function Un(){return Ce()==="firstParty"}` (offset 217490953). It is true only for the first-party API provider.
- `kp()` is `function kp(){return Teo()&&!n().childSession}` (offset 217738367), and `Teo()` is `let e=xg()` followed by `return e!==void 0&&r.has(e)` (offset 217734214). In the same module, `var r=new Set(["claude-desktop","claude-desktop-3p","local-agent"])`. So `kp()` is true for a session whose entrypoint is one of those three names, and which is not a child session. What `xg()` returns was not read. It is read here as the entrypoint, because `n6()` beside it compares `CLAUDE_CODE_ENTRYPOINT` to string names.
- `o.read()` is `this.reader?.()??!1`, and `o` is filled by `Zvo`, exported as `_registerSuggestRolloutPinReader`. The reader that is registered was not read.
- `WR(e)` is `let r=t().verdict`, then `if(!r)return"unregistered"`, then `return r.policyDenyKind(e)` (offset 218735479). With no policy verdict loaded, it returns `"unregistered"` and the gate is closed.

Where `$Hi` is used: `chunk-af4pmxfv.js` imports it, and a coordinator-mode tool list calls it as `function C(t)` with the body `return r(t)`, where `r` is `isPluginSkillToolAdvertised` required from `/$bunfs/root/chunk-af4pmxfv.js` (offset 226378519). `V7n` is also spread into the worker tool set `X(e)` at offset 226172805. The list that the main loop sends was not traced to a call of `isEnabled`, but `$Xe` is the `isEnabled` of each of the six tools.

Answer in one sentence: a user on a normal local CLI login (entrypoint `cli`, `CLAUDE_CODE_REMOTE` unset) cannot receive `ListSkills` or `ListPlugins`, and the gate opens only when the provider is first-party, no policy denies `allow_plugin_skill_search`, and either `CLAUDE_CODE_REMOTE` is set, or the entrypoint is `claude-desktop`, `claude-desktop-3p`, or `local-agent` with the rollout pin reader true.

## Plan Mode: `EnterPlanMode` and `ExitPlanMode`

`EnterPlanMode` has `isEnabled(){return c8.isEnabled()}` at offset 235199938. In that module `c8` is imported as `import{c8}from"/$bunfs/root/chunk-6mmetas6.js"`. The module that exports `c8` ends in `export{VPs,XUn,KPs,JUn,c8}` and declares it at offset 234816030:

```js
var c8=nn({name:uc,searchHint:"present plan for approval and start coding (plan mode only)",...
shouldDefer:!0,
isEnabled(){
if(pS().length>0&&_e())return!1
if(_e()&&!Dde(Ok()))return!1
return!0},
```

So `c8` is the `ExitPlanMode` tool (`uc="ExitPlanMode"`, offset 221767227), and `EnterPlanMode` is enabled exactly when `ExitPlanMode` is enabled. This is the body the parent already had for `ExitPlanMode`.

The three helpers:

- `_e()` is `function _e(){return!n().host.launchOptions.isInteractive()}` (offset 217080505). It is true when the session is not interactive.
- `pS()` is `n().host.extensionsConfig.allowedChannels()` (offset 217106860).
- `Ok()` is `n().host.launchOptions.permissionPromptToolName()` (offset 217081612).
- `Dde(e)` is `function Dde(e){return e!==void 0&&e!=="none"}` (offset 226627654). It sits in the module that also holds `MCe`, with no module boundary between them.

For an interactive session `_e()` is false, so both `if` tests are skipped and `isEnabled()` returns true. Plan mode is on for a normal interactive CLI session, by this code. What `isInteractive()` returns for a given launch was not read. Not run: a live session.

For a non-interactive run the tool is off when channels are allowed, or when no permission prompt tool is named.

## Does `enabledPlugins: false` Stop a Built-in Plugin

The literal `enabledPlugins` appears 230 times in the executable. That count is from `grep -a -b -o -F enabledPlugins`. Not every site was read. The sites below were read, and they settle the question for the load path.

Built-in plugins are registered by `Rge()` in `chunk-p9mh7rh2.js` (offset 236096649). It calls `$pe("cc-plugin-<name>", ...)` for `sec-default`, `agents-md`, `telemetry`, `plugin-authoring`, `mods-guide`, `tips`, `mermaid`, `responsive-mode`, `diff`, `you-should-know`, `easel`, `claude-platform`, and `claude-test`. Some are conditional on the entrypoint. `you-should-know` is skipped only when `CLAUDE_CODE_ENTRYPOINT==="local-agent"`. `telemetry` is registered with no condition. The suffix is `Ls="builtin"` (offset 217819587), so the id is `cc-plugin-telemetry@builtin`.

The enabled test is `lz()` in the same module family as `$pe` (offset 218814845 for `$pe`, 218815870 for `lz`):

```js
function lz(){
let e=yr(),o=[],t=[]
for(let[r,n]of gr().builtinPlugins){
if(!pot(r))continue
let s=`${r}@${Ls}`,p=nO(s).length>0,
i=n.enabledFromPolicyOnly?Nn(s)
:n.enabledFromTrustedSettingsOnly?air(s)
:!p?e?.enabledPlugins?.[s]:jwn(s),
a=i!==void 0?i===!0:n.defaultEnabled??!0
...enabled:a,isBuiltin:!0...
if(a)o.push(f)
else t.push(f)}
return{enabled:o,disabled:t}}
```

So a built-in plugin does not load by another path. Its `enabledPlugins` entry in settings is read, and `false` moves the plugin to the `disabled` list. The default is `defaultEnabled??true`. `jwn(e)` (offset 218816829) walks the settings sources and reads `PX(fe(r)?.enabledPlugins,e)`. `PX` also maps short aliases, so the key can be written under an alias that `nO` knows.

Two exceptions exist in the code. A plugin with `enabledFromPolicyOnly` reads only the policy settings and the flag settings (`Nn`), and one with `enabledFromTrustedSettingsOnly` reads only a fixed list of trusted sources (`air`). Only `cc-plugin-sec-default` was seen with both flags (offset 256774428, text `enabledFromTrustedSettingsOnly:!0,enabledFromPolicyOnly:!0`). A user `false` for `cc-plugin-sec-default@builtin` is therefore not what decides it. The flags of the other built-ins were not all read. `cc-plugin-telemetry` at offset 256800851 showed `name`, `description`, and `isAvailable:F` (`F=()=>!k_()`), and no policy flag in the text read.

For the key in the task, `"cc-plugin-you-should-know@builtin": false`:

- The `you-should-know` module (`chunk-mf7ejead.js`, offset 256663880) shows that its `defaultEnabled` is `false`. Its tip is relevant only when `aC(jve)?.defaultEnabled===!1&&jwn("cc-plugin-you-should-know@builtin")===void 0`, and it tells the user to run `/plugin enable cc-plugin-you-should-know@builtin`.
- So `false` there only restates the default, and it also stops the tip, since `jwn(...)` is then not `undefined`.

For `cc-plugin-telemetry@builtin`, `false` makes `lz()` return it as disabled, by the code read. What was not read is each caller of `lz().enabled`, so whether every part of the telemetry plugin stops (its hooks module, `Xj(r,n.hooksModule)`) was not confirmed from code.

The one experiment that would settle the rest: put `"enabledPlugins": {"cc-plugin-telemetry@builtin": false}` in a settings file, start a session, and run `/plugin` to see whether the entry is listed as disabled. Not run.

## Can `tool.describe` Shrink a Tool Definition

Docs, route `extend/mod-api/tool-command-config`: the row for `tool.describe` reads "Fires when the engine first renders the tool's schema in a session. `next(e)` resolves to `{ description, isDeferred? }`." and "The answer is cached until `$.ui.invalidate("tool.describe")`."

Docs, route `extend/mod-api/types/tool-command-config`: `ToolDescribeInput` is "one tool's description, at the moment the engine first renders the tool's schema for the model." `ToolDeferral` says `true` puts the tool "behind ToolSearch" and `false` "in the prompt's list".

The docs say "for the model", but they do not say the string is the one in the request body. The code does.

Code, the request builder at offset 228063256 (inside the module that holds `zxi`):

```js
Fo=e.isMcp?Ro:oHe(Ro,n.querySource),uo=n.enginePlacement==="deferred",
No=n.withoutToolDescribeHooks?{description:Fo,isDeferred:uo}:await zxi(e,Fo,uo)
...
xo={name:e.name,description:No.description,input_schema:ho}
```

And `zxi` is `resolveToolDescription`, which calls the registered resolver (offset 220613421):

```js
resolveToolDescription:async(P,D,F)=>{
if(A.hasDescribed=!0,x(P.name))b.add(P.name)
let j=await(e.get()?.(P,D,F)??Promise.resolve({description:D,isDeferred:F}))
if(hp(j.description)!==hp(D))w.add(P.name)
return j}
```

The resolver is `O7n` (offset 226636547). It runs the `tool.describe` hook and returns `{description:h.description,isDeferred:y}`. It also logs an error if the built-in `sec-default` plugin changed a tool.

The object that is sent is then built at offset 228063256 plus about 800 bytes:

```js
dn={name:xo.name,
description:io?xo.description:vn?.description??n.recordedDescription??xo.description,
input_schema:fn?vn.input_schema:xo.input_schema,...}
```

where `io=n.isRedescribed===!0&&jxi(e.name)` and `jxi` is `isRewrittenByHook`.

What the code shows: the hook's `description` becomes `xo.description`, and `xo` is the base of the tool object that has `name`, `description`, `input_schema`, `defer_loading`, and `cache_control`. That is the Messages API tool shape. So the hook changes what the request carries, not only what the user sees. One condition: when a recorded entry (`vn`) or `n.recordedDescription` exists and the tool was not redescribed after a hook rewrote it, the recorded description is used in place of the new one. That looks like a guard for prompt-cache stability on resumed or recorded requests. It was not tested.

This fits the project's own use. `plugins/claudetto/src/register.ts:200` registers one `tool.describe` hook for the names in `describedTools()` (`plugins/claudetto/src/tools/tools.ts:82`), and the hook keeps our text only when `shorterText` (`plugins/claudetto/src/tools/tools.ts:88`) finds it shorter. The pre-restart plugin registered a second hook for `AskUserQuestion`; the new tree has none. `docs/levers.md` states that the handler uses our text only when it is shorter. So a built-in definition can shrink through this hook, by the code read.

The measurement that would confirm it was run on 2026-10-28 in the new tree, with `just capture --deny Workflow,ScheduleWakeup,ReportFindings --tools 12`: the `plain` arm carries the harness's `Bash` description at 1,267 characters and the `plugin` arm carries ours at 1,090, and the same holds for `Agent` (2,906 to 868), `Read` (790 to 538), `Skill` (1,417 to 1,023), and `ToolSearch` (953 to 727). The first request falls from 30,521 to 27,403 characters, all of it in `tools`, 16,021 to 12,903. So the hook changes the request body on the wire, not only the screen, and the code read above is confirmed by a reading (`docs/surfaces.md`, "The Tool Texts of the New Tree (Task 2.6)"). The conclusion is what stands here; the figures are of that date and the `Agent` text has been edited twice since, so a re-run of the same command on 2026-10-29 reads `Agent` at 973 and `tools` at 13,009.

## Not Read

- The 230 `enabledPlugins` sites: only the ones in `lz()`, `jwn`, `air`, `Nn`, the `Rge()` neighbours, and the settings key list near offset 94595896 and 217609778 were read.
- What `xg()` returns, and what `isInteractive()` returns for each launch. I saw it only through its use sites and did not open its definition.
- The reader registered through `_registerSuggestRolloutPinReader`, so the last term of `$Xe` is unknown.
- The caller that turns the six tools' `isEnabled` into the list sent to the API. The gate itself and the coordinator use of `$Hi` were read.
- The flags of each built-in plugin other than `sec-default`, `you-should-know`, and `telemetry`, and each caller of `lz().enabled`.
- Whether the recorded-description guard of offset 228063256 keeps an older text on a resumed or recorded request. The `tool.describe` effect on a fresh request is no longer code-only: it was captured on 2026-10-28, in the section above.
- The kept bundle `external/cc-bundle/2.1.310/`. It was listed and not searched, since the installed `2.1.311` executable held every site.
- The first background search with `grep -E '.{300}ListSkills.{300}'` over the executable ran past the 120 second limit and was dropped. A UTF-8 locale error also stopped `tr` once, which `LC_ALL=C` fixed.
