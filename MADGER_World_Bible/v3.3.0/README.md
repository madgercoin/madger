# The Wilds Between - edition 3.3.0

Completed 21 October 2026. Additive continuation of the Open Ways, Living Places and The Cost of Control.

## Read

- **MADGER_The_Wilds_Between.pdf**: 31 pages; twelve illustrated creature cards, eight regional ecologies, four habitat encounters, continuity rules, two complete stories and navigation index.
- **MADGER_Habitat_Blueprints.pdf**: 13 pages; four measured plans and registers, plus four resolved stair/access details.
- Finished PDFs and original art: https://drive.google.com/drive/folders/1uPFDIIWmIopoeEJU3siFfrqIVQHUo26Z
- Individual verified file links: `output/Drive_Links.json`.

## Canon precedence

All twelve creature baselines equal the 3.0 atlas exactly. Four site bounds and refuge footprints equal the inherited blueprint records exactly. Burrow 2.1, approved hero designs/voices, 3.0 identities/history/geography, 3.1 interiors and 3.2 conflict layers remain controlling. The five-minute pilot stays entirely inside the Burrow; D17 and the resin clue remain distinct.

New ecology is additive writer canon. Habitat feature and route layers refine schematic 3.0 approaches. SITE-03's unresolved maintenance ramp is now a measured foot service stair within the same entry footprint. SITE-08 now has a continuous landing-to-stair-to-high-arch route; water passes beneath the arch. The original atmospheric art prompt mentioning a ramp does not override these measured details.

**What the River Carried** (953 words) and **Enough of the Map** (1,049 words) are complete authored options, not dated episodes. Hollis and Namu still have no assigned voice. No voice substitution or paid synthesis occurred.

## Rebuild

Requirements: Python, ReportLab, PyMuPDF and Pillow; DejaVu fonts in the normal system font directory.

Run `python author_wilds.py`, `python build_habitats.py`, `python author_stories.py`, `python render_wilds.py`, then `python validate_release.py` from this edition directory. Loaders use local `source/` baselines if present, otherwise the existing sibling `v3.0.0/` records. Download the three original image files named in `output/Art_Manifest.json` into `art/`. SVG plans and JSON are editable originals. PDFs and large raster originals are stored in Drive; Git stores versioned text and vectors.

Validation checks exact inherited data equality, feature bounds, stair rise/run arithmetic and PDF page bounds. All 44 rendered pages were visually reviewed; final anatomy and stair pages were inspected at full-page scale. Validation does not certify real construction or replace scene-specific tide, load, air and closure decisions.

Earlier editions and the draft checkpoint remain preserved. Future stories need an explicit dated episode-ledger adoption; no such adoption is made by this release.
