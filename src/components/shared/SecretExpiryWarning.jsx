import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Link,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import useSecretExpiryWarning from '../../hooks/useSecretExpiryWarning';

const useStyles = makeStyles({
  banner: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    ...shorthands.borderRadius('0'),
  },
  detail: {
    display: 'block',
    marginTop: '4px',
    color: tokens.colorNeutralForeground2,
  },
  steps: {
    marginTop: '8px',
    marginBottom: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
});

const formatDate = (iso) => {
  if (!iso) return 'unknown date';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown date';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const buildHeadline = (isExpired, daysRemaining) => {
  if (isExpired) return 'The D365 client secret has expired';
  if (daysRemaining === 1) return 'The D365 client secret expires tomorrow';
  return `The D365 client secret expires in ${daysRemaining} days`;
};

/**
 * Waarschuwt admins vanaf een maand voor het verlopen van de D365 client secret.
 * Blijft waarschuwen tot de secret vernieuwd is (nieuwe vervaldatum opgeslagen).
 */
export default function SecretExpiryWarning() {
  const styles = useStyles();
  const { isVisible, isExpired, daysRemaining, expiresAt, dialogOpen, dismissDialog } =
    useSecretExpiryWarning();

  if (!isVisible) return null;

  const headline = buildHeadline(isExpired, daysRemaining);
  const dateLabel = formatDate(expiresAt);
  const consequence = isExpired
    ? 'Purchase order data can no longer be loaded from or written to D365 until the secret is renewed.'
    : 'When it expires, the app can no longer load purchase order data from D365.';

  return (
    <>
      <MessageBar intent={isExpired ? 'error' : 'warning'} className={styles.banner}>
        <MessageBarBody>
          <MessageBarTitle>{headline}</MessageBarTitle>
          {' '}Expiry date: {dateLabel}. {consequence}{' '}
          <Link href="/admin?tab=odata">Open OData settings</Link>
        </MessageBarBody>
      </MessageBar>

      <Dialog open={dialogOpen} onOpenChange={(_, data) => { if (!data.open) dismissDialog(); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{headline}</DialogTitle>
            <DialogContent>
              <span>
                The client secret of app registration <strong>VBO-OData-VendorApp-PROD</strong> expires
                on <strong>{dateLabel}</strong>. {consequence}
              </span>
              <span className={styles.detail}>To renew it, two steps are needed:</span>
              <ol className={styles.steps}>
                <li>Generate a new secret in Azure and store it in Key Vault.</li>
                <li>
                  Update <strong>Client secret expires on</strong> under Admin → OData settings —
                  otherwise this warning keeps appearing.
                </li>
              </ol>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={dismissDialog}>Understood</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
