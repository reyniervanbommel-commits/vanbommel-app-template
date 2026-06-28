---
name: create-adr
description: Maak een Architecture Decision Record (ADR) aan in docs/adr/ na een afgeronde technische beslissing of feature. Gebruik wanneer de gebruiker vraagt om een beslissing vast te leggen, een ADR te maken, of wanneer een feature is afgerond die een architectuurkeuze bevat.
---

# Create ADR (Architecture Decision Record)

## Wat is een ADR

Een ADR legt vast **wat** er besloten is, **waarom**, en welke **alternatieven** overwogen zijn. Het is een permanent kennisdocument — geen plan, geen takenlijst, geen handleiding.

| Niet een ADR | Wel een ADR |
|-------------|-------------|
| "We gaan X bouwen" (plan) | "We hebben X gebouwd omdat Y" |
| "Hoe gebruik je X" (guide) | "We kozen X boven Y en Z vanwege..." |
| "Wat moet er nog" (backlog) | "De gevolgen van deze keuze zijn..." |

## Wanneer een ADR maken

- Na het afronden van een **architectuurkeuze** (caching strategie, auth flow, database-opzet)
- Na het oplossen van een **fundamenteel probleem** met een gekozen aanpak
- Bij een **technologiekeuze** (library, framework, service)
- Wanneer er **alternatieven overwogen** zijn en er bewust gekozen is

**Niet** bij: bugfixes, styling, kleine refactors, configuratiewijzigingen.

## Stappen

### 1. Bepaal het volgnummer

- Lees de bestanden in `docs/adr/`
- Pak het hoogste nummer en tel 1 op
- Als de map leeg is, begin bij `001`

### 2. Verzamel de informatie

Stel deze vragen (of leid ze af uit de chat-context):
- **Wat was het probleem?** (context)
- **Wat is er besloten?** (beslissing, mag meerdere deelbeslissingen zijn)
- **Welke alternatieven zijn overwogen?** (met reden van afwijzing)
- **Wat zijn de gevolgen?** (positief en negatief)
- **Welke bestanden zijn geraakt?**

### 3. Schrijf het ADR-document

Gebruik dit template:

```markdown
# ADR-<NNN>: <Korte titel van de beslissing>

**Datum:** <YYYY-MM-DD>  
**Status:** Geaccepteerd  
**Tags:** <tag1, tag2, tag3>  
**DevOps Feature:** #<id> (indien van toepassing)

---

## Context

<Wat was het probleem of de aanleiding? Beschrijf de situatie vóór de beslissing.>

## Beslissing

<Wat is er besloten? Beschrijf de gekozen aanpak in concrete termen. Mag meerdere genummerde deelbeslissingen bevatten.>

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| <alternatief 1> | <waarom niet> |
| <alternatief 2> | <waarom niet> |

## Gevolgen

<Wat verandert er door deze beslissing? Zowel positieve als negatieve effecten. Wat moeten toekomstige ontwikkelaars weten?>

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| <pad> | <wat is gewijzigd> |
```

### 4. Sla het document op

Bestandsnaam: `docs/adr/<NNN>-<korte-naam-met-dashes>.md`  
Voorbeeld: `docs/adr/003-auth-flow-entra-sso.md`

### 5. Commit

```
git add docs/adr/<NNN>-<korte-naam>.md
git commit -m "docs: ADR-<NNN> <korte titel>"
```

## Naamgeving

- Nummer: altijd 3 cijfers met voorloopnullen (`001`, `012`, `100`)
- Titel: lowercase, dashes, geen speciale tekens
- Hou het kort: `002-networkfirst-pwa-caching`, niet `002-beslissing-over-het-gebruik-van-networkfirst-caching-strategie-voor-pwa`

## Status waarden

| Status | Betekenis |
|--------|-----------|
| **Geaccepteerd** | Actief en geldig |
| **Vervangen** | Vervangen door een nieuwere ADR (verwijs ernaar) |
| **Afgewezen** | Overwogen maar niet doorgezet (nuttig als kennisbank) |

## Voorbeeldprompts

| Situatie | Prompt |
|----------|--------|
| Na afronding feature | "Maak een ADR voor de beslissingen die we net hebben gemaakt" |
| Specifieke beslissing | "Leg vast waarom we voor NetworkFirst caching hebben gekozen" |
| Overzicht | "Welke ADR's hebben we?" |
| Achteraf vastleggen | "Maak een ADR voor de OTAP-opzet die we eerder hebben besloten" |
