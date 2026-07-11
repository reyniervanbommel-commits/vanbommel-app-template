#!/usr/bin/env node
/**
 * Maak een Azure DevOps Feature + child User Stories aan vanuit een docs/devops/*.md bestand.
 *
 * Vereist:
 *   AZURE_DEVOPS_EXT_PAT  — Personal Access Token (Work Items: Read, Write & Manage)
 *   AZURE_DEVOPS_ORG      — default: reyniervanbommel0745
 *   AZURE_DEVOPS_PROJECT  — default: Vendor-App
 *
 * Gebruik:
 *   node scripts/devops/create-work-item.mjs docs/devops/test-suite-en-skills.md
 */

import fs from 'fs';
import path from 'path';

const ORG = process.env.AZURE_DEVOPS_ORG || 'reyniervanbommel0745';
const PROJECT = process.env.AZURE_DEVOPS_PROJECT || 'Vendor-App';
const PAT = process.env.AZURE_DEVOPS_EXT_PAT;

const docPath = process.argv[2];
if (!docPath) {
  console.error('Gebruik: node scripts/devops/create-work-item.mjs <docs/devops/bestand.md>');
  process.exit(1);
}
if (!PAT) {
  console.error('AZURE_DEVOPS_EXT_PAT ontbreekt. Stel een PAT in met Work Items Read/Write scope.');
  process.exit(1);
}

const doc = fs.readFileSync(docPath, 'utf8');
const titleMatch = doc.match(/^# (.+?) \(DevOps\)/m);
const title = titleMatch ? titleMatch[1] : path.basename(docPath, '.md');
const tagsMatch = doc.match(/\*\*Tags:\*\* (.+)/);
const tags = tagsMatch ? tagsMatch[1].trim() : '';

const storyBlocks = [...doc.matchAll(/### Story ([A-Z]): ([^\n]+)\n\n\*\*Beschrijving:\*\* ([^\n]+)/g)];
const stories = storyBlocks.map((m) => ({
  title: `Story ${m[1]}: ${m[2].trim()}`,
  description: m[3].trim(),
}));

const baseUrl = `https://dev.azure.com/${ORG}/${encodeURIComponent(PROJECT)}`;
const auth = Buffer.from(`:${PAT}`).toString('base64');

async function api(method, urlPath, body) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${urlPath} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

function patchDescription(html) {
  return [{ op: 'add', path: '/fields/System.Description', value: html }];
}

function patchTags(tagStr) {
  return tagStr ? [{ op: 'add', path: '/fields/System.Tags', value: tagStr }] : [];
}

async function createWorkItem(type, fields) {
  const patch = [
    { op: 'add', path: '/fields/System.Title', value: fields.title },
    ...patchDescription(fields.description),
    ...patchTags(fields.tags || ''),
  ];
  return api('POST', `/_apis/wit/workitems/$${type}?api-version=7.0`, patch);
}

async function addChild(parentId, childId) {
  return api(
    'PATCH',
    `/_apis/wit/workitems/${childId}?api-version=7.0`,
    [{ op: 'add', path: '/relations/-', value: { rel: 'System.LinkTypes.Hierarchy-Reverse', url: `${baseUrl}/_apis/wit/workitems/${parentId}` } }],
  );
}

const repoDocLine = `\n\nRepo-document: ${docPath.replace(/\\/g, '/')}`;
const featureDescription = doc + repoDocLine;

const feature = await createWorkItem('Feature', {
  title,
  description: featureDescription,
  tags,
});

console.log(`Feature aangemaakt: #${feature.id}`);
console.log(`URL: ${baseUrl}/_workitems/edit/${feature.id}`);

for (const story of stories) {
  const item = await createWorkItem('User Story', {
    title: story.title,
    description: `${story.description}\n\nParent Feature: #${feature.id}`,
    tags,
  });
  await addChild(feature.id, item.id);
  console.log(`  Child story: #${item.id} — ${story.title}`);
}

const id = feature.id;
const shortName = path.basename(docPath, '.md').replace(/^test-suite-en-skills$/, 'test-suite-en-skills');
const targetName = `docs/devops/${id}-${shortName}.md`;
if (docPath !== targetName) {
  const updated = doc.replace(
    /^# .+$/m,
    `# ${title} (DevOps)\n\n**Work item:** [Feature #${id}](${baseUrl}/_workitems/edit/${id})`,
  );
  fs.writeFileSync(targetName, updated);
  if (docPath !== targetName && fs.existsSync(docPath)) {
    fs.unlinkSync(docPath);
  }
  console.log(`Document hernoemd naar: ${targetName}`);
}

console.log(`\nKlaar. Work item #${id} aangemaakt.`);
