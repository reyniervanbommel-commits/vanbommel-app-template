# Visiedocument: Guardrailed AI-integratie met Dynamics 365 F&O

**Concept:** Predefined prompt templates met AI-uitvoering  
**Versie:** 0.1 — concept  
**Datum:** juni 2026  
**Status:** ter bespreking

---

## 1. Aanleiding

De Van Bommel app verbindt externe gebruikers (leveranciers, medewerkers) met Dynamics 365 Finance & Operations. De huidige aanpak gebruikt OData REST-endpoints om data op te halen. Dat werkt voor eenvoudige lijsten, maar loopt vast zodra:

- gegevens uit meerdere entiteiten gecombineerd moeten worden (b.v. inkooporder + regels + actuele voorraad)
- een gebruiker een actie wil uitvoeren in D365 (b.v. ontvangst bevestigen, factuur aanleveren)
- de gewenste informatie afhankelijk is van business logic die D365 intern afhandelt
- een leverancier een vrije vraag wil stellen over zijn orders of leveringen

Voor al deze scenario's is een alternatieve aanpak nodig. Dit document beschrijft die aanpak.

---

## 2. De kern van het concept

### Predefined prompt templates met AI-uitvoering

Het concept werkt als volgt:

> Een beheerder definieert een set toegestane opdrachten ("commando's"). Een eindgebruiker kiest één van die commando's uit een lijst. De applicatie stuurt de opdracht — aangevuld met de context van de ingelogde gebruiker — naar een AI-model (Claude). Claude voert de opdracht uit via de officiële D365 MCP-koppeling en geeft het resultaat terug aan de gebruiker.

De eindgebruiker ziet een begrijpelijke interface. Hij kiest, hij krijgt een antwoord. Hij hoeft niets te weten over D365, entiteiten, OData of AI.

De beheerder bepaalt wat er mogelijk is. Niets meer, niets minder.

---

## 3. Waarom niet puur OData?

OData is geschikt voor het tonen van enkelvoudige lijsten met bekende structuur. Het kent een aantal harde beperkingen:

| Behoefte | OData | Beoordeling |
|---|---|---|
| Inkooporder headers ophalen | `PurchaseOrderHeadersV2` | ✅ Werkt |
| Headers én regels in één call | `$expand=PurchaseOrderLines` | ✅ Werkt (eerste niveau) |
| Regels filteren binnen een expand | `$expand=...($filter=...)` | ❌ Niet ondersteund in D365 |
| Actuele voorraad bij een inkooporderregel | `InventOnHandV2` koppelen op ItemNumber + dataAreaId | ⚠️ Werkt, maar vereist twee losse calls en eigen join-logica |
| Dieper geneste expand (b.v. dimensies) | `$expand=Lines/$expand=InventDim` | ❌ Niet ondersteund |
| Ontvangst boeken, factuur matchen | Aparte POST-endpoints per entiteit | ⚠️ Werkt, maar mist business logic validatie |
| Vendor stelt een vrije vraag | Niet van toepassing | ❌ Onmogelijk met OData |
| Beheerder voegt nieuw scenario toe | Nieuwe backend code nodig | ❌ Vereist ontwikkelaar |

De conclusie is niet dat OData overbodig wordt. Voor directe datafeeds (lijsten, filters, paginering) blijft OData de efficiëntste keuze. Voor complexe, samengestelde of schrijvende scenario's is een andere laag nodig.

---

## 4. De D365 ERP MCP Server

Microsoft heeft in februari 2026 de **Dynamics 365 ERP MCP Server** algemeen beschikbaar gesteld. Dit is een officieel Microsoft-product, ingebouwd in D365 F&O.

### Wat doet het?

De MCP-server exposeert vrijwel alle D365-functionaliteit als tools die een AI-model kan aanroepen. De AI kan:

