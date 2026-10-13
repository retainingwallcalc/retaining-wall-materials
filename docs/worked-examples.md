# Worked examples

All examples are hypothetical selected inputs. They are not installation requirements or records of a built project. Exposed height excludes cap thickness. Use the JSON inputs to reproduce the complete output.

| Input file | Selected geometry | Key count |
|---|---|---|
| `imperial-24ft.json` | 24 ft run; 2.5 ft exposed; 16×6 in coverage; 1 buried course; 10% allowance. | 90 visible + 18 buried = 108 net → 119 order. |
| `metric-7-2m.json` | 7.2 m run; 0.8 m exposed; 400×200 mm coverage; 1 buried course; 10%. | 72 visible + 18 buried = 90 net → 99 order. |
| `stepped-two-sections.json` | Two 12 ft sections, exposed 2 ft and 3.1 ft; 16×6 in coverage; 1 buried course; 10%. | 45 + 72 = 117 net → 129 order. |
| `curved-quarter-circle.json` | 10 ft reference radius through 90°, 2.5 ft exposed; 16×6 in coverage; 1 buried course; 10%. | 12 per course × 6 courses = 72 net → 80 order. |

## 24 ft stone arithmetic

Total base width 22 in = 11/6 ft; depth 6 in = 1/2 ft. Net base volume = 24 × 11/6 × 1/2 = 22 ft³ = 0.8148148… yd³. Selected 10% stone allowance gives 0.896296… yd³, displayed as **0.90 yd³**.

The selected total course height is 3 ft. Soil cap 6 in leaves a 2.5 ft drainage-zone height. Width 12 in = 1 ft. Net zone = 24 × 1 × 2.5 = 60 ft³ = 2.222222… yd³. Zero core fill and selected 10% stone allowance give 2.444444… yd³, displayed as **2.44 yd³**. These are separate products; combined unrounded order volume displays as 3.34 yd³.

## Stepped count

Each section is 12 ft, so each has 9 units per course. The 2 ft section has 4 visible + 1 buried courses: 45 net. The 3.1 ft section rounds up to 7 visible + 1 buried courses: 72 net. Apply 10% to 117 once: 128.7 → 129. Averaging the heights first changes the course-rounding problem.

## Packaging

The selected 75-unit package is a purchasing example, not a manufacturer specification. 119 order units requires 2 full packages if only those increments are sold: 150 supplied, 31 above the order. Partial packages, cuts, return terms and product-specific coverage must be confirmed with the supplier.

The complete result files use `.expected.json`; they retain unrounded volume values. The material CSV and quote worksheet distinguish required order from a possible full-package purchase. Do not add all CSV quantity kinds as if they were separate materials to buy.
