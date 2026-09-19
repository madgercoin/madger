# Burrow Run — first playable release

## Product reading

The first game should prove that MADGER can support a recognizable, repeatable play experience without overcommitting to the roadmap's broader game direction. The available project record consistently emphasizes the Honey Badger character, The Burrow, short useful missions, source verification, calm anti-hype language, open access, privacy, and evidence over promises. Burrow Run turns those themes into mechanics rather than adding disconnected lore.

The requested “Design Madger game ideas” thread is not included in this repository checkout or its available integrations. This brief records the implementation decisions derived from the repository sources so future thread details can be compared against explicit choices rather than hidden assumptions.

## Chosen concept

**Burrow Run** is a one-minute, three-lane browser game:

- MADGER moves between tunnels and collects gold **signals**.
- Red **noise** costs one of three grit points and resets the streak.
- Rare green **grit** restores one point and awards a small score bonus.
- Every five consecutive signals increases the score multiplier, up to five times.
- Difficulty rises gradually by increasing object speed and spawn frequency.
- The run ends after 60 seconds or after three noise hits.

This loop was selected over combat, token-gated progression, idle rewards, and speculative play-to-earn concepts because it is immediately understandable, brand-specific, achievable with the current static architecture, and safe to release as a small controlled game experiment.

## Experience principles

1. **Play before promotion.** The page opens with the game premise and controls, not a purchase path.
2. **Brand as mechanics.** Signal, noise, grit, and digging reflect MADGER's existing voice and safety purpose.
3. **No wallet, account, or network dependency.** The complete game runs locally and saves only the best score in browser storage.
4. **One-minute replay loop.** A short fixed round supports casual sharing and practical usability testing.
5. **Input parity.** Keyboard and large touch controls provide the same actions; the tab-focusable field has a descriptive label.
6. **Player control.** Pause, automatic pause on tab hiding, opt-in sound, and reduced-motion handling are included at launch.
7. **No implied value.** Scores have no token, prize, cash, eligibility, or financial value.

## V1 boundaries

Included: single-player play, responsive presentation, local best score, escalating challenge, score streaks, pause/resume, optional synthesized sound, keyboard/touch controls, status announcements, and a route back to the real source verifier.

The continuation pass makes that progression explicit. Runs now move through **Upper Tunnel**, **Deep Burrow**, and **Bedrock**, with authored two- and three-item waves that ask the player to choose a lane instead of merely reacting to isolated random objects. A rotating UTC daily field mark gives each run a concrete optional goal, while the debrief reports recovered signals, best streak, and objective completion. Aggregate run and signal totals remain local groundwork for a future private player record; they are never transmitted.

Not included: wallet connection, token rewards, accounts, leaderboards, analytics, ads, third-party scripts, user-generated content, multiplayer, or any claim that future game expansion is committed.

## What to learn next

### Replay beta — September 18, 2026

The web and native versions now generate the same course from the UTC date. Retrying before midnight repeats its waves; a new run after midnight uses the new course. The first wave starts in the middle, and the first six seconds of spawning contain only signals. Objects retain their spawn speed through zone changes. A pickup resolves once when its center crosses the visible line at the character; noise grants 0.9 seconds of recovery protection so clustered hazards cannot immediately consume all grit. Signals and grit remain collectible during recovery.

Tap a lane or use the movement controls. Web also supports arrows and A/D, with P to pause. Native controls retain standard accessible button activation and the loop follows animation frames. The combo indicator counts down to the next multiplier; bronze starts at 3,000 points, silver at 8,000, and gold at 15,000. The debrief shows the next medal or a closer personal-best target and offers a direct retry. Medals are score labels, not rewards or additional stored personal data.

Apple enrollment and paid store distribution are paused. Use the web beta first; Android preview builds can test native behavior. Do not infer physical-device acceptance or enjoyment from automated tests.

For a five-minute playtest, let a player start without coaching, then observe three runs. Ask which object hurt them, whether movement followed their input, whether the next score target made sense, and whether they want another run. Record feedback voluntarily without adding telemetry. Prioritize unreadable hits, missed controls, and repeated early deaths before adding more content. Resume store investment only after real players choose to replay.

Future iteration should depend on observed evidence: completion rate, replay intent from voluntary feedback, accessibility testing with actual assistive technology, comprehension of signal/noise/grit, difficulty across phone sizes, and whether players want deeper score chasing or a story-driven format. No telemetry was added in this release, so any measurement method needs a separate privacy and security decision.

The game rules now live in a pure module so score boundaries, grit behavior, phases, daily-objective rotation, and late-game safe lanes can be tested behaviorally without a browser. This is the foundation for balancing from evidence rather than changing embedded magic numbers without regression coverage.

## App deployment and hardening

Burrow Run is a first-class part of the installed Burrow App rather than only a linked web page. The App home and proof ledger expose it, the web-app manifest offers a Play shortcut, and the service worker precaches the route, styles, runtime, rules module, and character emblem for offline replay after installation. Opening the game directly also registers the same service worker.

The private field record makes local persistence legible by showing total runs, signals, best streak, and distinct daily marks. Resetting requires a two-step confirmation. Persisted input is normalized before use, duplicate or malformed mark dates are removed, record history is bounded, negative best scores are rejected, and unavailable browser audio now degrades to a visible muted state instead of interrupting play.
