#!/usr/bin/env node
'use strict';

/**
 * inspect-metadata.mjs — haalt het D365 OData $metadata-document op en print
 * alleen de entiteiten die matchen op een zoekterm, met hun Key-velden en
 * NavigationProperties. Zo hoef je het enorme $metadata niet zelf te lezen.
 *
 * Gebruik (PowerShell):
 *   $env:D365_ODATA_BASE_URL = "https://<jouw-d365>.cloudax.dynamics.com"
 *   $env:D365_ODATA_BEARER_TOKEN = "<geldig token>"
 *   node scripts/d365/inspect-metadata.mjs Purchase
 *
 * Argument = filter op entiteitsnaam (default: "Purchase"). Hoofdletterongevoelig.
 */

const baseUrlRaw = process.env.D365_ODATA_BASE_URL;
const token = process.env.D365_ODATA_BEARER_TOKEN;
const filter = (process.argv[2] || 'Purchase').toLowerCase();

if (!baseUrlRaw) {
  console.error('Zet D365_ODATA_BASE_URL als env var.');
  process.exit(1);
}

const baseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw.slice(0, -1) : baseUrlRaw;
const url = `${baseUrl}/data/$metadata`;

const headers = { Accept: 'application/xml' };
if (token) headers.Authorization = `Bearer ${token}`;

const res = await fetch(url, { headers });
if (!res.ok) {
  console.error(`$metadata ophalen mislukt: HTTP ${res.status}`);
  process.exit(1);
}
const xml = await res.text();

// Knip het document in losse <EntityType ...>...</EntityType> blokken.
const blocks = xml.match(/<EntityType\b[\s\S]*?<\/EntityType>/g) || [];

const nameOf = (block) => (block.match(/<EntityType\s+Name="([^"]+)"/) || [])[1] || '';
const matches = blocks.filter((b) => nameOf(b).toLowerCase().includes(filter));

if (!matches.length) {
  console.log(`Geen entiteiten gevonden die "${filter}" bevatten.`);
  process.exit(0);
}

console.log(`\n${matches.length} entiteit(en) met "${filter}":\n`);

for (const block of matches) {
  const name = nameOf(block);
  const keys = [...block.matchAll(/<PropertyRef\s+Name="([^"]+)"/g)].map((m) => m[1]);
  const navs = [...block.matchAll(/<NavigationProperty\s+Name="([^"]+)"\s+Type="([^"]+)"/g)]
    .map((m) => `${m[1]}  →  ${m[2].replace(/^Collection\(/, '[]').replace(/\)$/, '').replace(/^.*\./, '')}`);

  console.log(`■ ${name}`);
  console.log(`  Key:  ${keys.join(', ') || '(geen)'}`);
  if (navs.length) {
    console.log('  Links (NavigationProperty):');
    navs.forEach((n) => console.log(`    - ${n}`));
  } else {
    console.log('  Links: GEEN navigation property → client-side joinen op de Key hierboven');
  }
  console.log('');
}
