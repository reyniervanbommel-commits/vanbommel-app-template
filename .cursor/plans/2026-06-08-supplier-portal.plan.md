# Supplier Portal - Implementatieplan

## Doel

Bouw een leveranciersportal waarin leveranciers inloggen om:

- D365 F&O purchase orders in te zien
- Pakbon/zendingsgegevens in te vullen
- Data veilig en controleerbaar terug te sturen naar D365

En waarin Van Bommel medewerkers:

- Een interne portal hebben met excel-achtige bewerking
- Leveranciersdata combineren met D365-data
- Data valideren en beheren voordat upload naar D365 plaatsvindt

## Scope (MVP)

1. Auth en rollen
- Leverancier-login
- VB medewerker-login
- Rolgebaseerde autorisatie op routes en API-endpoints

2. Leveranciersscherm
- Overzicht purchase orders (read-only vanuit D365/OData)
- Invoerscherm per zending/pakbon
- Statusweergave van ingestuurde regels

3. Interne VB-werkruimte
- Tabel/grid met leveranciersinput + D365-velden
- Inline validatie en correctie
- Filteren, sorteren en bulkacties
- Look-and-feel gebaseerd op Monday.com board/grid-ervaring
- Excel importmogelijkheid (`.xlsx`, `.xls`) voor bulk update van rijen

4. D365 integratie
- Inbound: OData uitlezen (purchase orders/gerelateerde data)
- Outbound: upload pipeline naar D365 Data Management/API
- Logging en foutafhandeling per batch

## Niet in MVP

- Volledige self-service onboarding voor leveranciers
- Geavanceerde BI-rapportages
- Multi-tenant support buiten huidige organisatiecontext

## UX-richtlijn (Monday.com look-and-feel)

- De interne "excel-achtige" werkruimte volgt de Monday.com stijlprincipes:
  - duidelijke board/grid focus
  - snelle inline editing
  - kolomgerichte statusweergave
  - bulk-acties op geselecteerde regels
- Gebruik de bestaande UI-stack (React + Fluent UI) met thema-afstemming op huidige Monday-kleurtoon.

## Architectuurkeuzes

1. Omgevingen
- Alleen DEV en PROD
- Preview-omgevingen voor feature-branches blijven mogelijk

2. Azure resource strategy
- Nieuwe resource group: `vanbommel-vendorportal`
- Gedeeld waar logisch:
  - ACR (optioneel gedeeld)
  - Entra tenant
- Dedicated voor deze app:
  - Container Apps (dev/prod)
  - Key Vault
  - SQL database

3. Data en security
- Eigen SQL database voor portal-domein
- Geen secrets in code, alles via env/Key Vault
- Audit trail op kritische mutaties en D365 uploads

## Azure inrichting (besluit + uitvoering)

### Besluit resource group

- Gebruik een nieuwe resource group: `vanbommel-vendorportal`
- Reden:
  - betere scheiding van workloads
  - duidelijker rechtenbeheer
  - beter kosteninzicht per applicatie
  - onafhankelijke lifecycle voor deploy/rollback/operations
  - minder impact op bestaande QAQC-resources

### Wat delen vs nieuw maken

1. Delen (logisch)
- Azure Container Registry (ACR) kan gedeeld blijven
- Entra ID tenant blijft gedeeld, met aparte app-registratie/scopes voor Supplier Portal
- Eventueel gedeelde monitoring workspace

2. Nieuw (aanrader)
- Nieuwe SQL database voor Supplier Portal (liefst eigen SQL server, minimaal eigen database)
- Nieuwe Container Apps voor vendorportal (`vendorportal-dev`, `vendorportal-prod`)
- Nieuwe Key Vault voor deze app (`kv-vendorportal` of naamconventie equivalent)
- Service Bus queue/topic set voor vendor-verwerking (indien asynchrone verwerking nodig is)

### SQL-besluit

- Maak een nieuwe SQL database voor deze app.
- Reden:
  - datadomein-scheiding
  - minder operationeel risico
  - eenvoudiger migraties/versioning
  - betere security/compliance-afbakening
  - eenvoudiger beheer per applicatie

### Concreet Azure provisioningpakket

1. Basis
- Resource group: `vanbommel-vendorportal`
- Container Apps Environment (bij voorkeur North Europe, consistent met huidige QAQC CA)
- Container Apps:
  - `vendorportal-dev`
  - `vendorportal-prod`
- Key Vault voor secrets/config
- SQL server + SQL database voor Supplier Portal

2. Integratie en messaging
- Service Bus namespace + queues/topics voor import/export en retrystromen (optioneel, aanbevolen)
- Storage account voor tijdelijke bestanden/import artefacten (optioneel, aanbevolen)

3. Identity
- App registration voor leveranciers-login flow
- App registration/scopes voor interne VB medewerkers
- Managed Identity op backend/container app voor secure resource access

