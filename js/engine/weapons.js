/* Puma Service -- torpedoes, the torpedo data computer, and the deck gun.
 *
 * The TDC holds an estimate of the target: where it is, its course and its
 * speed, run on by dead reckoning between looks. Each look through the
 * periscope (or from the bridge) puts the bearing right; a radar range, or a
 * stadimeter reading, puts the range right. Course and speed are the hard
 * part: in Classic you judge the angle on the bow by eye and set it, and the
 * speed with it; the Field aid works them out from watching. From the
 * estimate the TDC solves the shot: the gyro angle that sends a torpedo to
 * meet the target, allowing for its turn out of the tube.
 *
 * A torpedo leaves the tube along the boat's axis, turns onto its gyro
 * course, arms after 450 yards, and runs until it hits or its fuel is gone.
 * Early in the war the year's torpedoes ran deep (under a shallow escort),
 * went off early, or hit and did nothing; the reality setting keeps that. */
"use strict";
(() => {
  const C = PS.C, Sub = PS.Sub, Sh = PS.Ships, Det = PS.Detect, W = PS.Weapons = {};
  const R = S => PS.rand(S);

  /* ---- the TDC ---- */
  W.newTdc = () => ({ tgt: null, ex: 0, ey: 0, ec: 0, es: 0, rngT: -1, set: false, salvo: 0, salvoT: -1e9 });
  W.lock = (S, id, ev) => {
    const t = Sh.byId(S, id), s = S.sub;
    if (!t) return;
    const T = S.tdc, b = PS.angTo(s.x, s.y, t.kn.x, t.kn.y), rng = PS.dist(s.x, s.y, t.kn.x, t.kn.y);
    T.tgt = id; T.set = true;
    /* the first guess: range as it was seen, course across the line of sight, ten knots */
    const k = C.SHIPS[t.cls], guess = t.kn.by === "radar" ? 1 : 1 + PS.gauss(() => R(S)) * 0.15;
    T.ex = s.x + PS.hx(b) * rng * guess; T.ey = s.y + PS.hy(b) * rng * guess;
    T.ec = S.real.aob ? PS.normAng(b + Math.PI / 2) : t.hdg; T.es = S.real.aob ? 10 : t.spd * 0.8; T.rngT = S.t;
    T.cls = t.cls; T.k = k;
    ev.push({ t: "locked", id, name: t.name });
  };
  W.unlock = S => { S.tdc.tgt = null; S.tdc.set = false; };
  /* what the TDC thinks now */
  W.est = S => {
    const T = S.tdc, s = S.sub;
    if (!T.set) return null;
    const brg = PS.angTo(s.x, s.y, T.ex, T.ey), rng = PS.dist(s.x, s.y, T.ex, T.ey);
    const aob = PS.angDiff(T.ec, PS.normAng(brg + Math.PI));   /* + : we are on its starboard side */
    return { x: T.ex, y: T.ey, c: T.ec, s: T.es, brg, rng, aob };
  };
  /* the player's hand on the dials */
  W.dial = (S, a, ev) => {
    const T = S.tdc, s = S.sub, e = W.est(S); if (!e) return;
    if (a.what === "aob") { const aob = PS.clamp(e.aob + a.d, -Math.PI, Math.PI); T.ec = PS.normAng(e.brg + Math.PI - aob); }
    if (a.what === "spd") T.es = PS.clamp(Math.round((T.es + a.d) * 2) / 2, 0, 40);
    if (a.what === "rng") { const r = PS.clamp(e.rng + a.d, 200, 30000); T.ex = s.x + PS.hx(e.brg) * r; T.ey = s.y + PS.hy(e.brg) * r; }
  };
  /* a stadimeter reading: the masthead's height against the reticle, a few per cent out */
  W.stadimeter = (S, ev) => {
    const T = S.tdc, t = T.tgt !== null && Sh.byId(S, T.tgt), s = S.sub;
    if (!t || !Det.known(S, t)) { ev.push({ t: "noRange" }); return; }
    const d = PS.dist(s.x, s.y, t.x, t.y) * (1 + PS.gauss(() => R(S)) * (S.sub.scope.hi ? 0.03 : 0.06)), b = PS.angTo(s.x, s.y, t.x, t.y);
    T.ex = s.x + PS.hx(b) * d; T.ey = s.y + PS.hy(b) * d; T.rngT = S.t;
    ev.push({ t: "ranged", rng: d });
  };
  /* each step: run the estimate on, and put it right by what can be seen */
  W.tdcStep = (S, dt, ev, aids) => {
    const T = S.tdc, s = S.sub;
    if (!T.set) return;
    T.ex += PS.hx(T.ec) * T.es * PS.KN * dt; T.ey += PS.hy(T.ec) * T.es * PS.KN * dt;
    const t = T.tgt !== null ? Sh.byId(S, T.tgt) : null;
    if (!t || t.sunk) { if (T.tgt !== null) { T.tgt = null; ev.push({ t: "lostLock" }); } return; }
    if (!Det.known(S, t) || S.t - t.kn.t > 0.5) return;
    const b = PS.angTo(s.x, s.y, t.x, t.y), trueR = PS.dist(s.x, s.y, t.x, t.y);
    let r = PS.dist(s.x, s.y, T.ex, T.ey);
    if (t.kn.by === "radar" || (aids && aids.autoRange)) { r += (trueR - r) * (1 - Math.exp(-dt / 4)); T.rngT = S.t; }
    T.ex = s.x + PS.hx(b) * r; T.ey = s.y + PS.hy(b) * r;
    if (!S.real.aob) {
      /* the Field TDC: it works out course and speed from watching, given time */
      const f = 1 - Math.exp(-dt / 22);
      T.ec = PS.normAng(T.ec + PS.angDiff(T.ec, t.hdg) * f); T.es += (t.spd - T.es) * f;
    }
  };

  /* ---- the firing solution ---- */
  /* tube axis a (radians), from point (sx, sy), against the estimate e; o: offset of aim in radians */
  W.solve = (S, e, bank, o = 0) => {
    const s = S.sub, tk = C.TORPS[s.mark], v = tk.kn * PS.KN, axis = PS.normAng(s.hdg + (bank === "A" ? Math.PI : 0)), r = C.TORP.turnR;
    if (!e) return null;
    const vx = PS.hx(e.c) * e.s * PS.KN, vy = PS.hy(e.c) * e.s * PS.KN;
    const ox = s.x + PS.hx(axis) * C.TORP.reach, oy = s.y + PS.hy(axis) * C.TORP.reach;
    let th = PS.angTo(ox, oy, e.x, e.y), tA = 0, ax = ox, ay = oy, t = 0;
    for (let it = 0; it < 5; it++) {
      /* the turn out of the tube: an arc of radius r through the gyro angle */
      const g = PS.angDiff(axis, th), side = g >= 0 ? 1 : -1, cx = ox + Math.cos(axis) * r * side, cy = oy + Math.sin(axis) * r * side;
      const a0 = Math.atan2(oy - cy, ox - cx), a1 = a0 + g;
      ax = cx + Math.cos(a1) * r; ay = cy + Math.sin(a1) * r; tA = Math.abs(g) * r / v;
      /* then straight, to meet the target: |D + V t| = v t */
      const Dx = e.x + vx * tA - ax, Dy = e.y + vy * tA - ay, A = vx * vx + vy * vy - v * v, B = 2 * (Dx * vx + Dy * vy), Cc = Dx * Dx + Dy * Dy;
      if (Math.abs(A) < 1e-9) t = -Cc / B;
      else { const disc = B * B - 4 * A * Cc; if (disc < 0) return { ok: false, why: "speed" }; const q = Math.sqrt(disc), t1 = (-B - q) / (2 * A), t2 = (-B + q) / (2 * A); t = Math.min(...[t1, t2].filter(x => x > 0)); }
      if (!isFinite(t) || t <= 0) return { ok: false, why: "speed" };
      th = PS.angTo(ax, ay, e.x + vx * (tA + t), e.y + vy * (tA + t));
    }
    th = PS.normAng(th + o);
    const gyro = PS.angDiff(axis, th), run = v * (tA + t) + C.TORP.reach;
    const track = Math.abs(PS.angDiff(th, e.c));   /* the angle the torpedo meets it at */
    const ok = Math.abs(gyro) <= C.TORP.gyroMax && run <= tk.range;
    return { ok, why: ok ? "" : Math.abs(gyro) > C.TORP.gyroMax ? "gyro" : "range", gyro, hdg: th, run, track, time: tA + t };
  };
  const SPREADS = { 1: [0], 2: [-0.5, 0.5], 3: [0, -1, 1], 4: [-1.5, -0.5, 0.5, 1.5] };

  W.canFire = (S, bank) => {
    const s = S.sub;
    if (s.sys[bank === "F" ? "tubesF" : "tubesA"] >= 0.5) return "damaged";
    if (s.depth > 120) return "deep";
    if (!s.tubes[bank].length) return "none";
    if (Sub.loaded(s, bank) === 0) return "empty";
    return "";
  };
  W.fire = (S, ev) => {
    const s = S.sub, T = S.tdc, bank = s.bank, why = W.canFire(S, bank);
    if (why) { ev.push({ t: "cantFire", why, bank }); return; }
    if (S.t - T.salvoT > 12) T.salvo = 0;
    const pat = SPREADS[s.spread] || [0], off = pat[T.salvo % pat.length] * C.SPREAD;
    T.salvo++; T.salvoT = S.t;
    const e = W.est(S);
    let hdg = PS.normAng(s.hdg + (bank === "A" ? Math.PI : 0) + off), sol = null;
    if (e) {
      sol = W.solve(S, e, bank, off);
      if (sol && sol.ok) hdg = sol.hdg;
      else if (sol) ev.push({ t: "noSolution", why: sol.why });
    }
    const i = s.tubes[bank].indexOf(0), store = bank === "F" ? "F" : "A";
    if (s.store[store] > 0) { s.tubes[bank][i] = C.TORP.reload; s.store[store]--; } else s.tubes[bank][i] = -1;
    const tk = C.TORPS[s.mark], era = C.era(C.monthOf(S.t)), axis = PS.normAng(s.hdg + (bank === "A" ? Math.PI : 0));
    const tp = { id: S.nextId++, x: s.x + PS.hx(axis) * C.TORP.reach, y: s.y + PS.hy(axis) * C.TORP.reach, hdg: axis, want: hdg, kn: tk.kn, run: 0, max: tk.range,
      mark: s.mark, fate: "ok", preAt: 0, depth: C.TORP.runDepth, tube: bank + (i + 1), wake: tk.wake };
    if (S.real.duds && !S.konami) {
      const r = R(S);
      if (r < era.circular) tp.fate = "circ";
      else if (r < era.circular + era.premature) { tp.fate = "pre"; tp.preAt = C.TORP.arm + R(S) * (tk.range - C.TORP.arm) * 0.8; }
      tp.depth += era.deep;
    }
    S.torps.push(tp);
    S.stats.fired++;
    ev.push({ t: "fired", tube: tp.tube, id: tp.id, solved: !!(sol && sol.ok), run: sol && sol.ok ? sol.run : 0 });
  };

  /* reloading, and the torpedoes running */
  W.step = (S, dt, ev) => {
    const s = S.sub, e = C.era(C.monthOf(S.t));
    for (const bank of ["F", "A"]) {
      const slow = 1 - s.sys[bank === "F" ? "tubesF" : "tubesA"] * 0.7;
      s.tubes[bank].forEach((v, i) => { if (v > 0) { s.tubes[bank][i] = Math.max(0, v - dt * slow); if (s.tubes[bank][i] === 0) ev.push({ t: "reloaded", tube: bank + (i + 1) }); } });
    }
    const L = Det.light(S);
    for (const tp of S.torps) {
      let left = dt;
      while (left > 0 && !tp.done) {
        const h = Math.min(0.5, left); left -= h;
        const v = tp.kn * PS.KN, w = v / C.TORP.turnR;
        if (tp.fate === "circ" && tp.run > 600) tp.want = PS.normAng(tp.hdg + 0.5);
        tp.hdg = PS.turnToward(tp.hdg, tp.want, w * h);
        const x0 = tp.x, y0 = tp.y;
        tp.x += PS.hx(tp.hdg) * v * h; tp.y += PS.hy(tp.hdg) * v * h; tp.run += v * h;
        if (tp.fate === "pre" && tp.run >= tp.preAt) {
          tp.done = true; S.stats.prematures = (S.stats.prematures || 0) + 1;
          ev.push({ t: "torpPremature", id: tp.id, x: tp.x, y: tp.y });
          alarmNear(S, tp.x, tp.y, ev, false);
          break;
        }
        /* against every ship: sampled along the step */
        const n = Math.max(1, Math.ceil(v * h / 5));
        for (let q = 1; q <= n && !tp.done; q++) {
          const px = PS.lerp(x0, tp.x, q / n), py = PS.lerp(y0, tp.y, q / n);
          for (const sh of S.ships) {
            if (sh.sunk || tp.done) continue;
            const k = C.SHIPS[sh.cls], dx = px - sh.x, dy = py - sh.y, u = dx * PS.hx(sh.hdg) + dy * PS.hy(sh.hdg), vv = dx * Math.cos(sh.hdg) + dy * Math.sin(sh.hdg);
            if (Math.abs(u) > k.len / 2 || Math.abs(vv) > k.beam / 2 + C.TORP.hitSlop) continue;
            if (tp.depth > k.draft + 3) { if (!tp.under) { tp.under = true; ev.push({ t: "torpUnder", id: tp.id, ship: sh.id }); } continue; }
            tp.done = true;
            const where = Math.abs(u) < k.len * 0.2 ? "mid" : u > 0 ? "fore" : "aft";
            const track = Math.abs(Math.sin(PS.angDiff(tp.hdg, sh.hdg)));
            const cv = Sh.convoy(S, sh.conv);
            if (tp.run < C.TORP.arm) { ev.push({ t: "torpDud", id: tp.id, ship: sh.id, why: "unarmed", x: px, y: py }); S.stats.duds++; if (cv) Sh.alarm(S, cv, S.sub.x, S.sub.y, ev); break; }
            if (S.real.duds && !S.konami && sh.sinking === 0 && R(S) < e.dud * (0.4 + 0.8 * track)) {
              ev.push({ t: "torpDud", id: tp.id, ship: sh.id, x: px, y: py }); S.stats.duds++;
              if (cv) Sh.alarm(S, cv, PS.lerp(sh.x, S.sub.x, 0.6), PS.lerp(sh.y, S.sub.y, 0.6), ev);
              break;
            }
            S.stats.hits++;
            ev.push({ t: "torpHit", id: tp.id, ship: sh.id, where, x: px, y: py });
            Sh.hit(S, sh, 0.9 + R(S) * 0.4 + (where === "mid" ? 0.15 : 0), where, ev);
            if (cv) Sh.alarm(S, cv, PS.lerp(sh.x, S.sub.x, 0.5) + (R(S) - 0.5) * 1500, PS.lerp(sh.y, S.sub.y, 0.5) + (R(S) - 0.5) * 1500, ev, true);
            break;
          }
        }
        /* a circular runner coming home */
        if (!tp.done && tp.fate === "circ" && tp.run > 500 && PS.dist(tp.x, tp.y, s.x, s.y) < 40 && s.depth < 30) {
          tp.done = true; ev.push({ t: "torpHitUs" }); Sub.hurt(S, 1.0, "mid", ev); break;
        }
        if (tp.run >= tp.max) { tp.done = true; ev.push({ t: "torpMiss", id: tp.id }); break; }
      }
      /* a steam torpedo's wake, seen by day: the convoy turns to comb it */
      if (!tp.done && tp.wake && L > 0.5 && !tp.seen) for (const sh of S.ships) {
        if (!Sh.alive(sh) || PS.dist(sh.x, sh.y, tp.x, tp.y) > 1300) continue;
        if (R(S) < 1 - Math.pow(0.92, dt)) { tp.seen = true; ev.push({ t: "wakeSeen", ship: sh.id }); const cv = Sh.convoy(S, sh.conv); if (cv) Sh.alarm(S, cv, s.x + (R(S) - 0.5) * 2500, s.y + (R(S) - 0.5) * 2500, ev); break; }
      }
    }
    S.torps = S.torps.filter(t => !t.done);
    W.gunStep(S, dt, ev);
  };
  function alarmNear(S, x, y, ev, hard) {
    let best = null, bd = 9000;
    for (const sh of S.ships) { const d = PS.dist(sh.x, sh.y, x, y); if (d < bd) { bd = d; best = sh; } }
    if (best) Sh.alarm(S, Sh.convoy(S, best.conv), PS.lerp(x, S.sub.x, 0.4), PS.lerp(y, S.sub.y, 0.4), ev, hard);
  }

  /* ---- the deck gun: bearing, range, fire; shells take their time ---- */
  W.gunOrder = (S, a, ev) => {
    const s = S.sub, g = s.gun;
    if (a.a === "gun") {
      if (!Sub.surfaced(s)) { ev.push({ t: "gunNo", why: "submerged" }); return; }
      if (s.sys.gun >= 0.5) { ev.push({ t: "gunNo", why: "damaged" }); return; }
      g.on = !g.on; if (!g.on) g.man = 0;
      ev.push({ t: g.on ? "gunManned" : "gunSecured" });
    }
    if (a.a === "gunTrain") g.brg = PS.normAng(g.brg + a.d);
    if (a.a === "gunSetBrg") g.brg = PS.normAng(a.v);
    if (a.a === "gunRange") g.rng = PS.clamp(g.rng + a.d, 300, C.GUN.range);
    if (a.a === "gunSetRng") g.rng = PS.clamp(a.v, 300, C.GUN.range);
    if (a.a === "gunFire") {
      if (!g.on || g.man < 1) { ev.push({ t: "gunNo", why: "manning" }); return; }
      if (g.reload > 0) return;
      if (s.shells <= 0) { ev.push({ t: "gunNo", why: "shells" }); return; }
      s.shells--; g.reload = C.GUN.reload; S.stats.shells = (S.stats.shells || 0) + 1;
      const sp = C.GUN.spread * (1 + S.wx.sea / 3), b = PS.normAng(g.brg + PS.gauss(() => R(S)) * sp * 0.6), r = g.rng * (1 + PS.gauss(() => R(S)) * sp);
      S.shells.push({ id: S.nextId++, x: s.x + PS.hx(b) * r, y: s.y + PS.hy(b) * r, t: 1 + r / 750, by: "us" });
      ev.push({ t: "gunFire", brg: g.brg });
    }
  };
  W.gunStep = (S, dt, ev) => {
    const g = S.sub.gun;
    if (g.on) g.man = Math.min(1, g.man + dt / C.GUN.man);
    if (g.reload > 0) g.reload = Math.max(0, g.reload - dt);
    for (const sh of S.shells) {
      sh.t -= dt;
      if (sh.t > 0) continue;
      sh.done = true;
      let hit = null;
      for (const q of S.ships) {
        if (!Sh.alive(q)) continue;
        const k = C.SHIPS[q.cls], dx = sh.x - q.x, dy = sh.y - q.y, u = dx * PS.hx(q.hdg) + dy * PS.hy(q.hdg), v = dx * Math.cos(q.hdg) + dy * Math.sin(q.hdg);
        if (Math.abs(u) < k.len / 2 + 6 && Math.abs(v) < k.beam / 2 + 6) { hit = q; break; }
      }
      if (hit) { ev.push({ t: "gunHit", id: hit.id, x: sh.x, y: sh.y }); Sh.hit(S, hit, C.GUN.hit * (0.6 + R(S) * 0.8), "deck", ev, true, "shell"); }
      else ev.push({ t: "gunSplash", x: sh.x, y: sh.y });
      alarmNear(S, sh.x, sh.y, ev, false);
    }
    S.shells = S.shells.filter(x => !x.done);
  };
})();
