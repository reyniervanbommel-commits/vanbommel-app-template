---
name: ship
description: Rond een gereviewde feature af met git status, commit, push en PR-voorbereiding.
disable-model-invocation: true
---

# Ship

Gebruik deze skill alleen wanneer de feature gereed is en de team review akkoord is.

## Broninstructie

Deze skill maakt `.claude/commands/ship.md` beschikbaar voor Cursor. Lees dat bestand eerst en pas de stappen toe binnen de huidige agentomgeving.

## Werkwijze

1. Controleer `git status`.
2. Stage de relevante bestanden.
3. Commit met een passende prefix zoals `feat:`, `fix:`, `refactor:`, `docs:` of `perf:`.
4. Push de huidige branch met `git push -u origin <branch>`.
5. Maak of update de PR met de beschikbare PR-tooling in de agentomgeving.
6. Rapporteer kort welke git-acties zijn uitgevoerd.

## Let op

- Gebruik geen productiepromotie als onderdeel van ship.
- Volg altijd de branch- en PR-regels uit `AGENTS.md`, `CLAUDE.md` en `.cursor/rules/versiebeheer.mdc`.
