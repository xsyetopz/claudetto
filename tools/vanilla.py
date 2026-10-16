#!/usr/bin/env python3
"""Turn the Claude Code config into a modified vanilla install with OpenSpec.

Run: python3 -I tools/vanilla.py [PROJECT]
The config folder is `$CLAUDE_CONFIG_DIR`, or `~/.claude`.
PROJECT is the folder for `openspec init` (default: the current folder).
macOS and Linux only.
The evidence for each value is in `external/cc-2.1.299/notes/`.
"""

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

OPENSPEC = "@fission-ai/openspec@1.14.1"

# The built-in plugins that replace the dcc-* plugins.
BUILTIN_ON = ["cc-plugin-agents-md@builtin", "cc-plugin-you-should-know@builtin"]

# config-compaction.md: trigger = 150000 - 20000 - 13000 = 117000 tokens.
ENV_SET = {
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "150000",
    "CLAUDE_CODE_MAX_CONTEXT_TOKENS": "150000",
}
ENV_DROP = ["DISABLE_COMPACT", "DISABLE_AUTO_COMPACT"]

# command-tiers.md: hosts that the sandbox blocked for pass-tier commands.
NETWORK_ADD = ["api.anthropic.com", "code.claude.com"]

# command-tiers.md: `swift` applies its own `sandbox-exec`, which fails in the sandbox.
EXCLUDED_ADD = ["swift package *", "swift test *"]

# command-tiers.md: `bun install` fails with EPERM when it cannot write its cache.
WRITE_ADD = ["~/.bun/install/cache"]

CLAUDE_MD = """\
<scope>
Do what the request asks, all of it, and nothing more.
A question gets an answer, then stop.
Do not add a file, a feature, a script, a fallback, or a safety net that the user did not ask for.
When an extra would help, name it at the end of the reply.
</scope>

<decisions>
Settle what the code, the docs, or a check can settle, and state the assumption.
Ask the user only for a choice that is theirs, or before an action that is hard to undo or that other people see.
</decisions>

<verification>
Call a part done only after a check of it ran in this session, and show the command and its result.
</verification>
"""


def config_dir() -> Path:
    return Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude")


def add_unique(items: list, new: list) -> list:
    return items + [item for item in new if item not in items]


def apply(settings: dict) -> list[str]:
    changes = []

    plugins = settings.setdefault("enabledPlugins", {})
    for name in sorted(plugins):
        if name.endswith("@claudetto") and plugins[name]:
            plugins[name] = False
            changes.append(f"enabledPlugins.{name} = false")
    for name in BUILTIN_ON:
        if plugins.get(name) is not True:
            plugins[name] = True
            changes.append(f"enabledPlugins.{name} = true")

    if settings.get("outputStyle") != "Concise":
        settings["outputStyle"] = "Concise"
        changes.append("outputStyle = Concise")

    env = settings.setdefault("env", {})
    for key in ENV_DROP:
        if env.pop(key, None) is not None:
            changes.append(f"env.{key} removed")
    for key, value in ENV_SET.items():
        if env.get(key) != value:
            env[key] = value
            changes.append(f"env.{key} = {value}")

    if settings.get("autoCompactEnabled") is not True:
        settings["autoCompactEnabled"] = True
        changes.append("autoCompactEnabled = true")

    sandbox = settings.setdefault("sandbox", {})
    network = sandbox.setdefault("network", {})
    domains = network.get("allowedDomains", [])
    network["allowedDomains"] = add_unique(domains, NETWORK_ADD)
    if network["allowedDomains"] != domains:
        changes.append("sandbox.network.allowedDomains += " + ", ".join(NETWORK_ADD))
    excluded = sandbox.get("excludedCommands", [])
    sandbox["excludedCommands"] = add_unique(excluded, EXCLUDED_ADD)
    if sandbox["excludedCommands"] != excluded:
        changes.append("sandbox.excludedCommands += " + ", ".join(EXCLUDED_ADD))
    filesystem = sandbox.setdefault("filesystem", {})
    writable = filesystem.get("allowWrite", [])
    filesystem["allowWrite"] = add_unique(writable, WRITE_ADD)
    if filesystem["allowWrite"] != writable:
        changes.append("sandbox.filesystem.allowWrite += " + ", ".join(WRITE_ADD))

    return changes


def write_settings(folder: Path) -> None:
    path = folder / "settings.json"
    settings = json.loads(path.read_text()) if path.exists() else {}
    changes = apply(settings)
    if not changes:
        print(f"{path}: no change")
        return
    if path.exists():
        backup = path.with_name(f"settings.json.bak-{time.strftime('%Y%m%dT%H%M%S')}")
        shutil.copy2(path, backup)
        print(f"backup: {backup}")
    path.write_text(json.dumps(settings, indent=2, ensure_ascii=False) + "\n")
    for change in changes:
        print(f"{path}: {change}")


def write_claude_md(folder: Path) -> None:
    path = folder / "CLAUDE.md"
    if path.exists():
        print(f"{path}: exists, not changed")
        return
    path.write_text(CLAUDE_MD)
    print(f"{path}: written")


def run(command: list[str], cwd: Path | None = None) -> None:
    print("$ " + " ".join(command), flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def install_openspec(project: Path) -> None:
    if shutil.which("openspec") is None:
        run(["npm", "install", "-g", OPENSPEC])
    if (project / "openspec").exists():
        print(f"{project / 'openspec'}: exists, init skipped")
        return
    run(["openspec", "init", "--tools", "claude", "--no-animation", str(project)])


def main() -> int:
    if sys.platform not in ("darwin", "linux"):
        print("macOS and Linux only", file=sys.stderr)
        return 1
    project = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    folder = config_dir()
    folder.mkdir(parents=True, exist_ok=True)
    write_settings(folder)
    write_claude_md(folder)
    install_openspec(project)
    return 0


if __name__ == "__main__":
    sys.exit(main())
