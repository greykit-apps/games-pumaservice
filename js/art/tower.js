/* Puma Service -- the conning tower: what is round the periscope, and the
 * hatch over it.
 *
 * At the periscope you stand at its eyepiece, looking forward down the long
 * axis of the conning tower. The glass is in the middle in a large bezel, the
 * mast going up out of it through the overhead, the training handles standing
 * out from its sides. Behind it the tower runs away to a point behind the
 * glass: its curved plating between frames, the pipes and cables along it,
 * the lamps under the overhead, the deck; the TDC's cabinet down the left
 * side, and on the right, close by, the helmsman, a puma in a white cap at
 * his wheel. He breathes, blinks and flicks an ear now and then, and the
 * wheel turns under his paws as the boat answers her helm (all still under
 * reduced motion). The tower and the periscope are painted once for their
 * size, the helmsman every frame; dived, all of it is under the red light,
 * and the sea in the glass keeps its colours.
 *
 * The bridge, dived below periscope depth: the foot of the ladder, looking
 * up the trunk at the upper hatch, shut and dogged, under the red light. */
"use strict";
(() => {
  const K = PS.K, M = K.M, T = PS.Tower = {};
  const INK = "#07090d";
  /* the light things are painted in: from the lamps overhead, a little left */
  const LX = -0.35, LY = -0.75, LZ = 0.55;
  const shade = (ramp, x, y, nx, ny, nz, lift = 0) => {
    const dif = Math.max(0, nx * LX + ny * LY + nz * LZ);
    return ramp[PS.clamp(Math.round(0.7 + (1 - dif) * 3.4 - lift + K.bayer(x, y)), 0, 4)];
  };
  /* a pipe along a straight run, round in section */
  const tube = (g, x0, y0, x1, y1, r, ramp) => {
    const ex = x1 - x0, ey = y1 - y0, len = Math.hypot(ex, ey) || 1, px = -ey / len, py = ex / len;
    for (let y = Math.floor(Math.min(y0, y1) - r - 1); y <= Math.max(y0, y1) + r + 1; y++) for (let x = Math.floor(Math.min(x0, x1) - r - 1); x <= Math.max(x0, x1) + r + 1; x++) {
      const qx = x + 0.5 - x0, qy = y + 0.5 - y0, t = (qx * ex + qy * ey) / (len * len);
      if (t < 0 || t > 1) continue;
      const s = qx * px + qy * py;
      if (Math.abs(s) > r) continue;
      const n = s / r;
      g.fillStyle = Math.abs(s) > r - 1 ? ramp[4] : shade(ramp, x, y, px * n, py * n, Math.sqrt(1 - n * n));
      g.fillRect(x, y, 1, 1);
    }
  };
  /* a handwheel, face on (ry = r) or turned away (ry < r): rim, spokes and hub, turned by a; th, how thick */
  const wheel = (g, x, y, r, ry, a, ramp, n = 5, th = 0.9) => {
    for (let yy = -ry - 2; yy <= ry + 2; yy++) for (let xx = -r - 2; xx <= r + 2; xx++) {
      const ux = xx / r, uy = yy / r, d = Math.hypot(xx, yy * r / ry), ang = Math.atan2(yy * r / ry, xx);
      const rim = Math.abs(d - r + th) < th * 1.45, spoke = d < r - 1 && Array.from({ length: n }, (_, k) => k).some(k => Math.abs(PS.angDiff(ang, a + k * PS.TAU / n)) * d < th), hub = d < Math.max(1.6, r * 0.26);
      if (!rim && !spoke && !hub) continue;
      const lit = -(ux * LX + uy * LY) / (Math.hypot(ux, uy) || 1);
      g.fillStyle = hub ? ramp[d < r * 0.12 ? 1 : 2] : rim ? ramp[PS.clamp(Math.round(2 - lit * 1.6 + K.bayer(x + xx, y + yy)), 0, 4)] : ramp[3];
      g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    }
  };

  /* ---- the tower, seen down its length from the periscope: a tube of plating, wider than high, the deck across
   * its foot, the point it runs away to behind the glass. F is how far the picture is from the eye, in pixels;
   * world units are about four feet: A the half width, B the half height over the eye, H the deck under it ---- */
  const A = 1.5, B = 1.05, H = 0.75, FR = [1.15, 1.55, 2.05, 2.7, 3.6, 4.8, 6.4];
  const PIPES = [[-Math.PI / 2, 0.05, M.steel], [-1.95, 0.03, M.steel], [-1.22, 0.02, M.copper], [-2.4, 0.018, M.copper], [-0.7, 0.024, M.paint], [0.3, 0.016, M.iron]];
  const geo = (cx, cy, r) => { const F = r * 2.4; return { F, P: (x, y, z) => [cx + x * F / z, cy + y * F / z] }; };
  const tower = (Wd, Ht, cx, cy, r) => K.get(`tower:${Wd}x${Ht}:${cx},${cy},${r}`, () => {
    const c = K.mk(Wd, Ht), g = c.getContext("2d"), { F, P } = geo(cx, cy, r);
    {
      const img = g.createImageData(Wd, Ht), d = img.data, sl = M.slate.map(K.rgb), ir = M.iron.map(K.rgb), RM = {};
      for (const [, , ramp] of PIPES) RM[ramp[0]] = ramp.map(K.rgb);
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
        const u = (x + 0.5 - cx) / F, v = (y + 0.5 - cy) / F, tw = 1 / Math.hypot(u / A, v / B), tf = v > 0 ? H / v : Infinity, pd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        let q;
        if (tf < tw) {
          /* the deck: plates in perspective, their seams running away to the point, a tread of raised bars */
          const z = tf, wx = u * z, sx = ((wx / 0.5) % 1 + 1) % 1, sz = ((z / 0.7) % 1 + 1) % 1;
          let t = 2.4 + Math.min(1.4, (z - 1) * 0.2) + (K.hash(x, y, 4) - 0.5) * 0.4;
          if ((Math.floor(wx / 0.08) + Math.floor(z / 0.08)) & 1) t += 0.5;
          if (sx < 0.03 || sx > 0.97 || sz < 0.04) t = 4;
          q = ir[PS.clamp(Math.round(t + K.bayer(x, y)), 0, 4)];
        } else {
          const z = tw, th = Math.atan2(v / B, u / A);
          let t = 2.2 + Math.sin(th) * 0.55 + Math.min(1.5, (z - 1) * 0.2) + (K.vnoise(th * 7, z * 2.2, 5) - 0.5) * 0.7 + (K.hash(x, y, 7) - 0.5) * 0.3, ramp = sl;
          /* the seams between the plates, along her */
          const sd = PS.angDiff(th, Math.round(th / 0.52) * 0.52);
          if (Math.abs(Math.sin(sd)) * pd < 0.6) t = 3.9;
          /* the frames: a lit face, its shadow beyond it */
          for (const zk of FR) { const dz = z - zk; if (Math.abs(dz) < 0.035 * zk) t = 1.3 + Math.sin(th) * 0.5 + (K.hash(x, y, 8) - 0.5) * 0.4; else if (dz > 0.035 * zk && dz < 0.08 * zk) t += 1.1; }
          /* the pipes and cables along her, round in section; a collar where each passes a frame */
          for (const [pa, pw, pr] of PIPES) {
            const n = PS.angDiff(pa, th) / pw;
            if (Math.abs(n) > 1) continue;
            ramp = RM[pr[0]];
            t = Math.abs(n) > 0.86 ? 4 : 0.9 + n * 1.2 + n * n * 1.6 + Math.min(1.2, (z - 1) * 0.15);
            if (FR.some(zk => Math.abs(z - zk) < 0.05 * zk)) t += 0.9;
            break;
          }
          if (z > 8.5) t = 4;
          q = ramp[PS.clamp(Math.round(t + K.bayer(x, y)), 0, 4)];
        }
        const o = (y * Wd + x) * 4; d[o] = q[0]; d[o + 1] = q[1]; d[o + 2] = q[2]; d[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    /* rivets along the frames, standing on the plating */
    for (const zk of FR) for (let k = 0; k < 40; k++) {
      const th = k / 40 * PS.TAU, wy = Math.sin(th) * B; if (wy > H) continue;
      const [x, y] = P(Math.cos(th) * A * 0.985, wy * 0.985, zk * 0.97);
      if (x > -2 && x < Wd + 2 && y > -2 && y < Ht + 2) K.rivet(g, x, y, M.slate[1], INK);
    }
    /* the lamps, hung under the overhead down her length, caged */
    const lamps = [1.8, 3.1, 5].map(z => { const [x, y] = P(0.35, -B + 0.16, z), s = Math.max(2, 0.07 * F / z); return [x, y, s]; });
    for (const [x, y, s] of lamps) {
      K.rect(g, x - s * 0.2, y - s * 2, Math.max(1, s * 0.4), s * 1.4, M.iron[2]);
      K.disc(g, x, y, s, s * 0.8, M.cream[1]); K.disc(g, x - s * 0.25, y - s * 0.2, s * 0.55, s * 0.45, M.cream[0]);
      for (const ox of [-0.6, 0, 0.6]) K.rect(g, x + ox * s, y - s * 0.8, 1, s * 1.6, M.iron[2]);
    }
    /* the TDC's cabinet down the left side: its top, its face toward you, the dials and a crank on it */
    {
      const x0 = -1.02, x1 = -1.32, yT = -0.38, z0 = 1.2, z1 = 2.6;
      const a = P(x0, yT, z0), b = P(x0, yT, z1), cc = P(x0, H, z1), dd = P(x0, H, z0), e = P(x1, yT, z0), f2 = P(x1, yT, z1);
      K.poly(g, [e, f2, b, a], M.slate[1]);
      const face = K.mk(Wd, Ht), fg = face.getContext("2d");
      K.poly(fg, [a, b, cc, dd], "#fff");
      const fi = fg.getImageData(0, 0, Wd, Ht).data;
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
        if (!fi[(y * Wd + x) * 4 + 3]) continue;
        const z = (x0 * F) / (x + 0.5 - cx);
        K.px(g, x, y, M.slate[PS.clamp(Math.round(2 + Math.min(1.2, (z - 1) * 0.5) + (K.vnoise(z * 9, y / 3, 12) - 0.5) * 0.8 + K.bayer(x, y) * 0.7), 0, 4)]);
      }
      K.line(g, a[0], a[1], b[0], b[1], M.slate[0]); K.line(g, a[0], a[1], dd[0], dd[1], INK);
      for (const [yy, zz] of [[-0.16, 1.4], [-0.16, 1.85], [0.14, 1.4], [0.14, 1.85], [-0.16, 2.3]]) {
        const [x, y] = P(x0, yy, zz), ry = 0.09 * F / zz, rx = ry * 0.6;
        K.disc(g, x, y, rx + 1, ry + 1, INK); K.disc(g, x, y, rx, ry, "#e9e2cf"); K.disc(g, x + rx * 0.2, y + ry * 0.2, rx * 0.7, ry * 0.7, "#d6cdb5");
        K.line(g, x, y, x + rx * 0.5, y - ry * 0.6, "#11141a");
      }
      const [hx, hy] = P(x0, 0.4, 1.55); wheel(g, hx, hy, Math.max(3, Math.round(0.05 * F / 1.55)), Math.max(5, Math.round(0.1 * F / 1.55)), 0.5, M.steel, 4, 1.4);
    }
    K.relight(c, [0.6, 0.62, 0.68], lamps.map(([x, y, s]) => ({ x, y: y + s, r: s * 32, k: 0.55, col: [0.5, 0.46, 0.38] })));
    return c;
  });

  /* ---- the periscope, in front of it all: the glass's bezel, large and bolted, the mast going up out of it, the
   * box going down under it, the training handles standing out from its sides; its shadow on the tower ---- */
  const scope = (Wd, Ht, cx, cy, r) => K.get(`periscope:${Wd}x${Ht}:${cx},${cy},${r}`, () => {
    const c = K.mk(Wd, Ht), g = c.getContext("2d"), BZ = Math.round(Math.max(20, r * 0.16)), R0 = r + BZ, mw = Math.round(r * 0.36), hy = Math.round(cy + r * 0.06);
    const hl = Math.round(Math.max(30, r * 0.26)), gl = Math.round(Math.max(26, r * 0.22));
    /* the shadow, down and to the right */
    g.fillStyle = "rgba(0,0,0,.35)";
    K.disc(g, cx + 8, cy + 10, R0, R0); g.fillRect(cx - mw + 8, 0, mw * 2, cy); g.fillRect(cx - mw * 1.3 + 8, cy, mw * 2.6, Ht);
    for (const sd of [-1, 1]) g.fillRect(Math.min(cx + sd * R0, cx + sd * (R0 + hl + gl)) + 8, hy - 6, hl + gl, 22);
    /* the mast, up through the overhead, its collars; the box under the glass, down to the well */
    tube(g, cx, -4, cx, cy, mw, M.steel);
    for (const y of [Math.round((cy - R0) * 0.25), Math.round((cy - R0) * 0.7)]) tube(g, cx - mw - 4, y, cx + mw + 4, y, 4, M.steel);
    tube(g, cx, cy, cx, Ht + 4, Math.round(mw * 1.3), M.steel);
    /* the bezel: the rubber eyecup round the glass, then the heavy ring, shaded round, bolted */
    for (let y = cy - R0 - 1; y <= cy + R0 + 1; y++) for (let x = cx - R0 - 1; x <= cx + R0 + 1; x++) {
      const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (dd < r - 1 || dd > R0 + 0.5) continue;
      const ux = (x + 0.5 - cx) / dd, uy = (y + 0.5 - cy) / dd;
      if (dd > R0 - 1) { K.px(g, x, y, INK); continue; }
      if (dd < r + 5) { K.px(g, x, y, dd < r + 1 ? INK : -(ux * LX + uy * LY) > 0.5 && dd > r + 3 ? "#2a2e35" : "#121418"); continue; }
      const n = (dd - (r + 5 + R0) / 2) / ((R0 - r - 5) / 2);
      K.px(g, x, y, shade(M.steel, x, y, ux * n * 0.9, uy * n * 0.9, Math.sqrt(Math.max(0, 1 - n * n * 0.81)), 0.2));
    }
    for (let k = 0; k < 16; k++) { const a = k / 16 * PS.TAU + 0.1, x = cx + Math.cos(a) * (R0 - BZ / 2 + 2), y = cy + Math.sin(a) * (R0 - BZ / 2 + 2); K.disc(g, x + 1, y + 1, 2.5, 2.5, INK); K.disc(g, x, y, 2.5, 2.5, M.steel[2]); K.px(g, x - 1, y - 1, M.steel[0]); }
    /* the training handles: an arm out of each side of the box, a knuckle, the rubber grip */
    for (const sd of [-1, 1]) {
      const x0 = cx + sd * (R0 - 4), x1 = cx + sd * (R0 + hl), x2 = cx + sd * (R0 + hl + gl);
      tube(g, x0, hy, x1, hy, 7, M.steel);
      K.disc(g, x1, hy, 10, 10, INK); for (let yy = -9; yy <= 9; yy++) for (let xx = -9; xx <= 9; xx++) { const d = Math.hypot(xx, yy); if (d > 9) continue; K.px(g, x1 + xx, hy + yy, shade(M.steel, x1 + xx, hy + yy, xx / 10, yy / 10, Math.sqrt(1 - d * d / 100))); }
      tube(g, x1 + sd * 8, hy, x2, hy, 8, M.coal);
      for (let x = Math.min(x1 + sd * 12, x2); x < Math.max(x1 + sd * 12, x2); x += 4) K.rect(g, x, hy - 7, 1, 14, "rgba(0,0,0,.45)");
      K.disc(g, x2, hy, 8.5, 8.5, INK); K.disc(g, x2, hy, 7.5, 7.5, M.coal[2]); K.disc(g, x2 - 2, hy - 2, 3, 3, M.coal[1]);
    }
    return c;
  });

  /* ---- the helmsman: a puma side on, facing the wheel on his right, in a white cap and a chambray shirt.
   * His body and arms one picture, his head another (it rises and falls with his breath, blinks and flicks
   * an ear), each with its outline, drawn at k times his base size ---- */
  const FUR = M.puma, SHIRT = ["#9bb6cf", "#7c99b6", "#5f7c99", "#46607c", "#2f4358"], CAP = ["#f6f3ea", "#e2ddd0", "#c2bcac", "#9a9484", "#6c6759"];
  /* fur lit from the front, so his face reads whatever the lamps do */
  const furShade = (x, y, nx, ny) => FUR[PS.clamp(Math.round(0.6 + (1 - Math.max(0, nx * 0.55 - ny * 0.65 + 0.5)) * 2.6 + K.bayer(x, y)), 0, 4)];
  const pen = (g, k) => ({
    poly: (pts, col) => K.poly(g, pts.map(([a, b]) => [a * k, b * k]), col),
    disc: (x, y, rx, ry, col) => K.disc(g, x * k, y * k, rx * k, ry * k, col),
    line: (x0, y0, x1, y1, col, w = Math.max(1, Math.round(k))) => K.line(g, x0 * k, y0 * k, x1 * k, y1 * k, col, w),
    rect: (x, y, w, h, col) => K.rect(g, x * k, y * k, Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), col),
  });
  const body = k => K.get("helmsman:body:" + k, () => {
    const c = K.mk(64 * k, 74 * k), g = c.getContext("2d"), p = pen(g, k);
    /* the torso side on: the back straight, the shoulder rounded over, the chest out a little; lit on the back */
    for (let Y = Math.round(9 * k); Y < 74 * k; Y++) {
      const y = Y / k, x0 = 15 + Math.pow(Math.max(0, 17 - y), 2) / 9, x1 = 34 - Math.pow(Math.max(0, 15 - y), 2) / 8 + (y > 22 && y < 40 ? 1 : 0) - Math.max(0, y - 46) / 9;
      for (let X = Math.round(x0 * k); X <= Math.round(x1 * k); X++) { const n = (X / k - x0) / Math.max(1, x1 - x0); g.fillStyle = SHIRT[PS.clamp(Math.round(0.9 + n * 2.4 + (y < 14 ? -0.4 : 0) + K.bayer(X, Y)), 0, 4)]; g.fillRect(X, Y, 1, 1); }
    }
    /* the neck's fur in the open collar, the collar's points, the buttons down the front, a pocket, a crease */
    p.poly([[25, 7], [33, 9], [31, 16], [26, 13]], FUR[1]); p.rect(27, 12, 3, 2, FUR[0]);
    p.poly([[24, 9], [27, 13], [25, 16]], SHIRT[0]); p.poly([[33, 10], [31, 16], [35, 15]], SHIRT[1]);
    for (const yy of [21, 29, 37, 45]) p.rect(33, yy, 1, 1, SHIRT[0]);
    p.rect(26, 27, 6, 1, SHIRT[3]); p.rect(26, 28, 1, 5, SHIRT[3]); p.line(18, 50, 22, 60, SHIRT[3], 1);
    /* his far arm, reaching over to the top of the wheel, in the shirt's shade */
    for (let i = 0; i <= 1; i += 0.02) p.disc(32 + i * 17, 22 - i * 7, 2.6, 2.6, i < 0.75 ? SHIRT[3] : FUR[3]);
    /* his near arm: the sleeve from the shoulder to the elbow, the forearm forward to the wheel, the cuff turned back */
    for (let i = 0; i <= 1; i += 0.02) { const x = 23 + i * 4, y = 16 + i * 21; p.disc(x, y, 4.2, 4.2, SHIRT[PS.clamp(Math.round(1.2 + i * 1.2), 0, 4)]); p.rect(x - 4, y, 1, 1, SHIRT[0]); }
    for (let i = 0; i <= 1; i += 0.02) { const x = 27 + i * 19, y = 37 - i * 6, rr = i < 0.6 ? 3.6 : 2.8; p.disc(x, y, rr, rr, i < 0.6 ? SHIRT[i < 0.3 ? 2 : 1] : FUR[i < 0.8 ? 2 : 1]); p.rect(x, y - rr + 0.5, 1, 1, i < 0.6 ? SHIRT[0] : FUR[0]); }
    p.rect(36, 31, 2, 7, SHIRT[0]); p.line(25, 34, 29, 38, SHIRT[3], 1);
    /* the paws: the near one round the rim, its fingers; the far one over the top */
    p.disc(50, 30, 3.5, 3.5, FUR[1]); p.rect(49, 27, 4, 1, FUR[0]); for (const yy of [29, 31, 33]) p.rect(52, yy, 2, 0.6, FUR[3]);
    p.disc(50, 14, 2.5, 2.5, FUR[2]); p.rect(51, 13, 1, 1, FUR[1]);
    return K.outline(c, INK);
  });
  /* blink: his eye shut; ear: the ear turned back */
  const head = (k, blink, ear) => K.get(`helmsman:head:${k}:${blink}:${ear}`, () => {
    const c = K.mk(42 * k, 36 * k), g = c.getContext("2d"), p = pen(g, k);
    /* the ear, up at the back of the head: dark behind, fur in front, dark at the tip; turned back, laid flatter */
    const ep = ear ? [[6, 13], [7, 4], [15, 9]] : [[8, 12], [11, 1], [17, 9]];
    p.poly(ep, FUR[3]); p.poly([[ep[0][0] + 2, ep[0][1]], [ep[1][0] + 1, ep[1][1] + 3], [ep[2][0] - 1, ep[2][1]]], FUR[1]);
    p.poly([[ep[1][0] - 1, ep[1][1] + 2.5], [ep[1][0], ep[1][1]], [ep[1][0] + 1.5, ep[1][1] + 2]], "#2a1d14");
    /* the skull and the cheek, round; the muzzle forward and a little down, paler; the chin under it; the back
     * of the neck down to the collar */
    for (let Y = Math.round(4 * k); Y < 36 * k; Y++) for (let X = Math.round(3 * k); X < 40 * k; X++) {
      const x = X / k, y = Y / k;
      const sk = Math.hypot((x - 18) / 12.5, (y - 17) / 11.5), mz = Math.hypot((x - 30) / 7.5, (y - 21) / 6.4), ch = Math.hypot((x - 27) / 6, (y - 26.5) / 3.6), nk = x > 10 && x < 26 && y > 22 && y < 36 - (x - 10) * 0.25;
      if (sk > 1 && mz > 1 && ch > 1 && !nk) continue;
      const nx = (x - 18) / 12.5, ny = (y - 15) / 11.5;
      let col = furShade(X, Y, nx, ny);
      if (nk && sk > 1) col = FUR[x < 15 ? 3 : 2];
      if (mz <= 1 && (y > 20 || x > 31)) col = y > 22 ? FUR[0] : FUR[1];
      if (ch <= 1 && sk > 0.9) col = FUR[0];
      g.fillStyle = col; g.fillRect(X, Y, 1, 1);
    }
    /* the nose, the dark of the lip, the black patch at the whiskers, the dark line from the eye down the muzzle */
    p.rect(36, 18, 2, 2, "#c9877a"); p.rect(36.5, 18, 1, 0.6, "#e0a49a"); p.rect(38, 19, 1, 1, "#2a1d14");
    p.line(31, 23, 37, 22, "#3a2618"); p.disc(32, 22, 1.5, 1, "#2a1d14");
    p.line(29, 16, 31, 20, FUR[3]);
    /* whiskers, a few, forward, fine */
    for (const [a, b] of [[[34, 21], [41, 19]], [[34, 22], [41, 23]], [[33, 23], [39, 26]]]) p.line(a[0], a[1], b[0], b[1], "rgba(255,248,232,.8)", 1);
    /* the eye: amber, a slit of a pupil and a glint, the pale fur under it and the brow over it; shut, a dark line */
    if (blink) { p.line(25, 14.5, 30, 15, "#2a1d14"); p.rect(25, 16, 5, 1, FUR[0]); }
    else { p.rect(25, 13, 5, 3, "#d8b84a"); p.rect(25, 15, 5, 1, "#b8952e"); p.rect(27, 13, 1, 3, INK); p.rect(29, 13, 1, 1, "#fff6c8"); p.rect(25, 16, 5, 1, FUR[0]); p.rect(24, 12, 7, 1, FUR[3]); }
    /* the white cap: the crown on top of his head, the brim turned up round it, tipped back */
    for (let Y = Math.round(1 * k); Y < 9 * k; Y++) {
      const y = Y / k, w = Math.sqrt(Math.max(0, 1 - Math.pow((y - 7) / 7, 2))) * 9;
      for (let X = Math.round((23 - w) * k); X <= Math.round((23 + w) * k); X++) { g.fillStyle = CAP[PS.clamp(Math.round(0.6 + (14 - X / k) / 18 * 1.6 + y * 0.12 + K.bayer(X, Y)), 0, 4)]; g.fillRect(X, Y, 1, 1); }
    }
    p.line(13, 9, 33, 7, CAP[2]); p.line(13, 8, 33, 6, CAP[0], 1); p.line(13, 10, 33, 8, CAP[3], 1);
    return K.outline(c, INK);
  });

  /* the helm: the wheel on its stand against the side, the man at it, and the stand's head in front of his middle,
   * with the rudder's indicator. k: his size; x, y: where his base picture's corner goes */
  let wheelA = 0, wheelAt = 0;
  const helmsman = (g, S, now, x, y, k, Ht) => {
    const s = S.sub, calm = PS.calm(), q = v => Math.round(v * k);
    /* the wheel answers the helm: over toward the ordered course while she swings, amidships when she is steady */
    const want = PS.clamp(PS.angDiff(s.hdg, s.ordHdg) * 6, -2.4, 2.4), dt = (now - wheelAt) / 1000;
    wheelA = calm || dt > 0.25 ? want : wheelA + (want - wheelA) * Math.min(1, dt * 3);
    wheelAt = now;
    const wx = x + q(56), wy = y + q(37), WR = q(15);
    K.rect(g, wx + q(2), wy, q(8), Ht - wy, "rgba(0,0,0,.3)");
    tube(g, wx + q(5), wy, wx + q(5), Ht + 2, q(3), M.iron);
    tube(g, wx, wy, wx + q(8), wy, q(2.5), M.steel);
    /* he breathes; now and then he blinks, and flicks an ear */
    const br = calm ? 0 : Math.round((Math.sin(now / 560) + 1) * 0.5 * k), blink = !calm && now % 5300 < 140 ? 1 : 0, ear = !calm && now % 8700 < 260 ? 1 : 0;
    const bd = body(k);
    g.drawImage(bd, x, y + q(12));
    /* the wheel, turned three quarters away: its spokes turning, the handles out past the rim */
    wheel(g, wx, wy, q(8), WR, wheelA, M.steel, 6, Math.max(0.9, k * 0.8));
    for (let i = 0; i < 6; i++) { const a = wheelA + i * PS.TAU / 6, hx = wx + Math.cos(a) * q(11), hy = wy + Math.sin(a) * (WR + q(4)); K.disc(g, hx, hy, 1.6 * k, 1.6 * k, INK); K.disc(g, hx, hy, 1.6 * k - 1, 1.6 * k - 1, M.steel[Math.sin(a) > 0 ? 2 : 1]); }
    /* his paws over the rim, then his head, on his breath */
    g.drawImage(bd, q(46), q(10), q(18), q(28), x + q(46), y + q(22), q(18), q(28));
    g.drawImage(head(k, blink, ear), x + q(5), y - q(6) - br);
    /* the stand's head, in front of his middle: a box with the rudder's indicator */
    const bx = x + q(26), by = y + q(68), bw = q(44);
    K.rect(g, bx - 1, by - 1, bw + 2, Ht - by + 2, INK);
    for (let yy = by; yy < Ht; yy++) for (let xx = bx; xx < bx + bw; xx++) K.px(g, xx, yy, M.slate[PS.clamp(Math.round(2 + (K.vnoise(xx / 20, yy / 3, 9) - 0.5) * 0.8 + K.bayer(xx, yy) * 0.7 + (yy - by) / 60), 0, 4)]);
    K.rect(g, bx, by, bw, 1, M.slate[0]); K.rivet(g, bx + 3, by + 3, M.slate[0], INK); K.rivet(g, bx + bw - 5, by + 3, M.slate[0], INK);
    const dx = bx + bw / 2, dy = by + q(15), dr = q(7);
    K.disc(g, dx, dy, dr + 1, dr + 1, INK); K.disc(g, dx, dy, dr, dr, "#e9e2cf");
    K.line(g, dx, dy, dx + Math.sin(wheelA * 0.4) * (dr - 1), dy - Math.cos(wheelA * 0.4) * (dr - 1), "#c8402a", Math.max(1, Math.round(k)));
  };

  /* the periscope station round the glass: the tower, the helmsman, the periscope in front of them, all under the
   * red light when she is dived; the glass itself left clear, row by row, for the sea in it */
  let back = null;
  T.round = (g, S, now, Wd, Ht, cx, cy, r) => {
    if (!back || back.width !== Wd || back.height !== Ht) back = K.mk(Wd, Ht);
    const b = back.getContext("2d"), { F, P } = geo(cx, cy, r);
    b.imageSmoothingEnabled = false;
    b.globalCompositeOperation = "source-over";
    b.drawImage(tower(Wd, Ht, cx, cy, r), 0, 0);
    /* he stands on the deck by the right side, close by: his size and his place from where he stands */
    const z = 1.85, k = Math.max(1, Math.round(F / z / 100 * 2) / 2), [fx, fy] = P(0.98, H, z);
    helmsman(b, S, now, Math.round(fx - 30 * k), Math.round(fy - 1.4 * F / z + 6 * k), k, Ht);
    b.drawImage(scope(Wd, Ht, cx, cy, r), 0, 0);
    K.rigRed(b, Wd, Ht, cx, cy);
    b.globalCompositeOperation = "destination-out"; b.fillStyle = "#000";
    for (let y = cy - r; y <= cy + r; y++) { const dy = y - cy, ins = r * r - dy * dy; if (ins <= 0) continue; const w = Math.sqrt(ins); b.fillRect(Math.round(cx - w), y, Math.round(cx + w) - Math.round(cx - w), 1); }
    b.globalCompositeOperation = "source-over";
    g.drawImage(back, 0, 0);
  };

  /* ---- the upper hatch, from the foot of the ladder: the trunk going up, its rings and rivets, the ladder
   * up its near side, and the hatch at the top, shut, its dogs home and its wheel in the middle ---- */
  const hatch = (Wd, Ht) => K.get(`hatch:${Wd}x${Ht}`, () => {
    const c = K.mk(Wd, Ht), g = c.getContext("2d"), cx = Wd / 2, cy = Math.round(Ht * 0.34), a = Math.round(Ht * 0.21), bb = Math.round(Ht * 0.14);
    const img = g.createImageData(Wd, Ht), d = img.data, sl = M.slate.map(K.rgb), st = M.steel.map(K.rgb), RINGS = [1.28, 1.7, 2.35, 3.4, 5.2];
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
      const ex = (x + 0.5 - cx) / a, ey = (y + 0.5 - cy) / bb, dd = Math.hypot(ex, ey), th = Math.atan2(ey, ex);
      let q;
      if (dd < 0.8) {
        /* the hatch's lid: dished, lit from the lamp below on the left, brushed */
        const nx = ex / 0.8 * 0.5, ny = ey / 0.8 * 0.5, v = (K.vnoise(x / 30, y / 4, 3) - 0.5) * 0.7;
        q = st[PS.clamp(Math.round(1.6 + nx * 1.4 - ny * 0.6 + v + dd * 0.8 + K.bayer(x, y)), 0, 4)];
      } else if (dd < 0.86) q = K.rgb("#0b0d11");
      else if (dd < 1) q = st[PS.clamp(Math.round(1 - Math.cos(th + 2.3) * 1.2 + (dd - 0.86) * 8 + K.bayer(x, y) * 0.6), 0, 4)];
      else {
        /* the trunk's wall, nearer as it comes down toward you: lit on the lamp's side, darker far up and far out */
        const z = 1 / dd, ring = RINGS.some(R0 => Math.abs(dd - R0) < 0.035 * R0), edge = RINGS.some(R0 => dd - R0 > 0.035 * R0 && dd - R0 < 0.06 * R0);
        let t = 2.3 - Math.cos(th + 2.4) * 0.9 + z * 0.9 + (K.vnoise(th * 8, dd * 3, 5) - 0.5) * 0.7 + (K.hash(x, y, 7) - 0.5) * 0.3 + Math.max(0, dd - 3) * 0.25;
        if (ring) t = 3.6; else if (edge) t -= 1.1;
        q = sl[PS.clamp(Math.round(t + K.bayer(x, y)), 0, 4)];
      }
      const o = (y * Wd + x) * 4; d[o] = q[0]; d[o + 1] = q[1]; d[o + 2] = q[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const P = (th, dd) => [cx + Math.cos(th) * a * dd, cy + Math.sin(th) * bb * dd];
    /* rivets round each ring */
    for (const R0 of RINGS) for (let k = 0; k < 28; k++) { const [x, y] = P(k / 28 * PS.TAU, R0 * 1.08); if (x > -2 && x < Wd + 2 && y > -2 && y < Ht + 2) K.rivet(g, x, y, M.slate[1], INK); }
    /* the dogs round the lid, home in the coaming; the hinge at the top */
    for (let k = 0; k < 6; k++) {
      const th = k / 6 * PS.TAU + 0.5, [x0, y0] = P(th, 0.62), [x1, y1] = P(th, 0.92);
      K.line(g, x0 + 1, y0 + 2, x1 + 1, y1 + 2, "rgba(0,0,0,.5)", 3); K.line(g, x0, y0, x1, y1, M.steel[3], 3); K.line(g, x0 - 1, y0 - 1, x1 - 1, y1 - 1, M.steel[1], 1);
      K.disc(g, x0, y0, 2, 2, M.steel[2]);
    }
    { const [x, y] = P(-Math.PI / 2, 0.92); K.rect(g, x - 16, y - 4, 32, 8, INK); K.rect(g, x - 15, y - 3, 30, 6, M.steel[3]); K.rect(g, x - 15, y - 3, 30, 1, M.steel[1]); K.rect(g, x - 2, y - 4, 4, 8, M.steel[2]); }
    /* the wheel in the middle of the lid that works the dogs, seen from under it */
    K.disc(g, cx + 2, cy + 3, Math.round(a * 0.3) + 1, Math.round(bb * 0.3) + 1, "rgba(0,0,0,.45)");
    wheel(g, cx, cy, Math.round(a * 0.3), Math.round(bb * 0.3), 0.3, M.steel, 4);
    /* the ladder up the near side, standing off the wall: its rails, its rungs */
    const rail = th => { for (let dd = 1.02; dd < 7; dd += 0.01) { const [x, y] = P(th, dd), w = Math.max(2, Math.round(dd * 2.2)); if (y > Ht + 4) break; K.rect(g, x - w / 2 - 1, y, w + 2, 2, INK); K.rect(g, x - w / 2, y, w, 2, shade(M.steel, x, y, Math.cos(th) * 0.3, -0.4, 0.8)); K.px(g, x - w / 2, y, M.steel[0]); } };
    const L0 = Math.PI / 2 - 0.34, L1 = Math.PI / 2 + 0.34;
    for (const dd of [1.12, 1.32, 1.58, 1.92, 2.4, 3.05, 4, 5.4]) {
      const [x0, y0] = P(L0, dd), [x1, y1] = P(L1, dd), w = Math.max(2, Math.round(dd * 1.8));
      if (y0 > Ht + 4) continue;
      K.line(g, x0, y0 + w + 1, x1, y1 + w + 1, "rgba(0,0,0,.4)", w);
      K.line(g, x0, y0, x1, y1, M.steel[2], w); K.line(g, x0, y0 - Math.floor(w / 2), x1, y1 - Math.floor(w / 2), M.steel[1], 1);
    }
    rail(L0); rail(L1);
    /* the lamp, low on the left, caged */
    { const [x, y] = P(Math.PI * 0.86, 1.9); K.disc(g, x, y, 6, 5, M.cream[1]); K.disc(g, x - 1, y - 1, 3, 3, M.cream[0]); for (const o of [-4, 0, 4]) K.rect(g, x + o, y - 6, 1, 12, M.iron[2]); }
    K.relight(c, [0.7, 0.72, 0.76], [{ x: cx, y: cy, r: Math.max(Wd, Ht) * 0.5, k: 0.5, col: [0.45, 0.42, 0.36] }]);
    return c;
  });
  T.hatch = (g, Wd, Ht) => {
    g.drawImage(hatch(Wd, Ht), 0, 0);
    K.rigRed(g, Wd, Ht, Wd / 2, Math.round(Ht * 0.34));
  };
})();
