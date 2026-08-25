/**************************************************************************/
/*  migrate-community-catalog.cjs                                       */
/**************************************************************************/
'use strict';
const fs = require('node:fs');
const contract = require('./community-contract.cjs');
const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw new Error('usage: node migrate-community-catalog.cjs <source> <output>');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const result = contract.normalizeCatalog(source);
if (!result.needs_upgrade) {
  try { fs.rmSync(outputPath, { force:true }); } catch {}
  process.stdout.write(`no-upgrade source_schema=${result.source_schema} current_schema=${contract.CURRENT_SCHEMA}\n`);
  process.exit(0);
}
// Only deterministic OLD -> CURRENT migrations are written. A future source is
// never rewritten by an older workflow, even when it exposes compat_v1.
fs.writeFileSync(outputPath, `${JSON.stringify(result.catalog, null, 2)}\n`, { encoding:'utf8', mode:0o600 });
process.stdout.write(`upgrade source_schema=${result.source_schema} current_schema=${contract.CURRENT_SCHEMA}\n`);
