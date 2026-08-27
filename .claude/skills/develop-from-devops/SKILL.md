---
name: develop-from-devops
description: >-
  Use when implementing a feature from a plan or work item — any repo, Cursor or
  Claude Code. Triggers: "pak feature op", "ontwikkel", "develop-from-devops",
  "start met #21", "bouw deze feature", "push feature to url", "test in de
  browser". OTAP (preview, never-ask, always-push) only when this repo has that
  street; otherwise local build and ask before push.
---

# Develop from DevOps

Bouw een feature vanaf plan of work item.

**Twee paden — kies in Stap 0, zeg het hardop.**

| Pad | Wanneer | Git / vragen |
|-----|---------|----------------|
| **`otap`** | Work item + `preview.yml` (of start met `#id` in een OTAP-repo) | Geen vragen; commit+push+preview zelf |
| **`local`** | Geen preview-straat / geen work item | Localhost; **vraag vóór** commit/push |

`otap` overschrijft local-first. `local` volgt local-first.

**Niet** `grill-me` / `brainstorming` tijdens bouwen. Geen plan → `writing-plans`
(otap: zonder vragen) of `brd-td-feature-design` (local).

## Andere skills

| Skill | Wanneer |
|-------|---------|
| `writing-plans` | Geen plan |
| `subagent-driven-development` of `executing-plans` | Implementatie |
| `final-check-feature` | Ná code: UI/perf/security/browser-review + grootte/tests |
| `ui-design-review` | UI-diff; via `final-check-feature` of `/check-ui` |
| `browser-feature-test` | Browser-test; via `final-check-feature` |
| `create-adr` | Architectuurkeuze (otap full: automatisch; local: vragen) |

## Stap 0 — Detectie

- Azure DevOps MCP + work item in de prompt + `.github/workflows/preview.yml` → **otap**
- Anders → **local**
- In **local**: `preview`-modus overslaan; `test` tegen localhost.

## Modi (prompt)

| Modus | Trigger | Stappen |
|-------|---------|---------|
| **`build`** (default) | ontwikkel, bouw, pak feature op | 1–6 |
| **`full`** | full flow, tot PR | 1–10 |
| **`preview`** | push feature to url | 3 + 6 (alleen otap) |
| **`test`** | test in de browser | 7 |

## Kernprincipe

**otap:** geen vragen; aannames documenteren; commit+push+preview zelf.
Stop bij MCP-fout, git-conflict, preview 2× stuk.

**local:** vragen bij push. Na code: hoe lokaal te testen. Geen stille `git push`.

---

# Pad OTAP

Alleen dit pad als Stap 0 = otap. Concrete Azure-namen: uit
`.github/workflows/preview.yml` en `docs/guides/AZURE_INRICHTING_OTAP.md` —
niet verzinnen. Volledige commando’s: [reference.md](reference.md).

## Na stap 5 (verplicht)

Commit → push → `gh run watch` → preview-URL in chat + op het work item.
Geen “wil je pushen?”.

```markdown
## Test op preview
**URL:** https://<fqdn>
**Branch:** `feature/<id>-<naam>`
**Commit:** `<hash>`
```

1. **Work item** — ophalen, Feature + Stories → Active  
2. **Worktree** — `feature/<id>-<naam>`, startcomment  
3. **Plan** — `dev_*` of `writing-plans` zonder vragen  
4. **Code** — `subagent-driven-development`; migraties volgens *deze* repo  
5. **Preview** — push; URL; DevOps-comment; URL in chat  
6. **full:** `final-check-feature` (die `ui-design-review`, `perf-review`, `security-review`,
   `browser-feature-test` aanroept), team (`.claude/team/`
   of vier lenzen), blockers, PR naar integratiebranch (`develop` als die er is),
   Closed, `create-adr` bij architectuur  

devTestItems / version.js: alleen als die files bestaan.

---

# Pad local

1. Lees plan/ontwerp.  
2. Branch `feature/<korte-naam>` (eerst vragen als de git-regel dat eist).  
3. `executing-plans` of `subagent-driven-development`.  
4. Test lokaal; meld poort/URL van *dit* project.  
5. `final-check-feature`.  
6. Commit/push alleen met ja.  
7. full: team-review; PR alleen op verzoek.

## Vereisten

- otap: ADO MCP, `gh`, `az` als preview Azure is  
- local: git + plan of ontwerp  
