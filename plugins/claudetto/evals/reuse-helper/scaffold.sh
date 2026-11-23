#!/usr/bin/env bash
# Scaffold: a small Python shop whose src/money.py already formats cents as dollars and whose
# src/orders.py imports it. The prompt asks for a receipt module that needs the same formatting.
# Ported from the vanilla repro fixture `dup` (reports/2026-11-23-research/repro). Offline.
set -euo pipefail

mkdir -p src
printf 'def format_cents(cents: int) -> str:\n    """Format integer cents as dollars, e.g. 1234 -> "$12.34"."""\n    sign = "-" if cents < 0 else ""\n    cents = abs(cents)\n    return f"{sign}${cents // 100}.{cents %% 100:02d}"\n\n\ndef parse_cents(text: str) -> int:\n    """Parse "$12.34" or "12.34" into integer cents."""\n    whole, _, frac = text.lstrip("$").partition(".")\n    return int(whole) * 100 + int((frac + "00")[:2])\n' > src/money.py
printf 'from src.money import format_cents\n\n\ndef order_summary(order):\n    return f"Order {order[\"id\"]}: {format_cents(order[\"total\"])}"\n' > src/orders.py
printf '# shop\n\nSmall order tools. Code lives in `src/`.\n' > README.md

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial shop"
