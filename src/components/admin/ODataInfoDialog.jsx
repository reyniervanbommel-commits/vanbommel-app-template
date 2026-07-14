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
    name: 'OData base URL',
    description: 'The root URL of your Dynamics 365 Finance & Operations environment.',
    where: [
      'LCS (Lifecycle Services) → your project → Environment → Environment details → Environment URL',
      'Or in D365: Help (?) → Info → Environment URL',
    ],
    example: 'https://contoso.operations.dynamics.com',
  },
  {
    name: 'Purchase Orders path (headers entity)',
    description: 'This path points to the header entity. Order lines are loaded through the relation via $expand=PurchaseOrderLines.',
    where: [
      'Microsoft Learn: search for "PurchaseOrderHeadersV2 entity" for the correct entity name',
      'Test in browser: {base URL}/data/PurchaseOrderHeadersV2?$top=1&$expand=PurchaseOrderLines (with valid token)',
      'Line write-back uses the line entity /data/PurchaseOrderLinesV2',
    ],
    example: '/data/PurchaseOrderHeadersV2',
  },
  {
    name: 'Company code',
    description: 'The legal entity code (dataAreaId) used to fetch orders.',
    where: [
      'D365 → Organization administration → Legal entities → Name / ID column',
      'Often a short code such as usmf, nl01 or fvb',
    ],
    example: 'WHSL',
  },
  {
    name: 'Timeout (ms)',
    description: 'Maximum wait time for an OData request in milliseconds.',
    where: ['Leave empty for default (20000 ms). Increase for slow environments.'],
    example: '20000',
  },
  {
    name: 'OAuth2 client-credentials (recommended)',
    description: 'The app authenticates server-to-server with Azure AD and refreshes the token automatically before expiry. This requires Tenant ID, Client ID and Client secret.',
    where: [
      'Azure Portal → App registrations → your app (e.g. VBO-OData-VendorApp-DEV)',
      'Tenant ID + Client ID are on Overview; Secret is under Certificates & secrets',
      'The app must be linked in D365: System administration → Setup → Microsoft Entra ID applications',
      'Scope is automatically {base URL}/.default',
    ],
    example: 'Tenant ID / Client ID = GUID, Secret = secret',
  },
  {
    name: 'Cache sync (scope + cap)',
    description: 'Determines which orders are stored in the SQL cache. A scope filter prevents fetching the full (slow) dataset; the cap is a safety net.',
    where: [
      'Scope filter = raw OData $filter, e.g. on status or date',
      'Max orders = hard upper limit per sync (default 2000)',
      'Cache stale after = minutes before an automatic lazy refresh',
    ],
    example: "PurchaseOrderStatus ne ...'Canceled'",
  },
  {
    name: 'Bearer token (legacy fallback)',
    description: 'Manual Azure AD token. Only used when client credentials are not configured. Expires after ~60 minutes — prefer OAuth2 above.',
    where: [
      'Temporary via Azure CLI: az account get-access-token --resource {base URL}',
      'Leave empty once client credentials work',
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
        aria-label="OData settings help"
      >
        Help
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogSurface style={{ maxWidth: '560px' }}>
          <DialogBody>
            <DialogTitle>Configure OData connection</DialogTitle>
            <DialogContent>
              <Text className={styles.intro} block>
                Vul onderstaande velden in om purchase orders uit Dynamics 365 te laden.
                Settings are saved in the database (app_settings table), not in .env.
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
              <Button appearance="primary" onClick={handleClose}>Got it</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
