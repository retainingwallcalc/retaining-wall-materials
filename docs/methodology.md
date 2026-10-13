# Formulas and model limits

The toolkit models selected rectangular course geometry. Effective block length/height must come from the actual product and layout. Full units and courses are rounded upward independently for each section. It does not divide face area by a nominal block face and assume that every section shares an average height.

## Blocks and caps

After converting small dimensions to the large length unit:

1. Per-course units = ceil(section length ÷ effective unit length).
2. Visible courses = ceil(exposed block-course height ÷ effective course height).
3. Section net blocks = per-course units × (visible courses + selected buried courses).
4. Sum net blocks across sections. Apply the selected block percentage once, then round upward.
5. Caps = sum of ceil(section length ÷ effective cap length). Apply their selected percentage once and round upward.

The code subtracts a 1e-9 tolerance before whole-count ceiling, to suppress negligible floating-point noise at an exact boundary. A positive partial count still has a minimum of one. This tolerance is a numeric convention, not a physical fitting tolerance; check dimensions close to a full-unit boundary against the actual product.

## Stone volumes

Base net = total reference length × selected total base width × selected base depth.

Drainage-zone net = sum(section length × selected drainage width × max(total rounded-course height − selected soil cap, 0)). Add net blocks × the entered per-block core-fill volume. Core fill is not computed from spare or package units.

For imperial inputs, dimensions are converted to feet and cubic feet are divided by 27 to obtain cubic yards. Metric small dimensions are converted from millimetres to metres and volume is cubic metres. Add each material's selected stone percentage once. Keep base and drainage products separate; the combined total is not proof that they are interchangeable.

The allowance is an input for supply/handling planning. It is not a measured compaction factor or a specification of aggregate type. The toolkit makes no density or weight estimate and labels no generic volume as tons/tonnes. Supplier density, selling units and increments must be checked separately.

## Packages and curved/stepped runs

Whole packages = ceil(required order ÷ units per package). Supply = packages × units per package. Supply is an alternative purchasing quantity, not an extra line added to the order count. A 119-unit requirement may correspond to 150 units purchased in two 75-unit packages.

Stepped sections are rounded independently, with one common selected buried-course count. Real layouts may share cuts, corners, transitions or other units that this model does not optimize. An arc helper gives radius × angle in radians at one constant reference radius. It does not verify that a selected block can form that curve or change the reference radius with course setback.

## What quantities do not establish

The toolkit does not check earth pressure, sliding, overturning, bearing, global stability, wall height restrictions, permit requirements, reinforcement, filter compatibility, water discharge or construction quality. It does not select buried depth or a drainage detail. Inputs must be established from the actual product and appropriate project design.

The new library follows a documented subset of the [Retaining Wall Calc formulas](https://retainingwallcalc.org/methodology-and-formulas?utm_source=github&utm_medium=referral&utm_campaign=launch_2026_10&utm_content=docs_methodology). Caps, base and drainage allowances are separately entered in this toolkit. When reconciling with website results, use matching inputs and the same allowances. The website contains other quantities and price controls that are outside this repository's scope.
