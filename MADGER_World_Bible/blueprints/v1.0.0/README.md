# MADGER Burrow Blueprint Atlas - Issue 01

A connected set of 21 vector drawing sheets, based on World Bible v1.0.0. Every established Burrow area has its own plan, world anchor and connection schedule.

[Open the complete blueprint book](MADGER_Burrow_Blueprints.pdf) | [See all sheets](MADGER_Blueprint_Overview.jpg) | [Structured geometry and connections](MADGER_Blueprint_Data.json)

![The Burrow master blueprint](previews/BP-00.png)

## Drawing register

All drawings use metres and the same north direction. Local area coordinates translate directly into the world coordinates recorded on each sheet.

| Sheet | Area or system | Preview | Editable vector |
| --- | --- | --- | --- |
| BP-00 | The Burrow / master blueprint | [PNG](previews/BP-00.png) | [SVG](svg/BP-00.svg) |
| BP-17 | East precinct / connected assembly | [PNG](previews/BP-17.png) | [SVG](svg/BP-17.svg) |
| BP-01 | Sunwell Market | [PNG](previews/BP-01.png) | [SVG](svg/BP-01.svg) |
| BP-02 | Common House & Tables | [PNG](previews/BP-02.png) | [SVG](svg/BP-02.svg) |
| BP-03 | Hearth Terraces | [PNG](previews/BP-03.png) | [SVG](svg/BP-03.svg) |
| BP-04 | Garden Terraces | [PNG](previews/BP-04.png) | [SVG](svg/BP-04.svg) |
| BP-05 | Spring House | [PNG](previews/BP-05.png) | [SVG](svg/BP-05.svg) |
| BP-06 | Waterhouse | [PNG](previews/BP-06.png) | [SVG](svg/BP-06.svg) |
| BP-07 | Gorilla White's Workshop | [PNG](previews/BP-07.png) | [SVG](svg/BP-07.svg) |
| BP-08 | Training Court | [PNG](previews/BP-08.png) | [SVG](svg/BP-08.svg) |
| BP-09 | Records House | [PNG](previews/BP-09.png) | [SVG](svg/BP-09.svg) |
| BP-10 | Storehouse & Trading Court | [PNG](previews/BP-10.png) | [SVG](svg/BP-10.svg) |
| BP-11 | Care House | [PNG](previews/BP-11.png) | [SVG](svg/BP-11.svg) |
| BP-12 | East Bridge | [PNG](previews/BP-12.png) | [SVG](svg/BP-12.svg) |
| BP-13 | Inner Arrival Court | [PNG](previews/BP-13.png) | [SVG](svg/BP-13.svg) |
| BP-14 | East Gate | [PNG](previews/BP-14.png) | [SVG](svg/BP-14.svg) |
| BP-15 | Service Walk & Gate Relay | [PNG](previews/BP-15.png) | [SVG](svg/BP-15.svg) |
| BP-16 | Makers' Room & Archive | [PNG](previews/BP-16.png) | [SVG](svg/BP-16.svg) |
| BP-18 | Three crossings / fixed connections | [PNG](previews/BP-18.png) | [SVG](svg/BP-18.svg) |
| BP-19 | Systems that support daily life | [PNG](previews/BP-19.png) | [SVG](svg/BP-19.svg) |
| BP-20 | How the Madger world grows | [PNG](previews/BP-20.png) | [SVG](svg/BP-20.svg) |

## World assembly rule

Every future area gets a blueprint packet before appearing in a game, story or environment asset. The packet records its stable ID, parent district, position, footprint, elevation, orientation, entrances, adjoining routes, systems, sightlines and first appearance. Match connecting coordinates and levels. Preserve the existing world; record additions and event states separately.

The initial expansion anchors are the west emergency threshold, southeast treatment/service threshold and east exterior gate plane. The world beyond these remains unassigned. Existing Expedition courses retain their current layouts until separate connection sheets place them.

## What this issue establishes

- All 16 canon world anchors and footprints, the 48-route graph, the watercourse and three canal crossings are preserved.
- Individual plan sheets add production zoning, furnishings and portal dimensions. These details are new in this issue, not claimed as earlier approvals.
- BRW-15 has two components: the Service Walk and the relay cabinet inside BRW-14. BP-17 shows the access route around the west end of the solid south wall.
- Drawn residential bands are neighborhood allocations; unseen private rooms remain unassigned.
- The route graph expresses connectivity and destination anchors. It is not an indoor collision mesh. Final game surfaces must approach the shown portals and respect solid walls.
- This is a world-production drawing set. It is not an engineering specification for real construction, and it does not claim the current game or anime has been rebuilt.

## Rebuild and validate

`canon/MADGER_World_Bible.json` is the exact source snapshot. Its SHA-256 is recorded in the blueprint data. The renderer is in `source/build_blueprints.py`.

From this version directory, run `python3 source/build_blueprints.py`. It writes the PDF, SVG sheets, PNG previews, contact sheet, data and validation into `output/`. Requirements: Python 3, ReportLab, PyMuPDF, Pillow and DejaVu fonts at `/usr/share/fonts/truetype/dejavu/`.

[Validation record](validation.json) | [Archive checksums](manifest.json)

Keep the source snapshot and prior issues intact. Add a new issue for compatible detail; explicitly record any authorized change to established geography.
