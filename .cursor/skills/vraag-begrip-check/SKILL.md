---
name: snap-je-me
description: Controleer of de agent de vraag van de gebruiker goed heeft begrepen voordat er actie wordt ondernomen. Gebruik deze skill wanneer een gebruiker een vraag stelt of een taak beschrijft, zodat de agent zijn begrip samenvat en bevestiging vraagt in Ask-modus. Trigger termen: vraag, verzoek, taak, maak, pas aan, fix, voeg toe, analyseer, help me, kan je, hoe kan ik.
---

# Vraag-begrip-check

## Doel

Zorg dat de agent de intentie van de gebruiker correct begrijpt vóór uitvoering, door eerst een samenvatting te geven en bevestiging te vragen — vanuit Ask-modus (read-only, geen wijzigingen).

## Werkwijze

### Stap 1: Schakel over naar Ask-modus

Gebruik de `SwitchMode` tool met `target_mode_id: "plan"` zodat de agent alleen leest en samenvatten kan, zonder wijzigingen te maken.

> Opmerking: Er is geen directe "ask"-modus beschikbaar als target via SwitchMode. Gebruik Plan-modus als lees-only alternatief om te bevestigen zonder te handelen.

### Stap 2: Vat de vraag samen

Geef een korte samenvatting van wat de agent denkt dat de gebruiker wil, in de volgende structuur:

```
Ik begrijp dat je het volgende wilt:

1. [Kernvraag of doel]
2. [Aanvullende details of beperkingen]
3. [Verwachte uitkomst]

Klopt dit? Of wil je iets aanpassen?
```

### Stap 3: Stel een verduidelijkingsvraag bij onduidelijkheid

Als de vraag onduidelijk, onvolledig of dubbelzinnig is, stel dan **één gerichte vraag** om de ontbrekende informatie op te halen. Gebruik de `AskQuestion` tool wanneer beschikbaar, anders stel de vraag in tekst.

Formuleer de vraag zo:
```
Ik snap de richting, maar heb nog één vraag voordat ik verder ga:

[Één concrete, gesloten of open vraag]
```

Voorbeelden van goede verduidelijkingsvragen:
- "Wil je dit toevoegen aan een bestaande pagina of als nieuw component?"
- "Moet dit voor alle gebruikers gelden, of alleen voor admins?"
- "Bedoel je het canvas-layout systeem of een los component?"

Stel maximaal **één vraag tegelijk** — niet meerdere in één bericht.

### Stap 4: Wacht op bevestiging of antwoord

Voer geen acties uit totdat de gebruiker bevestigt dat het begrip correct is, of de verduidelijkingsvraag heeft beantwoord.

### Stap 5: Schakel terug naar Agent-modus

Zodra de gebruiker bevestigt, ga dan over tot uitvoering in Agent-modus.

## Voorbeeld

**Gebruiker zegt:**
> "Maak een component dat kaarten weergeeft per medewerker met een filter op afdeling."

**Agent reageert (in Plan/Ask-modus):**
> Ik begrijp dat je het volgende wilt:
>
> 1. Een nieuw React-component aanmaken dat medewerkerkaarten toont
> 2. Een filteroptie per afdeling toevoegen
> 3. Het component integreert in de bestaande pagina-structuur
>
> Klopt dit? Of wil je iets toevoegen of wijzigen?

## Wanneer te gebruiken

- Altijd wanneer een gebruiker een nieuwe taak of wijziging beschrijft
- Wanneer de vraag meerdere stappen of onduidelijkheden bevat
- Wanneer het risico op foutieve uitvoering hoog is (bijv. verwijderen, herstructureren)

## Wanneer NIET te gebruiken

- Bij simpele, eenduidige vragen als "wat is de bestandsgrootte?"
- Wanneer de gebruiker expliciet zegt "doe het gewoon" of "voer direct uit"
- Bij follow-up berichten in een al lopend gesprek waarbij context duidelijk is
