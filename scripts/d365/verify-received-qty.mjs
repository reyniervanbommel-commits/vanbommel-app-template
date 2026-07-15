#!/usr/bin/env node
'use strict';

import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();
const require = createRequire(import.meta.url);
const { getAccessToken } = require('../../server/services/D365ODataService.js');

function getBaseUrlFromEnv() {
  const raw = String(process.env.D365_ODATA_BASE_URL || '').trim();
  if (!raw) throw new Error('D365_ODATA_BASE_URL missing');
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

async function main() {
  const baseUrl = getBaseUrlFromEnv();
  const token = await getAccessToken();
  const metaRes = await fetch(`${baseUrl}/data/$metadata`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/xml' },
  });
  if (!metaRes.ok) {
    console.error('metadata failed', metaRes.status);
    process.exit(1);
  }
  const xml = await metaRes.text();
  const block = (xml.match(/<EntityType Name="PurchaseOrderLineV2"[\s\S]*?<\/EntityType>/) || [''])[0];
  const props = [...block.matchAll(/<Property Name="([^"]+)"/g)].map((m) => m[1]);
  const qtyFields = props.filter((p) => /quantity|remain|received|physical|deliver|status/i.test(p));
  console.log('RemainingPurchasePhysicalQuantity in metadata:', props.includes('RemainingPurchasePhysicalQuantity'));
  console.log('ReceivedPurchaseQuantity in metadata:', props.includes('ReceivedPurchaseQuantity'));
  console.log('PurchaseOrderLineStatus in metadata:', props.includes('PurchaseOrderLineStatus'));
  console.log('Quantity-related fields:', qtyFields.join(', '));

  const company = String(process.env.D365_ODATA_COMPANY || '').trim();
  const params = new URLSearchParams({
    $top: '1',
    'cross-company': 'true',
    $select: 'OrderedPurchaseQuantity,RemainingPurchasePhysicalQuantity,PurchaseOrderLineStatus',
  });
  if (company) params.set('$filter', `dataAreaId eq '${company.replace(/'/g, "''")}'`);
  const testUrl = `${baseUrl}/data/PurchaseOrderLinesV2?${params}`;
  const testRes = await fetch(testUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  console.log('OData probe status:', testRes.status);
  const body = await testRes.text();
  console.log('OData probe body:', body.slice(0, 800));

  const entityNames = [...xml.matchAll(/EntityType Name="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((n) => /receipt|inventtrans|remain|received|purchline/i.test(n));
  console.log('\nRelated entity types (sample):');
  entityNames.slice(0, 25).forEach((n) => console.log(' -', n));
  console.log('Total related entity types:', entityNames.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
