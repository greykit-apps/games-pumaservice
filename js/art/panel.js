/* Puma Service -- the control room: the instruments, painted on a steel
 * panel in brass bezels.
 *
 * The depth gauge, from the surface to below the crush depth, its red arc
 * from the test depth down, the ordered depth a brass pointer on its rim.
 * The gyro repeater, its card turning under the lubber line, the ordered
 * course marked. The speed log, the engine telegraph, the battery and the
 * fuel, the tube board with each tube's lamp and its reload, the TDC's
 * dials, the clock. The panel is painted once for its size; the needles,
 * lamps and figures every frame. */
"use strict";
(() => {
  const K = PS.K, M = K.M, C = PS.C, Sub = PS.Sub, W = PS.Weapons, P = PS.Panel = {};
  const INK = "#07090d", FACE = "#e9e2cf", FACE2 = "#d6cdb5", RED = "#c8402a", NEEDLE = "#11141a", BRASS = M.brass;

  /* the steel plate with its seams and rivets, and the dial faces in their bezels */
  const plate = (Wd, Ht, L) => K.get(`panel:${Wd}x${Ht}`, () => {
    const c = K.mk(Wd, Ht), g = c.getContext("2d");
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x += 1) {
      const v = K.vnoise(x / 40, y / 40, 3) * 0.5 + K.hash(x, y, 9) * 0.25 + K.bayer(x, y) * 0.3;
      g.fillStyle = M.slate[PS.clamp(Math.round(2.6 - v * 1.4), 1, 4)]; g.fillRect(x, y, 1, 1);
    }
    /* seams, and rivets along them */
    for (const sx of [Math.round(Wd * 0.33), Math.round(Wd * 0.67)]) { K.rect(g, sx, 0, 1, Ht, INK); K.rect(g, sx + 1, 0, 1, Ht, M.slate[0]); for (let y = 10; y < Ht; y += 24) { K.rivet(g, sx - 6, y, M.slate[0], INK); K.rivet(g, sx + 5, y, M.slate[0], INK); } }
    for (let x = 10; x < Wd; x += 24) { K.rivet(g, x, 6, M.slate[0], INK); K.rivet(g, x, Ht - 8, M.slate[0], INK); }
    return c;
  });
  const bezel = (g, x, y, r) => {
    K.disc(g, x, y + 2, r + 5, r + 5, "rgba(0,0,0,.45)");
    for (let i = 4; i >= 0; i--) { g.fillStyle = BRASS[PS.clamp(4 - i, 0, 4)]; K.disc(g, x - (i < 2 ? 1 : 0), y - (i < 2 ? 1 : 0), r + 1 + i * 0.8, r + 1 + i * 0.8); }
    g.fillStyle = BRASS[2]; K.disc(g, x, y, r + 1.5, r + 1.5);
    g.fillStyle = FACE; K.disc(g, x, y, r, r);
    g.fillStyle = FACE2; K.disc(g, x + 1, y + 2, r - 2, r - 3); g.fillStyle = FACE; K.disc(g, x, y, r - 3, r - 3);
  };
  /* a needle from the centre at angle a (screen radians, 0 east, clockwise) */
  const needle = (g, x, y, a, len, col = NEEDLE, w = 2) => { K.line(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, col, w); K.disc(g, x, y, 2.5, 2.5, BRASS[1]); K.px(g, x - 1, y - 1, BRASS[0]); };
  const label = (g, s, x, y, col = "#d9cfb6") => K.text5(g, s, Math.round(x - K.text5w(s) / 2), Math.round(y), col, INK);
  const fig = (g, s, x, y, col = NEEDLE) => K.text3(g, s, Math.round(x - K.text3w(s) / 2), Math.round(y - 2), col);

  P.draw = (g, S, ui) => {
    const Wd = g.canvas.width, Ht = g.canvas.height, s = S.sub, k = C.SUBS[s.cls];
    g.imageSmoothingEnabled = false;
    g.drawImage(plate(Wd, Ht), 0, 0);
    /* laid out on a 640 by 360 frame, centred, scaled to fit */
    const sf = PS.Render.safe || { t: 28, b: 12 }, bandH = Ht - sf.t - sf.b + 30;
    const u = Math.min(Wd / 640, bandH / 360), ox = (Wd - 640 * u) / 2, oy = sf.t - 30 + (bandH - 360 * u) / 2, PX = v => Math.round(ox + v * u), PY = v => Math.round(oy + v * u);
    /* ---- the depth gauge, the big one on the left ---- */
    {
      const x = PX(118), y = PY(178), r = Math.round(72 * u), maxD = Math.ceil((k.crush + 60) / 50) * 50;
      bezel(g, x, y, r);
      const A0 = Math.PI * 0.75, SW = Math.PI * 1.5, ang = d => A0 + PS.clamp(d / maxD, 0, 1) * SW;
      const test = Sub.testDepth(s), crush = Sub.crushDepth(s);
      for (let d = test; d <= maxD; d += 2) { const a = ang(d); g.fillStyle = d >= crush ? "#7a1a10" : RED; g.fillRect(Math.round(x + Math.cos(a) * (r - 6)), Math.round(y + Math.sin(a) * (r - 6)), 2, 2); }
      for (let d = 0; d <= maxD; d += 25) {
        const a = ang(d), big = d % 100 === 0, r0 = r - (big ? 10 : 6);
        K.line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), NEEDLE, 1);
        if (big) fig(g, String(d), x + Math.cos(a) * (r - 19), y + Math.sin(a) * (r - 19));
      }
      /* the ordered depth, on the rim */
      const ao = ang(s.ordDepth);
      K.poly(g, [[x + Math.cos(ao) * (r + 1), y + Math.sin(ao) * (r + 1)], [x + Math.cos(ao - 0.07) * (r + 8), y + Math.sin(ao - 0.07) * (r + 8)], [x + Math.cos(ao + 0.07) * (r + 8), y + Math.sin(ao + 0.07) * (r + 8)]], "#ffd36a");
      needle(g, x, y, ang(s.depth), r - 12, NEEDLE, 2);
      label(g, "DEPTH", x, y + r * 0.35); fig(g, "FT", x, y + r * 0.35 + 12);
      label(g, String(Math.round(s.depth)).padStart(3, " "), x, y + r + 10, s.depth > test ? "#ff9a80" : "#e9e4d8");
      label(g, "TEST " + test + "  CRUSH " + Math.round(crush), x, y + r + 20, "#aab0b8");
    }
    /* ---- the gyro repeater: the card turns under the lubber line ---- */
    {
      const x = PX(300), y = PY(150), r = Math.round(60 * u);
      bezel(g, x, y, r);
      for (let dg = 0; dg < 360; dg += 5) {
        const a = (dg * PS.DEG - s.hdg) - Math.PI / 2, big = dg % 30 === 0, r0 = r - (big ? 9 : dg % 10 === 0 ? 6 : 4);
        K.line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), NEEDLE, 1);
        if (big) { const t = { 0: "N", 90: "E", 180: "S", 270: "W" }[dg] || String(dg / 10); if (t.length === 1 && "NESW".includes(t)) K.text5(g, t, Math.round(x + Math.cos(a) * (r - 17) - 2), Math.round(y + Math.sin(a) * (r - 17) - 3), dg === 0 ? RED : NEEDLE); else fig(g, t, x + Math.cos(a) * (r - 16), y + Math.sin(a) * (r - 16)); }
      }
      /* the ordered course */
      const ao = (s.ordHdg - s.hdg) - Math.PI / 2;
      K.poly(g, [[x + Math.cos(ao) * (r + 1), y + Math.sin(ao) * (r + 1)], [x + Math.cos(ao - 0.08) * (r + 8), y + Math.sin(ao - 0.08) * (r + 8)], [x + Math.cos(ao + 0.08) * (r + 8), y + Math.sin(ao + 0.08) * (r + 8)]], "#ffd36a");
      /* the lubber line, and a little boat */
      K.poly(g, [[x, y - r + 1], [x - 4, y - r - 7], [x + 4, y - r - 7]], RED);
      K.poly(g, [[x, y - 14], [x - 4, y + 10], [x + 4, y + 10]], "rgba(17,20,26,.35)");
      label(g, PS.deg3(s.hdg), x, y + r + 10, "#e9e4d8");
      label(g, "COURSE", x, y + r + 20, "#aab0b8");
    }
    /* ---- the speed log, and the telegraph ---- */
    {
      const x = PX(452), y = PY(116), r = Math.round(38 * u), mx = 25;
      bezel(g, x, y, r);
      const A0 = Math.PI * 0.75, SW = Math.PI * 1.5, ang = v => A0 + PS.clamp(v / mx, 0, 1) * SW;
      for (let v = 0; v <= mx; v += 1) { const a = ang(v), big = v % 5 === 0; K.line(g, x + Math.cos(a) * (r - (big ? 7 : 4)), y + Math.sin(a) * (r - (big ? 7 : 4)), x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), NEEDLE, 1); if (big) fig(g, String(v), x + Math.cos(a) * (r - 13), y + Math.sin(a) * (r - 13)); }
      needle(g, x, y, ang(Math.abs(s.spd)), r - 9);
      label(g, "KNOTS", x, y + r * 0.52);
      label(g, s.spd.toFixed(1), x, y + r + 9, "#e9e4d8");
      /* the telegraph: a half-dial, the bells around it, the handle on the ordered one */
      const tx = PX(566), ty = PY(150), tr = Math.round(44 * u);
      g.fillStyle = BRASS[3]; K.disc(g, tx, ty, tr + 4, tr + 4); g.fillStyle = "#1c2028"; K.disc(g, tx, ty, tr, tr);
      const bells = C.BELLS, n = bells.length, bang = i => Math.PI + (i / (n - 1)) * Math.PI;
      const BL = ["BACK", "STOP", "1/3", "2/3", "STD", "FULL", "FLANK"];
      bells.forEach((b, i) => { const a = bang(i), t = BL[i], w = K.text5w(t), lx = tx + Math.cos(a) * (tr + 9 + w / 2 * Math.abs(Math.cos(a))), ly = ty + Math.sin(a) * (tr + 9) - (Math.abs(Math.cos(a)) > 0.9 ? 6 : 0); K.text5(g, t, PS.clamp(Math.round(lx - K.text5w(t) / 2), 2, Wd - K.text5w(t) - 2), Math.round(ly - 3), i === s.bell ? "#ffd36a" : "#9aa3ad", INK); K.line(g, tx + Math.cos(a) * (tr - 8), ty + Math.sin(a) * (tr - 8), tx + Math.cos(a) * (tr - 2), ty + Math.sin(a) * (tr - 2), "#9aa3ad", 1); });
      needle(g, tx, ty, bang(s.bell), tr - 4, BRASS[1], 3);
      label(g, "TELEGRAPH", tx, ty + 10);
      label(g, s.silent ? "SILENT" : C.BELLS[s.bell].toUpperCase(), tx, ty + 20, s.silent ? "#7fe0a8" : "#e9e4d8");
    }
    /* ---- battery and fuel ---- */
    {
      const by = PY(250), bh = Math.round(62 * u);
      const bar = (x, v, cap, name, warn) => {
        K.rect(g, x - 1, by - 1, 18, bh + 2, INK); K.rect(g, x, by, 16, bh, "#1a1e26");
        const h = Math.round(bh * PS.clamp(v, 0, 1)), col = v < 0.12 ? "#e8573a" : v < warn ? "#f0a43c" : "#7fe0a8";
        for (let y = 0; y < h; y++) { g.fillStyle = (y % 4 === 3) ? K.mix(col, "#000", 0.35) : col; g.fillRect(x + 2, by + bh - 1 - y, 12, 1); }
        if (cap < 1) { const cy2 = by + bh - Math.round(bh * cap); K.rect(g, x - 2, cy2, 20, 1, "#e8573a"); }
        label(g, name, x + 8, by + bh + 5); label(g, Math.round(v * 100) + "%", x + 8, by + bh + 15, "#e9e4d8");
      };
      bar(PX(256), s.bat, Sub.batCap(s), "BATT", 0.3);
      bar(PX(330), s.fuel, 1, "FUEL", 0.3);
    }
    /* ---- the tube board ---- */
    {
      const x = PX(420), y = PY(232);
      label(g, "TUBES", x + 40, y - 12);
      const lamp = (lx, ly, v) => {
        K.rect(g, lx - 1, ly - 1, 10, 14, INK);
        if (v === 0) { K.rect(g, lx, ly, 8, 12, "#7fe0a8"); K.rect(g, lx + 1, ly + 1, 3, 4, "#d6f5e2"); }
        else if (v > 0) { K.rect(g, lx, ly, 8, 12, "#2a2418"); const h = Math.round(12 * (1 - v / C.TORP.reload)); K.rect(g, lx, ly + 12 - h, 8, h, "#f0a43c"); }
        else K.rect(g, lx, ly, 8, 12, "#1a1e26");
      };
      s.tubes.F.forEach((v, i) => lamp(x + i * 12, y, v));
      s.tubes.A.forEach((v, i) => lamp(x + i * 12, y + 26, v));
      K.text5(g, "FWD " + s.store.F, x + s.tubes.F.length * 12 + 6, y + 3, s.bank === "F" ? "#ffd36a" : "#aab0b8", INK);
      K.text5(g, "AFT " + s.store.A, x + Math.max(1, s.tubes.A.length) * 12 + 6, y + 29, s.bank === "A" ? "#ffd36a" : "#aab0b8", INK);
      label(g, "SPREAD " + s.spread, x + 40, y + 46, "#d9cfb6");
    }
    /* ---- the TDC and the clock ---- */
    {
      const x = PX(94), y = PY(48), e = W.est(S);
      K.rect(g, x - 70, y - 4, 140, 18, INK); K.rect(g, x - 69, y - 3, 138, 16, "#11161e");
      K.text5(g, C.timeStr(S.t) + "  " + C.dateStr(S.t).toUpperCase(), x - 64, y + 2, "#e9e4d8");
      /* below the tube board, however small the panel is drawn: the words do not shrink with it */
      const ty = Math.max(PY(300), PY(232) + 84), tx0 = Math.min(PX(420) - 80 - 6, Wd - 280);
      K.rect(g, tx0 + 80, ty - 26, 196, 64, INK); K.rect(g, tx0 + 81, ty - 25, 194, 62, "#11161e");
      K.text5(g, "TDC", tx0 + 86, ty - 20, "#e6bd6a");
      if (e) {
        const sol = W.solve(S, e, s.bank), rows = [["BRG", PS.deg3(e.brg)], ["RNG", String(Math.round(e.rng / 10) * 10)], ["AOB", (e.aob >= 0 ? "S" : "P") + Math.round(Math.abs(e.aob) / PS.DEG)], ["SPD", e.s.toFixed(1)], ["GYRO", sol ? (sol.gyro >= 0 ? "R" : "L") + Math.round(Math.abs(sol.gyro) / PS.DEG) : "--"], ["RUN", sol && sol.ok ? String(Math.round(sol.run / 10) * 10) : "--"]];
        rows.forEach(([n, v], i) => { const cxx = tx0 + 86 + (i % 2) * 96, cyy = ty - 8 + Math.floor(i / 2) * 12; K.text5(g, n, cxx, cyy, "#8d949d"); K.text5(g, v, cxx + 32, cyy, "#e9e4d8"); });
        const ok = sol && sol.ok; K.disc(g, tx0 + 266, ty - 17, 3, 3, ok ? "#7fe0a8" : "#5a2018");
      } else K.text5(g, "NO TARGET", tx0 + 86, ty, "#8d949d");
    }
  };
})();
