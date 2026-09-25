# MADGER: Burrow Heist — Reclaim the Block

## Decision record

This is the game direction selected on September 12, 2026 after comparing ten implementation approaches. It supersedes **Burrow Siege** as the primary long-form MADGER game concept. Burrow Siege remains useful as the shape of the first combat test: a compact holdout under escalating pressure.

The selected product is a cinematic 2.5D, landscape, browser-first action roguelite built with Phaser and TypeScript. It must work on mobile and desktop, install as part of the PWA, and launch as a complete single-player game before asynchronous Ghost Runs or cooperative play are considered.

The order of work is fixed:

1. prove the **Last Claw Out** combat loop;
2. add the persistent Burrow and district progression;
3. add server validation and anti-cheat before any ranked reward system;
4. add asynchronous Ghost Runs;
5. consider two-player Crew Runs only after the solo game is stable and fun.

Gameplay is off-chain. Solana is not used for movement, combat, scores, or ordinary progression. Any future purchase, vault, or claim flow requires a separate custody, security, privacy, accessibility, and compliance decision.

## Player promise

Enter an occupied district, recover what matters, and decide how much farther to push before the block closes around you. Every run should create one clear tension: **leave with what you have, or risk it to reclaim more**.

The game must feel like MADGER: direct, stubborn, clever, and composed under pressure. It must not resemble a wallet task with a game wrapped around it.

## Full-run structure

The intended full run lasts 8–12 minutes.

1. **Choose a contract.** Select a district objective and visible risk conditions.
2. **Enter the block.** Move through modular rooms with combat, hazards, rescues, and resources.
3. **Complete the objective.** Recover proof, rescue crew, disable a jammer, or retake a position.
4. **Choose.** Extract through a defended exit or go deeper for a harder room and better run resources.
5. **Last Claw Out.** Hold the exit, defeat the district Warden, and complete extraction.
6. **Debrief.** Bank rescued crew, recovered resources, and Proof Points; unextracted run resources are lost.
7. **Rebuild the Burrow.** Unlock rooms, tools, characters, missions, and story without selling combat power for money.

## Core rules

### Player verbs

- **Move:** eight-direction movement.
- **Aim:** independent pointer or right-stick direction.
- **Claws / tool:** primary attack with readable reach, cadence, and recovery.
- **Dash:** short directional burst with a limited invulnerability window and visible cooldown.
- **Burrow:** brief underground reposition that breaks ordinary enemy targeting; it cannot pass through the district boundary or bypass objectives.
- **Interact:** activate switches, open recovery caches, rescue crew, and begin extraction.
- **Carry:** some objectives occupy the carry slot and change movement or attack choices.

Keyboard, pointer, gamepad, and touch must reach the same mechanical result. Touch may use a left movement stick plus aim/attack, dash, burrow, and interact controls. Pausing and automatic pause on lost visibility are mandatory.

### Combat readability

- Damage must be indicated by motion, sound, shape, and text—not color alone.
- Every hostile attack has an anticipation cue and a recoverable response window.
- Player and objective damage use short recovery windows to prevent one collision from draining multiple hits.
- Boss attacks may be difficult, never unreadable.
- Reduced-motion mode removes screen shake, strong flashes, and nonessential camera movement without changing timing or difficulty.

### Failure and extraction

A run ends when MADGER is downed, a required objective is destroyed, or the player successfully extracts. A downed run keeps permanent discoveries already confirmed before the run but loses unbanked run resources. No real token, cash, prize, or eligibility follows from a client-side score.

## First playable slice: Last Claw Out

The first build is a two-minute mechanical vertical slice on **Signal Row**, the first district. MADGER has recovered a proof cache and must defend the extraction beacon until the route opens.

The slice contains:

- one playable character;
- one arena with clear traversable and blocked space;
- a 120-second run in three pressure phases;
- six enemy roles;
- one boss, **The Block Warden**;
- a protected proof cache with its own integrity meter;
- player health, experience, levels, dash, and burrow;
- three-choice upgrade drafts during the run;
- fifteen temporary upgrades;
- a successful extraction state and two distinct failure states;
- pause, sound toggle, reduced-motion behavior, keyboard, pointer, and touch controls;
- a bounded local field record; and
- no wallet, account, network request, leaderboard, or token reward.

### Phase timing

| Time | Phase | Purpose |
| --- | --- | --- |
| 0–39 seconds | Sweep | Teach movement, aiming, attacks, the cache, and ordinary melee pressure. |
| 40–84 seconds | Lockdown | Mix ranged pressure, faster attackers, and objective threats. |
| 85–120 seconds | Warden | Spawn the district boss and supporting pressure; extraction succeeds when the clock expires and the boss is defeated. |

If the timer expires while the Warden remains active, the route stays closed and the run continues until the Warden or MADGER falls. This prevents passive survival from replacing the boss objective.

### Enemy roster

