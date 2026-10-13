import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const cwd = new URL('../', import.meta.url);
const run = args => spawnSync(process.execPath, ['cli.mjs', ...args], { cwd, encoding: 'utf8' });

test('CLI JSON output is parseable and agrees with the worked example', () => {
  const result = run(['examples/imperial-24ft.json']);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).blocks.order, 119);
  assert.equal(result.stderr, '');
});
test('CLI metric fixture succeeds', () => {
  const result = run(['examples/metric-7-2m.json']);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).blocks.order, 99);
});
test('CLI exports CSV instead of JSON when requested', () => {
  const result = run(['examples/imperial-24ft.json', '--format', 'csv']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.startsWith('"material","quantity_kind"'));
});
test('CLI help is available without an input file', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
});
test('invalid CLI flags and a missing file exit with no estimate', () => {
  for (const args of [[], ['--unexpected'], ['examples/imperial-24ft.json', '--format', 'html'], ['examples/no-file.json']]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Estimate failed:/);
  }
});
test('malformed and oversized JSON files are rejected', () => {
  const directory = mkdtempSync(join(tmpdir(), 'rwc-cli-'));
  try {
    const bad = join(directory, 'invalid.json');
    const big = join(directory, 'oversized.json');
    writeFileSync(bad, '{');
    writeFileSync(big, ' '.repeat(256 * 1024 + 1));
    for (const input of [bad, big]) {
      const result = run([input]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
