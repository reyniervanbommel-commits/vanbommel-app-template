---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# Grill Me

Interview the user relentlessly about every aspect of their plan or design until reaching a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one by one.

## Rules

- If a question can be answered by exploring the codebase, **explore the codebase first** instead of asking
- Ask with **clickable options** via the `AskQuestion` tool (Cursor). Never only a free-text question in chat when 2+ clear options exist
- First option = your recommended answer; the option **label** ends with `(Aanbevolen)`
- Put a one-line rationale in the question `prompt`
- Independent unanswered questions: **one AskQuestion form with multiple questions** so the user can click all answers in one go
- Dependent follow-ups: wait for the answer, then a new AskQuestion
- `allow_multiple: true` only when several answers can apply at once
- If `AskQuestion` is unavailable (Claude Code / other runtime): numbered options A/B/C in chat, recommended marked, still wait for a choice
- Follow each answer to its logical next sub-question before moving to a sibling branch
- Keep going until all branches of the decision tree are resolved

## Process

1. Ask the user to describe their plan or design (if not already provided)
2. Identify the top-level decision points
3. Pick the most critical or foundational decision first (or batch independent ones in one form)
4. For each decision point:
   - Ask via `AskQuestion` with 2–5 concrete options
   - Mark the recommended option `(Aanbevolen)`
   - Wait for the user's click / response
   - If the answer opens sub-questions, resolve those before moving on
5. Continue until no unresolved branches remain
6. Summarize the agreed-upon design

## Goal

Reach a state where both the agent and the user could independently describe the plan the same way, with no ambiguity left unresolved.
