// Resolver voor image-kolommen (Story C van feature "Plaatje-kolom in main tabel").
//
// Een image-kolom heeft geen eigen opgeslagen waarde: de URL wordt afgeleid uit een
// andere header-kolom (`sourceColumnKey`) via een `urlTemplate` met de placeholder
// `{xxx}`. Optioneel worden `transforms` toegepast om de bronwaarde te bewerken
// voordat die in de template wordt gesubstitueerd. Dit spiegelt de validatie en de
// transform-vormen van de backend (server/services/PurchaseOrderColumnsService.js).

/**
 * Past één transform veilig toe op de (string) waarde. Onbekende of ongeldig
 * gevormde transforms worden overgeslagen (geen throw), zodat een kapotte config
 * nooit de render laat crashen.
 *
 * @param {string} value - de huidige (reeds naar string geconverteerde) waarde
 * @param {{ type?: string, value?: string, from?: string, to?: string, start?: number, end?: number }} transform
 * @returns {string} de bewerkte waarde
 */
function applyTransform(value, transform) {
  if (!transform || typeof transform !== 'object') return value;
  switch (transform.type) {
    case 'trim':
      return value.trim();
    case 'remove': {
      // Verwijder alle voorkomens van transform.value. split/join vermijdt
      // regex-escaping-problemen bij speciale tekens in de zoekstring.
      if (typeof transform.value !== 'string' || transform.value.length === 0) return value;
      return value.split(transform.value).join('');
    }
    case 'replace': {
      if (typeof transform.from !== 'string' || transform.from.length === 0) return value;
      const to = typeof transform.to === 'string' ? transform.to : '';
      return value.split(transform.from).join(to);
    }
    case 'substring': {
      if (!Number.isInteger(transform.start)) return value;
      if (Number.isInteger(transform.end)) {
        return value.substring(transform.start, transform.end);
      }
      return value.substring(transform.start);
    }
    default:
      // Onbekend type: waarde ongewijzigd laten (defensief).
      return value;
  }
}

/**
 * Bouwt de afbeeldings-URL voor een image-kolom uit de rijwaarden.
 *
 * Retourneert een lege string ('') zodra er niets zinnigs te renderen valt:
 * ontbrekende/onvolledige options, ontbrekende bronwaarde, of een onveilige
 * (niet-http(s)) template. Een lege string betekent voor de caller: niets renderen.
 *
 * De bewerkte bronwaarde wordt met encodeURIComponent ge-encodeerd VÓÓRDAT die in
 * alle `{xxx}`-placeholders van de template wordt gesubstitueerd, zodat spaties en
 * tekens als `&`/`/` de URL niet breken.
 *
 * @param {{ options?: { urlTemplate?: string, sourceColumnKey?: string, transforms?: Array } }} column
 * @param {Record<string, unknown>} [rowValues] - de `values`-map van de order/rij
 * @returns {string} de volledige URL, of '' als er niets te renderen is
 */
export function resolveImageUrl(column, rowValues) {
  const options = column?.options;
  if (!options || typeof options !== 'object') return '';

  const { urlTemplate, sourceColumnKey } = options;
  if (typeof urlTemplate !== 'string' || !urlTemplate) return '';
  if (typeof sourceColumnKey !== 'string' || !sourceColumnKey) return '';

  // Defensieve veiligheidscheck: alleen http(s) toestaan (backend valideert dit ook).
  if (!/^https?:\/\//i.test(urlTemplate)) return '';

  const raw = rowValues?.[sourceColumnKey];
  if (raw === undefined || raw === null || raw === '') return '';

  let value = String(raw);
  const transforms = Array.isArray(options.transforms) ? options.transforms : [];
  for (const transform of transforms) {
    value = applyTransform(value, transform);
  }

  const encoded = encodeURIComponent(value);
  // Vervang alle {xxx}-placeholders door de ge-encodeerde waarde.
  return urlTemplate.split('{xxx}').join(encoded);
}
