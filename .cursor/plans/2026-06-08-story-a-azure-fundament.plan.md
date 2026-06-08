# Story A - Azure fundament (startplan)

## Context

Bron: `docs/devops/73-supplier-portal-implementatieplan.md`  
Story A: Azure fundament (RG, SQL, CA, KV, CI/CD basis)

## Doel van deze start

1. Start van ticket formaliseren met concrete technische stappen.
2. Infra-basis als code vastleggen voor repeatable provisioning.
3. Story A status en acceptance checks expliciet maken voor uitvoering.

## Scope van deze wijziging

- Documentatie voor Story A uitvoering en opleverchecklist.
- Bicep-template voor basisresources:
  - Resource Group (target)
  - Key Vault
  - SQL Server + SQL Database
  - Container Apps Environment

## Uitvoeringstaken

- [x] Ticketstart en planbestand toegevoegd
- [ ] Bicep scaffold toevoegen in `infra/azure/`
- [ ] Story A uitvoeringsdocument toevoegen in `docs/devops/`
- [ ] Basisvalidatie op syntax/template
- [ ] Commit + push + PR update

## Risico's en aandachtspunten

- Resource naming moet aansluiten op bestaande tenant conventies.
- Secrets blijven buiten templates (alleen parameters/references).
- SQL en KV netwerkbeveiliging moet later per OTAP worden aangescherpt.
