/* Puma Service -- what there is to play: target practice, the convoy
 * actions (single engagements, each its own night or day of the war), a
 * custom action, and the war itself: patrols out of port into the Empire's
 * waters, and a career across them.
 *
 * On patrol the Empire's convoys run their lanes whether we are near or
 * not, more of them early in the war, fewer and better guarded later. */
"use strict";
(() => {
  const C = PS.C, Sea = PS.Sea, Sh = PS.Ships, Sub = PS.Sub, E = PS.Engine = PS.Engine || {};
  const NM = PS.YD_NM, R = S => PS.rand(S);
  const H = h => h * 3600;

  /* ---- the convoy actions ---- */
  /* when: month of the war and hour; at: the convoy's position (nm), heading (deg); sub: ahead, to starboard (yd) of the convoy */
  E.ACTIONS = [
    { id: "lone", name: "A Lone Freighter", note: "One cargo liner, unescorted, in daylight. A first shot.", mi: 1, hour: 10, wx: "clear", cls: "caracal",
      at: [700, 330], hdg: 260, conv: { kinds: ["liner"], n: 1, escorts: 0 }, sub: [7000, 3500] },
    { id: "narrows", name: "First Night in the Narrows", note: "Three freighters and an old destroyer under a half moon. The old boat, the bad torpedoes.", mi: 0, hour: 1, day: 8, wx: "clear", cls: "ocelot",
      at: [330, 440], hdg: 345, conv: { kinds: ["freighter", "coaster"], n: 3, escorts: 1, esc: ["destroyer"] }, sub: [8000, -3000] },
    { id: "tankers", name: "The Ember Tankers", note: "Two tankers and their freighters at dawn, one destroyer ahead of them.", mi: 4, hour: 5.4, wx: "haze", cls: "caracal",
      at: [250, 560], hdg: 40, conv: { kinds: ["tanker", "tanker", "freighter", "freighter"], n: 4, escorts: 1, esc: ["destroyer"], fixed: true }, sub: [9000, 4000] },
    { id: "kessrin", name: "Kessrin Strait by Moonlight", note: "Six ships and three escorts in a full moon. Work in on the surface, and keep your bow low.", mi: 17, hour: 23, day: 14, wx: "clear", cls: "cougar",
      at: [520, 330], hdg: 300, conv: { kinds: ["freighter", "liner", "coaster"], n: 6, escorts: 3 }, sub: [10000, 5000] },
    { id: "fog", name: "Fog off Marrow", note: "Four ships and two escorts in thick fog. Your ears before your eyes.", mi: 21, hour: 9, wx: "fog", cls: "cougar",
      at: [450, 560], hdg: 70, conv: { kinds: ["freighter", "coaster", "liner"], n: 4, escorts: 2 }, sub: [5000, 2000] },
    { id: "troops", name: "Troops for Hollow Reach", note: "Three troopships and a liner, three destroyers round them, overcast. Hit them before they land.", mi: 27, hour: 14, wx: "overcast", cls: "catamount",
      at: [640, 345], hdg: 85, conv: { kinds: ["troopship", "troopship", "troopship", "liner"], n: 4, escorts: 3, esc: ["destroyer", "destroyer", "destroyer"], fixed: true }, sub: [9000, -4000] },
    { id: "squall", name: "Squall in Vargrin Sound", note: "A big convoy under heavy weather. The sea hides you, and them.", mi: 34, hour: 16, wx: "squall", cls: "catamount",
      at: [400, 200], hdg: 315, conv: { kinds: ["freighter", "tanker", "liner", "coaster"], n: 7, escorts: 4 }, sub: [8000, 4500] },
    { id: "last", name: "The Last Convoy", note: "Late in the war: five ships, five escorts, and radar on all of them. A dark night.", mi: 46, hour: 2, day: 2, wx: "clear", cls: "catamount",
      at: [342, 380], hdg: 2, conv: { kinds: ["tanker", "liner", "freighter"], n: 5, escorts: 5 }, sub: [11000, 5000] },
  ];
  E.CUSTOM = {
    when: [[2, "Year I"], [14, "Year II"], [26, "Year III"], [38, "Year IV"]],
    size: [["small", "Small", 3], ["medium", "Medium", 6], ["large", "Large", 9]],
    escorts: [["none", "None", 0], ["light", "Light", 1], ["heavy", "Heavy", 2]],
    time: [["day", "Day", 11], ["dusk", "Dusk", 18.4], ["night", "Night", 0.5]],
    wx: [["clear", "Clear"], ["overcast", "Overcast"], ["squall", "Squalls"], ["fog", "Fog"]],
  };

  /* ---- a fresh state ---- */
  E.base = ({ seed, mode, mi = 0, hour = 12, day = 1, real, cls, name = "Talus" }) => {
    const S = {
      v: 1, seed, rs: seed | 0, mode, phase: "sea", t: C.monthStart(mi) + (day - 1) * C.DAY + H(hour), tcReq: 0, tcCap: C.TC_MAX_IDX, nextId: 1,
      real: Object.assign({}, real), wx: { k: "clear", vis: 1, sea: 2, until: 0 }, sub: null, ships: [], convoys: [], torps: [], charges: [], shells: [], planes: [],
      tdc: PS.Weapons.newTdc(), log: [], stats: { tons: 0, sunk: [], fired: 0, hits: 0, duds: 0, charges: 0, dcNear: 0, dmg: 0, maxDepth: 0, shells: 0 },
      konami: false, cheated: false, end: null, nameI: 0, potential: 0, msg: null,
    };
    S.sub = Sub.init(Sub.make(cls, name, C.monthOf(S.t)));
    return S;
  };
  E.setWx = (S, k) => { const w = C.WX[k]; S.wx = { k, vis: w.vis, sea: Math.round(PS.lerp(w.sea[0], w.sea[1], R(S))), until: S.t + H(PS.lerp(C.WX_HOURS[0], C.WX_HOURS[1], R(S))) }; };
  /* where the boat sits relative to a convoy: ahead and to starboard of its course */
  const offset = (x, y, hdg, ahead, star) => [x + PS.hx(hdg) * ahead + Math.cos(hdg) * star, y + PS.hy(hdg) * ahead + Math.sin(hdg) * star];

  E.newAction = (id, { seed, real, custom }) => {
    let A = E.ACTIONS.find(a => a.id === id);
    if (id === "custom") {
      const c = custom, n = E.CUSTOM.size.find(x => x[0] === c.size)[2], mi = c.mi;
      const e = C.era(mi), escN = Math.round([0, 1.2, 2.2][E.CUSTOM.escorts.findIndex(x => x[0] === c.escorts)] * e.escorts * (0.6 + n / 5));
      A = { id: "custom", name: "Custom action", mi, hour: E.CUSTOM.time.find(x => x[0] === c.time)[2], day: 14, wx: c.wx, cls: c.cls,
        at: [560, 345], hdg: 280, conv: { kinds: C.MERCHANTS, n, escorts: escN }, sub: [9000, 4000] };
    }
    const S = E.base({ seed, mode: "action", mi: A.mi, hour: A.hour, day: A.day || 10, real, cls: A.cls, name: PS.pick(PS.mulberry(seed), C.BOAT_NAMES) });
    S.scn = A.id; S.scnName = A.name;
    E.setWx(S, A.wx);
    const hdg = A.hdg * PS.DEG, x = A.at[0] * NM, y = A.at[1] * NM;
    let comp;
    if (A.conv.fixed) {
      comp = A.conv.kinds.map(cls => ({ cls, name: Sh.name(S, "merchant"), dmg: 0 }));
      for (const cls of A.conv.esc || []) comp.push({ cls, name: Sh.name(S, "escort"), dmg: 0 });
    } else {
      comp = Sh.makeComp(S, { kinds: A.conv.kinds, n: A.conv.n, escorts: A.conv.esc ? 0 : A.conv.escorts, mi: A.mi });
      for (const cls of A.conv.esc || []) comp.push({ cls, name: Sh.name(S, "escort"), dmg: 0 });
    }
    S.potential = comp.filter(c => C.SHIPS[c.cls].role === "merchant").reduce((s, c) => s + C.SHIPS[c.cls].tons, 0);
    const cv = Sh.makeConvoy(S, { x, y, hdg, comp });
    const [sx, sy] = offset(x, y, hdg, A.sub[0], A.sub[1]);
    Object.assign(S.sub, { x: sx, y: sy, hdg: PS.angTo(sx, sy, x, y), ordHdg: PS.angTo(sx, sy, x, y), bell: 3, spd: 6 });
    if (Sea.depthAt(sx, sy) < 80) { S.sub.x = x + PS.hx(hdg) * 6000; S.sub.y = y + PS.hy(hdg) * 6000; }
    Sh.spawn(S, cv);
    E.log(S, `${A.name}. ${C.dateStr(S.t)}, ${C.timeStr(S.t)}.`);
    return S;
  };

  E.newPractice = ({ seed, real, kind = "torpedo" }) => {
    const r = Object.assign({}, real, { duds: false, expert: false });
    const S = E.base({ seed, mode: "practice", mi: 26, hour: 10, day: 12, real: r, cls: "caracal", name: "Training" });
    S.scn = kind; S.scnName = kind === "gun" ? "Gunnery practice" : "Torpedo practice";
    E.setWx(S, "clear"); S.wx.sea = 1;
    const x = 1000 * NM, y = 260 * NM, hdg = 270 * PS.DEG;
    const comp = kind === "gun" ? [{ cls: "coaster", name: "Target hulk", dmg: 0 }] : [{ cls: "freighter", name: "Target one", dmg: 0 }, { cls: "liner", name: "Target two", dmg: 0 }, { cls: "coaster", name: "Target three", dmg: 0 }];
    const cv = Sh.makeConvoy(S, { x, y, hdg, comp, spd: kind === "gun" ? 5 : 8 });
    S.real.zig = false;
    const [sx, sy] = offset(x, y, hdg, kind === "gun" ? 2500 : 4500, kind === "gun" ? 1800 : 2600);
    Object.assign(S.sub, { x: sx, y: sy, hdg: hdg + Math.PI, ordHdg: hdg + Math.PI, bell: kind === "gun" ? 2 : 2, spd: 4, depth: kind === "gun" ? 0 : C.PD, ordDepth: kind === "gun" ? 0 : C.PD });
    if (kind !== "gun") { S.sub.scope.up = true; S.sub.scope.h = 1; }
    S.potential = comp.reduce((s, c) => s + C.SHIPS[c.cls].tons, 0);
    Sh.spawn(S, cv);
    /* the periscope trained on the nearest target: the first thing a newcomer sees is a ship to lock */
    if (kind !== "gun") {
      const sub = S.sub, near = S.ships.slice().sort((a, b) => PS.dist(sub.x, sub.y, a.x, a.y) - PS.dist(sub.x, sub.y, b.x, b.y))[0];
      if (near) sub.scope.brg = PS.angDiff(sub.hdg, PS.angTo(sub.x, sub.y, near.x, near.y));
    }
    E.log(S, `${S.scnName}. Targets on a steady course, no escorts.`);
    return S;
  };

  /* ---- the war: a career and its patrols ---- */
  const Career = PS.Career = {};
  Career.make = ({ name, mi, real, seed }) => {
    const r = PS.mulberry(seed);
    const cls = mi >= 20 ? "catamount" : mi >= 6 ? "cougar" : "caracal";
    return { v: 1, name: name || "Puma", t: C.monthStart(mi) + C.DAY * 3 + H(8), start: mi, real: Object.assign({}, real), seed, cls, boat: PS.pick(r, C.BOAT_NAMES),
      pts: 0, tons: 0, ships: 0, patrols: [], medals: [], rank: C.RANKS[0][1], alive: true, over: null, base: "talon", n: 0, cheated: false };
  };
  Career.basesOpen = car => Sea.portsOpen(C.monthOf(car.t));
  /* the boats command will give you now: what has come into service, by rank */
  Career.boatsOffered = car => {
    const mi = C.monthOf(car.t), ri = C.RANKS.findIndex(([, n]) => n === car.rank);
    return C.SUB_ORDER.filter(k => C.SUBS[k].from <= mi && (k !== "catamount" || ri >= 1 || mi >= 30) && k !== "ocelot");
  };
  /* where command sends you: zones with the traffic, by the month */
  Career.orders = (car, seed) => {
    const r = PS.mulberry(seed + car.n * 977), mi = C.monthOf(car.t);
    const zs = Sea.zones.filter(z => !(mi < 6 && (z.id === "approaches" || z.id === "vargrin")));
    return PS.pick(r, zs).id;
  };

  E.newPatrol = (car, seed) => {
    const S = E.base({ seed, mode: "patrol", mi: 0, real: car.real, cls: car.cls, name: car.boat });
    S.t = car.t;
    S.sub = Sub.init(Sub.make(car.cls, car.boat, C.monthOf(S.t)));
    S.cap = { name: car.name, rank: car.rank };
    S.phase = "port";
    S.patrol = { n: car.n + 1, zone: Career.orders(car, seed), base: car.base, out: 0, due: 0, tons0: 0, sunk0: 0, intercepts: [], towed: false, cheated: false };
    E.setWx(S, "clear");
    const p = Sea.port(car.base) || Sea.ports[0];
    Object.assign(S.sub, { x: p.x, y: p.y, hdg: 270 * PS.DEG, ordHdg: 270 * PS.DEG });
    E.seedLanes(S);
    E.log(S, `Patrol ${S.patrol.n}: orders for ${Sea.ZONES.find(z => z.id === S.patrol.zone).name}.`);
    return S;
  };
  E.depart = (S, ev = []) => {
    const p = Sea.port(S.patrol.base) || Sea.ports[0];
    S.phase = "sea";
    S.patrol.out = S.t; S.patrol.due = S.t + C.PATROL_DAYS * C.DAY; S.patrol.tons0 = S.stats.tons; S.patrol.sunk0 = S.stats.sunk.length;
    const z = Sea.zones.find(q => q.id === S.patrol.zone), h = PS.angTo(p.x, p.y, z.x, z.y);
    Object.assign(S.sub, { x: p.x + PS.hx(h) * 4000, y: p.y + PS.hy(h) * 4000, hdg: h, ordHdg: h, bell: 4, spd: 12, depth: 0, ordDepth: 0 });
    E.log(S, `Underway from ${p.name}, ${C.dateStr(S.t)}.`);
    ev.push({ t: "departed" });
    return ev;
  };
  /* the lanes, already busy when the patrol begins */
  E.seedLanes = S => {
    const mi = C.monthOf(S.t), e = C.era(mi);
    for (const L of Sea.lanes) for (const dir of [1, -1]) {
      const n = Math.round(L.len / (16 * 3600 * 9 * PS.KN) * L.w * e.traffic);
      for (let i = 0; i < n; i++) E.newConvoyOn(S, L, dir, L.len * R(S));
    }
  };
  E.newConvoyOn = (S, L, dir, s) => {
    const mi = C.monthOf(S.t), e = C.era(mi);
    const lone = R(S) < (mi < 18 ? 0.35 : 0.2);
    const n = lone ? 1 : 2 + Math.floor(R(S) * (3 + 4 * e.traffic));
    const comp = Sh.makeComp(S, { kinds: L.kinds, n, mi });
    const p = Sea.along(L, dir > 0 ? s : s), hdg = dir > 0 ? p.hdg : PS.normAng(p.hdg + Math.PI);
    return Sh.makeConvoy(S, { x: p.x, y: p.y, hdg, comp, lane: L.id, dir });
  };
  /* new convoys putting out from the ends of the lanes */
  E.traffic = (S, dt) => {
    if (S.mode !== "patrol") return;
    const e = C.era(C.monthOf(S.t));
    for (const L of Sea.lanes) for (const dir of [1, -1]) {
      if (R(S) < L.w * e.traffic * dt / H(16)) E.newConvoyOn(S, L, dir, dir > 0 ? 0 : L.len);
    }
  };
  /* in reach of a base, on the surface, slow: she can tie up */
  E.nearPort = S => {
    if (S.mode !== "patrol" || S.phase !== "sea") return null;
    const s = S.sub;
    return Sea.portsOpen(C.monthOf(S.t)).find(p => PS.dist(s.x, s.y, p.x, p.y) < 9000) || null;
  };
  E.canDock = S => { const p = E.nearPort(S); return p && Sub.surfaced(S.sub) && S.sub.spd < 9 ? p : null; };
  /* the patrol's report, written into the career */
  E.enterPort = (S, car, port, towed = false) => {
    const sunk = S.stats.sunk.slice(S.patrol.sunk0), tons = sunk.reduce((a, x) => a + x.tons, 0), pct = C.realPct(S.real);
    const pts = Math.round(tons * pct / 100), days = Math.round((S.t - S.patrol.out) / C.DAY);
    const medal = towed ? null : C.MEDALS.slice().reverse().find(([at]) => pts >= at);
    const rankWas = car.rank;
    car.pts += pts; car.tons += tons; car.ships += sunk.length; car.n = S.patrol.n;
    car.rank = C.rankFor(car.pts);
    if (medal) car.medals.push({ name: medal[1], n: S.patrol.n, t: S.t });
    if (S.cheated) car.cheated = true;
    const zone = Sea.ZONES.find(z => z.id === S.patrol.zone);
    const rep = { n: S.patrol.n, zone: zone ? zone.name : "", out: S.patrol.out, back: S.t, days, tons, pts, ships: sunk, medal: medal ? medal[1] : null, rankUp: car.rank !== rankWas ? car.rank : null, towed, fired: S.stats.fired, charges: S.stats.charges, cls: S.sub.cls, boat: S.sub.name };
    car.patrols.push(rep);
    car.base = port.id;
    /* the refit: two to three weeks in the yard */
    const refit = C.REFIT_DAYS[0] + Math.floor(R(S) * (C.REFIT_DAYS[1] - C.REFIT_DAYS[0]));
    car.t = S.t + refit * C.DAY;
    if (car.t >= C.WAR_END) car.over = "war";
    S.phase = "port"; S.report = rep;
    return rep;
  };
  Career.lost = (car, S) => {
    car.alive = false; car.over = "lost";
    const sunk = S.stats.sunk.slice(S.patrol ? S.patrol.sunk0 : 0), tons = sunk.reduce((a, x) => a + x.tons, 0);
    car.pts += Math.round(tons * C.realPct(S.real) / 100); car.tons += tons; car.ships += sunk.length;
    car.patrols.push({ n: S.patrol ? S.patrol.n : car.n + 1, lost: true, why: S.end && S.end.why, back: S.t, tons, ships: sunk, days: Math.round((S.t - (S.patrol ? S.patrol.out : S.t)) / C.DAY), boat: S.sub.name, cls: S.sub.cls });
  };
})();
