import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arcLength, estimatePackages, estimateProject, materialListCsv } from '../src/index.mjs';

const fixture = name => JSON.parse(readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8'));
const fresh = () => fixture('imperial-24ft');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} differs from ${expected}`);

test('24 ft hand takeoff: 18 per course, 90 visible, 18 buried, 119 order and 20 caps', () => {
  const result = estimateProject(fresh());
  assert.equal(result.sections[0].unitsPerCourse, 18);
  assert.equal(result.sections[0].visibleCourses, 5);
  assert.deepEqual(result.blocks, { visible: 90, buried: 18, net: 108, allowancePercent: 10, order: 119, extra: 11 });
  assert.deepEqual(result.caps, { net: 18, allowancePercent: 10, order: 20, extra: 2 });
});

test('separate stone quantities match 22 and 60 cubic feet before allowance', () => {
  const { aggregate } = estimateProject(fresh());
  close(aggregate.base.net, 22 / 27);
  close(aggregate.base.order, 121 / 135);
  close(aggregate.drainage.netZone, 60 / 27);
  close(aggregate.drainage.order, 22 / 9);
  assert.equal(aggregate.base.order.toFixed(2), '0.90');
  assert.equal(aggregate.drainage.order.toFixed(2), '2.44');
  assert.equal(aggregate.total.order.toFixed(2), '3.34');
});

test('metric example has 18 per course, 72 visible, 90 net and 99 order', () => {
  const result = estimateProject(fixture('metric-7-2m'));
  assert.equal(result.sections[0].unitsPerCourse, 18);
  assert.equal(result.blocks.visible, 72);
  assert.equal(result.blocks.net, 90);
  assert.equal(result.blocks.order, 99);
  assert.equal(result.aggregate.unit, 'm3');
  assert.equal(result.caps, null);
});

test('section-by-section rounding avoids replacing different heights with an average', () => {
  const result = estimateProject(fixture('stepped-two-sections'));
  assert.deepEqual(result.sections.map(s => s.visibleCourses), [4, 7]);
  assert.deepEqual(result.sections.map(s => s.netBlocks), [45, 72]);
  assert.equal(result.blocks.net, 117);
  assert.equal(result.blocks.order, 129);
});

test('equivalent physical metric and imperial inputs preserve counts and convert volume', () => {
  const metric = fresh();
  metric.units = 'metric';
  metric.segments = [{ length: 7.3152, exposedHeight: 0.762 }];
  metric.block = { length: 406.4, height: 152.4 };
  metric.caps.length = 406.4;
  metric.base.width = 558.8;
  metric.base.depth = 152.4;
  metric.drainage.width = 304.8;
  metric.drainage.soilCap = 152.4;
  const a = estimateProject(fresh());
  const b = estimateProject(metric);
  assert.deepEqual(a.blocks, b.blocks);
  assert.deepEqual(a.caps, b.caps);
  close(b.aggregate.total.order, a.aggregate.total.order * 0.764554857984);
});

test('whole package supply stays distinct from 119 required order units', () => {
  const result = estimateProject(fresh());
  assert.equal(result.blocks.order, 119);
  assert.deepEqual(result.packaging.blocks, { requiredUnits: 119, unitsPerPackage: 75, packages: 2, suppliedUnits: 150, overOrder: 31 });
  assert.equal(estimatePackages(0, 75).packages, 0);
});

test('no buried courses and zero allowances retain the exact visible count', () => {
  const input = fresh();
  input.buriedCourses = 0;
  input.blockAllowancePercent = 0;
  assert.deepEqual(estimateProject(input).blocks, { visible: 90, buried: 0, net: 90, allowancePercent: 0, order: 90, extra: 0 });
});

test('positive partial courses and tiny runs still require one unit and one course', () => {
  const input = fixture('metric-7-2m');
  input.segments = [{ length: 1e-12, exposedHeight: 1e-12 }];
  input.buriedCourses = 0;
  input.blockAllowancePercent = 0;
  assert.equal(estimateProject(input).blocks.order, 1);
});

test('floating-point noise at a whole-course boundary does not create an extra course', () => {
  const input = fixture('metric-7-2m');
  input.block.height = 100;
  input.segments = [{ length: 7.2, exposedHeight: 0.1 + 0.2 }];
  assert.equal(estimateProject(input).sections[0].visibleCourses, 3);
});

test('drainage below a soil cap is clamped to zero without discarding specified core fill', () => {
  const input = fresh();
  input.drainage.soilCap = 100;
  input.drainage.coreFillPerBlock = 0.25;
  const { drainage } = estimateProject(input).aggregate;
  assert.equal(drainage.netZone, 0);
  close(drainage.netCore, 1);
  close(drainage.order, 1.1);
});

test('core fill uses net blocks, not spare or whole-pallet blocks', () => {
  const input = fresh();
  input.drainage.coreFillPerBlock = 0.5;
  close(estimateProject(input).aggregate.drainage.netCore, 2);
});

test('cap package rounding works independently from block packages', () => {
  const input = fresh();
  input.packaging.capsPerPackage = 12;
  assert.equal(estimateProject(input).packaging.caps.suppliedUnits, 24);
});

test('a reference quarter circle is 5 pi long and still uses full course counts', () => {
  close(arcLength(10, 90), 5 * Math.PI);
  const input = fixture('metric-7-2m');
  input.units = 'imperial';
  input.block = { length: 16, height: 6 };
  input.segments = [{ length: arcLength(10, 90), exposedHeight: 2.5 }];
  assert.equal(estimateProject(input).blocks.net, 72);
  assert.equal(estimateProject(input).blocks.order, 80);
});

test('CSV labels package supply as an alternative and keeps stone products separate', () => {
  const csv = materialListCsv(estimateProject(fresh()));
  assert.match(csv, /"Wall blocks","order","119","blocks"/);
  assert.match(csv, /"Wall blocks","package_supply","150","blocks"/);
  assert.match(csv, /"Base aggregate","order"/);
  assert.match(csv, /"Drainage and core-fill stone","order"/);
  assert.ok(csv.endsWith('\n'));
});

test('outputs are repeatable and inputs are not mutated', () => {
  const input = fresh();
  const before = JSON.stringify(input);
  assert.deepEqual(estimateProject(input), estimateProject(input));
  assert.equal(JSON.stringify(input), before);
});

test('allowance and package invariants hold across varied project dimensions', () => {
  for (let i = 1; i <= 120; i++) {
    const input = fixture('metric-7-2m');
    input.segments = [{ length: i / 7, exposedHeight: 0.2 + (i % 13) / 10 }];
    input.blockAllowancePercent = i % 101;
    const result = estimateProject(input);
    assert.ok(result.blocks.order >= result.blocks.net);
    assert.ok(result.blocks.order >= result.blocks.net * (1 + input.blockAllowancePercent / 100) - 1e-9);
    const pack = estimatePackages(result.blocks.order, 17);
    assert.ok(pack.suppliedUnits >= result.blocks.order);
    assert.ok(pack.overOrder < 17);
  }
});

const invalid = [
  ['unsupported units', input => { input.units = 'usa'; }],
  ['numeric strings', input => { input.block.length = '16'; }],
  ['zero dimensions', input => { input.block.height = 0; }],
  ['non-finite dimensions', input => { input.block.length = Infinity; }],
  ['negative allowances', input => { input.blockAllowancePercent = -1; }],
  ['allowances over 100%', input => { input.base.allowancePercent = 101; }],
  ['fractional buried courses', input => { input.buriedCourses = 1.5; }],
  ['fractional packages', input => { input.packaging.blocksPerPackage = 75.5; }],
  ['negative soil cap', input => { input.drainage.soilCap = -1; }],
  ['empty sections', input => { input.segments = []; }],
  ['too many sections', input => { input.segments = Array(21).fill({ length: 1, exposedHeight: 1 }); }],
  ['unknown field', input => { input.block.wdith = 10; }],
  ['unknown schema', input => { input.schemaVersion = 2; }],
  ['missing required field', input => { delete input.buriedCourses; }],
  ['disabled caps with cap packages', input => { delete input.caps; input.packaging.capsPerPackage = 12; }],
  ['unsafe count range', input => { input.block.height = 1e-8; }]
];
for (const [label, change] of invalid) {
  test(`rejects ${label}`, () => { const input = fresh(); change(input); assert.throws(() => estimateProject(input)); });
}

test('arc and package helpers reject invalid geometry and quantities', () => {
  assert.throws(() => arcLength(10, 361));
  assert.throws(() => arcLength(0, 90));
  assert.throws(() => estimatePackages(119.5, 75));
  assert.throws(() => estimatePackages(119, 0));
});
