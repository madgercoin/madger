# MADGER World Bible v2.1.0 - The Living Burrow

This additive edition develops the present-day town before the detailed history phase requested by the owner. All 37 primary area positions, footprints, routes and levels remain fixed.

## Open the volume

- [26-page illustrated Living World](MADGER_Living_World.pdf)
- [Full readable text, including complete resident and neighborhood records](LIVING_WORLD.md)
- [Complete current World Bible JSON](MADGER_World_Bible.json)
- [Eight recurring residents](Resident_Register.json)
- [Seven measured sub-locations](Sub_Locations.json) and [Underhall shop index](previews/UG-03-INDEX.png)
- [History workbook: established present facts and unanswered questions](History_Workbook.json)
- [Validation](validation.json), [page register](page_register.json), [checksums](manifest.json)

![Underhall atmosphere study](source/Underhall_Atmosphere.png)

The painting establishes materials, lighting and daily-life atmosphere. Its anonymous neighbors are not approved model sheets for the named cast, and its composition does not override the measured plans. It was made with ChatGPT's built-in image generation; the exact prompt is in [source](source/Underhall_Art_Prompt.txt). No Runway or ElevenLabs generation was used for this edition.

## What is developed

Five neighborhood identities give the surface Hearth Terraces and four underground wards distinct rhythms, sounds and habits. Eight recurring residents have occupations, desires, strengths, flaws and relationships independent of the heroes. The volume adds daily schedules, civic decision-making, care, learning, trade, shared resources, visual culture and story possibilities.

Madger is recorded as the founder because the owner established that he created the Burrow. His motivation, the founding sequence, collaborators, the companions' first meetings and residents' origins remain for the next phase. Named antagonists, monsters, exterior dangerous regions and any supernatural system are not invented here.

## Detailed spaces

| Blueprint | Name | Parent area | Footprint (m) |
| --- | --- | --- | --- |
| [UG-03-S01](previews/UG-03-S01.png) | Mara's Bread Counter | UG-03 | 16 x 11 |
| [UG-03-S02](previews/UG-03-S02.png) | Repair & Tool Loan | UG-03 | 16 x 11 |
| [UG-03-S03](previews/UG-03-S03.png) | Pantry & Produce | UG-03 | 16 x 11 |
| [UG-03-S04](previews/UG-03-S04.png) | Jun's Mending Room | UG-03 | 16 x 11 |
| [UG-06-R01](previews/UG-06-R01.png) | Learning Room One | UG-06 | 20 x 20 |
| [UG-07-R01](previews/UG-07-R01.png) | Care Room One | UG-07 | 12 x 20 |
| [UG-04-H001](previews/UG-04-H001.png) | Lantern Street Home 001 | UG-04 | 8 x 6 |

These plans refine existing allocations. Home H001 is one of UG-04's 100 planned homes, not an additional household. Only this home interior is drawn; the full 400-home underground census and apartment plans remain to develop. New civilian appearance notes are working specifications, with final model sheets and voices still open.

## Existing geometry and continuity

Use the [underground atlas](../v2.0.0/MADGER_Underground_Blueprints.pdf) for the 21 underground areas and the [surface atlas](../blueprints/v1.0.0/MADGER_Burrow_Blueprints.pdf) for the 16 surface areas. Version 2's public daytime access, independent inner defense and 2,400-resident planning baseline remain in force. An old BRW-13 phrase referring to a closed vestibule is aligned with that already established state.

The four established hero profiles and approved voice references remain unchanged. The pilot stays inside the Burrow, begins joyfully and introduces only subtle unresolved clues. Story seeds are not historical events; game progression is separate from story canon.

## Rebuild

Install Python with ReportLab, PyMuPDF and Pillow, plus DejaVu fonts. Run `python source/render.py` from this edition's directory. It rebuilds the current structured data, PDF, SVG sheets and rendered review previews under `output/`, using the exact v2 input in `canon/`. The full-size atmosphere source is retained unchanged.

These are fictional production layouts, not construction engineering. The edition does not claim a released game or video has implemented them. Preserve prior editions and use dated events for later damage, repairs and knowledge.
