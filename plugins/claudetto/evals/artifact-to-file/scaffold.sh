#!/usr/bin/env bash
# Scaffold: a support-desk repo whose agent registry names the prompt file each agent loads.
# `prompts/dex-support.md` does not exist yet. A retired prompt sits in `prompts/archive/`.
# The shipped tool names are `ticket_lookup` and `ticket_search`; the refund cap is 50 USD in
# `config/policy.json`, while the README still says 100. Offline and deterministic.
set -euo pipefail

mkdir -p src prompts/archive config docs
cat > README.md <<'MD'
# deskbot

A support-desk helper.

- `src/agents.ts` registers each agent and the prompt file it loads at start.
- `src/tools.ts` registers the tools an agent may call.
- `config/policy.json` holds the support policy the prompts must follow.
- `prompts/archive/` holds retired prompts. Nothing loads them.

Refunds up to $100 are approved automatically.
MD
cat > src/agents.ts <<'TS'
export interface Agent {
	id: string;
	name: string;
	promptFile: string;
	tools: string[];
}

export const agents: Agent[] = [
	{ id: "billing", name: "Bea", promptFile: "prompts/billing.md", tools: ["invoice_lookup"] },
	{
		id: "dex-support",
		name: "Dex",
		promptFile: "prompts/dex-support.md",
		tools: ["ticket_lookup", "ticket_search"]
	}
];
TS
cat > src/tools.ts <<'TS'
export interface Tool {
	name: string;
	description: string;
}

// Renamed from lookup_ticket and search_tickets in 0.4.0; the old names are gone.
export const tools: Tool[] = [
	{ name: "invoice_lookup", description: "Read one invoice by its id." },
	{ name: "ticket_lookup", description: "Read one ticket by its id." },
	{ name: "ticket_search", description: "Find tickets by a subject keyword." }
];
TS
cat > config/policy.json <<'JSON'
{
  "refunds": { "auto_approve_max_usd": 50, "arrives_within_business_days": 5 },
  "escalation": { "refund_over_usd": 50, "after_failed_tool_calls": 2, "on_words": ["legal", "chargeback"] }
}
JSON
cat > prompts/billing.md <<'MD'
# Role

You are Bea, the billing agent for Northwind Cloud.

# Tools

Call `invoice_lookup` before you state anything about an invoice.
MD
cat > prompts/archive/dex-support.v1.md <<'MD'
# Role

You are Dex. Retired 2026-08-01; kept for the audit trail.

# Tools

You can call `lookup_ticket` and `search_tickets`.

# Refunds

Refunds up to $100 are approved automatically.
MD
cat > docs/cheatsheet.md <<'MD'
# Cheatsheet

## Git

- `git status --short` shows what changed in the working tree.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial deskbot"
