/* Puma Service -- the settings, a game left to come back to, the career,
 * the service record, and nothing else. Every key begins pumaservice_
 * (greykit.games STANDARD.md §5), so Settings can forget them by that
 * prefix and leave the rest of greykit.com alone (§2). */
"use strict";
(() => {
  const KEY_PREFS = "pumaservice_prefs_v1", KEY_GAME = "pumaservice_game_v1", KEY_CAREER = "pumaservice_career_v1", KEY_FAME = "pumaservice_fame_v1", KEY_NAME = "pumaservice_name_v1";
  PS.KEY_MUTED = "pumaservice_muted_v1";
  PS.KEY_LAST = "pumaservice_last_v1";

  /* ---- the aids: Classic is 1985, Field is a modern helping hand. None of them changes the war: the reality does that ---- */
  PS.AID_LIST = [
    ["solution", "Solution line", "Where the TDC says the target will be when a torpedo meets it, on the chart and in the periscope."],
    ["tracks", "Torpedo tracks", "Your torpedoes' runs, drawn on the chart."],
    ["labels", "Range labels", "Each ship's range beside it, through the periscope and on the chart."],
    ["autoRange", "Automatic range", "The periscope reads the range as it watches the target. Off, take a reading with R."],
    ["autoSlow", "Slow for news", "Time compression drops back to one when a ship is sighted, a plane is seen or a torpedo hits."],
    ["rings", "Danger rings", "How far the escorts could hear you, on the chart."],
    ["hints", "Key hints", "The keys for the station you are on, along the bottom."],
  ];
  PS.AIDS = { field: {}, classic: {} };
  for (const [k] of PS.AID_LIST) { PS.AIDS.field[k] = true; PS.AIDS.classic[k] = false; }

  const CALM = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  PS.calm = () => CALM.matches;
  PS.STEER = { classic: "Keys", modern: "Keys and mouse" };
  PS.SPEEDS = { classic: ["Normal", 50], relaxed: ["Relaxed", 40], brisk: ["Brisk", 60] };
  PS.prefs = Object.assign({ aids: "field", over: {}, steer: "classic", speed: "classic", scanlines: false, shake: !CALM.matches, learned: false, resume: true,
    real: Object.assign({}, PS.C.REAL_NONE, { zig: true, duds: true }) }, PS.store.get(KEY_PREFS, {}));
  if (!PS.AIDS[PS.prefs.aids]) PS.prefs.aids = "field";
  if (!PS.STEER[PS.prefs.steer]) PS.prefs.steer = "classic";
  PS.modern = () => PS.prefs.steer === "modern";
  PS.savePrefs = () => PS.store.set(KEY_PREFS, PS.prefs);
  PS.aid = name => { const o = PS.prefs.over[name]; return o === undefined ? !!PS.AIDS[PS.prefs.aids][name] : !!o; };
  PS.setAids = set => { PS.prefs.aids = set; PS.prefs.over = {}; PS.savePrefs(); };
  PS.setAid = (name, on) => { if (on === !!PS.AIDS[PS.prefs.aids][name]) delete PS.prefs.over[name]; else PS.prefs.over[name] = on; PS.savePrefs(); };
  PS.aidsLabel = () => (PS.prefs.aids === "field" ? "Field" : "Classic") + (Object.keys(PS.prefs.over).length ? ", adjusted" : "");

  /* ---- a game left in the middle: an action, a practice, or a patrol at sea ---- */
  PS.loadGame = () => { const g = PS.store.get(KEY_GAME, null); return g && g.S && g.S.v === 1 ? g : null; };
  PS.saveGame = S => PS.store.set(KEY_GAME, { S, at: Date.now() });
  PS.clearGame = () => PS.store.del(KEY_GAME);

  /* ---- the career in progress ---- */
  PS.loadCareer = () => { const c = PS.store.get(KEY_CAREER, null); return c && c.v === 1 ? c : null; };
  PS.saveCareer = c => PS.store.set(KEY_CAREER, c);
  PS.clearCareer = () => PS.store.del(KEY_CAREER);

  /* ---- the service record: careers ended (the war won, retired, or lost at sea), the best ten, and the best actions ---- */
  PS.fame = () => { const f = PS.store.get(KEY_FAME, null); return f && Array.isArray(f.careers) ? f : { careers: [], actions: {} }; };
  PS.addCareer = car => {
    const f = PS.fame(), e = { name: car.name, rank: car.rank, pts: car.pts, tons: car.tons, ships: car.ships, patrols: car.patrols.length, medals: car.medals.map(m => m.name), over: car.over, start: car.start, t: car.t, code: !!car.cheated, at: Date.now() };
    f.careers = f.careers.concat([e]).sort((a, b) => b.pts - a.pts).slice(0, 10);
    PS.store.set(KEY_FAME, f);
    return f.careers.indexOf(e);
  };
  PS.addAction = (id, rec) => {
    const f = PS.fame(), best = f.actions[id];
    if (!best || rec.pts > best.pts) { f.actions[id] = rec; PS.store.set(KEY_FAME, f); return true; }
    return false;
  };
  PS.lastName = () => PS.store.get(KEY_NAME, "");
  PS.setLastName = n => PS.store.set(KEY_NAME, n);

  /* ---- Forget everything (STANDARD.md §2): this game's keys, by prefix ---- */
  PS.forgetEverything = () => {
    for (const area of ["localStorage", "sessionStorage"]) {
      try {
        const s = globalThis[area];
        for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k && k.startsWith("pumaservice")) s.removeItem(k); }
      } catch (e) { /* no storage */ }
    }
    location.reload();
  };
})();
