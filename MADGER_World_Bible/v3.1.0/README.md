# MADGER World Bible 3.1 — Living Places

21 October 2026 · additive development edition

Thirteen existing landmarks now have detailed local histories, daily routines, practical conflicts, scene seeds and furnished ground-floor plans. Two complete short stories develop relationships among the four heroes and their companions.

## Open the finished volumes

- [Living Places — 22 illustrated pages](https://drive.google.com/file/d/1bz2u1omSRuv2XuL0QHhOMUJjtJI-ke6h/view)
- [Furnished Interiors — 13 measured sheets](https://drive.google.com/file/d/1ieimc8b3mBZ1UNNB5-oDoLx9axnkjcGm/view)
- [Complete edition folder](https://drive.google.com/drive/folders/11Txgava0ACtEftOU2rVZ34Le1W2n9XVC)
- [World master index](https://docs.google.com/document/d/1mVmWBzLV7j1UFi5k8HSUqEnDxckAFl5X-jNZuhegg0M/edit)

No archive extraction is needed.

## Contents and authority

The 3.0 foundation remains current: eight regions, fourteen communities, forty named characters, nine factions and twelve creatures. The Burrow's detailed 2.1 plans remain controlling. This edition adds dressing and history to one landmark in each of the thirteen exterior communities; it does not redesign any settlement or expand the Burrow.

- Thirteen illustrated dossiers with local history, daily life, conflicts and scene seeds.
- Thirteen SVG ground-floor plans with numbered furnishings and camera anchors.
- 221 reproducible furnishing placements with dimensions and settlement-local positions.
- Four original interior art sheets containing thirteen distinct environment studies.
- The Unfinished Note: a complete 959-word Gorilla/Eris story, proposed for a season-two Stonewake interlude.
- The Empty Chair: a complete 1,017-word reunion story featuring all four heroes, Asha and Sela, proposed after the pilot and before the rescue-funding reveal.

Local histories and normal-day dressing are additive writer canon. Scene seeds and short stories are authored opportunities awaiting placement in the dated episode ledger. They do not silently alter pilot knowledge or make future events already true.

## Reuse a room

1. Select its building ID and story date.
2. Read its entry in [Living_Places.json](output/Living_Places.json), including inherited geometry, cast IDs and art mapping.
3. Open the matching [SVG plan](plans/) and [prop register](output/Interior_Props.csv).
4. Preserve walls, doors, floor levels, stairs, outside routes and the normal-day prop reset.
5. Log deliberate portable-prop and occupancy changes for each scene.
6. Use the approved character cards and voices from 3.0. No new voice assignments are made here.

Local plan coordinates are metres, with origin at the building's southwest outside corner: x east, y north, z above ground-floor datum. Building centers are settlement-local, not continental coordinates. All thirteen inherited rotations are zero. Furniture world centers are derived from the building center minus half the footprint, plus the local position.

Every room retains a continuous 1.6 m clear cross at its center, meeting inherited mid-wall doors. Central passages and the Tide hall's public aisle have no fixed furniture. These are fictional set and game-blockout checks, not real building certification.

Paintings establish mood, materials and light. Their perspective openings, arches and ceiling exaggeration do not replace measured geometry. Use the SVG and JSON to reproduce actual positions. Keep the art source intact; crop only for page or shot layout.

## Continuity details

Six Roads refers to its six destination supper tables; Latchford still has its three established roads. The inn plan includes all six tables.

White's paired fitting bench stays in the southwest corner. In the short story, a portable measuring cord is borrowed from its registered stand and hung on the stop-board easel.

The Common Kiln Hall is a cool workroom; furnaces stay in the separate annex. Tide Speakers Hall is dry habitable space above an underground harbor, without daylight mountains or a hidden master chart.

Snow is a non-speaking quadruped with familiar cues from both homes. Bot is an independent mechanical person with no maker override. Madger's approved design has no oversized fang or decorative tear. The pilot remains wholly inside the Burrow.

## Rebuild and edit

The scripts in this directory are source, not an application or deployment.

Requirements: Python 3, ReportLab, PyMuPDF, and DejaVu Sans / DejaVu Serif installed under /usr/share/fonts/truetype/dejavu.

When this directory sits beside v3.0.0, the scripts read its World_Atlas.json and Blueprint_Data.json automatically. For a standalone working copy, place those exact two files from base commit 0299a6f408ac43bf98789a1cb5b3c70af2249450 in source/.

Download the four final art files from the edition's art folder into art/, preserving names in output/Art_Manifest.json. That manifest contains prompts, panel mapping conventions and hashes. Use output/Drive_Links.json for verified original file IDs.

Run in order:

    python author_depth.py
    python build_interiors.py
    python render_volumes.py

Authoring regenerates the structured dossier text. Furnishing validates inherited geometry and adds props, cameras, stories and SVG sheets. Rendering creates the two PDFs. Review rendered pages after any edits; a fresh build resets the geometric validation record and does not claim a new visual review.

PDFs and original PNGs are available in Drive. The archive stores editable text, structured data, vector plans and source scripts, not duplicate large binary books.

## Validation

The delivered edition was checked for exact equality with all thirteen inherited geometry objects, valid character references, in-room non-overlapping furniture, clear mid-wall approaches, and unfurnished primary circulation. Both PDFs were rendered and visually reviewed; page text bounds were checked. The crowded inn legend was corrected before delivery.

The validation record describes creative asset checks only. No application test gate, deployed game or finished animation is claimed.

