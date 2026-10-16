/* Puma Service -- the damage report: the boat cut away side on, her
 * compartments, the water in her, and every system's lamp: sound,
 * damaged, being repaired, or waiting for a yard. A hatched fill as well as
 * a colour, so a lamp is never read by colour alone. */
"use strict";
(() => {
  const K = PS.K, C = PS.C, Sub = PS.Sub, D = PS.DamageArt = {};
  const INK = "#07090d";
  /* the compartments, bow to stern, and the systems in each */
  const ROOMS = [["Forward torpedo", ["tubesF", "planes"]], ["Forward battery", ["battery"]], ["Control", ["scope", "radar", "sonar", "pumps"]], ["After battery", ["battery"]],
    ["Engine rooms", ["engines"]], ["Maneuvering", ["motors"]], ["After torpedo", ["tubesA", "planes"]]];
  D.draw = (g, S, ui, now) => {
    const Wd = g.canvas.width, Ht = g.canvas.height, s = S.sub;
    g.fillStyle = "#0b1119"; g.fillRect(0, 0, Wd, Ht);
    for (let y = 0; y < Ht; y += 4) { g.fillStyle = "rgba(127,224,168,.025)"; g.fillRect(0, y, Wd, 1); }
    const sf = PS.Render.safe || { t: 28, b: 12 }, cx = Wd / 2, L = Math.min(Wd - 80, 560), x0 = Math.round(cx - L / 2), R = Math.round(L * 0.055), yC = Math.round(sf.t + 46 + R);
    /* the hull in section: a long cigar, the casing above, the conning tower */
    const hullY = x => { const t = (x - x0) / L, taper = t < 0.12 ? Math.sqrt(t / 0.12) : t > 0.82 ? Math.sqrt(Math.max(0, (1 - t) / 0.18)) : 1; return R * taper; };
    for (let x = x0; x <= x0 + L; x++) { const h = hullY(x); g.fillStyle = "#2a3340"; g.fillRect(x, Math.round(yC - h), 1, Math.round(h * 2)); g.fillStyle = "#3a4656"; g.fillRect(x, Math.round(yC - h), 1, 1); g.fillStyle = "#161c24"; g.fillRect(x, Math.round(yC + h - 1), 1, 1); }
    K.rect(g, x0 + L * 0.06, yC - R - 4, L * 0.86, 4, "#323c4a");
    K.rect(g, cx - L * 0.07, yC - R - 18, L * 0.12, 14, "#323c4a"); K.rect(g, cx - L * 0.02, yC - R - 34, 3, 16, "#8a93a0"); K.rect(g, cx + L * 0.01, yC - R - 30, 3, 12, "#8a93a0");
    g.drawImage(PS.Puma.crest(12), Math.round(cx - L * 0.07 + L * 0.06 - 6), Math.round(yC - R - 17));
    /* the water in her, from the bilges up */
    if (s.water > 0.005) {
      const wy = yC + R - s.water * R * 2;
      for (let x = x0; x <= x0 + L; x++) { const h = hullY(x), top = Math.max(wy, yC - h), bot = yC + h; if (bot > top) { g.fillStyle = "rgba(60,140,200,.6)"; g.fillRect(x, Math.round(top), 1, Math.round(bot - top)); } }
      for (let x = x0; x <= x0 + L; x += 3) if (K.hash(x, Math.floor(now / 200), 3) > 0.7) { g.fillStyle = "rgba(200,230,250,.6)"; g.fillRect(x, Math.round(wy), 2, 1); }
    }
    /* the bulkheads, and each room's worst system */
    const wRoom = L / ROOMS.length;
    ROOMS.forEach(([name, sys], i) => {
      const rx = x0 + i * wRoom, worst = Math.max(...sys.map(k => s.sys[k]));
      if (i > 0) { const h = hullY(rx); K.rect(g, rx, yC - h, 1, h * 2, "#0b1119"); }
      if (worst > 0.05) { for (let y = Math.round(yC - R + 2); y < yC + R - 2; y++) for (let x = Math.round(rx + 2); x < rx + wRoom - 2; x++) if ((x + y) % 4 === 0 && Math.abs(y - yC) < hullY(x) - 1) { g.fillStyle = worst > 0.5 ? "rgba(232,87,58,.7)" : "rgba(240,164,60,.6)"; g.fillRect(x, y, 1, 1); } }
      const nm = ["FWD TORP", "FWD BATT", "CONTROL", "AFT BATT", "ENGINES", "MOTORS", "AFT TORP"][i];
      K.text5(g, nm, Math.round(rx + wRoom / 2 - K.text5w(nm) / 2), Math.round(yC + R + 5), worst > 0.05 ? (worst > 0.5 ? "#ff9a80" : "#f0a43c") : "#8d949d", INK);
    });
    /* hull and depth */
    const hy = yC + R + 22;
    K.text5(g, "HULL " + Math.round(s.hull * 100) + "%", x0, hy, s.hull < 0.5 ? "#ff9a80" : "#e9e4d8", INK);
    K.text5(g, "CRUSH " + Math.round(Sub.crushDepth(s)) + " FT", x0 + 110, hy, "#e9e4d8", INK);
    K.text5(g, "WATER " + Math.round(s.water * 100) + "%", x0 + 240, hy, s.water > 0.25 ? "#ff9a80" : "#e9e4d8", INK);
    K.text5(g, s.silent ? "PUMPS STOPPED: SILENT RUNNING" : "PUMPS " + (s.sys.pumps > 0.5 ? "FAILING" : "RUNNING"), x0 + 370, hy, s.silent || s.sys.pumps > 0.5 ? "#f0a43c" : "#e9e4d8", INK);
    K.text5(g, (Sub.surfaced(s) ? "SURFACED" : "DEPTH " + Math.round(s.depth) + " FT") + "  " + C.BELLS[s.bell].toUpperCase() + " " + s.spd.toFixed(1) + " KN", x0, hy + 12, "#aab0b8", INK);
    /* the systems */
    const top = hy + 30, colW = Math.round(L / 3);
    Sub.SYS.forEach(([k, name], i) => {
      const x = x0 + (i % 3) * colW, y = top + Math.floor(i / 3) * 22, v = s.sys[k], port = Sub.portOnly(S, k) && v > 0;
      const st = v <= 0.001 ? "OK" : port ? "PORT ONLY" : s.fixing === k ? "REPAIRING" : v >= 0.5 ? "OUT" : "DAMAGED";
      const col = st === "OK" ? "#7fe0a8" : st === "REPAIRING" ? "#e6bd6a" : st === "DAMAGED" ? "#f0a43c" : "#ff9a80";
      K.rect(g, x, y, 9, 9, INK); K.rect(g, x + 1, y + 1, 7, 7, col);
      if (st !== "OK") for (let j = 0; j < 7; j++) K.px(g, x + 1 + j, y + 7 - j, INK);
      K.text5(g, name.toUpperCase(), x + 14, y + 1, "#e9e4d8", INK);
      K.text5(g, st + (st !== "OK" ? " " + Math.round(v * 100) + "%" : ""), x + 14, y + 10, col);
    });
    if (s.fixing === "hull") K.text5(g, "THE CREW ARE PATCHING THE HULL", x0, top + 4 * 22 + 6, "#e6bd6a", INK);
  };
})();
