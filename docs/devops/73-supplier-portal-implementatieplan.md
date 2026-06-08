# Supplier Portal - Implementatieplan (DevOps)

**Doel:** Realiseer een leveranciersportal met D365 integraties, Monday.com-geinspireerde interne grid UX en gecontroleerde uploadflows naar D365.  
**Referentie in repo:** [.cursor/plans/dev_2026-06-08-supplier-portal.plan.md](../.cursor/plans/dev_2026-06-08-supplier-portal.plan.md)  
**Tags:** supplier-portal; vendorportal; d365; azure; integration

---

## User story

**Als** Van Bommel organisatie  
**wil ik** een Supplier Portal met leveranciers- en interne workflow  
**zodat** we purchase orders, zendingen en terugkoppeling naar D365 gecontroleerd kunnen beheren.

---

## Acceptatiecriteria (definitie van "klaar")

1. Er is een opgesplitste backlog met aparte user stories voor infra, auth, D365 read/write, interne grid en Excel import.
2. Azure inrichtingskeuzes zijn vastgelegd (nieuwe RG, nieuwe SQL database, gedeelde ACR waar logisch).
3. MVP scope dekt leveranciersinvoer, interne bewerking en upload naar D365.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Supplier Portal implementatieplan | `.cursor/plans/dev_2026-06-08-supplier-portal.plan.md` |
| DevOps project `Supplier Portal` aangemaakt | Azure DevOps |
| Feature met child User Stories aangemaakt | Work items #73-#81 |

---

## Backlog — child User Stories

### Story A: Azure fundament (RG, SQL, CA, KV, CI/CD basis)
**Beschrijving:** Richt DEV/PROD basis in voor Supplier Portal in nieuwe resource group `vanbommel-vendorportal` met SQL, Key Vault en Container Apps.  
**Acceptatiecriteria:**
1. RG, SQL database, Key Vault en Container Apps (dev/prod) bestaan en zijn geconfigureerd.
2. GitHub/Azure DevOps secrets voor deployment zijn ingericht.
3. Basis healthcheck en deploy-validatie zijn uitgevoerd.

### Story B: Auth en rollen voor leveranciers en VB medewerkers
**Beschrijving:** Implementeer identity en autorisatie voor leveranciers en interne medewerkers met duidelijke role boundaries.  
**Acceptatiecriteria:**
1. Leveranciers kunnen alleen eigen relevante data zien en bewerken.
2. VB-medewerkers hebben interne beheerrechten volgens rolmodel.
3. Beveiligde routes/API's zijn afgeschermd via backend role checks.

### Story C: D365 read integratie via OData (purchase orders)
**Beschrijving:** Lees purchase orders en contextdata uit D365 OData en toon deze in Supplier Portal.  
**Acceptatiecriteria:**
1. OData connector haalt purchase orders betrouwbaar op.
2. Mapping naar intern datamodel is gedocumenteerd en getest.
3. Foutafhandeling en logging voor read failures zijn aanwezig.

### Story D: Leveranciers invoerflow voor pakbon en zending
**Beschrijving:** Bouw invoerflow waarmee leveranciers zending- en pakbongegevens per PO-regel kunnen invullen en indienen.  
**Acceptatiecriteria:**
1. Formulieren valideren server-side alle invoer.
2. Data wordt opgeslagen met statusmodel (draft/submitted/processed/error).
3. Gebruiker krijgt duidelijke statusfeedback en foutmeldingen.

### Story E: Interne VB grid met Monday.com look-and-feel
**Beschrijving:** Lever interne grid/workspace met Monday.com-geinspireerde look-and-feel voor snelle datahandling.  
**Acceptatiecriteria:**
1. Grid ondersteunt inline editing en bulkacties.
2. UX volgt afgesproken board/grid patronen.
3. Filters/sortering werken op gecombineerde leveranciers- en D365-data.

### Story F: Excel import en datavalidatie voor interne workflow
**Beschrijving:** Voeg import van `.xlsx`/`.xls` toe voor bulkupdates met mapping, validatie en preview.  
**Acceptatiecriteria:**
1. Gebruiker kan Excel uploaden en kolommen mappen.
2. Validatiefouten worden per rij getoond.
3. Data wordt pas opgeslagen na preview + expliciete confirm.

### Story G: D365 outbound upload en reconciliatie
**Beschrijving:** Bouw outbound pipeline naar D365 Data Management/API met status terugkoppeling.  
**Acceptatiecriteria:**
1. Upload batches naar D365 verlopen gecontroleerd.
2. Retry/idempotency is ingericht voor robuustheid.
3. Verwerkingsstatus en fouten zijn zichtbaar in portal.

### Story H: Security en operations hardening
**Beschrijving:** Rond security en operations af inclusief monitoring, audit en netwerkbeveiliging.  
**Acceptatiecriteria:**
1. Secrets draaien via Key Vault/secret references.
2. Audit logging en monitoring zijn operationeel.
3. End-to-end test met echte D365 testflow is geslaagd.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-06-08-supplier-portal.plan.md](../.cursor/plans/dev_2026-06-08-supplier-portal.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: `docs/devops/73-supplier-portal-implementatieplan.md`