4. Netwerk en security
- Firewall/private endpoints waar nodig voor SQL/Key Vault/Storage
- Secrets uitsluitend via Key Vault of Container Apps secrets
- RBAC per omgeving en principe van least privilege

## Technische deelplannen

### Fase 1 - Fundament
- Template placeholders vervangen
- CI/CD installflow stabiliseren (lockfile + `npm ci`)
- DEV/PROD deploy-workflows valideren
- Health checks en basis monitoring
- Azure basis provisionen:
  - RG `vanbommel-vendorportal`
  - Key Vault
  - SQL (server + database)
  - Container Apps Environment + dev/prod apps

### Fase 2 - Auth en autorisatie
- Sessiegebaseerde login uitbreiden voor leveranciersrollen
- Route- en endpoint-protectie op rol
- Basis account lifecycle (activatie, blokkering, reset)
- Identity ontwerp:
  - leveranciers-login (B2B/Entra External Identities of equivalent)
  - interne VB-medewerkers met role-based toegang

### Fase 3 - D365 read integratie
- OData clientlaag opzetten
- Mapping naar intern domeinmodel
- PO-overzicht voor leveranciers ontsluiten
- Integratieontwerp read:
  - purchase orders via OData
  - relevante leverancier- en artikelvelden

### Fase 4 - Leveranciers invoerflow
- Pakbon/zending-formulieren per PO-regel
- Server-side validatie op alle invoer
- Opslag in SQL + status machine (draft/submitted/processed/error)
- Datamodel uitbreiden op:
  - leverancier
  - purchase order + lines
  - shipment headers/lines
  - attachment/status/audit

### Fase 5 - Interne VB portal
- Grid/list voor gecombineerde datasets
- Inline bewerken, valideren en goedkeuren
- Bulkacties voor voorbereiden van upload
- Monday.com-geinspireerde UX uitwerken:
  - board/grid interactiepatronen
  - kolomtemplates (status, datum, leverancier, PO, shipment)
  - keyboard-first editing voor snelle data-entry
- Excel import toevoegen:
  - upload van `.xlsx`/`.xls`
  - mapping van kolommen naar intern datamodel
  - validatie en foutoverzicht per rij
  - preview + confirm voordat data definitief wordt opgeslagen

### Fase 6 - D365 outbound integratie
- Export batching naar D365 Data Management/API
- Retry/idempotency en foutafhandeling
- Verwerkingsrapportage voor gebruiker
- Integratieontwerp write:
  - pakbon/zending-data upload naar D365
  - terugkoppeling verwerkingstatus naar portal

### Fase 7 - Hardening en livegang
- Security checks, logging, rate limiting tuning
- End-to-end test met representatieve keten
- Go/No-Go checklist afronden
- Security baseline:
  - secrets in Key Vault
  - private endpoints/firewall waar nodig
  - audit logging + retry/idempotency op uploads
- CI/CD afronden:
  - GitHub secrets voor nieuwe RG/resources
  - deploy DEV/PROD workflows valideren
  - end-to-end test met echte D365 testdataflow

## Integratiepunten D365

1. OData (read)
- Purchase orders
- Leverancier- en artikelcontext
- Statusvelden die nodig zijn voor workflow

2. Data Management/API (write)
- Pakbon/zending updates
- Eventuele bevestigingsdata terug naar D365
- Heldere responseverwerking en reconciliatie

## Kernrisico's en mitigatie

1. Dataconsistentie tussen portal en D365
- Mitigatie: versie/timestamp checks en idempotente writes

2. Autorisatielekken tussen leverancier en interne rollen
- Mitigatie: strikte role checks op backend, niet alleen in frontend

3. Integratie-instabiliteit (timeouts/rate limits)
- Mitigatie: retries met backoff, queueing waar nodig, monitoring per batch

## Deliverables

- Werkende DEV en PROD deployment
- Leveranciersportaal MVP
- Interne VB werkruimte MVP
- Monday.com-geinspireerde grid-ervaring voor interne VB gebruikers
- Excel importflow met validatie, preview en foutafhandeling
- D365 read/write integraties
- Operationele handleiding (runbook) voor support

## Volgende concrete acties

1. Architectuurbesluit vastleggen:
- RG `vanbommel-vendorportal`
- aparte SQL database
- gedeelde ACR

2. Azure basis provisionen:
- RG, Container Apps env, dev/prod apps, Key Vault, SQL database

3. Identity ontwerp uitvoeren:
- leveranciers-login (B2B/External Identities)
- interne VB-medewerkers met role-based toegang

4. Initiële epics aanmaken in Azure DevOps project `Supplier Portal`:
- Auth & rollen
- D365 read integratie
- Leveranciers invoerflow
- Interne VB portal
- Excel import & datavalidatie
- D365 outbound upload
- Security & Operations

5. Tech spike plannen voor D365 API-contracten (OData + Data Management)
