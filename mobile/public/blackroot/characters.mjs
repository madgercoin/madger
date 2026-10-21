/* Generated from the existing Expedition character rigs. */
export function legacyCharacters(Renderer){
const factories={},cache={};function require(n){n=n.replace(/^\.\//, "");if(cache[n])return cache[n].exports;const module={exports:{}};cache[n]=module;factories[n](require,module,module.exports);return module.exports;}
factories["math"]=function(require,module,exports){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identity = void 0;
exports.multiply = multiply;
exports.transform = transform;
exports.perspective = perspective;
exports.lookAt = lookAt;
exports.segment = segment;
const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
exports.identity = identity;
function multiply(a, b) {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let row = 0; row < 4; row++)
            r[c * 4 + row] = a[row] * b[c * 4] + a[4 + row] * b[c * 4 + 1] + a[8 + row] * b[c * 4 + 2] + a[12 + row] * b[c * 4 + 3];
    return r;
}
function transform(x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
    return new Float32Array([(c * e + d * b * f) * sx, a * f * sx, (-d * e + c * b * f) * sx, 0, (-c * f + d * b * e) * sy, a * e * sy, (d * f + c * b * e) * sy, 0, d * a * sz, -b * sz, c * a * sz, 0, x, y, z, 1]);
}
function perspective(fov, aspect, near = .1, far = 150) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function norm(v) { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function lookAt(eye, target) {
    const z = norm([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}
function segment(a, b, radius) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.max(.0001, Math.hypot(dx, dy, dz));
    const y = norm([dx, dy, dz]), ref = Math.abs(y[1]) > .99 ? [1, 0, 0] : [0, 1, 0], x = norm(cross(ref, y)), z = cross(x, y);
    return new Float32Array([x[0] * radius, x[1] * radius, x[2] * radius, 0, y[0] * len, y[1] * len, y[2] * len, 0, z[0] * radius, z[1] * radius, z[2] * radius, 0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1]);
}
};
factories["companions"]=function(require,module,exports){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANION_PICKUPS = exports.COMPANIONS = exports.COMPANION_IDS = void 0;
exports.companionId = companionId;
exports.freshCompanion = freshCompanion;
exports.freshCompanions = freshCompanions;
exports.clearCompanionAction = clearCompanionAction;
exports.sanitizeCompanions = sanitizeCompanions;
exports.pawCycle = pawCycle;
exports.actionProgress = actionProgress;
exports.arrivalWeight = arrivalWeight;
exports.COMPANION_IDS = ['snow', 'gorilla', 'bot'];
exports.COMPANIONS = {
    snow: { name: 'Snow White', role: 'ATTACK', duration: 18, cooldown: 1.8, actionDuration: .90, impactAt: .40, color: '#D990B0', item: 'snow-white', offset: -1.35,
        description: 'Runs alongside Madger and leaps at approaching drones and crates. Her attacks clear a threat in your path and award 125 points. Gaps, steam and stone still require your attention.' },
    gorilla: { name: 'Gorilla White', role: 'DEFENSE', duration: 16, cooldown: .80, actionDuration: .80, impactAt: 0, color: '#DFE6EE', item: 'gorilla-white', offset: 1.55,
        description: 'Provides three bodyguard saves, including catching Madger at a broken ledge. Each save preserves your grit and shield. Protection ends when time or guard charges run out.' },
    bot: { name: 'Madger Bot', role: 'TECH BOOST', duration: 14, cooldown: 3.0, actionDuration: 1.0, impactAt: .35, color: '#73DFEE', item: 'madger-bot', offset: .75,
        description: 'Adds 45 burst energy on arrival, recharges energy, magnetizes pickups and disables nearby electronic traps. A burst activated with Bot lasts 1.2 seconds longer.' },
};
exports.COMPANION_PICKUPS = { 'snow-white': 'snow', 'gorilla-white': 'gorilla', 'madger-bot': 'bot' };
function companionId(kind) {
    return Object.prototype.hasOwnProperty.call(exports.COMPANION_PICKUPS, kind) ? exports.COMPANION_PICKUPS[kind] : null;
}
function freshCompanion() {
    return { timeLeft: 0, joinedAt: -100, lastActionAt: -100, cooldown: 0, charges: 0, arrivals: 0, actions: 0,
        followX: 0, followVx: 0, targetId: null, targetD: 0, targetX: 0, targetRoute: 'main', actionRemaining: 0, resolved: false };
}
function freshCompanions() { return { snow: freshCompanion(), gorilla: freshCompanion(), bot: freshCompanion() }; }
const limit = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const finite = (v, lo, hi, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? limit(v, lo, hi) : fallback;
const count = (v, max) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? Math.min(max, v) : 0;
function clearCompanionAction(c) { c.targetId = null; c.actionRemaining = 0; c.resolved = false; }
/** Existing version-1 checkpoints gain an empty team; invalid targets cannot be replayed. */
function sanitizeCompanions(input, validIds, time) {
    const team = freshCompanions();
    if (!input || typeof input !== 'object')
        return team;
    const raw = input;
    for (const id of exports.COMPANION_IDS) {
        const p = raw[id];
        if (!p || typeof p !== 'object')
            continue;
        const c = team[id], meta = exports.COMPANIONS[id];
        Object.assign(c, { timeLeft: finite(p.timeLeft, 0, meta.duration), joinedAt: finite(p.joinedAt, -100, time, -100),
            lastActionAt: finite(p.lastActionAt, -100, time, -100), cooldown: finite(p.cooldown, 0, meta.cooldown),
            charges: id === 'gorilla' ? count(p.charges, 3) : 0, arrivals: count(p.arrivals, 100), actions: count(p.actions, 1000),
            followX: finite(p.followX, -5, 5), followVx: finite(p.followVx, -25, 25), targetD: finite(p.targetD, 0, 1080),
            targetX: finite(p.targetX, -2.6, 2.6), targetRoute: ['main', 'hollow', 'grotto', 'rootway', 'ridge', 'deep', 'mosswalk', 'root-arch', 'log-crossing', 'causeway', 'watchtower', 'gearworks', 'mudslide', 'crystal-vein', 'ancient-vault'].includes(p.targetRoute ?? '') ? p.targetRoute : 'main',
            actionRemaining: finite(p.actionRemaining, 0, meta.actionDuration), resolved: p.resolved === true,
            targetId: Number.isSafeInteger(p.targetId) && validIds.has(p.targetId) ? p.targetId : null });
        if (c.timeLeft <= 0) {
            c.charges = 0;
            clearCompanionAction(c);
        }
        if (id !== 'gorilla' && c.targetId === null)
            clearCompanionAction(c);
    }
    return team;
}
/** Continuous quadruped contact/swing pose; stance travels with the ground. */
function pawCycle(distance, phaseOffset, running) {
    const stride = 3.4, contact = .22;
    const phase = ((distance / stride + phaseOffset) % 1 + 1) % 1;
    if (!running)
        return { z: 0, y: .10, stance: true };
    if (phase < contact)
        return { z: -.38 + phase * stride, y: .10, stance: true };
    const u = (phase - contact) / (1 - contact), ease = u * u * (3 - 2 * u);
    return { z: .368 - .748 * ease, y: .10 + Math.sin(Math.PI * u) * .28, stance: false };
}
function actionProgress(id, c) { return c.actionRemaining > 0 ? limit(1 - c.actionRemaining / exports.COMPANIONS[id].actionDuration, 0, 1) : 0; }
function arrivalWeight(c, time) { const v = limit((time - c.joinedAt) / .55, 0, 1); return v * v * (3 - 2 * v); }
};
factories["core"]=function(require,module,exports){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OVERGROWN_ROUTES = exports.SUB_FORKS = exports.MAJOR_FORKS = exports.CHAMBERS = exports.HERO_SHARD_TARGET = exports.slide = exports.ZONES = exports.smooth = exports.clamp = exports.HAZARDS = exports.KINDS = exports.ENGINE_VERSION = exports.MAX_HP = exports.BONUS_LEDGE_LENGTH = exports.BONUS_LEDGE_HEIGHT = exports.LANE_WIDTH = exports.TRACK_LENGTH = exports.STEP = void 0;
exports.randomGenerator = randomGenerator;
exports.daySeed = daySeed;
exports.freshExpedition = freshExpedition;
exports.buildCourse = buildCourse;
exports.zoneAt = zoneAt;
exports.environmentZone = environmentZone;
exports.hazardPose = hazardPose;
exports.branchOffset = branchOffset;
exports.routeOffset = routeOffset;
exports.begin = begin;
exports.pause = pause;
exports.resume = resume;
exports.steer = steer;
exports.jump = jump;
exports.burrow = burrow;
exports.burst = burst;
exports.chooseUpgrade = chooseUpgrade;
exports.recruitCompanion = recruitCompanion;
exports.bonusDeckAt = bonusDeckAt;
exports.fixedStep = fixedStep;
exports.createClock = createClock;
exports.advance = advance;
exports.nearbyHint = nearbyHint;
exports.resolveChamber = resolveChamber;
exports.availableForks = availableForks;
exports.overgrownPathOffset = overgrownPathOffset;
exports.overgrownPathWidth = overgrownPathWidth;
exports.overgrownPathHeight = overgrownPathHeight;
exports.freshOvergrownExpedition = freshOvergrownExpedition;
exports.chooseFork = chooseFork;
exports.activateHero = activateHero;
exports.buildOvergrownCourse = buildOvergrownCourse;
/** MADGER Expedition: deterministic, renderer-independent 3D gameplay rules.
 * Distances are metres; times are seconds. No display or sound RNG enters physics.
 */
const companions_1 = require("./companions");
exports.STEP = 1 / 120;
exports.TRACK_LENGTH = 1080;
exports.LANE_WIDTH = 2.15;
/** Raised terraces retain the parent route and have a safe adjacent lower lane. */
exports.BONUS_LEDGE_HEIGHT = .9;
exports.BONUS_LEDGE_LENGTH = 14;
exports.MAX_HP = 3;
exports.ENGINE_VERSION = 1;
exports.KINDS = ['coin', 'gem', 'heart', 'shield', 'magnet', 'life', 'key', 'vault', 'workshop', 'burrow', 'boulder', 'saw', 'roots', 'steam', 'gap', 'mud', 'drone', 'crate', 'snow-white', 'gorilla-white', 'madger-bot', 'snow-sigil', 'guardian-totem', 'tech-cell', 'treasure-cache', 'chamber-door', 'bonus-ledge'];
exports.HAZARDS = new Set(['boulder', 'saw', 'roots', 'steam', 'gap', 'mud', 'drone', 'crate']);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
exports.clamp = clamp;
const smooth = (v) => { const x = (0, exports.clamp)(v, 0, 1); return x * x * (3 - 2 * x); };
exports.smooth = smooth;
function randomGenerator(initial) {
    let state = initial >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
function daySeed(day) {
    let value = 2166136261;
    for (const char of day)
        value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return value >>> 0;
}
function freshExpedition(seed = 1, id = `expedition-${seed}`) {
    return { version: 1, seed: seed >>> 0, id, mode: 'ready', resumeMode: 'running', tick: 0, time: 0,
        distance: 0, countdown: 2.4, lane: 0, x: 0, vx: 0, y: 0, vy: 0, slide: 0, slideAge: 0, slideCooldown: 0,
        jumpBuffer: 0, speed: 9.8, hp: 3, lives: 0, shields: 0, shieldTime: 0, magnet: 0, burst: 0,
        energy: 0, immune: 0, mud: 0, score: 0, coins: 0, gems: 0, combo: 0, bestCombo: 0,
        hits: 0, nearMisses: 0, keys: 0, route: 'main', routeStart: 0, routeEnd: 0,
        routeSide: 0, secrets: [], upgrade: null, used: [], eventId: 0, lastHurt: -10,
        lastGood: -10, lastFoot: -1, zone: 0, finished: false, companions: (0, companions_1.freshCompanions)() };
}
function buildCourse(seed) {
    const random = randomGenerator(seed), items = [];
    const side = (random() < .5 ? -1 : 1);
    const add = (d, lane, kind, route = 'main') => {
        items.push({ id: items.length, d, lane, kind, phase: random() * Math.PI * 2, route });
    };
    // Teach collection and movement before asking for a timed avoidance action.
    for (const d of [18, 24, 30, 36, 42, 48])
        add(d, 0, 'coin');
    add(64, -1, 'boulder');
    for (const d of [62, 68, 74])
        add(d, 0, 'coin');
    add(91, 0, 'saw');
    add(90, 1, 'gem');
    add(113, 1, 'roots');
    add(116, -1, 'shield');
    let safe = 0;
    const families = [['boulder', 'saw', 'roots', 'crate'], ['steam', 'mud', 'drone', 'saw'], ['gap', 'boulder', 'roots', 'steam', 'drone']];
    const reserved = [180, 405, 465, 660, 780, 1010];
    for (let d = 142; d < 1020; d += 25) {
        if (reserved.some(spot => Math.abs(d - spot) < 22))
            continue;
        safe = (0, exports.clamp)(safe + (random() < .5 ? -1 : 1), -1, 1);
        const zone = Math.min(2, Math.floor(d / 360)), types = families[zone];
        for (const lane of [-1, 0, 1]) {
            if (lane === safe)
                continue;
            if (d < 320 && random() < .35)
                continue;
            add(d, lane, types[Math.floor(random() * types.length)]);
        }
        for (const offset of [-5, 0, 5])
            add(d + offset, safe, 'coin');
        if (Math.floor(d / 25) % 6 === 0)
            add(d + 10, safe, random() < .5 ? 'heart' : 'magnet');
    }
    add(180, side, 'burrow');
    for (let d = 198; d <= 252; d += 6)
        add(d, (Math.floor((d - 198) / 18) % 3 - 1), 'gem', 'hollow');
    add(235, 0, 'life', 'hollow');
    add(251, 0, 'magnet', 'hollow');
    add(405, -side, 'workshop');
    add(465, 0, 'key');
    add(660, side, 'vault');
    add(780, -side, 'burrow');
    for (let d = 798; d <= 852; d += 6)
        add(d, (Math.floor((d - 798) / 18) % 3 - 1), 'gem', 'grotto');
    add(826, 0, 'life', 'grotto');
    add(846, 0, 'shield', 'grotto');
    add(1010, 0, 'vault');
    // Append IDs after the existing course so legacy recovery points retain item identity.
    add(50, 0, 'snow-white');
    add(78, 0, 'crate');
    add(126, 0, 'gorilla-white');
    add(156, 0, 'madger-bot');
    add(225, 0, 'madger-bot', 'hollow');
    add(390, 0, 'snow-white');
    add(646, 0, 'gorilla-white');
    add(930, 0, 'madger-bot');
    return items.sort((a, b) => a.d - b.d || a.id - b.id);
}
function zoneAt(distance) { return Math.min(2, Math.floor(distance / 360)); }
/** Presentation biome follows the selected route, not the legacy distance zone. */
function environmentZone(s) {
    if (s.board !== 'overgrown')
        return s.zone;
    return ['deep', 'mudslide', 'crystal-vein', 'ancient-vault'].includes(s.route) ? 2 :
        ['ridge', 'causeway', 'watchtower', 'gearworks'].includes(s.route) ? 1 : 0;
}
exports.ZONES = [
    { name: 'THE OVERGROWN BURROW', subtitle: 'Lanterns, roots and hidden hollows', color: '#ffc766' },
    { name: 'THE FORGOTTEN WORKS', subtitle: 'Pressure, machinery and buried treasure', color: '#74e5df' },
    { name: 'THE CRYSTAL GROTTO', subtitle: 'Broken bridges and valuable discoveries', color: '#c6a5ff' },
];
/** The same motion is used for visible moving traps and their collision centres. */
function hazardPose(item, time, distance) {
    let x = item.lane * exports.LANE_WIDTH, y = 0, active = true;
    if (item.kind === 'drone') {
        x += Math.sin(time * 2.2 + item.phase) * .36;
        y = .72 + Math.sin(time * 3 + item.phase) * .15;
    }
    if (item.kind === 'saw')
        x += Math.sin(time * 1.8 + item.phase) * .28;
    if (item.kind === 'steam')
        active = ((time + item.phase) % 3.2) > 1.05;
    const ahead = item.d - distance;
    let worldD = item.d, roll = 0;
    if (item.kind === 'boulder') {
        // A distance-keyed rockfall starts on a visible bank 32m ahead. Its
        // lateral descent finishes before the collision corridor; the same pose
        // drives drawing, swept collision and recovery, independent of frame rate.
        const side = item.lane || (Math.sin(item.phase) >= 0 ? 1 : -1);
        const fall = (0, exports.smooth)((32 - ahead) / 22), travel = (0, exports.clamp)(32 - ahead, 0, 40);
        x = side * 6.6 + (item.lane * exports.LANE_WIDTH - side * 6.6) * fall;
        y = 2.6 * (1 - fall) + .045 * Math.abs(Math.sin(travel * 3.1)) * fall;
        worldD = item.d + .18 * (0, exports.clamp)(ahead, -8, 32);
        roll = travel * .62;
    }
    return { x, y, active, ahead: worldD - distance, d: worldD, roll };
}
/** Branch paths visibly diverge and rejoin. Coordinates are continuous at both ends. */
function branchOffset(distance, start, end, side) {
    const entry = (0, exports.smooth)((distance - start) / 18), exit = (0, exports.smooth)((end - distance) / 20);
    return side * (exports.LANE_WIDTH + (8.5 - exports.LANE_WIDTH) * entry) * exit;
}
function routeOffset(s, distance = s.distance) {
    if (s.board === 'overgrown')
        return overgrownPathOffset(s.route, distance);
    return s.route === 'main' ? 0 : branchOffset(distance, s.routeStart, s.routeEnd, s.routeSide);
}
function event(s, events, kind, text = '', value = 0) {
    events.push({ id: s.eventId++, kind, at: s.time, x: s.x + routeOffset(s), text, value });
}
function begin(s) { if (s.mode === 'ready')
    s.mode = 'countdown'; }
function pause(s) {
    if (s.mode === 'countdown' || s.mode === 'running') {
        s.resumeMode = s.mode;
        s.mode = 'paused';
    }
}
function resume(s) { if (s.mode === 'paused')
    s.mode = s.resumeMode; }
function steer(s, direction) {
    if (s.mode === 'running' || s.mode === 'countdown')
        s.lane = (0, exports.clamp)(s.lane + direction, -1, 1);
}
function jump(s, events) {
    if (s.mode !== 'running')
        return;
    if (s.y - (s.groundHeight ?? 0) <= .025 && s.slide <= .01) {
        s.vy = 8.7;
        s.y = (s.groundHeight ?? 0) + .025;
        s.groundHeight = 0;
        s.jumpBuffer = 0;
        event(s, events, 'jump');
    }
    else if (s.y > .025)
        s.jumpBuffer = .12;
}
/** Down digs beneath overhead obstacles; airborne Down makes a controlled descent.
 * Keep the serialized timers and audio event stable so interrupted older runs resume safely.
 */
function burrow(s, events) {
    if (s.mode !== 'running' || s.slideCooldown > 0)
        return;
    if ((s.groundHeight ?? 0) > .1) {
        steer(s, s.x > 0 ? -1 : 1);
        return;
    }
    if (s.y > .18) {
        s.vy = Math.min(s.vy, -11);
        return;
    }
    s.slide = .83;
    s.slideAge = 0;
    s.slideCooldown = 1.02;
    event(s, events, 'slide');
}
/** Compatibility for older callers; the action now visibly burrows. */
exports.slide = burrow;
function burst(s, events) {
    if (s.mode !== 'running' || s.energy < 100 || s.burst > 0)
        return;
    s.energy = 0;
    s.burst = s.companions.bot.timeLeft > 0 ? 3.6 : 2.4;
    s.lastGood = s.time;
    event(s, events, 'burst', 'MADGER BURST');
}
function chooseUpgrade(s, choice, events) {
    if (s.mode !== 'upgrade' || !['magnet', 'armor', 'fortune'].includes(choice))
        return;
    s.upgrade = choice;
    s.mode = 'running';
    s.immune = Math.max(s.immune, 2);
    if (choice === 'magnet')
        s.magnet = 18;
    if (choice === 'armor') {
        s.shields = 2;
        s.shieldTime = 22;
    }
    s.lastGood = s.time;
    event(s, events, 'upgrade', choice === 'armor' ? 'REINFORCED SHIELD' : choice === 'magnet' ? 'LONG-RANGE MAGNET' : 'TREASURE FINDER');
}
function allyEvent(s, events, kind, id, text, value = 0, target) {
    event(s, events, kind, text, value);
    const e = events[events.length - 1];
    e.companion = id;
    if (target) {
        e.targetD = target.d;
        e.targetX = hazardPose(target, s.time, s.distance).x + routeOffset(s, target.d);
    }
}
function recruitCompanion(s, id, events) {
    if (s.mode !== 'running')
        return;
    const c = s.companions[id], meta = companions_1.COMPANIONS[id], refresh = c.timeLeft > 0;
    if (!refresh) {
        (0, companions_1.clearCompanionAction)(c);
        c.followX = (0, exports.clamp)(s.x + meta.offset, -2.8, 2.8);
        c.followVx = 0;
        c.joinedAt = s.time;
        c.cooldown = id === 'gorilla' ? 0 : .55;
    }
    c.timeLeft = meta.duration;
    c.arrivals++;
    if (id === 'gorilla')
        c.charges = 3;
    if (id === 'bot')
        s.energy = (0, exports.clamp)(s.energy + 45, 0, 100);
    s.lastGood = s.time;
    allyEvent(s, events, 'companion-join', id, meta.name.toUpperCase() + (refresh ? ' · SUPPORT REFRESHED' : id === 'snow' ? ' · ATTACK SUPPORT' : id === 'gorilla' ? ' · 3 GUARD SAVES' : ' · +45 ENERGY / TECH BOOST'));
}
function stepCompanions(s, course, used, events) {
    for (const id of companions_1.COMPANION_IDS) {
        const c = s.companions[id], meta = companions_1.COMPANIONS[id];
        if (c.timeLeft <= 0)
            continue;
        c.timeLeft = Math.max(0, c.timeLeft - exports.STEP);
        c.cooldown = Math.max(0, c.cooldown - exports.STEP);
        // Grounded allies flank the terrace on its clear lower road instead of
        // clipping through its solid bank. Electronic support remains airborne.
        const terrace = course.find(i => i.kind === 'bonus-ledge' && i.route === s.route && s.distance > i.d - 10 && s.distance < i.d + 18);
        const followTarget = terrace && id !== 'bot' ? -.35 * terrace.lane : (0, exports.clamp)(s.x + meta.offset, -2.8, 2.8);
        c.followVx += (64 * (followTarget - c.followX) - 16 * c.followVx) * exports.STEP;
        c.followX += c.followVx * exports.STEP;
        if (c.timeLeft === 0) {
            (0, companions_1.clearCompanionAction)(c);
            c.charges = 0;
            allyEvent(s, events, 'companion-leave', id, meta.name.toUpperCase() + ' · SEE YOU AHEAD');
            continue;
        }
        if (id === 'bot')
            s.energy = (0, exports.clamp)(s.energy + 2.5 * exports.STEP, 0, 100);
        if (c.actionRemaining > 0) {
            c.actionRemaining = Math.max(0, c.actionRemaining - exports.STEP);
            if (id !== 'gorilla') {
                const target = course.find(i => i.id === c.targetId);
                const permitted = id === 'snow' ? ['drone', 'crate'] : ['drone', 'saw', 'steam'];
                if (!target || target.route !== s.route || target.d !== c.targetD || !permitted.includes(target.kind)) {
                    (0, companions_1.clearCompanionAction)(c);
                    continue;
                }
                if (!c.resolved)
                    c.targetX = hazardPose(target, s.time, s.distance).x;
                // Resolve once at visible contact, then animate a return; never award on animation alone.
                if (!c.resolved && meta.actionDuration - c.actionRemaining >= meta.impactAt) {
                    c.resolved = true;
                    if (!used.has(target.id) && target.d >= s.distance - .6) {
                        used.add(target.id);
                        c.actions++;
                        s.lastGood = s.time;
                        if (id === 'snow') {
                            s.score += 125;
                            allyEvent(s, events, 'companion-attack', id, 'SNOW WHITE · THREAT CLEARED +125', 125, target);
                        }
                        else {
                            s.score += 80;
                            allyEvent(s, events, 'companion-boost', id, 'MADGER BOT · TRAP DISABLED +80', 80, target);
                        }
                    }
                }
            }
            if (c.actionRemaining === 0)
                (0, companions_1.clearCompanionAction)(c);
            continue;
        }
        if (id === 'gorilla' || c.cooldown > 0 || s.time - c.joinedAt < .55)
            continue;
        const targets = id === 'snow' ? ['drone', 'crate'] : ['drone', 'saw', 'steam'];
        const teammate = s.companions[id === 'snow' ? 'bot' : 'snow'];
        const reserved = teammate.actionRemaining > 0 && !teammate.resolved ? teammate.targetId : null;
        const target = course.find(i => i.route === s.route && !used.has(i.id) && i.id !== reserved && targets.includes(i.kind) && i.d - s.distance >= 9 && i.d - s.distance <= 21 && Math.abs(hazardPose(i, s.time, s.distance).x - s.x) < 1.35);
        if (target) {
            c.targetId = target.id;
            c.targetD = target.d;
            c.targetX = hazardPose(target, s.time, s.distance).x;
            c.targetRoute = target.route;
            c.actionRemaining = meta.actionDuration;
            c.lastActionAt = s.time;
            c.resolved = false;
            c.cooldown = meta.cooldown;
        }
    }
}
function reward(s, item, events) {
    const ally = (0, companions_1.companionId)(item.kind);
    if (ally) {
        recruitCompanion(s, ally, events);
        return;
    }
    const base = item.kind === 'coin' ? 50 : item.kind === 'gem' ? 175 : 150;
    const multiplier = 1 + Math.min(4, Math.floor(s.combo / 8));
    const points = Math.round(base * multiplier * (s.burst > 0 ? 2 : 1) * (item.kind === 'gem' && s.upgrade === 'fortune' ? 2 : 1) * (s.board === 'overgrown' ? 1 + Math.min(3, s.metaFortune ?? 0) * .15 : 1));
    if (s.board === 'overgrown' && ['snow-sigil', 'guardian-totem', 'tech-cell'].includes(item.kind)) {
        const id = item.kind === 'snow-sigil' ? 'snow' : item.kind === 'guardian-totem' ? 'gorilla' : 'bot';
        if (!s.heroShards || !s.baseShards || !s.heroUnlocked)
            return;
        s.heroShards[id]++;
        s.heroCharge = (0, exports.clamp)((s.heroCharge ?? 0) + 24, 0, 100);
        s.score += 300;
        const count = s.heroShards[id] + s.baseShards[id];
        if (!s.heroUnlocked[id] && count >= exports.HERO_SHARD_TARGET) {
            s.heroUnlocked[id] = true;
            event(s, events, 'hero-shard', companions_1.COMPANIONS[id].name.toUpperCase() + ' UNLOCKED! · CHARGE TO SUMMON', 300);
        }
        else
            event(s, events, 'hero-shard', companions_1.COMPANIONS[id].name.toUpperCase() + ' FRAGMENT · ' + Math.min(count, exports.HERO_SHARD_TARGET) + '/' + exports.HERO_SHARD_TARGET, 300);
        s.lastGood = s.time;
        return;
    }
    if (s.board === 'overgrown' && item.kind === 'treasure-cache') {
        s.gems += 3;
        s.coins += 5;
        s.score += 650;
        s.heroCharge = (0, exports.clamp)((s.heroCharge ?? 0) + 30, 0, 100);
        s.lastGood = s.time;
        event(s, events, 'secret', 'ANCIENT TREASURE CACHE · +5 COINS / +3 RELICS', 650);
        return;
    }
    if (item.kind === 'coin' || item.kind === 'gem') {
        s.combo++;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        s.score += points;
        s.energy = (0, exports.clamp)(s.energy + 7, 0, 100);
        if (s.board === 'overgrown')
            s.heroCharge = (0, exports.clamp)((s.heroCharge ?? 0) + (item.kind === 'gem' ? 12 : 5), 0, 100);
        if (item.kind === 'coin')
            s.coins++;
        else
            s.gems++;
        s.lastGood = s.time;
        event(s, events, item.kind, item.kind === 'gem' ? `RELIC +${points}` : '', points);
        return;
    }
    if (item.kind === 'heart') {
        s.hp = (0, exports.clamp)(s.hp + 1, 0, 3);
        s.score += 150;
        event(s, events, 'power', 'GRIT RESTORED', 150);
    }
    if (item.kind === 'shield') {
        s.shields = s.upgrade === 'armor' ? 2 : 1;
        s.shieldTime = 18;
        event(s, events, 'power', 'SHIELD UP');
    }
    if (item.kind === 'magnet') {
        s.magnet = s.upgrade === 'magnet' ? 18 : 10;
        event(s, events, 'power', 'MAGNET ACTIVE');
    }
    if (item.kind === 'life') {
        if (s.lives < 2) {
            s.lives++;
            event(s, events, 'power', 'EXTRA LIFE');
        }
        else {
            s.score += 750;
            event(s, events, 'power', 'LIFE RESERVE FULL +750', 750);
        }
    }
    if (item.kind === 'key') {
        s.keys++;
        event(s, events, 'secret', 'VAULT KEY FOUND');
    }
    if (item.kind === 'vault') {
        if (s.keys > 0 || item.d > 1000) {
            if (s.keys > 0)
                s.keys--;
            s.score += 1800;
            s.gems += 3;
            s.hp = (0, exports.clamp)(s.hp + 1, 0, 3);
            if (item.d < 1000)
                s.lives = (0, exports.clamp)(s.lives + 1, 0, 2);
            const key = item.d > 1000 ? 'finish-vault' : 'sealed-vault';
            if (!s.secrets.includes(key))
                s.secrets.push(key);
            event(s, events, 'secret', item.d > 1000 ? 'TREASURE SECURED +1800' : 'VAULT OPEN! +1800 · EXTRA LIFE', 1800);
        }
        else
            event(s, events, 'hint', 'A KEY OPENS THIS VAULT');
    }
    s.lastGood = s.time;
}
function hurt(s, item, events) {
    if (s.immune > 0) {
        event(s, events, 'block', 'RECOVERING');
        return;
    }
    if (s.burst > 0 && item.kind !== 'gap') {
        s.score += 125;
        event(s, events, 'block', 'SMASH +125', 125);
        return;
    }
    const guard = s.companions.gorilla;
    if (guard.timeLeft > 0 && guard.charges > 0 && guard.cooldown === 0) {
        guard.charges--;
        guard.actions++;
        guard.cooldown = companions_1.COMPANIONS.gorilla.cooldown;
        guard.lastActionAt = s.time;
        guard.actionRemaining = companions_1.COMPANIONS.gorilla.actionDuration;
        guard.targetId = item.id;
        guard.targetD = item.d;
        guard.targetX = item.lane * exports.LANE_WIDTH;
        guard.targetRoute = s.route;
        guard.resolved = true;
        s.immune = Math.max(s.immune, .8);
        s.mud = 0;
        s.lastGood = s.time;
        if (item.kind === 'gap') {
            s.y = Math.max(s.y, .35);
            s.vy = 6;
        }
        allyEvent(s, events, 'companion-guard', 'gorilla', item.kind === 'gap' ? 'GORILLA WHITE · LEDGE RESCUE' : 'GORILLA WHITE · BODYGUARD SAVE', 0, item);
        return;
    }
    if (s.shields > 0 && item.kind !== 'gap') {
        s.shields--;
        s.immune = .9;
        event(s, events, 'block', 'SHIELD BLOCK');
        return;
    }
    if (item.kind === 'mud') {
        s.mud = 2.5;
        s.combo = 0;
        event(s, events, 'splash', 'MUD! JUMP TO AVOID');
        return;
    }
    s.hp--;
    s.hits++;
    s.combo = 0;
    s.immune = 1.7;
    s.lastHurt = s.time;
    event(s, events, 'hit', item.kind === 'gap' ? 'LEDGE RECOVERY · −1 GRIT' : 'OUCH! −1 GRIT', -1);
    if (item.kind === 'gap') {
        s.vy = 6;
        s.y = .35;
    }
    if (s.hp <= 0) {
        if (s.lives > 0) {
            s.lives--;
            s.hp = 3;
            s.immune = 3;
            s.shields = Math.max(1, s.shields);
            s.shieldTime = 3;
            s.lastGood = s.time;
            event(s, events, 'revive', 'EXTRA LIFE! BACK IN THE RUN');
        }
        else {
            s.mode = 'lost';
            s.finished = true;
            event(s, events, 'lose', 'DUST OFF. DIG AGAIN.');
        }
    }
}
/** Shared solid terrace support, also used by checkpoint recovery and animation. */
function bonusDeckAt(s, course) {
    return course.find(i => i.kind === 'bonus-ledge' && i.route === s.route
        && s.distance >= i.d + 1.05 && s.distance <= i.d + 13.7 && Math.abs(s.x - i.lane * exports.LANE_WIDTH) < .90);
}
/** Mutates only this run. fixedStep is called at 120 Hz; rendering is independent. */
function fixedStep(s, course, events) {
    if (s.mode !== 'countdown' && s.mode !== 'running')
        return;
    s.tick++;
    // Collision uses the damped physical x, never an instantly changed lane index.
    const pathWidth = s.board === 'overgrown' ? overgrownPathWidth(s.route, s.distance) : 1;
    const limit = exports.LANE_WIDTH + .04 + Math.max(0, pathWidth - 1) * exports.LANE_WIDTH * 2;
    // The rounded bank guides a missed jump beside the solid terrace. It does
    // not teleport the player, remove grit, or change route identity. Both lanes
    // are reserved free of hazards across the entrance and rejoin.
    const bank = course.find(i => i.kind === 'bonus-ledge' && i.route === s.route
        && s.distance >= i.d - 1.8 && s.distance < i.d + 13.8 && s.y < exports.BONUS_LEDGE_HEIGHT - .12
        && Math.sign(s.x) === i.lane && Math.abs(s.x) > .32);
    if (bank)
        s.lane = 0;
    const target = s.lane * exports.LANE_WIDTH * Math.min(1, pathWidth), acceleration = bank ? 240 * (target - s.x) - 30 * s.vx : 95 * (target - s.x) - 19 * s.vx;
    s.vx += acceleration * exports.STEP;
    s.x = (0, exports.clamp)(s.x + s.vx * exports.STEP, -limit, limit);
    if (s.mode === 'countdown') {
        s.countdown = Math.max(0, s.countdown - exports.STEP);
        if (s.countdown <= 1e-6) {
            s.mode = 'running';
            event(s, events, 'hint', 'GO! FOLLOW THE GOLD');
        }
        return;
    }
    s.time += exports.STEP;
    if (s.slide > 0)
        s.slideAge += exports.STEP;
    const oldDistance = s.distance, oldY = s.y;
    for (const key of ['slide', 'slideCooldown', 'magnet', 'burst', 'immune', 'mud', 'shieldTime', 'jumpBuffer'])
        s[key] = Math.max(0, s[key] - exports.STEP);
    if (s.shieldTime === 0)
        s.shields = 0;
    const deck = bonusDeckAt(s, course);
    s.groundHeight = deck && s.y >= exports.BONUS_LEDGE_HEIGHT - .001 ? exports.BONUS_LEDGE_HEIGHT : 0;
    if (s.y > 0 || s.vy > 0) {
        s.vy -= 24 * exports.STEP;
        const nextY = s.y + s.vy * exports.STEP;
        if (deck && s.vy <= 0 && s.y >= exports.BONUS_LEDGE_HEIGHT - .001 && nextY <= exports.BONUS_LEDGE_HEIGHT) {
            s.y = exports.BONUS_LEDGE_HEIGHT;
            s.vy = 0;
            s.groundHeight = exports.BONUS_LEDGE_HEIGHT;
            if (oldY > exports.BONUS_LEDGE_HEIGHT + .01)
                event(s, events, 'land');
            if (s.jumpBuffer > 0)
                jump(s, events);
        }
        else {
            s.groundHeight = 0;
            s.y = Math.max(0, nextY);
            if (s.y === 0) {
                s.vy = 0;
                if (oldY > 0)
                    event(s, events, 'land');
                if (s.jumpBuffer > 0)
                    jump(s, events);
            }
        }
    }
    const base = 9.8 + Math.min(3.5, s.distance / 300);
    const targetSpeed = base * (s.mud > 0 ? .65 : 1) * (s.burst > 0 ? 1.10 : 1);
    s.speed += (targetSpeed - s.speed) * Math.min(1, exports.STEP * 5);
    s.distance = Math.min(exports.TRACK_LENGTH, s.distance + s.speed * exports.STEP);
    const zone = s.board === 'overgrown' ? 0 : zoneAt(s.distance);
    if (zone !== s.zone) {
        s.zone = zone;
        event(s, events, 'zone', exports.ZONES[zone].name);
    }
    if (s.route !== 'main' && s.distance >= s.routeEnd) {
        s.route = 'main';
        s.immune = Math.max(s.immune, 2);
        event(s, events, 'hint', s.board === 'overgrown' ? 'PATHS REJOIN · PICK YOUR NEXT CHALLENGE' : 'SHORTCUT COMPLETE · SAFE REJOIN');
    }
    // Real-time three-way junctions: steering determines the road while the
    // game keeps moving. The second junction has a low trail, a jump-only
    // elevated ledge and a properly timed burrow tunnel. Saved v1 modal fork
    // checkpoints remain supported by chooseFork below.
    // Use the damped actual player x at a fork, not the requested lane, so
    // last-millisecond steering cannot teleport Madger onto an unreachable road.
    const physicalLane = s.x < -exports.LANE_WIDTH * .56 ? -1 : s.x > exports.LANE_WIDTH * .56 ? 1 : 0;
    if (s.board === 'overgrown' && s.forkStage === 0 && s.distance >= 140) {
        s.forkStage = 1;
        commitFork(s, exports.MAJOR_FORKS[physicalLane + 1], events);
    }
    else if (s.board === 'overgrown' && s.forkStage === 1 && s.distance >= 455) {
        s.forkStage = 2;
        const family = (s.majorPath === 'ridge' || s.majorPath === 'deep') ? s.majorPath : 'rootway';
        const options = exports.SUB_FORKS[family], desired = options[physicalLane + 1];
        const clearedLedge = physicalLane === 0 && s.y > .65;
        const foundTunnel = physicalLane === 1 && s.slide > 0 && s.y < .25;
        // Not reaching an elevated platform or tunnel entrance is a fall to the
        // visible lower road, NOT an arbitrary damage event or a paused menu.
        const accessible = (physicalLane === -1 || clearedLedge || foundTunnel) &&
            (desired.id !== 'ancient-vault' || s.keys > 0);
        const chosen = accessible ? desired : options[0];
        if (!accessible)
            event(s, events, 'hint', desired.id === 'ancient-vault' && s.keys < 1 && foundTunnel
                ? 'VAULT LOCKED · DESCEND TO THE LOWER CHANNEL'
                : physicalLane === 0 ? 'MISSED THE UPPER LEDGE · LOWER PATH' : 'MISSED THE LOW TUNNEL · LOWER PATH');
        commitFork(s, chosen, events);
    }
    const used = new Set(s.used);
    stepCompanions(s, course, used, events);
    for (const item of course) {
        if (item.d > s.distance + 5)
            break;
        if (item.kind === 'bonus-ledge')
            continue;
        if (item.d < oldDistance - 4 || used.has(item.id) || item.route !== s.route)
            continue;
        const pose = hazardPose(item, s.time, s.distance), halfLength = item.kind === 'gap' ? 1.55 : item.kind === 'chamber-door' ? 1.35 : item.kind === 'mud' ? 1.25 : .62;
        const previousPose = hazardPose(item, s.time - exports.STEP, oldDistance);
        if (pose.ahead < -halfLength && previousPose.ahead >= -halfLength) {
            if (exports.HAZARDS.has(item.kind) && item.kind !== 'mud' && Math.abs(pose.x - s.x) > 1.05 && Math.abs(pose.x - s.x) < 1.65) {
                s.score += 75;
                s.nearMisses++;
                event(s, events, 'near', 'CLOSE CALL +75', 75);
            }
            used.add(item.id);
            continue;
        }
        const withinLongitudinal = pose.ahead <= halfLength && previousPose.ahead >= -halfLength;
        if (!withinLongitudinal)
            continue;
        const dx = Math.abs(pose.x - s.x), isHazard = exports.HAZARDS.has(item.kind);
        const radius = isHazard ? (item.kind === 'drone' ? .72 : .82) : .83;
        const attracted = (item.kind === 'coin' || item.kind === 'gem') && (s.magnet > 0 || s.companions.bot.timeLeft > 0);
        if (dx > radius && !attracted)
            continue;
        if (item.elevation !== undefined && Math.abs(s.y - item.elevation) > .26)
            continue;
        if (item.kind === 'chamber-door') {
            const chamber = exports.CHAMBERS.find(c => c.route === item.route && c.d === item.d);
            if (!chamber || s.secrets.includes(chamber.id))
                continue;
            const entered = chamber.action === 'burrow' ? s.slide > 0 && s.y < .25 : s.y > .65;
            if (entered) {
                s.chamber = chamber.id;
                s.mode = 'chamber';
                s.y = 0;
                s.vy = 0;
                s.slide = 0;
                s.slideAge = 0;
                s.jumpBuffer = 0;
                used.add(item.id);
                event(s, events, 'secret', chamber.name.toUpperCase() + ' DISCOVERED');
                break;
            }
            continue;
        }
        if (item.kind === 'burrow') {
            if (s.slide > 0 && s.y < .25 && s.route === 'main') {
                s.route = item.d < 500 ? 'hollow' : 'grotto';
                s.routeStart = item.d;
                s.routeEnd = item.d + 90;
                s.routeSide = item.lane;
                s.x -= item.lane * exports.LANE_WIDTH;
                for (const id of companions_1.COMPANION_IDS) {
                    s.companions[id].followX -= item.lane * exports.LANE_WIDTH;
                    (0, companions_1.clearCompanionAction)(s.companions[id]);
                }
                s.lane = 0;
                s.vx = 0;
                s.immune = Math.max(s.immune, 1.4);
                s.score += 500;
                s.slide = Math.max(s.slide, 1.10);
                s.slideCooldown = Math.max(s.slideCooldown, 1.2);
                if (!s.secrets.includes(s.route))
                    s.secrets.push(s.route);
                s.lastGood = s.time;
                event(s, events, 'secret', 'HIDDEN ROUTE! +500', 500);
                used.add(item.id);
            }
            continue;
        }
        if (item.kind === 'workshop') {
            if (s.y > .55) {
                s.mode = 'upgrade';
                s.secrets.push('workshop');
                s.score += 500;
                used.add(item.id);
                event(s, events, 'secret', 'HIDDEN WORKSHOP · CHOOSE AN UPGRADE', 500);
                break;
            }
            used.add(item.id);
            hurt(s, { ...item, kind: 'crate' }, events);
            if (s.finished)
                break;
            continue;
        }
        if (isHazard) {
            const avoided = (item.kind === 'roots' ? s.slide > 0 && s.y < .2 : item.kind === 'steam' ? !pose.active || s.y > 1.05 : item.kind === 'drone' ? s.slide > 0 || s.y > 1.20 : s.y > (item.kind === 'boulder' ? 1.08 : .66));
            if (!avoided) {
                used.add(item.id);
                hurt(s, item, events);
                if (s.finished)
                    break;
            }
        }
        else {
            used.add(item.id);
            reward(s, item, events);
        }
    }
    s.used = [...used];
    const foot = Math.floor(s.distance / 1.9);
    if (foot !== s.lastFoot && s.y - (s.groundHeight ?? 0) < .02 && s.slide <= 0) {
        s.lastFoot = foot;
        event(s, events, 'step');
    }
    if (s.mode === 'running' && s.distance >= exports.TRACK_LENGTH) {
        s.mode = 'won';
        s.finished = true;
        s.score += 2500;
        event(s, events, 'win', 'EXPEDITION COMPLETE +2500', 2500);
    }
}
function createClock() { return { accumulator: 0 }; }
/** Long foreground stalls pause rather than inflict damage for unseen frames. */
function advance(s, course, seconds, clock, events) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > .4) {
        pause(s);
        clock.accumulator = 0;
        return;
    }
    if (s.mode !== 'running' && s.mode !== 'countdown') {
        clock.accumulator = 0;
        return;
    }
    clock.accumulator += seconds;
    while (clock.accumulator >= exports.STEP - 1e-9) {
        fixedStep(s, course, events);
        clock.accumulator = Math.max(0, clock.accumulator - exports.STEP);
        if (s.mode !== 'running' && s.mode !== 'countdown') {
            clock.accumulator = 0;
            break;
        }
    }
}
function nearbyHint(s, course) {
    if (s.board === 'overgrown') {
        const bonus = course.find(i => i.kind === 'bonus-ledge' && i.route === s.route && i.d - s.distance > 0 && i.d - s.distance < 22);
        if (bonus)
            return 'RAISED TREASURE ' + Math.ceil(bonus.d - s.distance) + 'm · ' + (bonus.lane < 0 ? 'LEFT' : 'RIGHT') + ' + JUMP · CENTRE ROAD IS SAFE';
        const chamber = exports.CHAMBERS.find(c => c.route === s.route && c.d > s.distance - 1 && c.d < s.distance + 65);
        if (chamber)
            return `${chamber.clue.toUpperCase()} · ${['LEFT', 'CENTRE', 'RIGHT'][chamber.lane + 1]} · ${chamber.action === 'burrow' ? 'BURROW' : 'JUMP'} AT ${chamber.d}m`;
        if (s.forkStage === 0)
            return s.distance >= 98
                ? 'LIVE FORK ' + Math.max(0, Math.ceil(140 - s.distance)) + 'm · STEER LEFT / MIDDLE / RIGHT'
                : 'THREE REAL ROADS AHEAD · STEER TO CHOOSE';
        if (s.forkStage === 1 && s.distance < 455)
            return s.distance >= 411
                ? 'LIVE FORK ' + Math.max(0, Math.ceil(455 - s.distance)) + 'm · LEFT: LOWER · MIDDLE: JUMP · RIGHT: BURROW'
                : (s.majorPath ?? 'ROOTWAY').toUpperCase() + ' · LEDGE / LOWER TRAIL / HIDDEN TUNNEL AT 455m';
        if (s.route !== 'main')
            return (s.subPath ?? 'FOREST').toUpperCase().replace(/-/g, ' ') + ' · RARE FRAGMENTS AHEAD';
        return 'THE BURROW TREASURY · 1080m FINISH';
    }
    if (s.route !== 'main')
        return 'Hidden route · gems, upgrades and life reserves';
    const item = course.find(i => i.route === 'main' && i.d > s.distance + 6 && i.d < s.distance + 45 && ['burrow', 'workshop', 'vault', 'key'].includes(i.kind));
    if (!item) {
        const ally = course.find(i => i.route === s.route && i.d > s.distance + 3 && i.d < s.distance + 40 && (0, companions_1.companionId)(i.kind) && !s.used.includes(i.id));
        if (!ally)
            return '';
        const id = (0, companions_1.companionId)(ally.kind);
        return companions_1.COMPANIONS[id].name.toUpperCase() + ' · ' + companions_1.COMPANIONS[id].role + ' · ' + ['LEFT', 'CENTRE', 'RIGHT'][ally.lane + 1];
    }
    const lane = ['LEFT', 'CENTRE', 'RIGHT'][item.lane + 1];
    if (item.kind === 'burrow')
        return `CLAW MARKS ${lane} · BURROW INTO THE HOLLOW`;
    if (item.kind === 'workshop')
        return `WORKSHOP ${lane} · JUMP THROUGH THE ARCH`;
    if (item.kind === 'key')
        return `VAULT KEY ${lane} · KEEP IT FOR THE GOLD DOOR`;
    return `${item.d > 1000 ? 'TREASURE' : 'SEALED VAULT'} ${lane}${s.keys > 0 ? ' · KEY READY' : ''}`;
}
/** Overgrown Burrow: a single authored board, three major paths and nine subpaths.
 * Route rewards are fixed per seed; no purchase, ad or RNG may unlock a hero.
 * Kept alongside the v1 course so historical saved games remain playable.
 */
exports.HERO_SHARD_TARGET = 4;
exports.CHAMBERS = [
    { id: 'guardian-nest', route: 'root-arch', d: 704, lane: -1, action: 'burrow', name: 'The Guardian Nest', clue: 'Claw marks beneath the living roots', story: 'Ancient roots cradle a guardian altar. Choose the carved totem, or leave it for a reserve of protective sap.', hero: 'gorilla', supplies: 'Restore 2 grit + one shield for 45 seconds', accent: '#A3DE85' },
    { id: 'capacitor-sanctum', route: 'gearworks', d: 716, lane: 1, action: 'jump', name: 'The Capacitor Sanctum', clue: 'A raised copper hatch sparks above the gears', story: 'A dormant machine still holds one charge. Salvage a Bot cell, or route its power into your treasure magnet.', hero: 'bot', supplies: 'Treasure magnet for 18 seconds + 40 burst energy', accent: '#79D9E6' },
    { id: 'moonwell', route: 'crystal-vein', d: 704, lane: 0, action: 'burrow', name: 'The Buried Moonwell', clue: 'Silver roots conceal a low crystal doorway', story: 'A moonlit spring hides beneath the crystal seam. Take a Snow Sigil, or carry its restorative water as an extra life.', hero: 'snow', supplies: 'One extra life + restore 1 grit', accent: '#C4B1FF' },
];
function resolveChamber(s, choice, events) {
    if (s.board !== 'overgrown' || s.mode !== 'chamber' || !['fragment', 'supplies'].includes(choice))
        return false;
    const chamber = exports.CHAMBERS.find(c => c.id === s.chamber && c.route === s.route);
    if (!chamber || s.secrets.includes(chamber.id))
        return false;
    s.secrets.push(chamber.id);
    s.coins += 8;
    s.gems += 2;
    s.score += 900;
    if (choice === 'fragment') {
        const kind = chamber.hero === 'snow' ? 'snow-sigil' : chamber.hero === 'gorilla' ? 'guardian-totem' : 'tech-cell';
        reward(s, { id: -1, route: s.route, d: s.distance, lane: s.lane, kind, phase: 0 }, events);
    }
    else if (chamber.hero === 'gorilla') {
        s.hp = (0, exports.clamp)(s.hp + 2, 0, 3);
        s.shields = Math.max(s.shields, 1);
        s.shieldTime = Math.max(s.shieldTime, 45);
    }
    else if (chamber.hero === 'bot') {
        s.magnet = 18;
        s.energy = (0, exports.clamp)(s.energy + 40, 0, 100);
    }
    else {
        s.lives = (0, exports.clamp)(s.lives + 1, 0, 2);
        s.hp = (0, exports.clamp)(s.hp + 1, 0, 3);
    }
    s.chamber = undefined;
    s.mode = 'running';
    s.immune = Math.max(s.immune, 2);
    s.lastGood = s.time;
    event(s, events, 'secret', 'CHAMBER TREASURE · +8 COINS / +2 RELICS');
    return true;
}
exports.MAJOR_FORKS = [
    { id: 'rootway', name: 'Mossbound Rootway', risk: 'LOW', reward: 'Guardian Totems', description: 'Stable paths, healing nests, and steady earnings', side: -1, accent: '#A3DE85' },
    { id: 'ridge', name: 'Ruined Watchridge', risk: 'MEDIUM', reward: 'Tech Cells', description: 'Fallen causeways, machine traps, ancient mechanisms', side: 0, accent: '#F5C680' },
    { id: 'deep', name: 'Deep Burrow', risk: 'HIGH', reward: 'Snow Sigils', description: 'Mud chasms, crystal deposits, valuable hidden vaults', side: 1, accent: '#BFA4F7' },
];
exports.SUB_FORKS = {
    rootway: [
        { id: 'mosswalk', name: 'Mossy Walk', risk: 'LOW', reward: 'Coins and healing', description: 'Reliable treasure, forgiving hazards', side: -1, accent: '#A3DE85' },
        { id: 'root-arch', name: 'Root Arch Hollow', risk: 'MEDIUM', reward: 'Guardian Totems', description: 'Burrow through roots for a guardian cache', side: 0, accent: '#7CD7AE' },
        { id: 'log-crossing', name: 'Fallen Log Crossing', risk: 'HIGH', reward: 'Snow Sigils', description: 'Leap precision gaps to reach rare sigils', side: 1, accent: '#EAC58B' },
    ],
    ridge: [
        { id: 'causeway', name: 'Broken Causeway', risk: 'MEDIUM', reward: 'Snow Sigils', description: 'Falling stones, high-value collections', side: -1, accent: '#EAC58B' },
        { id: 'watchtower', name: 'Watchtower Climb', risk: 'HIGH', reward: 'Tech Cells', description: 'Unforgiving jumps and sealed caches', side: 0, accent: '#D5AEEA' },
        { id: 'gearworks', name: 'Chamber of Gears', risk: 'HIGH', reward: 'Tech Cells', description: 'Timed steam traps and electric relics', side: 1, accent: '#79D9E6' },
    ],
    deep: [
        { id: 'mudslide', name: 'Mudslide Channel', risk: 'HIGH', reward: 'Guardian Totems', description: 'Mud hazards, quick rewards and recovery caches', side: -1, accent: '#B28E76' },
        { id: 'crystal-vein', name: 'Crystal Vein', risk: 'HIGH', reward: 'Snow Sigils', description: 'Rare stones beyond narrow burrow tunnels', side: 0, accent: '#B8A7FF' },
        { id: 'ancient-vault', name: 'Ancient Vault', risk: 'HIGH', reward: 'Tech Cells and vault keys', description: 'Deadly traps guard the richest final chamber', side: 1, accent: '#FFD89D' },
    ],
};
exports.OVERGROWN_ROUTES = [
    ...exports.MAJOR_FORKS.map(f => f.id), ...Object.values(exports.SUB_FORKS).flatMap(group => group.map(f => f.id)),
];
function availableForks(s) {
    if (s.forkStage === 1)
        return exports.MAJOR_FORKS;
    if (s.forkStage === 2)
        return exports.SUB_FORKS[(s.majorPath === 'ridge' || s.majorPath === 'deep') ? s.majorPath : 'rootway'];
    return [];
}
function overgrownPathOffset(route, d) {
    const option = [...exports.MAJOR_FORKS, ...Object.values(exports.SUB_FORKS).flat()].find(o => o.id === route);
    if (!option)
        return 0;
    const major = option.id === 'rootway' || option.id === 'ridge' || option.id === 'deep';
    const start = major ? 140 : 455, end = major ? 450 : 900;
    return option.side * (exports.LANE_WIDTH + (8.5 - exports.LANE_WIDTH) * (0, exports.smooth)((d - start) / 24)) * (0, exports.smooth)((end - d) / 24);
}
/** Each fork opens from one entrance lane into a three-lane road. */
function overgrownPathWidth(route, d) {
    if (!exports.OVERGROWN_ROUTES.includes(route))
        return 1;
    const start = ['rootway', 'ridge', 'deep'].includes(route) ? 140 : 455;
    const entry = (0, exports.smooth)((d - start) / 24);
    // The lower road catches a missed jump or tunnel from either entrance.
    if (['mosswalk', 'causeway', 'mudslide'].includes(route))
        return 1.5 - .5 * entry;
    return 1 / 3 + 2 / 3 * entry;
}
/** Metres above the base trail. Upper roads have a real .65m entrance lip;
 * every road eases back to the same elevation before its safe rejoin. */
function overgrownPathHeight(route, d) {
    const upper = ['root-arch', 'watchtower', 'crystal-vein'].includes(route);
    const lower = ['mosswalk', 'causeway', 'mudslide'].includes(route);
    const tunnel = ['log-crossing', 'gearworks', 'ancient-vault'].includes(route);
    if (d < 455 || d >= 900 || (!upper && !lower && !tunnel))
        return 0;
    const entry = (0, exports.smooth)((d - 455) / 24), exit = (0, exports.smooth)((900 - d) / 28);
    return (upper ? .65 + 1.25 * entry : lower ? -.30 - .55 * entry : -.45 * entry) * exit;
}
function freshOvergrownExpedition(seed, id, shards = { snow: 0, gorilla: 0, bot: 0 }, upgrades = { armor: 0, magnet: 0, fortune: 0 }) {
    const s = freshExpedition(seed, id);
    s.board = 'overgrown';
    s.forkStage = 0;
    s.majorPath = undefined;
    s.subPath = undefined;
    s.heroShards = { snow: 0, gorilla: 0, bot: 0 };
    s.baseShards = { snow: shards.snow || 0, gorilla: shards.gorilla || 0, bot: shards.bot || 0 };
    s.heroUnlocked = { snow: shards.snow >= exports.HERO_SHARD_TARGET, gorilla: shards.gorilla >= exports.HERO_SHARD_TARGET, bot: shards.bot >= exports.HERO_SHARD_TARGET };
    s.heroCharge = 0;
    s.metaFortune = upgrades.fortune || 0;
    if (upgrades.armor > 0) {
        s.shields = 1;
        s.shieldTime = 45 + upgrades.armor * 15;
    }
    if (upgrades.magnet > 0)
        s.magnet = 4 + upgrades.magnet * 3;
    return s;
}
/** Commit a physically reached fork without pausing or skipping simulation.
 * Retain the old explicit chooser for recovery from historical mode=fork saves.
 */
function commitFork(s, choice, events) {
    const stage = s.forkStage;
    const previousHeight = overgrownPathHeight(s.route, s.distance), worldX = s.x + routeOffset(s);
    if (choice.id === 'ancient-vault')
        s.keys--;
    if (stage === 1)
        s.majorPath = choice.id;
    else
        s.subPath = choice.id;
    if (!s.secrets.includes(choice.id))
        s.secrets.push(choice.id);
    s.route = choice.id;
    s.routeStart = stage === 1 ? 140 : 455;
    s.routeEnd = stage === 1 ? 450 : 900;
    s.routeSide = choice.side;
    const localX = worldX - routeOffset(s), shift = localX - s.x;
    s.x = localX;
    s.lane = 0;
    for (const id of companions_1.COMPANION_IDS) {
        s.companions[id].followX += shift;
        (0, companions_1.clearCompanionAction)(s.companions[id]);
    }
    // Preserve world-space jump height across the raised entrance.
    s.y = Math.max(0, s.y + previousHeight - overgrownPathHeight(choice.id, s.distance));
    s.mode = 'running';
    s.immune = Math.max(s.immune, 1.2);
    s.lastGood = s.time;
    event(s, events, 'fork', choice.name.toUpperCase() + ' · ' + choice.reward.toUpperCase());
}
function chooseFork(s, chosen, events) {
    if (s.board !== 'overgrown' || s.mode !== 'fork')
        return false;
    const choice = availableForks(s).find(o => o.id === chosen);
    if (!choice)
        return false;
    if (chosen === 'ancient-vault' && s.keys < 1) {
        event(s, events, 'hint', 'ANCIENT VAULT · FIND THE DEEP BURROW KEY');
        return false;
    }
    commitFork(s, choice, events);
    return true;
}
function activateHero(s, id, events) {
    if (s.board !== 'overgrown' || s.mode !== 'running' || s.heroUnlocked?.[id] !== true || (s.heroCharge ?? 0) < 100 || companions_1.COMPANION_IDS.some(hero => s.companions[hero].timeLeft > 0))
        return false;
    s.heroCharge = 0;
    recruitCompanion(s, id, events);
    return true;
}
function buildOvergrownCourse(seed) {
    const random = randomGenerator(seed), items = [];
    const add = (d, lane, kind, route = 'main') => {
        items.push({ id: items.length, d, lane, kind, route, phase: random() * Math.PI * 2 });
    };
    // Training area: player learns to steer and collect before the first decision.
    for (const d of [16, 24, 32, 40, 48, 78, 94, 113])
        add(d, 0, d === 113 ? 'gem' : 'coin');
    add(63, -1, 'roots');
    add(86, 1, 'crate');
    add(106, -1, 'heart');
    const laneChoices = [-1, 0, 1];
    const shardKind = { rootway: 'guardian-totem', ridge: 'tech-cell', deep: 'snow-sigil' };
    const subShard = {
        rootway: 'guardian-totem', ridge: 'tech-cell', deep: 'snow-sigil',
        mosswalk: 'guardian-totem', 'root-arch': 'guardian-totem', 'log-crossing': 'snow-sigil',
        causeway: 'snow-sigil', watchtower: 'tech-cell', gearworks: 'tech-cell',
        mudslide: 'guardian-totem', 'crystal-vein': 'snow-sigil', 'ancient-vault': 'tech-cell',
    };
    // Each route has a mechanical identity, rather than sharing a difficulty palette.
    const hazards = {
        rootway: ['roots', 'crate', 'mud'], ridge: ['boulder', 'saw', 'crate'], deep: ['gap', 'drone', 'boulder'],
        mosswalk: ['mud', 'crate'], 'root-arch': ['roots', 'roots', 'crate'], 'log-crossing': ['gap', 'boulder'],
        causeway: ['gap', 'boulder', 'crate'], watchtower: ['gap', 'drone'], gearworks: ['steam', 'saw', 'drone'],
        mudslide: ['mud', 'mud', 'boulder'], 'crystal-vein': ['roots', 'gap', 'drone'], 'ancient-vault': ['steam', 'saw', 'gap'],
    };
    const section = (route, start, end, risk, shard) => {
        const rows = risk === 'LOW' ? 6 : risk === 'MEDIUM' ? 8 : 10;
        let safe = 0;
        for (let i = 0; i < rows; i++) {
            const d = Math.round(start + (end - start) * (i + .55) / (rows + .2));
            safe = laneChoices[Math.floor(random() * 3)];
            const obstacle = hazards[route];
            const occupied = laneChoices.filter(l => l !== safe);
            add(d, occupied[0], obstacle[Math.floor(random() * obstacle.length)], route);
            if (risk !== 'LOW' && i % 2 === 0)
                add(d, occupied[1], obstacle[Math.floor(random() * obstacle.length)], route);
            add(d - 6, safe, i % 3 === 0 ? 'gem' : 'coin', route);
            add(d - 3, safe, 'coin', route);
            if (i % 3 === 2)
                add(d + 5, safe, risk === 'LOW' ? 'heart' : 'gem', route);
        }
        for (let i = 0; i < 3; i++)
            add(start + 45 + i * Math.floor((end - start - 105) / 3), 0, shard, route);
        if (risk === 'LOW')
            add(end - 37, 0, 'heart', route);
        if (risk === 'MEDIUM')
            add(end - 52, 0, 'magnet', route);
        if (risk === 'HIGH') {
            add(end - 90, 0, 'treasure-cache', route);
            add(end - 42, 0, 'key', route);
        }
    };
    for (const choice of exports.MAJOR_FORKS)
        section(choice.id, 155, 425, choice.risk, shardKind[choice.id]);
    for (const group of Object.values(exports.SUB_FORKS))
        for (const choice of group) {
            section(choice.id, 470, 865, choice.risk, subShard[choice.id]);
            if (choice.id === 'ancient-vault')
                add(884, 0, 'vault', choice.id);
            if (choice.id === 'root-arch' || choice.id === 'crystal-vein')
                add(874, 0, 'life', choice.id);
        }
    for (const d of [918, 928, 938, 954, 965, 974, 988, 1004, 1023, 1040])
        add(d, 0, d % 3 === 0 ? 'gem' : 'coin');
    add(991, -1, 'boulder');
    add(1008, 1, 'roots');
    add(1053, 0, 'vault');
    // Append new IDs after the existing course: earlier recovery points keep item identity.
    for (const chamber of exports.CHAMBERS)
        add(chamber.d, chamber.lane, 'chamber-door', chamber.route);
    // Append after all historical IDs. Find a real clear corridor for both the
    // terrace and adjacent lower lane; no existing hazard/reward is rewritten.
    for (const choice of [...exports.MAJOR_FORKS, ...Object.values(exports.SUB_FORKS).flat()]) {
        const major = exports.MAJOR_FORKS.some(m => m.id === choice.id), ideal = major ? 282 : 604;
        let placed = false;
        const shifts = Array.from({ length: 401 }, (_, i) => i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? .5 : -.5));
        for (const shift of shifts) {
            const d = ideal + shift;
            if (d < (major ? 180 : 500) || d > (major ? 389 : 813))
                continue;
            const lane = [-1, 1].find(candidate => !items.some(item => item.route === choice.id
                && (exports.HAZARDS.has(item.kind) || item.kind === 'chamber-door') && (item.lane === candidate || item.lane === 0)
                && item.d > d - 5 && item.d < d + exports.BONUS_LEDGE_LENGTH + 4));
            if (lane === undefined)
                continue;
            add(d, lane, 'bonus-ledge', choice.id);
            for (const at of [3, 5.5, 8, 11]) {
                add(d + at, lane, at === 8 ? 'gem' : 'coin', choice.id);
                items[items.length - 1].elevation = exports.BONUS_LEDGE_HEIGHT;
            }
            placed = true;
            break;
        }
        if (!placed)
            throw Error('No safe terrace corridor: ' + choice.id);
    }
    return items.sort((a, b) => a.d - b.d || a.id - b.id);
}
};
factories["animation"]=function(require,module,exports){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gaitPose = gaitPose;
exports.slideBlend = slideBlend;
exports.burrowPose = burrowPose;
exports.reactionEnvelope = reactionEnvelope;
exports.crouchPose = crouchPose;
const core_1 = require("./core");
/** During stance, foot displacement equals travelled ground displacement exactly.
 * The short 27% contact phase leaves an aerial recovery phase appropriate to a run,
 * rather than a walking cycle whose feet visibly skate over the moving course.
 */
function gaitPose(distance, side, jumpHeight = 0, crouch = 0, running = true) {
    const phase = ((distance / 3.8 + (side > 0 ? .5 : 0)) % 1 + 1) % 1;
    const stance = phase < .27;
    let z = 0, y = .12;
    if (running) {
        if (stance)
            z = -.53 + phase * 3.8;
        else {
            const u = (phase - .27) / .73;
            z = .496 - (0, core_1.smooth)(u) * 1.026;
            y += Math.sin(u * Math.PI) * .34;
        }
    }
    const air = (0, core_1.smooth)(jumpHeight / .38);
    z = z * (1 - air) + (side > 0 ? .30 : -.25) * air;
    y = y * (1 - air) + .32 * air;
    z = z * (1 - crouch) + .55 * crouch;
    y = y * (1 - crouch) + .10 * crouch;
    return { phase, stance: stance && air === 0 && crouch === 0, z, y, air };
}
function slideBlend(remaining, age = Math.max(0, .83 - remaining)) { return remaining > 0 ? (0, core_1.smooth)(age / .12) * (0, core_1.smooth)(remaining / .10) : 0; }
/** A short dive, underground traverse and emergence, driven only by simulation time.
 * The old timer format also supports the extended entry into a hidden route.
 */
function burrowPose(remaining, age = Math.max(0, .83 - remaining), running = true, jumpHeight = 0, finishAge) {
    // Finished runs freeze gameplay timers; their presentation must still surface for the result reaction.
    const emergence = finishAge === undefined ? 1 : 1 - (0, core_1.smooth)(finishAge / .24);
    const weight = slideBlend(remaining, age) * (1 - (0, core_1.smooth)(jumpHeight / .18)) * emergence;
    return { ...crouchPose(weight, running), weight, depth: 2.05 * weight, stroke: Math.sin(age * Math.PI * 12) * weight };
}
function reactionEnvelope(age, duration = 1.1) { return age < 0 ? 0 : (0, core_1.smooth)(age / .12) * (1 - (0, core_1.smooth)((age - .44) / (duration - .44))); }
function crouchPose(weight, running = true) {
    const w = (0, core_1.clamp)(weight, 0, 1);
    return { bodyX: -1.18 * w - (running ? .10 : 0), bodyY: .09 * w, headY: 1.91 - .65 * w, headZ: -.16 * w, headX: 1.24 * w, tailX: 1.26 * w };
}
};
factories["companion-models"]=function(require,module,exports){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANION_ART_CONTRACT = void 0;
exports.drawCompanion = drawCompanion;
exports.drawTeam = drawTeam;
const companions_1 = require("./companions");
const core_1 = require("./core");
const gl_1 = require("./gl");
const math_1 = require("./math");
const P = { ivory: (0, gl_1.color)('#F0E9DA'), frost: (0, gl_1.color)('#FFFCF0'), cream: (0, gl_1.color)('#D9CEB7'), rose: (0, gl_1.color)('#BD758D'), roseLight: (0, gl_1.color)('#E9ABC0'), nose: (0, gl_1.color)('#23272A'), eye: (0, gl_1.color)('#2D2520'), white: (0, gl_1.color)('#F4F5F3', -4), silver: (0, gl_1.color)('#B5C1C7', -4), skin: (0, gl_1.color)('#A68D72'), skinLight: (0, gl_1.color)('#C6AC8B'), blue: (0, gl_1.color)('#72BCE7', .1), dark: (0, gl_1.color)('#243342'), metal: (0, gl_1.color)('#9FAAB1'), cyan: (0, gl_1.color)('#75DEEF', .9), orange: (0, gl_1.color)('#FFB35D', .65), black: (0, gl_1.color)('#101821'), shadow: (0, gl_1.color)('#000000', -3) };
exports.COMPANION_ART_CONTRACT = {
    snow: { body: 'lean, smooth short coat', muzzle: 'long, soft forehead', tail: 'cream frosted tip', collar: 'muted rose pink', tag: 'matching diamond SW charm' },
    gorilla: { coat: 'white/silver', eyes: 'blue', face: 'warm tan', jaw: 'clean without goatee', motion: 'articulated knuckle run and bodyguard brace' },
    bot: { silhouette: 'mechanical Madger', face: 'angular visor and recessed speaker grille', armor: 'black, silver and blue', lights: 'cyan with orange accents', signatureFangs: 0, clawsPerPaw: 5 },
};
function primitives(r) {
    const shape = (kind, c, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, parent) => r.shape(kind, c, x, y, z, sx, sy, sz, rx, ry, rz, parent);
    const orb = (c, p, x, y = x, z = x, parent) => shape('sphere', c, ...p, x, y, z, 0, 0, 0, parent);
    const bone = (c, a, b, radius, parent) => r.add('cylinder', parent ? (0, math_1.multiply)(parent, (0, math_1.segment)(a, b, radius)) : (0, math_1.segment)(a, b, radius), c);
    return { shape, orb, bone };
}
/** Procedural rigs share travelled-distance contact phases; there are no billboard companions. */
function drawCompanion(r, id, p) {
    const { shape, orb, bone } = primitives(r), t = p.time, a = p.action ?? 0, air = p.air ?? 0, scale = p.scale ?? 1;
    const root = (0, math_1.transform)(p.x, p.y, p.z, scale, scale, scale, 0, p.yaw ?? 0, 0);
    const blink = (t % 4.7) < .15 ? .13 : 1;
    if (id === 'snow') {
        const bounce = p.running ? Math.abs(Math.sin(p.distance / 3.4 * Math.PI * 2)) * .055 : Math.sin(t * 2.8) * .018;
        const torso = (0, math_1.multiply)(root, (0, math_1.transform)(0, bounce, 0, 1, 1, 1, -air * .13, 0, Math.sin(t * 1.8) * .012));
        orb(P.ivory, [0, .71, .10], .265, .305, .58, torso);
        orb(P.cream, [0, .68, .42], .26, .27, .28, torso);
        orb(P.ivory, [0, .85, -.38], .185, .29, .245, torso);
        for (const front of [true, false])
            for (const side of [-1, 1]) {
                const z = front ? -.33 : .45, phase = (front ? 0 : .22) + (side > 0 ? .50 : 0), gait = (0, companions_1.pawCycle)(p.distance, phase, p.running);
                const hip = [side * .205, .70 + bounce, z], foot = [side * .225, gait.y + air * .22, z + gait.z * (1 - air)];
                const middle = [side * .22, (hip[1] + foot[1]) * .52 + .015, (hip[2] + foot[2]) * .5 + (front ? -.12 : .13)];
                bone(P.ivory, hip, middle, .087, root);
                orb(P.ivory, middle, .09, .10, .095, root);
                bone(P.ivory, middle, foot, .055, root);
                orb(P.frost, [foot[0], foot[1] - .015, foot[2] - .055], .086, .066, .14, root);
                for (let claw = 0; claw < 4; claw++)
                    shape('cone', P.cream, foot[0] + (claw - 1.5) * .032, foot[1] - .01, foot[2] - .175, .012, .05, .012, -Math.PI / 2, 0, 0, root);
            }
        const head = (0, math_1.multiply)(torso, (0, math_1.transform)(0, 1.04, -.61, 1, 1, 1, Math.sin(t * 2.3) * .025 - air * .08, Math.sin(t * .85) * .055, 0));
        orb(P.ivory, [0, 0, 0], .228, .23, .25, head);
        orb(P.frost, [0, -.045, -.245], .145, .108, .29, head);
        orb(P.nose, [0, -.018, -.501], .095, .060, .060, head);
        orb(P.cream, [0, -.139, -.255], .135, .044, .26, head);
        const pant = .012 + Math.sin(t * 7) * .005;
        bone(P.roseLight, [0, -.18, -.39], [.012 * Math.sin(t * 4), -.22 - pant, -.57], .047, head);
        orb(P.roseLight, [.012 * Math.sin(t * 4), -.235 - pant, -.59], .049, .03, .052, head);
        for (const side of [-1, 1]) {
            orb(P.nose, [side * .175, .045, -.145], .047, .056 * blink, .04, head);
            orb(P.eye, [side * .187, .05, -.178], .027, .035 * blink, .015, head);
            orb(P.frost, [side * .183 - .009, .06, -.19], .009, .01, .006, head);
            const ear = (0, math_1.multiply)(head, (0, math_1.transform)(side * .177, .175, .005, 1, 1, 1, .05, side * .12, side * (.18 + Math.sin(t * 1.4 + side) * .03)));
            shape('cone', P.ivory, 0, .115, 0, .10, .31, .075, 0, 0, side * .13, ear);
            shape('cone', P.cream, 0, .112, -.052, .058, .205, .019, 0, 0, side * .13, ear);
        }
        shape('ring', P.rose, 0, .887, -.44, .196, .67, .196, Math.PI / 2 - .22, 0, 0, torso);
        const tag = (0, math_1.multiply)(torso, (0, math_1.transform)(.025 * Math.sin(t * 3), .59, -.541, 1, 1, 1, 0, Math.sin(t * 3) * .08, Math.PI / 4));
        shape('box', P.rose, 0, 0, 0, .14, .14, .036, 0, 0, 0, tag);
        // Tiny raised SW strokes, matching the rose collar rather than a generic metal disc.
        const letters = (0, math_1.multiply)(torso, (0, math_1.transform)(.025 * Math.sin(t * 3), .59, -.565));
        const strokes = [[[-.055, .042, 0], [-.019, .042, 0]], [[-.055, .042, 0], [-.055, .007, 0]], [[-.055, .007, 0], [-.019, .007, 0]], [[-.019, .007, 0], [-.019, -.029, 0]], [[-.019, -.029, 0], [-.055, -.029, 0]], [[.008, .04, 0], [.019, -.03, 0]], [[.019, -.03, 0], [.035, .008, 0]], [[.035, .008, 0], [.051, -.03, 0]], [[.051, -.03, 0], [.065, .04, 0]]];
        for (const [u, v] of strokes)
            bone(P.roseLight, u, v, .006, letters);
        let previous = [0, .72, .61];
        for (let i = 1; i <= 8; i++) {
            const f = i / 8, next = [Math.sin(t * 3.3 - f * 1.8) * f * .23, .72 + Math.sin(f * Math.PI * .66) * .51, .61 + f * .74];
            const c = f > .52 ? P.frost : P.ivory, rad = .089 * (1 - f * .68);
            bone(c, previous, next, rad, torso);
            orb(c, next, rad, rad, rad, torso);
            previous = next;
        }
        shape('shadow', P.shadow, 0, .018, .03, .40, 1, .83, 0, 0, 0, root);
    }
    else if (id === 'gorilla') {
        const brace = a > 0 ? Math.sin(Math.min(1, a / .82) * Math.PI) : 0;
        const bob = p.running ? Math.sin(p.distance / 4 * Math.PI * 4) * .035 : Math.sin(t * 1.8) * .025;
        const body = (0, math_1.multiply)(root, (0, math_1.transform)(0, bob - brace * .12, 0, 1, 1, 1, -.10 - brace * .14, 0, Math.sin(t * 1.2) * .02));
        orb(P.silver, [0, 1.00, .15], .50, .67, .43, body);
        orb(P.white, [0, 1.44, -.015], .67, .44, .45, body);
        orb(P.silver, [0, 1.37, -.386], .42, .36, .081, body);
        for (const side of [-1, 1]) {
            const footCycle = (0, companions_1.pawCycle)(p.distance, (side > 0 ? .5 : 0) + .22, p.running);
            const hip = [side * .29, .83 + bob, .24], foot = [side * .32, .13 + footCycle.y - .10, .31 + footCycle.z];
            const knee = [side * .35, .44 + bob + (footCycle.y - .10) * .55, .06 + footCycle.z * .45];
            bone(P.white, hip, knee, .19, root);
            orb(P.white, knee, .20, .21, .19, root);
            bone(P.silver, knee, foot, .13, root);
            orb(P.skin, [foot[0], foot[1] - .025, foot[2] - .10], .18, .10, .25, root);
            for (let j = 0; j < 5; j++)
                orb(P.skin, [foot[0] + (j - 2) * .055, foot[1] - .024, foot[2] - .31], .035, .047, .060, root);
            const cycle = (0, companions_1.pawCycle)(p.distance, side > 0 ? 0 : .5, p.running);
            const shoulder = [side * .61, 1.44 + bob, 0], elbow = [side * (.81 - brace * .17), .83 + bob + brace * .42, -.08 + cycle.z * .38], fist = [side * (.76 - brace * .48), .09 + cycle.y + brace * 1.07, -.28 + cycle.z - brace * .55];
            bone(P.white, shoulder, elbow, .26, root);
            orb(P.white, elbow, .27, .28, .25, root);
            bone(P.silver, elbow, fist, .20, root);
            orb(P.skin, fist, .24, .19, .23, root);
            for (let j = 0; j < 4; j++)
                orb(P.skinLight, [fist[0] + (j - 1.5) * .087, fist[1] - .08, fist[2] - .15], .052, .083, .075, root);
            orb(P.skin, [fist[0] - side * .19, fist[1] + .015, fist[2] - .08], .075, .11, .085, root);
        }
        const head = (0, math_1.multiply)(body, (0, math_1.transform)(0, 1.91, -.08, 1, 1, 1, Math.sin(t * 1.7) * .018, Math.sin(t * .6) * .055 - brace * .12, 0));
        orb(P.white, [0, 0, .055], .41, .42, .34, head);
        orb(P.skin, [0, -.038, -.248], .305, .30, .125, head);
        orb(P.skin, [0, -.207, -.275], .27, .14, .12, head);
        orb(P.nose, [0, -.075, -.379], .113, .061, .051, head);
        bone(P.nose, [-.14, -.22, -.383], [.14, -.22, -.383], .013, head);
        for (const side of [-1, 1]) {
            orb(P.skin, [side * .376, -.02, .015], .099, .13, .062, head);
            orb(P.nose, [side * .139, .075, -.324], .097, .067, .045, head);
            orb(P.blue, [side * .142, .077, -.358], .050, .042 * blink, .019, head);
            orb(P.black, [side * .141, .077, -.375], .022, .033 * blink, .01, head);
            orb(P.frost, [side * .135 - .01, .091, -.386], .009, .009, .006, head);
            bone(P.silver, [side * .07, .161, -.327], [side * .26, .154, -.25], .069, head);
        }
        shape('shadow', P.shadow, 0, .017, 0, .84, 1, .74, 0, 0, 0, root);
    }
    else {
        const hover = Math.sin(t * 3) * .055 + Math.sin(t * 1.1) * .025, hack = a > 0 ? Math.sin(Math.min(a / .7, 1) * Math.PI) : 0;
        const body = (0, math_1.multiply)(root, (0, math_1.transform)(0, hover, 0, 1, 1, 1, Math.sin(t * 1.7) * .025, Math.sin(t * .75) * .055, Math.sin(t * 1.5) * .035));
        shape('box', P.dark, 0, .53, 0, .52, .66, .37, .06, 0, 0, body);
        orb(P.metal, [0, .83, 0], .31, .14, .22, body);
        bone(P.cyan, [-.18, .76, -.202], [0, .50, -.212], .025, body);
        bone(P.cyan, [0, .50, -.212], [.18, .76, -.202], .025, body);
        orb(P.orange, [0, .41, -.205], .053, .053, .025, body);
        for (const side of [-1, 1]) {
            const shoulder = [side * .31, .75, 0], elbow = [side * (.43 + hack * .08), .49 + hack * .14, -.10 - hack * .19], hand = [side * (.37 + hack * .17), .34 + hack * .31, -.26 - hack * .30];
            bone(P.metal, shoulder, elbow, .095, body);
            orb(P.dark, elbow, .097, .097, .097, body);
            bone(P.metal, elbow, hand, .069, body);
            orb(P.dark, hand, .10, .12, .11, body);
            orb(P.cyan, [hand[0], hand[1], hand[2] - .093], .055, .055, .032, body);
            for (let j = 0; j < 5; j++)
                shape('cone', P.metal, hand[0] + (j - 2) * .031, hand[1] - .075, hand[2] - .095, .012, .09, .015, -Math.PI / 2, 0, 0, body);
            const knee = [side * .16, .16, .04], boot = [side * .18, .0, -.08];
            bone(P.metal, [side * .16, .35, .03], knee, .095, body);
            bone(P.dark, knee, boot, .08, body);
            orb(P.metal, boot, .12, .10, .17, body);
            shape('cone', P.cyan, side * .18, -.17, .00, .061, .22 + Math.sin(t * 9 + side) * .025, .061, Math.PI, 0, 0, body);
        }
        const head = (0, math_1.multiply)(body, (0, math_1.transform)(0, 1.08, -.035, 1, 1, 1, Math.sin(t * 1.4) * .035, Math.sin(t * .9) * .12 + hack * .15, 0));
        shape('box', P.dark, 0, 0, 0, .68, .47, .46, 0, 0, 0, head);
        shape('box', P.metal, 0, .19, -.005, .62, .07, .43, 0, 0, 0, head);
        shape('box', P.metal, 0, .10, -.042, .13, .28, .45, 0, 0, 0, head);
        shape('box', P.black, 0, .005, -.251, .59, .17, .035, 0, 0, 0, head);
        for (const side of [-1, 1]) {
            shape('box', P.metal, side * .352, .07, .005, .06, .205, .20, 0, 0, 0, head);
            shape('box', P.orange, side * .384, .07, -.054, .019, .092, .04, 0, 0, 0, head);
            shape('box', P.cyan, side * .149, .02, -.273, .19, .035 + .022 * blink, .016, 0, 0, side * .035, head);
            shape('box', P.metal, side * .225, -.132, -.236, .12, .13, .043, 0, 0, 0, head);
        }
        shape('box', P.metal, 0, -.145, -.237, .27, .098, .043, 0, 0, 0, head);
        shape('box', P.black, 0, -.145, -.263, .22, .065, .017, 0, 0, 0, head);
        for (let row = 0; row < 3; row++)
            shape('box', P.metal, 0, -.164 + row * .020, -.274, .175, .007, .012, 0, 0, 0, head);
        for (let i = 0; i < 5; i++)
            shape('box', i % 2 ? P.metal : P.dark, Math.sin(t * 2 - i * .5) * i * .016, .30 + i * .028, .20 + i * .13, .15 - i * .018, .13, .17, 0, Math.sin(t * 2 - i * .5) * .10, 0, body);
    }
}
/** Companions enter, follow, act and leave in course coordinates, including secret branches. */
function drawTeam(r, s, time, calm, curve, floor) {
    const { shape, bone } = primitives(r);
    if (s.mode === 'ready') {
        if (s.board === 'overgrown')
            return;
        drawCompanion(r, 'snow', { x: -1.22, y: floor(0), z: -.30, yaw: Math.PI - .3, scale: .86, time, distance: 0, running: false, calm });
        drawCompanion(r, 'gorilla', { x: 1.40, y: floor(0), z: -1.13, yaw: Math.PI + .15, scale: .80, time, distance: 0, running: false, calm });
        drawCompanion(r, 'bot', { x: -.83, y: 2.08, z: -1.37, yaw: Math.PI - .12, scale: .78, time, distance: 0, running: false, calm });
        return;
    }
    for (const id of companions_1.COMPANION_IDS) {
        const c = s.companions[id];
        if (c.timeLeft <= 0)
            continue;
        const arrival = (0, companions_1.arrivalWeight)(c, s.time), exit = (0, core_1.smooth)(c.timeLeft / .65), offset = (0, core_1.routeOffset)(s);
        const away = (1 - arrival) + (1 - exit), a = (0, companions_1.actionProgress)(id, c);
        let x = offset + c.followX + Math.sign(companions_1.COMPANIONS[id].offset) * away * 2.6, z = id === 'gorilla' ? -3.2 : id === 'snow' ? -1.9 : -2.3;
        let y = floor(s.distance) + (id === 'bot' ? 2.25 : 0), air = 0;
        if (id === 'snow' && c.actionRemaining > 0 && c.targetRoute === s.route) {
            const contact = companions_1.COMPANIONS.snow.impactAt / companions_1.COMPANIONS.snow.actionDuration;
            const blend = a < contact ? (0, core_1.smooth)(a / contact) : 1 - (0, core_1.smooth)((a - contact) / (1 - contact));
            const tx = c.targetX + (0, core_1.routeOffset)(s, c.targetD) + curve(c.targetD) - curve(s.distance), tz = s.distance - c.targetD;
            x += (tx - x) * blend;
            z += (tz - z) * blend;
            air = a < contact ? Math.sin(a / contact * Math.PI) : Math.sin((a - contact) / (1 - contact) * Math.PI) * .7;
            y += Math.max(0, air) * 1.1;
        }
        if (id === 'gorilla' && c.actionRemaining > 0) {
            const brace = Math.sin(Math.min(a / .82, 1) * Math.PI);
            x += (offset + s.x + .50 - x) * brace;
            z += (-.8 - z) * brace;
        }
        if (id === 'bot')
            y += away * 2.0;
        const running = ['running', 'paused', 'upgrade'].includes(s.mode) && s.distance > 0;
        drawCompanion(r, id, { x, y, z, yaw: (0, core_1.clamp)(-c.followVx * .035, -.25, .25), scale: id === 'gorilla' ? .84 : id === 'bot' ? .79 : .91, time, distance: s.distance, running, action: a, air, calm });
        if (id === 'gorilla' && c.actionRemaining > 0) {
            const radius = .7 + .45 * Math.sin(Math.PI * a);
            shape('ring', (0, gl_1.color)('#E0F0EC', .5), offset + s.x, floor(s.distance) + 1.05 + s.y, -.60, radius, 1, radius, Math.PI / 2, 0, a);
        }
        if (id === 'bot') {
            if (!calm)
                shape('ring', (0, gl_1.color)('#73DFEE', .20), offset + s.x, floor(s.distance) + .08, 0, 1.15 + .06 * Math.sin(time * 3), 1, 1.15, 0, time * .4, 0);
            if (c.actionRemaining > 0 && c.targetRoute === s.route && a < .75) {
                const target = [c.targetX + (0, core_1.routeOffset)(s, c.targetD) + curve(c.targetD) - curve(s.distance), floor(c.targetD) + .75, s.distance - c.targetD];
                const start = [x, y + .45, z - .25];
                let previous = start;
                for (let i = 1; i <= 5; i++) {
                    const k = i / 5, end = [start[0] + (target[0] - start[0]) * k + (calm ? 0 : Math.sin(time * 15 + i * 2) * .10 * Math.sin(k * Math.PI)), start[1] + (target[1] - start[1]) * k, start[2] + (target[2] - start[2]) * k];
                    bone(P.cyan, previous, end, .020);
                    previous = end;
                }
                shape('ring', P.cyan, ...target, .4, 1, .4, Math.PI / 2, time, 0);
            }
        }
    }
}
};
factories["scene"]=function(require,module,exports){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpeditionScene = exports.CHARACTER_CONTRACT = void 0;
const core_1 = require("./core");
const gl_1 = require("./gl");
const math_1 = require("./math");
const animation_1 = require("./animation");
const companions_1 = require("./companions");
const companion_models_1 = require("./companion-models");
const C = { fur: (0, gl_1.color)('#24272a', -4), furLight: (0, gl_1.color)('#353237', -4), black: (0, gl_1.color)('#0d1117'), cream: (0, gl_1.color)('#f2d9a2'), pale: (0, gl_1.color)('#fff0c7'), gold: (0, gl_1.color)('#ffcb5a'), goldGlow: (0, gl_1.color)('#ffc765', 1.15), mint: (0, gl_1.color)('#70e4d7', .35), violet: (0, gl_1.color)('#b4a0fa', .45), red: (0, gl_1.color)('#e8795e'), pink: (0, gl_1.color)('#da818b'), stone: (0, gl_1.color)('#758474', -8), stoneDark: (0, gl_1.color)('#425450', -8), wood: (0, gl_1.color)('#6c4b35', -7), woodLight: (0, gl_1.color)('#a47c4b', -7), leaf: (0, gl_1.color)('#427763'), leafLight: (0, gl_1.color)('#75aa63'), iron: (0, gl_1.color)('#657579'), copper: (0, gl_1.color)('#ad8155'), water: (0, gl_1.color)('#254d56', -2), shadow: (0, gl_1.color)('#000000', -3) };
const TAU = Math.PI * 2;
const hash = (n) => { const x = Math.sin(n * 127.13 + 91.7) * 43758.5453; return x - Math.floor(x); };
exports.CHARACTER_CONTRACT = { fangCount: 0, teeth: 'small-even', clawsPerPaw: 5, fur: 'black', markings: 'cream', eyes: 'amber-gold' };
const curve = (d) => Math.sin(d / 76) * .8 + Math.sin(d / 185) * 1.1;
const floorY = (d, route = 'main') => Math.sin(d / 34) * .12 + (0, core_1.overgrownPathHeight)(route, d);
class ExpeditionScene {
    renderer;
    particles = [];
    clock = 0;
    lastTime = 0;
    reaction = { kind: 'good', at: -10 };
    cameraX = 0;
    cameraY = 0;
    initializedCamera = false;
    disposed = false;
    particleId = 0;
    constructor(gl) { this.renderer = new gl_1.ExpeditionRenderer(gl); }
    get stats() { return { ...this.renderer.stats, particles: this.particles.length, nativeWorldReady: this.renderer.worldReady === true }; }
    events(events, s, calm = false) {
        for (const e of events) {
            if (e.kind === 'hit')
                this.reaction = { kind: 'hurt', at: this.clock };
            if (['secret', 'upgrade', 'power', 'companion-join', 'companion-attack', 'companion-guard', 'companion-boost'].includes(e.kind))
                this.reaction = { kind: e.kind === 'secret' ? 'discovery' : 'good', at: this.clock };
            if (e.kind === 'revive' || e.kind === 'win')
                this.reaction = { kind: 'revive', at: this.clock };
            if (calm || !['coin', 'gem', 'hit', 'block', 'secret', 'revive', 'land', 'step', 'slide', 'burst', 'splash', 'power', 'companion-join', 'companion-attack', 'companion-guard', 'companion-boost'].includes(e.kind))
                continue;
            const amount = e.kind === 'step' ? 2 : e.kind === 'coin' ? 4 : e.kind === 'secret' || e.kind === 'revive' ? 18 : 9;
            const c = e.companion ? (0, gl_1.color)(companions_1.COMPANIONS[e.companion].color, .5) : e.kind === 'hit' ? C.red : e.kind === 'land' || e.kind === 'step' || e.kind === 'slide' ? (0, gl_1.color)('#b3a386') : e.kind === 'splash' ? C.mint : e.kind === 'block' ? C.mint : e.kind === 'gem' ? C.violet : C.goldGlow;
            for (let i = 0; i < amount; i++) {
                const n = this.particleId++, r = hash(n), a = hash(n + 8) * TAU;
                this.particles.push({ x: e.targetX !== undefined ? e.targetX + curve(e.targetD ?? s.distance) - curve(s.distance) : s.x + (0, core_1.routeOffset)(s), y: floorY(e.targetD ?? s.distance, s.route) + (e.kind === 'step' || e.kind === 'land' || e.kind === 'slide' ? .15 : 1.1) + s.y, d: e.targetD ?? s.distance,
                    vx: Math.cos(a) * (1 + r * 1.8), vy: (e.kind === 'step' ? .5 : 1.8) + r * 2, vz: Math.sin(a) * 2, born: this.clock, life: e.kind === 'step' ? .32 : .55 + r * .4, c, size: e.kind === 'step' ? .055 : .065 + r * .04 });
            }
        }
        this.particles = this.particles.slice(-100);
    }
    shape(shape, c, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, parent) { this.renderer.shape(shape, c, x, y, z, sx, sy, sz, rx, ry, rz, parent); }
    link(a, b, radius, c, parent) { const m = (0, math_1.segment)(a, b, radius); this.renderer.add('cylinder', parent ? (0, math_1.multiply)(parent, m) : m, c); }
    orb(x, y, z, r, c, parent) { this.shape('sphere', c, x, y, z, r, r, r, 0, 0, 0, parent); }
    arch(x, y, z, r, c, width = .26) {
        for (let i = 0; i < 9; i++) {
            const a = (i + .5) / 9 * Math.PI;
            this.shape('box', c, x + Math.cos(a) * r, y + Math.sin(a) * r, z, width, r * .365, .6, 0, 0, a);
        }
    }
    /** Articulated three-dimensional character; no billboard or static runner sprite. */
    madger(s, time, calm) {
        const running = ['running', 'paused', 'upgrade'].includes(s.mode) && s.distance > 0, idle = s.mode === 'ready', age = this.clock - this.reaction.at;
        const hurt = this.reaction.kind === 'hurt' ? (0, core_1.smooth)(age / .045) * Math.max(0, 1 - age / .65) : 0;
        const happy = this.reaction.kind !== 'hurt' ? (0, animation_1.reactionEnvelope)(age) : 0;
        const turnBack = running && this.reaction.kind === 'discovery' ? Math.sin((0, core_1.clamp)(age / 1.15, 0, 1) * Math.PI) * 1.15 : 0;
        const heightAboveFloor = Math.max(0, s.y - (s.groundHeight ?? 0));
        const stride = s.distance / 3.8 * TAU, grounded = heightAboveFloor < .02 && s.slide <= 0;
        const bob = running && grounded ? Math.abs(Math.sin(stride)) * .07 : Math.sin(time * 2.6) * .018;
        const finishAge = s.mode === 'won' || s.mode === 'lost' ? age : undefined;
        const pose = (0, animation_1.burrowPose)(s.slide, s.slideAge, running, heightAboveFloor, finishAge), crouch = pose.weight, air = (0, core_1.smooth)(heightAboveFloor / .38);
        const idleYaw = idle ? Math.PI + .12 + Math.sin(time * .5) * .15 : 0;
        const bank = calm ? 0 : (0, core_1.clamp)(-s.vx * .04, -.18, .18);
        const bounce = happy * .06 * Math.sin(age * 10);
        const root = (0, math_1.transform)(s.x + (0, core_1.routeOffset)(s), floorY(s.distance, s.route) + s.y - pose.depth, 0, 1, 1, 1, 0, idleYaw, 0);
        const body = (0, math_1.multiply)(root, (0, math_1.transform)(0, bob * (1 - crouch) + bounce * (1 - crouch) + pose.bodyY, 0, 1, 1, 1, pose.bodyX + hurt * .17, 0, bank + hurt * .15));
        const fur = hurt > .2 ? (0, gl_1.color)('#705055') : C.fur;
        this.shape('sphere', fur, 0, 1.10, 0, .47, .66, .34, 0, 0, 0, body);
        this.shape('sphere', C.furLight, 0, .82, .08, .45, .37, .34, 0, 0, 0, body);
        this.link([-.28, 1.56, -.28], [0, 1.10, -.354], .061, C.cream, body);
        this.link([0, 1.10, -.354], [.27, 1.50, -.285], .061, C.cream, body);
        this.link([-.20, 1.31, -.33], [0, .94, -.326], .038, C.cream, body);
        this.link([0, .94, -.326], [.20, 1.29, -.33], .038, C.cream, body);
        // Stance and swing share travelled distance with footsteps and ground motion.
        for (const side of [-1, 1]) {
            const gait = (0, animation_1.gaitPose)(s.distance, side, heightAboveFloor, crouch, running), footZ = gait.z, footY = gait.y;
            const hip = [side * .26, .88 + bob - crouch * .40, 0], foot = [side * (.27 + crouch * .08), footY, footZ];
            const dy = foot[1] - hip[1], dz = foot[2] - hip[2], length = Math.min(.95, Math.max(.01, Math.hypot(dy, dz))), bend = Math.sqrt(Math.max(.015, .49 * .49 - (length * .5) ** 2));
            const knee = [side * .28, (hip[1] + foot[1]) * .5 + dz / length * bend, (hip[2] + foot[2]) * .5 + dy / length * bend];
            this.link(hip, knee, .18, fur, root);
            this.orb(...knee, .19, fur, root);
            this.link(knee, foot, .135, fur, root);
            this.shape('sphere', fur, foot[0], foot[1], foot[2] - .07, .20, .13, .31, 0, 0, 0, root);
            this.shape('sphere', C.woodLight, foot[0], foot[1] - .072, foot[2] - .06, .155, .036, .235, 0, 0, 0, root);
            for (let i = 0; i < 5; i++)
                this.shape('cone', C.pale, foot[0] + (i - 2) * .067, foot[1] + .025, foot[2] - .33, .027, .14, .030, -Math.PI / 2, 0, 0, root);
            const swing = running ? Math.sin(stride + (side < 0 ? Math.PI : 0)) * .67 : Math.sin(time * 1.9 + side) * .055;
            const shoulder = [side * .44, 1.45, 0], elbow = [side * (.58 + happy * .12), 1.08 + happy * .34, -Math.sin(swing) * .38 + hurt * .23], hand = [side * (.50 + happy * .23), .82 + happy * .71, -.21 - Math.sin(swing) * .47];
            elbow[1] += .28 * air;
            hand[1] += .45 * air;
            hand[2] -= .12 * air;
            elbow[1] = elbow[1] * (1 - crouch) + .85 * crouch;
            elbow[2] = elbow[2] * (1 - crouch) + .10 * crouch;
            hand[1] = hand[1] * (1 - crouch) + .72 * crouch;
            hand[2] = hand[2] * (1 - crouch) - .05 * crouch;
            // Alternating claw strokes visibly pull Madger into the ground during the dive.
            elbow[1] += side * pose.stroke * .12;
            hand[1] += side * pose.stroke * .22;
            hand[2] -= crouch * .22 + side * pose.stroke * .18;
            this.link(shoulder, elbow, .19, fur, body);
            this.orb(...elbow, .19, fur, body);
            this.link(elbow, hand, .15, fur, body);
            this.shape('sphere', fur, ...hand, .20, .21, .17, 0, 0, 0, body);
            for (let i = 0; i < 5; i++)
                this.shape('cone', C.pale, hand[0] + (i - 2) * .065, hand[1] - .07, hand[2] - .16, .024, .12, .028, -Math.PI / 2, 0, side * .08, body);
        }
        // A continuous deforming fur mesh avoids disconnected, bead-like tail segments.
        this.renderer.updateTail(time, bank);
        const tail = (0, math_1.multiply)(body, (0, math_1.transform)(0, .65 - crouch * .20, .23 - crouch * .13, 1, 1, 1, pose.tailX, Math.sin(time * 2.8) * .16 - bank * .7, 0));
        this.renderer.add('tail', tail, (0, gl_1.color)('#343034', -5));
        const head = (0, math_1.multiply)(body, (0, math_1.transform)(0, pose.headY, pose.headZ, 1, 1, 1, pose.headX + Math.sin(time * 2.4) * .025 - happy * .07, hurt * .18 + turnBack + Math.sin(time * .72) * .04, Math.sin(time * 1.6) * .015));
        this.shape('sphere', fur, 0, 0, -.03, .67, .59, .52, 0, 0, 0, head);
        for (const side of [-1, 1]) {
            const ear = (0, math_1.multiply)(head, (0, math_1.transform)(side * .54, .40, .05, 1, 1, 1, 0, 0, side * (.19 + Math.sin(time * 2.1 + side) * .025)));
            this.shape('sphere', C.cream, 0, 0, 0, .21, .235, .10, 0, 0, 0, ear);
            this.shape('sphere', C.wood, 0, 0, -.08, .142, .16, .045, 0, 0, 0, ear);
            if (!this.renderer.portraitReady) {
                this.shape('sphere', C.cream, side * .37, -.06, -.385, .29, .30, .135, 0, side * .22, side * .22, head);
                this.shape('sphere', C.cream, side * .42, -.24, -.32, .235, .24, .16, 0, 0, side * .35, head);
                const blinkPhase = (time + side * .027) % 4.3, blink = blinkPhase < .12 ? .1 : blinkPhase < .19 ? (0, core_1.smooth)((blinkPhase - .12) / .07) : 1;
                const eyeY = .08, eyeScale = Math.max(.07, blink * (1 - hurt * .55));
                this.shape('sphere', C.black, side * .30, eyeY, -.50, .199, .240, .076, 0, 0, side * .15, head);
                this.shape('sphere', (0, gl_1.color)('#fff6e4'), side * .30, eyeY, -.551, .159, .195 * eyeScale, .045, 0, 0, side * .15, head);
                this.shape('sphere', (0, gl_1.color)('#dca334'), side * .29, eyeY - .004, -.590, .115, .149 * eyeScale, .028, 0, 0, 0, head);
                this.shape('sphere', C.black, side * .29, eyeY - .002, -.614, .067, .108 * eyeScale, .015, 0, 0, 0, head);
                this.orb(side * .27 - .020, eyeY + .055 * eyeScale, -.632, .023, (0, gl_1.color)('#fffef4', .25), head);
                this.link([side * .12, .27, -.53], [side * .46, .30 + hurt * .035, -.44], .067, C.fur, head);
                for (let i = 0; i < 3; i++)
                    this.shape('cone', C.cream, side * (.49 + i * .039), -.23 - i * .042, -.21, .062, .25, .042, 0, 0, side * 1.10, head);
            }
        }
        this.shape('headStripe', this.renderer.portraitReady ? (0, gl_1.color)('#f2d9a2', -11) : C.cream, 0, 0, 0, 1, 1, 1, 0, 0, 0, head);
        if (this.renderer.portraitReady) {
            this.renderer.add('face', head, (0, gl_1.color)('#ffffff', -10));
        }
        else {
            this.shape('sphere', C.cream, 0, .29, -.461, .14, .24, .062, 0, 0, 0, head);
            this.shape('cone', C.cream, .027, .078, -.538, .103, .26, .035, Math.PI, 0, -.15, head);
            // Normal, even teeth remain inside the mouth; no oversized external fang.
            const mouthOpen = .02 + happy * .07 + hurt * .075;
            this.shape('sphere', C.black, 0, -.295 - mouthOpen * .3, -.515, .325, .17 + mouthOpen, .099, 0, 0, 0, head);
            this.shape('sphere', C.cream, 0, -.335 - mouthOpen, -.506, .337, .10, .154, 0, 0, 0, head);
            if (mouthOpen > .05)
                this.shape('sphere', C.pink, 0, -.34 - mouthOpen * .7, -.61, .135, .045, .035, 0, 0, 0, head);
            this.shape('sphere', C.cream, -.16, -.18, -.525, .25, .17, .205, 0, 0, .09, head);
            this.shape('sphere', C.cream, .16, -.18, -.525, .25, .17, .205, 0, 0, -.09, head);
            this.shape('sphere', C.black, 0, -.105, -.704, .169, .116, .118, 0, 0, 0, head);
            this.shape('sphere', (0, gl_1.color)('#869093'), -.034, -.068, -.807, .05, .018, .015, 0, 0, 0, head);
            if (mouthOpen > .045)
                for (let i = 0; i < 4; i++)
                    this.shape('box', C.pale, (i - 1.5) * .057, -.303, -.611, .043, .049, .033, 0, 0, 0, head);
        }
        this.shape('shadow', C.shadow, s.x + (0, core_1.routeOffset)(s), floorY(s.distance, s.route) + (s.groundHeight ?? 0) + .018, 0, .76 * (1 - heightAboveFloor * .10) * (1 - crouch * .45), 1, .62 * (1 - s.y * .10));
        if (crouch > 0)
            this.burrowTrail(s, crouch, calm);
        if (s.shields > 0) {
            this.shape('ring', C.mint, s.x + (0, core_1.routeOffset)(s), 1.20 + floorY(s.distance, s.route) + s.y, 0, .88, 1, .88, Math.PI / 2, time * .8, 0);
            this.shape('ring', C.mint, s.x + (0, core_1.routeOffset)(s), 1.20 + floorY(s.distance, s.route) + s.y, 0, .88, 1, .88, 0, 0, time * .5);
        }
        if (s.magnet > 0)
            this.shape('ring', C.violet, s.x + (0, core_1.routeOffset)(s), floorY(s.distance, s.route) + .10, 0, 1.2 + .07 * Math.sin(time * 5), 1, 1.2, 0, time * .4, 0);
        if (s.burst > 0)
            for (let i = 0; i < 7; i++)
                this.shape('cone', C.goldGlow, s.x + (0, core_1.routeOffset)(s) + (i - 3) * .15, floorY(s.distance, s.route) + .45 + s.y, i * .18 + .35, .06, .8, .06, -Math.PI / 2, 0, 0);
    }
    /** Surface soil marks the runner's position while the articulated body is underground. */
    burrowTrail(s, weight, calm) {
        const x = s.x + (0, core_1.routeOffset)(s), y = floorY(s.distance, s.route), pulse = calm ? 0 : Math.sin(s.slideAge * 34) * .025;
        const soil = s.zone === 2 ? (0, gl_1.color)('#75677b') : s.zone === 1 ? (0, gl_1.color)('#85735c') : (0, gl_1.color)('#8b6743');
        this.shape('rock', soil, x, y + .09 * weight, 0, .66 * weight, (.18 + pulse) * weight, .84 * weight, 0, 0, 0);
        for (const side of [-1, 1])
            this.shape('rock', C.woodLight, x + side * .38 * weight, y + .055, .10, .27 * weight, .105 * weight, .52 * weight, 0, side * .25, 0);
        // A short trail scrolls backwards with travelled distance; no retained particles are needed.
        const travel = s.slideAge * s.speed;
        for (let i = 0; i < 6; i++) {
            const z = ((travel + i * .48) % 2.88) + .36, fade = weight * (1 - z / 3.4);
            this.shape('rock', i % 2 ? soil : C.woodLight, x + Math.sin(i * 2.4) * .20 * weight, y + .025, z, .36 * fade, .065 * fade, .27 * fade, 0, i, 0);
        }
        if (!calm)
            for (let i = 0; i < 8; i++) {
                const age = (s.slideAge * 3.4 + i / 8) % 1, side = i % 2 ? 1 : -1;
                this.shape('rock', i % 3 ? soil : C.woodLight, x + side * (.26 + age * .66) * weight, y + (.08 + Math.sin(age * Math.PI) * .34) * weight, -.30 + age * .80, .055 * weight, .05 * weight, .045 * weight, age * 3, i, age * 2);
            }
    }
    plant(x, y, z, n, time) {
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * TAU + hash(n) * 6;
            this.shape('leaf', i % 2 ? C.leaf : C.leafLight, x, y, z, .45, .6, .8, Math.sin(time * 1.2 + n + i) * .13, a, .25);
        }
    }
    crystal(x, y, z, scale, n) {
        for (let i = 0; i < 3; i++) {
            const h = scale * (.8 + hash(n + i) * .7);
            this.shape('cone', i % 2 ? C.violet : C.mint, x + (i - 1) * .30 * scale, y + h / 2, z + hash(n + i) * .2, .22 * scale, h, .22 * scale, 0, hash(n) * 6, (i - 1) * .15);
            this.shape('cone', i % 2 ? C.violet : C.mint, x + (i - 1) * .30 * scale, y + .06, z, .22 * scale, .18, .22 * scale, Math.PI, 0, 0);
        }
    }
    gear(x, y, z, r, time) {
        this.shape('cylinder', C.copper, x, y, z, r, .16, r, Math.PI / 2, 0, 0);
        this.shape('ring', C.iron, x, y, z, r * 1.12, 1, r * 1.12, Math.PI / 2, 0, time);
        for (let i = 0; i < 10; i++) {
            const a = i / 10 * TAU + time;
            this.shape('box', C.iron, x + Math.cos(a) * r, y + Math.sin(a) * r, z, .20, .26, .23, 0, 0, a);
        }
    }
    scenery(s, time, calm) {
        if (s.board === 'overgrown') {
            this.overgrownScenery(s, time, calm);
            return;
        }
        const d = s.distance, zone = s.zone, c0 = curve(d);
        const worldX = (wd) => curve(wd) - c0;
        const branchSide = (wd, side) => this.burrows.some(g => g.lane === side && wd >= g.d - 14 && wd <= g.d + 103);
        for (let i = 0; i < 13; i++) {
            const wd = Math.floor(d / 20) * 20 + i * 20, zz = d - wd, n = Math.floor(wd / 20);
            for (const side of [-1, 1]) {
                const x = worldX(wd) + side * ((branchSide(wd, side) ? 24 : 14) + hash(n + side) * 9), h = 8 + hash(n * 3) * 16;
                this.shape('rock', (0, gl_1.color)(zone === 2 ? '#45455e' : '#374a43'), x, h / 2 - 4, zz, 5, h / 2, 5, .1, hash(n) * 4, .12);
                if (n % 3 === 0) {
                    const wall = (0, gl_1.color)(zone === 2 ? '#526079' : '#405952');
                    this.shape('box', wall, x - side * 3, 3.5, zz - 9, 2, 9, 2);
                    this.arch(x - side * 3, 5, zz - 9, 3, wall, .7);
                    for (let j = 0; j < 3; j++)
                        this.shape('box', C.stoneDark, x - side * (1.5 + j * 1.7), 7.3 - j * .45, zz - 9, 1.65, .6, 1.5);
                    if (zone !== 1)
                        for (let k = 0; k < 3; k++) {
                            this.shape('box', (0, gl_1.color)('#162b30'), x - side * 3, 2 + k * 1.4, zz - 7.92, .55, .80, .05);
                            this.orb(x - side * 3, 2.0 + k * 1.4, zz - 7.85, .06, C.goldGlow);
                        }
                }
                if (n % 5 === 2 && zone === 0) {
                    const hut = x - side * 5;
                    this.shape('rock', C.stoneDark, hut, -.1, zz, 2.2, 1.6, 1.9);
                    this.arch(hut, -.1, zz + 1.7, .70, C.wood, .19);
                    this.shape('box', C.wood, hut, .31, zz + 1.7, 1.12, .9, .16);
                    this.orb(hut + .87, .58, zz + 1.85, .11, C.goldGlow);
                }
            }
        }
        const start = Math.floor(d / 4) * 4 - 12;
        for (let wd = start; wd < d + 108; wd += 4) {
            const z = d - wd, x = worldX(wd), y = floorY(wd), index = Math.floor(wd / 4), zoneTile = s.board === 'overgrown' ? 0 : Math.min(2, Math.floor(Math.max(0, wd) / 360));
            for (const lane of [-1, 0, 1]) {
                const hole = s.route === 'main' && this.mainGaps.some(o => o.lane === lane && Math.abs(o.d - wd) < 2.8);
                if (hole) {
                    this.shape('box', C.water, x + lane * core_1.LANE_WIDTH, y - 1.75, z, 2.1, .05, 4);
                    continue;
                }
                const floor = zoneTile === 0 ? ['#899984', '#879481', '#95a08b'][Math.abs(index + lane) % 3] : zoneTile === 1 ? ['#727c7e', '#7c8886', '#69797b'][Math.abs(index + lane) % 3] : ['#717991', '#858895', '#7c879b'][Math.abs(index + lane) % 3];
                this.shape('box', (0, gl_1.color)(floor, -1), x + lane * core_1.LANE_WIDTH, y - .20, z, 2.10, .38, 3.94, 0, -Math.cos(wd / 76) * .010, 0);
                if (zoneTile === 1)
                    this.shape('box', C.copper, x + lane * core_1.LANE_WIDTH, y + .008, z, 1.90, .015, .07);
                else if (index % 3 === 0)
                    this.shape('box', (0, gl_1.color)('#567763'), x + lane * core_1.LANE_WIDTH + .71, y + .007, z + .65, .35, .015, .9, 0, .2, 0);
            }
            if (index % 2 === 0)
                for (const side of [-1, 1]) {
                    if (branchSide(wd, side))
                        continue;
                    this.shape('box', C.stoneDark, x + side * 3.43, y - .15, z, .45, .60, 7.8);
                    this.shape('cylinder', C.wood, x + side * 3.42, y + .55, z, .10, 1.3, .10);
                    this.link([x + side * 3.42, y + .93, z - 4], [x + side * 3.42, y + .88, z + 4], .045, C.woodLight);
                    this.shape('box', C.water, x + side * 8, y - .95, z, 8, .08, 8, 0, 0, 0);
                }
            if (index % 3 === 0)
                for (const side of [-1, 1]) {
                    const n = index * 11 + side * 3, xx = x + side * (4.8 + hash(n) * 1.8);
                    if (branchSide(wd, side)) {
                        this.plant(x + side * 13.2, y - .15, z, n, time);
                        continue;
                    }
                    this.shape('rock', C.stoneDark, xx, y - .15, z, 1.0 + hash(n), 1.1, 1.4, 0, hash(n + 2) * 5, .1);
                    this.plant(xx - side * .5, y + .48, z + .5, n, time);
                    if (zoneTile === 0) {
                        const sway = calm ? 0 : Math.sin(time * .9 + n) * .025;
                        this.link([xx, y - .6, z], [xx - side * .7, y + 6, z - .6], .30, C.wood);
                        this.link([xx - side * .7, y + 4.1, z - .3], [xx - side * 3.6, y + 6 + sway, z + .2], .16, C.wood);
                        for (let j = 0; j < 3; j++) {
                            const cx = xx - side * (.5 + j * .75), cy = y + 6.2 + j * .32 + sway, cz = z + (hash(n + j) - .5) * 1.1;
                            this.shape('rock', j % 2 ? C.leaf : C.leafLight, cx, cy, cz, 1.12 + j * .21, .58 + hash(n + j) * .22, 1.43, 0, hash(n + j) * 5, .06);
                            if (j !== 1)
                                this.shape('rock', C.leaf, cx + side * .85, cy - .27, cz + .35, .93, .49, 1.02, 0, hash(n + 2) * 4, 0);
                        }
                        if (n % 2 === 0) {
                            this.link([xx - side * 1.9, y + 5.7, z], [xx - side * 2.0 + Math.sin(time * .8 + n) * .12, y + 2.7, z + .20], .025, C.leaf);
                            this.plant(xx - side * 2.0, y + 3.6, z + .2, n + 1, time);
                        }
                    }
                    else if (zoneTile === 1) {
                        this.shape('box', C.iron, xx, y + .8, z, .8, 2, .7);
                        this.shape('cylinder', C.copper, xx, y + 1.5, z, .24, 2.1, .24, Math.PI / 2, 0, 0);
                        this.gear(xx - side * .6, y + 1.2, z, .5, time * .6 * (side > 0 ? 1 : -1));
                    }
                    else
                        this.crystal(xx, y + .7, z, 1.4, n);
                }
            if (index % 5 === 0) {
                this.arch(x, y + 2.1, z, 5.0, zoneTile === 2 ? (0, gl_1.color)('#606779') : C.stoneDark, .60);
                for (const side of [-1, 1]) {
                    this.shape('box', C.stoneDark, x + side * 5, y + 1, z, .65, 2.3, .9);
                    this.link([x + side * 4.0, y + 1.3, z], [x + side * 4.0, y + 2.8, z], .09, C.wood);
                    const swing = calm ? 0 : Math.sin(time * 1.6 + index) * .07;
                    this.shape('box', C.iron, x + side * 4.0 + swing, y + 2.45, z, .33, .54, .33, 0, 0, swing);
                    this.shape('sphere', (0, gl_1.color)('#ffd994', 1.5 + Math.sin(time * 7 + index) * .04), x + side * 4.0 + swing, y + 2.46, z, .13, .20, .13);
                }
            }
        }
        // Both shortcuts physically diverge and rejoin rather than teleporting the player.
        for (const gate of this.burrows) {
            if (gate.d + 94 < d - 10 || gate.d > d + 105)
                continue;
            for (let wd = gate.d; wd <= gate.d + 90; wd += 3) {
                const z = d - wd;
                if (z > 12 || z < -110)
                    continue;
                const bx = worldX(wd) + (0, core_1.branchOffset)(wd, gate.d, gate.d + 90, gate.lane), by = floorY(wd) + .025;
                this.shape('box', C.woodLight, bx, by - .17, z, 6.4, .25, 2.93);
                for (const side of [-1, 1]) {
                    this.shape('cylinder', C.wood, bx + side * 3.13, by + .52, z, .085, 1.25, .085);
                    this.link([bx + side * 3.13, by + .85, z - 1.5], [bx + side * 3.13, by + .82, z + 1.5], .025, C.cream);
                }
                if (Math.round(wd) % 9 === 0) {
                    this.arch(bx, by + .6, z, 3.3, C.wood, .22);
                    this.crystal(bx + 2.7, by + .15, z, .48, wd);
                }
            }
        }
        if (!calm)
            for (let i = 0; i < 25; i++) {
                const zz = -((i * 7.3 + d * .6) % 95) + 8;
                this.orb(Math.sin(i * 9.7) * 9 + Math.sin(time + i) * .14, 1.2 + hash(i) * 5 + Math.sin(time * .7 + i) * .18, zz, .025 + (i % 3) * .008, i % 3 ? C.mint : C.goldGlow);
            }
        if (d > 970) {
            const z = d - 1090;
            this.arch(worldX(1090), 1.2, z, 4.5, C.gold, .5);
            for (let i = 0; i < 5; i++)
                this.shape('box', C.goldGlow, worldX(1090) + (i - 2) * 1.4, 1.8, z, .8, 3.2, .25);
        }
    }
    /** Physical branching roads and authored biome props for the Overgrown Burrow.
     * Each child route gets a separate offset road and themed geometry. Only the
     * chosen road is detailed once the player has committed to a fork.
     */
    /** Native scanned woodland, rooted in a continuous contoured ground mesh.
     * Geometry and texture detail survive the lowest GPU budget. Only counts and
     * draw distance change. Trees are full meshes, never camera-facing sprites. */
    nativeLandscape(s, time, calm) {
        const d = s.distance, base = curve(d), budget = this.renderer.sceneryBudget;
        const cave = ['deep', 'mudslide', 'crystal-vein', 'ancient-vault'].includes(s.route);
        const ruins = ['ridge', 'causeway', 'watchtower', 'gearworks'].includes(s.route);
        const white = (0, gl_1.color)('#f2f1dd'), stone = (0, gl_1.color)(cave ? '#a4bbc9' : '#d6d8cc'), ground = (0, gl_1.color)(cave ? '#717a85' : ruins ? '#a7a48a' : '#9eab7b', cave ? -8 : -1);
        const far = [44, 64, 86][budget];
        const centre = (wd) => curve(wd) - base + (0, core_1.overgrownPathOffset)(s.route, wd);
        if (cave)
            for (const side of [-1, 1])
                this.shape('box', (0, gl_1.color)('#526576', -8), centre(d + 74) + side * 7.8, 4.2, -74, 4, 9, 80);
        // Fill from the edge of the playable road out into the forest and hills.
        // The playable surface itself remains open at every authored gap.
        for (let wd = Math.floor((d - 18) / 12) * 12; wd < d + 112; wd += 12) {
            const z = d - wd, x = centre(wd), y = floorY(wd, s.route);
            for (const side of [-1, 1])
                this.shape('terrain', ground, x + side * 3.02, y - .10, z, side * 29, 6, 6.7, 0, 0, 0);
            if (cave) {
                this.shape('ceiling', (0, gl_1.color)('#607582', -8), x, 10.0, z, 8.8, 4.2, 6.0, 0, 0, 0);
                for (const side of [-1, 1])
                    this.shape('cone', (0, gl_1.color)('#70838a', -8), x + side * 4.7, y + 6.8, z, .45, 2.1, .52, Math.PI, 0, 0);
            }
        }
        // The narrow fork entrances expose the earth between roads. Give each
        // junction a recessed ground bed so the clear sky cannot show through it.
        // End before the first generated hazard row; authored gaps stay open.
        for (const junction of [140, 455]) {
            if (junction + 27 < d - 18 || junction - 3 > d + 112)
                continue;
            const wd = junction + 12;
            this.shape('trail', ground, curve(wd) - base, Math.sin(wd / 34) * .12 - 1.25, d - wd, 27, 1, 30);
        }
        for (let n = Math.floor(d / 14); n * 14 < d + far; n++) {
            const wd = n * 14 + 7, ahead = wd - d;
            if (ahead < 7)
                continue;
            const z = -ahead, x = centre(wd), y = floorY(wd, s.route), side = n % 2 ? 1 : -1;
            const yaw = hash(n * 17) * TAU, h = 9.2 + hash(n * 31) * 2.2;
            if (!cave) {
                const bx = x + side * (8.0 + hash(n) * 1.7);
                for (const part of ['scanTreeTrunk', 'scanTreeCrown', 'scanTreeTwigs'])
                    this.shape(part, white, bx, y - .12, z, h, h, h, 0, yaw, 0);
                this.shape('shadow', C.shadow, bx, y + .015, z, 2.1, 1, 1.9);
                if (budget > 0 && n % 2 === 0)
                    for (const part of ['scanTreeTrunk', 'scanTreeCrown', 'scanTreeTwigs'])
                        this.shape(part, (0, gl_1.color)('#c9d8c1'), x - side * 10, y + .25, z - 5, h * .85, h * .85, h * .85, 0, yaw + 1, 0);
                if (ahead < 32 || budget > 0) {
                    this.shape('scanFern', (0, gl_1.color)('#b7cc94'), x + side * 4.25, y - .02, z + 2, .90, .90, .90, 0, yaw, 0);
                    if (ahead < 25)
                        this.shape('scanFern', (0, gl_1.color)('#b7cc94'), x - side * 3.95, y - .02, z + 4, .65, .65, .65, 0, yaw + 2, 0);
                    this.shape('scanRoots', white, x + side * 5.7, y - .05, z - 2, 3.1, 1.5, 2.5, 0, yaw, 0);
                }
                // Highest detail: actual scanned near-ground meshes form a varied
                // understory rather than adding fog/cards. Every position is seeded by
                // absolute travel distance, so streaming and cold resume never swim.
                // Keep all new stones/ferns beyond the widest playable catch road.
                if (budget === 2 && ahead < 58)
                    for (const flank of [-1, 1]) {
                        const seed = n * 23 + flank * 5, offset = flank * (7.6 + hash(seed) * 1.6);
                        const planted = wd + (flank === side ? 3.8 : -2.4);
                        const fx = centre(planted) + offset, fy = floorY(planted, s.route), fz = d - planted;
                        if (!ruins) {
                            const scale = .54 + hash(seed + 7) * .43;
                            this.shape('scanFern', (0, gl_1.color)('#c2d5ac'), fx, fy - .09, fz, scale, scale, scale, 0, yaw + flank * .7, 0);
                        }
                        else
                            this.shape('scanRock', stone, fx, fy - .12, fz, 1.35, .65, 1.08, 0, yaw + flank * .31, 0);
                        if (n % 2 === 0)
                            this.shape('scanRoots', white, fx + flank * .32, fy - .07, fz - 1.35, 1.8, .70, 1.75, 0, yaw + flank, 0);
                    }
            }
            else {
                this.shape('scanCliff', stone, x + side * 7.9, y - .7, z, 7.3, 9.2, 5.8, 0, yaw, 0);
                this.shape('scanCliff', stone, x - side * 7.9, y - .7, z - 4, 7.3, 9.2, 5.8, 0, yaw + 2, 0);
                this.crystal(x + side * 4.35, y + .05, z, .72, n);
            }
            this.shape('scanRock', stone, x - side * 4.6, y - .10, z - 2, 2.1, 1.9, 1.8, 0, yaw, 0);
            this.shape('shadow', C.shadow, x - side * 4.6, y + .01, z - 2, 1.2, 1, 1.1);
            if (n % 3 === 0 && !cave)
                this.shape('scanLog', white, x - side * 6.0, y + .05, z + 3, 4.2, 5.4, 4.0, 0, yaw * .3, 0);
            if (ruins && n % 2 === 0) {
                for (let row = 0; row < 4; row++)
                    for (let col = 0; col < 2; col++)
                        this.shape('box', C.stone, x + side * (5.1 + col * .8), y + .36 + row * .73, z, .77, .71, 1.14, 0, .1 * side, 0);
                this.shape('scanCliff', stone, x + side * 9, y - .3, z - 5, 5.3, 4.2, 4.7, 0, yaw, 0);
            }
            // Moving air is subtle. No particle curtain over collision silhouettes.
            if (!calm && ahead < 35 && n % 2 === 0)
                this.shape('leaf', C.leaf, x + side * (4.0 + Math.sin(time * .5 + n)), y + 1.5 + Math.sin(time * .7 + n) * .5, z + Math.cos(time * .4 + n), .16, .22, .26, time * .4, n, time * .6);
        }
    }
    overgrownScenery(s, time, calm) {
        const d = s.distance, base = curve(d);
        if (this.renderer.worldReady)
            this.nativeLandscape(s, time, calm);
        // Native GL has a measured, hysteretic GPU-drain budget. Preserve every
        // playable lane and hazard at full fidelity; trim ONLY off-track distance
        // dressing when a software renderer or older phone is falling behind.
        const sceneryBudget = this.renderer.sceneryBudget;
        const sceneryFar = sceneryBudget === 0 ? 42 : sceneryBudget === 1 ? 65 : 95;
        const mainTheme = (route) => ['main', 'rootway', 'mosswalk', 'root-arch', 'log-crossing'].includes(route) ? 'forest' :
            ['ridge', 'causeway', 'watchtower', 'gearworks'].includes(route) ? 'ruins' : 'cavern';
        const approach = { id: 'main', name: 'The Overgrown Burrow', risk: 'LOW', reward: 'Coins', description: 'Forest approach', side: 0, accent: '#B1DC88' };
        const phases = [
            { start: this.renderer.worldReady ? -24 : 0, end: 140, options: [approach] },
            { start: 140, end: 450, options: core_1.MAJOR_FORKS },
            { start: 445, end: 461, options: [approach] },
            { start: 455, end: 900, options: core_1.SUB_FORKS[(s.majorPath === 'ridge' || s.majorPath === 'deep') ? s.majorPath : 'rootway'] },
            { start: 900, end: 1080, options: [approach] },
        ];
        for (const phase of phases) {
            if (d > phase.end + 8 || d + 94 < phase.start)
                continue;
            const allRoutes = (s.mode === 'fork' || d < phase.start) && d < phase.start + 25;
            const options = allRoutes ? phase.options : phase.options.filter(o => o.id === s.route);
            for (const option of options) {
                const theme = mainTheme(option.id), highlight = option.accent;
                const mud = theme === 'cavern' ? (0, gl_1.color)('#6c7b85', -8) : theme === 'ruins' ? (0, gl_1.color)('#716458', -1) : (0, gl_1.color)('#625848', -1);
                const edge = theme === 'cavern' ? (0, gl_1.color)('#3A3446', -8) : theme === 'ruins' ? (0, gl_1.color)('#4F504D', -8) : (0, gl_1.color)('#4B4638', -8);
                const vegetation = theme === 'cavern' ? (0, gl_1.color)('#4B6D69') : theme === 'ruins' ? C.leaf : C.leafLight;
                const step = 6, first = this.renderer.worldReady ? Math.max(phase.start, Math.floor((d - 12) / step) * step) : Math.max(phase.start + 3, Math.floor((d - 9) / step) * step);
                for (let wd = first; wd < Math.min(phase.end + (this.renderer.worldReady ? 3 : -2), d + 90); wd += step) {
                    const z = d - wd, off = (0, core_1.overgrownPathOffset)(option.id, wd), x = off + curve(wd) - base, y = floorY(wd, option.id), n = Math.floor(wd / 6);
                    const delta = ((0, core_1.overgrownPathOffset)(option.id, wd + 1) + curve(wd + 1) - (0, core_1.overgrownPathOffset)(option.id, wd - 1) - curve(wd - 1)) * .5;
                    const roadYaw = -Math.atan(delta);
                    // Three walkable physical lanes. Their dirt and stone retain the same
                    // independently interpolated fork offset as Madger and collectibles.
                    for (const lane of [-1, 0, 1]) {
                        const width = (0, core_1.overgrownPathWidth)(option.id, wd), lx = x + lane * core_1.LANE_WIDTH * width;
                        if (this.renderer.worldReady) {
                            for (let j = 0; j < 4; j++) {
                                const td = wd - 2.25 + j * 1.5;
                                const gap = this.course.some(o => o.kind === 'gap' && o.route === option.id && o.lane === lane && Math.abs(o.d - td) < 2.0);
                                if (!gap)
                                    this.shape('trail', mud, (0, core_1.overgrownPathOffset)(option.id, td) + curve(td) - base + lane * core_1.LANE_WIDTH * (0, core_1.overgrownPathWidth)(option.id, td), floorY(td, option.id), d - td, 2.19 * (0, core_1.overgrownPathWidth)(option.id, td), 1, 1.67, Math.atan((floorY(td + .75, option.id) - floorY(td - .75, option.id)) / 1.5), roadYaw, 0);
                            }
                        }
                        else
                            this.shape('box', mud, lx, y - .24, z, 2.12 * width, .40, 6.7, 0, roadYaw, 0);
                        if (!this.renderer.worldReady && (n + lane) % 3 === 0) {
                            this.shape('rock', vegetation, lx + .60, y + .025, z + .5, .42, .026, 1.55, 0, n * .48, 0);
                            this.shape('rock', edge, lx - .67, y + .023, z - .6, .37, .042, .39, 0, n, 0);
                        }
                        if (!this.renderer.worldReady && (n + lane) % 4 === 0)
                            this.shape('rock', (0, gl_1.color)('#454A37', -8), lx - .13, y + .023, z + 1.1, .61, .035, .77, 0, n * .51, 0);
                    }
                    // Opaque trees, foliage and rock faces behind the camera can block
                    // the entire screen as a fork curves. Keep the track under the runner,
                    // but render tall scenery only ahead of the playing/camera corridor.
                    if (this.renderer.worldReady || z > -7 || -z > sceneryFar)
                        continue;
                    // Keep detailed close-up vegetation and masonry. Thin only off-track
                    // props beyond 30 metres; forks, pickups, road and hero are untouched.
                    if (sceneryBudget < 2 && -z > 30 && n % (sceneryBudget === 0 ? 4 : 2) !== 0)
                        continue;
                    // Wet border rock, ancient edging and root networks never occupy lanes.
                    for (const side of [-1, 1]) {
                        const bx = x + side * 4.33, t = (hash(n * 43 + side * 9) * 2 - 1), bark = theme === 'ruins' ? (0, gl_1.color)('#807B73', -8) : theme === 'cavern' ? edge : (0, gl_1.color)('#735438', -7);
                        this.shape('rock', edge, bx, y + .16, z, 1.08, .42, 2.8, 0, n * .21, 0);
                        if (n % 3 === 0) {
                            if (theme === 'forest') {
                                // Living canopy sways above its fixed rooted base; only foliage and
                                // branch endpoints animate, never the path or hazard positions.
                                const wind = calm ? 0 : Math.sin(time * .73 + n * .43 + side) * .095;
                                this.link([bx, y + .15, z], [bx + side * .14 + wind * .42, y + 3.65, z - .18 + wind * .3], .30, bark);
                                this.link([bx + side * .14 + wind * .31, y + 2.65, z - .18], [bx - side * .92 + wind, y + 4.26, z - .72 + wind * .4], .15, bark);
                                this.link([bx + side * .14 + wind * .36, y + 3.05, z - .18], [bx + side * .86 + wind, y + 4.72, z + .32 + wind * .4], .13, bark);
                                for (let j = 0; j < 5; j++)
                                    this.shape('rock', j % 2 ? C.leaf : C.leafLight, bx + Math.sin(j * 2.32) * .67 + wind, y + 4.6 + Math.cos(j * 3.1) * .37, z - .3 + Math.cos(j * 2.1) * .57, 1.05, .53, .90, 0, j, 0);
                                if (!calm)
                                    this.link([bx - side * .5, y + 4.1, z - .5], [bx - side * .48 + Math.sin(time + n) * .05, y + 2.65, z - .45], .020, C.leaf);
                            }
                            else if (theme === 'ruins') {
                                const broken = .65 + hash(n * 17 + side) * 1.75;
                                this.shape('cylinder', C.stone, bx, y + broken / 2, z, .40, broken, .39);
                                this.shape('rock', C.stoneDark, bx + t * .35, y + broken + .05, z, .60, .16, .61, 0, n * .3, .11);
                                this.shape('box', C.copper, bx + side * .30, y + .35, z + .28, .11, .56, .10, 0, n * .22, 0);
                                if (n % 6 === 0)
                                    this.gear(bx - side * .7, y + 1.1, z, .48, time * .2);
                            }
                            else {
                                // A low ceiling of layered shale, mineral veins and damp formations.
                                this.shape('rock', edge, bx - side * .2, y + 2.0, z, 1.44, 2.9, 2.15, 0, n * .22, .12);
                                this.shape('cone', C.stoneDark, bx - side * .7, y + 3.82, z, .30, 1.28, .28, Math.PI, 0, 0);
                                if (n % 6 === 0)
                                    this.crystal(bx - side * .7, y + .18, z, .62, n);
                                this.shape('sphere', (0, gl_1.color)('#48626A', -2), bx - side * .75, y + .012, z, .72, .02, 1.03);
                            }
                        }
                        else if (n % 2 === 0) {
                            for (let j = 0; j < 3; j++)
                                this.shape('rock', j % 2 ? edge : vegetation, bx + Math.sin(j * 4 + n) * .35, y + .15 + j * .11, z + (j - 1) * .69, .55, .25, .50, 0, n + j, 0);
                        }
                    }
                    // Distant cliff silhouettes and softer outer banks fill the sky without
                    // covering the runner or inventing hazards beyond the selected path.
                    // Normal-shaded ridgeline strips now replace these old giant
                    // faceted placeholder rocks. The terrain banks are streamed below from
                    // stable absolute world distances and never block the three lanes.
                    // Path-specific recognizable landmarks, not interchangeable filler props.
                    if (option.id === 'main' && n % 7 === 0) {
                        for (const side of [-1, 1])
                            this.shape('rock', C.leaf, x + side * 3.6, y + .25, z + .6, .58, .35, .75, 0, n * .31, 0);
                        if (n % 14 === 0)
                            for (const side of [-1, 1])
                                this.shape('sphere', (0, gl_1.color)('#D6B494', .15), x + side * 3.48, y + .57, z, .12, .12, .12);
                    }
                    if (n % 9 === 0) {
                        if (option.id === 'root-arch')
                            this.arch(x, y + .98, z, 3.1, C.wood, .28);
                        if (option.id === 'log-crossing')
                            this.link([x - 2.6, y + .15, z], [x + 2.6, y + .17, z], .20, C.wood);
                        if (option.id === 'watchtower')
                            this.arch(x + 3.9, y + 3.1, z, 2.5, C.stone, .36);
                        if (option.id === 'gearworks')
                            this.gear(x - 3.4, y + .95, z, .71, time * .5);
                        if (option.id === 'crystal-vein')
                            for (const side of [-1, 1])
                                this.crystal(x + side * 3.9, y + .1, z, .9, n + side);
                        if (option.id === 'ancient-vault') {
                            this.shape('box', C.wood, x + 3.8, y + .65, z, 1.1, 1.2, .9);
                            this.shape('ring', C.goldGlow, x + 3.8, y + 1.12, z + .49, .29, 1, .29);
                        }
                    }
                }
                // Native WebGL counterpart of the richer browser PBR far banks.
                // One reused indexed/instanced ridge batch; no new per-frame draw calls
                // per hill, no collisions, no changes to the saved route or checkpoints.
                const backdropFar = sceneryBudget === 0 ? 88 : sceneryBudget === 1 ? 100 : 112;
                const backdropTint = (0, gl_1.color)(theme === 'cavern' ? '#4A5661' : theme === 'ruins' ? '#898C83' : '#607F72', -8);
                const startBand = Math.floor((d - 24) / 24), endBand = Math.ceil((d + backdropFar) / 24);
                for (let band = startBand; band <= endBand; band++) {
                    const distance = band * 24, ahead = distance - d;
                    if (distance < phase.start + 4 || distance > phase.end - 4 || ahead <= 2 || ahead >= backdropFar)
                        continue;
                    const fade = (0, core_1.smooth)((ahead - 2) / 16) * (0, core_1.smooth)((backdropFar - ahead) / 20);
                    if (fade < .035)
                        continue;
                    const roadCentre = (0, core_1.overgrownPathOffset)(option.id, distance) + curve(distance) - base;
                    for (const side of [-1, 1]) {
                        const noise = hash(band * 71 + side * 17 + (theme === 'ruins' ? 89 : 13));
                        const bankX = roadCentre + side * (21 + noise * 3.1);
                        this.shape('ridge', backdropTint, bankX, floorY(distance, option.id) - .43, d - distance, (8.2 + noise * 3) * fade, (7.4 + noise * 3) * fade, (13 + noise * 3.5) * fade, 0, (noise - .5) * .13, 0);
                    }
                }
                // A visible route junction accompanies the actual fixed-step choice:
                // three approach lanes at 140m, then a low descent, raised jump ledge and
                // root-clad burrow tunnel at 455m. Only artwork; the fixed-step engine
                // decides which path was genuinely reached, without scripted teleports.
                if (allRoutes && phase.start === 455) {
                    const junction = 455, jz = d - junction, ix = curve(junction) - base + option.side * core_1.LANE_WIDTH, iy = floorY(junction);
                    if (jz > -60 && jz < 11) {
                        const metal = theme === 'ruins' ? C.copper : C.stone;
                        if (option.side === -1) {
                            // Open lower channel: a clearly down-sloping earth lip and side stones.
                            this.shape('box', C.stoneDark, ix, iy - .36, jz - .8, 1.77, .25, 3.1, -.17, 0, 0);
                            for (const side of [-1, 1])
                                this.shape('rock', C.stone, ix + side * .98, iy - .16, jz - 1.0, .21, .24, .8);
                        }
                        else if (option.side === 0) {
                            // Mid-path is not accessible merely by steering: reach the high lip
                            // with a correctly timed jump above the untouched .65m physics gate.
                            this.shape('box', metal, ix, iy + .52, jz - 1.25, 1.86, .26, 2.3);
                            this.shape('box', C.stoneDark, ix, iy + .32, jz - .8, 1.72, .64, .9);
                            for (const side of [-1, 1])
                                this.shape('cylinder', metal, ix + side * .90, iy + .60, jz - 1.4, .11, 1.2, .11);
                        }
                        else {
                            // Crawl under the roots to find the hidden branch. Normal running
                            // fails the action gate and safely falls back to the lower channel.
                            for (const side of [-1, 1])
                                this.shape('rock', C.wood, ix + side * .70, iy + .72, jz - .8, .26, .72, .73);
                            this.link([ix - .77, iy + 1.26, jz - .8], [ix + .77, iy + 1.26, jz - .8], .19, C.wood);
                            this.shape('box', C.goldGlow, ix, iy + .22, jz - .71, .68, .08, .20);
                        }
                    }
                }
                // At an imminent fork every doorway remains visible, even before choosing.
                if (allRoutes) {
                    const portal = phase.start + 13, z = d - portal;
                    if (z > -95 && z < 14) {
                        const x = curve(portal) - base + (0, core_1.overgrownPathOffset)(option.id, portal), y = floorY(portal, option.id);
                        this.arch(x, y + 1.15, z, 3.1, theme === 'cavern' ? C.stone : theme === 'ruins' ? C.copper : C.wood, .35);
                        this.shape('sphere', (0, gl_1.color)(highlight, .75), x, y + 3.80 + Math.sin(time * 2 + option.side) * .09, z, .21, .33, .21);
                        for (const side of [-1, 1])
                            this.shape('rock', edge, x + side * 3.1, y + .30, z, .81, .75, .88);
                    }
                }
            }
        }
    }
    course = [];
    burrows = [];
    mainGaps = [];
    setCourse(course) { this.course = course; this.burrows = course.filter(o => o.kind === 'burrow'); this.mainGaps = course.filter(o => o.kind === 'gap' && o.route === 'main'); this.initializedCamera = false; }
    item(item, s, time) {
        const ahead = item.d - s.distance;
        if (ahead < (item.kind === 'bonus-ledge' ? -core_1.BONUS_LEDGE_LENGTH - 3 : -6) || ahead > 102)
            return;
        if (item.kind === 'boulder' && item.route === s.route && ahead < 52) {
            const side = item.lane || (Math.sin(item.phase) >= 0 ? 1 : -1), bx = side * 6.6 + (0, core_1.routeOffset)(s, item.d) + curve(item.d) - curve(s.distance), by = floorY(item.d, item.route);
            this.shape(this.renderer.worldReady ? 'scanCliff' : 'rock', C.stone, bx, by - .15, -ahead - 5.76, 2.6, 3.3, 3.2, 0, side * .3, 0);
            for (let i = 0; i < 3; i++)
                this.shape('rock', C.stoneDark, bx - side * (.75 + i * .32), by + .15 + i * .24, -ahead - 3.5 + i * .3, .22, .18, .28, 0, i, 0);
        }
        if (s.used.includes(item.id))
            return;
        if (s.board === 'overgrown') {
            if (item.route !== s.route && item.route !== 'main')
                return;
        }
        else if (item.route !== s.route && item.route !== 'main' && s.route !== 'main')
            return;
        let offset = 0;
        if (s.board === 'overgrown')
            offset = (0, core_1.overgrownPathOffset)(item.route, item.d);
        else if (item.route !== 'main') {
            const gate = this.burrows.find(g => (item.route === 'hollow' && g.d < 500) || (item.route === 'grotto' && g.d > 500));
            if (gate)
                offset = (0, core_1.branchOffset)(item.d, gate.d, gate.d + 90, gate.lane);
        }
        const pose = (0, core_1.hazardPose)(item, s.time, s.distance), x = pose.x + offset + curve(pose.d) - curve(s.distance), z = -pose.ahead, y = floorY(pose.d, item.route) + (item.elevation ?? 0), phase = time + item.phase;
        const bob = Math.sin(phase * 3) * .09;
        const shadow = (size) => this.shape('shadow', C.shadow, x, y + .020, z, size, 1, size);
        if (['coin', 'gem', 'life', 'key', 'shield', 'magnet', 'snow-sigil', 'guardian-totem', 'tech-cell', 'treasure-cache'].includes(item.kind))
            this.shape('halo', (0, gl_1.color)(item.kind === 'gem' ? '#b6a4ff' : item.kind === 'shield' ? '#69efcf' : '#ffc363', -6), x, y + 1 + bob, z, .68, .68, .68);
        const ally = (0, companions_1.companionId)(item.kind);
        if (ally) {
            const c = (0, gl_1.color)(companions_1.COMPANIONS[ally].color, .45), active = s.companions[ally].timeLeft > 0;
            this.shape('ring', c, x, y + .06, z, .67, 1, .67, 0, time * .5, 0);
            if (!active)
                (0, companion_models_1.drawCompanion)(this.renderer, ally, { x, y: y + (ally === 'bot' ? 1.25 : 0), z, yaw: Math.PI, scale: ally === 'gorilla' ? .70 : ally === 'bot' ? .76 : .85, time, distance: s.distance, running: false });
            else {
                this.shape('ring', c, x, y + 1.03 + bob, z, .43, 1, .43, Math.PI / 2, time, 0);
                this.orb(x, y + 1.03 + bob, z, .15, c);
            }
            return;
        }
        switch (item.kind) {
            case 'chamber-door': {
                const chamber = core_1.CHAMBERS.find(c => c.route === item.route && c.d === item.d);
                if (!chamber)
                    break;
                const tech = chamber.hero === 'bot', accent = (0, gl_1.color)(chamber.accent, .55), height = tech ? 1.25 : .16;
                this.arch(x, y + height, z, tech ? .85 : 1.0, tech ? C.copper : (0, gl_1.color)('#5B503D', -7), .22);
                this.shape('box', (0, gl_1.color)('#122723'), x, y + .55 + height, z - .12, 1.45, 1.0, .20);
                this.shape('ring', accent, x, y + height + .75, z + .18, .35, 1, .35, Math.PI / 2, 0, 0);
                for (const side of [-1, 1]) {
                    this.shape('rock', (0, gl_1.color)('#6D7567', -8), x + side * 1.0, y + .37, z, .32, .52, .6);
                    this.orb(x + side * .8, y + height + .72, z + .1, .075, accent);
                }
                if (tech) {
                    this.gear(x, y + 2.65, z, .24, time * .4);
                    this.shape('box', C.copper, x, y + .28, z + .3, 1.5, .15, 1.0);
                }
                else
                    for (let i = 0; i < 4; i++)
                        this.link([x - .5 + i * .3, y + 1.1, z + .12], [x - .48 + i * .3, y + .84, z + .15], .025, C.cream);
                break;
            }
            case 'snow-sigil': {
                this.shape('cylinder', C.iron, x, y + .18, z, .50, .26, .50);
                this.shape('cone', (0, gl_1.color)('#A6DCE8', .5), x, y + 1.10 + bob, z, .33, .94, .33, 0, phase * .55, 0);
                this.shape('cone', (0, gl_1.color)('#F6D8F2', .7), x, y + 1.44 + bob, z, .21, .52, .23, Math.PI, phase * .55, 0);
                for (let i = 0; i < 5; i++) {
                    const a = i * TAU / 5;
                    this.shape('sphere', C.pale, x + Math.cos(a) * .30, y + .90 + Math.sin(a * 2 + phase) * .10, z + Math.sin(a) * .30, .055, .075, .05);
                }
                shadow(.52);
                break;
            }
            case 'guardian-totem': {
                this.shape('cylinder', C.stoneDark, x, y + .37, z, .45, .68, .43);
                this.shape('rock', C.stone, x, y + .83 + bob, z, .47, .54, .37, 0, phase * .16, 0);
                this.shape('box', C.goldGlow, x, y + .86 + bob, z - .39, .16, .47, .045);
                for (const side of [-1, 1])
                    this.shape('rock', C.cream, x + side * .31, y + 1.06 + bob, z - .26, .14, .21, .16, 0, 0, side * .28);
                shadow(.60);
                break;
            }
            case 'tech-cell': {
                this.shape('cylinder', C.iron, x, y + .82 + bob, z, .33, .92, .33);
                this.shape('cylinder', C.mint, x, y + .82 + bob, z, .26, .68, .26);
                for (const level of [.38, .70, 1.03, 1.26])
                    this.shape('ring', C.copper, x, y + level + bob, z, .36, 1, .36);
                this.orb(x, y + 1.43 + bob, z, .16, C.mint);
                shadow(.45);
                break;
            }
            case 'treasure-cache': {
                this.shape('rock', C.stoneDark, x, y + .18, z, .79, .33, .66);
                this.shape('box', C.wood, x, y + .48, z, .83, .52, .67);
                this.shape('rock', C.goldGlow, x, y + .75 + bob, z, .53, .23, .48);
                for (let i = 0; i < 5; i++)
                    this.orb(x + (i - 2) * .18, y + .78 + bob, z - .24, .085, i % 2 ? C.gold : C.violet);
                shadow(.72);
                break;
            }
            case 'coin':
                this.shape('ring', C.goldGlow, x, y + .92 + bob, z, .32, .9, .32, Math.PI / 2, phase * 2.5, 0);
                this.shape('cylinder', C.gold, x, y + .92 + bob, z, .225, .055, .225, Math.PI / 2, phase * 2.5, 0);
                shadow(.32);
                break;
            case 'gem':
                this.shape('cone', C.violet, x, y + 1.12 + bob, z, .32, .55, .32, 0, phase * 1.7, 0);
                this.shape('cone', C.mint, x, y + .73 + bob, z, .32, .24, .32, Math.PI, phase * 1.7, 0);
                shadow(.35);
                break;
            case 'heart':
            case 'life': {
                const yy = y + .95 + bob, c = item.kind === 'life' ? C.goldGlow : C.pink;
                this.orb(x - .13, yy + .09, z, .22, c);
                this.orb(x + .13, yy + .09, z, .22, c);
                this.shape('cone', c, x, yy - .15, z, .31, .43, .23, Math.PI, phase * .4, 0);
                if (item.kind === 'life')
                    for (const side of [-1, 1])
                        this.shape('leaf', C.pale, x + side * .2, yy, z, .55, 1, .7, Math.PI / 2, side * Math.PI / 2, side * Math.sin(phase * 5) * .3);
                shadow(.4);
                break;
            }
            case 'shield':
                this.shape('sphere', C.mint, x, y + 1 + bob, z, .42, .50, .10, 0, phase, 0);
                this.shape('box', C.pale, x, y + 1 + bob, z + .08, .08, .52, .06, 0, phase, 0);
                shadow(.4);
                break;
            case 'magnet':
                this.shape('ring', C.violet, x, y + 1 + bob, z, .40, .8, .40, Math.PI / 2, phase * 1.7, 0);
                this.orb(x, y + 1 + bob, z, .16, C.pale);
                shadow(.4);
                break;
            case 'key':
                this.shape('ring', C.goldGlow, x, y + 1.27 + bob, z, .22, .7, .22, Math.PI / 2, 0, 0);
                this.shape('box', C.gold, x, y + .91 + bob, z, .08, .54, .09);
                this.shape('box', C.gold, x + .10, y + .72 + bob, z, .25, .09, .09);
                shadow(.4);
                break;
            case 'boulder':
                this.shape('geologyRock', (0, gl_1.color)('#aaa18e', -8), x, y + .84 + pose.y, z, 1, 1, 1, pose.roll, 0, 0);
                this.shape('ring', (0, gl_1.color)('#c59164'), x, y + .10, z, .83, 1, .83);
                shadow(.9);
                break;
            case 'bonus-ledge': {
                const stone = (0, gl_1.color)((0, core_1.environmentZone)(s) === 2 ? '#6b777e' : (0, core_1.environmentZone)(s) === 1 ? '#99917e' : '#7e8971', -8);
                this.shape(item.lane < 0 ? 'terraceMirror' : 'terrace', stone, x, y, z, 1, 1, .70);
                // Small grounded approach stones give a readable jump cue without hiding hazards.
                for (let j = 0; j < 3; j++)
                    this.shape('geologyRock', stone, x + (j - 1) * .48, y - .06, z + 2.2 + j * .2, .24, .13, .23, 0, j * .7, 0);
                break;
            }
            case 'saw':
                this.shape('box', C.wood, x, y + .16, z, 1.3, .3, .9);
                this.shape('cylinder', C.iron, x, y + .53, z, .52, .12, .52, Math.PI / 2, 0, 0);
                for (let i = 0; i < 12; i++) {
                    const a = phase * 8 + i / 12 * TAU;
                    this.shape('cone', i % 3 ? C.iron : C.red, x + Math.cos(a) * .56, y + .53 + Math.sin(a) * .56, z, .10, .26, .065, 0, 0, a - Math.PI / 2);
                }
                shadow(.7);
                break;
            case 'roots':
                this.link([x - .82, y, z], [x - .77, y + 1.2, z], .12, C.wood);
                this.link([x + .82, y, z], [x + .73, y + 1.2, z], .14, C.wood);
                this.link([x - .79, y + 1.22, z], [x + .78, y + 1.19, z], .30, C.wood);
                this.link([x - .83, y + 1.35, z + .10], [x + .84, y + 1.40, z - .12], .13, C.leaf);
                for (let i = 0; i < 4; i++)
                    this.shape('leaf', C.leafLight, x - .7 + i * .43, y + 1.55, z, .4, .4, .65, .2, phase * .025 + i, .3);
                shadow(.8);
                break;
            case 'steam': {
                const pressure = ((s.time + item.phase) % 3.2) / 3.2;
                this.shape('cylinder', C.iron, x, y + .06, z, .58, .15, .58);
                this.shape('ring', pose.active ? C.red : C.gold, x, y + .15, z, .48, 1, .48);
                const count = pose.active ? 7 : 2;
                for (let i = 0; i < count; i++) {
                    const f = ((time * 1.9 + i / count) % 1), radius = .14 + f * .31;
                    this.shape('sphere', (0, gl_1.color)(pose.active ? '#c6ddd3' : '#a2b4ad', .1), x + Math.sin(i * 7 + phase) * f * .11, y + .16 + f * (pose.active ? 1.9 : .30), z, radius, radius * .7, radius);
                }
                this.shape('box', C.copper, x + .57, y + .25, z, .20, .5, .3);
                this.shape('box', pose.active ? C.red : C.gold, x + .57, y + .26 + pressure * .13, z + .16, .10, .22, .04);
                break;
            }
            case 'gap':
                for (const side of [-1, 1])
                    this.shape('box', C.red, x + side * .85, y + .045, z, .08, .04, 3.0);
                this.shape('box', (0, gl_1.color)('#142e36'), x, y - 1.9, z, 1.9, .10, 3.5);
                for (let i = 0; i < 3; i++)
                    this.shape('box', C.wood, x - .6 + i * .6, y - .24 - Math.max(0, 1 - ahead / 9) * .5, z, .35, .16, 1.5, Math.max(0, 1 - ahead / 9) * .5, 0, .10 * i);
                break;
            case 'mud':
                this.shape('sphere', (0, gl_1.color)('#634d38'), x, y + .018, z, .91, .045, 1.28);
                for (let i = 0; i < 4; i++)
                    this.orb(x + Math.sin(i * 4) * .56, y + .04 + Math.max(0, Math.sin(phase * 2 + i)) * .06, z + Math.cos(i) * .7, .07, (0, gl_1.color)('#8a7152'));
                break;
            case 'drone':
                this.shape('sphere', C.copper, x, y + 1.04 + pose.y * .25, z, .42, .22, .29);
                this.orb(x, y + .99 + pose.y * .25, z + .26, .105, C.red);
                for (const side of [-1, 1]) {
                    this.link([x, y + 1.05, z], [x + side * .6, y + 1.13, z], .045, C.iron);
                    this.shape('box', C.iron, x + side * .6, y + 1.2, z, .82, .035, .10, 0, phase * 35, 0);
                }
                shadow(.65);
                break;
            case 'crate':
                if (this.renderer.worldReady) {
                    // Separate slats, inset faces and corner hardware retain depth in motion.
                    for (let j = 0; j < 4; j++) {
                        this.shape('box', C.woodLight, x, y + .14 + j * .23, z, 1, .20, .98);
                        for (const side of [-1, 1])
                            this.shape('box', C.wood, x + side * .51, y + .14 + j * .23, z, .08, .20, 1.0);
                    }
                    for (const side of [-1, 1])
                        for (const end of [-1, 1]) {
                            this.shape('box', C.copper, x + side * .43, y + .47, z + end * .51, .13, .95, .08);
                            for (const h of [.10, .82])
                                this.orb(x + side * .43, y + h, z + end * .56, .033, C.iron);
                        }
                    this.shape('box', C.wood, x, y + .47, z + .55, 1.2, .12, .09, 0, 0, .7);
                    shadow(.7);
                    break;
                }
                this.shape('box', C.woodLight, x, y + .47, z, 1, .95, 1, 0, Math.sin(phase) * .02, 0);
                for (const side of [-1, 1])
                    this.shape('box', C.wood, x + side * .35, y + .47, z + .51, .10, .94, .05);
                this.shape('box', C.copper, x, y + .47, z + .53, 1, .09, .06, 0, 0, .65);
                shadow(.7);
                break;
            case 'burrow': {
                const archX = (0, core_1.branchOffset)(item.d + 7, item.d, item.d + 90, item.lane) + curve(item.d + 7) - curve(s.distance);
                this.arch(archX, y, z - 7, 1.12, C.wood, .23);
                this.shape('rock', C.wood, archX, y + .85, z - 7.04, 1.3, .45, .45);
                this.shape('rock', C.stone, x - item.lane * .82, y + .48, z + .10, .27, .40, .16);
                for (let i = 0; i < 5; i++)
                    this.shape('box', C.cream, x - item.lane * .82 + (i - 2) * .055, y + .55, z + .27, .024, .19, .017, 0, 0, -.18);
                this.orb(x + item.lane * .95, y + .65 + Math.sin(phase) * .02, z + .12, .095, C.goldGlow);
                break;
            }
            case 'workshop':
                this.arch(x, y + .70, z, 1.0, C.copper, .24);
                this.shape('box', C.woodLight, x, y + .49, z, .9, .65, .9);
                this.gear(x, y + 2.0, z, .30, phase * .5);
                this.shape('box', C.mint, x, y + .82, z + .45, .5, .03, .03);
                shadow(.9);
                break;
            case 'vault':
                this.shape('box', C.wood, x, y + .55, z, 1.38, .9, .98);
                this.shape('cylinder', C.copper, x, y + .97, z, .66, 1.39, .5, 0, 0, Math.PI / 2);
                for (const side of [-1, 1])
                    this.shape('box', C.gold, x + side * .46, y + .65, z + .52, .10, 1.1, .06);
                this.shape('box', C.goldGlow, x, y + .72, z + .54, .21, .27, .075);
                shadow(.9);
                break;
        }
    }
    chamberRoom(s, time) {
        const chamber = core_1.CHAMBERS.find(c => c.id === s.chamber);
        if (!chamber)
            return;
        const x = s.x + (0, core_1.routeOffset)(s), floor = floorY(s.distance, s.route), tech = chamber.hero === 'bot', nest = chamber.hero === 'gorilla';
        const wall = (0, gl_1.color)(nest ? '#5A6352' : tech ? '#626666' : '#5A596C', -8), wood = (0, gl_1.color)('#695139', -7), accent = (0, gl_1.color)(chamber.accent, .7);
        for (let row = 0; row < 6; row++)
            for (let col = -2; col <= 2; col++) {
                this.shape('box', wall, x + col * 1.6, floor - .18, -row * 1.8, 1.57, .35, 1.76, 0, 0, 0);
                if ((row + col) % 3 === 0)
                    this.shape('rock', nest ? C.leaf : C.stoneDark, x + col * 1.6 + .4, floor + .01, -row * 1.8, .33, .025, .52);
            }
        for (const side of [-1, 1])
            for (let row = 0; row < 5; row++) {
                for (let layer = 0; layer < 3; layer++)
                    this.shape('box', wall, x + side * 3.8, floor + .5 + layer * .98, -1 - row * 2.0, 1.0, .96, 1.94, 0, 0, side * .025);
                this.shape('cylinder', tech ? C.copper : wall, x + side * 3.4, floor + 1.65, -1 - row * 2.0, .23, 3.3, .23);
                if (row % 2 === 0) {
                    this.orb(x + side * 3.0, floor + 2.1, -1 - row * 2, .12, accent);
                    this.shape('halo', (0, gl_1.color)(chamber.accent, -6), x + side * 3.0, floor + 2.1, -.96 - row * 2, .60, .60, .60);
                }
            }
        this.arch(x, floor + 1.8, -8.9, 3.25, wall, .48);
        for (let layer = 0; layer < 4; layer++)
            this.shape('box', wall, x, floor + .5 + layer * .98, -10.3, 8.2, .96, 1.0);
        this.shape('cylinder', C.stoneDark, x, floor + .24, -5.8, 1.55, .45, 1.55);
        this.shape('ring', accent, x, floor + .49, -5.8, 1.45, 1, 1.45);
        if (nest) {
            for (let i = 0; i < 8; i++) {
                const a = i / 8 * TAU;
                this.link([x + Math.cos(a) * 1.15, floor + .45, -5.8 + Math.sin(a) * 1.15], [x + Math.cos(a + .45) * .4, floor + .66, -5.8 + Math.sin(a + .45) * .4], .15, wood);
            }
            this.shape('rock', wall, x, floor + 1.3, -5.8, .66, .91, .60);
            for (const side of [-1, 1]) {
                this.shape('rock', C.cream, x + side * .25, floor + 1.4, -5.15, .16, .28, .10);
                this.plant(x + side * 2.7, floor + .1, -7, side, time);
            }
            for (const side of [-1, 1])
                this.link([x + side * 3.6, floor + 3.5, -7], [x + side * .5, floor + 3.0, -8], .27, wood);
        }
        else if (tech) {
            for (const side of [-1, 1]) {
                this.gear(x + side * 2.9, floor + 2.6, -8.1, 1.15, time * .25 * side);
                this.link([x + side * 2.6, floor + .3, -7], [x + side * 2.6, floor + 3.2, -7], .18, C.copper);
            }
            this.shape('cylinder', C.iron, x, floor + 1.1, -5.8, .66, 1.2, .66);
            this.shape('cylinder', accent, x, floor + 1.25, -5.8, .43, .93, .43);
            for (let i = 0; i < 4; i++)
                this.shape('ring', C.copper, x, floor + .67 + i * .35, -5.8, .73, 1, .73);
        }
        else {
            this.shape('cylinder', (0, gl_1.color)('#243A50', -2), x, floor + .48, -5.8, 1.23, .035, 1.23);
            for (let i = 0; i < 7; i++) {
                const a = i / 7 * TAU;
                this.crystal(x + Math.cos(a) * 2.3, floor + .1, -5.8 + Math.sin(a) * 2, .7 + i % 2 * .3, i);
            }
            this.shape('cone', accent, x, floor + 1.5, -5.8, .42, 1.2, .42, 0, time * .2, 0);
            this.shape('ring', C.pale, x, floor + 2.1, -5.8, .60, 1, .60);
        }
    }
    draw(s, visualTime, calm = false) {
        if (this.disposed)
            return;
        const dt = Math.min(.08, Math.max(0, visualTime - this.lastTime));
        this.lastTime = visualTime;
        this.clock = visualTime;
        this.renderer.reset();
        if (s.mode === 'chamber')
            this.chamberRoom(s, visualTime);
        else {
            this.scenery(s, visualTime, calm);
            for (const item of this.course)
                this.item(item, s, visualTime);
        }
        this.madger(s, visualTime, calm);
        (0, companion_models_1.drawTeam)(this.renderer, s, visualTime, calm, curve, (d) => floorY(d, s.route));
        this.particles = this.particles.filter(p => visualTime - p.born < p.life);
        if (!calm)
            for (const p of this.particles) {
                const age = visualTime - p.born, fade = 1 - age / p.life;
                this.orb(p.x + p.vx * age, p.y + p.vy * age - 4.3 * age * age, s.distance - p.d + p.vz * age, Math.max(.008, p.size * fade), p.c);
            }
        const lobby = s.mode === 'ready', centre = (0, core_1.routeOffset)(s), targetX = centre + s.x * .72;
        if (!this.initializedCamera) {
            this.cameraX = targetX;
            this.cameraY = floorY(s.distance, s.route) + s.y * .18;
            this.initializedCamera = true;
        }
        this.cameraX += (targetX - this.cameraX) * (1 - Math.exp(-dt * 4));
        this.cameraY += (floorY(s.distance, s.route) + s.y * .18 - this.cameraY) * (1 - Math.exp(-dt * 3));
        const shake = !calm && this.clock - this.reaction.at < .26 && this.reaction.kind === 'hurt' ? Math.sin(this.clock * 73) * .055 * (1 - (this.clock - this.reaction.at) / .26) : 0;
        const chamber = s.mode === 'chamber', cx = s.x + (0, core_1.routeOffset)(s);
        const eye = chamber ? [cx + 1.9, 3.8, 8] : lobby ? [3.8, 3.3, 8.6] : [this.cameraX + shake, 4.4 + this.cameraY, 9.6];
        const target = chamber ? [cx, 1.3, -5] : lobby ? [0, 1.35, -.6] : [this.cameraX + curve(s.distance + 22) - curve(s.distance), .9 + floorY(s.distance + 14, s.route), -14];
        // Inside a single existing sphere instancing batch: a low-cost moving
        // atmospheric dome, not a static clear-color sky or an independent shader.
        // Hidden underground and in secret chambers. Entirely visual: no physics,
        // route state, checkpoint, rewards or hero transform changes.
        const cavernRoutes = ['deep', 'mudslide', 'crystal-vein', 'ancient-vault', 'hollow', 'grotto'];
        if (s.board === 'overgrown' && !chamber && !cavernRoutes.includes(s.route)) {
            const ruinRoutes = ['ridge', 'causeway', 'watchtower', 'gearworks'];
            const skyTint = ruinRoutes.includes(s.route) ? '#bdc4b2' : '#b4cfc8';
            this.shape('sphere', (0, gl_1.color)(skyTint, -9), eye[0], eye[1], eye[2], 138, 138, 138);
        }
        const lightZone = (0, core_1.environmentZone)(s);
        this.renderer.render(eye, target, visualTime, lightZone, s.distance);
    }
    dispose() { this.disposed = true; this.particles = []; this.renderer.dispose(); }
}
exports.ExpeditionScene = ExpeditionScene;
};
factories["legacy-geometry"]=function(require,module,exports){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpeditionRenderer = exports.NativeSceneTarget = void 0;
exports.nativeSceneSize = nativeSceneSize;
exports.adaptNativeSceneryBudget = adaptNativeSceneryBudget;
exports.color = color;
exports.geometry = geometry;
exports.tailGeometry = tailGeometry;
const math_1 = require("./math");
/** Bound native fragment work independently of the phone's high-density UI.
 * A 1440p screen otherwise shades millions of pixels for every overlapping
 * tree/particle, even after distant geometry has been culled. */
function nativeSceneSize(width, height, budget) {
    // Full-resolution world shading is earned only after sustained fast native
    // frame drains. The default/mid budget still uses the previous 800k cap;
    // a slow drain immediately reduces both scene detail and pixel workload.
    // This is a visual quality candidate, NOT a measured phone FPS guarantee.
    const maxPixels = [800000, 800000, 1400000][budget];
    const scale = Math.min([.55, .75, 1][budget], Math.sqrt(maxPixels / Math.max(1, width * height)));
    return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
/** Offscreen scene only; React Native text and controls stay at device resolution.
 * Expo maps bindFramebuffer(null) to its presentation buffer. Its native
 * getParameter does not implement FRAMEBUFFER_BINDING, unlike browser WebGL. */
class NativeSceneTarget {
    gl;
    framebuffer;
    texture;
    depth;
    program;
    quad;
    sampler;
    width = 0;
    height = 0;
    output = null;
    constructor(gl) {
        this.gl = gl;
        const framebuffer = gl.createFramebuffer(), texture = gl.createTexture(), depth = gl.createRenderbuffer(), quad = gl.createBuffer();
        if (!framebuffer || !texture || !depth || !quad)
            throw Error('Native scene target allocation failed');
        this.framebuffer = framebuffer;
        this.texture = texture;
        this.depth = depth;
        this.quad = quad;
        const shaders = [
            [gl.VERTEX_SHADER, 'attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}'],
            [gl.FRAGMENT_SHADER, 'precision mediump float;uniform sampler2D uScene;varying vec2 vUV;void main(){gl_FragColor=texture2D(uScene,vUV);}'],
        ];
        const program = gl.createProgram();
        if (!program)
            throw Error('Native scene composite allocation failed');
        this.program = program;
        for (const [type, source] of shaders) {
            const shader = gl.createShader(type);
            if (!shader)
                throw Error('Native composite shader allocation failed');
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
                throw Error('Native composite shader: ' + gl.getShaderInfoLog(shader));
            gl.attachShader(program, shader);
            gl.deleteShader(shader);
        }
        gl.bindAttribLocation(program, 0, 'aPosition');
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            throw Error('Native composite: ' + gl.getProgramInfoLog(program));
        const sampler = gl.getUniformLocation(program, 'uScene');
        if (sampler === null)
            throw Error('Native composite sampler unavailable');
        this.sampler = sampler;
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    begin(width, height, budget) {
        const gl = this.gl, size = nativeSceneSize(width, height, budget);
        this.output = typeof gl.flushEXP === 'function' ? null : gl.getParameter(gl.FRAMEBUFFER_BINDING);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        if (size.width !== this.width || size.height !== this.height) {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.width, size.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size.width, size.height);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.output);
                throw Error('Native scene framebuffer is incomplete');
            }
            this.width = size.width;
            this.height = size.height;
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }
        gl.viewport(0, 0, this.width, this.height);
        return size;
    }
    present(width, height) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.output);
        gl.viewport(0, 0, width, height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.depthMask(false);
        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.sampler, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        for (let i = 1; i <= 7; i++)
            gl.disableVertexAttribArray(i);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }
    dispose() { const gl = this.gl; gl.deleteFramebuffer(this.framebuffer); gl.deleteRenderbuffer(this.depth); gl.deleteTexture(this.texture); gl.deleteBuffer(this.quad); gl.deleteProgram(this.program); }
}
exports.NativeSceneTarget = NativeSceneTarget;
/** Only noninteractive distant dressing scales down: controls, lanes, traps,
 * branch gates, rewards and persisted state are never changed by this budget.
 * The native command queue can drain slowly on software and older mobile GPUs. */
function adaptNativeSceneryBudget(state, drainMs) {
    if (!Number.isFinite(drainMs) || drainMs < 0)
        return state;
    if (drainMs >= 90)
        return { level: Math.max(0, state.level - 1), fastFrames: 0, slowFrames: 0 };
    if (drainMs >= 45) {
        const slowFrames = state.slowFrames + 1;
        return slowFrames >= 2 ? { level: Math.max(0, state.level - 1), fastFrames: 0, slowFrames: 0 }
            : { ...state, fastFrames: 0, slowFrames };
    }
    if (drainMs <= 20) {
        const fastFrames = state.fastFrames + 1;
        return fastFrames >= 150 ? { level: Math.min(2, state.level + 1), fastFrames: 0, slowFrames: 0 }
            : { ...state, fastFrames, slowFrames: 0 };
    }
    return { ...state, fastFrames: 0, slowFrames: 0 };
}
const VERTEX = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal; attribute vec2 aUV;
uniform float uTime;uniform float uWind;
varying vec2 vUV;
attribute vec4 aM0; attribute vec4 aM1; attribute vec4 aM2; attribute vec4 aM3;
attribute vec4 aColor;
uniform mat4 uVP;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec4 vColor;
void main(){
 mat4 model=mat4(aM0,aM1,aM2,aM3);
 vec3 local=aPosition;
 local.x+=sin(uTime*.72+aM3.x*.37+aM3.z*.13+local.y*3.0)*.009*local.y*uWind;
 vec4 p=model*vec4(local,1.0);vWorld=p.xyz;vLocal=aPosition;vUV=aUV;
 vNormal=normalize(aM0.xyz*aNormal.x/max(dot(aM0.xyz,aM0.xyz),0.00001)+aM1.xyz*aNormal.y/max(dot(aM1.xyz,aM1.xyz),0.00001)+aM2.xyz*aNormal.z/max(dot(aM2.xyz,aM2.xyz),0.00001));
 vColor=aColor;gl_Position=uVP*p;
}`;
// World-space grain uses long course coordinates, which can overflow mediump on mobile GPUs.
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uPortrait;uniform sampler2D uAtlas;uniform sampler2D uGround;uniform sampler2D uBark;uniform sampler2D uStone;
uniform float uAtlasReady;uniform float uSurface;uniform float uTile;
varying vec2 vUV;
uniform vec3 uEye;uniform vec3 uSun;uniform vec3 uFog;uniform vec2 uFogRange;uniform float uTime;uniform float uTravel;uniform float uDetail;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;varying vec4 vColor;
#ifdef GL_FRAGMENT_PRECISION_HIGH
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
#else
float hash(vec2 p){p=mod(p,vec2(32.0));return fract(sin(dot(p,vec2(17.13,41.7)))*437.58545);}
#endif
vec4 surfaceTex(float tile,vec2 uv){
 vec2 origin=vec2(mod(tile,4.0),floor(tile/4.0))*.25;
 // PNG upload is unflipped: both glTF and the atlas use top-left image UVs.
 return texture2D(uAtlas,origin+vec2(.002)+fract(uv)*.246);
}
vec3 surfaceColor(vec3 base,vec3 n){
 if(uAtlasReady<.5)return base;
 if(uSurface>.5){vec4 tex=surfaceTex(uTile,vUV);if(tex.a<.40)discard;return tex.rgb*tex.rgb*base;}
 float tile=-1.0,scale=.30;
 if(vColor.a < -.5 && vColor.a > -1.5)tile=0.0;
 if(vColor.a < -6.5 && vColor.a > -7.5){tile=1.0;scale=.45;}
 if(vColor.a < -7.5 && vColor.a > -8.5){tile=2.0;scale=.32;}
 if(tile<0.0)return base;
 // World anchoring prevents the earth texture swimming as the course moves.
 vec3 p=vec3(vWorld.x,vWorld.y,uTravel-vWorld.z)*scale;
 vec3 a=abs(n);vec2 uv=a.y>a.x&&a.y>a.z?p.xz:(a.x>a.z?p.zy:p.xy);
 vec3 tex=tile<.5?texture2D(uGround,uv).rgb:tile<1.5?texture2D(uBark,uv).rgb:texture2D(uStone,uv).rgb;
 if(tile>1.5){float grey=dot(tex,vec3(.299,.587,.114));tex=mix(tex,vec3(grey)*vec3(.87,.94,1.03),.78);}
 return tex*tex*mix(vec3(1.12),base*2.0,.20);
}
void main(){
 if(vColor.a < -9.5 && vColor.a > -10.5){
  vec2 uv=vec2(vLocal.x/1.18+.5,vLocal.y/1.07+.5);
  float radius=length((uv-vec2(.5))/vec2(.52,.53));
  float mask=1.0-smoothstep(.83,1.02,radius);if(mask<.02)discard;
  vec3 portrait=texture2D(uPortrait,vec2(.285,.595)+uv*vec2(.43,.30)).rgb;
  float light=.84+.16*max(0.0,dot(normalize(vNormal),normalize(vec3(-.4,.8,-.8))));
  gl_FragColor=vec4(portrait*light,mask);return;
 }
 if(vColor.a < -10.5 && vColor.a > -11.5 && vLocal.z < .08)discard;
 // Outdoor sky is an eye-centred instanced sphere in the existing sphere
 // batch. World-space angular bands add animated clouds and a real horizon
 // without a postprocess pass, extra GL program, or additional draw call.
 if(vColor.a < -8.5 && vColor.a > -9.5){
  vec3 direction=normalize(vLocal);
  float height=smoothstep(-.16,.70,direction.y);
  vec3 horizon=vColor.rgb;
  vec3 zenith=vec3(.095,.19,.29);
  vec3 atmosphere=mix(horizon,zenith,height);
  if(uDetail<.5){gl_FragColor=vec4(sqrt(max(atmosphere,vec3(0.0))),1.0);return;}
  float azimuth=atan(direction.x,direction.z);
  float drift=uTime*.023;
  float cloudWave=sin(azimuth*9.0+sin(azimuth*5.0+direction.y*17.0)+drift)
   *sin(direction.y*47.0+sin(azimuth*13.0)*.6+drift*.6);
  float cloudBand=smoothstep(.08,.26,direction.y)
   *(1.0-smoothstep(.43,.75,direction.y));
  float cirrus=smoothstep(.37,.76,cloudWave)*cloudBand*.12;
  atmosphere=mix(atmosphere,vec3(.84,.88,.85),cirrus);
  gl_FragColor=vec4(pow(max(atmosphere,vec3(0.0)),vec3(.4545)),1.0);
  return;
 }
 if(vColor.a < -5.5 && vColor.a > -6.5){float a=max(0.0,1.0-dot(vLocal.xy,vLocal.xy));gl_FragColor=vec4(vColor.rgb*1.8,a*a*.38);return;}
 if(vColor.a < -2.5 && vColor.a > -3.5){float a=max(0.0,1.0-dot(vLocal.xz,vLocal.xz));gl_FragColor=vec4(0.015,0.016,0.018,a*a*.32);return;}
 // The native fallback keeps the same meshes, markings, portrait, shadows and
 // gameplay effects. Skip subpixel procedural grain and expensive specular/
 // lamp calculations only when measured GPU drain has exhausted the budget.
 // Those details are especially costly on software and older phone GPUs.
 if(uDetail<.5){
  vec3 n=normalize(vNormal),base=surfaceColor(vColor.rgb,n);
  if(vColor.a < -.5 && vColor.a > -1.5){
   float edge=max(smoothstep(.455,.499,abs(vLocal.x)),smoothstep(.468,.499,abs(vLocal.z)));
   base*=1.0-edge*.24*(1.0-uAtlasReady);
  }
  if(vColor.a < -4.5 && vColor.a > -5.5){
   float chevron=sin(vLocal.z*18.0+abs(vLocal.x)*7.5);
   float t=clamp(vLocal.z/1.26,0.0,1.0),centre=.14*sin(t*3.14159265)+.26*t*t;
   base=mix(base,vec3(.86,.68,.38),smoothstep(.17,.35,chevron)*.91*smoothstep(-.03,.10,vLocal.y-centre));
  }
  float sun=max(0.0,dot(n,vec3(-.423,.800,.423)));
  vec3 lit=base*(vec3(.32,.38,.37)+uSun*sun+vec3(.16,.23,.22)*max(0.0,n.y)+max(0.0,vColor.a)*1.15);
  lit=mix(lit,uFog,smoothstep(uFogRange.x,uFogRange.y,length(uEye-vWorld)));
  gl_FragColor=vec4(sqrt(max(lit/(lit+vec3(.65)),vec3(0.0))),1.0);return;
 }
 vec3 n=normalize(vNormal),view=normalize(uEye-vWorld);
 vec3 base=surfaceColor(vColor.rgb,n);float em=max(0.0,vColor.a);
 if(vColor.a < -.5 && vColor.a > -1.5){vec2 surface=vec2(vWorld.x,uTravel-vWorld.z);
 float grain=hash(floor(mod(surface,vec2(32.0))*24.0));
 float mottling=sin(surface.x*2.13+sin(surface.y*.75))*sin(surface.y*1.84);
 float edge=max(smoothstep(.455,.499,abs(vLocal.x)),smoothstep(.468,.499,abs(vLocal.z)));
 base*=.89+grain*.14+mottling*.05;base*=1.0-edge*.24*(1.0-uAtlasReady);}
 if(vColor.a < -1.5 && vColor.a > -2.5){
   float wave=sin(vWorld.x*3.0+uTime*1.4)*sin((uTravel-vWorld.z)*1.7-uTime*.8);
   n=normalize(n+vec3(wave*.10,0.0,sin((uTravel-vWorld.z)*4.0+uTime)*.07));
   base=mix(base,vec3(.13,.32,.31),.12+.1*wave);
 }
 if(vColor.a < -3.5 && vColor.a > -5.5){
 float fibre=hash(floor(vLocal.xy*260.0+vLocal.z*73.0));
 base*=.87+fibre*.25;
 if(vColor.a < -4.5){float chevron=sin(vLocal.z*18.0+abs(vLocal.x)*7.5);
 float t=clamp(vLocal.z/1.26,0.0,1.0);float centre=.14*sin(t*3.14159265)+.26*t*t;
 float dorsal=smoothstep(-.03,.10,vLocal.y-centre);
 base=mix(base,vec3(.86,.68,.38),smoothstep(.17,.35,chevron)*.91*dorsal);}
 n=normalize(n+vec3(sin(vLocal.y*175.0+vLocal.x*92.0)*.025,0.0,sin(vLocal.x*130.0)*.026));
 }
 // Authored Overgrown Burrow materials: wood grain follows trunk height, and
 // irregular rock patches are calculated at world scale to avoid tiled cubes.
 if(vColor.a < -6.5 && vColor.a > -7.5){
  float grain=sin(vWorld.y*5.2+sin(vWorld.x*4.7+vWorld.z*3.6)*1.4);
  float grooves=pow(abs(sin(vWorld.y*17.0+vWorld.z*8.0)),10.0);
  float knots=hash(floor(vWorld.xz*7.0+vWorld.y));
  base*=.73+.12*grain+.18*knots-.14*grooves;
  n=normalize(n+vec3(.13*grain,.015,.065*sin(vWorld.y*20.0)));
 }
 if(vColor.a < -7.5 && vColor.a > -8.5){
  vec3 cells=floor(vWorld*5.0);
  float lichen=hash(cells.xz+vec2(cells.y*3.0,cells.y*5.0));
  float mottling=sin(vWorld.x*2.4+vWorld.z*4.1)*sin(vWorld.y*3.3);
  float seams=pow(abs(sin(vWorld.x*7.0+vWorld.z*8.2)),26.0);
  base=mix(base,base*vec3(.65,.92,.73),smoothstep(.53,.85,lichen)*.42);
  base*=.76+.17*mottling+.20*lichen-.10*seams;
  n=normalize(n+vec3(.048*mottling,.036*sin(vWorld.x*11.0),.048*sin(vWorld.z*9.0)));
 }
 float sun=max(0.0,dot(n,normalize(vec3(-.45,.85,.45))));
 float rim=pow(1.0-max(0.0,dot(n,view)),3.0);
 float spec=pow(max(0.0,dot(n,normalize(view+normalize(vec3(-.45,.85,.45))))),36.0);
 vec3 light=vec3(.30,.36,.36)+uSun*sun+vec3(.16,.23,.22)*max(0.0,n.y);
 vec3 lamp=vec3(sign(vWorld.x)*4.0-vWorld.x,2.45-vWorld.y,mod(uTravel-vWorld.z+10.0,20.0)-10.0);
 float falloff=1.0/(1.0+dot(lamp,lamp)*.24);
 light+=vec3(.75,.36,.09)*falloff*(.4+.6*max(0.0,dot(n,normalize(lamp))))*(.98+.02*sin(uTime*6.0));
 vec3 lit=base*light+base*em*1.15+vec3(.22,.30,.28)*rim*.24+vec3(1.0,.86,.58)*spec*(vColor.a < -3.5 ? .012 : .10);
 float fog=smoothstep(uFogRange.x,uFogRange.y,length(uEye-vWorld));lit=mix(lit,uFog,fog);
 lit=lit/(lit+vec3(.65));gl_FragColor=vec4(pow(max(lit,vec3(0.0)),vec3(.4545)),1.0);
}`;
function triangle(vertices, a, b, c, normal) {
    let n = normal;
    if (!n) {
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const t = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...t) || 1;
        n = [t[0] / l, t[1] / l, t[2] / l];
    }
    for (const p of [a, b, c])
        vertices.push(...p, ...n);
}
// Derived from the reviewed V3 original MADGER terrace, LOD2. Shared by native
// and browser; uses existing stone textures, so no duplicate atlas is resident.
const GEOLOGY = { "terrace": { "vertices": [-0.55866, 0.8993, -1.15, -0.95102, 0.21915, 0.21803, -0.41899, 0.89593, -1.15, 0.0448, 0.80953, 0.58537, -0.27933, 0.88938, -1.15, 0.00772, 0.82976, 0.55806, -0.13966, 0.89017, -1.15, -0.04577, 0.83393, 0.54997, 0.0, 0.90655, -1.15, -0.03445, 0.84197, 0.53842, 0.34916, 0.92233, -1.15, -0.00891, 0.84075, 0.54134, 0.69832, 0.91272, -1.15, 0.02424, 0.81661, 0.57668, 1.04749, 0.88298, -1.15, 0.03317, 0.7644, 0.64389, 1.39665, 0.8699, -1.15, 0.9116, 0.24944, 0.32675, -0.58566, 0.92058, -1.882, -0.96975, 0.23619, 0.06169, -0.43925, 0.90249, -1.882, 0.06261, 0.9978, 0.02155, -0.29283, 0.88885, -1.882, 0.05979, 0.99798, 0.02157, -0.14642, 0.89066, -1.882, 0.00899, 0.99995, 0.00348, 0.0, 0.89685, -1.882, -0.02263, 0.9996, -0.01723, 0.36604, 0.89967, -1.882, -0.02234, 0.9995, -0.02231, 0.73208, 0.90478, -1.882, -0.01192, 0.99985, -0.01245, 1.09812, 0.91254, -1.882, 0.01068, 0.99989, 0.01076, 1.46416, 0.90918, -1.882, 0.85706, 0.49263, 0.15084, -0.64135, 0.88217, -2.614, -0.9762, 0.21608, 0.01828, -0.48101, 0.91765, -2.614, -0.08752, 0.99558, -0.03398, -0.32068, 0.92889, -2.614, -1e-05, 1.0, -0.00173, -0.16034, 0.90605, -2.614, 0.07751, 0.99653, 0.03025, 0.0, 0.88129, -2.614, 0.03743, 0.99889, 0.02853, 0.40085, 0.88232, -2.614, -0.00291, 0.99999, -0.00288, 0.80169, 0.90017, -2.614, -0.02381, 0.99939, -0.02553, 1.20254, 0.91044, -2.614, -0.02021, 0.99956, -0.02181, 1.60338, 0.90772, -2.614, 0.8767, 0.47816, 0.0525, -0.64225, 0.89808, -3.346, -0.97682, 0.2102, -0.04053, -0.48169, 0.86904, -3.346, 0.02579, 0.99959, 0.01206, -0.32112, 0.87704, -3.346, -0.0782, 0.9964, -0.03274, -0.16056, 0.91389, -3.346, -0.0947, 0.99474, -0.03905, 0.0, 0.93352, -3.346, -0.00223, 1.0, -0.00185, 0.40141, 0.91219, -3.346, 0.03529, 0.99876, 0.03522, 0.80281, 0.8785, -3.346, 0.03119, 0.99909, 0.02899, 1.20422, 0.87365, -3.346, -0.00561, 0.99996, -0.00708, 1.60562, 0.89873, -3.346, 0.86879, 0.48025, -0.12067, -0.58701, 0.91257, -4.078, -0.97554, 0.21364, -0.0518, -0.44026, 0.92004, -4.078, 0.05214, 0.99836, 0.02354, -0.2935, 0.90213, -4.078, 0.08673, 0.99559, 0.03577, -0.14675, 0.8757, -4.078, 0.02682, 0.9996, 0.00951, 0.0, 0.87598, -4.078, -0.0429, 0.9987, -0.02763, 0.36688, 0.90783, -4.078, -0.03983, 0.99854, -0.03644, 0.73376, 0.93296, -4.078, -0.00412, 0.99999, -0.00307, 1.10064, 0.91807, -4.078, 0.03797, 0.99876, 0.0323, 1.46752, 0.88068, -4.078, 0.86672, 0.48951, -0.09576, -0.55844, 0.90085, -4.81, -0.97438, 0.22404, 0.01962, -0.41883, 0.90343, -4.81, -0.04705, 0.99875, -0.01681, -0.27922, 0.90701, -4.81, -0.00189, 1.0, 2e-05, -0.13961, 0.9104, -4.81, 0.05117, 0.9985, 0.01932, 0.0, 0.90207, -4.81, 0.03871, 0.99898, 0.02334, 0.34902, 0.88421, -4.81, 0.00691, 0.99995, 0.00683, 0.69805, 0.88005, -4.81, -0.02611, 0.99938, -0.02369, 1.04707, 0.90238, -4.81, -0.03595, 0.99876, -0.03435, 1.39609, 0.92747, -4.81, 0.86397, 0.50086, 0.05198, -0.59936, 0.87602, -5.542, -0.97448, 0.21454, 0.06607, -0.44952, 0.88718, -5.542, -0.04211, 0.99901, -0.01407, -0.29968, 0.90766, -5.542, -0.07139, 0.99711, -0.02594, -0.14984, 0.91324, -5.542, -0.03287, 0.99938, -0.0128, 0.0, 0.90575, -5.542, 0.01379, 0.99984, 0.01143, 0.3746, 0.89979, -5.542, 0.02169, 0.99952, 0.02213, 0.7492, 0.89719, -5.542, 0.01709, 0.99969, 0.01802, 1.12381, 0.89156, -5.542, -0.0011, 1.0, -0.00106, 1.49841, 0.88856, -5.542, 0.8776, 0.46161, 0.12936, -0.64844, 0.93049, -6.274, -0.97685, 0.21366, 0.01045, -0.48633, 0.89872, -6.274, 0.0997, 0.99426, 0.03881, -0.32422, 0.87084, -6.274, 0.04689, 0.9987, 0.02009, -0.16211, 0.87967, -6.274, -0.05179, 0.99846, -0.01997, 0.0, 0.90974, -6.274, -0.04831, 0.99817, -0.03625, 0.40527, 0.92299, -6.274, -0.01125, 0.99987, -0.01159, 0.81055, 0.90909, -6.274, 0.01821, 0.99964, 0.01948, 1.21582, 0.89119, -6.274, 0.02542, 0.99931, 0.02691, 1.6211, 0.88859, -6.274, 0.88389, 0.46704, 0.02464, -0.6321, 0.88606, -7.006, -0.97354, 0.21942, -0.06391, -0.47408, 0.91966, -7.006, -0.06914, 0.99714, -0.03049, -0.31605, 0.9319, -7.006, 0.03484, 0.99928, 0.01495, -0.15803, 0.90462, -7.006, 0.1036, 0.9937, 0.04278, 0.0, 0.87086, -7.006, 0.0319, 0.99925, 0.02215, 0.39506, 0.87299, -7.006, -0.02222, 0.9995, -0.02253, 0.79013, 0.90715, -7.006, -0.04003, 0.99851, -0.03712, 1.18519, 0.92979, -7.006, -0.01313, 0.99986, -0.01007, 1.58025, 0.91559, -7.006, 0.85478, 0.50658, -0.11283, -0.57484, 0.89552, -7.738, -0.97262, 0.23013, -0.03248, -0.43113, 0.88218, -7.738, -0.01841, 0.99979, -0.00917, -0.28742, 0.88731, -7.738, -0.0801, 0.99624, -0.03294, -0.14371, 0.91256, -7.738, -0.06378, 0.99767, -0.02421, 0.0, 0.92803, -7.738, 0.01763, 0.99978, 0.01122, 0.35927, 0.90927, -7.738, 0.04118, 0.99844, 0.03784, 0.71855, 0.87556, -7.738, 0.02487, 0.99945, 0.022, 1.07782, 0.86986, -7.738, -0.02177, 0.9996, -0.01814, 1.4371, 0.90167, -7.738, 0.84515, 0.52515, -0.09971, -0.56249, 0.90159, -8.47, -0.97763, 0.20513, 0.04638, -0.42187, 0.89568, -8.47, 0.05647, 0.99821, 0.01992, -0.28124, 0.89459, -8.47, 0.02113, 0.99975, 0.00715, -0.14062, 0.8918, -8.47, -0.03108, 0.99945, -0.01176, 0.0, 0.89348, -8.47, -0.03703, 0.99905, -0.02305, 0.35156, 0.9071, -8.47, -0.0177, 0.9997, -0.01704, 0.70311, 0.91985, -8.47, 0.01174, 0.99988, 0.01033, 1.05467, 0.91016, -8.47, 0.03508, 0.99881, 0.03389, 1.40622, 0.88285, -8.47, 0.88767, 0.44834, 0.10502, -0.61356, 0.91966, -9.202, -0.97794, 0.20292, 0.0496, -0.46017, 0.9223, -9.202, 0.00745, 0.99997, 0.00141, -0.30678, 0.90101, -9.202, 0.07006, 0.99722, 0.02544, -0.15339, 0.88547, -9.202, 0.05634, 0.99817, 0.02206, 0.0, 0.88916, -9.202, -0.00167, 1.0, -0.0022, 0.38348, 0.89913, -9.202, -0.01927, 0.99962, -0.01993, 0.76696, 0.90321, -9.202, -0.02039, 0.99955, -0.02183, 1.15043, 0.90554, -9.202, -0.0066, 0.99995, -0.00711, 1.53391, 0.90976, -9.202, 0.88815, 0.43957, 0.13403, -0.6515, 0.86623, -9.934, -0.97282, 0.23145, -0.00758, -0.48863, 0.88334, -9.934, -0.08569, 0.99576, -0.03348, -0.32575, 0.91972, -9.934, -0.08443, 0.99581, -0.03507, -0.16288, 0.93003, -9.934, 0.0091, 0.99995, 0.00287, 0.0, 0.90476, -9.934, 0.04816, 0.99821, 0.03543, 0.40719, 0.87845, -9.934, 0.02527, 0.99935, 0.0256, 0.81438, 0.88094, -9.934, -0.00706, 0.99994, -0.00799, 1.22157, 0.90213, -9.934, -0.02686, 0.99925, -0.02787, 1.62875, 0.91384, -9.934, 0.85578, 0.51635, -0.03193, -0.61943, 0.92356, -10.666, -0.9683, 0.24325, -0.0568, -0.46458, 0.89648, -10.666, 0.09243, 0.99489, 0.04065, -0.30972, 0.86946, -10.666, 0.01702, 0.99983, 0.00657, -0.15486, 0.87874, -10.666, -0.0849, 0.99576, -0.03536, 0.0, 0.91546, -10.666, -0.05395, 0.99788, -0.03652, 0.38715, 0.93384, -10.666, 0.00205, 0.99999, 0.00327, 0.77429, 0.91084, -10.666, 0.0386, 0.99862, 0.0357, 1.16144, 0.87635, -10.666, 0.03075, 0.9992, 0.02575, 1.54858, 0.87272, -10.666, 0.83225, 0.53654, -0.13956, -0.56543, 0.89903, -11.398, -0.97969, 0.19935, -0.02167, -0.42407, 0.91166, -11.398, -0.01268, 0.99991, -0.00374, -0.28271, 0.91694, -11.398, 0.05756, 0.99806, 0.02365, -0.14136, 0.90033, -11.398, 0.08121, 0.99621, 0.03101, 0.0, 0.87676, -11.398, 0.00948, 0.99994, 0.00577, 0.35339, 0.87836, -11.398, -0.03188, 0.99906, -0.02928, 0.70679, 0.90916, -11.398, -0.03823, 0.99868, -0.03437, 1.06018, 0.93239, -11.398, -0.00028, 1.0, -0.00145, 1.41357, 0.91637, -11.398, 0.88567, 0.46376, -0.0227, -0.57044, 0.89261, -12.13, -0.98005, 0.19269, 0.04869, -0.42783, 0.90408, -12.13, -0.06149, 0.99788, -0.0215, -0.28522, 0.90627, -12.13, -0.03786, 0.99919, -0.01333, -0.14261, 0.9062, -12.13, 0.01128, 0.99993, 0.00439, 0.0, 0.90693, -12.13, 0.03066, 0.99932, 0.02035, 0.35653, 0.89991, -12.13, 0.02299, 0.99949, 0.02228, 0.71305, 0.88559, -12.13, 0.00202, 0.99999, 0.00276, 1.06958, 0.8831, -12.13, -0.0266, 0.99931, -0.02603, 1.4261, 0.90378, -12.13, 0.8963, 0.43086, 0.10493, -0.62696, 0.89243, -12.862, -0.97146, 0.23054, 0.05588, -0.47022, 0.87356, -12.862, 0.03446, 0.99931, 0.01407, -0.31348, 0.88713, -12.862, -0.05178, 0.99849, -0.01845, -0.15674, 0.91051, -12.862, -0.07314, 0.99691, -0.02871, 0.0, 0.91602, -12.862, -0.01354, 0.99986, -0.00987, 0.39185, 0.90516, -12.862, 0.01423, 0.99979, 0.01475, 0.7837, 0.89631, -12.862, 0.02223, 0.99946, 0.024, 1.17554, 0.89476, -12.862, 0.01281, 0.99982, 0.01393, 1.56739, 0.89293, -12.862, 0.86661, 0.4884, 0.10228, -0.65026, 0.9264, -13.594, -0.96796, 0.24846, -0.03633, -0.48769, 0.92991, -13.594, 0.04809, 0.99867, 0.01848, -0.32513, 0.89691, -13.594, 0.10119, 0.99398, 0.04195, -0.16256, 0.86915, -13.594, 0.04006, 0.99905, 0.0169, 0.0, 0.87984, -13.594, -0.03497, 0.99907, -0.02514, 0.40641, 0.91209, -13.594, -0.03496, 0.99878, -0.03502, 0.81282, 0.92535, -13.594, -0.00822, 0.99994, -0.00713, 1.21924, 0.90867, -13.594, 0.02245, 0.99948, 0.02307, 1.62565, 0.88806, -13.594, 0.84078, 0.53897, -0.05101, -0.60542, 0.87528, -14.326, -0.97545, 0.2112, -0.06241, -0.45406, 0.8884, -14.326, -0.09115, 0.99502, -0.04026, -0.30271, 0.92009, -14.326, -0.06221, 0.99774, -0.02542, -0.15135, 0.93048, -14.326, 0.04372, 0.99887, 0.01885, 0.0, 0.90281, -14.326, 0.06169, 0.99726, 0.0409, 0.37839, 0.86999, -14.326, 0.01965, 0.99966, 0.01728, 0.75677, 0.8737, -14.326, -0.02626, 0.99936, -0.02441, 1.13516, 0.90909, -14.326, -0.04167, 0.99851, -0.03533, 1.51354, 0.93142, -14.326, 0.85658, 0.49768, -0.1363, -0.55965, 0.90276, -15.058, -0.98201, 0.18882, 0.00252, -0.41974, 0.89471, -15.058, 0.03548, 0.99929, 0.01277, -0.27983, 0.88473, -15.058, -0.02805, 0.99954, -0.01181, -0.13991, 0.89017, -15.058, -0.0784, 0.99648, -0.02981, 0.0, 0.91276, -15.058, -0.0307, 0.99935, -0.01869, 0.34978, 0.92581, -15.058, 0.0156, 0.99978, 0.01415, 0.69956, 0.90717, -15.058, 0.04079, 0.99848, 0.03696, 1.04935, 0.87538, -15.058, 0.02136, 0.99956, 0.02065, 1.39913, 0.87133, -15.058, 0.90014, 0.43538, -0.01352, -0.58156, 0.91489, -15.79, -0.97531, 0.21238, 0.0605, -0.43617, 0.89959, -15.79, 0.05906, 0.99804, 0.02049, -0.29078, 0.89212, -15.79, 0.05258, 0.99844, 0.01885, -0.14539, 0.89354, -15.79, 0.00792, 0.99996, 0.00287, 0.0, 0.89447, -15.79, -0.02236, 0.99962, -0.01636, 0.36348, 0.89677, -15.79, -0.02378, 0.99944, -0.02342, 0.72695, 0.90735, -15.79, -0.01225, 0.99984, -0.0128, 1.09043, 0.91706, -15.79, 0.01448, 0.99979, 0.01431, 1.45391, 0.90761, -15.79, 0.87912, 0.4528, 0.14875, -0.63831, 0.89099, -16.522, -0.9686, 0.24767, 0.02196, -0.47873, 0.9222, -16.522, -0.07233, 0.99698, -0.02833, -0.31915, 0.92365, -16.522, 0.01731, 0.99984, 0.00512, -0.15958, 0.89934, -16.522, 0.07621, 0.99664, 0.02989, 0.0, 0.88223, -16.522, 0.02955, 0.99931, 0.02246, 0.39894, 0.88799, -16.522, -0.00575, 0.99997, -0.00589, 0.79788, 0.90161, -16.522, -0.022, 0.99948, -0.02371, 1.19683, 0.90665, -16.522, -0.01813, 0.99964, -0.01968, 1.59577, 0.906, -16.522, 0.84518, 0.53066, 0.06378, -0.64482, 0.88897, -17.254, -0.97159, 0.23362, -0.03794, -0.48362, 0.86622, -17.254, 0.0032, 0.99999, 0.0026, -0.32241, 0.88476, -17.254, -0.09136, 0.99509, -0.03812, -0.16121, 0.92159, -17.254, -0.08168, 0.99609, -0.03372, 0.0, 0.93076, -17.254, 0.01059, 0.99992, 0.00729, 0.40302, 0.90329, -17.254, 0.03659, 0.99867, 0.0364, 0.80603, 0.87582, -17.254, 0.02416, 0.99946, 0.02236, 1.20905, 0.87992, -17.254, -0.01135, 0.99986, -0.01225, 1.61206, 0.90424, -17.254, 0.84517, 0.52201, -0.11484, -0.59134, 0.91864, -17.986, -0.98029, 0.1899, -0.05447, -0.44351, 0.92087, -17.986, 0.06817, 0.99721, 0.03047, -0.29567, 0.89505, -17.986, 0.08858, 0.9954, 0.03639, -0.14784, 0.87029, -17.986, 0.00773, 0.99997, 0.00177, 0.0, 0.88067, -17.986, -0.05281, 0.99801, -0.03432, 0.36959, 0.91682, -17.986, -0.03645, 0.99879, -0.03313, 0.73918, 0.93373, -17.986, 0.00589, 0.99996, 0.00593, 1.10877, 0.90931, -17.986, 0.04179, 0.9985, 0.0355, 1.47836, 0.87445, -17.986, 0.88891, 0.4446, -0.11029, -0.55803, 0.89773, -18.718, -0.98009, 0.19818, 0.01192, -0.41853, 0.90147, -18.718, -0.04914, 0.99863, -0.01775, -0.27902, 0.91042, -18.718, -9e-05, 1.0, 0.00087, -0.13951, 0.91366, -18.718, 0.06074, 0.99789, 0.02297, 0.0, 0.89869, -18.718, 0.04157, 0.99882, 0.02521, 0.34877, 0.8782, -18.718, 0.00221, 0.99999, 0.00248, 0.69754, 0.88095, -18.718, -0.03293, 0.99901, -0.02991, 1.04631, 0.91029, -18.718, -0.0353, 0.99881, -0.03377, 1.39509, 0.9314, -18.718, 0.88972, 0.45493, 0.03792, -0.59483, 0.87943, -19.45, -0.93078, 0.2203, -0.29175, -0.44612, 0.89293, -19.45, -0.05991, 0.8263, -0.56003, -0.29741, 0.90737, -19.45, -0.04837, 0.8481, -0.52762, -0.14871, 0.9089, -19.45, -0.00187, 0.85265, -0.52247, 0.0, 0.90509, -19.45, 0.02428, 0.78129, -0.6237, 0.37177, 0.90335, -19.45, 0.02181, 0.86258, -0.50544, 0.74353, 0.89796, -19.45, 0.01037, 0.85146, -0.52431, 1.1153, 0.8873, -19.45, -0.0129, 0.79695, -0.60391, 1.48706, 0.8863, -19.45, 0.61137, 0.74079, -0.27832, -0.55866, 0.22646, -1.15, -0.82601, -0.52722, 0.19935, -0.41899, 0.34613, -1.15, 0.34992, -0.78043, 0.51815, -0.27933, 0.38529, -1.15, 0.12648, -0.85698, 0.49958, -0.13966, 0.39662, -1.15, 0.07224, -0.87069, 0.48649, 0.0, 0.41371, -1.15, 0.03716, -0.92687, 0.37353, 0.34916, 0.42879, -1.15, -0.00857, -0.86729, 0.49773, 0.69832, 0.40863, -1.15, -0.10943, -0.87221, 0.47673, 1.04749, 0.33318, -1.15, -0.26952, -0.84876, 0.45493, 1.39665, 0.19705, -1.15, 0.62391, -0.40589, 0.66782, -0.58566, 0.33048, -1.882, -0.95475, -0.29144, 0.05935, -0.43925, 0.43544, -1.882, 0.45327, -0.89078, -0.03244, -0.29283, 0.46751, -1.882, 0.1295, -0.99141, -0.01828, -0.14642, 0.47986, -1.882, 0.0291, -0.99957, 0.00436, 0.0, 0.48676, -1.882, 0.02261, -0.99884, 0.04262, 0.36604, 0.48887, -1.882, 0.0071, -0.99953, 0.02992, 0.73208, 0.48343, -1.882, -0.06415, -0.99784, 0.0142, 1.09812, 0.44549, -1.882, -0.23265, -0.97212, -0.02917, 1.46416, 0.31909, -1.882, 0.80281, -0.59288, 0.06319, -0.64135, 0.20105, -2.614, -0.94992, -0.2966, 0.09842, -0.48101, 0.35958, -2.614, 0.52448, -0.84357, 0.11537, -0.32068, 0.41652, -2.614, 0.174, -0.97779, 0.11688, -0.16034, 0.40423, -2.614, -0.04198, -0.99493, 0.09137, 0.0, 0.38018, -2.614, -0.03728, -0.99491, 0.0936, 0.40085, 0.3805, -2.614, -0.01124, -0.99216, 0.1245, 0.80169, 0.38781, -2.614, -0.0468, -0.98845, 0.14417, 1.20254, 0.35237, -2.614, -0.18822, -0.97364, 0.12887, 1.60338, 0.22661, -2.614, 0.79052, -0.58633, 0.17691, -0.64225, 0.1281, -3.346, -0.97035, -0.23863, -0.03829, -0.48169, 0.22211, -3.346, 0.45253, -0.89174, 0.00338, -0.32112, 0.27581, -3.346, 0.24804, -0.96799, 0.03826, -0.16056, 0.32321, -3.346, 0.12953, -0.99063, 0.04336, 0.0, 0.34354, -3.346, 0.00223, -0.99994, -0.01038, 0.40141, 0.3215, -3.346, -0.04948, -0.99832, -0.03026, 0.80281, 0.27727, -3.346, -0.10177, -0.99461, -0.01969, 1.20422, 0.22672, -3.346, -0.20326, -0.97865, 0.03037, 1.60562, 0.12875, -3.346, 0.84456, -0.53521, -0.01654, -0.58701, 0.22764, -4.078, -0.96657, -0.23879, -0.09337, -0.44026, 0.35816, -4.078, 0.45772, -0.88294, -0.10447, -0.2935, 0.38595, -4.078, 0.1014, -0.98358, -0.14932, -0.14675, 0.37007, -4.078, 0.01111, -0.99144, -0.13012, 0.0, 0.37105, -4.078, 0.04272, -0.99453, -0.09529, 0.36688, 0.40219, -4.078, 0.02458, -0.99607, -0.08511, 0.73376, 0.41678, -4.078, -0.07132, -0.99102, -0.11309, 1.10064, 0.35619, -4.078, -0.25526, -0.95866, -0.12577, 1.46752, 0.19575, -4.078, 0.81498, -0.53756, -0.2164, -0.55844, 0.31049, -4.81, -0.96046, -0.27841, -0.00074, -0.41883, 0.43613, -4.81, 0.53856, -0.84256, 0.00677, -0.27922, 0.48541, -4.81, 0.1954, -0.98068, -0.00942, -0.13961, 0.49935, -4.81, -0.01177, -0.99949, -0.02957, 0.0, 0.49171, -4.81, -0.03872, -0.99912, -0.01621, 0.34902, 0.47315, -4.81, -0.02269, -0.99959, -0.01764, 0.69805, 0.45845, -4.81, -0.05274, -0.99855, 0.01059, 1.04707, 0.43508, -4.81, -0.19689, -0.98032, 0.01419, 1.39609, 0.33712, -4.81, 0.81621, -0.57591, -0.04607, -0.59936, 0.20698, -5.542, -0.95559, -0.28129, 0.08785, -0.44952, 0.34118, -5.542, 0.51473, -0.85223, 0.09358, -0.29968, 0.40736, -5.542, 0.24827, -0.95904, 0.13636, -0.14984, 0.42349, -5.542, 0.06955, -0.98869, 0.1329, 0.0, 0.4167, -5.542, -0.01371, -0.99359, 0.1122, 0.3746, 0.41004, -5.542, -0.03648, -0.99443, 0.09886, 0.7492, 0.39689, -5.542, -0.09118, -0.99111, 0.09688, 1.12381, 0.34556, -5.542, -0.21729, -0.97168, 0.09285, 1.49841, 0.21951, -5.542, 0.80422, -0.55956, 0.2003, -0.64844, 0.16158, -6.274, -0.96775, -0.24988, 0.03196, -0.48633, 0.25285, -6.274, 0.39413, -0.91849, -0.03215, -0.32422, 0.27068, -6.274, 0.12843, -0.9917, -0.00569, -0.16211, 0.29005, -6.274, 0.08677, -0.99553, 0.03736, 0.0, 0.32082, -6.274, 0.0483, -0.9981, 0.03815, 0.40527, 0.33338, -6.274, -0.00286, -0.99956, 0.0296, 0.81055, 0.30892, -6.274, -0.08846, -0.99608, -0.00214, 1.21582, 0.24533, -6.274, -0.23077, -0.97292, -0.01318, 1.6211, 0.11968, -6.274, 0.83505, -0.54094, 0.1004, -0.6321, 0.18914, -7.006, -0.96505, -0.25503, -0.06037, -0.47408, 0.34578, -7.006, 0.51923, -0.85247, -0.06075, -0.31605, 0.40372, -7.006, 0.14236, -0.98141, -0.12873, -0.15803, 0.387, -7.006, -0.06723, -0.98476, -0.1604, 0.0, 0.35394, -7.006, -0.03158, -0.98908, -0.14395, 0.39506, 0.35536, -7.006, 0.0078, -0.9953, -0.09651, 0.79013, 0.37898, -7.006, -0.03177, -0.99654, -0.07687, 1.18519, 0.35591, -7.006, -0.19803, -0.97661, -0.0838, 1.58025, 0.21866, -7.006, 0.81715, -0.55419, -0.15854, -0.57484, 0.3033, -7.738, -0.96183, -0.2665, -0.06219, -0.43113, 0.413, -7.738, 0.51322, -0.85825, 0.00425, -0.28742, 0.46384, -7.738, 0.26388, -0.96451, 0.00944, -0.14371, 0.49964, -7.738, 0.10203, -0.99477, -0.00439, 0.0, 0.5158, -7.738, -0.01763, -0.99957, -0.02355, 0.35927, 0.49635, -7.738, -0.05648, -0.99617, -0.06669, 0.71855, 0.45209, -7.738, -0.10152, -0.99371, -0.04722, 1.07782, 0.40068, -7.738, -0.20556, -0.97862, 0.00675, 1.4371, 0.30945, -7.738, 0.80665, -0.57522, -0.13578, -0.56249, 0.24441, -8.47, -0.96208, -0.27037, 0.03612, -0.42187, 0.36155, -8.47, 0.46839, -0.87981, 0.08096, -0.28124, 0.40616, -8.47, 0.17153, -0.97919, 0.10847, -0.14062, 0.41392, -8.47, 0.06959, -0.98914, 0.12948, 0.0, 0.4163, -8.47, 0.03665, -0.98875, 0.14505, 0.35156, 0.42921, -8.47, 0.00198, -0.99092, 0.13442, 0.70311, 0.43142, -8.47, -0.08942, -0.99061, 0.10343, 1.05467, 0.37603, -8.47, -0.26073, -0.96319, 0.06544, 1.40622, 0.22567, -8.47, 0.81646, -0.57268, 0.0737, -0.61356, 0.15342, -9.202, -0.9651, -0.25207, 0.07103, -0.46017, 0.2791, -9.202, 0.47826, -0.87821, 0.0031, -0.30678, 0.30352, -9.202, 0.11302, -0.99359, 0.00037, -0.15339, 0.29852, -9.202, -0.01963, -0.99976, 0.00949, 0.0, 0.30292, -9.202, 0.00166, -0.99983, 0.01859, 0.38348, 0.31219, -9.202, 0.00455, -0.99866, 0.05156, 0.76696, 0.30571, -9.202, -0.05307, -0.99743, 0.04822, 1.15043, 0.26234, -9.202, -0.20944, -0.97772, 0.0137, 1.53391, 0.14352, -9.202, 0.83779, -0.52012, 0.16605, -0.6515, 0.15761, -9.934, -0.96636, -0.257, -0.00966, -0.48863, 0.29777, -9.934, 0.52143, -0.84989, -0.07615, -0.32575, 0.37985, -9.934, 0.25138, -0.96455, -0.08036, -0.16288, 0.40071, -9.934, 0.02587, -0.99257, -0.11885, 0.0, 0.37615, -9.934, -0.04761, -0.98674, -0.15517, 0.40719, 0.34914, -9.934, -0.03893, -0.98932, -0.14044, 0.81438, 0.34107, -9.934, -0.06278, -0.99232, -0.10656, 1.22157, 0.31656, -9.934, -0.18043, -0.98002, -0.08364, 1.62875, 0.20522, -9.934, 0.83832, -0.54517, -0.00135, -0.61943, 0.32788, -10.666, -0.95958, -0.27528, -0.05847, -0.46458, 0.42385, -10.666, 0.41361, -0.90867, -0.05691, -0.30972, 0.44253, -10.666, 0.16327, -0.98551, -0.04604, -0.15486, 0.46236, -10.666, 0.1209, -0.99262, -0.00936, 0.0, 0.49978, -10.666, 0.05398, -0.99852, 0.00691, 0.38715, 0.51745, -10.666, -0.01665, -0.99871, -0.04798, 0.77429, 0.48391, -10.666, -0.11073, -0.99108, -0.07419, 1.16144, 0.40372, -10.666, -0.24232, -0.96924, -0.04294, 1.54858, 0.27704, -10.666, 0.7838, -0.60318, -0.14776, -0.56543, 0.25331, -11.398, -0.96111, -0.27597, -0.01073, -0.42407, 0.38899, -11.398, 0.51059, -0.85188, 0.1166, -0.28271, 0.43997, -11.398, 0.13601, -0.98633, 0.09308, -0.14136, 0.4339, -11.398, -0.04223, -0.99572, 0.08217, 0.0, 0.41104, -11.398, -0.00942, -0.99353, 0.1132, 0.35339, 0.41194, -11.398, 0.0161, -0.98988, 0.14102, 0.70679, 0.43219, -11.398, -0.03947, -0.98823, 0.14777, 1.06018, 0.40972, -11.398, -0.22653, -0.96646, 0.12102, 1.41357, 0.27065, -11.398, 0.80305, -0.59265, -0.06229, -0.57044, 0.1306, -12.13, -0.97046, -0.23874, 0.03476, -0.42783, 0.26511, -12.13, 0.54115, -0.83966, 0.04615, -0.28522, 0.31301, -12.13, 0.22579, -0.9725, 0.05718, -0.14261, 0.32348, -12.13, 0.02754, -0.99866, 0.04392, 0.0, 0.32491, -12.13, -0.03066, -0.99945, 0.01248, 0.35653, 0.31719, -12.13, -0.0385, -0.99893, 0.02562, 0.71305, 0.29232, -12.13, -0.07942, -0.99604, 0.03997, 1.06958, 0.24413, -12.13, -0.20201, -0.97809, 0.05023, 1.4261, 0.14176, -12.13, 0.85628, -0.50011, 0.12911, -0.62696, 0.17264, -12.862, -0.96875, -0.24705, 0.02189, -0.47022, 0.27682, -12.862, 0.44929, -0.88334, -0.13356, -0.31348, 0.33609, -12.862, 0.22577, -0.96943, -0.09606, -0.15674, 0.37002, -12.862, 0.10855, -0.99066, -0.08253, 0.0, 0.37623, -12.862, 0.01346, -0.99404, -0.10814, 0.39185, 0.36467, -12.862, -0.02848, -0.99168, -0.12556, 0.7837, 0.34527, -12.862, -0.09333, -0.98601, -0.13808, 1.17554, 0.29801, -12.862, -0.22196, -0.9648, -0.14103, 1.56739, 0.17314, -12.862, 0.84799, -0.52279, 0.08722, -0.65026, 0.32574, -13.594, -0.95482, -0.29701, 0.00987, -0.48769, 0.4523, -13.594, 0.43179, -0.89939, -0.0682, -0.32513, 0.465, -13.594, 0.07371, -0.99224, -0.10011, -0.16256, 0.4478, -13.594, -0.00487, -0.99714, -0.07537, 0.0, 0.45919, -13.594, 0.03498, -0.99921, -0.01893, 0.40641, 0.49073, -13.594, 0.0209, -0.99951, -0.02309, 0.81282, 0.49344, -13.594, -0.06202, -0.9969, -0.04834, 1.21924, 0.43106, -13.594, -0.22708, -0.97145, -0.06866, 1.62565, 0.2874, -13.594, 0.7799, -0.62264, -0.06384, -0.60542, 0.2404, -14.326, -0.958, -0.28591, -0.022, -0.45406, 0.37656, -14.326, 0.53892, -0.83011, 0.14313, -0.30271, 0.45396, -14.326, 0.23882, -0.96212, 0.13147, -0.15135, 0.4749, -14.326, -0.00657, -0.99624, 0.08638, 0.0, 0.44793, -14.326, -0.06158, -0.99549, 0.07211, 0.37839, 0.41441, -14.326, -0.03437, -0.99554, 0.08791, 0.75677, 0.40757, -14.326, -0.04758, -0.9898, 0.13425, 1.13516, 0.39725, -14.326, -0.17603, -0.97086, 0.16261, 1.51354, 0.29654, -14.326, 0.79327, -0.60493, -0.06912, -0.55965, 0.14645, -15.058, -0.97301, -0.22861, -0.03145, -0.41974, 0.26144, -15.058, 0.48489, -0.87267, 0.05766, -0.27983, 0.29717, -15.058, 0.21893, -0.97254, 0.07891, -0.13991, 0.31316, -15.058, 0.11674, -0.98859, 0.09515, 0.0, 0.33645, -15.058, 0.03063, -0.99712, 0.06934, 0.34978, 0.3488, -15.058, -0.03131, -0.99818, 0.05151, 0.69956, 0.31961, -15.058, -0.11877, -0.99251, 0.02867, 1.04935, 0.24211, -15.058, -0.2494, -0.96732, 0.04582, 1.39913, 0.11501, -15.058, 0.85699, -0.51534, -0.00074, -0.58156, 0.18464, -15.79, -0.97148, -0.23687, 0.01129, -0.43617, 0.29239, -15.79, 0.45436, -0.88153, -0.12834, -0.29078, 0.33063, -15.79, 0.13647, -0.98273, -0.12494, -0.14539, 0.34259, -15.79, 0.0302, -0.99389, -0.10617, 0.0, 0.34423, -15.79, 0.02226, -0.99512, -0.09617, 0.36348, 0.34582, -15.79, 0.00845, -0.99672, -0.08054, 0.72695, 0.34585, -15.79, -0.06393, -0.99328, -0.09651, 1.09043, 0.30986, -15.79, -0.23503, -0.96196, -0.13927, 1.45391, 0.17736, -15.79, 0.86052, -0.50778, 0.04072, -0.63831, 0.28393, -16.522, -0.95277, -0.29805, 0.05832, -0.47873, 0.43818, -16.522, 0.51894, -0.85307, -0.05447, -0.31915, 0.48533, -16.522, 0.15872, -0.98411, -0.07962, -0.15958, 0.47157, -16.522, -0.04051, -0.99412, -0.10047, 0.0, 0.45517, -16.522, -0.02946, -0.99642, -0.0793, 0.39894, 0.46022, -16.522, -0.00852, -0.99787, -0.06466, 0.79788, 0.46329, -16.522, -0.04931, -0.99755, -0.04965, 1.19683, 0.42263, -16.522, -0.19211, -0.97929, -0.06395, 1.59577, 0.29894, -16.522, 0.80155, -0.59501, 0.05897, -0.64482, 0.26412, -17.254, -0.95586, -0.29361, 0.01119, -0.48362, 0.36442, -17.254, 0.4653, -0.88052, 0.09047, -0.32241, 0.42865, -17.254, 0.25756, -0.95741, 0.13049, -0.16121, 0.47603, -17.254, 0.11568, -0.98497, 0.12825, 0.0, 0.48591, -17.254, -0.01054, -0.99507, 0.09857, 0.40302, 0.45773, -17.254, -0.05066, -0.9969, 0.06017, 0.80603, 0.41972, -17.254, -0.09434, -0.9925, 0.07776, 1.20905, 0.37811, -17.254, -0.19585, -0.97291, 0.1228, 1.61206, 0.27939, -17.254, 0.78649, -0.61714, 0.02406, -0.59134, 0.16941, -17.986, -0.96905, -0.24153, -0.05104, -0.44351, 0.29468, -17.986, 0.44551, -0.89255, 0.06984, -0.29567, 0.31456, -17.986, 0.09955, -0.99375, 0.05054, -0.14784, 0.30036, -17.986, 0.03, -0.99638, 0.07949, 0.0, 0.31144, -17.986, 0.05257, -0.99348, 0.10116, 0.36959, 0.34688, -17.986, 0.02122, -0.99328, 0.11378, 0.73918, 0.35324, -17.986, -0.08103, -0.9935, 0.07998, 1.10877, 0.28313, -17.986, -0.25904, -0.9635, 0.06759, 1.47836, 0.12522, -17.986, 0.82823, -0.55361, -0.08689, -0.55803, 0.15793, -18.718, -0.97316, -0.22638, -0.04136, -0.41853, 0.28472, -18.718, 0.53908, -0.84022, -0.05852, -0.27902, 0.33937, -18.718, 0.19304, -0.97713, -0.08918, -0.13951, 0.35316, -18.718, -0.02124, -0.99327, -0.1139, 0.0, 0.33889, -18.718, -0.04124, -0.99095, -0.12773, 0.34877, 0.3177, -18.718, -0.01792, -0.99538, -0.09428, 0.69754, 0.3099, -18.718, -0.04588, -0.99691, -0.06381, 1.04631, 0.29354, -18.718, -0.19724, -0.9783, -0.06342, 1.39509, 0.19161, -18.718, 0.86638, -0.49519, -0.06457, -0.59483, 0.26464, -19.45, -0.99024, -0.1209, -0.06939, -0.44612, 0.40119, -19.45, 0.47669, -0.64387, -0.5985, -0.29741, 0.46134, -19.45, 0.21944, -0.75571, -0.61705, -0.14871, 0.47341, -19.45, 0.04106, -0.78844, -0.61375, 0.0, 0.47031, -19.45, -0.02368, -0.78886, -0.61412, 0.37177, 0.46787, -19.45, -0.02821, -0.7788, -0.62664, 0.74353, 0.45193, -19.45, -0.05664, -0.77232, -0.6327, 1.1153, 0.39556, -19.45, -0.13677, -0.75926, -0.63625, 1.48706, 0.27152, -19.45, 0.78842, -0.50335, -0.35359, -0.8317, 0.58586, -2.1, -0.84741, 0.53093, -0.00187, -0.6378, 0.6262, -2.1, 0.83855, 0.54482, -0.00182, -0.82917, -0.0963, -2.1, -0.84407, -0.53623, -0.00191, -0.64033, -0.13664, -2.1, 0.83472, -0.55067, -0.00185, -0.74009, -0.00223, -1.07352, -0.03432, -0.85465, 0.51807, -0.74009, 0.48514, -1.06115, -0.03401, 0.84875, 0.52769, -0.74009, 0.01515, -3.05283, -0.03717, -0.85078, -0.52421, -0.74009, 0.46776, -3.0652, -0.03685, 0.84475, -0.53389, -0.5956, 0.24, -2.6457, 0.99542, -0.00318, -0.09556, -0.604, 0.24, -1.58601, 0.99566, -0.00306, 0.09299, -0.88701, 0.24, -2.6549, -0.99563, -0.00336, -0.09327, -0.87862, 0.24, -1.57681, -0.99589, -0.00323, 0.09057, -0.73745, 1.02999, -2.03, -0.73273, 0.68051, -0.00206, -0.62111, 1.04632, -2.03, 0.72027, 0.69369, -0.00198, -0.73594, 0.75388, -2.03, -0.728, -0.68558, -0.00209, -0.62263, 0.73755, -2.03, 0.71496, -0.69916, -0.00201, -0.68249, 0.79196, -1.54475, -0.02404, -0.88732, 0.46054, -0.68249, 0.98923, -1.53891, -0.02386, 0.88247, 0.46977, -0.68249, 0.79899, -2.48043, -0.02606, -0.88416, -0.46645, -0.68249, 0.98219, -2.48628, -0.02587, 0.87919, -0.47577, -0.5958, 0.89, -2.28797, 0.99265, -0.0047, -0.12095, -0.60084, 0.89, -1.78702, 0.99304, -0.00452, 0.11771, -0.77064, 0.89, -2.29232, -0.99299, -0.00496, -0.11807, -0.7656, 0.89, -1.78267, -0.99339, -0.00477, 0.11466, 1.61708, 0.5763, -2.1, -0.53281, 0.84623, -0.00301, 2.08918, 0.61664, -2.1, 0.51847, 0.85509, -0.00288, 1.61076, -0.10586, -2.1, -0.53812, -0.84286, -0.00297, 2.09551, -0.1462, -2.1, 0.52426, -0.85155, -0.00284, 1.83978, -0.00514, -1.06115, -0.01361, -0.84917, 0.52795, 1.83978, 0.48223, -1.07352, -0.01373, 0.85508, 0.51832, 1.83978, 0.01224, -3.0652, -0.01475, -0.84523, -0.5342, 1.83978, 0.46485, -3.05283, -0.01488, 0.85127, -0.52451, 2.20099, 0.24, -2.6457, 0.97236, 0.00777, -0.23336, 2.18, 0.24, -1.58601, 0.97378, 0.00748, 0.22737, 1.47247, 0.24, -2.6549, -0.97362, 0.0082, -0.22803, 1.49346, 0.24, -1.57681, -0.97509, 0.00789, 0.22168, 1.56216, 1.02612, -2.03, -0.39095, 0.92041, -0.0028, 1.84542, 1.04245, -2.03, 0.37859, 0.92556, -0.00267, 1.55836, 0.75001, -2.03, -0.39556, -0.91843, -0.00277, 1.84922, 0.73368, -2.03, 0.38356, -0.92351, -0.00264, 1.69578, 0.79077, -1.53891, -0.00955, -0.88268, 0.46988, 1.69578, 0.98804, -1.54475, -0.00962, 0.88753, 0.46065, 1.69578, 0.79781, -2.48628, -0.01035, -0.87944, -0.47591, 1.69578, 0.98101, -2.48043, -0.01043, 0.88441, -0.46659, 1.9125, 0.89, -2.28797, 0.95654, 0.01133, -0.29137, 1.89991, 0.89, -1.78702, 0.95873, 0.01092, 0.28412, 1.47539, 0.89, -2.29232, -0.95848, 0.01197, -0.28492, 1.48799, 0.89, -1.78267, -0.96074, 0.01153, 0.27723, -0.83951, 0.58458, -4.23, -0.81391, 0.58098, -0.00168, -0.65297, 0.59968, -4.23, 0.80974, 0.58679, -0.00167, -0.83697, -0.09502, -4.23, -0.8095, -0.58711, -0.00172, -0.6555, -0.11012, -4.23, 0.80511, -0.59312, -0.0017, -0.74824, 0.01289, -3.26759, -0.01457, -0.86316, 0.50473, -0.74824, 0.47002, -3.25522, -0.01446, 0.85757, 0.51417, -0.74824, 0.02619, -5.13608, -0.01542, -0.8596, -0.51074, -0.74824, 0.45673, -5.14845, -0.01531, 0.85386, -0.52027, -0.58521, 0.24, -4.84574, 0.99465, -0.00339, -0.10329, -0.59163, 0.24, -3.63851, 0.99491, -0.00328, 0.10073, -0.91218, 0.24, -4.84918, -0.99474, -0.00346, -0.10235, -0.90576, 0.24, -3.63507, -0.99501, -0.00336, 0.09975, -0.7454, 1.02947, -4.16, -0.68686, 0.72678, -0.0018, -0.63348, 1.03558, -4.16, 0.68137, 0.73193, -0.00179, -0.74388, 0.7544, -4.16, -0.68106, -0.73222, -0.00183, -0.635, 0.74828, -4.16, 0.67534, -0.7375, -0.00181, -0.69064, 0.79808, -3.70504, -0.01018, -0.89414, 0.44767, -0.69064, 0.98311, -3.6992, -0.01012, 0.88958, 0.45668, -0.69064, 0.80346, -4.58833, -0.01079, -0.89124, -0.45341, -0.69064, 0.97772, -4.59418, -0.01072, 0.88654, -0.46252, -0.59282, 0.89, -4.45108, 0.99141, -0.005, -0.13068, -0.59667, 0.89, -3.88039, 0.99183, -0.00485, 0.12746, -0.789, 0.89, -4.4527, -0.99157, -0.00511, -0.12949, -0.78515, 0.89, -3.87876, -0.99199, -0.00496, 0.12622, 1.59756, 0.57502, -4.23, -0.48293, 0.87565, -0.00256, 2.05125, 0.59012, -4.23, 0.47717, 0.87881, -0.00253, 1.59123, -0.10458, -4.23, -0.48885, -0.87237, -0.00253, 2.05758, -0.11968, -4.23, 0.48325, -0.87548, -0.00249, 1.8194, 0.00998, -3.25522, -0.00579, -0.85764, 0.51421, 1.8194, 0.46711, -3.26759, -0.00583, 0.86323, 0.50477, 1.8194, 0.02327, -5.14845, -0.00612, -0.85395, -0.52032, 1.8194, 0.45381, -5.13608, -0.00617, 0.85968, -0.51079, 2.22698, 0.24, -4.84574, 0.96788, 0.00824, -0.25128, 2.21092, 0.24, -3.63851, 0.9694, 0.008, 0.24537, 1.40955, 0.24, -4.84918, -0.96844, 0.00842, -0.2491, 1.42561, 0.24, -3.63507, -0.96997, 0.00818, 0.24309, 1.5423, 1.0256, -4.16, -0.3487, 0.93723, -0.00235, 1.81451, 1.03172, -4.16, 0.34394, 0.93899, -0.00231, 1.5385, 0.75053, -4.16, -0.3536, -0.93539, -0.00232, 1.81831, 0.74442, -4.16, 0.34896, -0.93713, -0.00229, 1.6754, 0.79689, -3.6992, -0.00405, -0.88961, 0.4567, 1.6754, 0.98192, -3.70504, -0.00407, 0.89418, 0.44769, 1.6754, 0.80228, -4.59418, -0.00429, -0.88659, -0.46254, 1.6754, 0.97654, -4.58833, -0.00432, 0.89128, -0.45343, 1.91995, 0.89, -4.45108, 0.9497, 0.01198, -0.31294, 1.91031, 0.89, -3.88039, 0.95201, 0.01165, 0.30585, 1.42949, 0.89, -4.4527, -0.95055, 0.01225, -0.31033, 1.43913, 0.89, -3.87876, -0.95288, 0.01191, 0.3031, -0.83284, 0.61591, -6.36, -0.81413, 0.58068, -0.00036, -0.64007, 0.59189, -6.36, 0.82037, 0.57183, -0.00036, -0.83031, -0.12635, -6.36, -0.80972, -0.58682, -0.00036, -0.6426, -0.10233, -6.36, 0.81628, -0.57766, -0.00037, -0.73327, 0.01151, -5.39173, 0.02276, -0.85952, 0.51059, -0.73327, 0.47141, -5.37936, 0.02258, 0.85394, 0.51988, -0.73327, 0.01446, -7.31575, 0.02304, -0.85876, -0.51186, -0.73327, 0.46845, -7.32812, 0.02287, 0.85315, -0.52116, -0.57094, 0.24, -6.9731, 0.99498, -0.00333, -0.10002, -0.57237, 0.24, -5.75229, 0.99504, -0.00331, 0.09947, -0.89415, 0.24, -6.96762, -0.99483, -0.00322, -0.10148, -0.89272, 0.24, -5.75777, -0.99489, -0.0032, 0.10095, -0.73541, 1.04215, -6.29, -0.68715, 0.72652, -0.00038, -0.61975, 1.03243, -6.29, 0.69545, 0.71857, -0.00039, -0.73389, 0.74171, -6.29, -0.68134, -0.73196, -0.00039, -0.62127, 0.75144, -6.29, 0.68999, -0.72382, -0.00039, -0.67567, 0.79752, -5.83227, 0.01592, -0.89122, 0.4533, -0.67567, 0.98367, -5.82642, 0.01582, 0.88664, 0.46218, -0.67567, 0.79871, -6.74181, 0.01612, -0.89059, -0.45451, -0.67567, 0.98247, -6.74766, 0.01602, 0.886, -0.46342, -0.57827, 0.89, -6.57983, 0.99195, -0.00492, -0.12656, -0.57913, 0.89, -6.00272, 0.99203, -0.00489, 0.12587, -0.7722, 0.89, -6.57724, -0.99171, -0.00476, -0.1284, -0.77134, 0.89, -6.00531, -0.9918, -0.00473, 0.12773, 1.61423, 0.60635, -6.36, -0.48322, 0.8755, -0.00054, 2.0835, 0.58233, -6.36, 0.49206, 0.87056, -0.00055, 1.6079, -0.13591, -6.36, -0.48914, -0.8722, -0.00053, 2.08983, -0.11189, -6.36, 0.49773, -0.86733, -0.00054, 1.85682, 0.00859, -5.37936, 0.00904, -0.85412, 0.51999, 1.85682, 0.46849, -5.39173, 0.0091, 0.85971, 0.5107, 1.85682, 0.01155, -7.32812, 0.00915, -0.85334, -0.52128, 1.85682, 0.46554, -7.31575, 0.00922, 0.85895, -0.51197, 2.26264, 0.24, -6.9731, 0.96981, 0.00812, -0.24373, 2.25907, 0.24, -5.75229, 0.97013, 0.00807, 0.24245, 1.45462, 0.24, -6.96762, -0.96896, 0.00785, -0.24711, 1.45819, 0.24, -5.75777, -0.96927, 0.0078, 0.24587, 1.56726, 1.03829, -6.29, -0.34893, 0.93715, -0.00049, 1.84883, 1.02856, -6.29, 0.35628, 0.93438, -0.00051, 1.56347, 0.73785, -6.29, -0.35385, -0.9353, -0.00049, 1.85263, 0.74757, -6.29, 0.36102, -0.93256, -0.0005, 1.71282, 0.79633, -5.82642, 0.00633, -0.88674, 0.46223, 1.71282, 0.98248, -5.83227, 0.00637, 0.89131, 0.45335, 1.71282, 0.79753, -6.74766, 0.00641, -0.88609, -0.46346, 1.71282, 0.98129, -6.74181, 0.00645, 0.89069, -0.45456, 1.95631, 0.89, -6.57983, 0.95264, 0.01182, -0.30387, 1.95417, 0.89, -6.00272, 0.95313, 0.01175, 0.30233, 1.4715, 0.89, -6.57724, -0.95134, 0.01142, -0.30793, 1.47364, 0.89, -6.00531, -0.95182, 0.01135, 0.30644, -0.83873, 0.65434, -8.49, -0.84722, 0.53124, 0.00084, -0.63011, 0.61328, -8.49, 0.85508, 0.51849, 0.00086, -0.8362, -0.16478, -8.49, -0.84387, -0.53655, 0.00085, -0.63264, -0.12372, -8.49, 0.85214, -0.52331, 0.00088, -0.72898, -0.00431, -7.45467, 0.03389, -0.84667, 0.53104, -0.72898, 0.48723, -7.4423, 0.03359, 0.84083, 0.54025, -0.72898, -0.01309, -9.56252, 0.03258, -0.84841, -0.52833, -0.72898, 0.49601, -9.57488, 0.0323, 0.84263, -0.53753, -0.58582, 0.24, -9.0307, 0.99595, -0.00304, -0.08988, -0.58158, 0.24, -7.93329, 0.99584, -0.00309, 0.09109, -0.86966, 0.24, -9.02133, -0.99575, -0.00289, -0.09207, -0.8739, 0.24, -7.94266, -0.99564, -0.00294, 0.09322, -0.73723, 1.05771, -8.42, -0.73245, 0.68082, 0.00092, -0.61206, 1.04109, -8.42, 0.74372, 0.66849, 0.00095, -0.73571, 0.72616, -8.42, -0.72771, -0.68588, 0.00093, -0.61358, 0.74278, -8.42, 0.73948, -0.67318, 0.00097, -0.67138, 0.79111, -7.93057, 0.02378, -0.88075, 0.47299, -0.67138, 0.99007, -7.92472, 0.02361, 0.87592, 0.48188, -0.67138, 0.78756, -8.92701, 0.02285, -0.88217, -0.47037, -0.67138, 0.99362, -8.93285, 0.02269, 0.87739, -0.47923, -0.58548, 0.89, -8.6756, 0.99349, -0.00449, -0.11379, -0.58294, 0.89, -8.15683, 0.99332, -0.00457, 0.11532, -0.75579, 0.89, -8.67118, -0.99317, -0.00427, -0.11656, -0.75833, 0.89, -8.16126, -0.993, -0.00435, 0.118, 1.59951, 0.64478, -8.49, -0.5325, 0.84643, 0.00134, 2.1084, 0.60372, -8.49, 0.54578, 0.83793, 0.00141, 1.59318, -0.17434, -8.49, -0.5378, -0.84307, 0.00133, 2.11473, -0.13328, -8.49, 0.55065, -0.83473, 0.00139, 1.86755, -0.00723, -7.4423, 0.01344, -0.84123, 0.54051, 1.86755, 0.48431, -7.45467, 0.01356, 0.84708, 0.5313, 1.86755, -0.01601, -9.57488, 0.01292, -0.843, -0.53776, 1.86755, 0.49309, -9.56252, 0.01304, 0.84879, -0.52857, 2.22545, 0.24, -9.0307, 0.97546, 0.00743, -0.22006, 2.23605, 0.24, -7.93329, 0.97481, 0.00757, 0.22291, 1.51585, 0.24, -9.02133, -0.97428, 0.00707, -0.22522, 1.50525, 0.24, -7.94266, -0.97366, 0.0072, 0.2279, 1.56273, 1.05384, -8.42, -0.39067, 0.92053, 0.00125, 1.86806, 1.03722, -8.42, 0.40228, 0.91552, 0.00132, 1.55893, 0.72229, -8.42, -0.39529, -0.91856, 0.00124, 1.87186, 0.73891, -8.42, 0.40658, -0.91362, 0.0013, 1.72355, 0.78993, -7.92472, 0.00945, -0.87612, 0.48199, 1.72355, 0.98889, -7.93057, 0.00951, 0.88096, 0.4731, 1.72355, 0.78638, -8.93285, 0.00908, -0.87758, -0.47934, 1.72355, 0.99244, -8.92701, 0.00914, 0.88236, -0.47048, 1.93829, 0.89, -8.6756, 0.96131, 0.01086, -0.27526, 1.94465, 0.89, -8.15683, 0.96031, 0.01106, 0.27871, 1.51253, 0.89, -8.67118, -0.9595, 0.01032, -0.28151, 1.50617, 0.89, -8.16126, -0.95854, 0.0105, 0.28477, -0.85719, 0.66336, -10.62, -0.87655, 0.48131, 0.00125, -0.63831, 0.64301, -10.62, 0.8794, 0.47608, 0.00128, -0.85466, -0.1738, -10.62, -0.87414, -0.48568, 0.00127, -0.64084, -0.15345, -10.62, 0.87714, -0.48023, 0.0013, -0.74505, -0.01685, -9.53155, 0.01466, -0.83316, 0.55285, -0.74505, 0.49977, -9.51918, 0.01451, 0.82687, 0.5622, -0.74505, -0.03323, -11.77785, 0.01346, -0.83506, -0.55, -0.74505, 0.51614, -11.79022, 0.01332, 0.8288, -0.55939, -0.62363, 0.24, -11.07861, 0.99663, -0.0028, -0.08203, -0.61572, 0.24, -10.13151, 0.9965, -0.0029, 0.08359, -0.86525, 0.24, -11.07397, -0.99655, -0.00274, -0.083, -0.87316, 0.24, -10.13616, -0.99642, -0.00283, 0.0845, -0.75473, 1.06136, -10.55, -0.77556, 0.63128, 0.0014, -0.6234, 1.05312, -10.55, 0.77992, 0.62588, 0.00144, -0.75321, 0.72251, -10.55, -0.7719, -0.63574, 0.00142, -0.62492, 0.73075, -10.55, 0.77646, -0.63016, 0.00146, -0.68745, 0.78604, -10.03546, 0.01032, -0.86942, 0.49397, -0.68745, 0.99514, -10.02961, 0.01023, 0.86417, 0.50309, -0.68745, 0.77941, -11.09735, 0.00947, -0.871, -0.4912, -0.68745, 1.00177, -11.10319, 0.00938, 0.86578, -0.50034, -0.6146, 0.89, -10.7668, 0.99458, -0.00414, -0.1039, -0.60985, 0.89, -10.31908, 0.99437, -0.00428, 0.10586, -0.75957, 0.89, -10.7646, -0.99445, -0.00405, -0.10512, -0.76432, 0.89, -10.32127, -0.99425, -0.00419, 0.10702, 1.55336, 0.6538, -10.62, -0.58427, 0.81156, 0.00212, 2.0879, 0.63345, -10.62, 0.58993, 0.80745, 0.00219, 1.54703, -0.18336, -10.62, -0.5888, -0.80828, 0.0021, 2.09423, -0.16301, -10.62, 0.59425, -0.80428, 0.00216, 1.82737, -0.01977, -9.51918, 0.0058, -0.82694, 0.56225, 1.82737, 0.49685, -9.53155, 0.00586, 0.83323, 0.5529, 1.82737, -0.03614, -11.79022, 0.00533, -0.82886, -0.55943, 1.82737, 0.51323, -11.77785, 0.00538, 0.83512, -0.55004, 2.13093, 0.24, -11.07861, 0.97946, 0.00687, -0.20153, 2.15071, 0.24, -10.13151, 0.97869, 0.00711, 0.20523, 1.52688, 0.24, -11.07397, -0.97898, 0.00672, -0.20384, 1.5071, 0.24, -10.13616, -0.97823, 0.00695, 0.2074, 1.51896, 1.05749, -10.55, -0.43687, 0.89952, 0.00201, 1.83969, 1.04925, -10.55, 0.44209, 0.89697, 0.00208, 1.51517, 0.71864, -10.55, -0.44104, -0.89748, 0.00199, 1.84349, 0.72688, -10.55, 0.4461, -0.89498, 0.00206, 1.68337, 0.78486, -10.02961, 0.00409, -0.86421, 0.50311, 1.68337, 0.99396, -10.03546, 0.00413, 0.86946, 0.49399, 1.68337, 0.77823, -11.10319, 0.00375, -0.86581, -0.50035, 1.68337, 1.00059, -11.09735, 0.00379, 0.87103, -0.49121, 1.86551, 0.89, -10.7668, 0.9675, 0.01006, -0.25267, 1.87737, 0.89, -10.31908, 0.9663, 0.0104, 0.25719, 1.50307, 0.89, -10.7646, -0.96676, 0.00984, -0.25549, 1.49121, 0.89, -10.32127, -0.9656, 0.01017, 0.25983, -0.84839, 0.62958, -12.75, -0.88133, 0.4725, 0.00127, -0.63696, 0.64866, -12.75, 0.87862, 0.47751, 0.00124, -0.84586, -0.14002, -12.75, -0.87905, -0.47674, 0.00129, -0.63949, -0.1591, -12.75, 0.87619, -0.48196, 0.00126, -0.7452, -0.01049, -11.68849, -0.01402, -0.83343, 0.55244, -0.7452, 0.49341, -11.67612, -0.01388, 0.82692, 0.56214, -0.7452, -0.02677, -13.88048, -0.01283, -0.83521, -0.54977, -0.7452, 0.50969, -13.89285, -0.01269, 0.82872, -0.55951, -0.63086, 0.24, -13.18186, 0.99664, -0.00282, -0.08185, -0.623, 0.24, -12.28844, 0.99652, -0.00292, 0.08332, -0.8607, 0.24, -13.18621, -0.99672, -0.00288, -0.08091, -0.86856, 0.24, -12.28409, -0.99659, -0.00298, 0.08244, -0.74952, 1.04769, -12.68, -0.78288, 0.62217, 0.00144, -0.62266, 1.05541, -12.68, 0.77873, 0.62736, 0.00139, -0.748, 0.73618, -12.68, -0.77937, -0.62656, 0.00146, -0.62418, 0.72846, -12.68, 0.77501, -0.63194, 0.00141, -0.6876, 0.78861, -12.1782, -0.00987, -0.86965, 0.49357, -0.6876, 0.99257, -12.17235, -0.00978, 0.86421, 0.50303, -0.6876, 0.78202, -13.21441, -0.00903, -0.87113, -0.49097, -0.6876, 0.99916, -13.22026, -0.00894, 0.86572, -0.50046, -0.619, 0.89, -12.88415, 0.9946, -0.00416, -0.10367, -0.61428, 0.89, -12.46181, 0.99441, -0.00431, 0.10553, -0.7569, 0.89, -12.88621, -0.99473, -0.00425, -0.10249, -0.76162, 0.89, -12.45975, -0.99452, -0.00441, 0.10442, 1.57535, 0.62002, -12.75, -0.59357, 0.80478, 0.00218, 2.09127, 0.6391, -12.75, 0.58812, 0.80877, 0.00211, 1.56902, -0.14958, -12.75, -0.598, -0.8015, 0.00216, 2.0976, -0.16866, -12.75, 0.59276, -0.80538, 0.00209, 1.82699, -0.01341, -11.67612, -0.00555, -0.82699, 0.56219, 1.82699, 0.49049, -11.68849, -0.00561, 0.8335, 0.55249, 1.82699, -0.02969, -13.89285, -0.00507, -0.82878, -0.55955, 1.82699, 0.50677, -13.88048, -0.00513, 0.83527, -0.54981, 2.11285, 0.24, -13.18186, 0.97954, 0.00692, -0.20112, 2.13251, 0.24, -12.28844, 0.97882, 0.00716, 0.20461, 1.53825, 0.24, -13.18621, -0.98, 0.00707, -0.19888, 1.5186, 0.24, -12.28409, -0.97925, 0.00732, 0.20251, 1.53201, 1.04382, -12.68, -0.44546, 0.8953, 0.00208, 1.84156, 1.05154, -12.68, 0.44042, 0.89779, 0.00201, 1.52821, 0.73231, -12.68, -0.44958, -0.89324, 0.00206, 1.84536, 0.72459, -12.68, 0.44471, -0.89567, 0.00199, 1.68299, 0.78743, -12.17235, -0.00391, -0.86425, 0.50305, 1.68299, 0.99139, -12.1782, -0.00395, 0.86969, 0.49359, 1.68299, 0.78084, -13.22026, -0.00358, -0.86575, -0.50047, 1.68299, 0.99798, -13.21441, -0.00361, 0.87116, -0.49099, 1.85451, 0.89, -12.88415, 0.96763, 0.01013, -0.25216, 1.8663, 0.89, -12.46181, 0.96651, 0.01048, 0.25643, 1.50975, 0.89, -12.88621, -0.96834, 0.01035, -0.24942, 1.49796, 0.89, -12.45975, -0.96718, 0.01071, 0.25386, -0.81848, 0.57747, -14.88, -0.85878, 0.51235, 0.00087, -0.62886, 0.61843, -14.88, 0.85037, 0.52619, 0.00084, -0.81595, -0.08791, -14.88, -0.85567, -0.51752, 0.00089, -0.63139, -0.12887, -14.88, 0.84678, -0.53194, 0.00085, -0.72909, 0.01197, -13.91368, -0.03631, -0.84921, 0.5268, -0.72909, 0.47095, -13.90132, -0.03596, 0.84289, 0.53688, -0.72909, 0.00345, -15.88242, -0.03481, -0.85093, -0.52413, -0.72909, 0.47947, -15.89479, -0.03447, 0.84466, -0.5342, -0.60317, 0.24, -15.35559, 0.99596, -0.00312, -0.08977, -0.59905, 0.24, -14.38886, 0.99585, -0.00319, 0.0909, -0.85749, 0.24, -15.36493, -0.99617, -0.0033, -0.08733, -0.8616, 0.24, -14.37952, -0.99607, -0.00336, 0.08854, -0.72512, 1.0266, -14.81, -0.74908, 0.66248, 0.00096, -0.61135, 1.04317, -14.81, 0.73694, 0.67595, 0.00092, -0.7236, 0.75727, -14.81, -0.74457, -0.66754, 0.00098, -0.61287, 0.7407, -14.81, 0.73183, -0.68148, 0.00093, -0.67149, 0.7977, -14.3532, -0.02546, -0.88287, 0.46893, -0.67149, 0.98348, -14.34735, -0.02526, 0.87764, 0.47865, -0.67149, 0.79425, -15.28387, -0.0244, -0.88426, -0.46635, -0.67149, 0.98693, -15.28972, -0.0242, 0.87909, -0.47604, -0.59594, 0.89, -15.03482, 0.99351, -0.00462, -0.11365, -0.59347, 0.89, -14.57783, 0.99334, -0.00471, 0.11509, -0.74853, 0.89, -15.03924, -0.99385, -0.00487, -0.11059, -0.751, 0.89, -14.57341, -0.99368, -0.00497, 0.11211, 1.65013, 0.56791, -14.88, -0.55163, 0.83409, 0.00143, 2.11153, 0.60887, -14.88, 0.53711, 0.84351, 0.00135, 1.6438, -0.09747, -14.88, -0.55688, -0.83059, 0.00141, 2.11786, -0.13843, -14.88, 0.54289, -0.83981, 0.00133, 1.86727, 0.00905, -13.90132, -0.01439, -0.84335, 0.53718, 1.86727, 0.46803, -13.91368, -0.01453, 0.84968, 0.52709, 1.86727, 0.00053, -15.89479, -0.01379, -0.84508, -0.53446, 1.86727, 0.47655, -15.88242, -0.01393, 0.85136, -0.5244, 2.18207, 0.24, -15.35559, 0.97551, 0.00765, -0.21981, 2.19237, 0.24, -14.38886, 0.97491, 0.0078, 0.22248, 1.54628, 0.24, -15.36493, -0.97678, 0.00808, -0.21408, 1.53599, 0.24, -14.37952, -0.97615, 0.00824, 0.21693, 1.59299, 1.02273, -14.81, -0.40744, 0.91323, 0.00134, 1.86983, 1.0393, -14.81, 0.39468, 0.91882, 0.00126, 1.58919, 0.7534, -14.81, -0.4121, -0.91114, 0.00132, 1.87362, 0.73683, -14.81, 0.39973, -0.91663, 0.00125, 1.72327, 0.79652, -14.34735, -0.01011, -0.87788, 0.47878, 1.72327, 0.9823, -14.3532, -0.01019, 0.88311, 0.46906, 1.72327, 0.79307, -15.28972, -0.00968, -0.87931, -0.47616, 1.72327, 0.98575, -15.28387, -0.00976, 0.88448, -0.46647, 1.91215, 0.89, -15.03482, 0.96139, 0.01118, -0.27495, 1.91833, 0.89, -14.57783, 0.96046, 0.01139, 0.27819, 1.53068, 0.89, -15.03924, -0.96335, 0.01181, -0.26798, 1.5245, 0.89, -14.57341, -0.96238, 0.01204, 0.27144, -0.81518, 0.54992, -17.01, -0.82097, 0.57096, -0.00042, -0.64433, 0.57511, -17.01, 0.81358, 0.58145, -0.00042, -0.81265, -0.06036, -17.01, -0.81643, -0.57744, -0.00043, -0.64686, -0.08555, -17.01, 0.80862, -0.58833, -0.00043, -0.73309, 0.03049, -16.12214, -0.02639, -0.86413, 0.50258, -0.73309, 0.45243, -16.10977, -0.02618, 0.85807, 0.51287, -0.73309, 0.03373, -17.88412, -0.0268, -0.86324, -0.50409, -0.73309, 0.44919, -17.89649, -0.02658, 0.85714, -0.51439, -0.58865, 0.24, -17.55554, 0.995, -0.00357, -0.09978, -0.59022, 0.24, -16.47037, 0.99507, -0.00354, 0.09914, -0.87906, 0.24, -17.56129, -0.99518, -0.00371, -0.09801, -0.87749, 0.24, -16.46463, -0.99524, -0.00368, 0.09735, -0.72475, 1.01544, -16.94, -0.69626, 0.71779, -0.00046, -0.62224, 1.02564, -16.94, 0.68643, 0.7272, -0.00045, -0.72323, 0.76843, -16.94, -0.6902, -0.72362, -0.00046, -0.62376, 0.75823, -16.94, 0.67991, -0.7333, -0.00046, -0.67549, 0.8052, -16.52028, -0.01845, -0.89499, 0.4457, -0.67549, 0.97598, -16.51444, -0.01832, 0.89005, 0.4555, -0.67549, 0.80651, -17.35322, -0.01873, -0.89427, -0.44713, -0.67549, 0.97467, -17.35907, -0.0186, 0.88929, -0.45696, -0.58883, 0.89, -17.19789, 0.99198, -0.00527, -0.12625, -0.58977, 0.89, -16.6849, 0.99209, -0.00523, 0.12546, -0.76307, 0.89, -17.20061, -0.99226, -0.00549, -0.12403, -0.76213, 0.89, -16.68219, -0.99237, -0.00544, 0.12321, 1.65838, 0.54036, -17.01, -0.49228, 0.87044, -0.00065, 2.07284, 0.56555, -17.01, 0.48177, 0.8763, -0.00064, 1.65205, -0.06992, -17.01, -0.49857, -0.86685, -0.00064, 2.07917, -0.09511, -17.01, 0.4884, -0.87262, -0.00063, 1.85727, 0.02757, -16.10977, -0.01047, -0.85832, 0.51301, 1.85727, 0.44951, -16.12214, -0.01056, 0.86438, 0.50273, 1.85727, 0.03081, -17.89649, -0.01063, -0.8574, -0.51455, 1.85727, 0.44627, -17.88412, -0.01072, 0.8635, -0.50424, 2.21838, 0.24, -17.55554, 0.96995, 0.0087, -0.24316, 2.21446, 0.24, -16.47037, 0.97032, 0.00863, 0.24169, 1.49236, 0.24, -17.56129, -0.97096, 0.00905, -0.23905, 1.49627, 0.24, -16.46463, -0.97134, 0.00898, 0.23753, 1.59393, 1.01157, -16.94, -0.35646, 0.93431, -0.0006, 1.84261, 1.02177, -16.94, 0.34773, 0.93759, -0.00058, 1.59014, 0.76456, -16.94, -0.36172, -0.93228, -0.00059, 1.84641, 0.75436, -16.94, 0.35323, -0.93554, -0.00058, 1.71327, 0.80402, -16.51444, -0.00733, -0.89018, 0.45556, 1.71327, 0.9748, -16.52028, -0.00738, 0.89512, 0.44576, 1.71327, 0.80533, -17.35907, -0.00744, -0.88942, -0.45702, 1.71327, 0.97349, -17.35322, -0.00749, 0.89441, -0.44719, 1.92993, 0.89, -17.19789, 0.95285, 0.01267, -0.30318, 1.92758, 0.89, -16.6849, 0.95341, 0.01257, 0.30142, 1.49432, 0.89, -17.20061, -0.9544, 0.01319, -0.29824, 1.49667, 0.89, -16.68219, -0.95497, 0.01309, 0.29641, -0.52708, 0.87318, -1.05, 0.96664, 0.09988, 0.23588, -0.594, 0.95739, -1.05, 0.54875, 0.83599, 0.00042, -0.6771, 0.99975, -1.05, -0.81669, 0.57536, 0.04445, -0.75015, 0.78199, -1.05, -0.96426, 0.25717, 0.06377, -0.77934, 0.61194, -1.05, -0.99027, 0.12939, 0.05127, -0.83492, 0.25001, -1.05, -0.98072, 0.18972, 0.04683, -0.94507, -0.26458, -1.05, -0.53087, -0.8045, 0.26638, -0.52948, -0.28467, -1.05, 0.9794, -0.18234, 0.08679, -0.5248, 0.89148, -3.36375, 0.99831, 0.0581, 0.00118, -0.59432, 0.94657, -3.36375, 0.5382, 0.8428, 0.00441, -0.67004, 0.96817, -3.36375, -0.59636, 0.80272, 0.00145, -0.74808, 0.81115, -3.36375, -0.94713, 0.32086, 0.00175, -0.79047, 0.65665, -3.36375, -0.99052, 0.13728, 0.00402, -0.83617, 0.19014, -3.36375, -0.98762, 0.15684, 0.00249, -0.93218, -0.2864, -3.36375, -0.82881, -0.55943, -0.01065, -0.52582, -0.22141, -3.36375, 0.94167, -0.33654, -0.00109, -0.524, 0.88478, -5.6775, 0.9978, 0.0663, 0.00057, -0.59761, 0.96828, -5.6775, 0.61481, 0.78866, -0.00378, -0.66432, 1.00153, -5.6775, -0.59438, 0.80418, -0.0042, -0.73827, 0.88487, -5.6775, -0.93871, 0.34468, -0.00349, -0.79667, 0.62662, -5.6775, -0.98564, 0.16888, 0.00081, -0.84563, 0.2037, -5.6775, -0.98951, 0.14441, 0.00379, -0.92637, -0.19143, -5.6775, -0.81551, -0.57874, 0.00388, -0.52026, -0.21176, -5.6775, 0.94188, -0.33596, -0.00035, -0.52293, 0.87893, -7.99125, 0.99728, 0.07375, 0.00156, -0.60401, 0.93874, -7.99125, 0.56422, 0.82562, 0.00039, -0.66556, 0.97111, -7.99125, -0.77611, 0.63059, -0.00309, -0.72612, 0.80767, -7.99125, -0.93054, 0.36609, -0.008, -0.79319, 0.5984, -7.99125, -0.97721, 0.21226, -0.0032, -0.85517, 0.25295, -7.99125, -0.9889, 0.14859, 0.00097, -0.92755, -0.23087, -7.99125, -0.81384, -0.58104, 0.00761, -0.51728, -0.28321, -7.99125, 0.94002, -0.34107, 0.00482, -0.5187, 0.8965, -10.305, 0.99695, 0.07808, 0.00137, -0.6089, 0.97194, -10.305, 0.53291, 0.84617, 5e-05, -0.67469, 0.9943, -10.305, -0.82068, 0.57134, 0.00784, -0.71991, 0.78486, -10.305, -0.95691, 0.29038, 0.00193, -0.78333, 0.64888, -10.305, -0.97327, 0.22964, -0.00288, -0.85886, 0.21165, -10.305, -0.98698, 0.16082, -0.00063, -0.93059, -0.29841, -10.305, -0.79979, -0.60027, -0.00334, -0.51569, -0.24552, -10.305, 0.94064, -0.33939, 0.00152, -0.51191, 0.86969, -12.61875, 0.99671, 0.08098, 0.00264, -0.60703, 0.93977, -12.61875, 0.50959, 0.86042, -0.00121, -0.68596, 0.98161, -12.61875, -0.60945, 0.79283, -0.00135, -0.72344, 0.86228, -12.61875, -0.97513, 0.2216, 0.00399, -0.7748, 0.63173, -12.61875, -0.97605, 0.21755, -0.00028, -0.85765, 0.17411, -12.61875, -0.98425, 0.17681, 0.00063, -0.93215, -0.23093, -12.61875, -0.78813, -0.61548, -0.00556, -0.51135, -0.21149, -12.61875, 0.93875, -0.3446, -0.00075, -0.50749, 0.90196, -14.9325, 0.99726, 0.074, 0.00112, -0.5982, 0.96637, -14.9325, 0.43846, 0.89873, 0.00545, -0.69161, 0.982, -14.9325, -0.69584, 0.71819, 0.00218, -0.73296, 0.85331, -14.9325, -0.9745, 0.2244, 0.00131, -0.77237, 0.6083, -14.9325, -0.97891, 0.20428, 0.00081, -0.85633, 0.25514, -14.9325, -0.98235, 0.18705, 0.00087, -0.93434, -0.18898, -14.9325, -0.79469, -0.60698, 0.00615, -0.50388, -0.25397, -14.9325, 0.93462, -0.35564, 0.00105, -0.51028, 0.86879, -17.24625, 0.99772, 0.06745, -0.00125, -0.58838, 0.9491, -17.24625, 0.52002, 0.85414, -0.00384, -0.68877, 0.99396, -17.24625, -0.69149, 0.72239, -0.00105, -0.74131, 0.78973, -17.24625, -0.97198, 0.23508, 0.00105, -0.77446, 0.64828, -17.24625, -0.98142, 0.1919, -0.00029, -0.85712, 0.25054, -17.24625, -0.98166, 0.19066, -0.0008, -0.94104, -0.2743, -17.24625, -0.79094, -0.61187, 0.00523, -0.5004, -0.25332, -17.24625, 0.93402, -0.35722, 0.00135, -0.51977, 0.89817, -19.56, 0.98904, 0.039, -0.14238, -0.58471, 0.9546, -19.56, 0.53897, 0.84232, -0.00255, -0.68151, 0.97134, -19.56, -0.28659, 0.9564, -0.05616, -0.74478, 0.83169, -19.56, -0.96272, 0.26565, -0.05106, -0.77668, 0.64028, -19.56, -0.98148, 0.17694, -0.07337, -0.85717, 0.16581, -19.56, -0.97922, 0.19289, -0.06261, -0.95162, -0.26973, -19.56, -0.92663, -0.27454, -0.25686, -0.5041, -0.2178, -19.56, 0.79692, -0.58484, -0.15126, 1.31769, 0.87318, -1.05, -0.83365, 0.21536, 0.50857, 1.485, 0.95739, -1.05, -0.25396, 0.96722, 0.00048, 1.69274, 0.99975, -1.05, 0.49263, 0.86765, 0.06703, 1.87539, 0.78199, -1.05, 0.82426, 0.54957, 0.13628, 1.94834, 0.61194, -1.05, 0.94346, 0.30818, 0.12211, 2.08731, 0.25001, -1.05, 0.89509, 0.43289, 0.10685, 2.36267, -0.26458, -1.05, 0.24306, -0.92085, 0.3049, 1.32371, -0.28467, -1.05, -0.88886, -0.41371, 0.19692, 1.312, 0.89148, -3.36375, -0.98958, 0.14398, 0.00293, 1.4858, 0.94657, -3.36375, -0.24749, 0.96888, 0.00507, 1.6751, 0.96817, -3.36375, 0.28486, 0.95857, 0.00173, 1.8702, 0.81115, -3.36375, 0.76309, 0.64628, 0.00352, 1.97618, 0.65665, -3.36375, 0.94485, 0.32737, 0.00958, 2.09042, 0.19014, -3.36375, 0.92942, 0.36898, 0.00586, 2.33045, -0.2864, -3.36375, 0.50974, -0.86017, -0.01638, 1.31456, -0.22141, -3.36375, -0.74571, -0.66626, -0.00215, 1.30999, 0.88478, -5.6775, -0.98648, 0.16388, 0.0014, 1.49403, 0.96828, -5.6775, -0.29768, 0.95465, -0.00457, 1.6608, 1.00153, -5.6775, 0.28351, 0.95896, -0.00501, 1.84567, 0.88487, -5.6775, 0.73666, 0.67623, -0.00685, 1.99168, 0.62662, -5.6775, 0.91921, 0.39375, 0.0019, 2.11408, 0.2037, -5.6775, 0.93939, 0.34274, 0.009, 2.31592, -0.19143, -5.6775, 0.49101, -0.87113, 0.00584, 1.30065, -0.21176, -5.6775, -0.74636, -0.66555, -0.0007, 1.30732, 0.87893, -7.99125, -0.98333, 0.18179, 0.00385, 1.51002, 0.93874, -7.99125, -0.26368, 0.96461, 0.00045, 1.66389, 0.97111, -7.99125, 0.44168, 0.89716, -0.0044, 1.81529, 0.80767, -7.99125, 0.71287, 0.70113, -0.01532, 1.98299, 0.5984, -7.99125, 0.87877, 0.47719, -0.0072, 2.13792, 0.25295, -7.99125, 0.93613, 0.35165, 0.0023, 2.31887, -0.23087, -7.99125, 0.48874, -0.87235, 0.01142, 1.29321, -0.28321, -7.99125, -0.74065, -0.67183, 0.0095, 1.29676, 0.8965, -10.305, -0.98136, 0.19214, 0.00338, 1.52226, 0.97194, -10.305, -0.24428, 0.9697, 6e-05, 1.68672, 0.9943, -10.305, 0.49815, 0.86701, 0.0119, 1.79976, 0.78486, -10.305, 0.79668, 0.60439, 0.00401, 1.95832, 0.64888, -10.305, 0.8613, 0.50806, -0.00637, 2.14716, 0.21165, -10.305, 0.92611, 0.37726, -0.00147, 2.32647, -0.29841, -10.305, 0.47032, -0.88248, -0.00491, 1.28923, -0.24552, -10.305, -0.74255, -0.66979, 0.00299, 1.27978, 0.86969, -12.61875, -0.97997, 0.19905, 0.00648, 1.51758, 0.93977, -12.61875, -0.23052, 0.97307, -0.00137, 1.7149, 0.98161, -12.61875, 0.2939, 0.95583, -0.00163, 1.8086, 0.86228, -12.61875, 0.86944, 0.49396, 0.00889, 1.93699, 0.63173, -12.61875, 0.87354, 0.48676, -0.00064, 2.14412, 0.17411, -12.61875, 0.91223, 0.40968, 0.00147, 2.33038, -0.23093, -12.61875, 0.45587, -0.89001, -0.00804, 1.27837, -0.21149, -12.61875, -0.73677, -0.67614, -0.00147, 1.26874, 0.90196, -14.9325, -0.98322, 0.1824, 0.00277, 1.49549, 0.96637, -14.9325, -0.19153, 0.98147, 0.00596, 1.72903, 0.982, -14.9325, 0.36136, 0.93242, 0.00283, 1.83239, 0.85331, -14.9325, 0.86665, 0.49891, 0.00291, 1.93094, 0.6083, -14.9325, 0.8866, 0.46254, 0.00184, 2.14083, 0.25514, -14.9325, 0.90291, 0.42982, 0.00199, 2.33584, -0.18898, -14.9325, 0.46392, -0.88583, 0.00897, 1.25969, -0.25397, -14.9325, -0.72453, -0.68924, 0.00204, 1.2757, 0.86879, -17.24625, -0.98601, 0.16664, -0.00309, 1.47096, 0.9491, -17.24625, -0.23661, 0.97159, -0.00437, 1.72192, 0.99396, -17.24625, 0.35757, 0.93388, -0.00136, 1.85327, 0.78973, -17.24625, 0.85574, 0.51741, 0.00232, 1.93616, 0.64828, -17.24625, 0.89841, 0.43916, -0.00067, 2.14281, 0.25054, -17.24625, 0.89956, 0.4368, -0.00184, 2.3526, -0.2743, -17.24625, 0.45929, -0.88826, 0.00759, 1.251, -0.25332, -17.24625, -0.72278, -0.69107, 0.00262, 1.29942, 0.89817, -19.56, -0.9369, 0.09237, -0.33718, 1.46177, 0.9546, -19.56, -0.24795, 0.96877, -0.00294, 1.70378, 0.97134, -19.56, 0.11881, 0.99121, -0.05821, 1.86196, 0.83169, -19.56, 0.81828, 0.56448, -0.10851, 1.9417, 0.64028, -19.56, 0.89874, 0.40505, -0.16795, 2.14292, 0.16581, -19.56, 0.88804, 0.43731, -0.14196, 2.37905, -0.26973, -19.56, 0.70206, -0.52001, -0.48653, 1.26025, -0.2178, -19.56, -0.4667, -0.85624, -0.22146, -0.49119, -0.09, -4.05, 0.688, -0.7229, 0.06381, -0.5817, -0.09, -3.81412, 0.91263, 0.08555, 0.39973, -0.68039, -0.09, -3.57699, -0.77974, -0.4386, 0.44681, -0.73825, -0.09, -3.91441, -0.88043, -0.45467, 0.13459, -0.77659, -0.09, -4.24098, -0.80805, -0.54723, -0.21816, -0.67279, -0.09, -4.42319, -0.25002, -0.51567, -0.8195, -0.56989, -0.09, -4.3303, 0.94011, -0.00753, -0.3408, -0.53486, 0.24, -4.05, 0.99857, 0.05317, -0.00618, -0.58887, 0.24, -3.85657, 0.90893, 0.03342, 0.4156, -0.67264, 0.24, -3.70636, -0.4925, 0.14813, 0.85762, -0.71576, 0.24, -3.95454, -0.98508, 0.03631, 0.16823, -0.7591, 0.24, -4.20344, -0.98385, 0.04673, -0.17281, -0.66405, 0.24, -4.28917, -0.56325, 0.13265, -0.81557, -0.57552, 0.24, -4.28993, 0.91775, 0.05133, -0.39383, -0.54969, 0.66, -4.05, 0.87972, 0.4743, -0.03377, -0.58016, 0.66, -3.82623, 0.94411, 0.06111, 0.32391, -0.67033, 0.66, -3.73438, 0.10355, 0.53093, 0.84106, -0.71997, 0.66, -3.94891, -0.94464, 0.27726, 0.17543, -0.76084, 0.66, -4.20576, -0.95446, 0.29735, -0.02422, -0.66224, 0.66, -4.26711, -0.52496, 0.37098, -0.76602, -0.56757, 0.66, -4.31761, 0.71985, 0.18497, -0.66903, 1.864, -0.09, -4.05, 0.46897, -0.88319, 0.00655, 1.84773, -0.09, -3.69377, 0.46371, -0.18114, 0.86727, 1.54353, -0.09, -3.69529, -0.30143, -0.54781, 0.78041, 1.32778, -0.09, -3.88633, -0.66534, -0.71976, 0.19814, 1.27697, -0.09, -4.24303, -0.5718, -0.71927, -0.39458, 1.5536, -0.09, -4.3518, -0.20036, -0.53572, -0.82028, 1.86338, -0.09, -4.42977, 0.85097, -0.2315, -0.47145, 1.81057, 0.24, -4.05, 0.99793, 0.06424, 0.00315, 1.81202, 0.24, -3.76992, 0.66318, 0.12798, 0.73743, 1.56388, 0.24, -3.82061, -0.23288, 0.15149, 0.96063, 1.35124, 0.24, -3.91101, -0.92293, 0.08923, 0.37448, 1.37582, 0.24, -4.17584, -0.91791, 0.13372, -0.37359, 1.55901, 0.24, -4.30309, -0.23252, 0.07578, -0.96964, 1.80445, 0.24, -4.31954, 0.64389, 0.15783, -0.74866, 1.8292, 0.66, -4.05, 0.63918, 0.76865, -0.02519, 1.81028, 0.66, -3.77235, 0.85296, 0.265, 0.44971, 1.5669, 0.66, -3.83533, -0.21284, 0.41633, 0.88395, 1.32666, 0.66, -3.89785, -0.58921, 0.6105, 0.52926, 1.40787, 0.66, -4.15869, -0.77009, 0.57807, -0.2698, 1.55082, 0.66, -4.34298, -0.3726, 0.47171, -0.79917, 1.78527, 0.66, -4.2928, 0.45471, 0.22653, -0.86135, -0.51999, -0.09, -9.85, 0.76403, -0.64456, 0.0283, -0.56797, -0.09, -9.56248, 0.88747, -0.00602, 0.46083, -0.67797, -0.09, -9.40876, -0.7366, -0.45763, 0.49798, -0.73605, -0.09, -9.71759, -0.89752, -0.41786, 0.14089, -0.79034, -0.09, -10.06085, -0.81135, -0.51905, -0.26888, -0.66722, -0.09, -10.1499, -0.46178, -0.44812, -0.76547, -0.55125, -0.09, -10.20042, 0.96288, -0.08626, -0.25579, -0.55798, 0.24, -9.85, 0.99896, 0.0454, -0.00388, -0.57398, 0.24, -9.60471, 0.90711, 0.04868, 0.41806, -0.66821, 0.24, -9.56026, -0.48407, 0.15875, 0.86051, -0.72656, 0.24, -9.74009, -0.98646, 0.02418, 0.16219, -0.75757, 0.24, -10.00139, -0.98511, 0.05386, -0.16327, -0.66206, 0.24, -10.06499, -0.53566, 0.08821, -0.83981, -0.56443, 0.24, -10.12855, 0.91154, 0.07719, -0.4039, -0.56481, 0.66, -9.85, 0.90365, 0.42825, -0.00442, -0.56656, 0.66, -9.57888, 0.96756, 0.11133, 0.2268, -0.66496, 0.66, -9.59982, -0.30928, 0.46115, 0.83168, -0.73956, 0.66, -9.72271, -0.92866, 0.29087, 0.23018, -0.74731, 0.66, -9.98767, -0.95688, 0.282, -0.06964, -0.66342, 0.66, -10.08149, -0.55475, 0.35453, -0.7527, -0.56418, 0.66, -10.12944, 0.63243, 0.23188, -0.7391, 1.87334, -0.09, -9.85, 0.45175, -0.89208, 0.01095, 1.86276, -0.09, -9.47116, 0.39493, -0.22165, 0.89157, 1.55527, -0.09, -9.55702, -0.23556, -0.50753, 0.82881, 1.26383, -0.09, -9.64938, -0.6702, -0.7352, 0.10154, 1.34466, -0.09, -10.00392, -0.64861, -0.68878, -0.32386, 1.53927, -0.09, -10.22714, -0.09859, -0.61261, -0.78422, 1.83787, -0.09, -10.19138, 0.8155, -0.123, -0.56554, 1.85058, 0.24, -9.85, 0.99868, 0.04905, 0.01547, 1.80179, 0.24, -9.58417, 0.67756, 0.1433, 0.72137, 1.5662, 0.24, -9.63192, -0.25349, 0.09617, 0.96255, 1.31951, 0.24, -9.69403, -0.9134, 0.1272, 0.38668, 1.42359, 0.24, -9.95028, -0.91746, 0.10616, -0.38341, 1.54559, 0.24, -10.16844, -0.23425, 0.11445, -0.96542, 1.76973, 0.24, -10.07116, 0.64233, 0.16384, -0.74871, 1.88778, 0.66, -9.85, 0.56615, 0.81831, -0.09917, 1.78137, 0.66, -9.61263, 0.7867, 0.20704, 0.58159, 1.56134, 0.66, -9.60827, -0.17153, 0.40854, 0.89648, 1.32544, 0.66, -9.6972, -0.54341, 0.66607, 0.51094, 1.43258, 0.66, -9.94547, -0.74107, 0.59387, -0.31327, 1.54012, 0.66, -10.19504, -0.49972, 0.51493, -0.69651, 1.74837, 0.66, -10.04139, 0.60875, 0.10069, -0.78695, -0.5432, -0.09, -15.3, 0.79873, -0.60168, 0.00447, -0.54971, -0.09, -14.94377, 0.79453, -0.12415, 0.5944, -0.67139, -0.09, -14.94529, -0.62007, -0.45075, 0.64214, -0.75769, -0.09, -15.13633, -0.91233, -0.39478, 0.10868, -0.77801, -0.09, -15.49303, -0.86732, -0.4364, -0.2394, -0.66736, -0.09, -15.6018, -0.45523, -0.48686, -0.74548, -0.54345, -0.09, -15.67978, 0.97085, -0.10565, -0.21515, -0.56457, 0.24, -15.3, 0.99967, 0.02574, 0.00126, -0.56399, 0.24, -15.01992, 0.91143, 0.07036, 0.40539, -0.66325, 0.24, -15.07061, -0.51366, 0.13365, 0.84752, -0.7483, 0.24, -15.16101, -0.98637, 0.03815, 0.16009, -0.73847, 0.24, -15.42584, -0.98538, 0.05742, -0.16042, -0.6652, 0.24, -15.55309, -0.51303, 0.06688, -0.85576, -0.56702, 0.24, -15.56954, 0.90317, 0.08855, -0.42005, -0.55712, 0.66, -15.3, 0.90107, 0.43344, -0.0142, -0.56469, 0.66, -15.02234, 0.97132, 0.12071, 0.20484, -0.66204, 0.66, -15.08533, -0.47826, 0.3742, 0.79451, -0.75814, 0.66, -15.14785, -0.87677, 0.36338, 0.31502, -0.72565, 0.66, -15.40869, -0.94925, 0.28502, -0.13303, -0.66847, 0.66, -15.59298, -0.70843, 0.35875, -0.6078, -0.57469, 0.66, -15.5428, 0.78717, 0.15686, -0.59645, 1.94143, -0.09, -15.3, 0.39445, -0.91761, 0.04901, 1.83334, -0.09, -14.96544, 0.51658, -0.08449, 0.85206, 1.5515, -0.09, -14.9872, -0.24663, -0.54324, 0.80254, 1.24882, -0.09, -15.0907, -0.63043, -0.77304, 0.07046, 1.38697, -0.09, -15.42946, -0.62757, -0.73237, -0.26419, 1.52414, -0.09, -15.75666, 0.04016, -0.65083, -0.75816, 1.79079, -0.09, -15.57054, 0.73045, 0.08332, -0.67786, 1.91028, 0.24, -15.3, 0.99596, 0.08798, 0.01781, 1.76576, 0.24, -15.08437, 0.67644, 0.14836, 0.7214, 1.55632, 0.24, -15.03379, -0.26546, 0.08467, 0.9604, 1.33957, 0.24, -15.15476, -0.90405, 0.14102, 0.4035, 1.42747, 0.24, -15.3982, -0.91559, 0.05804, -0.39791, 1.53891, 0.24, -15.65096, -0.25835, 0.151, -0.95418, 1.73869, 0.24, -15.47791, 0.65672, 0.12866, -0.74308, 1.93185, 0.66, -15.3, 0.48743, 0.85739, -0.16521, 1.74544, 0.66, -15.11269, 0.70025, 0.08688, 0.70859, 1.54804, 0.66, -14.99352, -0.01223, 0.46462, 0.88542, 1.37056, 0.66, -15.17134, -0.60291, 0.68834, 0.40334, 1.40513, 0.66, -15.41016, -0.72875, 0.63157, -0.26465, 1.5412, 0.66, -15.63982, -0.50169, 0.505, -0.70234, 1.73479, 0.66, -15.47247, 0.65568, 0.01733, -0.75484, -0.61323, 0.795, -1.15, -0.539, 0.8423, 0.00232, -0.13323, 0.81, -1.15, -0.00872, 0.99996, 4e-05, 0.48677, 0.81, -1.15, 0.0048, 0.99999, -2e-05, 1.42677, 0.804, -1.15, 0.18261, 0.98318, 0.00299, 1.83689, 0.62605, -1.15, 0.66167, 0.74972, -0.01037, 2.18418, 0.23886, -1.15, 0.82225, 0.56777, -0.0392, 2.47608, -0.22111, -1.15, 0.13441, -0.99091, 0.0057, 0.20945, -0.25903, -1.15, -0.01338, -0.99947, 0.02964, -0.54102, -0.20982, -1.15, -0.64123, -0.76538, 0.055, -0.66648, 0.17661, -1.15, -0.99914, 0.025, 0.03309, -0.61885, 0.795, -2.45714, -0.74872, 0.66276, 0.01283, -0.13885, 0.81, -2.45714, -0.01364, 0.99991, 4e-05, 0.48115, 0.81, -2.45714, 0.00385, 0.99999, -1e-05, 1.42115, 0.804, -2.45714, 0.11617, 0.99322, -0.003, 1.77446, 0.67157, -2.45714, 0.61499, 0.78837, -0.01597, 2.10484, 0.27666, -2.45714, 0.8138, 0.58054, -0.02643, 2.39332, -0.21964, -2.45714, 0.26873, -0.96315, -0.01161, 0.14184, -0.295, -2.45714, 0.00525, -0.99999, -8e-05, -0.5974, -0.256, -2.45714, -0.45392, -0.89094, 0.01363, -0.73222, 0.15516, -2.45714, -0.99954, -0.01403, 0.02703, -0.61932, 0.795, -3.76429, -0.72407, 0.68972, 0.00366, -0.13932, 0.81, -3.76429, -0.01364, 0.99991, 1e-05, 0.48068, 0.81, -3.76429, 0.00385, 0.99999, -0.0, 1.42068, 0.804, -3.76429, 0.13025, 0.99148, 0.00092, 1.76589, 0.63402, -3.76429, 0.63787, 0.77013, -0.00528, 2.0851, 0.23104, -3.76429, 0.81288, 0.58235, -0.00937, 2.383, -0.2388, -3.76429, 0.26184, -0.96509, -0.0061, 0.14756, -0.2732, -3.76429, -0.00124, -1.0, 0.00173, -0.59284, -0.20974, -3.76429, -0.45208, -0.89198, -0.0012, -0.74429, 0.19087, -3.76429, -0.99989, -0.01354, 0.00667, -0.62002, 0.795, -5.07143, -0.72351, 0.69031, 0.00172, -0.14002, 0.81, -5.07143, -0.01364, 0.99991, -1e-05, 0.47998, 0.81, -5.07143, 0.00385, 0.99999, 1e-05, 1.41998, 0.804, -5.07143, 0.12032, 0.99274, 0.00036, 1.74555, 0.65803, -5.07143, 0.63893, 0.76925, 0.00466, 2.06599, 0.27771, -5.07143, 0.80629, 0.59148, 0.00716, 2.38054, -0.2048, -5.07143, 0.27108, -0.9625, 0.01069, 0.15244, -0.27759, -5.07143, 0.00606, -0.99998, -0.00364, -0.60081, -0.24921, -5.07143, -0.43499, -0.90043, -0.00335, -0.76623, 0.1462, -5.07143, -0.99977, -0.02165, 0.00066, -0.61692, 0.795, -6.37857, -0.71937, 0.69461, -0.00418, -0.13692, 0.81, -6.37857, -0.01364, 0.99991, -3e-05, 0.48308, 0.81, -6.37857, 0.00385, 0.99999, 1e-05, 1.42308, 0.804, -6.37857, 0.12423, 0.99225, 0.00058, 1.77066, 0.65112, -6.37857, 0.6302, 0.77627, 0.01578, 2.10402, 0.23692, -6.37857, 0.80108, 0.59785, 0.02895, 2.43249, -0.2486, -6.37857, 0.26811, -0.96339, -0.00094, 0.19867, -0.29126, -6.37857, -0.00095, -0.99999, 0.00492, -0.57147, -0.22239, -6.37857, -0.44365, -0.89613, -0.01104, -0.73987, 0.1932, -6.37857, -0.99823, -0.05543, -0.02162, -0.61332, 0.795, -7.68571, -0.74468, 0.66736, -0.00911, -0.13332, 0.81, -7.68571, -0.01364, 0.99991, -2e-05, 0.48668, 0.81, -7.68571, 0.00385, 0.99999, -0.0, 1.42668, 0.804, -7.68571, 0.12139, 0.9926, 0.00147, 1.80823, 0.6399, -7.68571, 0.60344, 0.7974, 0.00379, 2.15846, 0.26578, -7.68571, 0.78936, 0.61387, 0.00866, 2.48984, -0.2015, -7.68571, 0.26679, -0.96359, 0.01794, 0.24063, -0.26157, -7.68571, 0.00468, -0.99998, -0.00498, -0.54034, -0.23258, -7.68571, -0.42659, -0.90444, -0.00128, -0.69894, 0.15085, -7.68571, -0.99757, -0.0692, -0.00845, -0.61519, 0.795, -8.99286, -0.74263, 0.66969, 0.00441, -0.13519, 0.81, -8.99286, -0.01364, 0.99991, 1e-05, 0.48481, 0.81, -8.99286, 0.00385, 0.99999, -0.0, 1.42481, 0.804, -8.99286, 0.11844, 0.99296, -0.00269, 1.78804, 0.66758, -8.99286, 0.60087, 0.79933, -0.00449, 2.14904, 0.25313, -8.99286, 0.79621, 0.60502, -0.00196, 2.47056, -0.24491, -8.99286, 0.26837, -0.96321, -0.01427, 0.2055, -0.30288, -8.99286, 0.00119, -0.99999, 0.00513, -0.57378, -0.24053, -8.99286, -0.44864, -0.89367, 0.00865, -0.71567, 0.18227, -8.99286, -0.9988, -0.04867, 0.00538, -0.61554, 0.795, -10.3, -0.74339, 0.66886, -0.00094, -0.13554, 0.81, -10.3, -0.01364, 0.99991, 2e-05, 0.48446, 0.81, -10.3, 0.00385, 0.99999, -1e-05, 1.42446, 0.804, -10.3, 0.12796, 0.99178, 0.00127, 1.79548, 0.62755, -10.3, 0.60588, 0.79546, -0.01193, 2.15472, 0.24769, -10.3, 0.79454, 0.60675, -0.02346, 2.4595, -0.21164, -10.3, 0.25913, -0.96584, 0.00268, 0.18758, -0.25608, -10.3, 0.00201, -0.99999, -0.00415, -0.57851, -0.21562, -10.3, -0.44151, -0.89723, 0.00716, -0.70673, 0.16644, -10.3, -0.99964, -0.0237, 0.01285, -0.62111, 0.795, -11.60714, -0.72887, 0.68456, 0.01097, -0.14111, 0.81, -11.60714, -0.01364, 0.99991, 3e-05, 0.47889, 0.81, -11.60714, 0.00385, 0.99999, -0.0, 1.41889, 0.804, -11.60714, 0.11821, 0.99299, -0.00213, 1.73941, 0.67399, -11.60714, 0.62732, 0.77874, -0.00515, 2.08541, 0.27041, -11.60714, 0.80946, 0.58704, -0.01247, 2.37657, -0.22983, -11.60714, 0.26769, -0.9634, -0.01391, 0.11086, -0.30142, -11.60714, 0.004, -0.99999, 0.00212, -0.6384, -0.2538, -11.60714, -0.45736, -0.88926, 0.00648, -0.76416, 0.16432, -11.60714, -0.99989, 0.00674, 0.01354, -0.61894, 0.795, -12.91429, -0.72322, 0.6906, -0.00534, -0.13894, 0.81, -12.91429, -0.01364, 0.99991, -2e-05, 0.48106, 0.81, -12.91429, 0.00385, 0.99999, 0.0, 1.42106, 0.804, -12.91429, 0.1296, 0.99156, 0.0029, 1.77359, 0.62803, -12.91429, 0.63773, 0.77021, 0.00854, 2.10276, 0.23378, -12.91429, 0.8112, 0.58476, 0.0047, 2.39154, -0.22942, -12.91429, 0.25886, -0.96591, 0.00332, 0.14143, -0.26427, -12.91429, -0.00048, -1.0, -0.00068, -0.59741, -0.20802, -12.91429, -0.45327, -0.89128, -0.0128, -0.73339, 0.18407, -12.91429, -0.99975, -0.01772, -0.01357, -0.61833, 0.795, -14.22143, -0.73737, 0.67548, -0.00218, -0.13833, 0.81, -14.22143, -0.01364, 0.99991, -2e-05, 0.48167, 0.81, -14.22143, 0.00385, 0.99999, 1e-05, 1.42167, 0.804, -14.22143, 0.11534, 0.99333, -0.00056, 1.77764, 0.66669, -14.22143, 0.62857, 0.77769, 0.00998, 2.09645, 0.27888, -14.22143, 0.81314, 0.58188, 0.01473, 2.39552, -0.21199, -14.22143, 0.2706, -0.96266, 0.00806, 0.16107, -0.28772, -14.22143, 0.00589, -0.99998, -0.00157, -0.57998, -0.2546, -14.22143, -0.44518, -0.89541, -0.00799, -0.73275, 0.14962, -14.22143, -0.99903, -0.04276, -0.01092, -0.61419, 0.795, -15.52857, -0.74108, 0.67139, -0.00677, -0.13419, 0.81, -15.52857, -0.01364, 0.99991, -3e-05, 0.48581, 0.81, -15.52857, 0.00385, 0.99999, 1e-05, 1.42581, 0.804, -15.52857, 0.12389, 0.9923, 0.00065, 1.81729, 0.64107, -15.52857, 0.61666, 0.78719, 0.00725, 2.13839, 0.232, -15.52857, 0.80776, 0.58927, 0.01714, 2.45427, -0.24467, -15.52857, 0.26543, -0.96413, 0.00033, 0.22619, -0.28145, -15.52857, -0.00139, -0.99999, 0.00366, -0.52837, -0.21414, -15.52857, -0.44645, -0.89477, -0.00805, -0.6945, 0.19366, -15.52857, -0.99685, -0.07784, -0.01543, -0.61353, 0.795, -16.83571, -0.75465, 0.65613, 5e-05, -0.13353, 0.81, -16.83571, -0.01364, 0.99991, 1e-05, 0.48647, 0.81, -16.83571, 0.00385, 0.99999, -1e-05, 1.42647, 0.804, -16.83571, 0.11893, 0.9929, -0.00079, 1.81218, 0.64984, -16.83571, 0.60035, 0.79967, -0.01069, 2.14685, 0.2737, -16.83571, 0.79601, 0.60521, -0.00947, 2.47603, -0.20159, -16.83571, 0.27017, -0.96276, 0.01054, 0.24125, -0.2696, -16.83571, 0.00568, -0.99997, -0.00449, -0.53008, -0.24248, -16.83571, -0.42751, -0.90396, 0.01005, -0.69814, 0.14657, -16.83571, -0.99765, -0.06708, 0.01413, -0.61679, 0.795, -18.14286, -0.73133, 0.68194, 0.0103, -0.13679, 0.81, -18.14286, -0.01364, 0.99991, 3e-05, 0.48321, 0.81, -18.14286, 0.00385, 0.99999, -1e-05, 1.42321, 0.804, -18.14286, 0.12386, 0.9923, -0.00227, 1.76469, 0.65922, -18.14286, 0.612, 0.79077, -0.01172, 2.11611, 0.24337, -18.14286, 0.79574, 0.60555, -0.01091, 2.44714, -0.24867, -18.14286, 0.26855, -0.96311, -0.01717, 0.19657, -0.2978, -18.14286, -0.00016, -0.99999, 0.00538, -0.58476, -0.23046, -18.14286, -0.44428, -0.89579, 0.01308, -0.74219, 0.18972, -18.14286, -0.99931, -0.03217, 0.01841, -0.6181, 0.795, -19.45, -0.86246, 0.50612, 0.00113, -0.1381, 0.81, -19.45, -0.01898, 0.99982, 2e-05, 0.4819, 0.81, -19.45, 0.00275, 1.0, -0.0, 1.4219, 0.804, -19.45, 0.08247, 0.99659, -8e-05, 1.75235, 0.63309, -19.45, 0.5558, 0.83117, -0.01539, 2.1137, 0.25783, -19.45, 0.77168, 0.636, -0.00305, 2.43404, -0.20457, -19.45, 0.52896, -0.84789, -0.03574, 0.16802, -0.25743, -19.45, 0.01301, -0.9994, -0.03225, -0.61058, -0.22437, -19.45, -0.27253, -0.96209, -0.01061, -0.75115, 0.15692, -19.45, -0.99345, -0.11383, 0.01018, -0.61323, 0.795, -1.15, 0.0, 0.0, 1.0, -0.13323, 0.81, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, -0.13323, 0.81, -1.15, 0.0, 0.0, 1.0, 0.48677, 0.81, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, 0.48677, 0.81, -1.15, 0.0, 0.0, 1.0, 1.42677, 0.804, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, 1.42677, 0.804, -1.15, 0.0, 0.0, 1.0, 1.83689, 0.62605, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, 1.83689, 0.62605, -1.15, 0.0, 0.0, 1.0, 2.18418, 0.23886, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, 2.18418, 0.23886, -1.15, 0.0, 0.0, 1.0, 2.47608, -0.22111, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, 2.47608, -0.22111, -1.15, 0.0, 0.0, 1.0, 0.20945, -0.25903, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, 0.20945, -0.25903, -1.15, 0.0, 0.0, 1.0, -0.54102, -0.20982, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, -0.54102, -0.20982, -1.15, 0.0, 0.0, 1.0, -0.66648, 0.17661, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, -0.66648, 0.17661, -1.15, 0.0, 0.0, 1.0, -0.61323, 0.795, -1.15, 0.0, 0.0, 1.0, 0.66662, 0.35706, -1.15, 0.0, 0.0, 1.0, -0.6181, 0.795, -19.45, 0.0, 0.0, -1.0, -0.1381, 0.81, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, -0.1381, 0.81, -19.45, 0.0, 0.0, -1.0, 0.4819, 0.81, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, 0.4819, 0.81, -19.45, 0.0, 0.0, -1.0, 1.4219, 0.804, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, 1.4219, 0.804, -19.45, 0.0, 0.0, -1.0, 1.75235, 0.63309, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, 1.75235, 0.63309, -19.45, 0.0, 0.0, -1.0, 2.1137, 0.25783, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, 2.1137, 0.25783, -19.45, 0.0, 0.0, -1.0, 2.43404, -0.20457, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, 2.43404, -0.20457, -19.45, 0.0, 0.0, -1.0, 0.16802, -0.25743, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, 0.16802, -0.25743, -19.45, 0.0, 0.0, -1.0, -0.61058, -0.22437, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, -0.61058, -0.22437, -19.45, 0.0, 0.0, -1.0, -0.75115, 0.15692, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, -0.75115, 0.15692, -19.45, 0.0, 0.0, -1.0, -0.6181, 0.795, -19.45, 0.0, 0.0, -1.0, 0.6254, 0.35805, -19.45, 0.0, 0.0, -1.0, -0.55866, 0.8993, -1.15, -0.95102, 0.21915, 0.21803, -0.58566, 0.92058, -1.882, -0.96975, 0.23619, 0.06169, -0.58566, 0.33048, -1.882, -0.95475, -0.29144, 0.05935, -0.55866, 0.8993, -1.15, -0.95102, 0.21915, 0.21803, -0.58566, 0.33048, -1.882, -0.95475, -0.29144, 0.05935, -0.55866, 0.22646, -1.15, -0.82601, -0.52722, 0.19935, -0.58566, 0.92058, -1.882, -0.96975, 0.23619, 0.06169, -0.64135, 0.88217, -2.614, -0.9762, 0.21608, 0.01828, -0.64135, 0.20105, -2.614, -0.94992, -0.2966, 0.09842, -0.58566, 0.92058, -1.882, -0.96975, 0.23619, 0.06169, -0.64135, 0.20105, -2.614, -0.94992, -0.2966, 0.09842, -0.58566, 0.33048, -1.882, -0.95475, -0.29144, 0.05935, -0.64135, 0.88217, -2.614, -0.9762, 0.21608, 0.01828, -0.64225, 0.89808, -3.346, -0.97682, 0.2102, -0.04053, -0.64225, 0.1281, -3.346, -0.97035, -0.23863, -0.03829, -0.64135, 0.88217, -2.614, -0.9762, 0.21608, 0.01828, -0.64225, 0.1281, -3.346, -0.97035, -0.23863, -0.03829, -0.64135, 0.20105, -2.614, -0.94992, -0.2966, 0.09842, -0.64225, 0.89808, -3.346, -0.97682, 0.2102, -0.04053, -0.58701, 0.91257, -4.078, -0.97554, 0.21364, -0.0518, -0.58701, 0.22764, -4.078, -0.96657, -0.23879, -0.09337, -0.64225, 0.89808, -3.346, -0.97682, 0.2102, -0.04053, -0.58701, 0.22764, -4.078, -0.96657, -0.23879, -0.09337, -0.64225, 0.1281, -3.346, -0.97035, -0.23863, -0.03829, -0.58701, 0.91257, -4.078, -0.97554, 0.21364, -0.0518, -0.55844, 0.90085, -4.81, -0.97438, 0.22404, 0.01962, -0.55844, 0.31049, -4.81, -0.96046, -0.27841, -0.00074, -0.58701, 0.91257, -4.078, -0.97554, 0.21364, -0.0518, -0.55844, 0.31049, -4.81, -0.96046, -0.27841, -0.00074, -0.58701, 0.22764, -4.078, -0.96657, -0.23879, -0.09337, -0.55844, 0.90085, -4.81, -0.97438, 0.22404, 0.01962, -0.59936, 0.87602, -5.542, -0.97448, 0.21454, 0.06607, -0.59936, 0.20698, -5.542, -0.95559, -0.28129, 0.08785, -0.55844, 0.90085, -4.81, -0.97438, 0.22404, 0.01962, -0.59936, 0.20698, -5.542, -0.95559, -0.28129, 0.08785, -0.55844, 0.31049, -4.81, -0.96046, -0.27841, -0.00074, -0.59936, 0.87602, -5.542, -0.97448, 0.21454, 0.06607, -0.64844, 0.93049, -6.274, -0.97685, 0.21366, 0.01045, -0.64844, 0.16158, -6.274, -0.96775, -0.24988, 0.03196, -0.59936, 0.87602, -5.542, -0.97448, 0.21454, 0.06607, -0.64844, 0.16158, -6.274, -0.96775, -0.24988, 0.03196, -0.59936, 0.20698, -5.542, -0.95559, -0.28129, 0.08785, -0.64844, 0.93049, -6.274, -0.97685, 0.21366, 0.01045, -0.6321, 0.88606, -7.006, -0.97354, 0.21942, -0.06391, -0.6321, 0.18914, -7.006, -0.96505, -0.25503, -0.06037, -0.64844, 0.93049, -6.274, -0.97685, 0.21366, 0.01045, -0.6321, 0.18914, -7.006, -0.96505, -0.25503, -0.06037, -0.64844, 0.16158, -6.274, -0.96775, -0.24988, 0.03196, -0.6321, 0.88606, -7.006, -0.97354, 0.21942, -0.06391, -0.57484, 0.89552, -7.738, -0.97262, 0.23013, -0.03248, -0.57484, 0.3033, -7.738, -0.96183, -0.2665, -0.06219, -0.6321, 0.88606, -7.006, -0.97354, 0.21942, -0.06391, -0.57484, 0.3033, -7.738, -0.96183, -0.2665, -0.06219, -0.6321, 0.18914, -7.006, -0.96505, -0.25503, -0.06037, -0.57484, 0.89552, -7.738, -0.97262, 0.23013, -0.03248, -0.56249, 0.90159, -8.47, -0.97763, 0.20513, 0.04638, -0.56249, 0.24441, -8.47, -0.96208, -0.27037, 0.03612, -0.57484, 0.89552, -7.738, -0.97262, 0.23013, -0.03248, -0.56249, 0.24441, -8.47, -0.96208, -0.27037, 0.03612, -0.57484, 0.3033, -7.738, -0.96183, -0.2665, -0.06219, -0.56249, 0.90159, -8.47, -0.97763, 0.20513, 0.04638, -0.61356, 0.91966, -9.202, -0.97794, 0.20292, 0.0496, -0.61356, 0.15342, -9.202, -0.9651, -0.25207, 0.07103, -0.56249, 0.90159, -8.47, -0.97763, 0.20513, 0.04638, -0.61356, 0.15342, -9.202, -0.9651, -0.25207, 0.07103, -0.56249, 0.24441, -8.47, -0.96208, -0.27037, 0.03612, -0.61356, 0.91966, -9.202, -0.97794, 0.20292, 0.0496, -0.6515, 0.86623, -9.934, -0.97282, 0.23145, -0.00758, -0.6515, 0.15761, -9.934, -0.96636, -0.257, -0.00966, -0.61356, 0.91966, -9.202, -0.97794, 0.20292, 0.0496, -0.6515, 0.15761, -9.934, -0.96636, -0.257, -0.00966, -0.61356, 0.15342, -9.202, -0.9651, -0.25207, 0.07103, -0.6515, 0.86623, -9.934, -0.97282, 0.23145, -0.00758, -0.61943, 0.92356, -10.666, -0.9683, 0.24325, -0.0568, -0.61943, 0.32788, -10.666, -0.95958, -0.27528, -0.05847, -0.6515, 0.86623, -9.934, -0.97282, 0.23145, -0.00758, -0.61943, 0.32788, -10.666, -0.95958, -0.27528, -0.05847, -0.6515, 0.15761, -9.934, -0.96636, -0.257, -0.00966, -0.61943, 0.92356, -10.666, -0.9683, 0.24325, -0.0568, -0.56543, 0.89903, -11.398, -0.97969, 0.19935, -0.02167, -0.56543, 0.25331, -11.398, -0.96111, -0.27597, -0.01073, -0.61943, 0.92356, -10.666, -0.9683, 0.24325, -0.0568, -0.56543, 0.25331, -11.398, -0.96111, -0.27597, -0.01073, -0.61943, 0.32788, -10.666, -0.95958, -0.27528, -0.05847, -0.56543, 0.89903, -11.398, -0.97969, 0.19935, -0.02167, -0.57044, 0.89261, -12.13, -0.98005, 0.19269, 0.04869, -0.57044, 0.1306, -12.13, -0.97046, -0.23874, 0.03476, -0.56543, 0.89903, -11.398, -0.97969, 0.19935, -0.02167, -0.57044, 0.1306, -12.13, -0.97046, -0.23874, 0.03476, -0.56543, 0.25331, -11.398, -0.96111, -0.27597, -0.01073, -0.57044, 0.89261, -12.13, -0.98005, 0.19269, 0.04869, -0.62696, 0.89243, -12.862, -0.97146, 0.23054, 0.05588, -0.62696, 0.17264, -12.862, -0.96875, -0.24705, 0.02189, -0.57044, 0.89261, -12.13, -0.98005, 0.19269, 0.04869, -0.62696, 0.17264, -12.862, -0.96875, -0.24705, 0.02189, -0.57044, 0.1306, -12.13, -0.97046, -0.23874, 0.03476, -0.62696, 0.89243, -12.862, -0.97146, 0.23054, 0.05588, -0.65026, 0.9264, -13.594, -0.96796, 0.24846, -0.03633, -0.65026, 0.32574, -13.594, -0.95482, -0.29701, 0.00987, -0.62696, 0.89243, -12.862, -0.97146, 0.23054, 0.05588, -0.65026, 0.32574, -13.594, -0.95482, -0.29701, 0.00987, -0.62696, 0.17264, -12.862, -0.96875, -0.24705, 0.02189, -0.65026, 0.9264, -13.594, -0.96796, 0.24846, -0.03633, -0.60542, 0.87528, -14.326, -0.97545, 0.2112, -0.06241, -0.60542, 0.2404, -14.326, -0.958, -0.28591, -0.022, -0.65026, 0.9264, -13.594, -0.96796, 0.24846, -0.03633, -0.60542, 0.2404, -14.326, -0.958, -0.28591, -0.022, -0.65026, 0.32574, -13.594, -0.95482, -0.29701, 0.00987, -0.60542, 0.87528, -14.326, -0.97545, 0.2112, -0.06241, -0.55965, 0.90276, -15.058, -0.98201, 0.18882, 0.00252, -0.55965, 0.14645, -15.058, -0.97301, -0.22861, -0.03145, -0.60542, 0.87528, -14.326, -0.97545, 0.2112, -0.06241, -0.55965, 0.14645, -15.058, -0.97301, -0.22861, -0.03145, -0.60542, 0.2404, -14.326, -0.958, -0.28591, -0.022, -0.55965, 0.90276, -15.058, -0.98201, 0.18882, 0.00252, -0.58156, 0.91489, -15.79, -0.97531, 0.21238, 0.0605, -0.58156, 0.18464, -15.79, -0.97148, -0.23687, 0.01129, -0.55965, 0.90276, -15.058, -0.98201, 0.18882, 0.00252, -0.58156, 0.18464, -15.79, -0.97148, -0.23687, 0.01129, -0.55965, 0.14645, -15.058, -0.97301, -0.22861, -0.03145, -0.58156, 0.91489, -15.79, -0.97531, 0.21238, 0.0605, -0.63831, 0.89099, -16.522, -0.9686, 0.24767, 0.02196, -0.63831, 0.28393, -16.522, -0.95277, -0.29805, 0.05832, -0.58156, 0.91489, -15.79, -0.97531, 0.21238, 0.0605, -0.63831, 0.28393, -16.522, -0.95277, -0.29805, 0.05832, -0.58156, 0.18464, -15.79, -0.97148, -0.23687, 0.01129, -0.63831, 0.89099, -16.522, -0.9686, 0.24767, 0.02196, -0.64482, 0.88897, -17.254, -0.97159, 0.23362, -0.03794, -0.64482, 0.26412, -17.254, -0.95586, -0.29361, 0.01119, -0.63831, 0.89099, -16.522, -0.9686, 0.24767, 0.02196, -0.64482, 0.26412, -17.254, -0.95586, -0.29361, 0.01119, -0.63831, 0.28393, -16.522, -0.95277, -0.29805, 0.05832, -0.64482, 0.88897, -17.254, -0.97159, 0.23362, -0.03794, -0.59134, 0.91864, -17.986, -0.98029, 0.1899, -0.05447, -0.59134, 0.16941, -17.986, -0.96905, -0.24153, -0.05104, -0.64482, 0.88897, -17.254, -0.97159, 0.23362, -0.03794, -0.59134, 0.16941, -17.986, -0.96905, -0.24153, -0.05104, -0.64482, 0.26412, -17.254, -0.95586, -0.29361, 0.01119, -0.59134, 0.91864, -17.986, -0.98029, 0.1899, -0.05447, -0.55803, 0.89773, -18.718, -0.98009, 0.19818, 0.01192, -0.55803, 0.15793, -18.718, -0.97316, -0.22638, -0.04136, -0.59134, 0.91864, -17.986, -0.98029, 0.1899, -0.05447, -0.55803, 0.15793, -18.718, -0.97316, -0.22638, -0.04136, -0.59134, 0.16941, -17.986, -0.96905, -0.24153, -0.05104, -0.55803, 0.89773, -18.718, -0.98009, 0.19818, 0.01192, -0.59483, 0.87943, -19.45, -0.93078, 0.2203, -0.29175, -0.59483, 0.26464, -19.45, -0.99024, -0.1209, -0.06939, -0.55803, 0.89773, -18.718, -0.98009, 0.19818, 0.01192, -0.59483, 0.26464, -19.45, -0.99024, -0.1209, -0.06939, -0.55803, 0.15793, -18.718, -0.97316, -0.22638, -0.04136, 1.39665, 0.8699, -1.15, 0.9116, 0.24944, 0.32675, 1.46416, 0.31909, -1.882, 0.80281, -0.59288, 0.06319, 1.46416, 0.90918, -1.882, 0.85706, 0.49263, 0.15084, 1.39665, 0.8699, -1.15, 0.9116, 0.24944, 0.32675, 1.39665, 0.19705, -1.15, 0.62391, -0.40589, 0.66782, 1.46416, 0.31909, -1.882, 0.80281, -0.59288, 0.06319, 1.46416, 0.90918, -1.882, 0.85706, 0.49263, 0.15084, 1.60338, 0.22661, -2.614, 0.79052, -0.58633, 0.17691, 1.60338, 0.90772, -2.614, 0.8767, 0.47816, 0.0525, 1.46416, 0.90918, -1.882, 0.85706, 0.49263, 0.15084, 1.46416, 0.31909, -1.882, 0.80281, -0.59288, 0.06319, 1.60338, 0.22661, -2.614, 0.79052, -0.58633, 0.17691, 1.60338, 0.90772, -2.614, 0.8767, 0.47816, 0.0525, 1.60562, 0.12875, -3.346, 0.84456, -0.53521, -0.01654, 1.60562, 0.89873, -3.346, 0.86879, 0.48025, -0.12067, 1.60338, 0.90772, -2.614, 0.8767, 0.47816, 0.0525, 1.60338, 0.22661, -2.614, 0.79052, -0.58633, 0.17691, 1.60562, 0.12875, -3.346, 0.84456, -0.53521, -0.01654, 1.60562, 0.89873, -3.346, 0.86879, 0.48025, -0.12067, 1.46752, 0.19575, -4.078, 0.81498, -0.53756, -0.2164, 1.46752, 0.88068, -4.078, 0.86672, 0.48951, -0.09576, 1.60562, 0.89873, -3.346, 0.86879, 0.48025, -0.12067, 1.60562, 0.12875, -3.346, 0.84456, -0.53521, -0.01654, 1.46752, 0.19575, -4.078, 0.81498, -0.53756, -0.2164, 1.46752, 0.88068, -4.078, 0.86672, 0.48951, -0.09576, 1.39609, 0.33712, -4.81, 0.81621, -0.57591, -0.04607, 1.39609, 0.92747, -4.81, 0.86397, 0.50086, 0.05198, 1.46752, 0.88068, -4.078, 0.86672, 0.48951, -0.09576, 1.46752, 0.19575, -4.078, 0.81498, -0.53756, -0.2164, 1.39609, 0.33712, -4.81, 0.81621, -0.57591, -0.04607, 1.39609, 0.92747, -4.81, 0.86397, 0.50086, 0.05198, 1.49841, 0.21951, -5.542, 0.80422, -0.55956, 0.2003, 1.49841, 0.88856, -5.542, 0.8776, 0.46161, 0.12936, 1.39609, 0.92747, -4.81, 0.86397, 0.50086, 0.05198, 1.39609, 0.33712, -4.81, 0.81621, -0.57591, -0.04607, 1.49841, 0.21951, -5.542, 0.80422, -0.55956, 0.2003, 1.49841, 0.88856, -5.542, 0.8776, 0.46161, 0.12936, 1.6211, 0.11968, -6.274, 0.83505, -0.54094, 0.1004, 1.6211, 0.88859, -6.274, 0.88389, 0.46704, 0.02464, 1.49841, 0.88856, -5.542, 0.8776, 0.46161, 0.12936, 1.49841, 0.21951, -5.542, 0.80422, -0.55956, 0.2003, 1.6211, 0.11968, -6.274, 0.83505, -0.54094, 0.1004, 1.6211, 0.88859, -6.274, 0.88389, 0.46704, 0.02464, 1.58025, 0.21866, -7.006, 0.81715, -0.55419, -0.15854, 1.58025, 0.91559, -7.006, 0.85478, 0.50658, -0.11283, 1.6211, 0.88859, -6.274, 0.88389, 0.46704, 0.02464, 1.6211, 0.11968, -6.274, 0.83505, -0.54094, 0.1004, 1.58025, 0.21866, -7.006, 0.81715, -0.55419, -0.15854, 1.58025, 0.91559, -7.006, 0.85478, 0.50658, -0.11283, 1.4371, 0.30945, -7.738, 0.80665, -0.57522, -0.13578, 1.4371, 0.90167, -7.738, 0.84515, 0.52515, -0.09971, 1.58025, 0.91559, -7.006, 0.85478, 0.50658, -0.11283, 1.58025, 0.21866, -7.006, 0.81715, -0.55419, -0.15854, 1.4371, 0.30945, -7.738, 0.80665, -0.57522, -0.13578, 1.4371, 0.90167, -7.738, 0.84515, 0.52515, -0.09971, 1.40622, 0.22567, -8.47, 0.81646, -0.57268, 0.0737, 1.40622, 0.88285, -8.47, 0.88767, 0.44834, 0.10502, 1.4371, 0.90167, -7.738, 0.84515, 0.52515, -0.09971, 1.4371, 0.30945, -7.738, 0.80665, -0.57522, -0.13578, 1.40622, 0.22567, -8.47, 0.81646, -0.57268, 0.0737, 1.40622, 0.88285, -8.47, 0.88767, 0.44834, 0.10502, 1.53391, 0.14352, -9.202, 0.83779, -0.52012, 0.16605, 1.53391, 0.90976, -9.202, 0.88815, 0.43957, 0.13403, 1.40622, 0.88285, -8.47, 0.88767, 0.44834, 0.10502, 1.40622, 0.22567, -8.47, 0.81646, -0.57268, 0.0737, 1.53391, 0.14352, -9.202, 0.83779, -0.52012, 0.16605, 1.53391, 0.90976, -9.202, 0.88815, 0.43957, 0.13403, 1.62875, 0.20522, -9.934, 0.83832, -0.54517, -0.00135, 1.62875, 0.91384, -9.934, 0.85578, 0.51635, -0.03193, 1.53391, 0.90976, -9.202, 0.88815, 0.43957, 0.13403, 1.53391, 0.14352, -9.202, 0.83779, -0.52012, 0.16605, 1.62875, 0.20522, -9.934, 0.83832, -0.54517, -0.00135, 1.62875, 0.91384, -9.934, 0.85578, 0.51635, -0.03193, 1.54858, 0.27704, -10.666, 0.7838, -0.60318, -0.14776, 1.54858, 0.87272, -10.666, 0.83225, 0.53654, -0.13956, 1.62875, 0.91384, -9.934, 0.85578, 0.51635, -0.03193, 1.62875, 0.20522, -9.934, 0.83832, -0.54517, -0.00135, 1.54858, 0.27704, -10.666, 0.7838, -0.60318, -0.14776, 1.54858, 0.87272, -10.666, 0.83225, 0.53654, -0.13956, 1.41357, 0.27065, -11.398, 0.80305, -0.59265, -0.06229, 1.41357, 0.91637, -11.398, 0.88567, 0.46376, -0.0227, 1.54858, 0.87272, -10.666, 0.83225, 0.53654, -0.13956, 1.54858, 0.27704, -10.666, 0.7838, -0.60318, -0.14776, 1.41357, 0.27065, -11.398, 0.80305, -0.59265, -0.06229, 1.41357, 0.91637, -11.398, 0.88567, 0.46376, -0.0227, 1.4261, 0.14176, -12.13, 0.85628, -0.50011, 0.12911, 1.4261, 0.90378, -12.13, 0.8963, 0.43086, 0.10493, 1.41357, 0.91637, -11.398, 0.88567, 0.46376, -0.0227, 1.41357, 0.27065, -11.398, 0.80305, -0.59265, -0.06229, 1.4261, 0.14176, -12.13, 0.85628, -0.50011, 0.12911, 1.4261, 0.90378, -12.13, 0.8963, 0.43086, 0.10493, 1.56739, 0.17314, -12.862, 0.84799, -0.52279, 0.08722, 1.56739, 0.89293, -12.862, 0.86661, 0.4884, 0.10228, 1.4261, 0.90378, -12.13, 0.8963, 0.43086, 0.10493, 1.4261, 0.14176, -12.13, 0.85628, -0.50011, 0.12911, 1.56739, 0.17314, -12.862, 0.84799, -0.52279, 0.08722, 1.56739, 0.89293, -12.862, 0.86661, 0.4884, 0.10228, 1.62565, 0.2874, -13.594, 0.7799, -0.62264, -0.06384, 1.62565, 0.88806, -13.594, 0.84078, 0.53897, -0.05101, 1.56739, 0.89293, -12.862, 0.86661, 0.4884, 0.10228, 1.56739, 0.17314, -12.862, 0.84799, -0.52279, 0.08722, 1.62565, 0.2874, -13.594, 0.7799, -0.62264, -0.06384, 1.62565, 0.88806, -13.594, 0.84078, 0.53897, -0.05101, 1.51354, 0.29654, -14.326, 0.79327, -0.60493, -0.06912, 1.51354, 0.93142, -14.326, 0.85658, 0.49768, -0.1363, 1.62565, 0.88806, -13.594, 0.84078, 0.53897, -0.05101, 1.62565, 0.2874, -13.594, 0.7799, -0.62264, -0.06384, 1.51354, 0.29654, -14.326, 0.79327, -0.60493, -0.06912, 1.51354, 0.93142, -14.326, 0.85658, 0.49768, -0.1363, 1.39913, 0.11501, -15.058, 0.85699, -0.51534, -0.00074, 1.39913, 0.87133, -15.058, 0.90014, 0.43538, -0.01352, 1.51354, 0.93142, -14.326, 0.85658, 0.49768, -0.1363, 1.51354, 0.29654, -14.326, 0.79327, -0.60493, -0.06912, 1.39913, 0.11501, -15.058, 0.85699, -0.51534, -0.00074, 1.39913, 0.87133, -15.058, 0.90014, 0.43538, -0.01352, 1.45391, 0.17736, -15.79, 0.86052, -0.50778, 0.04072, 1.45391, 0.90761, -15.79, 0.87912, 0.4528, 0.14875, 1.39913, 0.87133, -15.058, 0.90014, 0.43538, -0.01352, 1.39913, 0.11501, -15.058, 0.85699, -0.51534, -0.00074, 1.45391, 0.17736, -15.79, 0.86052, -0.50778, 0.04072, 1.45391, 0.90761, -15.79, 0.87912, 0.4528, 0.14875, 1.59577, 0.29894, -16.522, 0.80155, -0.59501, 0.05897, 1.59577, 0.906, -16.522, 0.84518, 0.53066, 0.06378, 1.45391, 0.90761, -15.79, 0.87912, 0.4528, 0.14875, 1.45391, 0.17736, -15.79, 0.86052, -0.50778, 0.04072, 1.59577, 0.29894, -16.522, 0.80155, -0.59501, 0.05897, 1.59577, 0.906, -16.522, 0.84518, 0.53066, 0.06378, 1.61206, 0.27939, -17.254, 0.78649, -0.61714, 0.02406, 1.61206, 0.90424, -17.254, 0.84517, 0.52201, -0.11484, 1.59577, 0.906, -16.522, 0.84518, 0.53066, 0.06378, 1.59577, 0.29894, -16.522, 0.80155, -0.59501, 0.05897, 1.61206, 0.27939, -17.254, 0.78649, -0.61714, 0.02406, 1.61206, 0.90424, -17.254, 0.84517, 0.52201, -0.11484, 1.47836, 0.12522, -17.986, 0.82823, -0.55361, -0.08689, 1.47836, 0.87445, -17.986, 0.88891, 0.4446, -0.11029, 1.61206, 0.90424, -17.254, 0.84517, 0.52201, -0.11484, 1.61206, 0.27939, -17.254, 0.78649, -0.61714, 0.02406, 1.47836, 0.12522, -17.986, 0.82823, -0.55361, -0.08689, 1.47836, 0.87445, -17.986, 0.88891, 0.4446, -0.11029, 1.39509, 0.19161, -18.718, 0.86638, -0.49519, -0.06457, 1.39509, 0.9314, -18.718, 0.88972, 0.45493, 0.03792, 1.47836, 0.87445, -17.986, 0.88891, 0.4446, -0.11029, 1.47836, 0.12522, -17.986, 0.82823, -0.55361, -0.08689, 1.39509, 0.19161, -18.718, 0.86638, -0.49519, -0.06457, 1.39509, 0.9314, -18.718, 0.88972, 0.45493, 0.03792, 1.48706, 0.27152, -19.45, 0.78842, -0.50335, -0.35359, 1.48706, 0.8863, -19.45, 0.61137, 0.74079, -0.27832, 1.39509, 0.9314, -18.718, 0.88972, 0.45493, 0.03792, 1.39509, 0.19161, -18.718, 0.86638, -0.49519, -0.06457, 1.48706, 0.27152, -19.45, 0.78842, -0.50335, -0.35359, -0.55866, 0.8993, -1.15, -0.95102, 0.21915, 0.21803, -0.41899, 0.34613, -1.15, 0.34992, -0.78043, 0.51815, -0.41899, 0.89593, -1.15, 0.0448, 0.80953, 0.58537, -0.55866, 0.8993, -1.15, -0.95102, 0.21915, 0.21803, -0.55866, 0.22646, -1.15, -0.82601, -0.52722, 0.19935, -0.41899, 0.34613, -1.15, 0.34992, -0.78043, 0.51815, -0.41899, 0.89593, -1.15, 0.0448, 0.80953, 0.58537, -0.27933, 0.38529, -1.15, 0.12648, -0.85698, 0.49958, -0.27933, 0.88938, -1.15, 0.00772, 0.82976, 0.55806, -0.41899, 0.89593, -1.15, 0.0448, 0.80953, 0.58537, -0.41899, 0.34613, -1.15, 0.34992, -0.78043, 0.51815, -0.27933, 0.38529, -1.15, 0.12648, -0.85698, 0.49958, -0.27933, 0.88938, -1.15, 0.00772, 0.82976, 0.55806, -0.13966, 0.39662, -1.15, 0.07224, -0.87069, 0.48649, -0.13966, 0.89017, -1.15, -0.04577, 0.83393, 0.54997, -0.27933, 0.88938, -1.15, 0.00772, 0.82976, 0.55806, -0.27933, 0.38529, -1.15, 0.12648, -0.85698, 0.49958, -0.13966, 0.39662, -1.15, 0.07224, -0.87069, 0.48649, -0.13966, 0.89017, -1.15, -0.04577, 0.83393, 0.54997, 0.0, 0.41371, -1.15, 0.03716, -0.92687, 0.37353, 0.0, 0.90655, -1.15, -0.03445, 0.84197, 0.53842, -0.13966, 0.89017, -1.15, -0.04577, 0.83393, 0.54997, -0.13966, 0.39662, -1.15, 0.07224, -0.87069, 0.48649, 0.0, 0.41371, -1.15, 0.03716, -0.92687, 0.37353, 0.0, 0.90655, -1.15, -0.03445, 0.84197, 0.53842, 0.34916, 0.42879, -1.15, -0.00857, -0.86729, 0.49773, 0.34916, 0.92233, -1.15, -0.00891, 0.84075, 0.54134, 0.0, 0.90655, -1.15, -0.03445, 0.84197, 0.53842, 0.0, 0.41371, -1.15, 0.03716, -0.92687, 0.37353, 0.34916, 0.42879, -1.15, -0.00857, -0.86729, 0.49773, 0.34916, 0.92233, -1.15, -0.00891, 0.84075, 0.54134, 0.69832, 0.40863, -1.15, -0.10943, -0.87221, 0.47673, 0.69832, 0.91272, -1.15, 0.02424, 0.81661, 0.57668, 0.34916, 0.92233, -1.15, -0.00891, 0.84075, 0.54134, 0.34916, 0.42879, -1.15, -0.00857, -0.86729, 0.49773, 0.69832, 0.40863, -1.15, -0.10943, -0.87221, 0.47673, 0.69832, 0.91272, -1.15, 0.02424, 0.81661, 0.57668, 1.04749, 0.33318, -1.15, -0.26952, -0.84876, 0.45493, 1.04749, 0.88298, -1.15, 0.03317, 0.7644, 0.64389, 0.69832, 0.91272, -1.15, 0.02424, 0.81661, 0.57668, 0.69832, 0.40863, -1.15, -0.10943, -0.87221, 0.47673, 1.04749, 0.33318, -1.15, -0.26952, -0.84876, 0.45493, 1.04749, 0.88298, -1.15, 0.03317, 0.7644, 0.64389, 1.39665, 0.19705, -1.15, 0.62391, -0.40589, 0.66782, 1.39665, 0.8699, -1.15, 0.9116, 0.24944, 0.32675, 1.04749, 0.88298, -1.15, 0.03317, 0.7644, 0.64389, 1.04749, 0.33318, -1.15, -0.26952, -0.84876, 0.45493, 1.39665, 0.19705, -1.15, 0.62391, -0.40589, 0.66782, -0.59483, 0.87943, -19.45, -0.93078, 0.2203, -0.29175, -0.44612, 0.89293, -19.45, -0.05991, 0.8263, -0.56003, -0.44612, 0.40119, -19.45, 0.47669, -0.64387, -0.5985, -0.59483, 0.87943, -19.45, -0.93078, 0.2203, -0.29175, -0.44612, 0.40119, -19.45, 0.47669, -0.64387, -0.5985, -0.59483, 0.26464, -19.45, -0.99024, -0.1209, -0.06939, -0.44612, 0.89293, -19.45, -0.05991, 0.8263, -0.56003, -0.29741, 0.90737, -19.45, -0.04837, 0.8481, -0.52762, -0.29741, 0.46134, -19.45, 0.21944, -0.75571, -0.61705, -0.44612, 0.89293, -19.45, -0.05991, 0.8263, -0.56003, -0.29741, 0.46134, -19.45, 0.21944, -0.75571, -0.61705, -0.44612, 0.40119, -19.45, 0.47669, -0.64387, -0.5985, -0.29741, 0.90737, -19.45, -0.04837, 0.8481, -0.52762, -0.14871, 0.9089, -19.45, -0.00187, 0.85265, -0.52247, -0.14871, 0.47341, -19.45, 0.04106, -0.78844, -0.61375, -0.29741, 0.90737, -19.45, -0.04837, 0.8481, -0.52762, -0.14871, 0.47341, -19.45, 0.04106, -0.78844, -0.61375, -0.29741, 0.46134, -19.45, 0.21944, -0.75571, -0.61705, -0.14871, 0.9089, -19.45, -0.00187, 0.85265, -0.52247, 0.0, 0.90509, -19.45, 0.02428, 0.78129, -0.6237, 0.0, 0.47031, -19.45, -0.02368, -0.78886, -0.61412, -0.14871, 0.9089, -19.45, -0.00187, 0.85265, -0.52247, 0.0, 0.47031, -19.45, -0.02368, -0.78886, -0.61412, -0.14871, 0.47341, -19.45, 0.04106, -0.78844, -0.61375, 0.0, 0.90509, -19.45, 0.02428, 0.78129, -0.6237, 0.37177, 0.90335, -19.45, 0.02181, 0.86258, -0.50544, 0.37177, 0.46787, -19.45, -0.02821, -0.7788, -0.62664, 0.0, 0.90509, -19.45, 0.02428, 0.78129, -0.6237, 0.37177, 0.46787, -19.45, -0.02821, -0.7788, -0.62664, 0.0, 0.47031, -19.45, -0.02368, -0.78886, -0.61412, 0.37177, 0.90335, -19.45, 0.02181, 0.86258, -0.50544, 0.74353, 0.89796, -19.45, 0.01037, 0.85146, -0.52431, 0.74353, 0.45193, -19.45, -0.05664, -0.77232, -0.6327, 0.37177, 0.90335, -19.45, 0.02181, 0.86258, -0.50544, 0.74353, 0.45193, -19.45, -0.05664, -0.77232, -0.6327, 0.37177, 0.46787, -19.45, -0.02821, -0.7788, -0.62664, 0.74353, 0.89796, -19.45, 0.01037, 0.85146, -0.52431, 1.1153, 0.8873, -19.45, -0.0129, 0.79695, -0.60391, 1.1153, 0.39556, -19.45, -0.13677, -0.75926, -0.63625, 0.74353, 0.89796, -19.45, 0.01037, 0.85146, -0.52431, 1.1153, 0.39556, -19.45, -0.13677, -0.75926, -0.63625, 0.74353, 0.45193, -19.45, -0.05664, -0.77232, -0.6327, 1.1153, 0.8873, -19.45, -0.0129, 0.79695, -0.60391, 1.48706, 0.8863, -19.45, 0.61137, 0.74079, -0.27832, 1.48706, 0.27152, -19.45, 0.78842, -0.50335, -0.35359, 1.1153, 0.8873, -19.45, -0.0129, 0.79695, -0.60391, 1.48706, 0.27152, -19.45, 0.78842, -0.50335, -0.35359, 1.1153, 0.39556, -19.45, -0.13677, -0.75926, -0.63625, -0.52708, 0.87318, -1.05, 0.96664, 0.09988, 0.23588, -0.594, 0.95739, -1.05, 0.54875, 0.83599, 0.00042, -0.6771, 0.99975, -1.05, -0.81669, 0.57536, 0.04445, -0.51977, 0.89817, -19.56, 0.98904, 0.039, -0.14238, -0.68151, 0.97134, -19.56, -0.28659, 0.9564, -0.05616, -0.58471, 0.9546, -19.56, 0.53897, 0.84232, -0.00255, -0.52708, 0.87318, -1.05, 0.96664, 0.09988, 0.23588, -0.6771, 0.99975, -1.05, -0.81669, 0.57536, 0.04445, -0.75015, 0.78199, -1.05, -0.96426, 0.25717, 0.06377, -0.51977, 0.89817, -19.56, 0.98904, 0.039, -0.14238, -0.74478, 0.83169, -19.56, -0.96272, 0.26565, -0.05106, -0.68151, 0.97134, -19.56, -0.28659, 0.9564, -0.05616, -0.52708, 0.87318, -1.05, 0.96664, 0.09988, 0.23588, -0.75015, 0.78199, -1.05, -0.96426, 0.25717, 0.06377, -0.77934, 0.61194, -1.05, -0.99027, 0.12939, 0.05127, -0.51977, 0.89817, -19.56, 0.98904, 0.039, -0.14238, -0.77668, 0.64028, -19.56, -0.98148, 0.17694, -0.07337, -0.74478, 0.83169, -19.56, -0.96272, 0.26565, -0.05106, -0.52708, 0.87318, -1.05, 0.96664, 0.09988, 0.23588, -0.77934, 0.61194, -1.05, -0.99027, 0.12939, 0.05127, -0.83492, 0.25001, -1.05, -0.98072, 0.18972, 0.04683, -0.51977, 0.89817, -19.56, 0.98904, 0.039, -0.14238, -0.85717, 0.16581, -19.56, -0.97922, 0.19289, -0.06261, -0.77668, 0.64028, -19.56, -0.98148, 0.17694, -0.07337, -0.52708, 0.87318, -1.05, 0.96664, 0.09988, 0.23588, -0.83492, 0.25001, -1.05, -0.98072, 0.18972, 0.04683, -0.94507, -0.26458, -1.05, -0.53087, -0.8045, 0.26638, -0.51977, 0.89817, -19.56, 0.98904, 0.039, -0.14238, -0.95162, -0.26973, -19.56, -0.92663, -0.27454, -0.25686, -0.85717, 0.16581, -19.56, -0.97922, 0.19289, -0.06261, -0.52708, 0.87318, -1.05, 0.96664, 0.09988, 0.23588, -0.94507, -0.26458, -1.05, -0.53087, -0.8045, 0.26638, -0.52948, -0.28467, -1.05, 0.9794, -0.18234, 0.08679, -0.51977, 0.89817, -19.56, 0.98904, 0.039, -0.14238, -0.5041, -0.2178, -19.56, 0.79692, -0.58484, -0.15126, -0.95162, -0.26973, -19.56, -0.92663, -0.27454, -0.25686, 1.31769, 0.87318, -1.05, -0.83365, 0.21536, 0.50857, 1.69274, 0.99975, -1.05, 0.49263, 0.86765, 0.06703, 1.485, 0.95739, -1.05, -0.25396, 0.96722, 0.00048, 1.29942, 0.89817, -19.56, -0.9369, 0.09237, -0.33718, 1.46177, 0.9546, -19.56, -0.24795, 0.96877, -0.00294, 1.70378, 0.97134, -19.56, 0.11881, 0.99121, -0.05821, 1.31769, 0.87318, -1.05, -0.83365, 0.21536, 0.50857, 1.87539, 0.78199, -1.05, 0.82426, 0.54957, 0.13628, 1.69274, 0.99975, -1.05, 0.49263, 0.86765, 0.06703, 1.29942, 0.89817, -19.56, -0.9369, 0.09237, -0.33718, 1.70378, 0.97134, -19.56, 0.11881, 0.99121, -0.05821, 1.86196, 0.83169, -19.56, 0.81828, 0.56448, -0.10851, 1.31769, 0.87318, -1.05, -0.83365, 0.21536, 0.50857, 1.94834, 0.61194, -1.05, 0.94346, 0.30818, 0.12211, 1.87539, 0.78199, -1.05, 0.82426, 0.54957, 0.13628, 1.29942, 0.89817, -19.56, -0.9369, 0.09237, -0.33718, 1.86196, 0.83169, -19.56, 0.81828, 0.56448, -0.10851, 1.9417, 0.64028, -19.56, 0.89874, 0.40505, -0.16795, 1.31769, 0.87318, -1.05, -0.83365, 0.21536, 0.50857, 2.08731, 0.25001, -1.05, 0.89509, 0.43289, 0.10685, 1.94834, 0.61194, -1.05, 0.94346, 0.30818, 0.12211, 1.29942, 0.89817, -19.56, -0.9369, 0.09237, -0.33718, 1.9417, 0.64028, -19.56, 0.89874, 0.40505, -0.16795, 2.14292, 0.16581, -19.56, 0.88804, 0.43731, -0.14196, 1.31769, 0.87318, -1.05, -0.83365, 0.21536, 0.50857, 2.36267, -0.26458, -1.05, 0.24306, -0.92085, 0.3049, 2.08731, 0.25001, -1.05, 0.89509, 0.43289, 0.10685, 1.29942, 0.89817, -19.56, -0.9369, 0.09237, -0.33718, 2.14292, 0.16581, -19.56, 0.88804, 0.43731, -0.14196, 2.37905, -0.26973, -19.56, 0.70206, -0.52001, -0.48653, 1.31769, 0.87318, -1.05, -0.83365, 0.21536, 0.50857, 1.32371, -0.28467, -1.05, -0.88886, -0.41371, 0.19692, 2.36267, -0.26458, -1.05, 0.24306, -0.92085, 0.3049, 1.29942, 0.89817, -19.56, -0.9369, 0.09237, -0.33718, 2.37905, -0.26973, -19.56, 0.70206, -0.52001, -0.48653, 1.26025, -0.2178, -19.56, -0.4667, -0.85624, -0.22146, -0.5817, -0.09, -3.81412, 0.91263, 0.08555, 0.39973, -0.68039, -0.09, -3.57699, -0.77974, -0.4386, 0.44681, -0.49119, -0.09, -4.05, 0.688, -0.7229, 0.06381, -0.68039, -0.09, -3.57699, -0.77974, -0.4386, 0.44681, -0.73825, -0.09, -3.91441, -0.88043, -0.45467, 0.13459, -0.49119, -0.09, -4.05, 0.688, -0.7229, 0.06381, -0.73825, -0.09, -3.91441, -0.88043, -0.45467, 0.13459, -0.77659, -0.09, -4.24098, -0.80805, -0.54723, -0.21816, -0.49119, -0.09, -4.05, 0.688, -0.7229, 0.06381, -0.77659, -0.09, -4.24098, -0.80805, -0.54723, -0.21816, -0.67279, -0.09, -4.42319, -0.25002, -0.51567, -0.8195, -0.49119, -0.09, -4.05, 0.688, -0.7229, 0.06381, -0.67279, -0.09, -4.42319, -0.25002, -0.51567, -0.8195, -0.56989, -0.09, -4.3303, 0.94011, -0.00753, -0.3408, -0.49119, -0.09, -4.05, 0.688, -0.7229, 0.06381, -0.67033, 0.66, -3.73438, 0.10355, 0.53093, 0.84106, -0.58016, 0.66, -3.82623, 0.94411, 0.06111, 0.32391, -0.54969, 0.66, -4.05, 0.87972, 0.4743, -0.03377, -0.71997, 0.66, -3.94891, -0.94464, 0.27726, 0.17543, -0.67033, 0.66, -3.73438, 0.10355, 0.53093, 0.84106, -0.54969, 0.66, -4.05, 0.87972, 0.4743, -0.03377, -0.76084, 0.66, -4.20576, -0.95446, 0.29735, -0.02422, -0.71997, 0.66, -3.94891, -0.94464, 0.27726, 0.17543, -0.54969, 0.66, -4.05, 0.87972, 0.4743, -0.03377, -0.66224, 0.66, -4.26711, -0.52496, 0.37098, -0.76602, -0.76084, 0.66, -4.20576, -0.95446, 0.29735, -0.02422, -0.54969, 0.66, -4.05, 0.87972, 0.4743, -0.03377, -0.56757, 0.66, -4.31761, 0.71985, 0.18497, -0.66903, -0.66224, 0.66, -4.26711, -0.52496, 0.37098, -0.76602, -0.54969, 0.66, -4.05, 0.87972, 0.4743, -0.03377, 1.84773, -0.09, -3.69377, 0.46371, -0.18114, 0.86727, 1.54353, -0.09, -3.69529, -0.30143, -0.54781, 0.78041, 1.864, -0.09, -4.05, 0.46897, -0.88319, 0.00655, 1.54353, -0.09, -3.69529, -0.30143, -0.54781, 0.78041, 1.32778, -0.09, -3.88633, -0.66534, -0.71976, 0.19814, 1.864, -0.09, -4.05, 0.46897, -0.88319, 0.00655, 1.32778, -0.09, -3.88633, -0.66534, -0.71976, 0.19814, 1.27697, -0.09, -4.24303, -0.5718, -0.71927, -0.39458, 1.864, -0.09, -4.05, 0.46897, -0.88319, 0.00655, 1.27697, -0.09, -4.24303, -0.5718, -0.71927, -0.39458, 1.5536, -0.09, -4.3518, -0.20036, -0.53572, -0.82028, 1.864, -0.09, -4.05, 0.46897, -0.88319, 0.00655, 1.5536, -0.09, -4.3518, -0.20036, -0.53572, -0.82028, 1.86338, -0.09, -4.42977, 0.85097, -0.2315, -0.47145, 1.864, -0.09, -4.05, 0.46897, -0.88319, 0.00655, 1.5669, 0.66, -3.83533, -0.21284, 0.41633, 0.88395, 1.81028, 0.66, -3.77235, 0.85296, 0.265, 0.44971, 1.8292, 0.66, -4.05, 0.63918, 0.76865, -0.02519, 1.32666, 0.66, -3.89785, -0.58921, 0.6105, 0.52926, 1.5669, 0.66, -3.83533, -0.21284, 0.41633, 0.88395, 1.8292, 0.66, -4.05, 0.63918, 0.76865, -0.02519, 1.40787, 0.66, -4.15869, -0.77009, 0.57807, -0.2698, 1.32666, 0.66, -3.89785, -0.58921, 0.6105, 0.52926, 1.8292, 0.66, -4.05, 0.63918, 0.76865, -0.02519, 1.55082, 0.66, -4.34298, -0.3726, 0.47171, -0.79917, 1.40787, 0.66, -4.15869, -0.77009, 0.57807, -0.2698, 1.8292, 0.66, -4.05, 0.63918, 0.76865, -0.02519, 1.78527, 0.66, -4.2928, 0.45471, 0.22653, -0.86135, 1.55082, 0.66, -4.34298, -0.3726, 0.47171, -0.79917, 1.8292, 0.66, -4.05, 0.63918, 0.76865, -0.02519, -0.56797, -0.09, -9.56248, 0.88747, -0.00602, 0.46083, -0.67797, -0.09, -9.40876, -0.7366, -0.45763, 0.49798, -0.51999, -0.09, -9.85, 0.76403, -0.64456, 0.0283, -0.67797, -0.09, -9.40876, -0.7366, -0.45763, 0.49798, -0.73605, -0.09, -9.71759, -0.89752, -0.41786, 0.14089, -0.51999, -0.09, -9.85, 0.76403, -0.64456, 0.0283, -0.73605, -0.09, -9.71759, -0.89752, -0.41786, 0.14089, -0.79034, -0.09, -10.06085, -0.81135, -0.51905, -0.26888, -0.51999, -0.09, -9.85, 0.76403, -0.64456, 0.0283, -0.79034, -0.09, -10.06085, -0.81135, -0.51905, -0.26888, -0.66722, -0.09, -10.1499, -0.46178, -0.44812, -0.76547, -0.51999, -0.09, -9.85, 0.76403, -0.64456, 0.0283, -0.66722, -0.09, -10.1499, -0.46178, -0.44812, -0.76547, -0.55125, -0.09, -10.20042, 0.96288, -0.08626, -0.25579, -0.51999, -0.09, -9.85, 0.76403, -0.64456, 0.0283, -0.66496, 0.66, -9.59982, -0.30928, 0.46115, 0.83168, -0.56656, 0.66, -9.57888, 0.96756, 0.11133, 0.2268, -0.56481, 0.66, -9.85, 0.90365, 0.42825, -0.00442, -0.73956, 0.66, -9.72271, -0.92866, 0.29087, 0.23018, -0.66496, 0.66, -9.59982, -0.30928, 0.46115, 0.83168, -0.56481, 0.66, -9.85, 0.90365, 0.42825, -0.00442, -0.74731, 0.66, -9.98767, -0.95688, 0.282, -0.06964, -0.73956, 0.66, -9.72271, -0.92866, 0.29087, 0.23018, -0.56481, 0.66, -9.85, 0.90365, 0.42825, -0.00442, -0.66342, 0.66, -10.08149, -0.55475, 0.35453, -0.7527, -0.74731, 0.66, -9.98767, -0.95688, 0.282, -0.06964, -0.56481, 0.66, -9.85, 0.90365, 0.42825, -0.00442, -0.56418, 0.66, -10.12944, 0.63243, 0.23188, -0.7391, -0.66342, 0.66, -10.08149, -0.55475, 0.35453, -0.7527, -0.56481, 0.66, -9.85, 0.90365, 0.42825, -0.00442, 1.86276, -0.09, -9.47116, 0.39493, -0.22165, 0.89157, 1.55527, -0.09, -9.55702, -0.23556, -0.50753, 0.82881, 1.87334, -0.09, -9.85, 0.45175, -0.89208, 0.01095, 1.55527, -0.09, -9.55702, -0.23556, -0.50753, 0.82881, 1.26383, -0.09, -9.64938, -0.6702, -0.7352, 0.10154, 1.87334, -0.09, -9.85, 0.45175, -0.89208, 0.01095, 1.26383, -0.09, -9.64938, -0.6702, -0.7352, 0.10154, 1.34466, -0.09, -10.00392, -0.64861, -0.68878, -0.32386, 1.87334, -0.09, -9.85, 0.45175, -0.89208, 0.01095, 1.34466, -0.09, -10.00392, -0.64861, -0.68878, -0.32386, 1.53927, -0.09, -10.22714, -0.09859, -0.61261, -0.78422, 1.87334, -0.09, -9.85, 0.45175, -0.89208, 0.01095, 1.53927, -0.09, -10.22714, -0.09859, -0.61261, -0.78422, 1.83787, -0.09, -10.19138, 0.8155, -0.123, -0.56554, 1.87334, -0.09, -9.85, 0.45175, -0.89208, 0.01095, 1.56134, 0.66, -9.60827, -0.17153, 0.40854, 0.89648, 1.78137, 0.66, -9.61263, 0.7867, 0.20704, 0.58159, 1.88778, 0.66, -9.85, 0.56615, 0.81831, -0.09917, 1.32544, 0.66, -9.6972, -0.54341, 0.66607, 0.51094, 1.56134, 0.66, -9.60827, -0.17153, 0.40854, 0.89648, 1.88778, 0.66, -9.85, 0.56615, 0.81831, -0.09917, 1.43258, 0.66, -9.94547, -0.74107, 0.59387, -0.31327, 1.32544, 0.66, -9.6972, -0.54341, 0.66607, 0.51094, 1.88778, 0.66, -9.85, 0.56615, 0.81831, -0.09917, 1.54012, 0.66, -10.19504, -0.49972, 0.51493, -0.69651, 1.43258, 0.66, -9.94547, -0.74107, 0.59387, -0.31327, 1.88778, 0.66, -9.85, 0.56615, 0.81831, -0.09917, 1.74837, 0.66, -10.04139, 0.60875, 0.10069, -0.78695, 1.54012, 0.66, -10.19504, -0.49972, 0.51493, -0.69651, 1.88778, 0.66, -9.85, 0.56615, 0.81831, -0.09917, -0.54971, -0.09, -14.94377, 0.79453, -0.12415, 0.5944, -0.67139, -0.09, -14.94529, -0.62007, -0.45075, 0.64214, -0.5432, -0.09, -15.3, 0.79873, -0.60168, 0.00447, -0.67139, -0.09, -14.94529, -0.62007, -0.45075, 0.64214, -0.75769, -0.09, -15.13633, -0.91233, -0.39478, 0.10868, -0.5432, -0.09, -15.3, 0.79873, -0.60168, 0.00447, -0.75769, -0.09, -15.13633, -0.91233, -0.39478, 0.10868, -0.77801, -0.09, -15.49303, -0.86732, -0.4364, -0.2394, -0.5432, -0.09, -15.3, 0.79873, -0.60168, 0.00447, -0.77801, -0.09, -15.49303, -0.86732, -0.4364, -0.2394, -0.66736, -0.09, -15.6018, -0.45523, -0.48686, -0.74548, -0.5432, -0.09, -15.3, 0.79873, -0.60168, 0.00447, -0.66736, -0.09, -15.6018, -0.45523, -0.48686, -0.74548, -0.54345, -0.09, -15.67978, 0.97085, -0.10565, -0.21515, -0.5432, -0.09, -15.3, 0.79873, -0.60168, 0.00447, -0.66204, 0.66, -15.08533, -0.47826, 0.3742, 0.79451, -0.56469, 0.66, -15.02234, 0.97132, 0.12071, 0.20484, -0.55712, 0.66, -15.3, 0.90107, 0.43344, -0.0142, -0.75814, 0.66, -15.14785, -0.87677, 0.36338, 0.31502, -0.66204, 0.66, -15.08533, -0.47826, 0.3742, 0.79451, -0.55712, 0.66, -15.3, 0.90107, 0.43344, -0.0142, -0.72565, 0.66, -15.40869, -0.94925, 0.28502, -0.13303, -0.75814, 0.66, -15.14785, -0.87677, 0.36338, 0.31502, -0.55712, 0.66, -15.3, 0.90107, 0.43344, -0.0142, -0.66847, 0.66, -15.59298, -0.70843, 0.35875, -0.6078, -0.72565, 0.66, -15.40869, -0.94925, 0.28502, -0.13303, -0.55712, 0.66, -15.3, 0.90107, 0.43344, -0.0142, -0.57469, 0.66, -15.5428, 0.78717, 0.15686, -0.59645, -0.66847, 0.66, -15.59298, -0.70843, 0.35875, -0.6078, -0.55712, 0.66, -15.3, 0.90107, 0.43344, -0.0142, 1.83334, -0.09, -14.96544, 0.51658, -0.08449, 0.85206, 1.5515, -0.09, -14.9872, -0.24663, -0.54324, 0.80254, 1.94143, -0.09, -15.3, 0.39445, -0.91761, 0.04901, 1.5515, -0.09, -14.9872, -0.24663, -0.54324, 0.80254, 1.24882, -0.09, -15.0907, -0.63043, -0.77304, 0.07046, 1.94143, -0.09, -15.3, 0.39445, -0.91761, 0.04901, 1.24882, -0.09, -15.0907, -0.63043, -0.77304, 0.07046, 1.38697, -0.09, -15.42946, -0.62757, -0.73237, -0.26419, 1.94143, -0.09, -15.3, 0.39445, -0.91761, 0.04901, 1.38697, -0.09, -15.42946, -0.62757, -0.73237, -0.26419, 1.52414, -0.09, -15.75666, 0.04016, -0.65083, -0.75816, 1.94143, -0.09, -15.3, 0.39445, -0.91761, 0.04901, 1.52414, -0.09, -15.75666, 0.04016, -0.65083, -0.75816, 1.79079, -0.09, -15.57054, 0.73045, 0.08332, -0.67786, 1.94143, -0.09, -15.3, 0.39445, -0.91761, 0.04901, 1.54804, 0.66, -14.99352, -0.01223, 0.46462, 0.88542, 1.74544, 0.66, -15.11269, 0.70025, 0.08688, 0.70859, 1.93185, 0.66, -15.3, 0.48743, 0.85739, -0.16521, 1.37056, 0.66, -15.17134, -0.60291, 0.68834, 0.40334, 1.54804, 0.66, -14.99352, -0.01223, 0.46462, 0.88542, 1.93185, 0.66, -15.3, 0.48743, 0.85739, -0.16521, 1.40513, 0.66, -15.41016, -0.72875, 0.63157, -0.26465, 1.37056, 0.66, -15.17134, -0.60291, 0.68834, 0.40334, 1.93185, 0.66, -15.3, 0.48743, 0.85739, -0.16521, 1.5412, 0.66, -15.63982, -0.50169, 0.505, -0.70234, 1.40513, 0.66, -15.41016, -0.72875, 0.63157, -0.26465, 1.93185, 0.66, -15.3, 0.48743, 0.85739, -0.16521, 1.73479, 0.66, -15.47247, 0.65568, 0.01733, -0.75484, 1.5412, 0.66, -15.63982, -0.50169, 0.505, -0.70234, 1.93185, 0.66, -15.3, 0.48743, 0.85739, -0.16521], "indices": [0, 1, 10, 0, 10, 9, 234, 244, 235, 234, 243, 244, 1, 2, 11, 1, 11, 10, 235, 245, 236, 235, 244, 245, 2, 3, 12, 2, 12, 11, 236, 246, 237, 236, 245, 246, 3, 4, 13, 3, 13, 12, 237, 247, 238, 237, 246, 247, 4, 5, 14, 4, 14, 13, 238, 248, 239, 238, 247, 248, 5, 6, 15, 5, 15, 14, 239, 249, 240, 239, 248, 249, 6, 7, 16, 6, 16, 15, 240, 250, 241, 240, 249, 250, 7, 8, 17, 7, 17, 16, 241, 251, 242, 241, 250, 251, 9, 10, 19, 9, 19, 18, 243, 253, 244, 243, 252, 253, 10, 11, 20, 10, 20, 19, 244, 254, 245, 244, 253, 254, 11, 12, 21, 11, 21, 20, 245, 255, 246, 245, 254, 255, 12, 13, 22, 12, 22, 21, 246, 256, 247, 246, 255, 256, 13, 14, 23, 13, 23, 22, 247, 257, 248, 247, 256, 257, 14, 15, 24, 14, 24, 23, 248, 258, 249, 248, 257, 258, 15, 16, 25, 15, 25, 24, 249, 259, 250, 249, 258, 259, 16, 17, 26, 16, 26, 25, 250, 260, 251, 250, 259, 260, 18, 19, 28, 18, 28, 27, 252, 262, 253, 252, 261, 262, 19, 20, 29, 19, 29, 28, 253, 263, 254, 253, 262, 263, 20, 21, 30, 20, 30, 29, 254, 264, 255, 254, 263, 264, 21, 22, 31, 21, 31, 30, 255, 265, 256, 255, 264, 265, 22, 23, 32, 22, 32, 31, 256, 266, 257, 256, 265, 266, 23, 24, 33, 23, 33, 32, 257, 267, 258, 257, 266, 267, 24, 25, 34, 24, 34, 33, 258, 268, 259, 258, 267, 268, 25, 26, 35, 25, 35, 34, 259, 269, 260, 259, 268, 269, 27, 28, 37, 27, 37, 36, 261, 271, 262, 261, 270, 271, 28, 29, 38, 28, 38, 37, 262, 272, 263, 262, 271, 272, 29, 30, 39, 29, 39, 38, 263, 273, 264, 263, 272, 273, 30, 31, 40, 30, 40, 39, 264, 274, 265, 264, 273, 274, 31, 32, 41, 31, 41, 40, 265, 275, 266, 265, 274, 275, 32, 33, 42, 32, 42, 41, 266, 276, 267, 266, 275, 276, 33, 34, 43, 33, 43, 42, 267, 277, 268, 267, 276, 277, 34, 35, 44, 34, 44, 43, 268, 278, 269, 268, 277, 278, 36, 37, 46, 36, 46, 45, 270, 280, 271, 270, 279, 280, 37, 38, 47, 37, 47, 46, 271, 281, 272, 271, 280, 281, 38, 39, 48, 38, 48, 47, 272, 282, 273, 272, 281, 282, 39, 40, 49, 39, 49, 48, 273, 283, 274, 273, 282, 283, 40, 41, 50, 40, 50, 49, 274, 284, 275, 274, 283, 284, 41, 42, 51, 41, 51, 50, 275, 285, 276, 275, 284, 285, 42, 43, 52, 42, 52, 51, 276, 286, 277, 276, 285, 286, 43, 44, 53, 43, 53, 52, 277, 287, 278, 277, 286, 287, 45, 46, 55, 45, 55, 54, 279, 289, 280, 279, 288, 289, 46, 47, 56, 46, 56, 55, 280, 290, 281, 280, 289, 290, 47, 48, 57, 47, 57, 56, 281, 291, 282, 281, 290, 291, 48, 49, 58, 48, 58, 57, 282, 292, 283, 282, 291, 292, 49, 50, 59, 49, 59, 58, 283, 293, 284, 283, 292, 293, 50, 51, 60, 50, 60, 59, 284, 294, 285, 284, 293, 294, 51, 52, 61, 51, 61, 60, 285, 295, 286, 285, 294, 295, 52, 53, 62, 52, 62, 61, 286, 296, 287, 286, 295, 296, 54, 55, 64, 54, 64, 63, 288, 298, 289, 288, 297, 298, 55, 56, 65, 55, 65, 64, 289, 299, 290, 289, 298, 299, 56, 57, 66, 56, 66, 65, 290, 300, 291, 290, 299, 300, 57, 58, 67, 57, 67, 66, 291, 301, 292, 291, 300, 301, 58, 59, 68, 58, 68, 67, 292, 302, 293, 292, 301, 302, 59, 60, 69, 59, 69, 68, 293, 303, 294, 293, 302, 303, 60, 61, 70, 60, 70, 69, 294, 304, 295, 294, 303, 304, 61, 62, 71, 61, 71, 70, 295, 305, 296, 295, 304, 305, 63, 64, 73, 63, 73, 72, 297, 307, 298, 297, 306, 307, 64, 65, 74, 64, 74, 73, 298, 308, 299, 298, 307, 308, 65, 66, 75, 65, 75, 74, 299, 309, 300, 299, 308, 309, 66, 67, 76, 66, 76, 75, 300, 310, 301, 300, 309, 310, 67, 68, 77, 67, 77, 76, 301, 311, 302, 301, 310, 311, 68, 69, 78, 68, 78, 77, 302, 312, 303, 302, 311, 312, 69, 70, 79, 69, 79, 78, 303, 313, 304, 303, 312, 313, 70, 71, 80, 70, 80, 79, 304, 314, 305, 304, 313, 314, 72, 73, 82, 72, 82, 81, 306, 316, 307, 306, 315, 316, 73, 74, 83, 73, 83, 82, 307, 317, 308, 307, 316, 317, 74, 75, 84, 74, 84, 83, 308, 318, 309, 308, 317, 318, 75, 76, 85, 75, 85, 84, 309, 319, 310, 309, 318, 319, 76, 77, 86, 76, 86, 85, 310, 320, 311, 310, 319, 320, 77, 78, 87, 77, 87, 86, 311, 321, 312, 311, 320, 321, 78, 79, 88, 78, 88, 87, 312, 322, 313, 312, 321, 322, 79, 80, 89, 79, 89, 88, 313, 323, 314, 313, 322, 323, 81, 82, 91, 81, 91, 90, 315, 325, 316, 315, 324, 325, 82, 83, 92, 82, 92, 91, 316, 326, 317, 316, 325, 326, 83, 84, 93, 83, 93, 92, 317, 327, 318, 317, 326, 327, 84, 85, 94, 84, 94, 93, 318, 328, 319, 318, 327, 328, 85, 86, 95, 85, 95, 94, 319, 329, 320, 319, 328, 329, 86, 87, 96, 86, 96, 95, 320, 330, 321, 320, 329, 330, 87, 88, 97, 87, 97, 96, 321, 331, 322, 321, 330, 331, 88, 89, 98, 88, 98, 97, 322, 332, 323, 322, 331, 332, 90, 91, 100, 90, 100, 99, 324, 334, 325, 324, 333, 334, 91, 92, 101, 91, 101, 100, 325, 335, 326, 325, 334, 335, 92, 93, 102, 92, 102, 101, 326, 336, 327, 326, 335, 336, 93, 94, 103, 93, 103, 102, 327, 337, 328, 327, 336, 337, 94, 95, 104, 94, 104, 103, 328, 338, 329, 328, 337, 338, 95, 96, 105, 95, 105, 104, 329, 339, 330, 329, 338, 339, 96, 97, 106, 96, 106, 105, 330, 340, 331, 330, 339, 340, 97, 98, 107, 97, 107, 106, 331, 341, 332, 331, 340, 341, 99, 100, 109, 99, 109, 108, 333, 343, 334, 333, 342, 343, 100, 101, 110, 100, 110, 109, 334, 344, 335, 334, 343, 344, 101, 102, 111, 101, 111, 110, 335, 345, 336, 335, 344, 345, 102, 103, 112, 102, 112, 111, 336, 346, 337, 336, 345, 346, 103, 104, 113, 103, 113, 112, 337, 347, 338, 337, 346, 347, 104, 105, 114, 104, 114, 113, 338, 348, 339, 338, 347, 348, 105, 106, 115, 105, 115, 114, 339, 349, 340, 339, 348, 349, 106, 107, 116, 106, 116, 115, 340, 350, 341, 340, 349, 350, 108, 109, 118, 108, 118, 117, 342, 352, 343, 342, 351, 352, 109, 110, 119, 109, 119, 118, 343, 353, 344, 343, 352, 353, 110, 111, 120, 110, 120, 119, 344, 354, 345, 344, 353, 354, 111, 112, 121, 111, 121, 120, 345, 355, 346, 345, 354, 355, 112, 113, 122, 112, 122, 121, 346, 356, 347, 346, 355, 356, 113, 114, 123, 113, 123, 122, 347, 357, 348, 347, 356, 357, 114, 115, 124, 114, 124, 123, 348, 358, 349, 348, 357, 358, 115, 116, 125, 115, 125, 124, 349, 359, 350, 349, 358, 359, 117, 118, 127, 117, 127, 126, 351, 361, 352, 351, 360, 361, 118, 119, 128, 118, 128, 127, 352, 362, 353, 352, 361, 362, 119, 120, 129, 119, 129, 128, 353, 363, 354, 353, 362, 363, 120, 121, 130, 120, 130, 129, 354, 364, 355, 354, 363, 364, 121, 122, 131, 121, 131, 130, 355, 365, 356, 355, 364, 365, 122, 123, 132, 122, 132, 131, 356, 366, 357, 356, 365, 366, 123, 124, 133, 123, 133, 132, 357, 367, 358, 357, 366, 367, 124, 125, 134, 124, 134, 133, 358, 368, 359, 358, 367, 368, 126, 127, 136, 126, 136, 135, 360, 370, 361, 360, 369, 370, 127, 128, 137, 127, 137, 136, 361, 371, 362, 361, 370, 371, 128, 129, 138, 128, 138, 137, 362, 372, 363, 362, 371, 372, 129, 130, 139, 129, 139, 138, 363, 373, 364, 363, 372, 373, 130, 131, 140, 130, 140, 139, 364, 374, 365, 364, 373, 374, 131, 132, 141, 131, 141, 140, 365, 375, 366, 365, 374, 375, 132, 133, 142, 132, 142, 141, 366, 376, 367, 366, 375, 376, 133, 134, 143, 133, 143, 142, 367, 377, 368, 367, 376, 377, 135, 136, 145, 135, 145, 144, 369, 379, 370, 369, 378, 379, 136, 137, 146, 136, 146, 145, 370, 380, 371, 370, 379, 380, 137, 138, 147, 137, 147, 146, 371, 381, 372, 371, 380, 381, 138, 139, 148, 138, 148, 147, 372, 382, 373, 372, 381, 382, 139, 140, 149, 139, 149, 148, 373, 383, 374, 373, 382, 383, 140, 141, 150, 140, 150, 149, 374, 384, 375, 374, 383, 384, 141, 142, 151, 141, 151, 150, 375, 385, 376, 375, 384, 385, 142, 143, 152, 142, 152, 151, 376, 386, 377, 376, 385, 386, 144, 145, 154, 144, 154, 153, 378, 388, 379, 378, 387, 388, 145, 146, 155, 145, 155, 154, 379, 389, 380, 379, 388, 389, 146, 147, 156, 146, 156, 155, 380, 390, 381, 380, 389, 390, 147, 148, 157, 147, 157, 156, 381, 391, 382, 381, 390, 391, 148, 149, 158, 148, 158, 157, 382, 392, 383, 382, 391, 392, 149, 150, 159, 149, 159, 158, 383, 393, 384, 383, 392, 393, 150, 151, 160, 150, 160, 159, 384, 394, 385, 384, 393, 394, 151, 152, 161, 151, 161, 160, 385, 395, 386, 385, 394, 395, 153, 154, 163, 153, 163, 162, 387, 397, 388, 387, 396, 397, 154, 155, 164, 154, 164, 163, 388, 398, 389, 388, 397, 398, 155, 156, 165, 155, 165, 164, 389, 399, 390, 389, 398, 399, 156, 157, 166, 156, 166, 165, 390, 400, 391, 390, 399, 400, 157, 158, 167, 157, 167, 166, 391, 401, 392, 391, 400, 401, 158, 159, 168, 158, 168, 167, 392, 402, 393, 392, 401, 402, 159, 160, 169, 159, 169, 168, 393, 403, 394, 393, 402, 403, 160, 161, 170, 160, 170, 169, 394, 404, 395, 394, 403, 404, 162, 163, 172, 162, 172, 171, 396, 406, 397, 396, 405, 406, 163, 164, 173, 163, 173, 172, 397, 407, 398, 397, 406, 407, 164, 165, 174, 164, 174, 173, 398, 408, 399, 398, 407, 408, 165, 166, 175, 165, 175, 174, 399, 409, 400, 399, 408, 409, 166, 167, 176, 166, 176, 175, 400, 410, 401, 400, 409, 410, 167, 168, 177, 167, 177, 176, 401, 411, 402, 401, 410, 411, 168, 169, 178, 168, 178, 177, 402, 412, 403, 402, 411, 412, 169, 170, 179, 169, 179, 178, 403, 413, 404, 403, 412, 413, 171, 172, 181, 171, 181, 180, 405, 415, 406, 405, 414, 415, 172, 173, 182, 172, 182, 181, 406, 416, 407, 406, 415, 416, 173, 174, 183, 173, 183, 182, 407, 417, 408, 407, 416, 417, 174, 175, 184, 174, 184, 183, 408, 418, 409, 408, 417, 418, 175, 176, 185, 175, 185, 184, 409, 419, 410, 409, 418, 419, 176, 177, 186, 176, 186, 185, 410, 420, 411, 410, 419, 420, 177, 178, 187, 177, 187, 186, 411, 421, 412, 411, 420, 421, 178, 179, 188, 178, 188, 187, 412, 422, 413, 412, 421, 422, 180, 181, 190, 180, 190, 189, 414, 424, 415, 414, 423, 424, 181, 182, 191, 181, 191, 190, 415, 425, 416, 415, 424, 425, 182, 183, 192, 182, 192, 191, 416, 426, 417, 416, 425, 426, 183, 184, 193, 183, 193, 192, 417, 427, 418, 417, 426, 427, 184, 185, 194, 184, 194, 193, 418, 428, 419, 418, 427, 428, 185, 186, 195, 185, 195, 194, 419, 429, 420, 419, 428, 429, 186, 187, 196, 186, 196, 195, 420, 430, 421, 420, 429, 430, 187, 188, 197, 187, 197, 196, 421, 431, 422, 421, 430, 431, 189, 190, 199, 189, 199, 198, 423, 433, 424, 423, 432, 433, 190, 191, 200, 190, 200, 199, 424, 434, 425, 424, 433, 434, 191, 192, 201, 191, 201, 200, 425, 435, 426, 425, 434, 435, 192, 193, 202, 192, 202, 201, 426, 436, 427, 426, 435, 436, 193, 194, 203, 193, 203, 202, 427, 437, 428, 427, 436, 437, 194, 195, 204, 194, 204, 203, 428, 438, 429, 428, 437, 438, 195, 196, 205, 195, 205, 204, 429, 439, 430, 429, 438, 439, 196, 197, 206, 196, 206, 205, 430, 440, 431, 430, 439, 440, 198, 199, 208, 198, 208, 207, 432, 442, 433, 432, 441, 442, 199, 200, 209, 199, 209, 208, 433, 443, 434, 433, 442, 443, 200, 201, 210, 200, 210, 209, 434, 444, 435, 434, 443, 444, 201, 202, 211, 201, 211, 210, 435, 445, 436, 435, 444, 445, 202, 203, 212, 202, 212, 211, 436, 446, 437, 436, 445, 446, 203, 204, 213, 203, 213, 212, 437, 447, 438, 437, 446, 447, 204, 205, 214, 204, 214, 213, 438, 448, 439, 438, 447, 448, 205, 206, 215, 205, 215, 214, 439, 449, 440, 439, 448, 449, 207, 208, 217, 207, 217, 216, 441, 451, 442, 441, 450, 451, 208, 209, 218, 208, 218, 217, 442, 452, 443, 442, 451, 452, 209, 210, 219, 209, 219, 218, 443, 453, 444, 443, 452, 453, 210, 211, 220, 210, 220, 219, 444, 454, 445, 444, 453, 454, 211, 212, 221, 211, 221, 220, 445, 455, 446, 445, 454, 455, 212, 213, 222, 212, 222, 221, 446, 456, 447, 446, 455, 456, 213, 214, 223, 213, 223, 222, 447, 457, 448, 447, 456, 457, 214, 215, 224, 214, 224, 223, 448, 458, 449, 448, 457, 458, 216, 217, 226, 216, 226, 225, 450, 460, 451, 450, 459, 460, 217, 218, 227, 217, 227, 226, 451, 461, 452, 451, 460, 461, 218, 219, 228, 218, 228, 227, 452, 462, 453, 452, 461, 462, 219, 220, 229, 219, 229, 228, 453, 463, 454, 453, 462, 463, 220, 221, 230, 220, 230, 229, 454, 464, 455, 454, 463, 464, 221, 222, 231, 221, 231, 230, 455, 465, 456, 455, 464, 465, 222, 223, 232, 222, 232, 231, 456, 466, 457, 456, 465, 466, 223, 224, 233, 223, 233, 232, 457, 467, 458, 457, 466, 467, 1332, 1333, 1334, 1335, 1336, 1337, 1338, 1339, 1340, 1341, 1342, 1343, 1344, 1345, 1346, 1347, 1348, 1349, 1350, 1351, 1352, 1353, 1354, 1355, 1356, 1357, 1358, 1359, 1360, 1361, 1362, 1363, 1364, 1365, 1366, 1367, 1368, 1369, 1370, 1371, 1372, 1373, 1374, 1375, 1376, 1377, 1378, 1379, 1380, 1381, 1382, 1383, 1384, 1385, 1386, 1387, 1388, 1389, 1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402, 1403, 1404, 1405, 1406, 1407, 1408, 1409, 1410, 1411, 1412, 1413, 1414, 1415, 1416, 1417, 1418, 1419, 1420, 1421, 1422, 1423, 1424, 1425, 1426, 1427, 1428, 1429, 1430, 1431, 1432, 1433, 1434, 1435, 1436, 1437, 1438, 1439, 1440, 1441, 1442, 1443, 1444, 1445, 1446, 1447, 1448, 1449, 1450, 1451, 1452, 1453, 1454, 1455, 1456, 1457, 1458, 1459, 1460, 1461, 1462, 1463, 1464, 1465, 1466, 1467, 1468, 1469, 1470, 1471, 1472, 1473, 1474, 1475, 1476, 1477, 1478, 1479, 1480, 1481, 1482, 1483, 1484, 1485, 1486, 1487, 1488, 1489, 1490, 1491, 1492, 1493, 1494, 1495, 1496, 1497, 1498, 1499, 1500, 1501, 1502, 1503, 1504, 1505, 1506, 1507, 1508, 1509, 1510, 1511, 1512, 1513, 1514, 1515, 1516, 1517, 1518, 1519, 1520, 1521, 1522, 1523, 1524, 1525, 1526, 1527, 1528, 1529, 1530, 1531, 1532, 1533, 1534, 1535, 1536, 1537, 1538, 1539, 1540, 1541, 1542, 1543, 1544, 1545, 1546, 1547, 1548, 1549, 1550, 1551, 1552, 1553, 1554, 1555, 1556, 1557, 1558, 1559, 1560, 1561, 1562, 1563, 1564, 1565, 1566, 1567, 1568, 1569, 1570, 1571, 1572, 1573, 1574, 1575, 1576, 1577, 1578, 1579, 1580, 1581, 1582, 1583, 1584, 1585, 1586, 1587, 1588, 1589, 1590, 1591, 1592, 1593, 1594, 1595, 1596, 1597, 1598, 1599, 1600, 1601, 1602, 1603, 1604, 1605, 1606, 1607, 1608, 1609, 1610, 1611, 1612, 1613, 1614, 1615, 1616, 1617, 1618, 1619, 1620, 1621, 1622, 1623, 1624, 1625, 1626, 1627, 1628, 1629, 1630, 1631, 1632, 1633, 1634, 1635, 1636, 1637, 1638, 1639, 1640, 1641, 1642, 1643, 1644, 1645, 1646, 1647, 1648, 1649, 1650, 1651, 1652, 1653, 1654, 1655, 1656, 1657, 1658, 1659, 1660, 1661, 1662, 1663, 1664, 1665, 1666, 1667, 1668, 1669, 1670, 1671, 1672, 1673, 1674, 1675, 1676, 1677, 1678, 1679, 1680, 1681, 1682, 1683, 1684, 1685, 1686, 1687, 1688, 1689, 1690, 1691, 1692, 1693, 1694, 1695, 1696, 1697, 1698, 1699, 1700, 1701, 1702, 1703, 1704, 1705, 1706, 1707, 1708, 1709, 1710, 1711, 1712, 1713, 1714, 1715, 1716, 1717, 1718, 1719, 1720, 1721, 1722, 1723, 1724, 1725, 1726, 1727, 468, 479, 473, 468, 473, 469, 468, 469, 475, 468, 475, 478, 468, 478, 479, 469, 473, 477, 473, 479, 472, 479, 478, 470, 478, 475, 474, 475, 469, 476, 471, 477, 472, 471, 472, 470, 471, 470, 474, 471, 474, 476, 471, 476, 477, 472, 477, 473, 470, 472, 479, 474, 470, 478, 476, 474, 475, 477, 476, 469, 480, 491, 485, 480, 485, 481, 480, 481, 487, 480, 487, 490, 480, 490, 491, 481, 485, 489, 485, 491, 484, 491, 490, 482, 490, 487, 486, 487, 481, 488, 483, 489, 484, 483, 484, 482, 483, 482, 486, 483, 486, 488, 483, 488, 489, 484, 489, 485, 482, 484, 491, 486, 482, 490, 488, 486, 487, 489, 488, 481, 492, 503, 497, 492, 497, 493, 492, 493, 499, 492, 499, 502, 492, 502, 503, 493, 497, 501, 497, 503, 496, 503, 502, 494, 502, 499, 498, 499, 493, 500, 495, 501, 496, 495, 496, 494, 495, 494, 498, 495, 498, 500, 495, 500, 501, 496, 501, 497, 494, 496, 503, 498, 494, 502, 500, 498, 499, 501, 500, 493, 504, 515, 509, 504, 509, 505, 504, 505, 511, 504, 511, 514, 504, 514, 515, 505, 509, 513, 509, 515, 508, 515, 514, 506, 514, 511, 510, 511, 505, 512, 507, 513, 508, 507, 508, 506, 507, 506, 510, 507, 510, 512, 507, 512, 513, 508, 513, 509, 506, 508, 515, 510, 506, 514, 512, 510, 511, 513, 512, 505, 516, 527, 521, 516, 521, 517, 516, 517, 523, 516, 523, 526, 516, 526, 527, 517, 521, 525, 521, 527, 520, 527, 526, 518, 526, 523, 522, 523, 517, 524, 519, 525, 520, 519, 520, 518, 519, 518, 522, 519, 522, 524, 519, 524, 525, 520, 525, 521, 518, 520, 527, 522, 518, 526, 524, 522, 523, 525, 524, 517, 528, 539, 533, 528, 533, 529, 528, 529, 535, 528, 535, 538, 528, 538, 539, 529, 533, 537, 533, 539, 532, 539, 538, 530, 538, 535, 534, 535, 529, 536, 531, 537, 532, 531, 532, 530, 531, 530, 534, 531, 534, 536, 531, 536, 537, 532, 537, 533, 530, 532, 539, 534, 530, 538, 536, 534, 535, 537, 536, 529, 540, 551, 545, 540, 545, 541, 540, 541, 547, 540, 547, 550, 540, 550, 551, 541, 545, 549, 545, 551, 544, 551, 550, 542, 550, 547, 546, 547, 541, 548, 543, 549, 544, 543, 544, 542, 543, 542, 546, 543, 546, 548, 543, 548, 549, 544, 549, 545, 542, 544, 551, 546, 542, 550, 548, 546, 547, 549, 548, 541, 552, 563, 557, 552, 557, 553, 552, 553, 559, 552, 559, 562, 552, 562, 563, 553, 557, 561, 557, 563, 556, 563, 562, 554, 562, 559, 558, 559, 553, 560, 555, 561, 556, 555, 556, 554, 555, 554, 558, 555, 558, 560, 555, 560, 561, 556, 561, 557, 554, 556, 563, 558, 554, 562, 560, 558, 559, 561, 560, 553, 564, 575, 569, 564, 569, 565, 564, 565, 571, 564, 571, 574, 564, 574, 575, 565, 569, 573, 569, 575, 568, 575, 574, 566, 574, 571, 570, 571, 565, 572, 567, 573, 568, 567, 568, 566, 567, 566, 570, 567, 570, 572, 567, 572, 573, 568, 573, 569, 566, 568, 575, 570, 566, 574, 572, 570, 571, 573, 572, 565, 576, 587, 581, 576, 581, 577, 576, 577, 583, 576, 583, 586, 576, 586, 587, 577, 581, 585, 581, 587, 580, 587, 586, 578, 586, 583, 582, 583, 577, 584, 579, 585, 580, 579, 580, 578, 579, 578, 582, 579, 582, 584, 579, 584, 585, 580, 585, 581, 578, 580, 587, 582, 578, 586, 584, 582, 583, 585, 584, 577, 588, 599, 593, 588, 593, 589, 588, 589, 595, 588, 595, 598, 588, 598, 599, 589, 593, 597, 593, 599, 592, 599, 598, 590, 598, 595, 594, 595, 589, 596, 591, 597, 592, 591, 592, 590, 591, 590, 594, 591, 594, 596, 591, 596, 597, 592, 597, 593, 590, 592, 599, 594, 590, 598, 596, 594, 595, 597, 596, 589, 600, 611, 605, 600, 605, 601, 600, 601, 607, 600, 607, 610, 600, 610, 611, 601, 605, 609, 605, 611, 604, 611, 610, 602, 610, 607, 606, 607, 601, 608, 603, 609, 604, 603, 604, 602, 603, 602, 606, 603, 606, 608, 603, 608, 609, 604, 609, 605, 602, 604, 611, 606, 602, 610, 608, 606, 607, 609, 608, 601, 612, 623, 617, 612, 617, 613, 612, 613, 619, 612, 619, 622, 612, 622, 623, 613, 617, 621, 617, 623, 616, 623, 622, 614, 622, 619, 618, 619, 613, 620, 615, 621, 616, 615, 616, 614, 615, 614, 618, 615, 618, 620, 615, 620, 621, 616, 621, 617, 614, 616, 623, 618, 614, 622, 620, 618, 619, 621, 620, 613, 624, 635, 629, 624, 629, 625, 624, 625, 631, 624, 631, 634, 624, 634, 635, 625, 629, 633, 629, 635, 628, 635, 634, 626, 634, 631, 630, 631, 625, 632, 627, 633, 628, 627, 628, 626, 627, 626, 630, 627, 630, 632, 627, 632, 633, 628, 633, 629, 626, 628, 635, 630, 626, 634, 632, 630, 631, 633, 632, 625, 636, 647, 641, 636, 641, 637, 636, 637, 643, 636, 643, 646, 636, 646, 647, 637, 641, 645, 641, 647, 640, 647, 646, 638, 646, 643, 642, 643, 637, 644, 639, 645, 640, 639, 640, 638, 639, 638, 642, 639, 642, 644, 639, 644, 645, 640, 645, 641, 638, 640, 647, 642, 638, 646, 644, 642, 643, 645, 644, 637, 648, 659, 653, 648, 653, 649, 648, 649, 655, 648, 655, 658, 648, 658, 659, 649, 653, 657, 653, 659, 652, 659, 658, 650, 658, 655, 654, 655, 649, 656, 651, 657, 652, 651, 652, 650, 651, 650, 654, 651, 654, 656, 651, 656, 657, 652, 657, 653, 650, 652, 659, 654, 650, 658, 656, 654, 655, 657, 656, 649, 660, 671, 665, 660, 665, 661, 660, 661, 667, 660, 667, 670, 660, 670, 671, 661, 665, 669, 665, 671, 664, 671, 670, 662, 670, 667, 666, 667, 661, 668, 663, 669, 664, 663, 664, 662, 663, 662, 666, 663, 666, 668, 663, 668, 669, 664, 669, 665, 662, 664, 671, 666, 662, 670, 668, 666, 667, 669, 668, 661, 672, 683, 677, 672, 677, 673, 672, 673, 679, 672, 679, 682, 672, 682, 683, 673, 677, 681, 677, 683, 676, 683, 682, 674, 682, 679, 678, 679, 673, 680, 675, 681, 676, 675, 676, 674, 675, 674, 678, 675, 678, 680, 675, 680, 681, 676, 681, 677, 674, 676, 683, 678, 674, 682, 680, 678, 679, 681, 680, 673, 684, 695, 689, 684, 689, 685, 684, 685, 691, 684, 691, 694, 684, 694, 695, 685, 689, 693, 689, 695, 688, 695, 694, 686, 694, 691, 690, 691, 685, 692, 687, 693, 688, 687, 688, 686, 687, 686, 690, 687, 690, 692, 687, 692, 693, 688, 693, 689, 686, 688, 695, 690, 686, 694, 692, 690, 691, 693, 692, 685, 696, 707, 701, 696, 701, 697, 696, 697, 703, 696, 703, 706, 696, 706, 707, 697, 701, 705, 701, 707, 700, 707, 706, 698, 706, 703, 702, 703, 697, 704, 699, 705, 700, 699, 700, 698, 699, 698, 702, 699, 702, 704, 699, 704, 705, 700, 705, 701, 698, 700, 707, 702, 698, 706, 704, 702, 703, 705, 704, 697, 708, 719, 713, 708, 713, 709, 708, 709, 715, 708, 715, 718, 708, 718, 719, 709, 713, 717, 713, 719, 712, 719, 718, 710, 718, 715, 714, 715, 709, 716, 711, 717, 712, 711, 712, 710, 711, 710, 714, 711, 714, 716, 711, 716, 717, 712, 717, 713, 710, 712, 719, 714, 710, 718, 716, 714, 715, 717, 716, 709, 720, 731, 725, 720, 725, 721, 720, 721, 727, 720, 727, 730, 720, 730, 731, 721, 725, 729, 725, 731, 724, 731, 730, 722, 730, 727, 726, 727, 721, 728, 723, 729, 724, 723, 724, 722, 723, 722, 726, 723, 726, 728, 723, 728, 729, 724, 729, 725, 722, 724, 731, 726, 722, 730, 728, 726, 727, 729, 728, 721, 732, 743, 737, 732, 737, 733, 732, 733, 739, 732, 739, 742, 732, 742, 743, 733, 737, 741, 737, 743, 736, 743, 742, 734, 742, 739, 738, 739, 733, 740, 735, 741, 736, 735, 736, 734, 735, 734, 738, 735, 738, 740, 735, 740, 741, 736, 741, 737, 734, 736, 743, 738, 734, 742, 740, 738, 739, 741, 740, 733, 744, 755, 749, 744, 749, 745, 744, 745, 751, 744, 751, 754, 744, 754, 755, 745, 749, 753, 749, 755, 748, 755, 754, 746, 754, 751, 750, 751, 745, 752, 747, 753, 748, 747, 748, 746, 747, 746, 750, 747, 750, 752, 747, 752, 753, 748, 753, 749, 746, 748, 755, 750, 746, 754, 752, 750, 751, 753, 752, 745, 756, 767, 761, 756, 761, 757, 756, 757, 763, 756, 763, 766, 756, 766, 767, 757, 761, 765, 761, 767, 760, 767, 766, 758, 766, 763, 762, 763, 757, 764, 759, 765, 760, 759, 760, 758, 759, 758, 762, 759, 762, 764, 759, 764, 765, 760, 765, 761, 758, 760, 767, 762, 758, 766, 764, 762, 763, 765, 764, 757, 768, 779, 773, 768, 773, 769, 768, 769, 775, 768, 775, 778, 768, 778, 779, 769, 773, 777, 773, 779, 772, 779, 778, 770, 778, 775, 774, 775, 769, 776, 771, 777, 772, 771, 772, 770, 771, 770, 774, 771, 774, 776, 771, 776, 777, 772, 777, 773, 770, 772, 779, 774, 770, 778, 776, 774, 775, 777, 776, 769, 780, 791, 785, 780, 785, 781, 780, 781, 787, 780, 787, 790, 780, 790, 791, 781, 785, 789, 785, 791, 784, 791, 790, 782, 790, 787, 786, 787, 781, 788, 783, 789, 784, 783, 784, 782, 783, 782, 786, 783, 786, 788, 783, 788, 789, 784, 789, 785, 782, 784, 791, 786, 782, 790, 788, 786, 787, 789, 788, 781, 792, 803, 797, 792, 797, 793, 792, 793, 799, 792, 799, 802, 792, 802, 803, 793, 797, 801, 797, 803, 796, 803, 802, 794, 802, 799, 798, 799, 793, 800, 795, 801, 796, 795, 796, 794, 795, 794, 798, 795, 798, 800, 795, 800, 801, 796, 801, 797, 794, 796, 803, 798, 794, 802, 800, 798, 799, 801, 800, 793, 804, 815, 809, 804, 809, 805, 804, 805, 811, 804, 811, 814, 804, 814, 815, 805, 809, 813, 809, 815, 808, 815, 814, 806, 814, 811, 810, 811, 805, 812, 807, 813, 808, 807, 808, 806, 807, 806, 810, 807, 810, 812, 807, 812, 813, 808, 813, 809, 806, 808, 815, 810, 806, 814, 812, 810, 811, 813, 812, 805, 816, 827, 821, 816, 821, 817, 816, 817, 823, 816, 823, 826, 816, 826, 827, 817, 821, 825, 821, 827, 820, 827, 826, 818, 826, 823, 822, 823, 817, 824, 819, 825, 820, 819, 820, 818, 819, 818, 822, 819, 822, 824, 819, 824, 825, 820, 825, 821, 818, 820, 827, 822, 818, 826, 824, 822, 823, 825, 824, 817, 828, 839, 833, 828, 833, 829, 828, 829, 835, 828, 835, 838, 828, 838, 839, 829, 833, 837, 833, 839, 832, 839, 838, 830, 838, 835, 834, 835, 829, 836, 831, 837, 832, 831, 832, 830, 831, 830, 834, 831, 834, 836, 831, 836, 837, 832, 837, 833, 830, 832, 839, 834, 830, 838, 836, 834, 835, 837, 836, 829, 840, 851, 845, 840, 845, 841, 840, 841, 847, 840, 847, 850, 840, 850, 851, 841, 845, 849, 845, 851, 844, 851, 850, 842, 850, 847, 846, 847, 841, 848, 843, 849, 844, 843, 844, 842, 843, 842, 846, 843, 846, 848, 843, 848, 849, 844, 849, 845, 842, 844, 851, 846, 842, 850, 848, 846, 847, 849, 848, 841, 852, 861, 853, 852, 860, 861, 853, 862, 854, 853, 861, 862, 854, 863, 855, 854, 862, 863, 855, 864, 856, 855, 863, 864, 856, 865, 857, 856, 864, 865, 857, 866, 858, 857, 865, 866, 858, 867, 859, 858, 866, 867, 859, 860, 852, 859, 867, 860, 860, 869, 861, 860, 868, 869, 861, 870, 862, 861, 869, 870, 862, 871, 863, 862, 870, 871, 863, 872, 864, 863, 871, 872, 864, 873, 865, 864, 872, 873, 865, 874, 866, 865, 873, 874, 866, 875, 867, 866, 874, 875, 867, 868, 860, 867, 875, 868, 868, 877, 869, 868, 876, 877, 869, 878, 870, 869, 877, 878, 870, 879, 871, 870, 878, 879, 871, 880, 872, 871, 879, 880, 872, 881, 873, 872, 880, 881, 873, 882, 874, 873, 881, 882, 874, 883, 875, 874, 882, 883, 875, 876, 868, 875, 883, 876, 876, 885, 877, 876, 884, 885, 877, 886, 878, 877, 885, 886, 878, 887, 879, 878, 886, 887, 879, 888, 880, 879, 887, 888, 880, 889, 881, 880, 888, 889, 881, 890, 882, 881, 889, 890, 882, 891, 883, 882, 890, 891, 883, 884, 876, 883, 891, 884, 884, 893, 885, 884, 892, 893, 885, 894, 886, 885, 893, 894, 886, 895, 887, 886, 894, 895, 887, 896, 888, 887, 895, 896, 888, 897, 889, 888, 896, 897, 889, 898, 890, 889, 897, 898, 890, 899, 891, 890, 898, 899, 891, 892, 884, 891, 899, 892, 892, 901, 893, 892, 900, 901, 893, 902, 894, 893, 901, 902, 894, 903, 895, 894, 902, 903, 895, 904, 896, 895, 903, 904, 896, 905, 897, 896, 904, 905, 897, 906, 898, 897, 905, 906, 898, 907, 899, 898, 906, 907, 899, 900, 892, 899, 907, 900, 900, 909, 901, 900, 908, 909, 901, 910, 902, 901, 909, 910, 902, 911, 903, 902, 910, 911, 903, 912, 904, 903, 911, 912, 904, 913, 905, 904, 912, 913, 905, 914, 906, 905, 913, 914, 906, 915, 907, 906, 914, 915, 907, 908, 900, 907, 915, 908, 908, 917, 909, 908, 916, 917, 909, 918, 910, 909, 917, 918, 910, 919, 911, 910, 918, 919, 911, 920, 912, 911, 919, 920, 912, 921, 913, 912, 920, 921, 913, 922, 914, 913, 921, 922, 914, 923, 915, 914, 922, 923, 915, 916, 908, 915, 923, 916, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737, 1738, 1739, 1740, 1741, 1742, 1743, 1744, 1745, 1746, 1747, 1748, 1749, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1757, 1758, 1759, 1760, 1761, 1762, 1763, 924, 925, 933, 924, 933, 932, 925, 926, 934, 925, 934, 933, 926, 927, 935, 926, 935, 934, 927, 928, 936, 927, 936, 935, 928, 929, 937, 928, 937, 936, 929, 930, 938, 929, 938, 937, 930, 931, 939, 930, 939, 938, 931, 924, 932, 931, 932, 939, 932, 933, 941, 932, 941, 940, 933, 934, 942, 933, 942, 941, 934, 935, 943, 934, 943, 942, 935, 936, 944, 935, 944, 943, 936, 937, 945, 936, 945, 944, 937, 938, 946, 937, 946, 945, 938, 939, 947, 938, 947, 946, 939, 932, 940, 939, 940, 947, 940, 941, 949, 940, 949, 948, 941, 942, 950, 941, 950, 949, 942, 943, 951, 942, 951, 950, 943, 944, 952, 943, 952, 951, 944, 945, 953, 944, 953, 952, 945, 946, 954, 945, 954, 953, 946, 947, 955, 946, 955, 954, 947, 940, 948, 947, 948, 955, 948, 949, 957, 948, 957, 956, 949, 950, 958, 949, 958, 957, 950, 951, 959, 950, 959, 958, 951, 952, 960, 951, 960, 959, 952, 953, 961, 952, 961, 960, 953, 954, 962, 953, 962, 961, 954, 955, 963, 954, 963, 962, 955, 948, 956, 955, 956, 963, 956, 957, 965, 956, 965, 964, 957, 958, 966, 957, 966, 965, 958, 959, 967, 958, 967, 966, 959, 960, 968, 959, 968, 967, 960, 961, 969, 960, 969, 968, 961, 962, 970, 961, 970, 969, 962, 963, 971, 962, 971, 970, 963, 956, 964, 963, 964, 971, 964, 965, 973, 964, 973, 972, 965, 966, 974, 965, 974, 973, 966, 967, 975, 966, 975, 974, 967, 968, 976, 967, 976, 975, 968, 969, 977, 968, 977, 976, 969, 970, 978, 969, 978, 977, 970, 971, 979, 970, 979, 978, 971, 964, 972, 971, 972, 979, 972, 973, 981, 972, 981, 980, 973, 974, 982, 973, 982, 981, 974, 975, 983, 974, 983, 982, 975, 976, 984, 975, 984, 983, 976, 977, 985, 976, 985, 984, 977, 978, 986, 977, 986, 985, 978, 979, 987, 978, 987, 986, 979, 972, 980, 979, 980, 987, 980, 981, 989, 980, 989, 988, 981, 982, 990, 981, 990, 989, 982, 983, 991, 982, 991, 990, 983, 984, 992, 983, 992, 991, 984, 985, 993, 984, 993, 992, 985, 986, 994, 985, 994, 993, 986, 987, 995, 986, 995, 994, 987, 980, 988, 987, 988, 995, 1764, 1765, 1766, 1767, 1768, 1769, 1770, 1771, 1772, 1773, 1774, 1775, 1776, 1777, 1778, 1779, 1780, 1781, 1782, 1783, 1784, 1785, 1786, 1787, 1788, 1789, 1790, 1791, 1792, 1793, 1794, 1795, 1796, 1797, 1798, 1799, 1004, 997, 996, 1003, 1004, 996, 1005, 998, 997, 1004, 1005, 997, 1006, 999, 998, 1005, 1006, 998, 1007, 1000, 999, 1006, 1007, 999, 1008, 1001, 1000, 1007, 1008, 1000, 1009, 1002, 1001, 1008, 1009, 1001, 1003, 996, 1002, 1009, 1003, 1002, 1011, 1004, 1003, 1010, 1011, 1003, 1012, 1005, 1004, 1011, 1012, 1004, 1013, 1006, 1005, 1012, 1013, 1005, 1014, 1007, 1006, 1013, 1014, 1006, 1015, 1008, 1007, 1014, 1015, 1007, 1016, 1009, 1008, 1015, 1016, 1008, 1010, 1003, 1009, 1016, 1010, 1009, 1800, 1801, 1802, 1803, 1804, 1805, 1806, 1807, 1808, 1809, 1810, 1811, 1812, 1813, 1814, 1815, 1816, 1817, 1818, 1819, 1820, 1821, 1822, 1823, 1824, 1825, 1826, 1827, 1828, 1829, 1025, 1018, 1017, 1024, 1025, 1017, 1026, 1019, 1018, 1025, 1026, 1018, 1027, 1020, 1019, 1026, 1027, 1019, 1028, 1021, 1020, 1027, 1028, 1020, 1029, 1022, 1021, 1028, 1029, 1021, 1030, 1023, 1022, 1029, 1030, 1022, 1024, 1017, 1023, 1030, 1024, 1023, 1032, 1025, 1024, 1031, 1032, 1024, 1033, 1026, 1025, 1032, 1033, 1025, 1034, 1027, 1026, 1033, 1034, 1026, 1035, 1028, 1027, 1034, 1035, 1027, 1036, 1029, 1028, 1035, 1036, 1028, 1037, 1030, 1029, 1036, 1037, 1029, 1031, 1024, 1030, 1037, 1031, 1030, 1830, 1831, 1832, 1833, 1834, 1835, 1836, 1837, 1838, 1839, 1840, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1848, 1849, 1850, 1851, 1852, 1853, 1854, 1855, 1856, 1857, 1858, 1859, 1046, 1039, 1038, 1045, 1046, 1038, 1047, 1040, 1039, 1046, 1047, 1039, 1048, 1041, 1040, 1047, 1048, 1040, 1049, 1042, 1041, 1048, 1049, 1041, 1050, 1043, 1042, 1049, 1050, 1042, 1051, 1044, 1043, 1050, 1051, 1043, 1045, 1038, 1044, 1051, 1045, 1044, 1053, 1046, 1045, 1052, 1053, 1045, 1054, 1047, 1046, 1053, 1054, 1046, 1055, 1048, 1047, 1054, 1055, 1047, 1056, 1049, 1048, 1055, 1056, 1048, 1057, 1050, 1049, 1056, 1057, 1049, 1058, 1051, 1050, 1057, 1058, 1050, 1052, 1045, 1051, 1058, 1052, 1051, 1860, 1861, 1862, 1863, 1864, 1865, 1866, 1867, 1868, 1869, 1870, 1871, 1872, 1873, 1874, 1875, 1876, 1877, 1878, 1879, 1880, 1881, 1882, 1883, 1884, 1885, 1886, 1887, 1888, 1889, 1067, 1060, 1059, 1066, 1067, 1059, 1068, 1061, 1060, 1067, 1068, 1060, 1069, 1062, 1061, 1068, 1069, 1061, 1070, 1063, 1062, 1069, 1070, 1062, 1071, 1064, 1063, 1070, 1071, 1063, 1072, 1065, 1064, 1071, 1072, 1064, 1066, 1059, 1065, 1072, 1066, 1065, 1074, 1067, 1066, 1073, 1074, 1066, 1075, 1068, 1067, 1074, 1075, 1067, 1076, 1069, 1068, 1075, 1076, 1068, 1077, 1070, 1069, 1076, 1077, 1069, 1078, 1071, 1070, 1077, 1078, 1070, 1079, 1072, 1071, 1078, 1079, 1071, 1073, 1066, 1072, 1079, 1073, 1072, 1890, 1891, 1892, 1893, 1894, 1895, 1896, 1897, 1898, 1899, 1900, 1901, 1902, 1903, 1904, 1905, 1906, 1907, 1908, 1909, 1910, 1911, 1912, 1913, 1914, 1915, 1916, 1917, 1918, 1919, 1088, 1081, 1080, 1087, 1088, 1080, 1089, 1082, 1081, 1088, 1089, 1081, 1090, 1083, 1082, 1089, 1090, 1082, 1091, 1084, 1083, 1090, 1091, 1083, 1092, 1085, 1084, 1091, 1092, 1084, 1093, 1086, 1085, 1092, 1093, 1085, 1087, 1080, 1086, 1093, 1087, 1086, 1095, 1088, 1087, 1094, 1095, 1087, 1096, 1089, 1088, 1095, 1096, 1088, 1097, 1090, 1089, 1096, 1097, 1089, 1098, 1091, 1090, 1097, 1098, 1090, 1099, 1092, 1091, 1098, 1099, 1091, 1100, 1093, 1092, 1099, 1100, 1092, 1094, 1087, 1093, 1100, 1094, 1093, 1920, 1921, 1922, 1923, 1924, 1925, 1926, 1927, 1928, 1929, 1930, 1931, 1932, 1933, 1934, 1935, 1936, 1937, 1938, 1939, 1940, 1941, 1942, 1943, 1944, 1945, 1946, 1947, 1948, 1949, 1109, 1102, 1101, 1108, 1109, 1101, 1110, 1103, 1102, 1109, 1110, 1102, 1111, 1104, 1103, 1110, 1111, 1103, 1112, 1105, 1104, 1111, 1112, 1104, 1113, 1106, 1105, 1112, 1113, 1105, 1114, 1107, 1106, 1113, 1114, 1106, 1108, 1101, 1107, 1114, 1108, 1107, 1116, 1109, 1108, 1115, 1116, 1108, 1117, 1110, 1109, 1116, 1117, 1109, 1118, 1111, 1110, 1117, 1118, 1110, 1119, 1112, 1111, 1118, 1119, 1111, 1120, 1113, 1112, 1119, 1120, 1112, 1121, 1114, 1113, 1120, 1121, 1113, 1115, 1108, 1114, 1121, 1115, 1114, 1950, 1951, 1952, 1953, 1954, 1955, 1956, 1957, 1958, 1959, 1960, 1961, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1969, 1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979, 1122, 1123, 1133, 1122, 1133, 1132, 1123, 1124, 1134, 1123, 1134, 1133, 1124, 1125, 1135, 1124, 1135, 1134, 1125, 1126, 1136, 1125, 1136, 1135, 1126, 1127, 1137, 1126, 1137, 1136, 1127, 1128, 1138, 1127, 1138, 1137, 1128, 1129, 1139, 1128, 1139, 1138, 1129, 1130, 1140, 1129, 1140, 1139, 1130, 1131, 1141, 1130, 1141, 1140, 1131, 1122, 1132, 1131, 1132, 1141, 1132, 1133, 1143, 1132, 1143, 1142, 1133, 1134, 1144, 1133, 1144, 1143, 1134, 1135, 1145, 1134, 1145, 1144, 1135, 1136, 1146, 1135, 1146, 1145, 1136, 1137, 1147, 1136, 1147, 1146, 1137, 1138, 1148, 1137, 1148, 1147, 1138, 1139, 1149, 1138, 1149, 1148, 1139, 1140, 1150, 1139, 1150, 1149, 1140, 1141, 1151, 1140, 1151, 1150, 1141, 1132, 1142, 1141, 1142, 1151, 1142, 1143, 1153, 1142, 1153, 1152, 1143, 1144, 1154, 1143, 1154, 1153, 1144, 1145, 1155, 1144, 1155, 1154, 1145, 1146, 1156, 1145, 1156, 1155, 1146, 1147, 1157, 1146, 1157, 1156, 1147, 1148, 1158, 1147, 1158, 1157, 1148, 1149, 1159, 1148, 1159, 1158, 1149, 1150, 1160, 1149, 1160, 1159, 1150, 1151, 1161, 1150, 1161, 1160, 1151, 1142, 1152, 1151, 1152, 1161, 1152, 1153, 1163, 1152, 1163, 1162, 1153, 1154, 1164, 1153, 1164, 1163, 1154, 1155, 1165, 1154, 1165, 1164, 1155, 1156, 1166, 1155, 1166, 1165, 1156, 1157, 1167, 1156, 1167, 1166, 1157, 1158, 1168, 1157, 1168, 1167, 1158, 1159, 1169, 1158, 1169, 1168, 1159, 1160, 1170, 1159, 1170, 1169, 1160, 1161, 1171, 1160, 1171, 1170, 1161, 1152, 1162, 1161, 1162, 1171, 1162, 1163, 1173, 1162, 1173, 1172, 1163, 1164, 1174, 1163, 1174, 1173, 1164, 1165, 1175, 1164, 1175, 1174, 1165, 1166, 1176, 1165, 1176, 1175, 1166, 1167, 1177, 1166, 1177, 1176, 1167, 1168, 1178, 1167, 1178, 1177, 1168, 1169, 1179, 1168, 1179, 1178, 1169, 1170, 1180, 1169, 1180, 1179, 1170, 1171, 1181, 1170, 1181, 1180, 1171, 1162, 1172, 1171, 1172, 1181, 1172, 1173, 1183, 1172, 1183, 1182, 1173, 1174, 1184, 1173, 1184, 1183, 1174, 1175, 1185, 1174, 1185, 1184, 1175, 1176, 1186, 1175, 1186, 1185, 1176, 1177, 1187, 1176, 1187, 1186, 1177, 1178, 1188, 1177, 1188, 1187, 1178, 1179, 1189, 1178, 1189, 1188, 1179, 1180, 1190, 1179, 1190, 1189, 1180, 1181, 1191, 1180, 1191, 1190, 1181, 1172, 1182, 1181, 1182, 1191, 1182, 1183, 1193, 1182, 1193, 1192, 1183, 1184, 1194, 1183, 1194, 1193, 1184, 1185, 1195, 1184, 1195, 1194, 1185, 1186, 1196, 1185, 1196, 1195, 1186, 1187, 1197, 1186, 1197, 1196, 1187, 1188, 1198, 1187, 1198, 1197, 1188, 1189, 1199, 1188, 1199, 1198, 1189, 1190, 1200, 1189, 1200, 1199, 1190, 1191, 1201, 1190, 1201, 1200, 1191, 1182, 1192, 1191, 1192, 1201, 1192, 1193, 1203, 1192, 1203, 1202, 1193, 1194, 1204, 1193, 1204, 1203, 1194, 1195, 1205, 1194, 1205, 1204, 1195, 1196, 1206, 1195, 1206, 1205, 1196, 1197, 1207, 1196, 1207, 1206, 1197, 1198, 1208, 1197, 1208, 1207, 1198, 1199, 1209, 1198, 1209, 1208, 1199, 1200, 1210, 1199, 1210, 1209, 1200, 1201, 1211, 1200, 1211, 1210, 1201, 1192, 1202, 1201, 1202, 1211, 1202, 1203, 1213, 1202, 1213, 1212, 1203, 1204, 1214, 1203, 1214, 1213, 1204, 1205, 1215, 1204, 1215, 1214, 1205, 1206, 1216, 1205, 1216, 1215, 1206, 1207, 1217, 1206, 1217, 1216, 1207, 1208, 1218, 1207, 1218, 1217, 1208, 1209, 1219, 1208, 1219, 1218, 1209, 1210, 1220, 1209, 1220, 1219, 1210, 1211, 1221, 1210, 1221, 1220, 1211, 1202, 1212, 1211, 1212, 1221, 1212, 1213, 1223, 1212, 1223, 1222, 1213, 1214, 1224, 1213, 1224, 1223, 1214, 1215, 1225, 1214, 1225, 1224, 1215, 1216, 1226, 1215, 1226, 1225, 1216, 1217, 1227, 1216, 1227, 1226, 1217, 1218, 1228, 1217, 1228, 1227, 1218, 1219, 1229, 1218, 1229, 1228, 1219, 1220, 1230, 1219, 1230, 1229, 1220, 1221, 1231, 1220, 1231, 1230, 1221, 1212, 1222, 1221, 1222, 1231, 1222, 1223, 1233, 1222, 1233, 1232, 1223, 1224, 1234, 1223, 1234, 1233, 1224, 1225, 1235, 1224, 1235, 1234, 1225, 1226, 1236, 1225, 1236, 1235, 1226, 1227, 1237, 1226, 1237, 1236, 1227, 1228, 1238, 1227, 1238, 1237, 1228, 1229, 1239, 1228, 1239, 1238, 1229, 1230, 1240, 1229, 1240, 1239, 1230, 1231, 1241, 1230, 1241, 1240, 1231, 1222, 1232, 1231, 1232, 1241, 1232, 1233, 1243, 1232, 1243, 1242, 1233, 1234, 1244, 1233, 1244, 1243, 1234, 1235, 1245, 1234, 1245, 1244, 1235, 1236, 1246, 1235, 1246, 1245, 1236, 1237, 1247, 1236, 1247, 1246, 1237, 1238, 1248, 1237, 1248, 1247, 1238, 1239, 1249, 1238, 1249, 1248, 1239, 1240, 1250, 1239, 1250, 1249, 1240, 1241, 1251, 1240, 1251, 1250, 1241, 1232, 1242, 1241, 1242, 1251, 1242, 1243, 1253, 1242, 1253, 1252, 1243, 1244, 1254, 1243, 1254, 1253, 1244, 1245, 1255, 1244, 1255, 1254, 1245, 1246, 1256, 1245, 1256, 1255, 1246, 1247, 1257, 1246, 1257, 1256, 1247, 1248, 1258, 1247, 1258, 1257, 1248, 1249, 1259, 1248, 1259, 1258, 1249, 1250, 1260, 1249, 1260, 1259, 1250, 1251, 1261, 1250, 1261, 1260, 1251, 1242, 1252, 1251, 1252, 1261, 1252, 1253, 1263, 1252, 1263, 1262, 1253, 1254, 1264, 1253, 1264, 1263, 1254, 1255, 1265, 1254, 1265, 1264, 1255, 1256, 1266, 1255, 1266, 1265, 1256, 1257, 1267, 1256, 1267, 1266, 1257, 1258, 1268, 1257, 1268, 1267, 1258, 1259, 1269, 1258, 1269, 1268, 1259, 1260, 1270, 1259, 1270, 1269, 1260, 1261, 1271, 1260, 1271, 1270, 1261, 1252, 1262, 1261, 1262, 1271, 1272, 1274, 1273, 1275, 1277, 1276, 1278, 1280, 1279, 1281, 1283, 1282, 1284, 1286, 1285, 1287, 1289, 1288, 1290, 1292, 1291, 1293, 1295, 1294, 1296, 1298, 1297, 1299, 1301, 1300, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1309, 1310, 1311, 1312, 1313, 1314, 1315, 1316, 1317, 1318, 1319, 1320, 1321, 1322, 1323, 1324, 1325, 1326, 1327, 1328, 1329, 1330, 1331] }, "geologyRock": { "vertices": [-0.39794, 0.64388, 0.0, -0.25265, 0.9675, 0.01083, 0.40466, 0.65475, 0.0, 0.65642, 0.75408, 0.02181, -0.39794, -0.64388, 0.0, -0.27867, -0.95472, 0.10416, 0.40466, -0.65475, 0.0, 0.63358, -0.77337, 0.02157, 0.0, -0.38645, 0.62528, 0.27121, -0.50833, 0.81734, 0.0, 0.41092, 0.66489, 0.26824, 0.49462, 0.82668, 0.0, -0.42376, -0.68567, 0.23247, -0.37797, -0.89616, 0.0, 0.39929, -0.64606, 0.23552, 0.39497, -0.88799, 0.67245, 0.0, -0.4156, 0.64636, 0.10989, -0.75508, 0.68388, 0.0, 0.42266, 0.62493, -0.11052, 0.77282, -0.64585, 0.0, -0.39916, -0.94617, 0.10629, -0.30572, -0.65728, 0.0, 0.40622, -0.91683, -0.10875, 0.38418, 0.0, 0.76542, 0.0, 0.21956, 0.96557, 0.13953, 0.0, -0.76542, 0.0, 0.23872, -0.97056, 0.03218, -0.25699, -0.67281, 0.41582, -0.6284, -0.65382, 0.42147, 0.26682, -0.69854, 0.43172, 0.3827, -0.76264, 0.52146, -0.22859, 0.59846, 0.36987, -0.42393, 0.74537, 0.5145, 0.23842, 0.62418, 0.38577, 0.12684, 0.80409, 0.58082, 0.0, 0.0, 0.71506, 0.0127, 0.05861, 0.9982, -0.21315, -0.55803, -0.34488, -0.37013, -0.71885, -0.58844, 0.22298, -0.58376, -0.36078, 0.12655, -0.83032, -0.54273, -0.24155, 0.63239, -0.39084, -0.58384, 0.66642, -0.4637, 0.25138, 0.65811, -0.40674, 0.34862, 0.7722, -0.53121, 0.0, 0.0, -0.7513, 0.01308, -0.06005, -0.99811, 0.63629, 0.39325, -0.24304, 0.674, 0.65898, -0.33388, 0.65939, -0.40752, -0.25186, 0.69236, -0.66985, -0.2682, 0.3981, -0.24604, -0.64414, 0.72126, -0.25258, -0.64497, 0.43462, 0.26861, -0.70324, 0.55187, 0.27646, -0.78678, 0.65375, 0.40404, 0.24971, 0.71781, 0.6485, 0.25338, 0.63065, -0.38976, 0.24089, 0.68607, -0.64655, 0.33358, 0.4407, -0.27237, 0.71307, 0.55136, -0.33554, 0.76382, 0.41102, 0.25402, 0.66504, 0.71903, 0.31026, 0.62188, 0.8814, 0.0, 0.0, 0.99975, 0.02213, 0.00256, -0.6554, 0.40506, -0.25034, -0.86507, 0.43649, -0.24726, -0.6785, -0.41934, -0.25916, -0.89765, -0.41826, -0.13887, -0.34616, -0.21394, -0.56011, -0.53018, -0.38852, -0.75363, -0.38269, 0.23652, -0.6192, -0.35096, 0.40482, -0.84436, -0.67287, 0.41586, 0.25701, -0.90112, 0.40986, 0.14143, -0.64977, -0.40158, 0.24819, -0.87432, -0.41845, 0.2459, -0.39561, -0.2445, 0.6401, -0.40751, -0.40289, 0.81952, -0.35908, 0.22192, 0.58101, -0.56721, 0.37821, 0.73159, -0.73766, 0.0, 0.0, -0.99948, -0.02866, 0.01453, -0.20871, 0.73467, 0.0, -0.47504, 0.87937, 0.03229, 0.19579, 0.6892, 0.0, 0.10357, 0.99014, 0.09431, -0.20871, -0.73467, 0.0, -0.47934, -0.86986, 0.11653, 0.19579, -0.6892, 0.0, 0.13177, -0.98704, 0.09163, -0.29613, -0.58877, 0.17738, -0.50924, -0.84108, 0.18235, -0.1382, -0.59692, 0.60403, -0.17945, -0.51189, 0.8401, -0.14182, -0.83022, 0.22947, -0.21309, -0.9718, 0.101, 0.35329, -0.70242, 0.21161, 0.47578, -0.8674, 0.14578, 0.11596, -0.50085, 0.50682, 0.19507, -0.42397, 0.88442, 0.119, -0.69664, 0.19255, 0.2349, -0.97117, 0.04054, 0.0, -0.71394, 0.44124, 0.14088, -0.84089, 0.52256, -0.31754, 0.63133, 0.1902, -0.42621, 0.87025, 0.24698, -0.1378, 0.59519, 0.60228, -0.19807, 0.8049, 0.55938, -0.1367, 0.80024, 0.22118, -0.09723, 0.93985, 0.32745, 0.38062, 0.75675, 0.22798, 0.41275, 0.88908, 0.19791, 0.11555, 0.49912, 0.50507, 0.21031, 0.72857, 0.65189, 0.11388, 0.66665, 0.18426, 0.11978, 0.96036, 0.25174, 0.0, 0.63218, 0.39071, 0.13596, 0.87537, 0.46395, 0.0, -0.22599, 0.79553, 0.09619, -0.35639, 0.92937, 0.0, 0.2068, 0.72797, 0.08916, 0.20516, 0.97466, -0.33895, -0.67391, -0.20303, -0.45952, -0.84011, -0.2882, -0.14157, -0.6115, -0.61878, -0.29292, -0.84983, -0.43816, -0.14319, -0.83826, -0.23169, -0.12088, -0.90263, -0.41309, 0.38243, -0.76036, -0.22907, 0.4639, -0.85393, -0.23581, 0.12407, -0.53592, -0.54231, 0.22037, -0.80601, -0.54935, 0.1222, -0.71537, -0.19772, 0.18494, -0.92541, -0.33077, 0.0, -0.61149, -0.37792, 0.09631, -0.87102, -0.48172, -0.31162, 0.61958, -0.18666, -0.49012, 0.84089, -0.22951, -0.14157, 0.6115, -0.61878, -0.29311, 0.59772, -0.7462, -0.14319, 0.83826, -0.23169, -0.25309, 0.94934, -0.18629, 0.3747, 0.745, -0.22444, 0.53301, 0.82876, -0.17048, 0.12448, 0.53765, -0.54406, 0.21154, 0.52733, -0.82291, 0.12732, 0.74535, -0.20601, 0.20696, 0.97065, -0.12249, 0.0, 0.69324, -0.42845, 0.08214, 0.85443, -0.51304, 0.0, -0.20129, -0.70858, 0.08709, -0.18513, -0.97885, 0.0, 0.22049, -0.77614, 0.09418, 0.33592, -0.93717, 0.50884, 0.51491, -0.11781, 0.80598, 0.59, -0.04782, 0.6415, 0.19326, -0.32265, 0.69687, 0.23062, -0.67911, 0.42145, 0.49345, -0.30497, 0.71316, 0.57462, -0.40151, 0.47351, -0.47915, -0.10962, 0.79988, -0.59981, -0.02073, 0.69938, -0.2107, -0.35176, 0.69986, -0.2871, -0.65404, 0.45025, -0.52717, -0.32581, 0.66918, -0.59129, -0.45009, 0.20535, -0.34284, -0.68164, 0.14443, -0.41255, -0.89941, 0.48061, -0.10996, -0.47495, 0.71492, -0.17255, -0.67759, 0.35613, -0.49217, -0.57624, 0.54624, -0.61813, -0.56527, 0.21291, -0.13159, -0.77032, 0.15687, -0.14556, -0.97683, 0.46969, -0.29028, -0.40116, 0.71493, -0.31736, -0.62302, 0.18205, 0.30393, -0.60428, 0.07166, 0.47511, -0.87701, 0.48173, 0.11021, -0.47605, 0.82581, 0.03489, -0.56287, 0.35406, 0.4893, -0.57289, 0.43892, 0.624, -0.64651, 0.20539, 0.12694, -0.74311, 0.14487, 0.20897, -0.96713, 0.51536, 0.31851, -0.44017, 0.81391, 0.3634, -0.45332, 0.42019, 0.0, -0.67988, 0.70835, -0.06886, -0.7025, 0.48348, 0.48924, 0.11193, 0.80161, 0.59759, 0.01733, 0.69995, 0.21087, 0.35205, 0.72056, 0.32, 0.61514, 0.44306, 0.51874, 0.3206, 0.68563, 0.54971, 0.47721, 0.60253, 0.37239, 0.0, 0.69844, 0.71268, 0.06528, 0.52469, -0.53094, 0.12147, 0.77473, -0.6282, 0.07176, 0.64207, -0.19343, 0.32294, 0.70408, -0.25324, 0.66343, 0.41426, -0.48502, 0.29976, 0.7055, -0.5797, 0.4077, 0.60253, -0.37239, 0.0, 0.69014, -0.72203, -0.04882, 0.18094, -0.30208, 0.6006, 0.06034, -0.61592, 0.7855, 0.47915, -0.10962, 0.47351, 0.82237, -0.00886, 0.56888, 0.33576, -0.464, 0.54327, 0.37589, -0.62971, 0.67984, 0.21202, -0.13104, 0.7671, 0.11286, -0.20257, 0.97274, 0.52668, -0.32551, 0.44984, 0.78679, -0.41564, 0.4563, 0.20425, 0.34099, 0.67796, 0.11412, 0.56978, 0.81384, 0.47915, 0.10962, 0.47351, 0.72665, 0.13545, 0.67352, 0.33783, 0.46687, 0.54662, 0.48215, 0.63592, 0.60261, 0.21954, 0.13569, 0.79432, 0.11337, 0.12831, 0.98523, 0.47922, 0.29618, 0.4093, 0.69487, 0.37596, 0.61303, 0.41962, 0.0, 0.67895, 0.748, 0.04927, 0.66187, 0.76699, 0.0, -0.21789, 0.87423, -0.02741, -0.48474, 0.77841, 0.0, 0.22113, 0.89106, 0.05099, 0.45102, 0.83826, 0.23169, -0.14319, 0.8662, 0.46437, -0.18455, 0.76304, -0.2109, -0.13034, 0.87491, -0.43779, -0.20705, 0.74054, 0.20468, 0.1265, 0.86621, 0.45457, 0.20747, 0.83358, -0.23039, 0.14239, 0.85202, -0.47958, 0.20989, -0.60572, 0.61293, -0.14023, -0.58645, 0.7763, -0.23115, -0.66521, 0.20041, -0.33458, -0.95817, -0.0127, -0.28592, -0.44333, 0.51906, -0.3208, -0.35858, 0.76206, -0.53915, -0.56451, -0.57123, -0.13069, -0.63562, -0.75459, -0.16304, -0.72309, -0.21784, -0.36369, -0.97649, -0.02668, -0.21389, -0.47213, -0.55278, -0.34164, -0.3162, -0.73831, -0.59575, -0.22589, -0.37713, -0.74981, -0.47528, -0.33851, -0.81211, -0.56899, -0.13018, -0.56229, -0.59307, -0.157, -0.7897, -0.29155, -0.40291, -0.47174, -0.55551, -0.58893, -0.587, -0.21442, -0.13252, -0.77577, -0.30287, -0.11363, -0.94623, -0.5689, -0.3516, -0.4859, -0.40354, -0.48961, -0.77294, -0.20259, 0.33822, -0.67245, -0.40074, 0.42788, -0.81014, -0.5701, 0.13043, -0.56339, -0.72189, 0.049, -0.69027, -0.29028, 0.40116, -0.46969, -0.46943, 0.59191, -0.65519, -0.2069, 0.12787, -0.74856, -0.28567, 0.16315, -0.94434, -0.60657, 0.37488, -0.51807, -0.52535, 0.55868, -0.64179, -0.41044, 0.0, -0.66411, -0.48329, -0.07948, -0.87185, -0.58035, 0.58727, 0.13436, -0.59055, 0.78252, 0.19726, -0.72367, 0.21802, 0.36398, -0.97379, 0.02622, 0.22591, -0.46494, 0.54436, 0.33643, -0.3327, 0.7604, 0.55776, -0.64933, 0.40131, 0.0, -0.96827, 0.24257, 0.0601, -0.6115, -0.61878, 0.14157, -0.55287, -0.79738, 0.24192, -0.66579, -0.20058, 0.33487, -0.95988, -0.00858, 0.28029, -0.43614, -0.51064, 0.31559, -0.39426, -0.76916, 0.50295, -0.64933, -0.40131, 0.0, -0.97142, -0.23279, -0.04646, -0.20148, -0.33637, 0.66878, -0.33761, -0.52597, 0.78063, -0.54926, -0.12567, 0.54279, -0.73168, -0.00037, 0.68165, -0.29028, -0.40116, 0.46969, -0.46271, -0.58347, 0.66742, -0.21353, -0.13197, 0.77256, -0.23935, -0.14583, 0.95992, -0.60657, -0.37488, 0.51807, -0.55374, -0.55594, 0.61992, -0.22479, 0.37528, 0.74614, -0.42078, 0.4474, 0.78916, -0.54814, 0.12541, 0.54169, -0.60815, 0.0859, 0.78916, -0.29028, 0.40116, 0.46969, -0.52737, 0.58924, 0.61211, -0.22105, 0.13662, 0.79977, -0.25744, 0.09313, 0.9618, -0.58022, 0.3586, 0.49557, -0.42905, 0.49102, 0.75817, -0.40987, 0.0, 0.66318, -0.59264, 0.07692, 0.80178, -0.65652, 0.0, -0.1865, -0.98741, -0.05964, -0.14648, -0.6584, 0.0, 0.18704, -0.99381, 0.02868, 0.10729, -0.74119, 0.20486, -0.12661, -0.9944, 0.10274, -0.02473, -0.6491, -0.17941, -0.11088, -0.99606, -0.0848, -0.02586, -0.6491, 0.17941, 0.11088, -0.99365, 0.09469, 0.06082, -0.71869, -0.19864, 0.12277, -0.99326, -0.11269, 0.02699], "indices": [0, 137, 53, 137, 37, 139, 53, 139, 16, 137, 139, 53, 37, 138, 154, 138, 11, 151, 154, 151, 40, 138, 151, 154, 16, 152, 54, 152, 40, 150, 54, 150, 5, 152, 150, 54, 37, 154, 139, 154, 40, 152, 139, 152, 16, 154, 152, 139, 0, 53, 42, 53, 16, 55, 42, 55, 12, 53, 55, 42, 16, 54, 59, 54, 5, 57, 59, 57, 17, 54, 57, 59, 12, 58, 43, 58, 17, 56, 43, 56, 1, 58, 56, 43, 16, 59, 55, 59, 17, 58, 55, 58, 12, 59, 58, 55, 0, 42, 69, 42, 12, 71, 69, 71, 21, 42, 71, 69, 12, 43, 74, 43, 1, 72, 74, 72, 22, 43, 72, 74, 21, 75, 70, 75, 22, 73, 70, 73, 7, 75, 73, 70, 12, 74, 71, 74, 22, 75, 71, 75, 21, 74, 75, 71, 0, 69, 120, 69, 21, 122, 120, 122, 33, 69, 122, 120, 21, 70, 133, 70, 7, 131, 133, 131, 36, 70, 131, 133, 33, 135, 121, 135, 36, 132, 121, 132, 10, 135, 132, 121, 21, 133, 122, 133, 36, 135, 122, 135, 33, 133, 135, 122, 0, 120, 137, 120, 33, 140, 137, 140, 37, 120, 140, 137, 33, 121, 158, 121, 10, 156, 158, 156, 41, 121, 156, 158, 37, 160, 138, 160, 41, 157, 138, 157, 11, 160, 157, 138, 33, 158, 140, 158, 41, 160, 140, 160, 37, 158, 160, 140, 1, 56, 95, 56, 17, 97, 95, 97, 28, 56, 97, 95, 17, 57, 110, 57, 5, 108, 110, 108, 31, 57, 108, 110, 28, 112, 96, 112, 31, 109, 96, 109, 9, 112, 109, 96, 17, 110, 97, 110, 31, 112, 97, 112, 28, 110, 112, 97, 5, 150, 61, 150, 40, 153, 61, 153, 18, 150, 153, 61, 40, 151, 155, 151, 11, 146, 155, 146, 39, 151, 146, 155, 18, 148, 60, 148, 39, 145, 60, 145, 4, 148, 145, 60, 40, 155, 153, 155, 39, 148, 153, 148, 18, 155, 148, 153, 11, 157, 142, 157, 41, 161, 142, 161, 38, 157, 161, 142, 41, 156, 159, 156, 10, 124, 159, 124, 34, 156, 124, 159, 38, 144, 141, 144, 34, 123, 141, 123, 2, 144, 123, 141, 41, 159, 161, 159, 34, 144, 161, 144, 38, 159, 144, 161, 10, 132, 127, 132, 36, 136, 127, 136, 35, 132, 136, 127, 36, 131, 134, 131, 7, 77, 134, 77, 23, 131, 77, 134, 35, 129, 126, 129, 23, 76, 126, 76, 6, 129, 76, 126, 36, 134, 136, 134, 23, 129, 136, 129, 35, 134, 129, 136, 7, 73, 89, 73, 22, 91, 89, 91, 27, 73, 91, 89, 22, 72, 80, 72, 1, 78, 80, 78, 24, 72, 78, 80, 27, 93, 90, 93, 24, 79, 90, 79, 8, 93, 79, 90, 22, 80, 91, 80, 24, 93, 91, 93, 27, 80, 93, 91, 3, 99, 49, 99, 29, 101, 49, 101, 15, 99, 101, 49, 29, 100, 107, 100, 9, 104, 107, 104, 30, 100, 104, 107, 15, 105, 50, 105, 30, 103, 50, 103, 4, 105, 103, 50, 29, 107, 101, 107, 30, 105, 101, 105, 15, 107, 105, 101, 3, 49, 45, 49, 15, 51, 45, 51, 13, 49, 51, 45, 15, 50, 52, 50, 4, 47, 52, 47, 14, 50, 47, 52, 13, 48, 44, 48, 14, 46, 44, 46, 2, 48, 46, 44, 15, 52, 51, 52, 14, 48, 51, 48, 13, 52, 48, 51, 3, 45, 65, 45, 13, 67, 65, 67, 20, 45, 67, 65, 13, 44, 64, 44, 2, 62, 64, 62, 19, 44, 62, 64, 20, 68, 66, 68, 19, 63, 66, 63, 6, 68, 63, 66, 13, 64, 67, 64, 19, 68, 67, 68, 20, 64, 68, 67, 3, 65, 81, 65, 20, 83, 81, 83, 25, 65, 83, 81, 20, 66, 86, 66, 6, 84, 86, 84, 26, 66, 84, 86, 25, 88, 82, 88, 26, 85, 82, 85, 8, 88, 85, 82, 20, 86, 83, 86, 26, 88, 83, 88, 25, 86, 88, 83, 3, 81, 99, 81, 25, 102, 99, 102, 29, 81, 102, 99, 25, 82, 117, 82, 8, 114, 117, 114, 32, 82, 114, 117, 29, 119, 100, 119, 32, 115, 100, 115, 9, 119, 115, 100, 25, 117, 102, 117, 32, 119, 102, 119, 29, 117, 119, 102, 4, 103, 60, 103, 30, 106, 60, 106, 18, 103, 106, 60, 30, 104, 113, 104, 9, 109, 113, 109, 31, 104, 109, 113, 18, 111, 61, 111, 31, 108, 61, 108, 5, 111, 108, 61, 30, 113, 106, 113, 31, 111, 106, 111, 18, 113, 111, 106, 2, 46, 141, 46, 14, 143, 141, 143, 38, 46, 143, 141, 14, 47, 147, 47, 4, 145, 147, 145, 39, 47, 145, 147, 38, 149, 142, 149, 39, 146, 142, 146, 11, 149, 146, 142, 14, 147, 143, 147, 39, 149, 143, 149, 38, 147, 149, 143, 6, 63, 126, 63, 19, 128, 126, 128, 35, 63, 128, 126, 19, 62, 125, 62, 2, 123, 125, 123, 34, 62, 123, 125, 35, 130, 127, 130, 34, 124, 127, 124, 10, 130, 124, 127, 19, 125, 128, 125, 34, 130, 128, 130, 35, 125, 130, 128, 8, 85, 90, 85, 26, 94, 90, 94, 27, 85, 94, 90, 26, 84, 87, 84, 6, 76, 87, 76, 23, 84, 76, 87, 27, 92, 89, 92, 23, 77, 89, 77, 7, 92, 77, 89, 26, 87, 94, 87, 23, 92, 94, 92, 27, 87, 92, 94, 9, 115, 96, 115, 32, 118, 96, 118, 28, 115, 118, 96, 32, 114, 116, 114, 8, 79, 116, 79, 24, 114, 79, 116, 28, 98, 95, 98, 24, 78, 95, 78, 1, 98, 78, 95, 32, 116, 118, 116, 24, 98, 118, 98, 28, 116, 98, 118] } };
function geometry(shape) {
    if (shape === 'terrace' || shape === 'terraceMirror' || shape === 'geologyRock') {
        const mesh = GEOLOGY[shape === 'terraceMirror' ? 'terrace' : shape], mirror = shape === 'terraceMirror';
        const out = new Float32Array(mesh.indices.length * 6);
        for (let i = 0; i < mesh.indices.length; i++) {
            const source = mesh.indices[mirror ? i - i % 3 + [0, 2, 1][i % 3] : i] * 6;
            for (let j = 0; j < 6; j++)
                out[i * 6 + j] = mesh.vertices[source + j] * (mirror && (j === 0 || j === 3) ? -1 : 1);
        }
        return out;
    }
    const v = [];
    if (shape === 'box') {
        const faces = [
            { n: [0, 0, 1], p: [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]] },
            { n: [0, 0, -1], p: [[.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5]] },
            { n: [1, 0, 0], p: [[.5, -.5, .5], [.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5]] },
            { n: [-1, 0, 0], p: [[-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5]] },
            { n: [0, 1, 0], p: [[-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5], [-.5, .5, -.5]] },
            { n: [0, -1, 0], p: [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5]] },
        ];
        for (const f of faces) {
            triangle(v, f.p[0], f.p[1], f.p[2], f.n);
            triangle(v, f.p[0], f.p[2], f.p[3], f.n);
        }
    }
    else if (shape === 'face') {
        // Same curved portrait surface and UV crop as the browser's approved rig.
        const point = (i, j) => {
            const x = (i / 24 - .5) * 1.18, y = (j / 22 - .5) * 1.07;
            return [x, y, -.515 * Math.sqrt(Math.max(.015, 1 - (x / .67) ** 2 - (y / .58) ** 2)) - .065];
        };
        for (let j = 0; j < 22; j++)
            for (let i = 0; i < 24; i++) {
                const a = point(i, j), b = point(i + 1, j), c = point(i, j + 1), d = point(i + 1, j + 1);
                triangle(v, a, c, b);
                triangle(v, b, c, d);
            }
    }
    else if (shape === 'trail') {
        triangle(v, [-.5, 0, -.5], [.5, 0, .5], [.5, 0, -.5], [0, 1, 0]);
        triangle(v, [-.5, 0, -.5], [-.5, 0, .5], [.5, 0, .5], [0, 1, 0]);
    }
    else if (shape === 'ceiling') {
        // Periodic end rings meet exactly between chunks: a closed arched vault,
        // with inward normals and no sky cracks when a device lowers draw detail.
        const nx = 16, nz = 8;
        const point = (i, j) => {
            const x = -1 + 2 * i / nx, z = -1 + 2 * j / nz;
            return [x, -.70 * Math.sqrt(Math.max(0, 1 - x * x)) + .065 * Math.cos(x * 9 + Math.cos(z * Math.PI * 2)) + .035 * Math.cos(x * 19 + Math.cos(z * Math.PI * 4)), z];
        };
        for (let j = 0; j < nz; j++)
            for (let i = 0; i < nx; i++) {
                const a = point(i, j), b = point(i + 1, j), c = point(i, j + 1), d = point(i + 1, j + 1);
                triangle(v, a, b, c);
                triangle(v, b, d, c);
            }
    }
    else if (shape === 'terrain') {
        // One continuous, noninteractive forest floor under the road. Raised outer
        // banks add true depth while the inner edge stays below collision height.
        const nx = 16, nz = 12;
        const point = (i, j) => {
            const x = i / nx, z = -1 + 2 * j / nz;
            return [x, Math.pow(x, 1.25) * (.16 + .10 * Math.sin(x * 13 + Math.cos(z * Math.PI)) + .08 * Math.cos(x * 21 - Math.cos(z * Math.PI * 2))), z];
        };
        for (let j = 0; j < nz; j++)
            for (let i = 0; i < nx; i++) {
                const a = point(i, j), b = point(i + 1, j), c = point(i, j + 1), d = point(i + 1, j + 1);
                triangle(v, a, c, b);
                triangle(v, b, c, d);
            }
    }
    else if (shape === 'ridge') {
        // Coherent sculpted bank: 192 shaded triangles instead of large faceted
        // primitive rocks. Instanced as a single low-cost native GL material batch.
        const nx = 12, nz = 8;
        const point = (i, j) => {
            const x = -1 + i * 2 / nx, z = -1 + j * 2 / nz;
            const shoulder = Math.pow(Math.max(0, 1 - Math.abs(x)), .62);
            const crown = .46 + .20 * Math.sin(x * 7.7 + z * 1.2) + .11 * Math.sin(x * 16.9 - z * 2.1)
                + .075 * Math.cos(x * 25.1 + z * 6.1);
            const grain = .03 * Math.sin(x * 15.4 + z * 12.2) * Math.cos(z * 9.1 - x * 7.7);
            return [x, Math.max(0, shoulder * (crown + grain)), z];
        };
        for (let j = 0; j < nz; j++)
            for (let i = 0; i < nx; i++) {
                const a = point(i, j), b = point(i + 1, j), c = point(i, j + 1), d = point(i + 1, j + 1);
                triangle(v, a, c, b);
                triangle(v, b, c, d);
            }
    }
    else if (shape === 'headStripe') {
        const point = (i, side) => { const a = -1.29 + i / 64 * 3.65; const zig = [.00, .04, -.018, .05, -.023][i % 5]; const x = side * (.12 + ((i % 4 === 0) ? .03 : 0)) + zig; const f = Math.sqrt(1 - (x / .676) ** 2); return [x, .616 * Math.cos(a) * f, -.03 + .546 * Math.sin(a) * f]; };
        for (let i = 0; i < 64; i++) {
            triangle(v, point(i, -1), point(i, 1), point(i + 1, -1));
            triangle(v, point(i, 1), point(i + 1, 1), point(i + 1, -1));
        }
    }
    else if (shape === 'tail') {
        return tailGeometry(0, 0);
    }
    else if (shape === 'sphere' || shape === 'rock') {
        const slices = shape === 'rock' ? 9 : 16, stacks = shape === 'rock' ? 5 : 10;
        const point = (i, j) => { const a = i / slices * Math.PI * 2, b = j / stacks * Math.PI, r = shape === 'rock' ? (1 + .09 * Math.sin(a * 3 + b * 5) + .05 * Math.cos(a * 7 - b * 2)) : 1; return [Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r]; };
        const push = (p) => { const l = Math.hypot(...p); v.push(...p, p[0] / l, p[1] / l, p[2] / l); };
        for (let j = 0; j < stacks; j++)
            for (let i = 0; i < slices; i++) {
                const a = point(i, j), b = point(i + 1, j), c = point(i + 1, j + 1), d = point(i, j + 1);
                if (shape === 'rock') {
                    triangle(v, a, b, d);
                    triangle(v, b, c, d);
                }
                else {
                    for (const p of [a, b, d, b, c, d])
                        push(p);
                }
            }
    }
    else if (shape === 'cylinder' || shape === 'cone') {
        const n = 12;
        for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
            const p = [Math.cos(a), -.5, Math.sin(a)], q = [Math.cos(b), -.5, Math.sin(b)];
            if (shape === 'cone') {
                triangle(v, p, [0, .5, 0], q);
            }
            else {
                const t = [p[0], .5, p[2]], u = [q[0], .5, q[2]];
                triangle(v, p, t, q, [Math.cos((a + b) / 2), 0, Math.sin((a + b) / 2)]);
                triangle(v, q, t, u, [Math.cos((a + b) / 2), 0, Math.sin((a + b) / 2)]);
                triangle(v, t, [0, .5, 0], u, [0, 1, 0]);
            }
            triangle(v, p, q, [0, -.5, 0], [0, -1, 0]);
        }
    }
    else if (shape === 'ring') {
        const p = (i, j) => { const a = i / 22 * Math.PI * 2, b = j / 6 * Math.PI * 2; return [(1 + .07 * Math.cos(b)) * Math.cos(a), .07 * Math.sin(b), (1 + .07 * Math.cos(b)) * Math.sin(a)]; };
        for (let i = 0; i < 22; i++)
            for (let j = 0; j < 6; j++) {
                triangle(v, p(i, j), p(i + 1, j), p(i, j + 1));
                triangle(v, p(i + 1, j), p(i + 1, j + 1), p(i, j + 1));
            }
    }
    else if (shape === 'halo') {
        triangle(v, [-1, -1, 0], [1, -1, 0], [1, 1, 0], [0, 0, 1]);
        triangle(v, [-1, -1, 0], [1, 1, 0], [-1, 1, 0], [0, 0, 1]);
    }
    else if (shape === 'leaf') {
        triangle(v, [0, 0, 0], [-.5, .12, .6], [0, 0, 1]);
        triangle(v, [0, 0, 0], [0, 0, 1], [.5, .12, .6]);
    }
    else {
        triangle(v, [-1, 0, -1], [1, 0, 1], [1, 0, -1], [0, 1, 0]);
        triangle(v, [-1, 0, -1], [-1, 0, 1], [1, 0, 1], [0, 1, 0]);
    }
    return new Float32Array(v);
}
const TAIL_RINGS = 16, TAIL_SIDES = 14;
const TAIL_INDICES = (() => {
    const indices = new Uint16Array(TAIL_RINGS * TAIL_SIDES * 6);
    let offset = 0;
    for (let i = 0; i < TAIL_RINGS; i++)
        for (let j = 0; j < TAIL_SIDES; j++) {
            const a = i * (TAIL_SIDES + 1) + j, b = (i + 1) * (TAIL_SIDES + 1) + j;
            indices.set([a, b, a + 1, b, b + 1, a + 1], offset);
            offset += 6;
        }
    return indices;
})();
function tailGeometry(time, bank, vertices = new Float32Array(TAIL_INDICES.length * 6), grid = new Float64Array((TAIL_RINGS + 1) * (TAIL_SIDES + 1) * 6)) {
    // Keep shared points in Float64 until expansion so the final Float32 vertices
    // retain the exact original geometry and triangle order without per-frame objects.
    for (let i = 0; i <= TAIL_RINGS; i++) {
        const t = i / TAIL_RINGS, radius = Math.max(.022, (.22 + .17 * Math.sin(Math.PI * t)) * (1 - t * t * .82));
        const cy = .14 * Math.sin(t * Math.PI) + .26 * t * t, cx = Math.sin(time * 3.1 - t * 2.8) * .13 * t * t - bank * t * .15, nz = .15 + t * .35;
        for (let j = 0; j <= TAIL_SIDES; j++) {
            const a = j / TAIL_SIDES * Math.PI * 2, cos = Math.cos(a), sin = Math.sin(a), r = radius * (1 + .025 * Math.sin(a * 7 + t * 80)), length = Math.hypot(cos, sin, nz), offset = (i * (TAIL_SIDES + 1) + j) * 6;
            grid[offset] = cx + cos * r;
            grid[offset + 1] = cy + sin * r;
            grid[offset + 2] = t * 1.26;
            grid[offset + 3] = cos / length;
            grid[offset + 4] = sin / length;
            grid[offset + 5] = nz / length;
        }
    }
    for (let i = 0; i < TAIL_INDICES.length; i++) {
        const source = TAIL_INDICES[i] * 6, target = i * 6;
        for (let component = 0; component < 6; component++)
            vertices[target + component] = grid[source + component];
    }
    return vertices;
}
const COLOR_CACHE_LIMIT = 512, colorCache = new Map();
function color(hex, material = 0) {
    const key = hex + ':' + material;
    const cached = colorCache.get(key);
    if (cached)
        return cached;
    const n = parseInt(hex.replace('#', ''), 16);
    const c = [Math.pow(((n >> 16) & 255) / 255, 2.2), Math.pow(((n >> 8) & 255) / 255, 2.2), Math.pow((n & 255) / 255, 2.2), material];
    // Animated emission values are continuous; never retain one cache entry per frame.
    if (colorCache.size >= COLOR_CACHE_LIMIT) {
        const oldest = colorCache.keys().next().value;
        if (oldest !== undefined)
            colorCache.delete(oldest);
    }
    colorCache.set(key, c);
    return c;
}
function geometryBounds(vertices, bounds = { center: [0, 0, 0], half: [0, 0, 0] }, stride = 6) {
    const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < vertices.length; i += stride)
        for (let axis = 0; axis < 3; axis++) {
            low[axis] = Math.min(low[axis], vertices[i + axis]);
            high[axis] = Math.max(high[axis], vertices[i + axis]);
        }
    for (let axis = 0; axis < 3; axis++) {
        bounds.center[axis] = (low[axis] + high[axis]) / 2;
        bounds.half[axis] = (high[axis] - low[axis]) / 2;
    }
    return bounds;
}
function elementIndices(shape, vertices) {
    const count = vertices.length / 6, indices = new Uint16Array(count), first = new Map();
    const bits = new Uint32Array(vertices.buffer, vertices.byteOffset, vertices.length);
    for (let i = 0; i < count; i++) {
        // Static meshes share only bit-identical positions AND normals. The tail
        // shares stable grid identities, never incidental equality at one pose.
        const o = i * 6, key = shape === 'tail' ? TAIL_INDICES[i] : `${bits[o]},${bits[o + 1]},${bits[o + 2]},${bits[o + 3]},${bits[o + 4]},${bits[o + 5]}`;
        const previous = first.get(key);
        if (previous === undefined) {
            first.set(key, i);
            indices[i] = i;
        }
        else
            indices[i] = previous;
    }
    return indices;
}
function updateClipPlanes(vp, planes) {
    // Matrices are column-major; clip inequalities are row 4 +/- rows 1, 2, 3.
    for (let axis = 0; axis < 3; axis++)
        for (let side = 0; side < 2; side++) {
            const offset = (axis * 2 + side) * 4, sign = side === 0 ? 1 : -1;
            for (let component = 0; component < 4; component++)
                planes[offset + component] = vp[component * 4 + 3] + sign * vp[component * 4 + axis];
            const length = Math.hypot(planes[offset], planes[offset + 1], planes[offset + 2]);
            if (length > 0)
                for (let component = 0; component < 4; component++)
                    planes[offset + component] /= length;
        }
}
function cullBatch(batch, planes) {
    // Keep submitted data intact: a second render may use a different camera.
    // The reusable upload buffer grows only to this batch's observed workload.
    if (batch.visible.length < batch.count * 20)
        batch.visible = new Float32Array(20 * 2 ** Math.ceil(Math.log2(batch.count)));
    const data = batch.data, { center, half } = batch.bounds;
    let count = 0;
    for (let i = 0; i < batch.count; i++) {
        const o = i * 20, x = data[o] * center[0] + data[o + 4] * center[1] + data[o + 8] * center[2] + data[o + 12], y = data[o + 1] * center[0] + data[o + 5] * center[1] + data[o + 9] * center[2] + data[o + 13], z = data[o + 2] * center[0] + data[o + 6] * center[1] + data[o + 10] * center[2] + data[o + 14];
        let outside = false;
        // The scene uses affine models. An unfamiliar projective model stays visible.
        if (data[o + 3] === 0 && data[o + 7] === 0 && data[o + 11] === 0 && data[o + 15] === 1)
            for (let p = 0; p < 24; p += 4) {
                const a = planes[p], b = planes[p + 1], c = planes[p + 2], d = a * x + b * y + c * z + planes[p + 3];
                // Support radius of the transformed local box. This includes rotations,
                // nonuniform/negative scales and shear, without shrinking any mesh bounds.
                const radius = Math.abs(a * data[o] + b * data[o + 1] + c * data[o + 2]) * half[0] + Math.abs(a * data[o + 4] + b * data[o + 5] + c * data[o + 6]) * half[1] + Math.abs(a * data[o + 8] + b * data[o + 9] + c * data[o + 10]) * half[2];
                const tolerance = 1e-5 * (1 + Math.abs(a * x) + Math.abs(b * y) + Math.abs(c * z) + Math.abs(planes[p + 3]) + radius);
                if (d + radius < -tolerance) {
                    outside = true;
                    break;
                }
            }
        if (!outside) {
            for (let j = 0; j < 20; j++)
                batch.visible[count * 20 + j] = data[o + j];
            count++;
        }
    }
    return count;
}
class ExpeditionRenderer {
    gl;
    program;
    batches = new Map();
    uniforms;
    divisor = null;
    drawInstanced = null;
    drawIndexedInstanced = null;
    tailVertices = new Float32Array(TAIL_INDICES.length * 6);
    tailGrid = new Float64Array((TAIL_RINGS + 1) * (TAIL_SIDES + 1) * 6);
    clipPlanes = new Float64Array(24);
    portrait = null;
    portraitReady = false;
    atlas = null;
    surfaces = [];
    worldReady = false;
    dead = false;
    nativeFrames = 0;
    sceneryState = { level: 2, fastFrames: 0, slowFrames: 0 };
    sceneTarget = null;
    sceneryBudget = 2;
    stats = { instances: 0, culledInstances: 0, drawCalls: 0, indexedDrawCalls: 0, triangles: 0, nativeDrainMs: 0, sceneWidth: 0, sceneHeight: 0, materialDetail: 1 };
    constructor(gl) {
        this.gl = gl;
        if (typeof this.gl.flushEXP === 'function') {
            this.sceneryState.level = 1;
            this.sceneryBudget = 1;
        }
        const compile = (type, source) => { const s = gl.createShader(type); if (!s)
            throw Error('Could not allocate a GPU shader'); gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            const message = gl.getShaderInfoLog(s);
            gl.deleteShader(s);
            throw Error('3D shader: ' + message);
        } return s; };
        const vert = compile(gl.VERTEX_SHADER, VERTEX), frag = compile(gl.FRAGMENT_SHADER, FRAGMENT), program = gl.createProgram();
        if (!program)
            throw Error('Could not allocate GPU program');
        gl.attachShader(program, vert);
        gl.attachShader(program, frag);
        ['aPosition', 'aNormal', 'aM0', 'aM1', 'aM2', 'aM3', 'aColor', 'aUV'].forEach((name, i) => gl.bindAttribLocation(program, i, name));
        gl.linkProgram(program);
        gl.deleteShader(vert);
        gl.deleteShader(frag);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const message = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw Error('3D program: ' + message);
        }
        this.program = program;
        const uniform = (name) => { const u = gl.getUniformLocation(program, name); if (u === null)
            throw Error('Missing shader uniform ' + name); return u; };
        this.uniforms = { sun: uniform('uSun'), ground: uniform('uGround'), bark: uniform('uBark'), stone: uniform('uStone'), atlas: uniform('uAtlas'), atlasReady: uniform('uAtlasReady'), surface: uniform('uSurface'), tile: uniform('uTile'), wind: uniform('uWind'), portrait: uniform('uPortrait'), vp: uniform('uVP'), eye: uniform('uEye'), fog: uniform('uFog'), range: uniform('uFogRange'), time: uniform('uTime'), travel: uniform('uTravel'), detail: uniform('uDetail') };
        const g = gl;
        if (typeof g.drawArraysInstanced === 'function') {
            this.drawInstanced = g.drawArraysInstanced.bind(g);
            this.divisor = g.vertexAttribDivisor.bind(g);
            if ('drawElementsInstanced' in g && typeof g.drawElementsInstanced === 'function')
                this.drawIndexedInstanced = g.drawElementsInstanced.bind(g);
        }
        else {
            const ext = gl.getExtension('ANGLE_instanced_arrays');
            if (ext) {
                this.drawInstanced = ext.drawArraysInstancedANGLE.bind(ext);
                this.divisor = ext.vertexAttribDivisorANGLE.bind(ext);
                if ('drawElementsInstancedANGLE' in ext && typeof ext.drawElementsInstancedANGLE === 'function')
                    this.drawIndexedInstanced = ext.drawElementsInstancedANGLE.bind(ext);
            }
        }
        for (const shape of ['terrace', 'terraceMirror', 'geologyRock', 'box', 'sphere', 'rock', 'ridge', 'terrain', 'trail', 'ceiling', 'cylinder', 'cone', 'ring', 'leaf', 'headStripe', 'tail', 'shadow', 'halo', 'face']) {
            const data = shape === 'tail' ? tailGeometry(0, 0, this.tailVertices, this.tailGrid) : geometry(shape), vertex = gl.createBuffer(), instances = gl.createBuffer();
            if (!vertex || !instances)
                throw Error('GPU buffer allocation failed');
            gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            let elements = null;
            if (this.drawIndexedInstanced && data.length / 6 <= 65535) {
                elements = gl.createBuffer();
                if (!elements)
                    throw Error('GPU index buffer allocation failed');
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementIndices(shape, data), gl.STATIC_DRAW);
            }
            this.batches.set(shape, { vertex, instances, elements, vertices: data.length / 6, data: new Float32Array(20 * 4096), visible: new Float32Array(0), bounds: geometryBounds(data), count: 0 });
        }
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);
        if (typeof this.gl.flushEXP === 'function' && gl.getParameter(gl.MAX_TEXTURE_SIZE) > 0)
            this.sceneTarget = new NativeSceneTarget(gl);
    }
    /** Install the project's offline-baked scans once, before enabling Start.
     * Asset errors fail the loading screen instead of silently shipping flat props. */
    setWorldAssets(pack, source, surfaces) {
        if (this.worldReady)
            throw Error('Native world is already installed');
        if (pack.version !== 1 || pack.meshes.length !== 8 || surfaces.length !== 3)
            throw Error('Invalid native world pack');
        const gl = this.gl, texture = gl.createTexture();
        if (!texture)
            throw Error('Forest texture allocation failed');
        // Preserve sharp, oblique ground and cliff textures on supported GPUs.
        // Query the optional extension defensively: Expo GL may not implement all
        // getParameter enums, and must still boot without anisotropy support.
        const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
        let anisotropy = 1;
        if (anisotropic)
            try {
                const maximum = gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                if (typeof maximum === 'number' && Number.isFinite(maximum) && maximum > 1)
                    anisotropy = Math.min(4, maximum);
            }
            catch { /* No supported extension limit on this EXGL device. */ }
        this.atlas = texture;
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.activeTexture(gl.TEXTURE0);
        for (let i = 0; i < surfaces.length; i++) {
            const t = gl.createTexture();
            if (!t)
                throw Error('Native ground texture allocation failed');
            this.surfaces.push(t);
            gl.activeTexture(gl.TEXTURE0 + 3 + i);
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, surfaces[i]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            if (anisotropic && anisotropy > 1)
                try {
                    gl.texParameterf(gl.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
                }
                catch { /* Default trilinear filtering stays valid. */ }
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        gl.activeTexture(gl.TEXTURE0);
        for (const mesh of pack.meshes) {
            if (!mesh.name.startsWith('scan') || mesh.vertices.length % 8 || mesh.indices.length % 3 || mesh.vertices.length / 8 > 65535 || mesh.indices.some(i => i < 0 || i >= mesh.vertices.length / 8) || mesh.vertices.some(v => !Number.isFinite(v)))
                throw Error('Invalid native mesh ' + mesh.name);
            const data = new Float32Array(mesh.vertices), vertex = gl.createBuffer(), instances = gl.createBuffer(), elements = gl.createBuffer();
            if (!vertex || !instances || !elements)
                throw Error('Native mesh allocation failed');
            gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
            const bounds = geometryBounds(data, undefined, 8);
            bounds.half[0] += .02;
            this.batches.set(mesh.name, { vertex, instances, elements, vertices: mesh.indices.length, data: new Float32Array(20 * 64), visible: new Float32Array(0), bounds, count: 0, stride: 8, tile: mesh.tile, wind: mesh.wind });
        }
        this.worldReady = true;
    }
    setMadgerPortrait(source) {
        const gl = this.gl, texture = gl.createTexture();
        if (!texture)
            throw Error('Approved portrait texture allocation failed');
        try {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            if (this.portrait)
                gl.deleteTexture(this.portrait);
            this.portrait = texture;
            this.portraitReady = true;
        }
        catch (error) {
            gl.deleteTexture(texture);
            throw error;
        }
        finally {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.activeTexture(gl.TEXTURE0);
        }
    }
    updateTail(time, bank) { const b = this.batches.get('tail'); const data = tailGeometry(time, bank, this.tailVertices, this.tailGrid); geometryBounds(data, b.bounds); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, b.vertex); this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW); b.vertices = data.length / 6; }
    reset() { for (const b of this.batches.values())
        b.count = 0; this.stats = { instances: 0, culledInstances: 0, drawCalls: 0, indexedDrawCalls: 0, triangles: 0, nativeDrainMs: 0, sceneWidth: 0, sceneHeight: 0, materialDetail: 1 }; }
    add(shape, matrix, c) { const b = this.batches.get(shape); if (!b || b.count >= b.data.length / 20)
        return; const offset = b.count * 20; b.data.set(matrix, offset); b.data.set(c, offset + 16); b.count++; }
    shape(shape, c, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, parent) { const t = (0, math_1.transform)(x, y, z, sx, sy, sz, rx, ry, rz); this.add(shape, parent ? (0, math_1.multiply)(parent, t) : t, c); }
    render(eye, target, time, zone, travel = 0) {
        if (this.dead)
            return;
        const gl = this.gl, width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
        if (width < 2 || height < 2)
            return;
        const fog = zone === 0 ? (this.worldReady ? [.18, .25, .22] : [.024, .060, .057]) : zone === 1 ? [.024, .045, .057] : (this.worldReady ? [.018, .028, .038] : [.036, .026, .075]);
        const sky = fog.map(x => Math.pow(x / (x + .65), .4545));
        const size = this.sceneTarget?.begin(width, height, this.sceneryBudget) ?? { width, height };
        this.stats.sceneWidth = size.width;
        this.stats.sceneHeight = size.height;
        gl.viewport(0, 0, size.width, size.height);
        gl.clearColor(sky[0], sky[1], sky[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);
        const vp = (0, math_1.multiply)((0, math_1.perspective)(2 * Math.atan(Math.max(Math.tan(33 * Math.PI / 180), Math.tan(17 * Math.PI / 180) / (width / height))), width / height, .1, 180), (0, math_1.lookAt)(eye, target));
        updateClipPlanes(vp, this.clipPlanes);
        if (this.portrait) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.portrait);
            gl.uniform1i(this.uniforms.portrait, 1);
            gl.activeTexture(gl.TEXTURE0);
        }
        gl.uniform1f(this.uniforms.atlasReady, this.worldReady ? 1 : 0);
        // Assign distinct texture units even before either texture is ready.
        gl.uniform1i(this.uniforms.portrait, 1);
        gl.uniform1i(this.uniforms.atlas, 2);
        gl.uniform1i(this.uniforms.ground, 3);
        gl.uniform1i(this.uniforms.bark, 4);
        gl.uniform1i(this.uniforms.stone, 5);
        if (this.atlas) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.atlas);
            gl.activeTexture(gl.TEXTURE0);
        }
        for (let i = 0; i < this.surfaces.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + 3 + i);
            gl.bindTexture(gl.TEXTURE_2D, this.surfaces[i]);
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.uniformMatrix4fv(this.uniforms.vp, false, vp);
        gl.uniform3f(this.uniforms.eye, eye[0], eye[1], eye[2]);
        gl.uniform3f(this.uniforms.fog, fog[0], fog[1], fog[2]);
        gl.uniform3f(this.uniforms.sun, ...(zone === 2 && this.worldReady ? [.32, .50, .70] : [.95, .83, .62]));
        gl.uniform2f(this.uniforms.range, this.worldReady ? 48 : 30, 115);
        gl.uniform1f(this.uniforms.time, time);
        gl.uniform1f(this.uniforms.travel, travel);
        this.stats.materialDetail = typeof this.gl.flushEXP === 'function' && this.sceneryBudget === 0 ? 0 : 1;
        gl.uniform1f(this.uniforms.detail, this.stats.materialDetail);
        for (const [shape, b] of this.batches) {
            if (!b.count)
                continue;
            const count = cullBatch(b, this.clipPlanes);
            this.stats.culledInstances += b.count - count;
            if (!count)
                continue;
            if (shape === 'shadow' || shape === 'halo' || shape === 'face') {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, shape === 'halo' ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
                gl.depthMask(shape === 'face');
            }
            else {
                gl.disable(gl.BLEND);
                gl.depthMask(true);
            }
            gl.uniform1f(this.uniforms.surface, b.stride === 8 ? 1 : 0);
            gl.uniform1f(this.uniforms.tile, b.tile ?? 0);
            gl.uniform1f(this.uniforms.wind, b.wind ?? 0);
            const stride = (b.stride ?? 6) * 4;
            gl.bindBuffer(gl.ARRAY_BUFFER, b.vertex);
            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
            if (b.stride === 8) {
                gl.enableVertexAttribArray(7);
                gl.vertexAttribPointer(7, 2, gl.FLOAT, false, stride, 24);
            }
            else {
                gl.disableVertexAttribArray(7);
                gl.vertexAttrib2f(7, 0, 0);
            }
            this.divisor?.(7, 0);
            if (this.divisor && this.drawInstanced && (b.stride !== 8 || this.drawIndexedInstanced)) {
                this.divisor(0, 0);
                this.divisor(1, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, b.instances);
                gl.bufferData(gl.ARRAY_BUFFER, b.visible.subarray(0, count * 20), gl.DYNAMIC_DRAW);
                for (let i = 2; i <= 6; i++) {
                    gl.enableVertexAttribArray(i);
                    gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 80, (i - 2) * 16);
                    this.divisor(i, 1);
                }
                if (b.elements && this.drawIndexedInstanced) {
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.elements);
                    this.drawIndexedInstanced(gl.TRIANGLES, b.vertices, gl.UNSIGNED_SHORT, 0, count);
                    this.stats.indexedDrawCalls++;
                }
                else
                    this.drawInstanced(gl.TRIANGLES, 0, b.vertices, count);
                this.stats.drawCalls++;
                for (let i = 2; i <= 6; i++)
                    this.divisor(i, 0);
            }
            else {
                for (let i = 2; i <= 6; i++)
                    gl.disableVertexAttribArray(i);
                for (let j = 0; j < count; j++) {
                    for (let i = 2; i <= 6; i++)
                        gl.vertexAttrib4fv(i, b.visible.subarray(j * 20 + (i - 2) * 4, j * 20 + (i - 1) * 4));
                    if (b.stride === 8 && b.elements) {
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.elements);
                        gl.drawElements(gl.TRIANGLES, b.vertices, gl.UNSIGNED_SHORT, 0);
                    }
                    else
                        gl.drawArrays(gl.TRIANGLES, 0, b.vertices);
                    this.stats.drawCalls++;
                }
            }
            this.stats.instances += count;
            this.stats.triangles += count * b.vertices / 3;
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        if (this.sceneTarget) {
            this.sceneTarget.present(width, height);
            this.stats.drawCalls++;
        }
        gl.flush();
        if (this.gl.endFrameEXP)
            this.gl.endFrameEXP();
        // Expo presents after draining its native command backlog. Synchronize this
        // frame before a fast JS loop can queue another; otherwise a slow GPU can
        // display seconds-old geometry while the simulation and HUD continue ahead.
        // The web context has no flushEXP and retains its normal browser scheduling.
        if (typeof this.gl.flushEXP === 'function') {
            const started = performance.now();
            this.gl.flushEXP();
            this.stats.nativeDrainMs = performance.now() - started;
            const previous = this.sceneryBudget;
            this.sceneryState = adaptNativeSceneryBudget(this.sceneryState, this.stats.nativeDrainMs);
            this.sceneryBudget = this.sceneryState.level;
            if (previous !== this.sceneryBudget)
                console.info('MADGER_NATIVE_SCENERY_BUDGET', JSON.stringify({ level: this.sceneryBudget, drainMs: Math.round(this.stats.nativeDrainMs) }));
            if (++this.nativeFrames === 1 || this.nativeFrames === 30)
                console.info('MADGER_EXPEDITION_RENDER ' + JSON.stringify({ frame: this.nativeFrames, instanced: !!this.drawInstanced, ...this.stats, sceneryBudget: this.sceneryBudget }));
        }
    }
    dispose() { if (this.dead)
        return; this.dead = true; try {
        this.sceneTarget?.dispose();
        if (this.portrait)
            this.gl.deleteTexture(this.portrait);
        if (this.atlas)
            this.gl.deleteTexture(this.atlas);
        for (const t of this.surfaces)
            this.gl.deleteTexture(t);
        this.surfaces = [];
        for (const b of this.batches.values()) {
            this.gl.deleteBuffer(b.vertex);
            this.gl.deleteBuffer(b.instances);
            if (b.elements)
                this.gl.deleteBuffer(b.elements);
        }
        this.gl.deleteProgram(this.program);
    }
    catch { /* A lost context has already freed its GPU resources. */ } this.batches.clear(); }
}
exports.ExpeditionRenderer = ExpeditionRenderer;
};
factories.gl=function(require,module,exports){exports.ExpeditionRenderer=Renderer;exports.color=require("legacy-geometry").color;};
return {Scene:require("scene").ExpeditionScene,drawCompanion:require("companion-models").drawCompanion,geometry:require("legacy-geometry").geometry,tailGeometry:require("legacy-geometry").tailGeometry,fresh:require("core").freshExpedition,pathHeight:require("core").overgrownPathHeight,pathOffset:require("core").overgrownPathOffset};}
