export const devTestItems = [
  {
    id: 'story-176',
    title: 'Story #176 - Board-cutover Fase 7: PO-board leest uit tb_* (achter vlag)',
    checks: [
      'Het Purchase Orders-board toont dezelfde orders/regels als voorheen, nu gelezen uit /api/data/purchase-orders',
      'De gepubliceerde Excel-koppeling verschijnt als read-only kolom(men) op het board',
      '#161-lookups (leveranciersnaam op de kop, artikelnaam op de regel) verschijnen eveneens op het board',
      'Eigen kolommen toevoegen/hernoemen/verwijderen en celwaarden bewerken werkt via de tb_*-laag',
      'Rijen verbergen / write-back / write-back-toggle geven een nette melding "nog niet beschikbaar" (volgt in Fase 1-3)',
      'Met VITE_BOARD_TB_SOURCE=false valt het board terug op de oude po_*-bron',
    ],
  },
  {
    id: 'feature-162',
    title: 'Feature #162 - Excel-koppeling naar hoofdtabel (standalone op develop)',
    checks: [
      'Data model-pagina heeft een tab "Externe koppelingen" met een 4-staps wizard (Uploaden → Sleutels → Kolommen → Publiceren)',
      'Een Excel/CSV uploaden toont de gedetecteerde kolommen met type en voorbeeldwaarden',
      'Bij het koppelen kies je hoofdtabel, scope (kop/regel), hoofdtabel-sleutelveld en dataset-sleutelveld',
      'Valideren toont de match-rate; dubbele sleutelwaarden in de dataset blokkeren publiceren (badge "Dubbele sleutels")',
      'Na publiceren verschijnen de gekozen Excel-kolommen als read-only kolommen op de hoofdtabel (/api/data/purchase-orders)',
      'Een dataset opnieuw uploaden vervangt de data maar behoudt de koppeling; een koppeling kan verwijderd worden',
    ],
  },
  {
    id: 'story-134',
    title: 'Story #134 - D365 write-back (veldcorrecties terug naar D365, Fase 3)',
    checks: [
      'Admin kan op een D365-kolomkop via het menu "Write-back toestaan" aanzetten (badge "write-back" verschijnt)',
      'Een write-back-kolom toont een upload-icoon; klikken opent "Corrigeren in D365" met bevestiging',
      'Na bevestigen wordt de waarde teruggeschreven naar D365 en in het scherm bijgewerkt',
      'Bij een conflict (waarde intussen in D365 gewijzigd) volgt een nette foutmelding, geen overschrijving',
      'Niet-toegestane kolommen blijven read-only; alleen admin ziet de write-back-toggle',
    ],
  },
  {
    id: 'story-133',
    title: 'Story #133 - Nieuw-/gewijzigd-detectie per gebruiker (Fase 2)',
    checks: [
      'Nieuwe orders (sinds laatste bezoek) krijgen een groene rij-markering + badge "nieuw"',
      'Gewijzigde orders krijgen een oranje rij-markering + badge "gewijzigd"',
      'Toolbar toont tellingen (x nieuw / x gewijzigd) zodra er iets is',
      'Knop "Markeer als gezien" wist de markeringen; bij herladen blijven ze weg',
      'Eerste bezoek toont geen markeringen (geen scherm vol vlaggen)',
    ],
  },
  {
    id: 'feature-138',
    title: 'Fase 0/1-afronding #131/#132 - sync-scope, OData-pagina, veldfixes',
    checks: [
      'OData-adminpagina toont "Huidige status": auth-methode (OAuth2 client-credentials), scope, token-endpoint en of het client secret is ingesteld',
      'OData-pagina heeft secties OAuth2-credentials (tenant/client id/secret) en Cache-synchronisatie (scope-filter + cap); bearer token staat als legacy fallback',
      'Client secret wordt nooit getoond; leeg laten behoudt de bestaande waarde',
      'Vernieuwen loopt niet vast op de volledige dataset (begrensde sync via scope-filter + max-orders cap)',
      'Leverdatum op orderregels toont een waarde (echt veld RequestedDeliveryDate i.p.v. lege RequestedReceiptDate)',
    ],
  },
  {
    id: 'story-132',
    title: 'Story #132 - PO SQL-cache + dynamische kolommen (Fase 1)',
    checks: [
      'Purchase orders laden uit de SQL-cache (geen live D365 bij paginaload)',
      'Vernieuwen-knop ververst uit D365 en toont nieuwe sync-tijd',
      'Versheidsindicator toont Actueel/Verouderd/Nog-niet-gesynchroniseerd',
      'Eigen kolom toevoegen op hoofd- en regelniveau (tekst/getal/datum/ja-nee/keuzelijst)',
      'Eigen kolomwaarde inline bewerken slaat direct op (autosave)',
      'Eigen kolom hernoemen en verwijderen (soft-delete; waarden blijven behouden)',
    ],
  },
  {
    id: 'ticket-75',
    title: 'Story #75 - Auth en rollen voor leveranciers en VB medewerkers',
    checks: [
      'Supplier rol kan alleen supplier-routes bereiken',
      'Employee en admin hebben toegang tot interne beheerpagina',
      'Backend valideert rolwaarden en weigert onbekende rollen',
      'Sessie bevat alleen veilige user velden zonder password hash',
    ],
  },
  {
    id: 'feature-143-typescript',
    title: 'Feature #143 - TypeScript validation for frontend, backend, and preview CI',
    checks: [
      'Preview pipeline runs the TypeScript validation step before database migrations',
      'Frontend typecheck completes using the frontend TypeScript configuration',
      'Backend and script typecheck completes using the backend TypeScript configuration',
      'Dependency lockfile contains the TypeScript tooling required by npm ci',
    ],
  },
];
