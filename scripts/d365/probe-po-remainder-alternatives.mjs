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

async function fetchJson(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  return { status: res.status, text, json: res.ok ? JSON.parse(text) : null };
}

function entityBlock(xml, name) {
  return (xml.match(new RegExp(`<EntityType Name="${name}"[\\s\\S]*?<\\/EntityType>`)) || [''])[0];
}

function listProps(block) {
  return [...block.matchAll(/<Property Name="([^"]+)"/g)].map((m) => m[1]);
}

async function probeEntity({ baseUrl, token, entitySet, selectFields, company }) {
  const params = new URLSearchParams({
    $top: '3',
    'cross-company': 'true',
  });
  if (selectFields?.length) params.set('$select', selectFields.join(','));
  if (company) params.set('$filter', `dataAreaId eq '${company.replace(/'/g, "''")}'`);
  const url = `${baseUrl}/data/${entitySet}?${params}`;
  const result = await fetchJson(url, token);
  const rows = Array.isArray(result.json?.value) ? result.json.value : [];
  return { entitySet, status: result.status, rowCount: rows.length, sample: rows[0] || null, error: result.status >= 400 ? result.text.slice(0, 220) : null };
}

async function main() {
  const baseUrl = getBaseUrlFromEnv();
  const token = await getAccessToken();
  const company = String(process.env.D365_ODATA_COMPANY || '').trim();

  const metaRes = await fetch(`${baseUrl}/data/$metadata`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/xml' },
  });
  const xml = await metaRes.text();

  const candidates = [
    'ProductReceiptLineV2',
    'ReceivedProductReleaseLineV2',
    'InventTransCDSEntity',
    'InventTransArchiveEntity',
    'PurchLineBiEntity',
  ];

  console.log('\n=== Entity metadata (quantity-related properties) ===\n');
  for (const name of candidates) {
    const block = entityBlock(xml, name);
    if (!block) {
      console.log(`■ ${name}: NOT in metadata`);
      continue;
    }
    const props = listProps(block);
    const qty = props.filter((p) => /quantity|remain|received|physical|purch|order|line|invent/i.test(p));
    console.log(`■ ${name}`);
    console.log(`  Qty-related: ${qty.slice(0, 20).join(', ') || '(none)'}`);
  }

  const probes = [
    {
      entitySet: 'ProductReceiptLineV2',
      selectFields: ['dataAreaId', 'PurchaseOrderNumber', 'PurchaseOrderLineNumber', 'ReceivedPurchaseQuantity', 'ProductReceiptNumber', 'ItemNumber'],
    },
    {
      entitySet: 'ReceivedProductReleaseLineV2',
      selectFields: ['dataAreaId', 'PurchaseOrderNumber', 'LineNumber', 'OrderedPurchaseQuantity', 'RemainingPurchasePhysicalQuantity', 'ItemNumber'],
    },
    {
      entitySet: 'InventTransCDSEntity',
      selectFields: ['dataAreaId', 'ItemNumber', 'Quantity', 'StatusIssue', 'StatusReceipt', 'ReferenceCategory'],
    },
    {
      entitySet: 'PurchaseOrderLinesV2',
      selectFields: ['dataAreaId', 'PurchaseOrderNumber', 'LineNumber', 'OrderedPurchaseQuantity', 'PurchaseOrderLineStatus'],
    },
  ];

  console.log('\n=== OData probes ===\n');
  for (const probe of probes) {
    const result = await probeEntity({ baseUrl, token, company, ...probe });
    console.log(`■ ${result.entitySet} → HTTP ${result.status}, rows: ${result.rowCount}`);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.sample) console.log(`  Sample keys: ${Object.keys(result.sample).slice(0, 12).join(', ')}`);
    if (result.sample) console.log(`  Sample: ${JSON.stringify(result.sample).slice(0, 400)}`);
    console.log('');
  }
  console.log('\n=== Join key samples ===\n');
  const joinProbes = [
    {
      entitySet: 'PurchLineBiEntities',
      selectFields: ['dataAreaId', 'PurchaseOrderNumber', 'LineNumber', 'RemainPurchPhysical', 'PurchQty', 'PurchStatus', 'ItemNumber'],
    },
    {
      entitySet: 'ProductReceiptLinesV2',
      selectFields: ['dataAreaId', 'PurchaseOrderNumber', 'PurchaseOrderLineNumber', 'ReceivedPurchaseQuantity', 'RemainingPurchaseQuantity', 'OrderedPurchaseQuantity', 'ItemNumber'],
    },
  ];
  for (const probe of joinProbes) {
    const result = await probeEntity({ baseUrl, token, company, ...probe });
    console.log(`■ ${result.entitySet} → HTTP ${result.status}`);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.status === 200) {
      const full = await fetchJson(
        `${baseUrl}/data/${probe.entitySet}?${new URLSearchParams({
          $top: '3',
          'cross-company': 'true',
          $select: probe.selectFields.join(','),
          ...(company ? { $filter: `dataAreaId eq '${company.replace(/'/g, "''")}'` } : {}),
        })}`,
        token,
      );
      for (const row of full.json?.value || []) {
        console.log(`  ${JSON.stringify(row)}`);
      }
    }
    console.log('');
  }

  const biSample = await fetchJson(
    `${baseUrl}/data/PurchLineBiEntities?${new URLSearchParams({
      $top: '1',
      'cross-company': 'true',
      ...(company ? { $filter: `dataAreaId eq '${company.replace(/'/g, "''")}'` } : {}),
    })}`,
    token,
  );
  if (biSample.json?.value?.[0]) {
    const row = biSample.json.value[0];
    console.log('PurchLineBiEntities join-ish fields:', Object.keys(row).filter((k) => /purch|order|line|remain|item|invent|orig/i.test(k)).join(', '));
    console.log('PurchLineBiEntities sample subset:', JSON.stringify({
      dataAreaId: row.dataAreaId,
      LineNumber: row.LineNumber,
      RemainPurchPhysical: row.RemainPurchPhysical,
      PurchQty: row.PurchQty,
      PurchStatus: row.PurchStatus,
      InventTransId: row.InventTransId,
      InventRefId: row.InventRefId,
      OrigPurchId: row.OrigPurchId,
      PurchId: row.PurchId,
    }));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
