import { useEffect, useMemo, useState } from 'react';
import { ROLES } from '../constants/roles';
import { apiRequest } from '../utils/api';

/**
 * Haalt de bedrijfsnaam op voor de ingelogde vendor via /api/rccp/vendors.
 * Retourneert null voor niet-supplier gebruikers of tijdens laden.
 * @param {object|null} user - Huidige gebruiker uit AuthContext
 * @returns {string|null} Bedrijfsnaam van de vendor, of null
 */
export function useVendorCompanyName(user) {
  const [companyName, setCompanyName] = useState(null);

  const isSupplier = user?.role === ROLES.SUPPLIER;
  const vendorAccount = user?.vendor_account || user?.vendorAccount || null;

  useEffect(() => {
    if (!isSupplier || !vendorAccount) return;
    let cancelled = false;
    apiRequest('/rccp/vendors')
      .then((data) => {
        if (cancelled) return;
        const name = data?.vendorNames?.[vendorAccount] || null;
        setCompanyName(name);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSupplier, vendorAccount]);

  return useMemo(() => companyName, [companyName]);
}