| Enemy | Readable role | Primary behavior |
| --- | --- | --- |
| Scrounger | Standard melee | Walks directly toward MADGER and attacks at close range. |
| Rusher | Fast flanker | Pauses, telegraphs, then commits to a fast straight charge. |
| Spitter | Ranged pressure | Keeps distance and fires a slow, visible projectile. |
| Burrower | Reposition threat | Marks a destination, disappears, then surfaces near MADGER. |
| Bulwark | Armored blocker | Moves slowly, resists frontal damage, and protects smaller enemies. |
| Snatcher | Objective threat | Ignores MADGER when possible and attacks the proof cache. |
| Block Warden | District boss | Alternates pursuit, a telegraphed charge, and a radial warning attack. |

### Temporary upgrade pool

The player receives three distinct choices at each level and may take one. The pool begins with fifteen upgrades:

1. Sharpened Claws — primary damage.
2. Quick Cut — attack cadence.
3. Wide Arc — projectile or strike width.
4. Twin Slash — occasional second strike.
5. Puncture — partial armor bypass.
6. Thick Hide — maximum health and immediate recovery.
7. Swift Paws — movement speed.
8. Hard Dash — dash damage.
9. Deep Breath — shorter burrow cooldown.
10. Second Wind — one low-health recovery per run.
11. Ricochet Stone — attacks can jump to a nearby enemy.
12. Tripwire — periodic trap near the cache.
13. Decoy Scent — periodically redirects ordinary enemies.
14. Magnetic Loot — larger experience pickup radius.
15. Crew Assist — periodic supporting shot from the extraction point.

Upgrade names, quantities, and balance are prototype values. The behaviors are testable rules, not economy promises.

## MVP content after combat validation

The first complete single-player MVP expands the proven combat slice to:

- one reclaimable neighborhood;
- twelve modular rooms;
- six ordinary enemy types and one district boss;
- three objective families;
- approximately twenty-five temporary run upgrades;
- three persistent Burrow rooms;
- risk/reward extraction decisions;
- one deterministic weekly challenge; and
- a complete 8–12-minute run with a debrief and local progression.

The three first objectives are:

1. **Recover Proof:** locate and carry a proof cache to extraction.
2. **Free the Crew:** find and release trapped Burrow members before the lockdown.
3. **Break the Jammer:** activate multiple stations, then defend the final uplink.

The first persistent rooms are:

- **Workshop:** unlocks side-grade tools and their starting loadouts.
- **Field Desk:** exposes contracts, modifiers, and recovered district records.
- **Crew Quarters:** records rescued characters and unlocks non-ranked support choices.

## Screen flow

1. **Game home:** title, current playable operation, local record, sound, and direct Start action.
2. **Field brief:** objective, failure conditions, control reminder, and no-wallet/no-reward disclosure.
3. **Loadout:** one starting tool in the first slice; expanded choices arrive only after validated combat.
4. **Run:** full-screen playfield, health, cache integrity, phase timer, boss state, XP, level, dash, and burrow cooldowns.
5. **Upgrade draft:** the game pauses; three readable choices; one selection returns directly to play.
6. **Extraction result:** success, MADGER down, or cache lost.
7. **Debrief:** time, enemies cleared, boss result, cache integrity, Proof Points, upgrades used, and an immediate Run Again action.
8. **Burrow:** unavailable in the first slice; shown only after it has functional progression behind it.

The playable action must be in the first viewport. A marketing hero must never sit in front of the game.

## Progression and rewards

**Proof Points** are the game’s nonfinancial progression measure. In the first slice they are calculated and saved locally only. They have no token, prize, cash, eligibility, or exchange value.

Ranked boosts cannot be purchased. A future seasonal `$MADGER` vault remains conditional on server-authoritative run validation, anti-cheat controls, wallet safety, legal/compliance review, published rules, and a separate founder authorization. Rewards must never be paid per kill or represented as guaranteed.

## Ghost Runs and cooperative play

Ghost Runs replay validated paths, timing, and outcomes asynchronously. They do not permit another player or client to authoritatively change the active run. Two-player Crew Runs are a later phase and cannot precede stable solo networking, deterministic rules, abuse controls, and accessible communication design.

## Validation gates

Combat is ready to expand only when:

- movement, aim, attack, dash, and burrow are understandable without coaching;
- players can identify why they took damage;
- touch and keyboard players can complete the same objective;
- pause/resume never advances timers or applies hidden damage;
- the Warden can be defeated without a mandatory upgrade combination;
- the cache cannot be damaged repeatedly by one collision or one projectile;
- local records are sanitized and bounded;
- client-side tampering cannot be mistaken for a validated ranked result; and
- voluntary testers choose to replay because the combat is enjoyable, not because a reward is implied.

## Future decisions

Art production for prerendered 3D characters, server provider, validation protocol, account model, Ghost Run storage, anti-cheat review, progression tuning, economy rules, seasonal vault funding, geographic eligibility, and cooperative networking remain undecided. None is required for the first local combat slice.
