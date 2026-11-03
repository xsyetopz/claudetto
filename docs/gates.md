# Tool Gates and Settings Read from the Program

Read on Claude Code `2.1.317`, from `LC_ALL=C strings -n 40` over `~/.local/share/claude/versions/2.1.317`. Minified names (`Zet`, `oV`) change at each version, so they name a place to search for and not a stable API. Nothing here was patched.

## Why `ListSkills` and `ListPlugins` Do Not Arrive

`SearchPlugins`, `SearchSkills`, `ListPlugins`, `ListSkills`, `SuggestPluginInstall`, and `SuggestSkills` are built with `isEnabled:Zet`. One gate covers all six:

```js
function Zet(){
let e=tP("allow_plugin_skill_search")
if(e==="org_denied"||e==="latched"||e==="unregistered"||e!==null&&Cs("hipaa"))return!1
if($Le())return!0
return Xp()&&Dn()&&o.read()}
```

- `$Le()` is `i.CLAUDE_CODE_REMOTE&&Dn()`.
- `Dn()` is `Ce()==="firstParty"`, true only for the first-party API provider.
- `Xp()` is `btn()&&!n().childSession`. `btn()` tests the entrypoint `CLAUDE_CODE_ENTRYPOINT` against `claude-desktop`, `claude-desktop-3p`, and `local-agent`.
- `tP(name)` returns `"unregistered"` when no policy verdict is loaded, so the gate is closed then.
- `o.read()` is a reader that another module registers. Its source was not read.

A user on a normal local login (entrypoint `cli`, `CLAUDE_CODE_REMOTE` unset) cannot receive these tools. The gate opens only on the first-party provider, with no policy denial of `allow_plugin_skill_search`, and with either `CLAUDE_CODE_REMOTE` set or one of the three entrypoints above with the reader true.

## Plan Mode: `ExitPlanMode`

`ExitPlanMode` has this `isEnabled`:

```js
isEnabled(){
if(ob().length>0&&ge())return!1
if(ge()&&!tfe(TC()))return!1
return!0}
```

`ge()` is true when the session is not interactive, `ob()` lists the allowed channels, and `TC()` is the permission prompt tool name. An interactive session skips both tests, so the tool is on. A non-interactive run turns it off when channels are allowed, or when no permission prompt tool is named. The enabling of `EnterPlanMode` was not re-read.

## Does `enabledPlugins: false` Stop a Built-in Plugin

Built-in plugins are registered by one function that calls `Yle("cc-plugin-<name>", ...)` for `sec-default`, `agents-md`, `telemetry`, `privacy`, `plugin-authoring`, `mods-guide`, `tips`, `mermaid`, `responsive-mode`, `diff`, `you-should-know`, `easel`, `claude-platform`, and `claude-test`. Some are conditional on the entrypoint or a flag: `plugin-authoring` and `you-should-know` skip `local-agent`, `responsive-mode` needs the `remote` entrypoint, and `easel` needs `remote_cowork`. The id is `cc-plugin-<name>@builtin`.

The enabled test is `oV()`:

```js
for(let[r,n]of vr().builtinPlugins){
if(!lct(r))continue
let s=`${r}@${Xs}`,p=CM(s).length>0,
i=n.enabledFromPolicyOnly?Tn(s)
:n.enabledFromTrustedSettingsOnly?V_r(s)
:!p?e?.enabledPlugins?.[s]:jOn(s),
a=i!==void 0?i===!0:n.defaultEnabled??!0
```

A built-in plugin has no other load path. Its `enabledPlugins` entry is read, `false` moves it to the disabled list, and the default is `defaultEnabled??true`.

Two exceptions. A plugin with `enabledFromPolicyOnly` reads only the policy settings and the flag settings. One with `enabledFromTrustedSettingsOnly` reads only a fixed list of trusted sources. In `2.1.317`, `cc-plugin-sec-default` carries both, so a user `false` for it does not decide it. `plugins/claudetto/src/builtins.ts` writes no `false` for it. The flags of the other built-ins were not all read.

`cc-plugin-you-should-know` declares `defaultEnabled:!1`, so `false` there restates the default. Whether every part of `cc-plugin-telemetry` stops when it is disabled was not read: the callers of the enabled list were not traced. A live check would put `"enabledPlugins": {"cc-plugin-telemetry@builtin": false}` in a settings file and run `/plugin`. It was not run.

## Can `tool.describe` Shrink a Tool Definition

Yes. The registered `tool.describe` hook is called by `resolveToolDescription`:

```js
resolveToolDescription:async(O,L,B)=>{
if(R.hasDescribed=!0,x(O.name))b.add(O.name)
let G=await(e.get()?.(O,L,B)??Promise.resolve({description:L,isDeferred:B}))
if(Ac(G.description)!==Ac(L))w.add(O.name)
return G}
```

The request builder sets `description` from that answer, in the tool object that carries `name`, `description`, and `input_schema`. So the hook changes the request body and not only the screen. A recorded description (`recordedEntry`, `recordedDescription`) is used in place of the new one when no hook rewrote the tool, which looks like a guard for a resumed request. It was not tested.

`plugins/claudetto/src/blocks/tool-describe/block.ts` registers one `tool.describe` hook for the names in `describedTools()` (`plugins/claudetto/src/blocks/tool-describe/tools.ts`), and `shorterText` keeps our text only when it is shorter.

Measured on `2.1.317` with `just capture` (dumps of the `plain` and the shipped `plugin` arm): the description of `Bash` is 1,934 characters in `plain` and 882 in `plugin`, `Read` 790 and 286, `Edit` 360 and 243, `ToolSearch` 953 and 234, and `Write` 240 and 196. The `plugin` arm also denies tools, so the `tools` total (29,512 and 7,245) is not the hook alone.

## Not Read

- The reader registered for the last term of `Zet`.
- What `ge()` returns for each launch.
- The enabling of `EnterPlanMode`.
- The flags of each built-in plugin other than `sec-default` and `you-should-know`, and each caller of the enabled list.
