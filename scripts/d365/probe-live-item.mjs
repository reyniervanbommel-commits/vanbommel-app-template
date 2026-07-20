#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config();

const base = String(process.env.D365_ODATA_BASE_URL || '').replace(/\/$/, '');
const tenant = process.env.D365_ODATA_TENANT_ID;
const client = process.env.D365_ODATA_CLIENT_ID;
const secret = process.env.D365_ODATA_CLIENT_SECRET;
const item = process.argv[2] || 'SBM-10018-24-01';

const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: client,
    client_secret: secret,
    scope: `${base}/.default`,
  }),
});
const tokenJson = await tokenRes.json();
const token = tokenJson.access_token;

async function query(path, filter, top = 5) {
  const url = new URL(`${base}${path}`);
  url.searchParams.set('$top', String(top));
  if (filter) url.searchParams.set('$filter', filter);
  url.searchParams.set('cross-company', 'true');
  const response = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(async () => ({ raw: await response.text() }));
  const count = Array.isArray(payload?.value) ? payload.value.length : 0;
  console.log('\n', path, 'HTTP', response.status, 'count', count);
  if (!response.ok) {
    console.log(JSON.stringify(payload, null, 2).slice(0, 600));
    return;
  }
  if (Array.isArray(payload.value)) {
    for (const row of payload.value) {
      const summary = {
        dataAreaId: row.dataAreaId,
        ItemNumber: row.ItemNumber,
        ProductNumber: row.ProductNumber,
        FileType: row.FileType,
        IsProductImage: row.IsProductImage,
        IsDefaultProductImage: row.IsDefaultProductImage,
        AttachedDateTime: row.AttachedDateTime,
        DocumentAttachmentType: row.DocumentAttachmentType,
        FileName: row.FileName,
        hasAttachment: typeof row.Attachment === 'string' && row.Attachment.length > 0,
        attachmentLength: typeof row.Attachment === 'string' ? row.Attachment.length : 0,
      };
      console.log(JSON.stringify(summary));
    }
  }
}

await query('/data/ReleasedProductsV2', `dataAreaId eq 'whsl' and ItemNumber eq '${item}'`);
await query('/data/ReleasedProductDocumentAttachments', `ItemNumber eq '${item}'`, 10);
await query('/data/ProductDocumentAttachments', `ProductNumber eq '${item}'`, 10);
await query(
  '/data/ProductDocumentAttachments',
  `ProductNumber eq '${item}' and DocumentAttachmentTypeLegalEntityId eq 'whsl'`,
  10,
);
