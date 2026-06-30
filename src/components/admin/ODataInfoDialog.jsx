import React, { useCallback, useState } from 'react';
import {
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { Info24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  intro: {
    color: tokens.colorNeutralForeground2,
    marginBottom: '16px',
  },
  item: {
    ...shorthands.padding('12px', '0'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ':last-child': { borderBottom: 'none' },
  },
  fieldName: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '4px',
  },
  where: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: '6px',
  },
  example: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding('4px', '8px'),
    ...shorthands.borderRadius('4px'),
    marginTop: '6px',
    display: 'inline-block',
  },
  note: {
    marginTop: '16px',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

const FIELDS = [
  {
    name: 'OData basis-URL',
    description: 'De root-URL van je Dynamics 365 Finance & Operations omgeving.',
    where: [
      'LCS (Lifecycle Services) → je project → Omgeving → Environment details → Environment URL',
      'Of in D365: Help (?) → Info → Environment URL',
    ],
    example: 'https://contoso.operations.dynamics.com',
  },
  {
    name: 'Purchase Orders pad',
    description: 'Het OData-pad naar de purchase order entiteit. Standaard is PurchaseOrderHeadersV2.',
    where: [
      'Microsoft Learn: zoek op "PurchaseOrderHeadersV2 entity" voor de juiste entiteitnaam',
      'Test in browser: {basis-URL}/data/PurchaseOrderHeadersV2?$top=1 (met geldig token)',
    ],
    example: '/data/PurchaseOrderHeadersV2',
  },
  {
    name: 'Bedrijfscode (company)',
    description: 'De code van de juridische entiteit (dataAreaId) waarvoor orders worden opgehaald.',
    where: [
      'D365 → Organisatiebeheer → Juridische entiteiten → kolom Naam / ID',
      'Vaak een korte code zoals usmf, nl01 of fvb',
    ],
    example: 'WHSL',
  },
  {
    name: 'Timeout (ms)',
    description: 'Maximale wachttijd voor een OData-verzoek in milliseconden.',
    where: ['Laat leeg voor standaard (20000 ms). Verhoog bij trage omgevingen.'],
    example: '20000',
  },
  {
    name: 'OAuth2 client-credentials (aanbevolen)',
    description: 'De app authenticeert server-to-server bij Azure AD en ververst het token automatisch vóór expiry. Hiervoor zijn Tenant ID, Client ID en Client secret nodig.',
    where: [
      'Azure Portal → App registrations → jouw app (bv. VBO-OData-VendorApp-DEV)',
      'Tenant ID + Client ID staan op het Overzicht; Secret onder Certificates & secrets',
      'De app moet in D365 gekoppeld zijn: System administration → Setup → Microsoft Entra ID applications',
      'Scope wordt automatisch {basis-URL}/.default',
    ],
    example: 'Tenant ID / Client ID = GUID, Secret = geheim',
  },
  {
    name: 'Cache-synchronisatie (scope + cap)',
    description: 'Bepaalt welke orders in de SQL-cache komen. Een scope-filter voorkomt dat de volledige (trage) dataset wordt opgehaald; de cap is een vangnet.',
    where: [
      'Scope-filter = ruwe OData $filter, bijv. op status of datum',
      'Max. aantal orders = harde bovengrens per sync (standaard 2000)',
      'Cache verouderd na = minuten vóór een automatische lazy-refresh',
    ],
    example: "PurchaseOrderStatus ne ...'Canceled'",
  },
  {
    name: 'Bearer token (legacy fallback)',
    description: 'Handmatig Azure AD token. Alleen gebruikt als er géén client-credentials zijn ingesteld. Verloopt na ~60 minuten — gebruik bij voorkeur OAuth2 hierboven.',
    where: [
      'Tijdelijk via Azure CLI: az account get-access-token --resource {basis-URL}',
      'Laat leeg zodra client-credentials werken',
    ],
    example: 'eyJ0eXAiOiJKV1QiLCJhbGciOi...',
  },
];

export default function ODataInfoDialog() {
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleOpenChange = useCallback((_, data) => setOpen(data.open), []);

  return (
    <>
      <Button
        appearance="subtle"
        icon={<Info24Regular />}
        onClick={handleOpen}
        aria-label="Uitleg OData-instellingen"
      >
        Hulp
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogSurface style={{ maxWidth: '560px' }}>
          <DialogBody>
            <DialogTitle>OData-koppeling instellen</DialogTitle>
            <DialogContent>
              <Text className={styles.intro} block>
                Vul onderstaande velden in om purchase orders uit Dynamics 365 te laden.
                Instellingen worden opgeslagen in de database (tabel app_settings), niet in .env.
              </Text>

              {FIELDS.map((field) => (
                <div key={field.name} className={styles.item}>
                  <Text className={styles.fieldName} block>{field.name}</Text>
                  <Text block>{field.description}</Text>
                  <div className={styles.where}>
                    {field.where.map((line) => (
                      <Text key={line} block>→ {line}</Text>
                    ))}
                  </div>
                  {field.example && (
                    <span className={styles.example}>{field.example}</span>
                  )}
                </div>
              ))}

              <Text className={styles.note} block>
                Na opslaan: ga naar Purchase orders en klik Vernieuwen om te testen.
                Bij foutmelding &quot;D365_ODATA_BASE_URL ontbreekt&quot; is de basis-URL nog leeg.
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={handleClose}>Begrepen</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
