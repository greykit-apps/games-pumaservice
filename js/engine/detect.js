/* Puma Service -- seeing and being seen.
 *
 * Both ways, from one model, so what the picture shows is what the engine
 * says is there. The light comes from the hour and the moon, the weather
 * thins it, and the horizon cuts it: from the bridge (thirty feet up) or a
 * periscope (three) a ship's masts show before her hull does.
 *
 * We see by eye (bridge or periscope), by radar once the boat has it, and
 * hear screws on the hydrophones when submerged: a bearing, no range. They
 * see us by eye when we show above the water, by radar late in the war,
 * hear us on their hydrophones (louder the faster we go, worse the faster
 * they go), and ping us with active sonar when they hunt: a cone ahead of
 * the escort, with a blind gap close under its bow. */
"use strict";
(() => {
  const C = PS.C, D = C.DET, Sub = PS.Sub, Sh = PS.Ships, Det = PS.Detect = {};
  const R = S => PS.rand(S);
  /* a chance a second, held for dt seconds */
  const roll = (S, p, dt) => p > 0 && R(S) < 1 - Math.pow(1 - Math.min(0.95, p), dt);

  /* the light, thinned by the weather: 0 black to 1 a clear noon */
  Det.light = S => C.light(S.t) * (1 - C.WX[S.wx.k].dark * 0.6);
  Det.night = S => C.light(S.t) < 0.3;
  /* how far a ship of kind k is seen by eye now, before the horizon */
  Det.shipRange = (S, k) => PS.lerp(D.shipNight, D.shipDay, Math.pow(Det.light(S), 0.8)) * S.wx.vis * Math.sqrt(k.len / 130);
  /* how far our eye reaches to it, horizon and all */
  Det.eyeTo = (S, eyeH, k) => Math.min(Det.shipRange(S, k), C.horizon(eyeH, k.mast));
  Det.eyeH = s => Sub.surfaced(s) ? C.EYE.bridge : Sub.scopeReady(s) ? C.EYE.scope + Math.max(0, C.PD - s.depth) * 0.6 : null;

  Det.step = (S, dt, ev) => {
    const s = S.sub, e = C.era(C.monthOf(S.t)), eyeH = Det.eyeH(s), L = Det.light(S), expert = S.real.expert ? 1 : 0;
    const radar = Sub.radarWorks(s), sub = !Sub.surfaced(s), hydOk = sub && s.sys.sonar < 0.7;
    const out = { seen: 0, heard: 0, nearestSeen: 1e9, nearestEscort: 1e9, hunted: false };
    for (const sh of S.ships) {
      if (sh.sunk) continue;
      const k = C.SHIPS[sh.cls], d = PS.dist(s.x, s.y, sh.x, sh.y), brg = PS.angTo(s.x, s.y, sh.x, sh.y);
      if (sh.role === "escort" && !sh.sinking) out.nearestEscort = Math.min(out.nearestEscort, d);
      /* ---- ours ---- */
      let by = "";
      if (eyeH !== null && d < Det.eyeTo(S, eyeH, k)) by = "eye";
      else if (radar && d < D.radarSub) by = "radar";
      const was = sh.kn.t >= 0 && S.t - sh.kn.t < 300;
      if (by) {
        sh.kn.t = S.t; sh.kn.x = sh.x; sh.kn.y = sh.y; sh.kn.by = by; sh.kn.brg = brg; sh.kn.hdg = sh.hdg; sh.kn.spd = sh.spd;
        if (by === "eye") sh.kn.id = true;
        if (!was) { ev.push({ t: by === "eye" ? "sighted" : "radarContact", id: sh.id, cls: sh.cls, role: sh.role, brg, rng: d, first: !sh.kn.logged }); sh.kn.logged = true; }
        out.seen++; out.nearestSeen = Math.min(out.nearestSeen, d);
      } else if (hydOk && d < D.ourHyd * (0.45 + sh.spd / 18) * (1 - s.sys.sonar)) {
        sh.kn.ear = S.t; sh.kn.earBrg = PS.normAng(brg + PS.gauss(() => R(S)) * (0.02 + s.sys.sonar * 0.1));
        if (S.t - (sh.kn.earT0 || -1e9) > 900) { sh.kn.earT0 = S.t; if (!was) ev.push({ t: "screws", id: sh.id, brg: sh.kn.earBrg, fast: sh.spd > 16 }); }
        out.heard++;
      } else if (eyeH !== null && sh.role === "merchant" && L > 0.5 && d < D.smokeDay * S.wx.vis && d > Det.eyeTo(S, eyeH, k)) {
        if (S.t - (sh.kn.smoke || -1e9) > 1200 && !was) ev.push({ t: "smoke", id: sh.id, brg });
        sh.kn.smoke = S.t; sh.kn.smokeBrg = brg;
      }
      if (sh.sinking) continue;
      /* ---- theirs ---- */
      const esc = sh.role === "escort", ai = sh.ai, ex = Sub.exposed(s);
      let how = "", p = 0;
      if (ex > 0) {
        let Rv = Sub.surfaced(s) ? PS.lerp(D.subNight, D.subDay, L) : PS.lerp(D.scopeNight, D.scopeDay, L) * (1 + s.spd / D.featherKn * 0.6) * (ex / 8);
        Rv *= S.wx.vis;
        if (esc && sh.lit && Det.night(S)) Rv = Math.max(Rv, Sub.surfaced(s) ? 4200 : 600);
        if (d < Rv) { p = D.look * Math.pow(1 - d / Rv, 2) * e.asw * (esc ? 1 + expert * 0.5 : 0.5); how = "eye"; }
      }
      if (esc && e.escortRadar && Sub.surfaced(s) && d < D.radarShipVsSub && p < 0.5) { p = 0.5; how = "radar"; }
      if (esc && sub) {
        const Rh = D.hyd * Sub.noise(s) * e.asw * C.SHIPS[sh.cls].sonar * (sh.spd > D.hydFastKn ? D.hydFast : 1) * (1 - S.wx.sea * 0.06) * (1 + expert * 0.25);
        if (d < Rh) { const q = 0.22 * (1 - d / Rh); if (q > p) { p = q; how = "ear"; } }
        if (ai.st === "search" || ai.st === "attack" || ai.st === "hold") {
          const Rs = e.sonar * k.sonar * (1 + expert * 0.15), rel = Math.abs(PS.angDiff(sh.hdg, PS.angTo(sh.x, sh.y, s.x, s.y)));
          if (d > D.sonarMin && d < Rs && rel < D.sonarCone) { const q = D.ping * Math.sqrt(1 - d / Rs) * (1 - s.depth / 1400) * (s.bottomed ? 0.5 : 1) * (!expert && s.depth > 220 ? 0.55 : 1); if (q > p) { p = q; how = "sonar"; } }
          if (d < Rs * 1.3) out.pinged = true;
        }
      }
      if (how && roll(S, p, dt)) {
        const err = (how === "sonar" ? C.ESC.posErr[expert] : how === "ear" ? 220 + d * 0.12 : 60) * (0.5 + R(S));
        const a = R(S) * PS.TAU;
        const dz = how === "sonar" ? s.depth + PS.gauss(() => R(S)) * C.ESC.depthErr[expert] : how === "ear" ? 150 + PS.gauss(() => R(S)) * 40 : 0;
        if (esc) {
          const fresh = !ai.contact || S.t - ai.contact > 120;
          ai.contact = S.t; ai.how = how;
          ai.datum = { x: s.x + Math.sin(a) * err, y: s.y + Math.cos(a) * err, t: S.t, vx: PS.hx(s.hdg) * s.spd * PS.KN, vy: PS.hy(s.hdg) * s.spd * PS.KN };
          ai.dz = Math.max(30, dz);
          if (fresh && how !== "ear") ev.push({ t: "escortContact", id: sh.id, how });
        }
        const cv = Sh.convoy(S, sh.conv);
        if (cv && (!cv.alert || S.t - cv.alertT > 600)) { Sh.alarm(S, cv, s.x, s.y, ev); ev.push({ t: "spotted", id: sh.id, how }); }
      }
      if (esc && (ai.st === "attack" || ai.st === "drop") && d < 3000) out.hunted = true;
    }
    return out;
  };

  /* our knowledge of a ship: where we last had it, and how long ago */
  Det.known = (S, sh) => sh.kn.t >= 0 && S.t - sh.kn.t < 30;
  Det.everSeen = sh => sh.kn.t >= 0;
})();