- gegevens lezen uit elke entiteit, ook gekoppelde entiteiten
- records aanmaken, bijwerken en verwijderen
- business logic uitvoeren (workflows, validaties, boekingen)
- navigeren door het systeem op dezelfde manier als een menselijke gebruiker

### Hoe verschilt het van OData?

| Aspect | OData | D365 MCP |
|---|---|---|
| Toegang | Via bekende entiteitnamen | Via beschrijving in natuurlijke taal |
| Expand | Alleen eerste niveau | Onbeperkt, AI bepaalt de weg |
| Filters in expand | Niet ondersteund | AI lost dit intern op |
| Schrijven | Werkt, maar zonder business logic | Met volledige business logic |
| Nieuwe scenario's | Code aanpassen nodig | Prompt aanpassen volstaat |
| Beveiliging | Bearer token of service principal | Azure AD, zelfde rollen als gebruiker |

### Vereisten

- D365 F&O versie 10.0.45 of hoger (of Unified Developer Environment)
- Feature ingeschakeld via Feature Management in D365
- Azure AD service principal voor authenticatie
- MCP-client geconfigureerd in de applicatiebackend

---

## 5. Architectuur

### Overzicht

```
┌──────────────────────────────────────────────┐
│  app_commands (SQL-tabel)                    │
│  Beheerder configureert commando's via admin │
│  - naam, beschrijving (voor eindgebruiker)   │
│  - prompt_template (instructie voor Claude)  │
│  - parameters (welke context wordt ingevuld) │
│  - rol_filter (wie mag dit commando zien)    │
└──────────────────────────────────────────────┘
                      │
          Admin beheert via AdminPage
                      │
┌──────────────────────────────────────────────┐
│  CommandRunner (frontend)                    │
│  Gebruiker ziet lijst van toegestane         │
│  commando's op basis van zijn rol            │
│  Eventueel invulveld (b.v. ordernummer)      │
│  Resultaat wordt getoond als leesbare tekst  │
│  of gestructureerde data                     │
└──────────────────────────────────────────────┘
                      │
          POST /api/command/execute
                      │
┌──────────────────────────────────────────────┐
│  Backend CommandService                      │
│  1. Laad commando-template uit DB            │
│  2. Vul in: user-context (vendor account,    │
│     bedrijfscode, naam, etc.)                │
│  3. Stuur naar Claude API                    │
│     - met D365 MCP als beschikbare tool      │
│     - met systeem-prompt voor veiligheid     │
│  4. Stream of retourneer resultaat           │
│  5. Audit-log: wie, welk commando, wanneer   │
└──────────────────────────────────────────────┘
                      │
          Claude roept D365 MCP aan
                      │
┌──────────────────────────────────────────────┐
│  D365 F&O MCP Server                        │
│  (draait in de D365-omgeving)                │
│  Zelfde beveiliging als menselijke gebruiker │
│  Leest én schrijft, business logic intact   │
└──────────────────────────────────────────────┘
```

### Gegevensstroom — voorbeeld

**Gebruiker:** leverancier, rol `supplier`  
**Commando:** "Wat is de actuele status van mijn openstaande orders?"

1. Gebruiker klikt op het commando in de app
2. Backend haalt template op: *"Haal alle openstaande inkooporders op voor leverancier {vendor_account} in bedrijf {company}. Geef per order ook de regels en de actuele voorraad van elk artikel."*
3. Backend vult `{vendor_account}` en `{company}` in vanuit de sessie
4. Claude ontvangt de ingevulde prompt en de D365 MCP-toolset
5. Claude bevraagt D365 via MCP: headers, lines, InventOnHandV2
6. Claude formuleert een leesbaar antwoord
7. Gebruiker ziet: overzichtelijke tabel met orders, regels en voorraadindicatie

De gebruiker heeft op geen enkel moment een D365-scherm gezien of een entiteitnaam getypt.

---

## 6. Veiligheid en beheersbaarheid

### Wat de eindgebruiker NIET kan

