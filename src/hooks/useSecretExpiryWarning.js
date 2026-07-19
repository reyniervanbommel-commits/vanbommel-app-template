import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

// Per vervaldatum gesleuteld: zodra de secret vernieuwd is (nieuwe datum), verschijnt de
// dialog weer, ook als de vorige waarschuwing al was weggeklikt.
const DIALOG_DISMISS_KEY_PREFIX = 'vendorportal.d365-secret-expiry-dismissed.';

const dismissKeyFor = (expiresAt) => `${DIALOG_DISMISS_KEY_PREFIX}${expiresAt}`;

const wasDismissedThisSession = (expiresAt) => {
  try {
    return window.sessionStorage.getItem(dismissKeyFor(expiresAt)) === '1';
  } catch {
    return false;
  }
};

/**
 * Bewaakt de vervaldatum van de D365 client secret voor admins.
 *
 * De banner blijft staan zolang de secret niet vernieuwd is — dat is de expliciete eis.
 * De dialog verschijnt één keer per browsersessie, zodat een admin hem niet definitief
 * kan wegklikken maar er ook niet bij elke navigatie tegenaan loopt.
 */
export default function useSecretExpiryWarning() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [expiry, setExpiry] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setExpiry(null);
      setDialogOpen(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await apiRequest('/admin/settings/odata');
        if (cancelled) return;

        const status = data?.derived?.clientSecretExpiry || null;
        setExpiry(status);

        const needsWarning = status?.status === 'warning' || status?.status === 'expired';
        if (needsWarning && status.expiresAt && !wasDismissedThisSession(status.expiresAt)) {
          setDialogOpen(true);
        }
      } catch {
        // Bewust stil: een mislukte statuscheck mag de app nooit blokkeren.
        if (!cancelled) setExpiry(null);
      }
    })();

    return () => { cancelled = true; };
  }, [isAdmin]);

  const dismissDialog = useCallback(() => {
    setDialogOpen(false);
    if (!expiry?.expiresAt) return;
    try {
      window.sessionStorage.setItem(dismissKeyFor(expiry.expiresAt), '1');
    } catch {
      // sessionStorage kan geblokkeerd zijn; de dialog sluit dan alleen voor deze render.
    }
  }, [expiry]);

  const isWarning = expiry?.status === 'warning' || expiry?.status === 'expired';

  return {
    isVisible: isAdmin && isWarning,
    isExpired: expiry?.status === 'expired',
    daysRemaining: expiry?.daysRemaining ?? null,
    expiresAt: expiry?.expiresAt ?? null,
    dialogOpen: dialogOpen && isAdmin && isWarning,
    dismissDialog,
  };
}
