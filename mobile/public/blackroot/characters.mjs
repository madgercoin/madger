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
exports.OVERGROWN_ROUTES = exports.SUB_FORKS = exports.MAJOR_FORKS = exports.CHAMBERS = exports.HERO_SHARD_TARGET = exports.slide = exports.ZONES = exports.smooth = exports.clamp = exports.HAZARDS = exports.KINDS = exports.ENGINE_VERSION = exports.MAX_HP = exports.LANE_WIDTH = exports.TRACK_LENGTH = exports.STEP = void 0;
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
exports.MAX_HP = 3;
exports.ENGINE_VERSION = 1;
exports.KINDS = ['coin', 'gem', 'heart', 'shield', 'magnet', 'life', 'key', 'vault', 'workshop', 'burrow', 'boulder', 'saw', 'roots', 'steam', 'gap', 'mud', 'drone', 'crate', 'snow-white', 'gorilla-white', 'madger-bot', 'snow-sigil', 'guardian-totem', 'tech-cell', 'treasure-cache', 'chamber-door'];
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
    if (s.y <= .025 && s.slide <= .01) {
        s.vy = 8.7;
        s.y = .025;
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
        c.followVx += (64 * ((0, exports.clamp)(s.x + meta.offset, -2.8, 2.8) - c.followX) - 16 * c.followVx) * exports.STEP;
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
/** Mutates only this run. fixedStep is called at 120 Hz; rendering is independent. */
function fixedStep(s, course, events) {
    if (s.mode !== 'countdown' && s.mode !== 'running')
        return;
    s.tick++;
    // Collision uses the damped physical x, never an instantly changed lane index.
    const pathWidth = s.board === 'overgrown' ? overgrownPathWidth(s.route, s.distance) : 1;
    const limit = exports.LANE_WIDTH + .04 + Math.max(0, pathWidth - 1) * exports.LANE_WIDTH * 2;
    const target = s.lane * exports.LANE_WIDTH * Math.min(1, pathWidth), acceleration = 95 * (target - s.x) - 19 * s.vx;
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
    if (s.y > 0 || s.vy > 0) {
        s.vy -= 24 * exports.STEP;
        s.y = Math.max(0, s.y + s.vy * exports.STEP);
        if (s.y === 0) {
            s.vy = 0;
            if (oldY > 0)
                event(s, events, 'land');
            if (s.jumpBuffer > 0)
                jump(s, events);
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
    if (foot !== s.lastFoot && s.y < .02 && s.slide <= 0) {
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
            shape('ring', (0, gl_1.color)('#E0F0EC', .5), offset + s.x, 1.05 + s.y, -.60, radius, 1, radius, Math.PI / 2, 0, a);
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
        const stride = s.distance / 3.8 * TAU, grounded = s.y < .02 && s.slide <= 0;
        const bob = running && grounded ? Math.abs(Math.sin(stride)) * .07 : Math.sin(time * 2.6) * .018;
        const finishAge = s.mode === 'won' || s.mode === 'lost' ? age : undefined;
        const pose = (0, animation_1.burrowPose)(s.slide, s.slideAge, running, s.y, finishAge), crouch = pose.weight, air = (0, core_1.smooth)(s.y / .38);
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
            const gait = (0, animation_1.gaitPose)(s.distance, side, s.y, crouch, running), footZ = gait.z, footY = gait.y;
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
        this.shape('shadow', C.shadow, s.x + (0, core_1.routeOffset)(s), floorY(s.distance, s.route) + .018, 0, .76 * (1 - s.y * .10) * (1 - crouch * .45), 1, .62 * (1 - s.y * .10));
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
                this.shape('cone', C.goldGlow, s.x + (0, core_1.routeOffset)(s) + (i - 3) * .15, .45 + s.y, i * .18 + .35, .06, .8, .06, -Math.PI / 2, 0, 0);
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
        if (ahead < -6 || ahead > 102)
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
        const pose = (0, core_1.hazardPose)(item, s.time, s.distance), x = pose.x + offset + curve(pose.d) - curve(s.distance), z = -pose.ahead, y = floorY(pose.d, item.route), phase = time + item.phase;
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
                if (this.renderer.worldReady) {
                    const roll = (0, math_1.transform)(x, y + .80 + pose.y, z, 1, 1, 1, pose.roll, 0, 0);
                    this.shape('scanRock', (0, gl_1.color)('#ddd4c5'), 0, -.80, 0, 1.72, 3.05, 1.72, 0, 0, 0, roll);
                }
                else
                    this.shape('rock', (0, gl_1.color)('#947d66'), x, y + .80 + pose.y, z, .85, .80, .85, pose.roll, 0, 0);
                this.shape('ring', (0, gl_1.color)('#c59164'), x, y + .10, z, .83, 1, .83);
                shadow(.9);
                break;
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
    const scale = Math.min([.55, .75, 1][budget], Math.sqrt(800000 / Math.max(1, width * height)));
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
function geometry(shape) {
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
        for (const shape of ['box', 'sphere', 'rock', 'ridge', 'terrain', 'trail', 'ceiling', 'cylinder', 'cone', 'ring', 'leaf', 'headStripe', 'tail', 'shadow', 'halo', 'face']) {
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
