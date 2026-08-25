/**************************************************************************/
/*  build-community-snapshot.cjs                                         */
/**************************************************************************/
'use strict';
const fs = require('node:fs');
const contract = require('./community-contract.cjs');
const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw new Error('usage: node build-community-snapshot.cjs <source> <output>');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const { catalog } = contract.normalizeCatalog(source);
fs.writeFileSync(outputPath, JSON.stringify(catalog));
