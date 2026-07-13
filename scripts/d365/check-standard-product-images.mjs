#!/usr/bin/env node

import settingsService from '../../server/services/SettingsService.js';
import d365ODataService from '../../server/services/D365ODataService.js';

const ENTITY_NAME_PATTERN = /ReleasedProductDocument|ProductDocument|DocumentAttachment/i;

async function main() {
  const baseUrl = String(await settingsService.getAsync('D365_ODATA_BASE_URL') || '').replace(/\/$/, '');
  const token = await d365ODataService.getAccessToken();
  if (!baseUrl || !token) {
    console.log(JSON.stringify({
      baseUrlConfigured: Boolean(baseUrl),
      oauthConfigured: Boolean(token),
      entitySets: [],
    }, null, 2));
    throw new Error('D365 basis-URL of OAuth ontbreekt');
  }

  const response = await fetch(`${baseUrl}/data/$metadata`, {
    headers: {
      Accept: 'application/xml',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error(`Metadata ophalen mislukt: HTTP ${response.status}`);

  const xml = await response.text();
  const entitySets = xml
    .split('<EntitySet Name="')
    .slice(1)
    .map((entry) => entry.split('"')[0])
    .filter((name) => ENTITY_NAME_PATTERN.test(name));

  console.log(JSON.stringify({
    baseHost: new URL(baseUrl).host,
    entitySets,
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
