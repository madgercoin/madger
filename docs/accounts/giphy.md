# MADGER GIPHY

Updated: 2026-10-19

## Account

- Active channel: https://giphy.com/channel/MadgerDaBadger
- Username: MadgerDaBadger
- Display name: MADGER | The Burrow
- Sign-in method: Continue with Google, using the existing MADGER Google account selected by the account owner.
- Settings: https://giphy.com/settings
- Website: https://madgercoin.com
- X: https://x.com/MadgerDaBadger
- Instagram: https://instagram.com/madgercoin
- TikTok: https://www.tiktok.com/@themadgercoin

This public repository intentionally contains no password, Google email identifier, authentication token, cookie, recovery code, or API key. No separate GIPHY password was created or changed.

## Channel history

The existing https://giphy.com/madgercoin channel is separate from the account signed in on 2026-10-19. It was inspected but not changed. Do not assume this Google sign-in controls that older channel.

## Content rules

Use approved MADGER assets featuring Madger, Snow White, Gorilla White, and Madger Bot. Madger must not have the retired large fang. Snow White has bark sound effects only and never a speaking voice. Preserve approved character likenesses. Use character and reaction tags that describe each upload. Link source attribution to https://madgercoin.com.

## Verified setup and publication status

- Profile name, username, official logo avatar, bio, website, and current social links saved and verified on the channel.
- Public collection: https://giphy.com/channel/MadgerDaBadger/official-madger-animations
- Owner confirmed acceptance of GIPHY's terms and publication of both GIFs on 2026-10-19.
- GIPHY confirmed **Upload Complete!** for both files on 2026-10-19:

| Asset | Live GIF URL | Source |
| --- | --- | --- |
| MADGER Official Outro | https://giphy.com/gifs/IqGu2YS7SRBmMw663B | https://madgercoin.com/assets/Madger_Official_Outro_Clip.mp4 |
| Madger Productions Intro | https://giphy.com/gifs/jlJTSsEJuyeqOc38I6 | https://madgercoin.com/assets/Madger_Productions_Presents_Intro_clip.mp4 |

Both were submitted as public 640 x 360 GIFs at 15 fps, with source attribution to https://madgercoin.com and the Official MADGER Animations collection selected. Shared tags: madger, madgercoin, the burrow, honey badger, madgerdabadger, animation. Individual tags: outro; intro and madger productions.

GIPHY's URL-import uploads returned errors. The same approved public MP4 sources were downloaded from madgercoin.com, converted to GIF, and successfully uploaded as local files. Do not retry the failed URL-import forms; doing so could create duplicates.

## Heroes of The Burrow expansion — 2026-10-19

Collection: https://giphy.com/channel/MadgerDaBadger/heroes-of-the-burrow

Five additional public GIFs were uploaded successfully; GIPHY showed "Upload Complete!" and returned each live URL. These are 4-second, 640 x 360, 12 fps looping GIFs extracted from the approved cinematic teaser already published through Buffer. Source campaign: social/campaigns/2026-10-19-game-teaser.json. These are cinematic animation clips, not actual gameplay.

| Clip | Source interval (seconds) | Live URL | Individual tags |
| --- | --- | --- | --- |
| Madger — ready for adventure | 22–26 | https://giphy.com/gifs/AXEeScZX5ZN0tzZWg7 | honey badger, lets go, ready, adventure |
| Snow White — charge | 32–36 | https://giphy.com/gifs/VaZBvV7DqxxlhRsFWC | snow white, white dog, charge, lets go, dog |
| Gorilla White — protector | 42–46 | https://giphy.com/gifs/Lc5h3JflaimcielKZY | gorilla white, gorilla, protector, gentle giant, guard |
| Madger Bot — power up | 52–56 | https://giphy.com/gifs/UM7TRG0luUqx1GJ3fB | madger bot, robot, power up, tech, energy |
| Heroes — team assemble | 64–68 | https://giphy.com/gifs/vEyRR5CSMkEAdr6dxe | teamwork, squad, team assemble, friends, heroes |

Shared tags: madger, madgercoin, the burrow, heroes of the burrow, madgerdabadger, animation. Source attribution: https://madgercoin.com. All five were assigned to Heroes of The Burrow.

The approved teaser was obtained from its existing Buffer publication asset. No credentials or expiring media-access URLs are stored here. Finished GIF files and a downloadable pack are retained with the owner's files.

## Automatic publishing — enabled

The owner stored GIPHY_API_KEY as an encrypted repository Actions secret. Credential check passed, and the live API publication verified the target channel owner as MadgerDaBadger.

- Live test GIF, Madger — confident hero: https://giphy.com/gifs/HEZuwHN3v2nq4jFjgb
- Verified publication run: https://github.com/madgercoin/madger/actions/runs/39354009150
- The channel now has eight published GIFs.
- Publisher workflow: .github/workflows/giphy-publisher.yml
- Queue, source files, tests, and setup: giphy-publisher/
- Durable publication records: giphy-publisher-state branch, giphy-publisher-ledger/

Four additional approved GIFs are queued for automatic publication at 7:15 PM America/New_York:

| Local date | Prepared GIF |
| --- | --- |
| 2026-10-20 | Snow White — on the attack |
| 2026-10-22 | Gorilla White — shield up |
| 2026-10-27 | Madger Bot — energy boost |
| 2026-10-29 | Welcome to The Burrow |

The workflow runs Tuesday/Thursday at 19:15 with a 19:45 catch-up check, explicitly using the America/New_York timezone. GitHub may delay scheduled runs. It publishes at most one regular item per local date and records successful uploads to prevent reposting. No browser session or routine owner approval is needed. The creator explicitly authorized automatic publication of prepared relevant content.

A durable reservation is saved before each upload. An uncertain response, unverified channel owner, or rejected upload pauses the queue rather than risking a duplicate. The initial queue covers these four future posts; an empty queue does not generate or recycle content. Add distinct approved GIFs to extend it.

The publisher's ten behavior tests and the repository CI checks passed on initial deployment. No API key, token, cookie, private Google email identifier, or password is stored in this public document or source files.

References:
- https://developers.giphy.com/docs/api/endpoint/upload/
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
