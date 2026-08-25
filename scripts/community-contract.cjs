/**************************************************************************/
/*  community-contract.cjs                                               */
/**************************************************************************/
'use strict';

const CURRENT_SCHEMA = 1;

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function cleanString(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function httpsUrl(value) {
  if (typeof value !== 'string' || !value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && Boolean(url.hostname) ? url : null;
  } catch {
    return null;
  }
}
function normalizeEntry(value) {
  const row = asObject(value);
  if (!row) throw new Error('Invalid community row');
  const id = cleanString(row.id, 80).toLowerCase();
  const name = cleanString(row.name, 120);
  const created_at = cleanString(row.created_at, 80);
  const region = cleanString(row.region, 100);
  const country = cleanString(row.country, 80);
  const description = cleanString(row.description, 1500);
  const tags = Array.isArray(row.tags)
    ? row.tags.map(tag => cleanString(tag, 40)).filter(Boolean)
    : [];
  const links = Array.isArray(row.links)
    ? row.links.map(link => {
        const item = asObject(link);
        if (!item) throw new Error('Invalid community link');
        return {
          label: cleanString(item.label, 40),
          kind: cleanString(item.kind, 30),
          url: cleanString(item.url, 2048),
        };
      })
    : [];
  const normalized = { id, ...(created_at ? { created_at } : {}), name, region, country, description, tags, links };
  validateEntry(normalized);
  return normalized;
}
function validateEntry(row) {
  if (!/^[a-z0-9-]{1,80}$/.test(row.id)
      || !row.name || row.name.length > 120
      || row.region.length > 100 || row.country.length > 80
      || !row.description || row.description.length > 1500
      || row.tags.length > 16 || row.links.length > 16
      || row.tags.some(tag => !tag || [...tag].length > 40)) {
    throw new Error('Community row violates the stable schema-1 core');
  }
  for (const link of row.links) {
    if (!link.label || link.label.length > 40 || !link.kind || link.kind.length > 30 || !httpsUrl(link.url)) {
      throw new Error('Community link violates the stable schema-1 core');
    }
  }
}
function normalizeCatalog(value) {
  const source = asObject(value);
  if (!source) throw new Error('Community catalog must be an object');
  const schemaMissing = source.schema === undefined;
  const parsedSchema = schemaMissing ? 0 : Number(source.schema);
  if (!Number.isSafeInteger(parsedSchema) || parsedSchema < 0 || (!schemaMissing && parsedSchema < 1)) {
    throw new Error('Invalid community catalog schema');
  }

  // Major-version compatibility contract: future documents must either preserve
  // the stable schema-1 core additively or expose an explicit compat_v1 view.
  // Readers project that known core without rewriting/downgrading future source.
  const projectionSource = parsedSchema > CURRENT_SCHEMA && asObject(source.compat_v1)
    ? source.compat_v1
    : source;
  const communities = Array.isArray(projectionSource.communities) ? projectionSource.communities : null;
  if (!communities || communities.length > 250) throw new Error('Invalid community catalog rows');
  const rows = communities.map(normalizeEntry);
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error('Duplicate community id');
    ids.add(row.id);
  }
  const updated_at = cleanString(projectionSource.updated_at || source.updated_at || '', 80);
  return {
    source_schema: parsedSchema,
    needs_upgrade: parsedSchema < CURRENT_SCHEMA,
    catalog: { schema: CURRENT_SCHEMA, updated_at, communities: rows },
  };
}

module.exports = { CURRENT_SCHEMA, httpsUrl, validateEntry, normalizeEntry, normalizeCatalog };
