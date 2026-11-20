---
name: trivial-rename
title: trivial-rename
description: "Negative twin: a local variable rename adds no behaviour."
tags: [spec,trivial]
plugins: ["../.."]
runs: 3
max_turns: 40
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

In src/cart.ts, rename the local variable `acc` inside cartTotal to `subtotal`. Nothing else should change.
