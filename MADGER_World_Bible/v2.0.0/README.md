# MADGER World Bible v2.0.0 — Above and Below

Established 20 October 2026. Current owner-directed canon for the populated Burrow.

The Burrow is one town with busy outdoor terraces and permanent underground neighborhoods. Its public entrance welcomes residents and visitors in ordinary life. A separate inner boundary protects the inhabited underground town if the surface district is overrun.

## Open the drawings

- [28-page Underground Blueprint Atlas](MADGER_Underground_Blueprints.pdf)
- [Above-and-below section](previews/UG-A0.png)
- [Surface connections](previews/UG-A1.png)
- [Upper underground, -12 m](previews/UG-A2.png)
- [Deep neighborhood, -24 m](previews/UG-A3.png)
- [Service level, -36 m](previews/UG-A4.png)
- [Public and protective states](previews/UG-A5.png)
- [Full current structured World Bible](MADGER_World_Bible.json)
- [Underground data](MADGER_Underground_Data.json), [sheet register](sheet_register.json), [validation](validation.json) and [checksums](manifest.json)

![Above and below](previews/UG-A0.png)

## Permanent geography

All 16 established surface area positions, footprints, routes, three canal crossings and the watercourse stay fixed. Twenty-one new area IDs join the same Sunwell coordinate system: metres, +X east, +Y north and +Z up. Two occupied floors sit at -12 and -24 m; maintainable services sit at -36 m. A central lift/stair court and two separated stair cores join these levels. Central lifts do not open directly to the surface.

The authored population baseline is 2,400: 800 surface residents and 1,600 underground residents in four 100-home wards. These are new production planning assumptions, not a user-specified census. The assembly hall plans 800 additional refuge places. Household interiors and individual occupancy remain to be designed and registered; frontage symbols do not claim an exact apartment layout.

## Public life and protection

The Hearth approach leads to a welcoming public gallery, lift, stair and continuous step-free ramp, all arriving in the Welcome Hall before the Inner Gate Gallery. Two independent closures normally stand open. Beyond them are shops, homes, learning, care, meals and daily civic life.

Service arrivals pass through a separate receiving hall and protective threshold. Both stair exits have controlled inward access and mechanical operation from inside. No undocumented hatch or lift can bypass the protected town. Historical reserved surface thresholds BRW-X01 and BRW-X02 have no human connection into it in this edition.

Protection is an operating state: guide people, account for families, clear closure lines and staff local boundaries. Digital records cannot operate mechanical bars by themselves. Air, water, sanitation and communication continue under local controls. Surface conditions still determine whether a particular evacuation route is safe.

Daily life includes household kitchens, doorsteps, play spaces, deliveries, classrooms, care rooms, shared meals, laundry and neighborhood shops. The underground is a valued place to live. Its ability to shelter surface residents grows from that everyday infrastructure.

## Area blueprints

| Sheet | Area | Floor elevations (m) | Footprint (m) |
| --- | --- | --- | --- |
| [UG-00](previews/UG-00.png) | Hearth Public Entry | 0 | 30 x 88 |
| [UG-01](previews/UG-01.png) | Welcome Hall | -12 | 48 x 36 |
| [UG-02](previews/UG-02.png) | Inner Gate Gallery | -12 | 24 x 32 |
| [UG-03](previews/UG-03.png) | Underhall Commons | -12 | 96 x 72 |
| [UG-04](previews/UG-04.png) | West Lantern Warren | -12 | 96 x 72 |
| [UG-05](previews/UG-05.png) | East Orchard Warren | -12 | 96 x 72 |
| [UG-06](previews/UG-06.png) | School & Play Hall | -12 | 96 x 60 |
| [UG-07](previews/UG-07.png) | Care & Community Hall | -12 | 96 x 60 |
| [UG-08](previews/UG-08.png) | Central Lift & Stair Court | -12, -24, -36 | 60 x 60 |
| [UG-09](previews/UG-09.png) | Service Receiving Hall | -12 | 80 x 36 |
| [UG-10](previews/UG-10.png) | West Deep Warren | -24 | 96 x 72 |
| [UG-11](previews/UG-11.png) | East Deep Warren | -24 | 96 x 72 |
| [UG-12](previews/UG-12.png) | Deep Commons & Kitchens | -24 | 96 x 72 |
| [UG-13](previews/UG-13.png) | Food Gardens & Grow Rooms | -24 | 96 x 60 |
| [UG-14](previews/UG-14.png) | Assembly & Refuge Hall | -24 | 96 x 60 |
| [UG-15](previews/UG-15.png) | Baths & Laundry | -24 | 96 x 36 |
| [UG-16](previews/UG-16.png) | Utility Repair Hall | -36 | 96 x 72 |
| [UG-17](previews/UG-17.png) | Water & Air Service Rooms | -36 | 96 x 72 |
| [UG-18](previews/UG-18.png) | Deep Stores | -36 | 96 x 72 |
| [UG-19](previews/UG-19.png) | West Stair & Refuge Core | -12, -24, -36 | 16 x 20 |
| [UG-20](previews/UG-20.png) | East Stair & Refuge Core | -12, -24, -36 | 16 x 20 |

## Systems that remain coherent

Sealed daylight ducts serve upper street connections; lower streets use comfortable electric lighting. Grow rooms require power and supplement surface gardens and trade. Potable water stays separate from the canal. Wastewater collects below and is pumped to the existing -3 m southeast service connection; it cannot drain uphill by gravity. Stores and backup resources are finite and change through the event ledger.

## Episode 1 and continuity

The five-minute pilot remains entirely within the Burrow, now including its outdoor basin and underground town. Begin with warm household and community life and all four heroes helping. Keep the duplicate D17 receipt and Snow's unfamiliar physical trace as small unresolved clues; do not reveal an attacker or stage an invasion. Routine evening gate closing must be established before the final receipt arrives without physical passage. Daytime visitors remain welcome.

Preserve approved hero designs and voices. Snow White uses canine sounds only. The owner correction removing the oversized Madger fang remains in force. Character arcs and the existing moral framework remain in the full structured canon.

## Version precedence

This major edition records the owner's change of scope and entrance behavior. It supersedes the earlier surface-only scope, approximately 400-person population and closed-gate default. The [v1 foundation](../v1.0.0/MADGER_World_Bible.pdf) remains historical; the [surface blueprint atlas](../blueprints/v1.0.0/MADGER_Burrow_Blueprints.pdf) remains the geometric reference, interpreted with v2 access states.

Every new area must receive a measured plan, stable ID, level, footprint and documented connections before use. Stories may change damage, repairs and knowledge through dated events without silently moving the baseline world.

## Source and rebuild

With Python, ReportLab, PyMuPDF, Pillow and DejaVu fonts installed, run `python source/build_model.py` then `python source/render_underground.py` from this edition's directory. Output is written to `output/`. The exact v1 canon input is retained in `canon/`. Editable vector sheets are in `svg/`; PDF text remains selectable.

These are fictional production blueprints, not certified construction or evacuation designs. Final game navigation and structural implementation require their own checks. Saving these plans does not claim that released anime or games already implement them.
