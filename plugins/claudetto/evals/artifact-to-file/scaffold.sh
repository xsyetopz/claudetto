#!/usr/bin/env bash
# Scaffold: a support-desk repo whose agent registry computes the prompt file each agent loads.
# Dex's file is `prompts/live/dex.system.md`: no file spells that path, it does not exist yet, and
# the README names `prompts/dex-support.md` instead. A retired prompt sits in `prompts/archive/`.
# The shipped tool names are `ticket_lookup` and `ticket_search`, built in `src/tools.ts` as
# `<group>_<verb>`; `docs/tools.md` lists dotted names nothing ships. The refund cap in effect is
# 75 USD: `src/policy.ts` layers `config/policy.2026-10.json` (75) over `config/policy.json` (50)
# and does not load `config/policy.2027-01.json` (100), which is the number the README gives.
# Offline and deterministic.
set -euo pipefail

mkdir -p src prompts/archive prompts/live config docs
cat > README.md <<'MD'
# deskbot

A support-desk helper.

- `src/agents.ts` registers each agent and the prompt file it loads at start.
- `src/tools.ts` registers the tools an agent may call; `docs/tools.md` lists them.
- `src/policy.ts` loads the support policy the prompts must follow from `config/`.
- `prompts/archive/` holds retired prompts. Nothing loads them.

Bea loads `prompts/billing.md` and Dex loads `prompts/dex-support.md`. Refunds up to $100 are approved automatically.
MD
cat > src/agents.ts <<'TS'
import { type Tool, toolsFor } from "./tools";

export interface Agent {
	id: string;
	name: string;
	promptFile: string;
	tools: Tool[];
}

const PROMPT_DIR = "prompts/live";

function agent(id: string, name: string, toolGroup: Parameters<typeof toolsFor>[0]): Agent {
	return { id, name, promptFile: `${PROMPT_DIR}/${id}.system.md`, tools: toolsFor(toolGroup) };
}

export const agents: Agent[] = [agent("billing", "Bea", "invoice"), agent("dex", "Dex", "ticket")];
TS
cat > src/tools.ts <<'TS'
export interface Tool {
	name: string;
	description: string;
}

const VERBS = {
	invoice: { lookup: "Read one invoice by its id." },
	ticket: {
		lookup: "Read one ticket by its id.",
		search: "Find tickets by a subject keyword."
	}
} as const;

export function toolsFor(group: keyof typeof VERBS): Tool[] {
	return Object.entries(VERBS[group]).map(([verb, description]) => ({
		name: `${group}_${verb}`,
		description
	}));
}
TS
cat > src/policy.ts <<'TS'
import autumn from "../config/policy.2026-10.json";
import base from "../config/policy.json";

// A later layer wins, key by key.
const layers = [base, autumn];

export const policy = {
	refunds: Object.assign({}, ...layers.map((layer) => layer.refunds)),
	escalation: Object.assign({}, ...layers.map((layer) => layer.escalation))
};
TS
cat > config/policy.json <<'JSON'
{
  "refunds": { "auto_approve_max_usd": 50, "arrives_within_business_days": 5 },
  "escalation": { "refund_over_usd": 50, "after_failed_tool_calls": 2, "on_words": ["legal", "chargeback"] }
}
JSON
cat > config/policy.2026-10.json <<'JSON'
{
  "refunds": { "auto_approve_max_usd": 75 },
  "escalation": { "refund_over_usd": 75 }
}
JSON
cat > config/policy.2027-01.json <<'JSON'
{
  "refunds": { "auto_approve_max_usd": 100 },
  "escalation": { "refund_over_usd": 100 }
}
JSON
cat > docs/tools.md <<'MD'
# Tools

| Tool | What it does |
| --- | --- |
| `invoices.lookup` | Read one invoice by its id. |
| `tickets.lookup` | Read one ticket by its id. |
| `tickets.search` | Find tickets by a subject keyword. |
MD
cat > prompts/live/billing.system.md <<'MD'
# Role

You are Bea, the billing agent for Northwind Cloud.

# Tools

Call the invoice tool before you state anything about an invoice.
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