- Vrije tekst invoeren die als prompt wordt doorgestuurd
- Commando's uitvoeren buiten zijn rol
- Direct schrijven naar D365 zonder goedgekeurd commando-template
- De MCP-verbinding of authenticatiegegevens inzien

### Wat de beheerder WEL kan

- Commando's aanmaken, bewerken en deactiveren
- Per commando aangeven welke rollen toegang hebben
- Parameters definiëren die de gebruiker mag invullen (b.v. een ordernummer)
- De systeem-prompt per commando aanscherpen
- Audit-log raadplegen: welke gebruiker welk commando heeft uitgevoerd en wat het resultaat was

### Azure AD en rollen

De D365 MCP-verbinding loopt via een Azure AD service principal met minimale rechten. Wat de AI in D365 kan doen is begrensd door de rechten van die service principal — ongeacht wat er in de prompt staat.

---

## 7. Toekomstige scenario's

Dit fundament maakt de volgende uitbreidingen mogelijk zonder nieuwe infrastructuur:

| Scenario | Aanpak |
|---|---|
| Leverancier bevestigt ontvangst | Schrijf-commando in template: "Boek ontvangst voor order {po_number} op datum {date}" |
| Leverancier vraagt doorlooptijd | Leescommando dat planning en productieorders combineert |
| Medewerker importeert factuur | Commando stuurt factuurgegevens naar D365 via MCP |
| Vrije vraag van leverancier aan D365 | Optioneel: tekstinvoer met guardrails in de systeem-prompt |
| Meldingen bij statuswijziging in D365 | MCP polling-commando gecombineerd met notificatieservice |
| Meerdere D365-omgevingen (OTAP) | MCP-verbinding per omgeving configureerbaar in admin |

---

## 8. Relatie tot de huidige OData-koppeling

De OData-koppeling wordt niet vervangen. Ze blijven naast elkaar bestaan:

| Gebruik | Koppeling |
|---|---|
| Lijsten tonen (orders, statussen) — snel en voorspelbaar | OData |
| Complexe, samengestelde queries | MCP via Claude |
| Schrijven met business logic | MCP via Claude |
| Interactieve vragen van eindgebruikers | MCP via Claude |
| Admin configureert verbinding | Beide via AdminPage |

---

## 9. Wat er gebouwd moet worden

### Fase 1 — Fundament

- [ ] `app_commands` tabel (migration) met prompt-template, parameters, rol-filter
- [ ] Beheer van commando's in AdminPage (CRUD)
- [ ] D365 MCP-verbindingsinstellingen in AdminPage (naast bestaande OData-instellingen)
- [ ] Claude API-integratie in de backend (`CommandService`)
- [ ] Basis `CommandRunner` frontend: lijst + uitvoeren + resultaat tonen

### Fase 2 — Volwassenheid

- [ ] Streaming van Claude-antwoorden naar de frontend
- [ ] Audit-log voor uitgevoerde commando's
- [ ] Parameterinvoer door de gebruiker (b.v. ordernummer als filter)
- [ ] Resultaten exporteren (PDF, Excel)

### Fase 3 — Uitbreiding

- [ ] Schrijf-commando's (met bevestigingsdialoog)
- [ ] Leveranciers-selfservice scherm
- [ ] Notificaties op basis van D365-statuswijzigingen

---

## 10. Openstaande vragen

1. **Welke D365-versie draait de omgeving?** MCP vereist v10.0.45 of hoger.
2. **Is er een Azure AD service principal beschikbaar** voor de app-registratie?
3. **Welke D365-rollen** krijgt de service principal — minimale rechten definiëren.
4. **Claude API key** — via Anthropic direct of via Azure OpenAI Service?
5. **Welke commando's hebben de hoogste prioriteit** voor Fase 1?

---

*Dit document is een concept ter bespreking. Na akkoord wordt het omgezet naar een implementatieplan in `.cursor/plans/`.*
