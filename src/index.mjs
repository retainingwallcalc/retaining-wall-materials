/** Material quantities only. Inputs are selected geometry, not design requirements. */
const EPSILON = 1e-9;
const MAX_COUNT = 1_000_000_000;
export const VERSION = '1.0.0';

function object(value, label, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new TypeError(`Unknown ${label} field: ${key}.`);
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${label}.${key} is required.`);
  }
}

function number(value, label, { min = 0, max = MAX_COUNT, positive = false, integer = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max
      || (positive && value === 0) || (integer && !Number.isInteger(value))) {
    throw new RangeError(`${label} must be a finite ${integer ? 'whole ' : ''}number ${positive ? 'greater than 0' : `at least ${min}`} and at most ${max}.`);
  }
  return value;
}

function wholeUp(value, label) {
  number(value, label);
  // Avoid an extra unit from negligible floating-point noise at an exact boundary.
  return value === 0 ? 0 : Math.max(1, Math.ceil(value - EPSILON));
}

function withAllowance(net, percent, whole = false) {
  number(percent, 'allowancePercent', { max: 100 });
  const result = net * (1 + percent / 100);
  return whole ? wholeUp(result, 'order count') : number(result, 'order volume');
}

/** Circular reference-arc length; radius and result use the same length unit. */
export function arcLength(radius, angleDegrees) {
  number(radius, 'radius', { positive: true, max: 10_000 });
  number(angleDegrees, 'angleDegrees', { positive: true, max: 360 });
  return radius * angleDegrees * Math.PI / 180;
}

/** Package rounding does not replace the required order quantity. */
export function estimatePackages(requiredUnits, unitsPerPackage) {
  number(requiredUnits, 'requiredUnits', { integer: true });
  number(unitsPerPackage, 'unitsPerPackage', { positive: true, integer: true, max: 1_000_000 });
  const packages = wholeUp(requiredUnits / unitsPerPackage, 'package count');
  const suppliedUnits = number(packages * unitsPerPackage, 'suppliedUnits');
  return { requiredUnits, unitsPerPackage, packages, suppliedUnits, overOrder: suppliedUnits - requiredUnits };
}

/**
 * Project dimensions: ft and in for imperial; m and mm for metric.
 * Per-block core fill: ft3 for imperial; m3 for metric.
 * Output stone volume: yd3 for imperial; m3 for metric.
 */
export function estimateProject(project) {
  object(project, 'project', ['schemaVersion', 'units', 'segments', 'block', 'buriedCourses',
    'blockAllowancePercent', 'caps', 'base', 'drainage', 'packaging'],
  ['schemaVersion', 'units', 'segments', 'block', 'buriedCourses', 'blockAllowancePercent']);
  if (project.schemaVersion !== 1) throw new RangeError('schemaVersion must be 1.');
  if (!['imperial', 'metric'].includes(project.units)) throw new RangeError('units must be imperial or metric.');
  const imperial = project.units === 'imperial';
  const smallToLarge = imperial ? 1 / 12 : 1 / 1000;
  const volumeDivisor = imperial ? 27 : 1;
  const linearUnit = imperial ? 'ft' : 'm';
  const volumeUnit = imperial ? 'yd3' : 'm3';

  object(project.block, 'block', ['length', 'height'], ['length', 'height']);
  const blockLength = number(project.block.length, 'block.length', { positive: true, max: 30_000 }) * smallToLarge;
  const blockHeight = number(project.block.height, 'block.height', { positive: true, max: 30_000 }) * smallToLarge;
  number(project.buriedCourses, 'buriedCourses', { integer: true, max: 100 });
  number(project.blockAllowancePercent, 'blockAllowancePercent', { max: 100 });
  if (!Array.isArray(project.segments) || project.segments.length < 1 || project.segments.length > 20) {
    throw new RangeError('segments must contain 1 to 20 sections.');
  }

  const sections = project.segments.map((segment, index) => {
    object(segment, `segments[${index}]`, ['length', 'exposedHeight'], ['length', 'exposedHeight']);
    number(segment.length, `segments[${index}].length`, { positive: true, max: 10_000 });
    number(segment.exposedHeight, `segments[${index}].exposedHeight`, { positive: true, max: 100 });
    const unitsPerCourse = wholeUp(segment.length / blockLength, 'units per course');
    const visibleCourses = wholeUp(segment.exposedHeight / blockHeight, 'visible courses');
    const totalCourses = visibleCourses + project.buriedCourses;
    const visibleBlocks = number(unitsPerCourse * visibleCourses, 'visible blocks');
    const buriedBlocks = number(unitsPerCourse * project.buriedCourses, 'buried blocks');
    return { length: segment.length, exposedHeight: segment.exposedHeight, unitsPerCourse,
      visibleCourses, totalCourses, constructedCourseHeight: totalCourses * blockHeight,
      visibleBlocks, buriedBlocks, netBlocks: visibleBlocks + buriedBlocks };
  });
  const sum = key => sections.reduce((total, section) => total + section[key], 0);
  const visible = sum('visibleBlocks');
  const buried = sum('buriedBlocks');
  const net = number(visible + buried, 'total net blocks');
  const order = withAllowance(net, project.blockAllowancePercent, true);
  const blocks = { visible, buried, net, allowancePercent: project.blockAllowancePercent,
    order, extra: order - net };
  const totalLength = sum('length');

  let caps = null;
  if (project.caps !== undefined) {
    object(project.caps, 'caps', ['length', 'allowancePercent'], ['length', 'allowancePercent']);
    const capLength = number(project.caps.length, 'caps.length', { positive: true, max: 30_000 }) * smallToLarge;
    const netCaps = number(sections.reduce((total, section) => total + wholeUp(section.length / capLength, 'caps per section'), 0), 'net caps');
    const capOrder = withAllowance(netCaps, project.caps.allowancePercent, true);
    caps = { net: netCaps, allowancePercent: project.caps.allowancePercent,
      order: capOrder, extra: capOrder - netCaps };
  }

  let base = null;
  if (project.base !== undefined) {
    object(project.base, 'base', ['width', 'depth', 'allowancePercent'], ['width', 'depth', 'allowancePercent']);
    const width = number(project.base.width, 'base.width', { positive: true, max: 30_000 }) * smallToLarge;
    const depth = number(project.base.depth, 'base.depth', { positive: true, max: 30_000 }) * smallToLarge;
    const baseNet = number(totalLength * width * depth / volumeDivisor, 'net base volume');
    base = { net: baseNet, allowancePercent: project.base.allowancePercent,
      order: withAllowance(baseNet, project.base.allowancePercent) };
  }

  let drainage = null;
  if (project.drainage !== undefined) {
    object(project.drainage, 'drainage', ['width', 'soilCap', 'coreFillPerBlock', 'allowancePercent'],
      ['width', 'soilCap', 'coreFillPerBlock', 'allowancePercent']);
    const width = number(project.drainage.width, 'drainage.width', { positive: true, max: 30_000 }) * smallToLarge;
    const soilCap = number(project.drainage.soilCap, 'drainage.soilCap', { max: 30_000 }) * smallToLarge;
    number(project.drainage.coreFillPerBlock, 'drainage.coreFillPerBlock', { max: 1000 });
    const netZone = number(sections.reduce((total, section) => total + section.length * width
      * Math.max(0, section.constructedCourseHeight - soilCap) / volumeDivisor, 0), 'net drainage zone');
    const netCore = number(net * project.drainage.coreFillPerBlock / volumeDivisor, 'net core fill');
    const drainageNet = number(netZone + netCore, 'net drainage volume');
    drainage = { netZone, netCore, net: drainageNet, allowancePercent: project.drainage.allowancePercent,
      order: withAllowance(drainageNet, project.drainage.allowancePercent) };
  }
  const aggregate = { unit: volumeUnit, base, drainage,
    total: { net: number((base?.net ?? 0) + (drainage?.net ?? 0), 'total net stone'),
      order: number((base?.order ?? 0) + (drainage?.order ?? 0), 'total order stone') } };

  let packaging = null;
  if (project.packaging !== undefined) {
    object(project.packaging, 'packaging', ['blocksPerPackage', 'capsPerPackage'], ['blocksPerPackage']);
    if (project.packaging.capsPerPackage !== undefined && !caps) {
      throw new RangeError('capsPerPackage requires caps inputs.');
    }
    packaging = { blocks: estimatePackages(order, project.packaging.blocksPerPackage),
      caps: project.packaging.capsPerPackage === undefined ? null
        : estimatePackages(caps.order, project.packaging.capsPerPackage) };
  }
  return { schemaVersion: 1, toolkitVersion: VERSION, units: project.units, linearUnit,
    totalLength, sections, blocks, caps, aggregate, packaging };
}

/** CSV rows distinguish net, allowance order and optional package supply. */
export function materialListCsv(result) {
  const rows = [['material', 'quantity_kind', 'quantity', 'unit', 'note']];
  const add = (material, kind, quantity, unit, note) => rows.push([material, kind, quantity, unit, note]);
  add('Wall blocks', 'net', result.blocks.net, 'blocks', 'Includes selected buried courses');
  add('Wall blocks', 'order', result.blocks.order, 'blocks', 'Selected block allowance applied once');
  if (result.packaging) add('Wall blocks', 'package_supply', result.packaging.blocks.suppliedUnits, 'blocks', 'Alternative full-package purchase; do not add to order');
  if (result.caps) {
    add('Cap stones', 'net', result.caps.net, 'caps', 'Rounded per section');
    add('Cap stones', 'order', result.caps.order, 'caps', 'Selected cap allowance applied once');
    if (result.packaging?.caps) add('Cap stones', 'package_supply', result.packaging.caps.suppliedUnits, 'caps', 'Alternative full-package purchase; do not add to order');
  }
  for (const material of ['base', 'drainage']) {
    const volume = result.aggregate[material];
    if (volume) {
      add(material === 'base' ? 'Base aggregate' : 'Drainage and core-fill stone', 'net', volume.net, result.aggregate.unit, 'Geometric volume');
      add(material === 'base' ? 'Base aggregate' : 'Drainage and core-fill stone', 'order', volume.order, result.aggregate.unit, 'Selected stone allowance; density and prices excluded');
    }
  }
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  return rows.map(row => row.map(quote).join(',')).join('\n') + '\n';
}
