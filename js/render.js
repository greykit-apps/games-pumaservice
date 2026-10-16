/* Puma Service -- the play screen: whichever station you are at.
 *
 * The periscope (round, the reticle and its stadimeter ticks, the bearing
 * ring along the top, the sea washing over the glass in a swell), the
 * bridge (wide, or through the glasses, the rail and the TBT in front of
 * you, the deck gun's sight when it is manned), the instruments, the chart,
 * the damage report. And the title's lookout: a convoy at dusk. */
"use strict";
(() => {
  const K = PS.K, C = PS.C, Sub = PS.Sub, Det = PS.Detect, W = PS.Weapons, V = PS.View, FX = PS.FX, R = PS.Render = { cv: null, g: null, shake: 0, last: null };
  const INK = "#05070a";
  R.init = cv => { R.cv = cv; R.g = cv.getContext("2d"); R.g.imageSmoothingEnabled = false; };

  /* the station actually shown: no bridge while she is under */
  R.stationOf = (S, ui) => ui.station === "bridge" && !Sub.surfaced(S.sub) ? "scope" : ui.station;

  R.draw = (S, ui, now, dt) => {
    const g = R.g, Wd = R.cv.width, Ht = R.cv.height;
    FX.step(dt);
    const st = R.stationOf(S, ui);
    g.save();
    if (R.shake > 0.3 && PS.prefs.shake) { g.translate(Math.round((Math.random() - 0.5) * R.shake), Math.round((Math.random() - 0.5) * R.shake)); }
    R.shake *= Math.pow(0.02, dt);
    g.fillStyle = INK; g.fillRect(-8, -8, Wd + 16, Ht + 16);
    R.last = null;
    if (st === "scope") scope(g, S, ui, now, Wd, Ht);
    else if (st === "bridge") bridge(g, S, ui, now, Wd, Ht);
    else if (st === "panel") PS.Panel.draw(g, S, ui);
    else if (st === "chart") R.last = { chart: PS.Chart.draw(g, S, ui, ui.aids, now) };
    else if (st === "damage") PS.DamageArt.draw(g, S, ui, now);
    g.restore();
    /* our track, for the chart: a point a minute */
    if (!ui.track) ui.track = [];
    if (!ui.trackT || S.t - ui.trackT > 60) { ui.trackT = S.t; ui.track.push([S.sub.x, S.sub.y]); if (ui.track.length > 4000) ui.track.shift(); }
  };

  /* ---- the periscope ---- */
  function scope(g, S, ui, now, Wd, Ht) {
    const s = S.sub, sf = R.safe || { t: 28, b: 12 }, r = Math.round(Math.min(Wd * 0.42, (Ht - sf.t - 22 - sf.b) / 2)), cx = Math.round(Wd / 2), cy = Math.round(sf.t + 22 + r);
    const fov = (s.scope.hi ? 8 : 32) * PS.DEG, brg = PS.normAng(s.hdg + s.scope.brg);
    const up = s.scope.h > 0 && s.depth <= C.PD + 6;
    if (up) {
      const eyeH = Math.max(0.5, C.EYE.scope + (C.PD - s.depth) * 0.6);
      const v = V.draw(g, S, { x: s.x, y: s.y, eyeH, brg, fov, cx, cy, r, now, aids: ui.aids, calm: PS.calm(), mask: "scope" });
      R.last = { view: v, brg, fov, cx, cy, r };
      /* the glass coming up out of the water, or a wave washing over it */
      const exposed = (C.PD + 7 - s.depth) * s.scope.h, wave = S.wx.sea * 1.4 * (0.5 + 0.5 * Math.sin(now / 900));
      let wet = s.scope.h < 1 ? 1 - s.scope.h : 0;
      if (exposed < wave + 1.5 && s.scope.h >= 1) wet = Math.max(wet, PS.clamp((wave + 1.5 - exposed) / 3, 0, 0.85));
      if (wet > 0) {
        const wy = Math.round(cy + r - wet * r * 2.1);
        g.fillStyle = "rgba(34,92,96,.88)"; g.fillRect(cx - r, wy, r * 2, cy + r - wy);
        for (let x = cx - r; x < cx + r; x += 2) { const hh = Math.round(Math.sin(x / 9 + now / 300) * 3); g.fillStyle = "rgba(190,230,232,.55)"; g.fillRect(x, wy + hh, 2, 1); }
        for (let i = 0; i < 18; i++) { const bx = cx - r + K.hash(i, 1, Math.floor(now / 140)) * r * 2, by = wy + K.hash(i, 2, Math.floor(now / 140)) * (cy + r - wy); g.fillStyle = "rgba(220,245,245,.5)"; g.fillRect(Math.round(bx), Math.round(by), 1, 1); }
      }
      /* the target, bracketed */
      if (S.tdc.tgt !== null) { const d = v.drawn.find(q => q.id === S.tdc.tgt); if (d) bracket(g, d.x, (d.top + d.wl) / 2, Math.max(6, d.px * 0.55), Math.max(5, (d.wl - d.top) * 0.6 + 3), "#e6bd6a"); }
      /* the Field aid: where the solution aims, on the horizon */
      if (ui.aids.solution) {
        const e = W.est(S), sol = e && W.solve(S, e, s.bank);
        if (sol && sol.ok && Math.abs(PS.angDiff(brg, sol.hdg)) < fov / 2) { const x = v.toX(sol.hdg); K.rect(g, x, v.hz - 10, 1, 7, "rgba(230,189,106,.9)"); K.rect(g, x - 2, v.hz - 4, 5, 1, "rgba(230,189,106,.9)"); }
      }
      reticle(g, cx, cy, r, s.scope.hi, v.hz);
      if (s.sys.scope > 0) crack(g, cx, cy, r, s.sys.scope);
    } else {
      /* the periscope well */
      g.fillStyle = "#0a1016"; K.disc(g, cx, cy, r, r);
      for (let y = cy - r; y < cy + r; y += 3) { g.fillStyle = "rgba(127,224,168,.03)"; g.fillRect(cx - r, y, r * 2, 1); }
      const msg = s.sys.scope >= 0.5 ? "PERISCOPE DAMAGED" : Sub.surfaced(s) ? "ON THE SURFACE" : s.depth > C.PD + 4 ? "TOO DEEP: " + Math.round(s.depth) + " FT" : "PERISCOPE DOWN";
      K.text5(g, msg, Math.round(cx - K.text5w(msg) / 2), cy - 10, "#9aa3ad");
      const sub2 = Sub.surfaced(s) ? "THE BRIDGE IS 1; P TAKES HER TO PERISCOPE DEPTH" : s.depth > C.PD + 4 ? "PERISCOPE DEPTH IS " + C.PD + " FT: P" : "RAISE IT: UP ARROW";
      K.text5(g, sub2, Math.round(cx - K.text5w(sub2) / 2), cy + 4, "#6c7480");
    }
    mask(g, cx, cy, r, Wd, Ht);
    handles(g, cx, cy, r);
    /* the bearing ring above the glass: relative to the bow, and true */
    tape(g, cx, cy - r - 12, r, s.scope.brg, fov, true);
    K.text5(g, "TRUE " + PS.deg3(brg), cx - r - 2 - K.text5w("TRUE 000") - 8, cy - r - 15, "#e6bd6a", INK);
    K.text5(g, s.scope.hi ? "HIGH POWER" : "LOW POWER", cx + r + 10, cy - r - 15, "#9aa3ad", INK);
  }
  /* the training handles either side of the eyepiece */
  function handles(g, cx, cy, r) {
    const pw = Math.max(16, Math.round(r / 5));
    for (const sd of [-1, 1]) {
      const x0 = cx + sd * (r + 4), x1 = cx + sd * (r + pw + 14), y = cy + Math.round(r * 0.18);
      K.rect(g, Math.min(x0, x1), y - 3, Math.abs(x1 - x0), 6, "#2a3038"); K.rect(g, Math.min(x0, x1), y - 3, Math.abs(x1 - x0), 1, "#4a5260");
      K.rect(g, x1 - 4, y - 14, 8, 28, "#1c2128"); K.rect(g, x1 - 4, y - 14, 2, 28, "#3a424e");
    }
  }
  function mask(g, cx, cy, r, Wd, Ht) {
    g.fillStyle = INK;
    for (let y = -8; y < Ht + 8; y++) {
      const dy = y - cy, inside = r * r - dy * dy;
      if (inside <= 0) { g.fillRect(-8, y, Wd + 16, 1); continue; }
      const w = Math.sqrt(inside);
      g.fillRect(-8, y, Math.round(cx - w) + 8, 1); g.fillRect(Math.round(cx + w), y, Wd - Math.round(cx + w) + 8, 1);
    }
    /* the tube's vignette, dithered */
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy) / r; if (d < 0.86 || d > 1) continue;
      if (K.bayer(x, y) + 0.5 < (d - 0.86) / 0.14) { g.fillStyle = INK; g.fillRect(x, y, 1, 1); }
    }
  }
  function reticle(g, cx, cy, r, hi, hz) {
    const col = "rgba(8,12,16,.85)";
    g.fillStyle = col;
    g.fillRect(cx - r, cy, r * 2, 1); g.fillRect(cx, cy - r, 1, r * 2);
    /* stadimeter ticks along the vertical, every few mils */
    for (let i = -8; i <= 8; i++) { if (!i) continue; const y = cy + i * (hi ? 10 : 6), w = i % 4 === 0 ? 7 : 3; g.fillRect(cx - w, y, w * 2 + 1, 1); }
    for (let i = -10; i <= 10; i++) { if (!i) continue; const x = cx + i * r / 10, h = i % 5 === 0 ? 6 : 3; g.fillRect(x, cy - h, 1, h * 2 + 1); }
    void hz;
  }
  function crack(g, cx, cy, r, v) {
    g.fillStyle = "rgba(220,230,236,.35)";
    for (let i = 0; i < 6 * v; i++) { let x = cx + (K.hash(i, 1, 4) - 0.5) * r, y = cy + (K.hash(i, 2, 4) - 0.5) * r; for (let k = 0; k < 30; k++) { g.fillRect(Math.round(x), Math.round(y), 1, 1); x += (K.hash(i, k, 5) - 0.4) * 4; y += (K.hash(i, k, 6) - 0.5) * 4; } }
  }
  /* a bearing ring: ticks every few degrees, figures every ten; rel: relative to the bow */
  function tape(g, cx, y, r, centre, fov, rel) {
    K.rect(g, cx - r, y - 8, r * 2, 16, "#0b1017");
    const step = fov < 0.3 ? 1 : 5, f = r / Math.tan(fov / 2);
    const c = centre / PS.DEG;
    for (let dgr = Math.floor((c - fov / PS.DEG) / step) * step; dgr <= c + fov / PS.DEG; dgr += step) {
      const a = (dgr - c) * PS.DEG; if (Math.abs(a) > fov / 2) continue;
      const x = Math.round(cx + Math.tan(a) * f), big = dgr % 10 === 0;
      K.rect(g, x, y + 8 - (big ? 6 : 3), 1, big ? 6 : 3, "#c8c0aa");
      if (big) { const v = ((Math.round(dgr) % 360) + 360) % 360; K.text3(g, String(v).padStart(3, "0"), x - 5, y - 6, "#e9e2cf"); }
    }
    K.poly(g, [[cx, y + 9], [cx - 3, y + 13], [cx + 3, y + 13]], "#e6bd6a");
    void rel;
  }
  function bracket(g, x, y, w, h, col) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const L = Math.max(3, Math.round(Math.min(w, h) / 2));
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { K.rect(g, x + sx * w - (sx > 0 ? L - 1 : 0), y + sy * h, L, 1, col); K.rect(g, x + sx * w, y + sy * h - (sy > 0 ? L - 1 : 0), 1, L, col); }
  }
  R.bracket = bracket;

  /* ---- the bridge ---- */
  function bridge(g, S, ui, now, Wd, Ht) {
    const s = S.sub, gunOn = s.gun.on, bino = ui.bino && !gunOn;
    if (gunOn) ui.look = s.gun.brg;
    const fov = (gunOn ? 14 : bino ? 9 : 70) * PS.DEG, brg = ui.look;
    const r = Math.round(Wd / 2), cx = Math.round(Wd / 2), cy = Math.round(Ht * (bino ? 0.5 : 0.44));
    const v = V.draw(g, S, { x: s.x, y: s.y, eyeH: C.EYE.bridge, brg, fov, cx, cy, r, now, aids: ui.aids, calm: PS.calm(), mask: bino ? "bino" : "none" });
    R.last = { view: v, brg, fov, cx, cy, r };
    if (S.tdc.tgt !== null) { const d = v.drawn.find(q => q.id === S.tdc.tgt); if (d) bracket(g, d.x, (d.top + d.wl) / 2, Math.max(6, d.px * 0.55), Math.max(5, (d.wl - d.top) * 0.6 + 3), "#e6bd6a"); }
    if (bino) {
      /* two circles of the glasses */
      const rr = Math.round(Ht * 0.42), dx = Math.round(rr * 0.62);
      g.fillStyle = INK;
      for (let y = -8; y < Ht + 8; y++) {
        let spans = [];
        for (const ox of [-dx, dx]) { const dy = y - cy, ins = rr * rr - dy * dy; if (ins > 0) { const w = Math.sqrt(ins); spans.push([cx + ox - w, cx + ox + w]); } }
        if (!spans.length) { g.fillRect(-8, y, Wd + 16, 1); continue; }
        const a = Math.min(...spans.map(q => q[0])), b = Math.max(...spans.map(q => q[1]));
        g.fillRect(-8, y, Math.round(a) + 8, 1); g.fillRect(Math.round(b), y, Wd - Math.round(b) + 8, 1);
      }
    } else if (gunOn) {
      /* the gun's sight: a ring, the range ladder, the ready lamp */
      const rx = cx, ry = cy;
      K.ring(g, rx, ry, 18, "rgba(230,189,106,.9)", 1); K.rect(g, rx - 30, ry, 60, 1, "rgba(230,189,106,.6)"); K.rect(g, rx, ry - 30, 1, 60, "rgba(230,189,106,.6)");
      const lx = Wd - 70, top = 60, bot = Ht - 90;
      K.rect(g, lx - 6, top - 10, 52, bot - top + 24, "rgba(5,8,12,.6)");
      for (let rr2 = 1000; rr2 <= C.GUN.range; rr2 += 1000) { const y = Math.round(bot - (rr2 / C.GUN.range) * (bot - top)); K.rect(g, lx, y, 8, 1, "#c8c0aa"); K.text3(g, String(rr2 / 1000), lx + 12, y - 2, "#e9e2cf"); }
      const yy = Math.round(bot - (s.gun.rng / C.GUN.range) * (bot - top));
      K.poly(g, [[lx - 5, yy - 4], [lx - 1, yy], [lx - 5, yy + 4]], "#ffd36a"); K.text5(g, String(s.gun.rng), lx + 20, yy - 3, "#ffd36a");
      K.text5(g, s.gun.man < 1 ? "MANNING THE GUN" : s.gun.reload > 0 ? "LOADING" : "READY", rx - 30, ry + 26, s.gun.man < 1 || s.gun.reload > 0 ? "#f0a43c" : "#7fe0a8", INK);
      K.text5(g, "SHELLS " + s.shells, rx - 30, ry + 36, "#e9e4d8", INK);
    }
    if (!bino) rail(g, Wd, Ht, now);
    const sf = R.safe || { t: 28 };
    tape(g, cx, sf.t + 12, Math.round(Wd * 0.3), brg, Math.min(fov, 40 * PS.DEG), false);
    K.text5(g, "LOOKING " + PS.deg3(brg) + (bino ? "  GLASSES" : ""), 12, sf.t + 9, "#e6bd6a", INK);
  }
  /* the bridge's rail and the TBT post, in front of you */
  function rail(g, Wd, Ht, now) {
    const y = Math.round(Ht * 0.84);
    for (let yy = y; yy < Ht + 8; yy++) { const k = (yy - y) / (Ht - y); g.fillStyle = K.mix("#2c333d", "#11151b", k); g.fillRect(-8, yy, Wd + 16, 1); }
    K.rect(g, -8, y - 3, Wd + 16, 3, "#454e5a"); K.rect(g, -8, y - 3, Wd + 16, 1, "#6a7480");
    for (let x = 14; x < Wd; x += 30) K.rivet(g, x, y + 6, "#6a7480", INK);
    const tx = Math.round(Wd / 2);
    K.rect(g, tx - 5, y - 22, 10, 22, "#2a3038"); K.rect(g, tx - 14, y - 30, 28, 10, "#3a424c"); K.rect(g, tx - 12, y - 28, 8, 6, "#11151b"); K.rect(g, tx + 4, y - 28, 8, 6, "#11151b");
    void now;
  }

  /* ---- what happened, as pictures ---- */
  R.events = (S, evs) => {
    for (const e of evs) {
      switch (e.t) {
        case "torpHit": FX.hit(e.x, e.y, 1); break;
        case "shipExplodes": FX.hit(e.x, e.y, 2.2); break;
        case "gunHit": FX.shell(e.x, e.y, true); break;
        case "gunSplash": case "shellNear": FX.shell(e.x, e.y, false); break;
        case "torpPremature": FX.add({ k: "column", x: e.x, y: e.y, h: 110, w: 30, life: 2.6 }); break;
        case "dcBoom": FX.charge(e.x, e.y, e.z); R.shake = Math.max(R.shake, PS.clamp(14 - e.d / 25, 0, 14)); break;
        case "bombs": FX.add({ k: "column", x: e.x + 30, y: e.y, h: 80, w: 25, life: 2.2 }); R.shake = Math.max(R.shake, 8); break;
        case "hullHit": R.shake = Math.max(R.shake, 4 + e.sev * 20); break;
      }
    }
  };

  /* ---- the title's lookout: a convoy at dusk, from abeam ---- */
  R.title = (cv, D, now) => {
    const g = cv.getContext("2d"), Wd = cv.width, Ht = cv.height;
    g.imageSmoothingEnabled = false;
    const conv = D.convoys[0];
    if (!conv) return;
    /* from the far side of the convoy from the sun: the ships dark against the sunset */
    const sp = V.sunPos(D.t), side = PS.angDiff(conv.base, sp.az) > 0 ? -1 : 1, ex = conv.x - PS.hx(sp.az) * 3200 + PS.hx(sp.az + side * Math.PI / 2) * 1400, ey = conv.y - PS.hy(sp.az) * 3200 + PS.hy(sp.az + side * Math.PI / 2) * 1400;
    const brg = PS.angTo(ex, ey, conv.x, conv.y) - 0.07;
    V.draw(g, D, { x: ex, y: ey, eyeH: 18, brg, fov: 30 * PS.DEG, cx: Math.round(Wd * 0.5), cy: Math.round(Ht * 0.56), r: Math.ceil(Wd / 2) + 2, now, aids: {}, calm: PS.calm(), mask: "none" });
  };
})();
