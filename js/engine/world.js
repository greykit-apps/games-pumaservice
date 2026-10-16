/* Puma Service -- one step of the war.
 *
 * E.tick(S, cmd) carries out the orders in cmd, runs the boat, the ships,
 * the hunters, the torpedoes and the eyes for one step, and returns what
 * happened as a list of events (the page turns them into sounds, words and
 * pictures; the engine keeps its own log). A step is a fiftieth of a second
 * of game time at 1x; time compression makes each step longer, never more
 * of them, up to the cap the situation allows: the engine sets the cap
 * itself, so a game played again from its seed and its orders comes out the
 * same, step for step. */
"use strict";
(() => {
  const C = PS.C, Sub = PS.Sub, Sh = PS.Ships, W = PS.Weapons, Det = PS.Detect, Esc = PS.Escort, E = PS.Engine = PS.Engine || {};
  const R = S => PS.rand(S);

  E.log = (S, text, k = "") => { S.log.push({ t: S.t, text, k }); if (S.log.length > 300) S.log.shift(); };
  E.dt = S => C.DT * C.TC[Math.min(S.tcReq, S.tcCap)];
  E.tcNow = S => C.TC[Math.min(S.tcReq, S.tcCap)];

  /* ---- the orders: cmd = { dHdg, acts: [{ a, ... }] } ---- */
  function orders(S, cmd, ev, aids) {
    const s = S.sub;
    if (cmd.dHdg) s.ordHdg = PS.normAng(s.ordHdg + cmd.dHdg);
    if (cmd.dTrain) s.scope.brg = PS.normAng(s.scope.brg + cmd.dTrain);
    if (cmd.dGun) s.gun.brg = PS.normAng(s.gun.brg + cmd.dGun);
    for (const a of cmd.acts || []) {
      switch (a.a) {
        case "tc": S.tcReq = PS.clamp(a.v !== undefined ? a.v : S.tcReq + a.d, 0, C.TC_MAX_IDX); break;
        case "fire": W.fire(S, ev); break;
        case "lock": W.lock(S, a.id, ev); break;
        case "unlock": W.unlock(S); break;
        case "dial": W.dial(S, a, ev); break;
        case "stadimeter": W.stadimeter(S, ev); break;
        case "gun": case "gunTrain": case "gunSetBrg": case "gunRange": case "gunSetRng": case "gunFire": W.gunOrder(S, a, ev); break;
        default: Sub.order(S, a, ev);
      }
    }
  }

  /* ---- the cap on time compression ---- */
  function cap(S, det) {
    const s = S.sub, T = C.TC_CAP;
    let c = C.TC_MAX_IDX, why = "";
    const set = (v, w) => { if (v < c) { c = v; why = w; } };
    if (S.ships.length) set(T.near, "ships");
    if (det.seen || det.heard) set(T.contact, "contact");
    if (det.nearestSeen < 8000 || det.nearestEscort < 10000) set(T.close, "close");
    if (S.torps.length) set(T.torps, "torps");
    if (S.planes.some(p => p.seen)) set(T.close, "plane");
    if (det.hunted || det.pinged || det.nearestEscort < 2500) set(T.hunted, "hunted");
    if (S.charges.length || S.planes.some(p => p.st === "attack" && PS.dist(p.x, p.y, s.x, s.y) < 25000) || S.torps.some(t => t.fate === "circ" && t.run > 400)) set(T.charges, "charges");
    if (s.depth > Sub.testDepth(s) || s.water > 0.4) set(T.hunted, "danger");
    return { c, why };
  }

  E.tick = (S, cmd = {}, aids = null) => {
    const ev = [];
    if (S.phase !== "sea") return ev;
    orders(S, cmd, ev, aids);
    const idx = Math.min(S.tcReq, S.tcCap), dt = C.DT * C.TC[idx];
    /* the weather turns, now and then */
    if (S.t > S.wx.until && S.mode === "patrol") {
      const ks = Object.keys(C.WX), tot = ks.reduce((a, k) => a + C.WX[k].w, 0);
      let r = R(S) * tot, k = ks[0];
      for (const q of ks) { r -= C.WX[q].w; if (r <= 0) { k = q; break; } }
      if (k !== S.wx.k) { E.setWx(S, k); ev.push({ t: "weather", k }); } else S.wx.until = S.t + 3600 * 6;
    }
    Sub.step(S, dt, ev);
    if (S.phase !== "sea") return finish(S, ev);
    Sh.step(S, dt, ev);
    Esc.step(S, dt, ev);
    W.step(S, dt, ev);
    if (S.phase !== "sea") return finish(S, ev);
    W.tdcStep(S, dt, ev, aids);
    const det = Det.step(S, dt, ev);
    E.traffic(S, dt);
    S.det = det;
    S.t += dt;
    /* the clock's cap for the next step */
    const cp = cap(S, det), was = Math.min(S.tcReq, S.tcCap);
    S.tcCap = cp.c; S.tcWhy = cp.why;
    if (cp.c < was && was > 0) ev.push({ t: "tcDropped", why: cp.why, to: C.TC[cp.c] });
    /* the patrol's calendar, and its endings */
    if (S.mode === "patrol") {
      if (S.patrol.due && S.t > S.patrol.due && !S.patrol.dueSaid) { S.patrol.dueSaid = true; ev.push({ t: "patrolDue" }); }
      if (S.t >= C.WAR_END && !S.patrol.warSaid) { S.patrol.warSaid = true; ev.push({ t: "warOver" }); }
      const s = S.sub;
      if (s.fuel <= 0 && s.bat <= 0.002 && !S.end) { S.phase = "over"; S.end = { why: "towed", t: S.t }; ev.push({ t: "towed" }); }
      const p = E.nearPort(S);
      if (p && !S.patrol.atPort) { S.patrol.atPort = p.id; ev.push({ t: "atPort", id: p.id, name: p.name }); }
      if (!p) S.patrol.atPort = null;
    } else if (S.mode === "action" || S.mode === "practice") {
      /* an action ends when every merchant is down, or the rest are away */
      const merch = S.ships.filter(q => q.role === "merchant");
      const alive = merch.filter(Sh.alive), sinking = merch.filter(q => q.sinking && !q.sunk);
      const awayAll = S.convoys.every(cv => !cv.spawned || S.ships.filter(q => q.conv === cv.id && Sh.alive(q)).every(q => PS.dist(q.x, q.y, S.sub.x, S.sub.y) > 30000));
      if ((alive.length === 0 && sinking.length === 0) || (awayAll && alive.length)) {
        S.phase = "over"; S.end = { why: alive.length ? "escaped" : "allSunk", t: S.t };
        ev.push({ t: "actionOver", why: S.end.why });
      }
    }
    return finish(S, ev);
  };
  function finish(S, ev) {
    for (const e of ev) {
      const line = LOG[e.t] && LOG[e.t](S, e);
      if (line) E.log(S, line, e.t);
    }
    return ev;
  }
  const nm = (S, id) => { const s = Sh.byId(S, id); return s ? `the ${C.SHIPS[s.cls].name.toLowerCase()} ${s.name}` : "a ship"; };
  const LOG = {
    shipSunk: (S, e) => e.role === "escort" ? `${C.SHIPS[e.cls].name} ${e.name} sunk.` : `${C.SHIPS[e.cls].name} ${e.name} sunk, ${PS.num(e.tons)} tons.`,
    torpHit: (S, e) => `Torpedo hit on ${nm(S, e.ship)}.`,
    torpDud: (S, e) => e.why === "unarmed" ? `A torpedo hit ${nm(S, e.ship)} before it armed.` : `A dud: it hit ${nm(S, e.ship)} and did not go off.`,
    torpPremature: () => "A torpedo went off early.",
    torpUnder: (S, e) => `A torpedo ran under ${nm(S, e.ship)}.`,
    shipExplodes: (S, e) => `${nm(S, e.id).replace(/^the/, "The")} blew up.`,
    escortContact: () => "An escort has us.",
    rammed: () => "Rammed.",
    planeAttack: () => "Aircraft attacking.",
    sysHit: (S, e) => `${(Sub.SYS.find(q => q[0] === e.sys) || [0, e.sys])[1]} damaged.`,
    repaired: (S, e) => e.sys === "hull" ? "The hull is patched." : `${(Sub.SYS.find(q => q[0] === e.sys) || [0, e.sys])[1]} repaired.`,
    weather: (S, e) => `The weather: ${C.WX[e.k].name.toLowerCase()}.`,
    patrolDue: () => "The patrol's time is up: head for a base.",
    warOver: () => "Word from command: the war is over.",
    subLost: (S, e) => e.why === "crushed" ? "The hull gave way." : e.why === "flooded" ? "She flooded." : "Lost.",
  };

  /* ---- the Konami code: everything put right, the torpedoes true, for this patrol or action ---- */
  E.konami = S => {
    if (!S || S.phase !== "sea") return false;
    const s = S.sub, k = C.SUBS[s.cls];
    S.konami = true; S.cheated = true;
    Sub.repairAll(s); s.bat = 1; s.fuel = 1;
    s.tubes.F = s.tubes.F.map(() => 0); s.tubes.A = s.tubes.A.map(() => 0);
    s.store.F = Math.max(s.store.F, Math.round((k.torps - k.tubesF - k.tubesA) * 0.62)); s.store.A = Math.max(s.store.A, k.torps - k.tubesF - k.tubesA - s.store.F);
    s.shells = k.shells;
    return true;
  };
  /* how an action went */
  E.rating = S => {
    const pct = S.potential ? S.stats.tons / S.potential : 0;
    return pct >= 0.9 ? "Superb" : pct >= 0.6 ? "Excellent" : pct >= 0.35 ? "Good" : pct > 0 ? "Fair" : "Poor";
  };
})();
