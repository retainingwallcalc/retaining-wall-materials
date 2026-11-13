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

## Multi-System Formula Reference (v1.1.0 Expansion)

For walls built with mortared concrete masonry units (CMU), timber sleepers, cast-in-place poured concrete, or wire gabion baskets, use the system-specific geometry rules documented at [RetainingWallCalc.org Methodology & Formulas](https://retainingwallcalc.org/methodology-and-formulas):

### 1. Commercial Segmental Block Producer Mold (`examples/allan-block-ny-classic-30ft.json`)
* **Producer Specification:** Zappala Block (NY) Allan Block Classic (`17⅝ × 7⅝ × 11⅞ in` / `17.625 × 7.625 in` exposed face, `40 units/pallet`).
* **30 ft × 3 ft Benchmark (+1 Buried Course, 10% Allowance):**
  * `blocks_per_course = ceil(30 / (17.625 / 12)) = 21`
  * `courses = ceil(3.0 / (7.625 / 12)) + 1 = 5 + 1 = 6`
  * `net_blocks = 21 × 6 = 126` (`105 exposed + 21 buried`)
  * `order_blocks = ceil(126 × 1.10) = 139` (`4 full pallets = 160 units`)
* **Interactive Reference:** [Allan Block Calculator: Block Counts & Pallet Examples](https://retainingwallcalc.org/guides/allan-block-calculator)

### 2. Mortared Cinder Block / CMU (`16 × 8 in` Nominal Module)
* **Module Geometry:** Actual block size `15⅝ × 7⅝ in` (`397 × 194 mm`) + `⅜ in` (`9.5 mm`) mortar joint = `16.0 × 8.0 in` (`1.333 × 0.667 ft`) installed module.
* **30 ft × 3 ft Benchmark (+1 Buried Course, 10% Allowance):**
  * `blocks_per_course = ceil(30 / (16 / 12)) = 23`
  * `courses = ceil(3.0 / (8 / 12)) + 1 = 5 + 1 = 6`
  * `net_blocks = 23 × 6 = 138` (`115 exposed + 23 buried`)
  * `order_blocks = ceil(138 × 1.10) = 152 CMU blocks`
* **Interactive Calculator:** [Cinder Block (CMU) Retaining Wall Calculator](https://retainingwallcalc.org/calculators/cinder-block-calculator)

### 3. Timber & Wood Sleepers (`96 × 5.5 × 5.5 in` Dressed 6×6)
* **Module Geometry:** Nominal `8 ft` (`96 in`) length × `5.5 in` (`0.4583 ft`) dressed vertical course height.
* **30 ft × 3 ft Benchmark (+1 Buried Course, 10% Allowance):**
  * `timbers_per_course = 30 / 8.0 = 3.75`
  * `exposed_courses = ceil(3.0 / (5.5 / 12)) = 7` (`ceil(3.75 × 7) = 28 exposed sleepers`)
  * `buried_sleepers = ceil(3.75 × 1) = 4` → `net_timbers = 32`
  * `order_timbers = ceil(32 × 1.10) = 36 sleepers` (`0.89 yd³` base aggregate + `3.87 yd³` drainage stone)
* **Interactive Calculator:** [Timber & Wood Retaining Wall Calculator](https://retainingwallcalc.org/calculators/timber-retaining-wall-calculator)

### 4. Poured-Concrete Stem & Footing Ready-Mix Volume (`yd³` & `m³`)
* **Volume Equation:** Sum rectangular stem and footing cubic feet separately before dividing by `27 ft³/yd³`:
  * `stem_ft3 = length_ft × stem_height_ft × (stem_thickness_in / 12)`
  * `footing_ft3 = length_ft × (footing_width_in / 12) × (footing_thickness_in / 12)`
  * `order_yd3 = ((stem_ft3 + footing_ft3) / 27) × (1 + waste_allowance)`
* **30 ft × 4 ft Benchmark (`8 in` Stem + `24 × 12 in` Footing, 10% Allowance):**
  * `stem_ft3 = 30 × 4.0 × (8 / 12) = 80.0 ft³` (`2.96 yd³`)
  * `footing_ft3 = 30 × 2.0 × 1.0 = 60.0 ft³` (`2.22 yd³`)
  * `net_yd3 = 140.0 / 27 = 5.19 yd³` → `order_yd3 = 5.19 × 1.10 = 5.70 yd³` (`4.36 m³`)
* **Interactive Calculator:** [Poured-Concrete Retaining Wall Calculator: Wall & Footing](https://retainingwallcalc.org/calculators/poured-concrete-retaining-wall-calculator)

### 5. Gabion Wire Baskets & Quarry Rock Fill Tonnage
* **30 ft × 6 ft Benchmark (`6 × 3 × 3 ft` Baskets, 5% Packing Allowance, `2,860 lb/yd³` Bulk Density):**
  * `baskets = (30 / 6) × (6 / 3) = 5 × 2 = 10 baskets`
  * `net_fill_yd3 = (30 × 6 × 3) / 27 = 20.0 yd³` (`540 ft³`)
  * `order_fill_yd3 = 20.0 × 1.05 = 21.0 yd³` (`16.06 m³`)
  * `rock_tons_us = (21.0 × 2860) / 2000 = 30.03 US short tons` (`60,060 lb` / `27.24 metric tonnes`)
* **Interactive Calculator:** [Gabion Wall Calculator: Baskets, Rock Fill & Tons](https://retainingwallcalc.org/calculators/gabion-wall-calculator)

### 6. Regional Metric Calculators (Australia, United Kingdom & Canada)
* **Australia (`AUD`):** [Retaining Wall Calculator Australia](https://retainingwallcalc.org/au/retaining-wall-calculator) (`10 m × 0.6 m` Adbri Versawall `400 × 200 × 215 mm` = `100 net` → `110 order blocks` / `2 pallets`, `4.46 tonnes` total gravel at `1.6 t/m³`)
* **United Kingdom (`GBP`):** [Retaining Wall Calculator UK](https://retainingwallcalc.org/uk/retaining-wall-calculator) (`7.2 m × 0.4 m` Marshalls Croft Stone `300 × 100 × 170 mm` = `120 net` → `132 order blocks` / `2 packs`, `2.55 tonnes` MOT Type 1 & drainage stone)
* **Canada (`CAD`):** [Retaining Wall Calculator Canada](https://retainingwallcalc.org/ca/retaining-wall-calculator) (`12 m × 0.75 m` Unilock Ontario Pisa2 `200 × 150 × 300 mm` = `360 net` → `396 order blocks` / `6 bundles`, `6.65 tonnes` Granular A & clear stone)
