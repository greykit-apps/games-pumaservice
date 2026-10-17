/* Puma Service -- the control room: the instruments in their housings on the
 * hull, the pipes and the frames round them, and the engine telegraph
 * standing on the deck in front of you.
 *
 * The depth gauge, from the surface to below the crush depth, its red arc
 * from the test depth down, the ordered depth a steel-blue pointer on its rim.
 * The gyro repeater, its card turning under the lubber line, the ordered
 * course marked. The speed log, the battery and the fuel, the tube board with
 * each tube's lamp and its reload. The telegraph on its pedestal, lower right:
 * the handle on the ordered bell, the engine room's answer following it round.
 * The TDC and the clock are the HUD's, as on every station (the TDC moves to
 * the left here, to give the telegraph the corner). The room is painted once
 * for its size and lit by its two lamps; the needles, the dials and the lamps
 * every frame. Everything is painted, the live figures too: they read in
 * counter windows let into the housings, lit from behind.
 *
 * Dived, the boat is rigged for red: the white lights go out to spare the
 * battery and the red ones come on, so the steel, the faces and their paint
 * read only in red, darkest at the edges, while the tube lamps and the
 * battery and fuel bars, which light themselves, keep their colours. */
"use strict";
(() => {
  const K = PS.K, M = K.M, C = PS.C, Sub = PS.Sub, P = PS.Panel = {};
  const INK = "#07090d", FACE = "#e9e2cf", FACE2 = "#d6cdb5", RED = "#c8402a", NEEDLE = "#11141a", BEZEL = M.steelBlue;

  /* laid out on a 640 by 360 frame. The hull's side runs from the overhead (WALL) down to the deck (DECK), its
   * frames at RIBS; the depth gauge on the left, the gyro in the middle, the speed log over the battery and fuel
   * on the right, the tube board under the gyro; the telegraph (its distance from the right edge, its height,
   * its radius) stands in front, lower right. The bottom left is left clear for the HUD's TDC. EYE is where you
   * stand: the housings show the sides that face it. The depth gauge and the gyro stand out of their housings on
   * deep bezels. The legends and the live figures are all painted, in the panel's own pixel letters */
  const L = { depth: [104, 132, 56], gyro: [292, 120, 48], log: [436, 104, 27], bars: [414, 180, 50], tubes: [222, 252], tele: [80, 268, 54], WALL: 70, DECK: 300, RIBS: [186, 382], EYE: [320, 150] };
  /* the light the room is drawn in: toward the lamps, up, a little left, and out of the hull at you */
  const LX = -0.38, LY = -0.74, LZ = 0.56;

  /* a shade from a ramp for a surface facing (nx, ny, nz), dithered between its steps; lift brightens it */
  const shade = (ramp, x, y, nx, ny, nz, lift = 0) => {
    const dif = Math.max(0, nx * LX + ny * LY + nz * LZ);
    if (dif > 0.94) return ramp[0];
    return ramp[PS.clamp(Math.round(0.7 + (1 - dif) * 3.4 - lift + K.bayer(x, y)), 0, 4)];
  };
  /* a pipe along a straight run, round in section */
  const tube = (g, x0, y0, x1, y1, r, ramp) => {
    const ex = x1 - x0, ey = y1 - y0, len = Math.hypot(ex, ey) || 1, px = -ey / len, py = ex / len;
    const bx0 = Math.floor(Math.min(x0, x1) - r - 1), bx1 = Math.ceil(Math.max(x0, x1) + r + 1), by0 = Math.floor(Math.min(y0, y1) - r - 1), by1 = Math.ceil(Math.max(y0, y1) + r + 1);
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      const qx = x + 0.5 - x0, qy = y + 0.5 - y0, t = (qx * ex + qy * ey) / (len * len);
      if (t < 0 || t > 1) continue;
      const s = qx * px + qy * py;
      if (Math.abs(s) > r) continue;
      const n = s / r;
      g.fillStyle = Math.abs(s) > r - 1 ? ramp[4] : shade(ramp, x, y, px * n, py * n, Math.sqrt(1 - n * n));
      g.fillRect(x, y, 1, 1);
    }
  };
  /* a bend: a quarter (or any arc) of pipe about (cx, cy), from angle a0 to a1 */
  const bend = (g, cx, cy, R, a0, a1, r, ramp) => {
    for (let y = Math.floor(cy - R - r - 1); y <= cy + R + r + 1; y++) for (let x = Math.floor(cx - R - r - 1); x <= cx + R + r + 1; x++) {
      const qx = x + 0.5 - cx, qy = y + 0.5 - cy, d = Math.hypot(qx, qy), s = d - R;
      if (Math.abs(s) > r) continue;
      let a = Math.atan2(qy, qx); while (a < a0) a += Math.PI * 2;
      if (a > a1) continue;
      const n = s / r, ux = qx / d, uy = qy / d;
      g.fillStyle = Math.abs(s) > r - 1 ? ramp[4] : shade(ramp, x, y, ux * n, uy * n, Math.sqrt(1 - n * n));
      g.fillRect(x, y, 1, 1);
    }
  };
  /* a collar round a pipe (a flange, a hanger, a coupling), its bolts on the lit side */
  const collar = (g, x, y, r, w, vert, ramp, bolts = true) => {
    if (vert) tube(g, x, y - w / 2, x, y + w / 2, r + 2, ramp); else tube(g, x - w / 2, y, x + w / 2, y, r + 2, ramp);
    if (bolts && r >= 3) { if (vert) { K.rivet(g, x - r, y - 1, ramp[0], INK); K.rivet(g, x + r - 1, y - 1, ramp[1], INK); } else { K.rivet(g, x - 1, y - r, ramp[0], INK); K.rivet(g, x - 1, y + r - 1, ramp[2], INK); } }
  };
  /* a handwheel seen face on, its stem toward you: rim, spokes and hub */
  const wheel = (g, x, y, r, ramp) => {
    K.disc(g, x + 1, y + 2, r + 1, r + 1, "rgba(0,0,0,.35)");
    for (let yy = -r - 1; yy <= r + 1; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) {
      const d = Math.hypot(xx, yy), a = Math.atan2(yy, xx), rim = Math.abs(d - r + 0.8) < 1.3, spoke = d < r - 1 && [0, 1, 2, 3, 4].some(k => Math.abs(PS.angDiff(a, k * Math.PI * 0.4 + 0.3)) * d < 0.9), hub = d < Math.max(1.6, r * 0.28);
      if (!rim && !spoke && !hub) continue;
      const lit = -(xx * LX + yy * LY) / (d || 1);
      g.fillStyle = hub ? ramp[d < 1 ? 1 : 2] : rim ? ramp[PS.clamp(Math.round(2 - lit * 1.6 + K.bayer(x + xx, y + yy)), 0, 4)] : ramp[3];
      g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    }
  };
  /* brushed metal over a rectangle, about step base of its ramp */
  const brushed = (g, x, y, w, h, ramp, base, seed) => {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const v = (K.vnoise((x + xx) / 34, (y + yy) / 3, seed) - 0.5) * 0.9 + (K.hash(x + xx, y + yy, seed) - 0.5) * 0.35;
      g.fillStyle = ramp[PS.clamp(Math.round(base + v + K.bayer(x + xx, y + yy) * 0.7), 0, 4)]; g.fillRect(x + xx, y + yy, 1, 1);
    }
  };
  /* a box standing off the hull by D pixels: the faces that look at you swept back toward the eye, then the
   * front, brushed, its edges caught by the light, bolted at the corners; its shadow thrown down and right */
  const housing = (g, x, y, w, h, D, eye, ramp, seed) => {
    const cx = x + w / 2, cy = y + h / 2, dl = Math.hypot(eye[0] - cx, eye[1] - cy) || 1, dx = (eye[0] - cx) / dl, dy = (eye[1] - cy) / dl;
    g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(Math.round(x + 4), Math.round(y + 6), Math.round(w), Math.round(h));
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(Math.round(x + 2), Math.round(y + 3), Math.round(w + 3), Math.round(h + 4));
    for (let i = D; i >= 1; i--) {
      const ox = Math.round(x + dx * i), oy = Math.round(y + dy * i);
      K.rect(g, ox, oy, w, h, ramp[3]);
      if (dy < 0) K.rect(g, ox, oy, w, 1, ramp[1]); else K.rect(g, ox, oy + h - 1, w, 1, ramp[4]);
      if (dx < 0) K.rect(g, ox, oy, 1, h, ramp[2]); else K.rect(g, ox + w - 1, oy, 1, h, ramp[3]);
    }
    K.rect(g, x - 1, y - 1, w + 2, h + 2, INK);
    brushed(g, x, y, w, h, ramp, 1.9, seed);
    K.rect(g, x, y, w, 1, ramp[0]); K.rect(g, x, y, 1, h, ramp[1]); K.rect(g, x, y + h - 1, w, 1, ramp[4]); K.rect(g, x + w - 1, y, 1, h, ramp[3]);
    for (const [bx, by] of [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) K.rivet(g, bx, by, ramp[0], INK);
  };
  /* a drum standing off a face by D pixels toward the eye: its side shaded round, then its face and rim */
  const drum = (g, x, y, r, D, eye, ramp, face = 2) => {
    const dl = Math.hypot(eye[0] - x, eye[1] - y) || 1, bx = x + (eye[0] - x) / dl * D, by = y + (eye[1] - y) / dl * D;
    K.disc(g, x + 2 + D * 0.4, y + 3 + D * 0.6, r + 1, r + 1, "rgba(0,0,0,.4)");
    const ex = bx - x, ey = by - y, l2 = ex * ex + ey * ey || 1;
    for (let yy = Math.floor(Math.min(y, by) - r - 1); yy <= Math.max(y, by) + r + 1; yy++) for (let xx = Math.floor(Math.min(x, bx) - r - 1); xx <= Math.max(x, bx) + r + 1; xx++) {
      const qx = xx + 0.5 - x, qy = yy + 0.5 - y;
      if (qx * qx + qy * qy <= r * r) continue;
      const t = PS.clamp((qx * ex + qy * ey) / l2, 0, 1), sx = qx - ex * t, sy = qy - ey * t, d = Math.hypot(sx, sy);
      if (d > r) continue;
      g.fillStyle = d > r - 1 ? INK : shade(ramp, xx, yy, sx / d, sy / d, 0, 0.6); g.fillRect(xx, yy, 1, 1);
    }
    K.disc(g, x, y, r + 1, r + 1, INK);
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      const d = Math.hypot(xx, yy); if (d > r + 0.4) continue;
      const lit = -(xx * LX + yy * LY) / (d || 1), edge = d > r - 2;
      g.fillStyle = ramp[PS.clamp(Math.round(edge ? face - lit * 1.6 : face + (K.hash(x + xx, y + yy, 5) - 0.5) * 0.5 + K.bayer(x + xx, y + yy) * 0.6), 0, 4)];
      g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    }
  };

  /* the room, painted once for its size and laid out by the frame (ox, oy, u) */
  const room = (Wd, Ht, ox, oy, u, tx, ty, tr) => K.get(`room:${Wd}x${Ht}:${ox},${oy},${u.toFixed(3)}`, () => {
    const c = K.mk(Wd, Ht), g = c.getContext("2d"), PX = v => Math.round(ox + v * u), PY = v => Math.round(oy + v * u), U = v => Math.max(1, Math.round(v * u));
    const WT = PY(L.WALL), DK = PY(L.DECK), eye = [Wd / 2, PY(L.EYE[1])], ribs = L.RIBS.map(PX);
    /* ---- the hull's side, curving over into the overhead; the deck in front, running away to the wall ---- */
    {
      const img = g.createImageData(Wd, Ht), d = img.data, sl = M.slate.map(K.rgb), ir = M.iron.map(K.rgb), vy = PY(118);
      const bands = [0, ...ribs, Wd];
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
        let col;
        if (y < DK) {
          const plate = bands.findIndex(b => b > x), pv = (K.hash(plate, y < WT ? 0 : y < PY(190) ? 1 : 2, 21) - 0.5) * 0.5;
          const v = (K.vnoise(x / 46, y / 5, 3) - 0.5) * 0.7 + (K.hash(x, y, 9) - 0.5) * 0.3;
          let t = 2.5 + pv + v;
          if (y < WT) t += 0.2 + 1.1 * (1 - y / WT);
          t += PS.clamp((y - (DK - U(26))) / U(26), 0, 1) * 0.9;
          col = sl[PS.clamp(Math.round(t + K.bayer(x, y)), 0, 4)];
        } else {
          /* the deck plates in perspective, their seams converging on the wall, a tread of raised bars */
          const z = (y - vy) / (DK - vy), X = (x - Wd / 2) / z, Z = 1 / z;
          const seam = Math.abs(((X / U(64)) % 1 + 1) % 1 - 0.5) > 0.49 - 0.012 * z || Math.abs(((Z * 3.2) % 1 + 1) % 1 - 0.5) > 0.47;
          const tread = ((Math.floor(X / U(6)) + Math.floor(Z * 18)) & 1) && ((((X / U(6)) % 1) + 1) % 1 < 0.4);
          let t = 2.6 + (K.hash(x, y, 4) - 0.5) * 0.4 - (z - 1) * 0.5;
          if (tread) t -= 0.9;
          t += PS.clamp(1 - (y - DK) / U(10), 0, 1) * 1.2;
          col = ir[PS.clamp(Math.round(seam ? 4 : t + K.bayer(x, y)), 0, 4)];
        }
        const o = (y * Wd + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      /* the seams between the plates, and their rivets */
      for (const sy of [WT, PY(190)]) { K.rect(g, 0, sy, Wd, 1, INK); K.rect(g, 0, sy + 1, Wd, 1, M.slate[1]); for (let x = U(6); x < Wd; x += U(11)) { K.rivet(g, x, sy - U(4), M.slate[1], INK); K.rivet(g, x + U(5), sy + U(4), M.slate[1], INK); } }
      /* the toe of the wall: a kick plate, louvred, where the deck meets it */
      K.rect(g, 0, DK - U(9), Wd, U(9), M.iron[3]); K.rect(g, 0, DK - U(9), Wd, 1, M.slate[1]); K.rect(g, 0, DK, Wd, 1, INK);
      for (let x = U(10); x < Wd; x += U(8)) { K.rect(g, x, DK - U(6), U(5), 1, INK); K.rect(g, x, DK - U(5), U(5), 1, M.iron[1]); }
    }
    /* ---- the frames: an I-beam on the hull at each rib, its flange riveted, a knee down to the deck ---- */
    for (const rx of ribs) {
      const w = U(12);
      K.rect(g, rx + w, 0, U(4), DK, "rgba(0,0,0,.35)");
      brushed(g, rx, 0, w, DK, M.slate, 1.7, rx);
      K.rect(g, rx - 1, 0, 1, DK, INK); K.rect(g, rx, 0, 1, DK, M.slate[0]); K.rect(g, rx + w - 1, 0, 1, DK, M.slate[3]); K.rect(g, rx + w, 0, 1, DK, INK);
      for (let y = U(8); y < DK - U(12); y += U(13)) { K.rivet(g, rx + U(3), y, M.slate[0], INK); K.rivet(g, rx + w - U(4), y + U(6), M.slate[0], INK); }
      K.poly(g, [[rx - U(8), DK], [rx, DK - U(16)], [rx + w, DK - U(16)], [rx + w + U(8), DK]], M.slate[2]);
      K.line(g, rx - U(8), DK, rx, DK - U(16), M.slate[1], 1);
    }
    /* ---- the pipes overhead, hung from the frames: the ventilation trunk, an air main, a copper line ---- */
    const runs = [[PY(15), U(10), M.steel, U(118)], [PY(37), U(5), M.steel, U(96)], [PY(51), U(2), M.copper, U(60)]];
    for (const [y, r] of runs) K.rect(g, 0, y + r + 1, Wd, U(4), "rgba(0,0,0,.3)");
    for (const [y, r, ramp, step] of runs) {
      tube(g, -2, y, Wd + 2, y, r, ramp);
      for (let x = ribs[0] % step + U(30); x < Wd; x += step) collar(g, x, y, r, U(3), false, ramp);
      for (const rx of ribs) { K.rect(g, rx + U(3), 0, U(6), y - r, M.iron[3]); collar(g, rx + U(6), y, r, U(4), false, M.iron, false); }
    }
    /* the gate valve on the air main, its wheel toward you */
    collar(g, PX(338), runs[1][0], runs[1][1] + 1, U(8), false, M.steel);
    wheel(g, PX(338), runs[1][0], U(8), M.steel);
    /* ---- the pipes down the hull: copper down the first frame, an air line down the second (a valve on
     * each), and on the right a painted water line bent down from the overhead beside two copper leads ---- */
    {
      const wY = runs[1][0], cY = runs[2][0];
      /* copper, from the left along the overhead, bent down by the first frame */
      const ax = PX(204), ay = PY(61), ar = U(3), aR = U(8);
      K.rect(g, 0, ay + ar + 1, ax - aR, U(3), "rgba(0,0,0,.3)"); K.rect(g, ax + ar + 1, ay + aR, U(3), DK - ay - aR, "rgba(0,0,0,.3)");
      tube(g, -2, ay, ax - aR, ay, ar, M.copper); bend(g, ax - aR, ay + aR, aR, -Math.PI / 2, 0, ar, M.copper); tube(g, ax, ay + aR, ax, DK, ar, M.copper);
      for (const y of [PY(140), PY(250)]) collar(g, ax, y, ar, U(3), true, M.copper);
      /* the air line off the main, down the right of the second frame's bay */
      const bx = PX(368), br = U(4);
      K.rect(g, bx + br + 1, wY, U(3), DK - wY, "rgba(0,0,0,.3)");
      tube(g, bx, wY, bx, DK, br, M.steel); collar(g, bx, wY + U(6), br, U(4), true, M.steel);
      for (const y of [PY(150), PY(262)]) collar(g, bx, y, br, U(3), true, M.steel);
      /* on the right: the painted line from the right edge, bent down; two copper leads off the copper line */
      const px0 = PX(492), py0 = PY(60), pr = U(5), pR = U(12);
      K.rect(g, px0 + pR, py0 + pr + 1, Wd - px0 - pR, U(3), "rgba(0,0,0,.3)"); K.rect(g, px0 + pr + 1, py0 + pR, U(4), DK - py0 - pR, "rgba(0,0,0,.3)");
      tube(g, px0 + pR, py0, Wd + 2, py0, pr, M.paint); bend(g, px0 + pR, py0 + pR, pR, Math.PI, Math.PI * 1.5, pr, M.paint); tube(g, px0, py0 + pR, px0, DK, pr, M.paint);
      for (const y of [PY(130), PY(230)]) collar(g, px0, y, pr, U(4), true, M.paint);
      for (const [x, r] of [[PX(510), U(2)], [PX(518), U(2)]]) { K.rect(g, x + r + 1, cY, U(2), DK - cY, "rgba(0,0,0,.3)"); tube(g, x, cY, x, DK, r, M.copper); for (let y = PY(90); y < DK; y += U(46)) K.rect(g, x - r - 1, y, r * 2 + 3, U(2), M.iron[2]); }
      /* the valves */
      wheel(g, ax, PY(186), U(7), M.steel);
      wheel(g, bx, PY(206), U(7), M.steel);
      wheel(g, px0, PY(176), U(8), M.steel);
      /* where they go through the deck */
      for (const [x, r] of [[ax, ar], [bx, br], [px0, pr]]) K.rect(g, x - r - U(3), DK - U(3), r * 2 + U(7), U(3), M.iron[1]);
    }
    /* ---- the housings ---- */
    {
      const [dx, dy, dr] = L.depth, x = PX(dx), y = PY(dy), r = Math.round(dr * u), h = r + U(12);
      housing(g, x - h, PY(L.WALL + 2), h * 2, y + r + 42 - PY(L.WALL + 2), U(6), eye, M.slate, 31);
      /* the gauge stands well out of it on a deep bezel */
      drum(g, x, y, r + U(11), U(10), eye, BEZEL, 2); K.ring(g, x, y, r + 5, BEZEL[4]);
    }
    {
      const [gx, gy, gr] = L.gyro, x = PX(gx), y = PY(gy), r = Math.round(gr * u);
      housing(g, x - r - U(14), PY(L.WALL + 4), (r + U(14)) * 2, y + r + 44 - PY(L.WALL + 4), U(5), eye, M.slate, 32);
      drum(g, x, y, r + U(11), U(10), eye, BEZEL, 2); K.ring(g, x, y, r + 5, BEZEL[4]);
    }
    {
      const [lx, ly, lr] = L.log, x = PX(lx), y = PY(ly), r = Math.round(lr * u), by = PY(L.bars[1]), bh = Math.round(L.bars[2] * u);
      const cw = Math.max(U(76), 70);
      housing(g, x - cw / 2, PY(L.WALL - 4), cw, by + bh + U(40) - PY(L.WALL - 4), U(6), eye, M.slate, 33);
      drum(g, x, y, r + U(6), U(4), eye, M.slate);
      /* the bars' window, let into the cabinet (the bars and their legends are whole pixels, whatever the scale) */
      const bx = PX(L.bars[0]) - 6;
      K.rect(g, bx, by - U(6), 62, bh + U(34), M.slate[4]); K.rect(g, bx, by - U(6), 62, 1, INK); K.rect(g, bx, by + bh + U(28) - 1, 62, 1, M.slate[1]);
    }
    {
      const x = PX(L.tubes[0]), y = PY(L.tubes[1]);
      housing(g, x - 8, y - 22, 140, Math.min(66, DK - U(4) - y + 22), U(5), eye, M.slate, 34);
      K.rect(g, x - 2, y - 4, 128, 38, M.slate[4]); K.rect(g, x - 2, y - 4, 128, 1, INK); K.rect(g, x - 2, y + 34 - 1, 128, 1, M.slate[1]);
    }
    /* ---- on the right: a junction box on the painted line's conduit, and the sound-powered telephone ---- */
    {
      const jx = PX(548), jy = PY(92);
      housing(g, jx, jy, U(34), U(26), U(3), eye, M.slate, 35);
      K.rect(g, jx + U(5), jy + U(6), U(24), U(14), M.slate[3]); K.rect(g, jx + U(5), jy + U(6), U(24), 1, INK);
      tube(g, jx + U(17), PY(60), jx + U(17), jy - 1, U(2), M.iron);
      const fx = PX(568), fy = PY(150);
      housing(g, fx - U(16), fy, U(32), U(44), U(4), eye, M.slate, 36);
      /* the handset in its cradle, its cord looped down */
      K.rect(g, fx - U(11), fy + U(8), U(4), U(26), M.coal[1]); K.rect(g, fx + U(7), fy + U(8), U(4), U(26), M.coal[1]);
      K.rect(g, fx - U(10), fy + U(12), U(20), U(18), M.coal[2]); K.rect(g, fx - U(10), fy + U(12), U(20), 1, M.coal[0]);
      K.rect(g, fx - U(4), fy + U(15), U(8), U(12), M.coal[3]);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) K.px(g, fx - U(3) + j * U(3), fy + U(17) + i * U(3), M.coal[0]);
      for (let t = 0; t <= 1; t += 0.02) K.px(g, fx + U(4) + Math.sin(t * 14) * U(2), fy + U(44) + t * U(30), M.coal[t * 50 & 1 ? 2 : 1]);
    }
    /* ---- the lamps: a caged globe hung under the pipes over each side of the board ---- */
    const lamps = [[PX(212), PY(70)], [PX(476), PY(64)]];
    for (const [x, y] of lamps) {
      K.rect(g, x - U(1), PY(48), U(3), y - PY(48), M.iron[2]); K.rect(g, x - U(3), PY(48), U(7), U(3), M.iron[1]);
      K.disc(g, x, y + U(4), U(5), U(3), M.cream[1]); K.disc(g, x - U(1), y + U(4), U(3), U(2), M.cream[0]);
      for (let yy = 0; yy <= U(6); yy++) { const w = Math.round(U(4) + yy * 1.1); K.rect(g, x - w, y - U(3) + yy, w * 2 + 1, 1, yy === U(6) ? M.steel[4] : shade(M.steel, x, y + yy, -0.3, -0.6, 0.7 - yy * 0.06)); K.px(g, x - w, y - U(3) + yy, M.steel[1]); }
      K.rect(g, x - Math.round(U(4) + U(6) * 1.1), y + U(3) + 1, Math.round(U(4) + U(6) * 1.1) * 2 + 1, 1, INK);
    }
    /* ---- the telegraph's pedestal and its head's drum, stood in front of all of it ---- */
    {
      const pw = Math.round(tr * 0.34), top = ty + Math.round(tr * 0.4);
      K.disc(g, tx + U(16), Ht + U(4), Math.round(tr * 0.9), U(12), "rgba(0,0,0,.45)");
      K.rect(g, tx + pw / 2, top, U(14), Ht - top, "rgba(0,0,0,.3)");
      tube(g, tx, top, tx, Ht + 2, pw / 2, M.iron);
      for (const [cy, cr] of [[top + U(10), pw / 2 + U(3)], [Ht - U(14), pw / 2 + U(6)]]) tube(g, tx - cr, cy, tx + cr, cy, U(3), M.iron);
      tube(g, tx - pw / 2 - U(10), Ht - U(6), tx + pw / 2 + U(10), Ht - U(6), U(5), M.iron);
      K.disc(g, tx + U(14), ty + U(12), tr + U(6), tr + U(6), "rgba(0,0,0,.3)");
      drum(g, tx, ty, tr + U(6), U(16), eye, BEZEL, 2);
    }
    K.relight(c, [0.6, 0.63, 0.7], lamps.map(([x, y], i) => ({ x, y: y + U(6), r: U(i ? 240 : 230), k: 0.72, col: [0.52, 0.48, 0.4] })).concat([{ x: tx, y: ty - U(30), r: U(120), k: 0.35, col: [0.4, 0.4, 0.38] }]));
    return c;
  });

  const bezel = (g, x, y, r) => {
    for (let i = 4; i >= 0; i--) { g.fillStyle = BEZEL[PS.clamp(4 - i, 0, 4)]; K.disc(g, x - (i < 2 ? 1 : 0), y - (i < 2 ? 1 : 0), r + 1 + i * 0.8, r + 1 + i * 0.8); }
    g.fillStyle = BEZEL[2]; K.disc(g, x, y, r + 1.5, r + 1.5);
    g.fillStyle = FACE; K.disc(g, x, y, r, r);
    g.fillStyle = FACE2; K.disc(g, x + 1, y + 2, r - 2, r - 3); g.fillStyle = FACE; K.disc(g, x, y, r - 3, r - 3);
  };
  /* the glass over a dial: a dithered glint high on the left */
  const glass = (g, x, y, r) => {
    g.fillStyle = "rgba(255,255,255,.22)";
    for (let yy = -r; yy < 0; yy++) for (let xx = -r; xx < r * 0.3; xx++) {
      const d = Math.hypot(xx, yy), a = Math.atan2(yy, xx);
      if (d > r * 0.66 && d < r * 0.88 && a > -2.75 && a < -1.75 && K.bayer(x + xx, y + yy) > -0.1) g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    }
  };
  /* a needle from the centre at angle a (screen radians, 0 east, clockwise), its shadow on the face */
  const needle = (g, x, y, a, len, col = NEEDLE, w = 2) => {
    K.line(g, x + 1, y + 2, x + 1 + Math.cos(a) * len, y + 2 + Math.sin(a) * len, "rgba(60,48,30,.28)", w);
    K.line(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, col, w); K.disc(g, x, y, 2.5, 2.5, BEZEL[1]); K.px(g, x - 1, y - 1, BEZEL[0]);
  };
  /* a painted legend: short, fixed words in the panel's own pixel letters; on a little engraved plate */
  const label = (g, s, x, y, col = "#d9cfb6") => K.text5(g, s, Math.round(x - K.text5w(s) / 2), Math.round(y), col, INK);
  const plate = (g, s, x, y) => {
    const w = K.text5w(s) + 8, x0 = Math.round(x - w / 2), y0 = Math.round(y - 2);
    K.rect(g, x0 - 1, y0 - 1, w + 2, 13, INK); K.rect(g, x0, y0, w, 11, M.slate[4]); K.rect(g, x0, y0, w, 1, M.slate[2]); K.rect(g, x0, y0 + 10, w, 1, "#000");
    label(g, s, x, y);
  };
  /* the readings: a counter window let into the housing, its figures lit from behind, so that they keep their
   * colours when she is rigged for red; runs is [[words, colour], ...] */
  const LIT = { plain: "#f2ead6", steel: "#b8d5f0", green: "#7fe0a8", amber: "#f0a43c", danger: "#ff9a80" };
  const counter = (g, lit, runs, x, y, w0 = 0) => {
    const tw = runs.reduce((a, [t]) => a + K.text5w(t) + 1, -1), w = Math.max(w0, tw + 8), x0 = Math.round(x - w / 2);
    K.rect(g, x0 - 1, y - 1, w + 2, 11, M.slate[1]); K.rect(g, x0 - 1, y - 1, w + 1, 1, INK); K.rect(g, x0 - 1, y - 1, 1, 10, INK);
    K.rect(g, x0, y, w, 9, "#0b0d11"); K.rect(g, x0, y, w, 1, "#000");
    lit.push(() => { let cx = Math.round(x - tw / 2); for (const [t, col] of runs) { K.text5(g, t, cx, y + 1, col); cx += K.text5w(t) + 1; } });
  };
  /* figures lit from behind with no window round them */
  const glow = (lit, s, x, y, col) => lit.push(g => K.text5(g, s, Math.round(x - K.text5w(s) / 2), Math.round(y), col));
  const fig = (g, s, x, y, col = NEEDLE) => K.text3(g, s, Math.round(x - K.text3w(s) / 2), Math.round(y - 2), col);

  /* rigged for red: how far the red lights are up (0 to 1), fading over 0.6s as she dives or surfaces (at once
   * under reduced motion, or when the instruments have not been on screen), then the whole panel taken to grey
   * and lit by a red pool, brightest over the gauges */
  P.red = 0;
  let redAt = 0;
  const rigRed = (g, Wd, Ht, on) => {
    const now = performance.now(), dt = (now - redAt) / 1000;
    P.red = PS.calm() || dt > 0.25 ? (on ? 1 : 0) : PS.clamp(P.red + (on ? dt : -dt) / 0.6, 0, 1);
    redAt = now;
    if (P.red <= 0) return;
    g.save(); g.globalAlpha = P.red;
    g.globalCompositeOperation = "saturation"; g.fillStyle = "#808080"; g.fillRect(0, 0, Wd, Ht);
    const pool = g.createRadialGradient(Wd / 2, Ht * 0.42, 0, Wd / 2, Ht * 0.42, Math.max(Wd, Ht) * 0.72);
    pool.addColorStop(0, "#a82c1a"); pool.addColorStop(0.55, "#741c0e"); pool.addColorStop(1, "#2a0703");
    g.globalCompositeOperation = "multiply"; g.fillStyle = pool; g.fillRect(0, 0, Wd, Ht);
    g.restore();
  };
  /* the engine room's answer on the telegraph, following the handle round (at once under reduced motion) */
  P.ans = null;
  let ansAt = 0;

  P.draw = (g, S, ui) => {
    const Wd = g.canvas.width, Ht = g.canvas.height, s = S.sub, k = C.SUBS[s.cls];
    g.imageSmoothingEnabled = false;
    const sf = PS.Render.safe || { t: 28, b: 12 }, bandH = Ht - sf.t - sf.b + 30;
    const u = Math.min(Wd / 640, bandH / 360), ox = Math.round((Wd - 640 * u) / 2), oy = Math.round(sf.t - 30 + (bandH - 360 * u) / 2), PX = v => Math.round(ox + v * u), PY = v => Math.round(oy + v * u);
    /* the telegraph keeps to the window's lower right, however wide the window */
    const ty = PY(L.tele[1]), tr = Math.max(52, Math.round(L.tele[2] * u)), tx = Math.max(Wd - Math.round(L.tele[0] * u), PX(L.log[0]) + 35 + tr + 20);
    g.drawImage(room(Wd, Ht, ox, oy, u, tx, ty, tr), 0, 0);
    /* what lights itself (the lamps, the bars), drawn after the red light has been laid over the rest */
    const lit = [];
    /* ---- the depth gauge, the big one on the left ---- */
    {
      const x = PX(L.depth[0]), y = PY(L.depth[1]), r = Math.round(L.depth[2] * u), maxD = Math.ceil((k.crush + 60) / 50) * 50;
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
      K.poly(g, [[x + Math.cos(ao) * (r + 1), y + Math.sin(ao) * (r + 1)], [x + Math.cos(ao - 0.07) * (r + 8), y + Math.sin(ao - 0.07) * (r + 8)], [x + Math.cos(ao + 0.07) * (r + 8), y + Math.sin(ao + 0.07) * (r + 8)]], "#b8d5f0");
      /* the legend clear of the 0 and the last figure at the foot of the scale, however small the dial */
      const ly = Math.round(Math.min(r * 0.3, (r - 19) * 0.707 - 10));
      label(g, "DEPTH", x, y + ly); fig(g, "FT", x, y + ly + 12);
      needle(g, x, y, ang(s.depth), r - 12, NEEDLE, 2);
      glass(g, x, y, r);
      counter(g, lit, [[Sub.surfaced(s) ? "SURFACED" : Math.round(s.depth) + " FT", s.depth > test ? LIT.danger : LIT.plain]], x, y + r + 15, 54);
      /* the limits under it, painted; the crush depth lit in danger once the hull is hurt and it has come up */
      if (crush < k.crush - 1) glow(lit, `CRUSH ${Math.round(crush)} DAMAGED`, x, y + r + 30, LIT.danger);
      else label(g, `TEST ${test}  CRUSH ${Math.round(crush)}`, x, y + r + 30);
    }
    /* ---- the gyro repeater: the card turns under the lubber line ---- */
    {
      const x = PX(L.gyro[0]), y = PY(L.gyro[1]), r = Math.round(L.gyro[2] * u);
      bezel(g, x, y, r);
      for (let dg = 0; dg < 360; dg += 5) {
        const a = (dg * PS.DEG - s.hdg) - Math.PI / 2, big = dg % 30 === 0, r0 = r - (big ? 9 : dg % 10 === 0 ? 6 : 4);
        K.line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), NEEDLE, 1);
        if (big) { const t = { 0: "N", 90: "E", 180: "S", 270: "W" }[dg] || String(dg / 10); if (t.length === 1 && "NESW".includes(t)) K.text5(g, t, Math.round(x + Math.cos(a) * (r - 17) - 2), Math.round(y + Math.sin(a) * (r - 17) - 3), dg === 0 ? RED : NEEDLE); else fig(g, t, x + Math.cos(a) * (r - 16), y + Math.sin(a) * (r - 16)); }
      }
      /* the ordered course */
      const ao = (s.ordHdg - s.hdg) - Math.PI / 2;
      K.poly(g, [[x + Math.cos(ao) * (r + 1), y + Math.sin(ao) * (r + 1)], [x + Math.cos(ao - 0.08) * (r + 8), y + Math.sin(ao - 0.08) * (r + 8)], [x + Math.cos(ao + 0.08) * (r + 8), y + Math.sin(ao + 0.08) * (r + 8)]], "#b8d5f0");
      /* the lubber line, and a little boat */
      K.poly(g, [[x, y - r + 1], [x - 4, y - r - 7], [x + 4, y - r - 7]], RED);
      K.poly(g, [[x, y - 14], [x - 4, y + 10], [x + 4, y + 10]], "rgba(17,20,26,.35)");
      glass(g, x, y, r);
      const turning = Math.abs(PS.angDiff(s.hdg, s.ordHdg)) > 0.02;
      counter(g, lit, turning ? [[PS.deg3(s.hdg), LIT.plain], [" > " + PS.deg3(s.ordHdg), LIT.steel]] : [[PS.deg3(s.hdg), LIT.plain]], x, y + r + 15, 54);
      plate(g, "COURSE", x, y + r + 31);
    }
    /* ---- the speed log ---- */
    {
      const x = PX(L.log[0]), y = PY(L.log[1]), r = Math.round(L.log[2] * u), mx = 25;
      bezel(g, x, y, r);
      const A0 = Math.PI * 0.75, SW = Math.PI * 1.5, ang = v => A0 + PS.clamp(v / mx, 0, 1) * SW;
      for (let v = 0; v <= mx; v += 1) { const a = ang(v), big = v % 5 === 0; K.line(g, x + Math.cos(a) * (r - (big ? 7 : 4)), y + Math.sin(a) * (r - (big ? 7 : 4)), x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), NEEDLE, 1); if (big) fig(g, String(v), x + Math.cos(a) * (r - 13), y + Math.sin(a) * (r - 13)); }
      needle(g, x, y, ang(Math.abs(s.spd)), r - 9);
      glass(g, x, y, r);
      counter(g, lit, [[s.spd.toFixed(1) + " KN", LIT.plain]], x, y + r + 10, 44);
      plate(g, "SPEED", x, y + r + 25);
    }
    /* ---- the telegraph: the bells round its face, the handle on the ordered one, the answer following ---- */
    {
      const bells = C.BELLS, n = bells.length, BL = ["BACK", "STOP", "1/3", "2/3", "STD", "FULL", "FLANK"];
      /* the bells from lower left, over the top, to lower right */
      const bang = i => Math.PI * (5 / 6) + (i / (n - 1)) * Math.PI * (4 / 3);
      const fr = tr - 5;
      K.disc(g, tx, ty, fr + 1, fr + 1, INK); K.disc(g, tx, ty, fr, fr, "#1c2028"); K.disc(g, tx + 1, ty + 1, fr - 3, fr - 3, "#171a21");
      K.ring(g, tx, ty, Math.round(fr * 0.86), "#3a404b"); K.ring(g, tx, ty, Math.round(fr * 0.42), "#3a404b");
      for (let i = 0; i <= n; i++) { const a = bang(i - 0.5); K.line(g, tx + Math.cos(a) * fr * 0.44, ty + Math.sin(a) * fr * 0.44, tx + Math.cos(a) * (fr - 1), ty + Math.sin(a) * (fr - 1), "#3a404b", 1); }
      bells.forEach((b, i) => { const a = bang(i), t = BL[i], w = K.text5w(t), rl = fr * 0.66; K.text5(g, t, Math.round(tx + Math.cos(a) * rl - w / 2), Math.round(ty + Math.sin(a) * rl - 3), i === s.bell ? "#b8d5f0" : FACE2, INK); });
      /* the answer: a cream pointer on the outer ring */
      const now = performance.now(), dt = (now - ansAt) / 1000, want = bang(s.bell);
      ansAt = now;
      P.ans = P.ans === null || PS.calm() || dt > 0.25 ? want : P.ans + (want - P.ans) * Math.min(1, dt * 5);
      const aa = P.ans, ar = fr * 0.93;
      K.poly(g, [[tx + Math.cos(aa) * (fr * 0.86), ty + Math.sin(aa) * (fr * 0.86)], [tx + Math.cos(aa - 0.06) * ar + 0, ty + Math.sin(aa - 0.06) * ar], [tx + Math.cos(aa + 0.06) * ar, ty + Math.sin(aa + 0.06) * ar]], FACE);
      /* the order: the pointer on the face, and the handle that set it, out past the rim to its grip */
      const ha = bang(s.bell), hl = tr + Math.round(8 * u), gx = tx + Math.cos(ha) * hl, gy = ty + Math.sin(ha) * hl, pr = fr * 0.4, cs = Math.cos(ha), sn = Math.sin(ha);
      K.poly(g, [[tx - sn * 3, ty + cs * 3], [tx + cs * pr, ty + sn * pr], [tx + sn * 3, ty - cs * 3]], BEZEL[1]);
      const h0x = tx + cs * (fr - 2), h0y = ty + sn * (fr - 2);
      K.line(g, h0x + 2, h0y + 3, gx + 2, gy + 3, "rgba(0,0,0,.45)", 4);
      K.line(g, h0x, h0y, gx, gy, BEZEL[3], 4); K.line(g, h0x - 1, h0y - 1, gx - 1, gy - 1, BEZEL[1], 1);
      K.disc(g, h0x, h0y, 3.5, 3.5, BEZEL[2]);
      K.disc(g, gx + 1, gy + 2, 5, 5, "rgba(0,0,0,.45)"); K.disc(g, gx, gy, 5, 5, BEZEL[3]); K.disc(g, gx - 1, gy - 1, 3.5, 3.5, BEZEL[1]); K.px(g, gx - 2, gy - 2, BEZEL[0]);
      K.disc(g, tx, ty, 6, 6, BEZEL[3]); K.disc(g, tx - 1, ty - 1, 4, 4, BEZEL[1]); K.px(g, tx - 2, ty - 2, BEZEL[0]);
      plate(g, "TELEGRAPH", tx, ty + tr + 12);
      counter(g, lit, s.silent ? [[BL[s.bell], LIT.steel], [" SILENT", LIT.green]] : [[BL[s.bell], LIT.steel]], tx, ty + tr + 27, 44);
    }
    /* ---- battery and fuel ---- */
    {
      const by = PY(L.bars[1]), bh = Math.round(L.bars[2] * u);
      const bar = (x, v, cap, name) => {
        K.rect(g, x - 1, by - 1, 18, bh + 2, INK); K.rect(g, x, by, 16, bh, "#1a1e26");
        for (let y = 0; y <= 4; y++) K.rect(g, x + 16, by + Math.round(bh * y / 4), 3, 1, "#8a919b");
        const h = Math.round(bh * PS.clamp(v, 0, 1)), col = v < 0.12 ? "#e8573a" : v < 0.3 ? "#f0a43c" : "#7fe0a8";
        lit.push(() => {
          for (let y = 0; y < h; y++) { g.fillStyle = (y % 4 === 3) ? K.mix(col, "#000", 0.35) : col; g.fillRect(x + 2, by + bh - 1 - y, 12, 1); }
          if (cap < 1) { const cy2 = by + bh - Math.round(bh * cap); K.rect(g, x - 2, cy2, 20, 1, "#e8573a"); }
        });
        label(g, name, x + 8, by + bh + 5);
        glow(lit, `${Math.round(v * 100)}%`, x + 8, by + bh + 15, v < 0.12 ? LIT.danger : v < 0.3 ? LIT.amber : LIT.plain);
      };
      bar(PX(L.bars[0]), s.bat, Sub.batCap(s), "BATT");
      if (Sub.charge(s).rate > 0 && Sub.batCap(s) - s.bat >= 0.005) glow(lit, "CHARGING", PX(L.bars[0]) + 24, by + bh + 27, LIT.green);
      bar(PX(L.bars[0]) + 32, s.fuel, 1, "FUEL");
    }
    /* ---- the tube board: each tube's lamp, the spares beside each bank, the chosen bank in steel blue ---- */
    {
      const x = PX(L.tubes[0]), y = PY(L.tubes[1]);
      plate(g, "TUBES", x + 58, y - 15);
      label(g, "SPARE", x + 109, y - 13, "#aab0b8");
      const lamp = (lx, ly, v) => {
        K.rect(g, lx - 1, ly - 1, 10, 14, INK);
        if (v === 0) lit.push(() => { K.rect(g, lx, ly, 8, 12, "#7fe0a8"); K.rect(g, lx + 1, ly + 1, 3, 4, "#d6f5e2"); });
        else if (v > 0) lit.push(() => { K.rect(g, lx, ly, 8, 12, "#2a2418"); const h = Math.round(12 * (1 - v / C.TORP.reload)); K.rect(g, lx, ly + 12 - h, 8, h, "#f0a43c"); });
        else K.rect(g, lx, ly, 8, 12, "#1a1e26");
      };
      /* each bank: its name (lit steel blue when it is the one chosen), its lamps, its spares */
      for (const [b, name, ly] of [["F", "FWD", y], ["A", "AFT", y + 20]]) {
        if (s.bank === b) glow(lit, name, x + 9, ly + 3, LIT.steel); else label(g, name, x + 9, ly + 3, "#8a919b");
        s.tubes[b].forEach((v, i) => lamp(x + 22 + i * 12, ly, v));
        glow(lit, String(s.store[b]), x + 109, ly + 3, s.bank === b ? LIT.steel : LIT.plain);
      }
      if (s.spread > 1) glow(lit, `SPREAD OF ${s.spread}`, x + 62, y + 36, LIT.steel);
    }
    rigRed(g, Wd, Ht, !Sub.surfaced(s));
    /* the lamps turned down a little with the lights, to spare the battery too */
    g.save(); g.globalAlpha = 1 - P.red * 0.25;
    for (const f of lit) f(g);
    g.restore();
  };
})();
