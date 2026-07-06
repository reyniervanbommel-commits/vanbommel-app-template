export function getFormulaValidationTip(message) {
  const text = String(message || '').toLowerCase();
  if (!text) return '';
  if (text.includes('verwacht eof') || text.includes('onverwachte token')) {
    return 'Controleer haakjes en gebruik ALS(conditie;waar;onwaar).';
  }
  if (text.includes('onbekende kolomreferentie')) {
    return 'Gebruik de kolom-picker zodat de referentie exact klopt.';
  }
  if (text.includes('formule mag niet verwijzen naar formulekolom')) {
    return 'Verwijs alleen naar gewone master-kolommen, niet naar andere formulekolommen.';
  }
  if (text.includes('formule is verplicht')) {
    return 'Vul eerst een formule in voordat je controleert of opslaat.';
  }
  if (text.includes('master-kolommen')) {
    return 'Gebruik alleen kolommen uit de hoofdtabel (master).';
  }
  return 'Controleer syntax, kolomnamen en scheiding met puntkomma\'s.';
}
