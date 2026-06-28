---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# Grill Me

Interview the user relentlessly about every aspect of their plan or design until reaching a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one by one.

## Rules

- Ask questions **one at a time** — never ask multiple questions at once
- For each question, provide your **own recommended answer** so the user can agree, refine, or push back
- If a question can be answered by exploring the codebase, **explore the codebase first** instead of asking
- Follow each answer to its logical next sub-question before moving to a sibling branch
- Keep going until all branches of the decision tree are resolved

## Process

1. Ask the user to describe their plan or design (if not already provided)
2. Identify the top-level decision points
3. Pick the most critical or foundational decision first
4. For each decision point:
   - Ask one focused question
   - Provide your recommended answer with brief reasoning
   - Wait for the user's response
   - If the answer opens sub-questions, resolve those before moving on
5. Continue until no unresolved branches remain
6. Summarize the agreed-upon design

## Goal

Reach a state where both the agent and the user could independently describe the plan the same way, with no ambiguity left unresolved.
