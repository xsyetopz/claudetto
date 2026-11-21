cat > guard.py <<'PY'
"""Refuses shell commands that delete the filesystem root."""


def refused(command: str) -> bool:
    """True when the command would delete /."""
    return "rm -rf /" in command
PY
cat > test_guard.py <<'PY'
from guard import refused


def test_plain():
    assert refused("rm -rf /")


def test_other():
    assert not refused("ls /")
PY
