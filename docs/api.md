# API and input units

Import named exports from `src/index.mjs`: `estimateProject`, `estimatePackages`, `arcLength`, `materialListCsv` and `VERSION`. No dependencies or network calls are used. Node 22/24 are the intended LTS versions; local validation was run on Node 24.19.0. The CI workflow checks both versions when uploaded.

## Input schema

Use schemaVersion 1. All quantities are JSON numbers, not strings. Unknown fields are rejected so a misspelled dimension cannot silently fall back. The complete imperial example is in `examples/imperial-24ft.json`.

| Field | Required? | Imperial unit | Metric unit |
|---|---|---|---|
| `schemaVersion` | Yes | Literal 1 | Literal 1 |
| `units` | Yes | `imperial` | `metric` |
| `segments[].length` | Yes, 1–20 sections | ft | m |
| `segments[].exposedHeight` | Yes | ft, excluding cap thickness | m, excluding cap thickness |
| `block.length`, `block.height` | Yes | in, effective course coverage | mm, effective course coverage |
| `buriedCourses` | Yes | Whole count, 0–100 | Whole count, 0–100 |
| `blockAllowancePercent` | Yes | Percent, 0–100 | Percent, 0–100 |
| `caps.length` | If caps included | in | mm |
| `caps.allowancePercent` | If caps included | Percent | Percent |
| `base.width`, `base.depth` | If base included | in | mm |
| `base.allowancePercent` | If base included | Percent | Percent |
| `drainage.width`, `drainage.soilCap` | If drainage included | in | mm |
| `drainage.coreFillPerBlock` | If drainage included | ft³ per net block | m³ per net block |
| `drainage.allowancePercent` | If drainage included | Percent | Percent |
| `packaging.blocksPerPackage` | If packaging included | Whole units, 1–1,000,000 | Same |
| `packaging.capsPerPackage` | Optional, only with caps | Whole units | Same |

Base width is the total selected width; the toolkit does not add a block-depth field to it. Omit the entire caps/base/drainage/packaging object to disable that group. Passing null or a partial group is an error. There are no hidden default percentages or buried-course requirements.

Numeric limits bound the estimator: length ≤10,000 in the chosen large unit; exposed height ≤100; small dimensions ≤30,000 in the chosen small unit; aggregate volume and count calculations ≤1 billion; core fill ≤1,000 in its explicit volume unit. These are software input bounds, not construction limits. Positive block/project dimensions are required. Allowances are 0–100%; buried courses and package sizes must be whole numbers. Out-of-range/non-finite values throw an error.

## Result

`estimateProject(input)` returns detailed sections, block and cap net/order counts, separate aggregate objects and optional packaging. `linearUnit` is ft or m; `aggregate.unit` is yd3 or m3. A disabled material object is null. Volumes retain calculation precision; round only for presentation or supplier increments. Two-decimal examples do not define supplier ordering increments.

`blocks.extra` and `caps.extra` include whole-unit rounding above net. `packaging.*.overOrder` is above the already-allowanced order, not above net. Aggregate core fill uses net blocks, not spare/package units. A combined aggregate total is useful for checking arithmetic; separate products should remain separate on a quote.

## Helpers

`estimatePackages(requiredUnits, unitsPerPackage)` accepts nonnegative whole required units and positive whole package size. It returns package count, supplied units and over-order. Zero required units yields zero packages.

`arcLength(radius, angleDegrees)` returns a circular reference arc in the radius unit. Radius must be positive and ≤10,000; angle must be >0 and ≤360. Insert that length in a segment only after checking that reference arc is suitable. This function does not model tapered-block layouts or setback-course radii.

`materialListCsv(result)` expects an unmodified result from `estimateProject`. It emits quoted CSV with distinct net, order and alternative package-supply rows. These rows are not additive quantities. It does not choose products, prices, selling increments or delivery conditions.

## CLI

```bash
node cli.mjs examples/imperial-24ft.json
node cli.mjs examples/imperial-24ft.json --format csv
node cli.mjs --help
```

The CLI accepts one regular JSON file ≤256 KiB and optional `--format json` or `--format csv`. Successful output goes to stdout; invalid input exits with status 1 and an error on stderr. To save an output, use your shell's redirection to a file you choose. No API or website request occurs.
