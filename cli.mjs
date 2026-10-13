#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { estimateProject, materialListCsv } from './src/index.mjs';

const help = `Retaining Wall Materials — selected material quantities only

Usage:
  node cli.mjs examples/imperial-24ft.json
  node cli.mjs examples/imperial-24ft.json --format csv
  node cli.mjs examples/metric-7-2m.json

JSON is the default format. CSV includes separate net, order and package rows.
Use Node.js 22 or 24. No installation or network request is required.
`;
const args = process.argv.slice(2);
if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  process.stdout.write(help);
} else {
  try {
    if (!(args.length === 1 || (args.length === 3 && args[1] === '--format'
      && ['json', 'csv'].includes(args[2]))) || args[0]?.startsWith('-')) {
      throw new Error('Use one JSON input file and an optional --format json or --format csv. Use --help for examples.');
    }
    const file = statSync(args[0]);
    if (!file.isFile() || file.size > 256 * 1024) throw new Error('Input must be a regular JSON file no larger than 256 KiB.');
    const result = estimateProject(JSON.parse(readFileSync(args[0], 'utf8')));
    process.stdout.write(args[2] === 'csv' ? materialListCsv(result) : JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`Estimate failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
