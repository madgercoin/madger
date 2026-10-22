# Journeys & Waycraft - edition 3.4.0

Completed 21 October 2026. Additive travel and production companion to the MADGER World Bible.

## Read

The 33-page PDF, editable vector diagrams, route cards, source and validation are saved in:
https://drive.google.com/drive/folders/1k9hI25iVXKFGq4ld9o4pXUefpxYhNzB1

PDF: https://drive.google.com/file/d/1apkYKX11S6A32jE3KjNJRv2eBJRAx2pF/view?usp=drivesdk

Contents: sixteen existing route dossiers; an exact-anchor regional connection map; three explicit planning-time errata; six elapsed-time examples; an endpoint elevation diagram; six inherited waycraft systems; scene handoff fields; and the complete 1,246-word proposed story **A Place Left Empty**.

## Precedence

All sixteen original route records are retained verbatim under each card's `baseline`. All fourteen community records and six waycraft definitions equal the 3.0 atlas. Burrow 2.1 geometry, 3.1 interiors, 3.2 conflict layers, 3.3 habitats and approved character designs/voices remain controlling.

Three planning corrections explicitly supersede the old route-day summaries for future itineraries under unchanged pace and full separate layover assumptions:

| Route | Old summary | Revised planning blocks | Calculation |
| --- | ---: | ---: | --- |
| WAY-09 Ossara to Nacre Quay | 14 | 15 | 230 / 18 + 2 = 14.78 |
| WAY-10 Nacre Quay to Aurel Quay | 5 | 6 | 340 / 100 + 2 = 5.4 |
| WAY-11 Ossara to Aurel Quay | 3 | 4 | 130 / 100 + 2 = 3.3 |

Round upward once after adding full layovers. These are conditional planning floors, not guaranteed arrivals. They do not alter any previously adopted dated event. Route direction, booking delays, current, ascent and additional holds require a specific itinerary.

The civic calendar remains 360 days, twelve 30-day months, six-day weeks; varying local ecology does not replace it. No pilot exterior scene or new Burrow connection is added.

The network SVG is an exact-anchor graph, **not a surveyed track or flight-field map**. Its line crossings are not junctions. The descent diagram conveys endpoint datums, not an invented shaft profile. Future vehicle mechanics or descent segments require their own explicit production sheets.

## Story

A Place Left Empty uses Madger, Pell Fen, Asha Bell and Snow White in Latchford. Its local lodging fraud is independent of D17 and does not identify Tessera. It remains an authored option pending dated episode-ledger adoption. No new voices or paid renders were commissioned.

## Rebuild

Python with ReportLab, PyMuPDF and Pillow; system DejaVu fonts.

Run `author_journeys.py`, `author_story.py`, `build_route_map.py`, `render_journeys.py`, then `validate_journeys.py`. The source loader uses local `source/World_Atlas.json` if present, otherwise the existing sibling `v3.0.0/World_Atlas.json`. Original raster art is not needed for this vector reference volume.

All 33 pages were rendered and visually reviewed. Validation checks unchanged baselines, endpoint chord distances, all timing arithmetic and PDF text bounds. Earlier editions are preserved.

