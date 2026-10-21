# MADGER World Bible 3.2 - The Cost of Control

21 October 2026. Additive development edition based on commit a31a6f32286a198f4da0d95b4a1b7f0282c830fc.

The world’s existing threats now have working histories, ordinary routines, internal disagreements, finite resources and consequential character choices. This edition deepens the saved world rather than adding a global villain command.

## Read and view

- [Conflict Bible - 36 illustrated pages](https://drive.google.com/file/d/15Df9U5YyOhTbAwPNxtEAKc2O5WNd75Ia/view)
- [Threat Location Blueprints - 7 measured sheets](https://drive.google.com/file/d/1OvvqV1qTTXEVm-miQr2mPPHiJ3qE5Htn/view)
- [Complete edition collection](https://drive.google.com/drive/folders/1g4l9ZiGzNFbD4G2EMZDVr0gJ3aJgbVzz)
- [World master index](https://docs.google.com/document/d/1mVmWBzLV7j1UFi5k8HSUqEnDxckAFl5X-jNZuhegg0M/edit)

## What this adds

Six sources of pressure: Gilt Ledger, Glass Thread, Riven Claw, Kavar’s Salt Crown business, Blackwake Sails and the divided Still Bell Archive. Salt Crown is within the existing commercial network, not a new faction. The established total remains nine factions.

Thirteen character addenda: Veyra, Corvin, Bale, Nix, Tessera, Patch, Brakka, Dreg, Vessa, Kavar, Serik, Ossa and Pip. Each preserves the complete baseline card and adds private history, ordinary habit, pressure point, consequential choice, cost and a scene seed. No likeness, age or voice assignment is replaced.

Seven illustrated places with corresponding SVG plans:

| Location | Stable ID | Measured layer |
| --- | --- | --- |
| Kest Depot | EXT-01-B03 | Ground floor, 36 x 24 m |
| Slate Arcade Rooms | EXT-03-U04 | Upper floor, 24 x 20 m |
| Salt Crown Counting House | EXT-08-B03 | Ground floor, 24 x 18 m |
| Echo Archive Council Room | EXT-11-B02 | Upper floor, 24 x 18 m |
| Ashmouth Freight Yard | SITE-07 | 180 x 120 m site |
| Blackwake Mooring | SITE-05 | 160 x 100 m site |
| The Cut Span | SITE-06 | 180 x 100 m site |

The four building sheets add 42 portable furnishings. The three site sheets define 25 measured features within inherited bounds. Existing regional positions and refuge footprints remain unchanged.

Eight evidence threads distinguish what is observed, innocent possibilities, corroborating proof, limits and reveal timing. The ten-episode season-one ledger preserves the existing outline. A 300-second pilot envelope keeps episode one inside the Burrow and protects its joyful opening.

Two complete stories are included: An Hour Without a Price (955 words), after the proposed season-one rescue-funding reveal; An Inventory of Names (1,024 words), a proposed later Ashmouth story about Dreg’s split from Brakka. These are prose stories, not completed animation or final timed screenplays.

## Canon and story status

Operating histories, stable location aliases and fixed normal-state details are additive writer canon. Consequential choices, scene seeds and complete stories are authored opportunities until adopted by a dated episode ledger. An earlier story must not refer to an event that has only been proposed for a later season.

The 3.0 world foundation and 3.1 Living Places remain current. Slate Arcade Rooms names an already registered lodging building; Glass Thread’s temporary room lease does not make the landlord, other guests or the separate North Relay Rooms criminal collaborators.

The Echo Archive council uses upper Catalog A. The 3.1 furnished public ground floor remains unchanged. Meeting use does not create a new architectural wing.

The generic 3.0 encounter polyline was a staging guide. At the Cut Span, the 3.2 detail now explicitly separates the north and south approaches around a blocked 20 m gap. The existing two-day detour leaves the sheet. The new detailed approach and collision layers control staging within the unchanged site bounds.

Kest Depot’s specific MOD-11 note gives roof eaves at 6 m. The generic 3.2 m floor-level datum does not lower the warehouse roof. The plan labels this distinction.

D17 remains Tessera’s bounded receipt replay through a compromised trade relay. It never establishes remote physical gate control. Snow’s canopy-resin scent is unrelated and innocent. Approved hero designs and voices remain controlling; Snow has canine behavior and sounds only.

## Reuse and reproduce

- [Complete conflict data](output/Conflict_Bible.json)
- [Measured locations](output/Threat_Locations.json)
- [Complete story text](output/Companion_Stories.json)
- [Art prompts and hashes](output/Art_Manifest.json)
- [Volume index](output/Volume_Index.json)
- [Validation record](output/VALIDATION.json)
- [Verified Drive references](output/Drive_Links.json)
- [Individual measured SVGs](plans/)

Building plans use a southwest origin in metres. Site plans use their center as origin, x east and y north. Settlement coordinates and regional kilometre coordinates are distinct. An upper-floor diagram is accessed by the inherited stairs; it does not add an exterior door.

For Blackwake, blue background means open air. Three craft berth envelopes are not extra walkable decks. West and east boarding planks connect to the three-arm deck arrangement. Scene state must specify which of the three craft is present.

Art establishes materials, light and atmosphere. Measurements, doors, connections and collision layers come from the vector sheets and structured data. The source image files are preserved; panel crops are layout instructions recorded in the location art mapping.

Requirements: Python 3, ReportLab, PyMuPDF and DejaVu fonts under /usr/share/fonts/truetype/dejavu. Keep this directory adjacent to v3.0.0, which supplies World_Atlas.json and Blueprint_Data.json. Place the three final PNGs in art/ using the exact names in the art manifest.

Run:

    python author_conflict.py
    python build_locations.py
    python write_stories.py
    python render_conflict.py

The author script generates the canon text. The location script adds inherited geometry and validates the new features. The story script generates both complete prose texts. The renderer builds the two PDFs and seven vector sheets are produced by the location script.

A rebuild resets geometric validation; it does not imply a fresh visual review. Review rendered pages after edits. Delivered books were inspected as full contact sheets and at individual dense pages; text bounds, inherited geometry, character references, hazard-free route samples and the disconnected Cut Span approaches were checked.

This is a creative-source archive for a fictional world. It is not a production deployment, real-world construction specification or claim that application tests passed. All older editions remain preserved.
