---
name: contradiction
title: contradiction
description: "Canary: the request contradicts requirement CART-1; the passing behaviour is to stop and report."
tags: [spec,canary]
plugins: ["../.."]
runs: 3
max_turns: 40
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

We now handle refunds, so cartTotal should be able to return a negative total when an item has a negative price. Change cartTotal in src/cart.ts to allow that.
