# MADGER World Bible 3.0 — The Open Ways

Development edition 3.0.0 · 20 October 2026

This is the connected foundation for the defined eight-region setting. It develops the four heroes and a wider cast, independent communities, history, factions, ecology and four seasons of adventures. Earlier editions remain preserved. New characters and art are owner-commissioned development, not a claim that the owner separately approved every generated design.

## Open the collection

- [Master index](https://docs.google.com/document/d/1mVmWBzLV7j1UFi5k8HSUqEnDxckAFl5X-jNZuhegg0M/edit)
- [All files in Google Drive](https://drive.google.com/drive/folders/1tTbzQwHeJqpzJfIrdjAXkteilfKnbgWv)
- [Forty individual character cards](https://drive.google.com/drive/folders/1MMXs4Qlk8aZjAamEl0zobkXHTi6lutnB)
- [Eleven art plates](https://drive.google.com/drive/folders/1JldFc53xFo9lE42gaMM9KPNKdiiQNnPa)
- [Eighty vector blueprint sheets](https://drive.google.com/drive/folders/1cRQRQspEuS8avE_Pyl3Wu6I5Zu9f3eV-)
- [Structured lore and geometry](https://drive.google.com/drive/folders/1hI69phtuXnKGMvjBAVjzpMZnqpfF95MQ)

`Drive_Links.json` records each file's verified ID, URL, relative working path and SHA-256. PDFs and generated art live in that collection; this repository holds editable text, geometry, SVGs and source. No ZIP is needed.

## Deliverables

| Volume | Pages | Contents |
| --- | ---: | --- |
| World Atlas | 39 | Eight regions, fourteen communities, everyday life, history, waycraft, twelve creatures and travel |
| Character Bible | 47 | Forty illustrated cards, hero reference and six supporting cast plates |
| Blueprint Atlas | 80 | Regional map, thirteen settlement plans, modules, named buildings, encounter sites and inherited Burrow overviews |
| Stories and Factions | 27 | Nine factions, forty episode outlines, twelve standalone stories, eight action sequences and a reveal ledger |

The self-contained HTML Blueprint Gallery provides a selector for the same eighty SVG sheets. The current new set contains 658 exterior building instances using twelve module families. Ordinary buildings reuse modules; they are not 658 unique painted interiors. There are 37 named building adaptations in the settlement plans and two mapped off-site interiors. The four Burrow overview sheets complement the existing detailed atlases rather than duplicating all of them.

## Canon and precedence

Burrow v2.1 controls its 16 surface areas, 21 underground areas, seven detailed sub-plans, routes, watercourse, public access and inner defensive boundary. Those coordinates and approved voice references are copied without alteration. Original surface and underground atlases remain authoritative for their detailed rooms and connections.

Character development 1.1 controls Madger's established founding chronology and revised story spine. Edition 3.0 resolves earlier reserved exterior geography, companion origins and wider biographies. It develops Gorilla's Stonewake history, Bot's Millmere origin and agency, and Snow's Latchford household and gradual adoption. It preserves Madger's living parents, collective founding, Nix relationship, Veyra funding reveal and the limited pilot clues.

Episode one stays wholly inside the Burrow. It begins with joyful, functioning daily life and reveals only subtle anomalies. Writer-only causes are not pilot dialogue. Madger has no oversized fang or decorative tear. Bot has a mechanical face. Snow is a quadruped canine with no spoken dialogue. Supporting characters have performance direction, not newly approved voice assignments.

## Replication

1. Choose the character ID, place ID, story time and state of knowledge.
2. Read `World_Atlas.json` and the matching character source. Human-readable mirrors are `CHARACTERS.md`, `COMMUNITIES.md` and `FACTIONS.md`.
3. Use `Blueprint_Data.json` for module dimensions, floors, doors, elevations, settlement instances and named plans. Use `Building_Instances.csv` for placement. Regional XY is kilometres east/north of the Burrow; local XYZ is metres with Z up.
4. Select the matching SVG in `plans/`. Artwork controls visual identity, materials and atmosphere; measured geometry controls layout. A generated painting must not silently change a floor plan.
5. Reuse the exact image files for continuity. `Art_Manifest.json` records design prompts and references; rerunning generation is not a deterministic way to recover identical pixels.
6. Record repairs, damage, injuries, discoveries and relationship changes in a scene ledger. Extend canon by versioned additions; do not overwrite an established fact for a convenient scene.

## Rebuilding the source

In a working directory, place the six scripts from `source/` at the root, the four seed JSON inputs under `source/`, the eleven downloaded image plates under `art/`, and the current structured outputs under `output/`. Create `qa/`, `plans/` and `output/cards/`. The scripts resolve all inputs relative to their own directory. Python dependencies are ReportLab, PyMuPDF, Pillow and pypdf, with DejaVu Sans/Serif installed at the font paths in `render_atlas.py`.

Run in this order from that working directory:

```sh
python3 author_world.py
python3 build_geometry.py
python3 enrich_geometry.py
python3 finalize_content.py
python3 render_atlas.py
python3 validate_atlas.py
```

The finalizer runs after fresh geometry generation. Its coordinate transformation is not intended to be applied repeatedly to an already transformed atlas. The generated illustration plates and their exact bytes are preserved separately. Art and Drive manifests are archive records rather than regenerated lore.

`VALIDATION.json` records geometry, membership, capacity, route-length, continuity and PDF checks. All final pages were rendered and reviewed. These are fictional production layouts, not structural engineering plans. Episode material is developed outlines, not completed screenplays, animation or playable game assets. The wider planet remains open to additive adventures.

This is a documentation and creative-source archive. No production website, game, wallet, voice service or deployment was changed. Website deployment checks are not represented as having passed for this archive.
