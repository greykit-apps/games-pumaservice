/* Puma Service -- boot, title, the loop, and everything between.
 *
 * The greykit.games boot (the canon @gk-title block, STANDARD.md §3) while
 * the sea is charted and the first ships are traced, then the game's own
 * title: a convoy at dusk behind it, the name, the menu (§6's items and
 * keys, read by the block's own key lookup), the credit. Then an action, a
 * practice or a patrol. The engine runs at fifty steps a second (or forty,
 * or sixty: Settings), whatever the screen's rate; time compression makes
 * each step longer, never more of them. */
"use strict";
(() => {
  const E = PS.Engine, C = PS.C, K = PS.K, UI = PS.UI, R = PS.Render, HUD = PS.HUD, SFX = PS.SFX, I = PS.Input, Sub = PS.Sub, W = PS.Weapons, esc = PS.esc, $ = id => document.getElementById(id);
  const game = PS.game = { mode: "boot", S: null, car: null, demo: null, ui: { station: "scope", look: 0, bino: false, chartZoom: 2, chartAt: null, aids: {}, track: [] }, step: 20, acc: 0, last: 0, warned: {}, lastCustom: null };

  /* ---- sound on and off (STANDARD.md §8) ---- */
  const readMuted = () => { try { return globalThis.localStorage.getItem(PS.KEY_MUTED) === "1"; } catch (e) { return false; } };
  SFX.muted = readMuted();
  game.toggleMute = () => {
    SFX.unlock();
    SFX.setMuted(!SFX.muted);
    try { globalThis.localStorage.setItem("pumaservice_muted_v1", SFX.muted ? "1" : "0"); } catch (e) { /* no storage */ }
    syncSound();
    if (!SFX.muted) { SFX.play("menu"); if (game.mode === "title" && !SMALL.matches) SFX.startTune(); }
    if (game.mode === "play") HUD.toast(SFX.muted ? "Sound off" : "Sound on", "", 1200);
  };
  function syncSound() { const b = $("snd"); if (b) { b.setAttribute("aria-pressed", String(!SFX.muted)); b.classList.toggle("muted", SFX.muted); } }
  const SMALL = matchMedia("(max-width: 759px), (max-height: 479px)");
  game.applySpeed = () => { game.step = 1000 / (PS.SPEEDS[PS.prefs.speed] || PS.SPEEDS.classic)[1]; };
  game.applyLook = () => { $("stage").classList.toggle("scan", !!PS.prefs.scanlines); };
  game.syncAids = () => { for (const [k] of PS.AID_LIST) game.ui.aids[k] = PS.aid(k); };

  /* ---- the title ---- */
  function titleCfg() {
    const saved = PS.loadGame(), car = PS.loadCareer(), f = PS.fame(), fresh = !saved && !car && !f.careers.length && !Object.keys(f.actions).length;
    return {
      name: "Puma Service",
      primary: saved ? "resume" : fresh ? "practice" : "new",
      items: [
        saved && { act: "resume", label: "Resume game", key: "R", meta: saved.S.mode === "patrol" ? `Patrol ${saved.S.patrol.n}, ${C.dateStr(saved.S.t)}` : saved.S.scnName || "" },
        { act: "new", label: "New war patrol", key: "N", meta: car && !car.over ? `${car.rank} ${car.name}` : "" },
        { act: "action", label: "Convoy action", key: "C", meta: "" },
        { act: "practice", label: "Target practice", key: "T", meta: fresh ? "start here" : "" },
        { act: "record", label: "Service record", key: "O", meta: f.careers.length ? `${f.careers.length} career${f.careers.length > 1 ? "s" : ""}` : "" },
        "gap",
        { act: "settings", label: "Settings", key: "S" },
        { act: "help", label: "Help", key: "?" },
        { act: "about", label: "About", key: "A" },
      ],
    };
  }
  function titleHTML(cfg) {
    const items = cfg.items.filter(Boolean), gap = items.indexOf("gap");
    const main = items.slice(0, gap), util = items.slice(gap + 1);
    let i = 0;
    const btn = (it, big) => `<button data-act="${it.act}" class="pr${it.act === cfg.primary ? " dflt" : ""}" style="--i:${i++}"><kbd>${esc(it.key)}</kbd><span class="lbl">${esc(it.label)}</span>` +
      (big && it.meta ? `<span class="meta">${esc(it.meta)}</span>` : "") + "</button>";
    return `<div class="ps-title">
      <canvas class="ps-scene" aria-hidden="true"></canvas><div class="ps-shade" aria-hidden="true"></div>
      <main>
        <h1 class="ps-mark" aria-label="${esc(cfg.name)}"><span class="puma">Puma</span><span class="svc">Service</span></h1>
        <p class="ps-sub"><span>Wolf convoys ·</span> <span>one fleet boat ·</span> <span>five years of war</span></p>
        <nav class="ps-menu" aria-label="Main menu">${main.map(it => btn(it, true)).join("")}<div class="util">${util.map(it => btn(it, false)).join("")}</div></nav>
      </main>
      <footer class="ps-foot"><span class="gk-credit">${UI.CREDIT}</span></footer>
    </div>`;
  }
  function openTitle() {
    game.mode = "title";
    const el = $("title");
    el.innerHTML = titleHTML(titleCfg());
    el.hidden = false;
    $("game").hidden = true;
    document.body.classList.add("on-title");
    sizeScene();
    if (!game.demo) newDemo();
  }
  function sizeScene() {
    const cv = document.querySelector("#title .ps-scene");
    if (!cv) return;
    const k = Math.max(2, Math.round(innerHeight / 360));
    cv.width = Math.ceil(innerWidth / k); cv.height = Math.ceil(innerHeight / k);
  }
  /* a convoy at dusk, behind the menu; never saved */
  function newDemo() {
    game.demo = E.newAction("custom", { seed: 1 + Math.floor(Math.random() * 1e6), real: C.REAL_NONE, custom: { mi: 20, cls: "cougar", size: "medium", escorts: "light", time: "dusk", wx: "clear" } });
    /* the boat stands off, out of everyone's sight but inside the 30000 yards past which the action
     * ends with the convoy escaped (else a fresh demo every frame, and the ships jump); kept there */
    const D = game.demo, cv = D.convoys[0];
    D.t = Math.floor(D.t / C.DAY) * C.DAY + 17.75 * 3600;
    game.demoOff = [Math.cos(cv.base) * 20000, Math.sin(cv.base) * 20000];
    Object.assign(D.sub, { depth: 200, ordDepth: 200, bell: 1, spd: 0 });
    pinDemo();
  }
  function pinDemo() {
    const D = game.demo, cv = D.convoys[0];
    if (cv) { D.sub.x = cv.x + game.demoOff[0]; D.sub.y = cv.y + game.demoOff[1]; }
  }
  function revealTitle(print = true) {
    const t = document.querySelector("#title .ps-title");
    if (!t) return;
    if (print) t.classList.add("ps-print");
    const b = t.querySelector(".ps-menu .dflt") || t.querySelector(".ps-menu button");
    if (b) b.focus({ preventScroll: true });
  }
  game.refreshTitle = () => { if (game.mode !== "title") return; openTitle(); revealTitle(false); };
  game.toTitle = () => {
    UI.close(true);
    game.S = null;
    SFX.stopLoops();
    I.clear(); HUD.clear(); PS.FX.clear();
    openTitle(); revealTitle();
    if (!SMALL.matches) SFX.startTune();
  };
  async function titleAct(a) {
    SFX.unlock();
    if (a === "resume") return resume();
    if (a === "new") return UI.patrol();
    if (a === "action") return UI.actions();
    if (a === "practice") return UI.practice();
    if (a === "record") return UI.record();
    if (a === "settings") return UI.settings();
    if (a === "help") return UI.help();
    if (a === "about") return UI.about();
  }
  function titleKey(ev) {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "Enter" || k === " " || k === "Tab" || k === "Shift") return;
    const menu = document.querySelector("#title .ps-menu"), hit = menu && titleKeyButton(menu, k);
    if (hit) { ev.preventDefault(); titleAct(hit.dataset.act); return; }
    const row = (k === "ArrowLeft" || k === "ArrowRight") && document.activeElement && document.activeElement.closest(".ps-menu .util");
    if (row) {
      const bs = [...row.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
      ev.preventDefault(); bs[(i + (k === "ArrowRight" ? 1 : -1) + bs.length) % bs.length].focus(); return;
    }
    if (menu) titleArrow(menu, ev);
  }

  /* ---- a game ---- */
  const seed = () => 1 + Math.floor(Math.random() * 2 ** 30);
  game.startAction = (id, real, custom) => { PS.clearGame(); game.lastCustom = custom || null; startPlay(E.newAction(id, { seed: seed(), real, custom }), true); };
  game.startPractice = kind => { PS.clearGame(); startPlay(E.newPractice({ seed: seed(), real: PS.prefs.real, kind }), true); };
  game.startPatrol = (S, car) => { game.car = car; E.depart(S); startPlay(S, true); checkpoint(true); };
  function startPlay(S, fresh) {
    UI.close(true);
    game.S = S; game.mode = "play"; game.warned = {};
    if (S.mode === "patrol" && !game.car) game.car = PS.loadCareer();
    if (S.mode === "practice" && fresh) game.coach = null;
    SFX.stopTune();
    $("title").hidden = true; $("title").innerHTML = "";
    document.body.classList.remove("on-title");
    $("game").hidden = false;
    I.clear(); HUD.clear(); PS.FX.clear(); PS.Chart.reset();
    const u = game.ui;
    u.track = []; u.trackT = 0; u.chartAt = null; u.bino = false;
    u.station = Sub.surfaced(S.sub) ? (S.mode === "patrol" ? "chart" : "bridge") : "scope";
    u.look = S.sub.hdg; u.chartZoom = S.mode === "patrol" ? 5 : 2;
    game.syncAids(); fit();
    R.init($("screen"));
    game.acc = 0;
    if (fresh) {
      if (S.mode === "patrol") HUD.toast(`Underway: ${PS.Sea.ZONES.find(z => z.id === S.patrol.zone).name}`, "", 3600);
      else HUD.toast(S.scnName, "", 3200);
    } else HUD.toast("Back on station", "", 2000);
    hints();
  }
  function resume() {
    const g = PS.loadGame();
    if (!g) return;
    startPlay(g.S, false);
    game.pause();
  }
  game.pause = () => { if (game.mode !== "play" || UI.sheet) return; I.clear(); checkpoint(); UI.pause(); };
  game.unpause = () => { game.acc = 0; game.last = performance.now(); };
  game.leave = () => { checkpoint(true); game.toTitle(); };
  game.endAction = () => { const S = game.S; if (!S) return; S.phase = "over"; S.end = { why: "ended", t: S.t }; finish(); };
  function checkpoint(force) {
    const S = game.S;
    if (!S || game.mode !== "play" || S.phase === "over") return;
    if (S.mode === "patrol" || PS.prefs.resume || force) PS.saveGame(S);
  }
  function finish() {
    const S = game.S;
    SFX.stopLoops();
    PS.clearGame();
    game.mode = "over";
    HUD.end(null);
    if (S.mode === "patrol") {
      const car = game.car || PS.loadCareer();
      if (S.end.why === "towed") { const p = PS.Sea.portsOpen(C.monthOf(S.t)).reduce((a, b) => PS.dist(S.sub.x, S.sub.y, a.x, a.y) < PS.dist(S.sub.x, S.sub.y, b.x, b.y) ? a : b); const rep = E.enterPort(S, car, p, true); PS.saveCareer(car); UI.patrolReport(rep, car); return; }
      PS.Career.lost(car, S); PS.addCareer(car); PS.clearCareer();
      UI.lost(S, car);
    } else UI.actionOver(S);
  }
  function dock() {
    const S = game.S, p = S && E.canDock(S);
    if (!p) { const n = S && E.nearPort(S); HUD.toast(n ? "Surface, and slow below 9 knots, to tie up" : "No base in reach", "amber"); return; }
    const car = game.car || PS.loadCareer();
    const rep = E.enterPort(S, car, p);
    PS.saveCareer(car); PS.clearGame();
    SFX.stopLoops(); game.mode = "over";
    UI.patrolReport(rep, car);
  }

  /* ---- what happened this step: sounds, and the crew's word ---- */
  const toast = (t, tone, ms) => HUD.toast(t, tone, ms);
  const cls = id => { const s = PS.Ships.byId(game.S, id); return s ? C.SHIPS[s.cls].name.toLowerCase() : "ship"; };
  const brgW = b => PS.deg3(b);
  function slow() { if (game.ui.aids.autoSlow && game.S.tcReq > 0) game.S.tcReq = 0; }
  function events(S, evs) {
    R.events(S, evs);
    const s = S.sub;
    for (const e of evs) {
      switch (e.t) {
        case "ordered": if (e.what === "bell") SFX.play("bell"); break;
        case "diveAlarm": SFX.play(e.crash ? "crash" : "klaxon"); toast(e.crash ? "Crash dive!" : "Dive, dive", e.crash ? "amber" : "", 1600); break;
        case "surfaced": SFX.play("blow"); toast("Surfaced", "", 1400); if (game.ui.station === "scope") game.ui.station = "bridge"; break;
        case "submerged": if (game.ui.station === "bridge") game.ui.station = "scope"; break;
        case "atDepth": toast(e.d === C.PD ? "At periscope depth" : `Level at ${e.d} feet`, "", 1600); break;
        case "scopeUp": SFX.play("menu"); break;
        case "scopeBroken": toast("The periscope is out of action", "red"); break;
        case "tooDeep": toast(`Too deep for the periscope: ${C.PD} feet (P)`, "amber"); break;
        case "aground": toast("Aground!", "red", 2000); SFX.play("shellHit"); break;
        case "bottomHit": toast("She hit the bottom", "amber"); break;
        case "batLow": toast("Battery low", "amber", 3000); break;
        case "batFlat": toast("The battery is flat: surface to charge", "red", 3600); break;
        case "fuelLow": toast("Fuel low: time to head for a base", "amber", 3600); break;
        case "fuelOut": toast("Out of fuel", "red", 3600); break;
        case "flooding": SFX.play("warn"); toast("Flooding!", "red", 3000); break;
        case "creak": SFX.play("creak", 0.6 + Math.min(0.4, (s.depth - Sub.testDepth(s)) / 200)); if (!game.warned.deep) { game.warned.deep = true; toast("Below test depth: the hull is groaning", "red", 3000); } break;
        case "sighted": SFX.play("sighted"); toast(`${e.role === "escort" ? "Escort" : "Ship"} sighted, bearing ${brgW(e.brg)}: a ${C.SHIPS[e.cls].name.toLowerCase()}`, e.role === "escort" ? "amber" : "", 3000); slow(); break;
        case "radarContact": SFX.play("sighted"); toast(`Radar contact, bearing ${brgW(e.brg)}, ${PS.num(Math.round(e.rng / 100) * 100)} yards`, "", 3000); slow(); break;
        case "smoke": toast(`Smoke on the horizon, bearing ${brgW(e.brg)}`, "", 3200); slow(); break;
        case "screws": toast(`Screws on the hydrophones, bearing ${brgW(e.brg)}${e.fast ? ": fast, an escort" : ""}`, e.fast ? "amber" : "", 3000); slow(); break;
        case "locked": SFX.play("menu"); toast(`Target: the ${cls(e.id)} ${e.name}`, "", 1800); break;
        case "lostLock": toast("Lost the target", "amber"); break;
        case "noRange": toast("Nothing in sight to range on", "amber", 1600); break;
        case "ranged": toast(`Range ${PS.num(Math.round(e.rng / 50) * 50)} yards`, "", 1400); break;
        case "fired": SFX.play("launch"); toast(`Tube ${e.tube.slice(1)} ${e.tube[0] === "F" ? "forward" : "aft"}: fired${e.solved ? `, ${Math.round(e.run)} yards` : ", no solution"}`, "", 1800); break;
        case "cantFire": toast({ damaged: "Those tubes are damaged", deep: "Too deep to fire", none: "No tubes there", empty: (e.bank === "F" ? "Forward" : "After") + " tubes empty: F switches" }[e.why] || "Can't fire", "amber"); break;
        case "noSolution": break;
        case "reloaded": SFX.play("reloaded"); break;
        case "torpHit": SFX.play("hit"); toast(`Hit! The ${cls(e.ship)}`, "green", 2400); slow(); if (S.mode === "practice" && game.coach !== "done") { game.coach = "done"; toast("That's the attack. Escorts next: try a convoy action", "green", 4200); } break;
        case "torpDud": SFX.play("dud"); toast(e.why === "unarmed" ? "It hit before it armed" : "A dud: it hit, and did nothing", "amber", 2600); break;
        case "torpPremature": SFX.play("hit", 0.6); toast("A torpedo went off early", "amber", 2400); break;
        case "torpUnder": toast("It ran under her: too deep", "amber", 2400); break;
        case "torpMiss": toast("A miss: the torpedo ran out", "", 1600); break;
        case "torpHitUs": SFX.play("bigHit"); toast("Our own torpedo came round and hit us!", "red", 3600); break;
        case "wakeSeen": toast("They've seen a torpedo's wake", "amber", 2000); break;
        case "shipExplodes": SFX.play("bigHit"); toast("She blew up!", "green", 2600); break;
        case "shipSinking": SFX.play("breakup", 0.7); break;
        case "shipSunk": SFX.play("sunk"); toast(e.role === "escort" ? `${C.SHIPS[e.cls].name} ${e.name} sunk` : `${C.SHIPS[e.cls].name} ${e.name} sunk: ${PS.num(e.tons)} tons`, "green", 3200); break;
        case "convoyTurns": toast("The convoy is turning away", "", 2200); break;
        case "scatter": toast("The convoy is scattering!", "amber", 2400); break;
        case "spotted": if (S.t - (game.warned.spot || -1e9) > 120) { game.warned.spot = S.t; toast(e.how === "eye" ? "They've seen us" : e.how === "radar" ? "Their radar has us" : "They've heard us", "red", 2600); } break;
        case "escortContact": SFX.play(e.how === "sonar" ? "pingNear" : "warn"); if (S.t - (game.warned.contact || -1e9) > 60) { game.warned.contact = S.t; toast(e.how === "sonar" ? "Pinging: an escort has us on sonar" : "An escort has us", "red", 2600); } slow(); break;
        case "escortRun": toast("Escort turning toward, at speed!", "red", 2400); break;
        case "chargesAway": SFX.play("splashes", 0.7); toast("Depth charges!", "red", 2000); break;
        case "dcBoom": SFX.play(e.d < 160 ? "dcNear" : "dc", PS.clamp(1.4 - e.d / 900, 0.15, 1)); break;
        case "escortGivesUp": if (game.warned.contact && S.t - game.warned.contact < 3600 && !S.ships.some(q => q.role === "escort" && !q.sinking && ["alert", "search", "attack", "drop", "open", "guns", "hold"].includes(q.ai.st))) { game.warned.contact = 0; SFX.play("relief"); toast("The escorts have lost us", "green", 3200); } break;
        case "escortGun": SFX.play("gun", 0.5); break;
        case "shellNear": SFX.play("shellNear", 0.7); break;
        case "shellHit": SFX.play("shellHit"); toast("Hit by gunfire!", "red", 1800); break;
        case "rammed": SFX.play("bigHit"); toast("Rammed!", "red", 3000); break;
        case "hullHit": HUD.flash(); break;
        case "sysHit": toast(`${(Sub.SYS.find(q => q[0] === e.sys) || [0, e.sys])[1]} damaged`, "red", 2400); break;
        case "repaired": SFX.play("reloaded"); toast(e.sys === "hull" ? "The hull is patched" : `${(Sub.SYS.find(q => q[0] === e.sys) || [0, e.sys])[1]} repaired`, "green", 2000); break;
        case "plane": SFX.play("plane"); toast(`Aircraft, bearing ${brgW(e.brg)}! Dive!`, "red", 3200); slow(); break;
        case "planeAttack": break;
        case "bombs": SFX.play("bombs"); toast(s.depth > 50 ? "Bombs, close aboard" : "Bombs!", "red", 2200); break;
        case "gunManned": toast("Gun crew on deck", "", 1400); break;
        case "gunSecured": toast("Gun secured", "", 1400); break;
        case "gunFire": SFX.play("gun"); break;
        case "gunHit": SFX.play("shellHit", 0.7); toast("A hit", "green", 1000); break;
        case "gunSplash": SFX.play("splash", 0.5); break;
        case "gunNo": toast({ submerged: "Surface to man the gun", damaged: "The gun is damaged", manning: "The gun is not manned yet (G)", shells: "No shells left" }[e.why], "amber"); break;
        case "radar": toast(e.on ? "Radar on" : "Radar off", "", 1200); break;
        case "noRadar": toast("This boat has no radar yet", "amber"); break;
        case "silent": toast(e.on ? "Silent running: pumps stopped, a third speed" : "Silent running off", "", 1800); break;
        case "bank": toast(e.bank === "F" ? "Forward tubes" : "After tubes", "", 1000); break;
        case "spread": toast(e.n === 1 ? "Single shots" : `A spread of ${e.n}`, "", 1000); break;
        case "tcDropped": break;
        case "weather": toast(`The weather: ${C.WX[e.k].name.toLowerCase()}`, "", 2400); break;
        case "atPort": toast(`${e.name} in reach: surface, slow, and O to tie up`, "green", 3600); break;
        case "patrolDue": toast("The patrol's time is up: head for a base", "amber", 4000); break;
        case "warOver": toast("Word from command: the war is over. Come home.", "green", 5000); break;
        case "subLost": SFX.play("over"); HUD.end(e.why === "crushed" ? "The hull gave way" : "She is flooding", "Lost with all hands", "danger"); break;
        case "towed": toast("Out of fuel and battery: a tug is sent", "amber", 3000); break;
        case "actionOver": SFX.play(e.why === "allSunk" ? "won" : "over"); HUD.end(e.why === "allSunk" ? "The convoy is destroyed" : "The convoy got away", `${PS.num(S.stats.tons)} tons`, e.why === "allSunk" ? "ok" : ""); break;
      }
    }
  }
  /* the sounds that go on */
  function loops(S) {
    if (SFX.muted || !SFX.ctx) return;
    const s = S.sub, surf = Sub.surfaced(s), f = Math.abs(s.spd) / 20;
    SFX.loop("diesel", surf && s.fuel > 0 ? 0.4 + f : 0, f);
    SFX.loop("sea", surf ? 0.5 + S.wx.sea * 0.1 : 0, S.wx.sea / 6);
    SFX.loop("motor", !surf ? 0.3 + Math.abs(s.spd) / 9 : 0, Math.abs(s.spd) / 9);
    let sc = 0;
    if (!surf) for (const sh of S.ships) if (PS.Ships.alive(sh)) sc = Math.max(sc, 1 - PS.dist(s.x, s.y, sh.x, sh.y) / 9000);
    SFX.loop("screws", sc, sc);
  }
  /* the key strip, per station (a Field aid) */
  const SEP = ' <span class="sep"></span> ';
  function hints() {
    const S = game.S;
    if (!S || !game.ui.aids.hints) { HUD.hint(null); return; }
    const st = R.stationOf(S, game.ui), k = s => `<kbd>${s}</kbd>`;
    /* the first torpedo practice coaches the attack, step by step, whatever the aids */
    if (S.mode === "practice" && S.scn === "torpedo" && game.coach !== "done") {
      const c = !S.tdc.set ? `${k("T")} locks the ship nearest the crosshair` : !S.stats.fired ? `When the TDC lamp is green, ${k("Space")} fires${S.real.aob ? `${SEP}set its angle and speed with ${k("[")}${k("]")} ${k(",")}${k(".")}` : ""}` : !S.stats.hits ? `Watch it run: ${k("4")} the chart, ${k("2")} the periscope${SEP}${k("T")} again for the next ship` : null;
      if (c) { HUD.hint(c); return; }
      game.coach = "done";
    }
    const common = `${k("W")}${k("S")} speed ${SEP}${k("A")}${k("D")} helm`;
    const by = {
      scope: `${k("←")}${k("→")} train ${SEP}${k("↑")}${k("↓")} raise ${SEP}${k("T")} lock ${SEP}${k("Space")} fire ${SEP}${common}`,
      bridge: S.sub.gun.on ? `${k("←")}${k("→")} train the gun ${SEP}${k("↑")}${k("↓")} range ${SEP}${k("Space")} fire ${SEP}${k("G")} secure` : `${k("←")}${k("→")} look ${SEP}${k("↑")} glasses ${SEP}${k("T")} lock ${SEP}${k("Space")} fire ${SEP}${k("C")} crash dive`,
      panel: `${common} ${SEP}${k("Q")}${k("E")} depth ${SEP}${k("P")} periscope depth ${SEP}${k("U")} surface`,
      chart: `${k("Z")} zoom ${SEP}${common} ${SEP}${k("+")}${k("−")} time ${SEP}click a ship to lock`,
      damage: `${common} ${SEP}${k("X")} silent running ${SEP}${k("Esc")} pause`,
    };
    HUD.hint(by[st]);
  }
  game.setStation = st => {
    const S = game.S; if (!S) return;
    if (st === "bridge" && !Sub.surfaced(S.sub)) { HUD.toast("Surface for the bridge (U)", "amber", 1400); st = "scope"; }
    if (st === "log") { UI.log(S, () => game.unpause()); return; }
    if (st === "bridge" && game.ui.station !== "bridge") game.ui.look = S.sub.hdg;
    game.ui.station = st; SFX.play("menu"); hints();
  };
  /* lock the ship nearest the crosshair (or the next one, pressed again) */
  function lockNearest() {
    const S = game.S, L = R.last;
    let cands = [];
    if (L && L.view) cands = L.view.drawn.filter(d => PS.Detect.known(S, PS.Ships.byId(S, d.id)) && d.haze < 0.9).map(d => ({ id: d.id, v: Math.abs(d.x - L.cx) }));
    else cands = S.ships.filter(sh => PS.Detect.known(S, sh) && PS.Ships.alive(sh)).map(sh => ({ id: sh.id, v: PS.dist(S.sub.x, S.sub.y, sh.x, sh.y) }));
    cands.sort((a, b) => a.v - b.v);
    if (!cands.length) { HUD.toast("Nothing in sight to lock", "amber", 1400); return; }
    const i = cands.findIndex(c => c.id === S.tdc.tgt);
    const pick = i >= 0 && L && L.view && cands[i].v < 4 ? cands[(i + 1) % cands.length] : cands[0];
    if (pick.id === S.tdc.tgt && cands.length > 1) I.push({ a: "lock", id: cands[(i + 1) % cands.length].id });
    else I.push({ a: "lock", id: pick.id });
  }

  /* ---- the loop ---- */
  function step() {
    const S = game.S;
    const cmd = I.cmd(S, game.ui, game.step);
    const evs = E.tick(S, cmd, game.ui.aids);
    events(S, evs);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, now - game.last); game.last = now;
    if (game.mode === "title") { titleFrame(dt, now); return; }
    if (!game.S || (game.mode !== "play" && game.mode !== "over")) return;
    const S = game.S;
    if (game.mode === "play") {
      const fresh = I.pollPad();
      if (!UI.sheet) for (const a of fresh) { konamiStep("pad", a); padAct(a); }
      if (!UI.sheet && S.phase === "sea") {
        game.acc += dt;
        let n = 0;
        while (game.acc >= game.step && n++ < 6) { game.acc -= game.step; step(); if (S.phase !== "sea") break; }
        if (n >= 6) game.acc = 0;
        PS.ShipArt.budget = 2;
      }
      if (S.phase === "over" && game.mode === "play") { game.mode = "over"; setTimeout(finish, S.end && (S.end.why === "crushed" || S.end.why === "flooded" || S.end.why === "allSunk" || S.end.why === "escaped") ? 2600 : 50); }
      loops(S);
    }
    R.draw(S, game.ui, now, dt / 1000);
    HUD.draw(S, game.ui);
    if (game.mode === "play" && (now - (game.hintAt || 0)) > 500) { game.hintAt = now; hints(); }
  }
  let titleAcc = 0;
  function titleFrame(dt, now) {
    const cv = document.querySelector("#title .ps-scene");
    if (!cv || UI.sheet && UI.sheet.el.classList.contains("full")) return;
    const D = game.demo;
    titleAcc += dt;
    let n = 0;
    while (titleAcc >= 20 && n++ < 3) { titleAcc -= 20; E.tick(D, { acts: [{ a: "tc", v: 0 }] }); pinDemo(); }
    if (n >= 3) titleAcc = 0;
    PS.ShipArt.budget = 3;
    if (D.phase !== "sea") newDemo();
    R.title(cv, D, now);
  }

  /* ---- the Konami code: up up down down left right left right B A ---- */
  const KONAMI = { keys: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"],
    pad: ["shallower", "shallower", "deeper", "deeper", "bank", "gun", "bank", "gun", "scope", "fire"] };
  const konamiAt = { keys: 0, pad: 0 };
  function konamiStep(src, x) {
    const seq = KONAMI[src], i = konamiAt[src];
    konamiAt[src] = x === seq[i] ? i + 1 : x === seq[0] ? (i === 2 ? 2 : 1) : 0;
    if (konamiAt[src] < seq.length) return;
    konamiAt.keys = konamiAt.pad = 0;
    if (!game.S || !E.konami(game.S)) return;
    SFX.play("won");
    toast("Konami code: tubes loaded, repairs done, and the torpedoes run true", "green", 4000);
  }

  /* ---- the orders the keys give ---- */
  function act(a, ev) {
    const S = game.S, s = S.sub, u = game.ui, st = R.stationOf(S, u), shift = ev && ev.shiftKey;
    const helmSt = st === "chart" || st === "panel" || st === "damage";
    switch (a) {
      case "tU": I.push({ a: "bell", d: 1 }); break;
      case "tD": I.push({ a: "bell", d: -1 }); break;
      case "hL": case "hR": if (!ev || !ev.repeat) I.tapHelm(a === "hL" ? -1 : 1); break;
      case "aL": case "aR": if (helmSt && (!ev || !ev.repeat)) I.tapHelm(a === "aL" ? -1 : 1); break;
      case "aU": case "aD":
        if (helmSt) I.push({ a: "bell", d: a === "aU" ? 1 : -1 });
        else if (st === "scope") I.push({ a: "scope", v: a === "aU" });
        else if (st === "bridge") { if (s.gun.on) I.push({ a: "gunRange", d: (a === "aU" ? 1 : -1) * (shift ? 500 : 100) }); else { u.bino = a === "aU"; } }
        break;
      case "shallower": I.push({ a: "depth", d: -1 }); break;
      case "deeper": I.push({ a: "depth", d: 1 }); break;
      case "surface": I.push({ a: "surface" }); break;
      case "pd": I.push({ a: "pd" }); break;
      case "crash": I.push({ a: "crash" }); break;
      case "zoom": if (st === "chart") { u.chartZoom = (u.chartZoom + (shift ? PS.Chart.ZOOMS.length - 1 : 1)) % PS.Chart.ZOOMS.length; u.chartAt = null; SFX.play("menu"); } else if (st === "bridge") u.bino = !u.bino; else I.push({ a: "zoom" }); break;
      case "lock": lockNearest(); break;
      case "range": I.push({ a: "stadimeter" }); break;
      case "aobL": case "aobR": I.push({ a: "dial", what: "aob", d: (a === "aobR" ? 1 : -1) * (shift ? 1 : 5) * PS.DEG }); break;
      case "spdD": case "spdU": I.push({ a: "dial", what: "spd", d: (a === "spdU" ? 1 : -1) * (shift ? 0.5 : 1) }); break;
      case "fire": if (st === "bridge" && s.gun.on) I.push({ a: "gunFire" }); else I.push({ a: "fire" }); break;
      case "bank": I.push({ a: "bank" }); break;
      case "spread": I.push({ a: "spread" }); break;
      case "gun": if (st !== "bridge" && Sub.surfaced(s)) game.setStation("bridge"); I.push({ a: "gun" }); break;
      case "silent": I.push({ a: "silent" }); break;
      case "radar": I.push({ a: "radar" }); break;
      case "tcU": I.push({ a: "tc", d: 1 }); break;
      case "tcD": I.push({ a: "tc", d: -1 }); break;
      case "tc1": I.push({ a: "tc", v: 0 }); break;
      case "st1": game.setStation("bridge"); break;
      case "st2": game.setStation("scope"); break;
      case "st3": game.setStation("panel"); break;
      case "st4": game.setStation("chart"); break;
      case "st5": game.setStation("damage"); break;
      case "st6": game.setStation("log"); break;
      case "stNext": case "stPrev": { const L = HUD.STATIONS.map(q => q[0]).filter(k => k !== "bridge" || Sub.surfaced(s)), i = L.indexOf(st); game.setStation(L[(i + (a === "stPrev" ? L.length - 1 : 1)) % L.length]); break; }
      case "pause": game.pause(); break;
      case "aids": PS.setAids(PS.prefs.aids === "field" ? "classic" : "field"); game.syncAids(); HUD.toast(PS.prefs.aids === "field" ? "Field aids" : "Classic", "", 1400); hints(); break;
      case "dock": if (S.mode === "patrol") dock(); break;
      case "scope": I.push({ a: "scope" }); break;
    }
  }
  function padAct(a) { if (a === "scope" && R.stationOf(game.S, game.ui) !== "scope") return; act(a, null); }

  /* ---- keys ---- */
  document.addEventListener("keydown", ev => {
    SFX.unlock();
    if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune();
    if (ev.key === "Shift") I.held.add("shift");
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (UI.sheet) { UI.key(ev); return; }
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "m" && !(ev.target.closest && ev.target.closest("input"))) { ev.preventDefault(); game.toggleMute(); return; }
    if (game.mode === "title") { titleKey(ev); return; }
    if (game.mode !== "play") return;
    let a = I.actionFor(ev.code);
    if (!a && (ev.key === "+" || ev.key === "=")) a = "tcU";
    if (!a && ev.key === "?") { UI.help(3, () => game.unpause()); return; }
    if (ev.code === "F5" || ev.code === "F12") return;
    if (a || /^F\d+$/.test(ev.code)) ev.preventDefault();
    if (!ev.repeat) konamiStep("keys", ev.code);
    if (!a) return;
    I.down(ev, a);
    const rep = ["tU", "tD", "shallower", "deeper", "aobL", "aobR", "spdD", "spdU", "tcU", "tcD", "aU", "aD"];
    if (ev.repeat && !rep.includes(a)) return;
    act(a, ev);
  });
  document.addEventListener("keyup", ev => { if (ev.key === "Shift") I.held.delete("shift"); I.up(ev); });
  addEventListener("blur", () => { I.clear(); if (game.mode === "play") game.pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { checkpoint(); if (game.mode === "play") game.pause(); } });
  addEventListener("pagehide", () => checkpoint());
  document.addEventListener("pointerdown", () => { SFX.unlock(); if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune(); }, true);
  document.addEventListener("pointerover", ev => {
    if (ev.pointerType !== "mouse") return;
    const b = ev.target.closest && ev.target.closest("button:not(:disabled), summary");
    if (!b || b === document.activeElement || !b.closest(".ps-sheet, #title") || b.closest(".sh-head")) return;
    const a = document.activeElement;
    if (a && a.matches("input")) return;
    if (document.querySelector(".ps-ask")) return;
    b.focus({ preventScroll: true });
  });
  $("title").addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b) titleAct(b.dataset.act); });
  $("snd").addEventListener("click", () => game.toggleMute());
  $("pausebtn").addEventListener("click", () => game.pause());
  $("screen").addEventListener("contextmenu", ev => ev.preventDefault());
  /* the chart: a click on a ship locks it; in Modern, a click on the sea steers for it */
  $("screen").addEventListener("click", ev => {
    const S = game.S; if (!S || game.mode !== "play" || UI.sheet) return;
    const cv = $("screen"), r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * cv.width, py = (ev.clientY - r.top) / r.height * cv.height;
    const st = R.stationOf(S, game.ui);
    if (st === "chart") {
      const p = PS.Chart.toSea(S, game.ui, px, py, cv.width, cv.height), z = PS.Chart.ZOOMS[game.ui.chartZoom];
      const hit = S.ships.filter(sh => PS.Detect.known(S, sh) && PS.Ships.alive(sh)).map(sh => ({ sh, d: PS.dist(sh.x, sh.y, p.x, p.y) })).sort((a, b) => a.d - b.d)[0];
      if (hit && hit.d < 10 * z) { I.push({ a: "lock", id: hit.sh.id }); return; }
      if (PS.modern()) I.push({ a: "hdg", v: PS.angTo(S.sub.x, S.sub.y, p.x, p.y) });
    } else if ((st === "scope" || st === "bridge") && R.last && R.last.view) {
      const d = R.last.view.drawn.filter(q => PS.Detect.known(S, PS.Ships.byId(S, q.id))).sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
      if (d && Math.abs(d.x - px) < Math.max(12, d.px * 0.6)) I.push({ a: "lock", id: d.id });
    }
  });
  /* Modern: drag through the periscope to train it */
  let drag = null;
  $("screen").addEventListener("pointerdown", ev => { if (PS.modern() && game.S && R.stationOf(game.S, game.ui) === "scope") drag = ev.clientX; });
  addEventListener("pointerup", () => { drag = null; });
  addEventListener("pointermove", ev => { if (drag === null || !game.S) return; const cv = $("screen"), r = cv.getBoundingClientRect(), dx = (ev.clientX - drag) / r.width * cv.width; drag = ev.clientX; I.push({ a: "train", d: -dx / (cv.height * 0.44) * (game.S.sub.scope.hi ? 4 : 16) * PS.DEG }); });

  /* ---- the stage: the whole window, about 360 pixels high, square pixels ---- */
  const scaleK = () => { const kk = innerHeight / 360; return kk >= 1.5 ? Math.round(kk) : Math.max(1, kk); };
  function fit() {
    const k = scaleK();
    K.VW = Math.ceil(innerWidth / k); K.VH = Math.ceil(innerHeight / k);
    const cv = $("screen");
    cv.width = K.VW; cv.height = K.VH;
    const st = $("stage");
    st.style.width = K.VW * k + "px"; st.style.height = K.VH * k + "px";
    if (R.g) R.init(cv);
    PS.Chart.reset();
  }
  addEventListener("resize", () => { fit(); sizeScene(); });

  /* ---- boot ---- */
  function boot() {
    game.applySpeed(); game.applyLook(); game.syncAids(); syncSound();
    injectTitleCSS();     /* the boot's; the title and the sheets are css/pumaservice.css */
    fit();
    const q = new URLSearchParams(location.search);
    const run = SMALL.matches || q.has("play") ? { finish: async () => {}, cancel() {} } : runBoot({ lines: [bootReloadLine(), "flooding tubes one through six"] });
    /* the boot is on screen: now the slow part, charting the sea and tracing the first ships */
    setTimeout(() => {
      PS.Sea.build();
      R.init($("screen"));
      HUD.build();
      for (const cls of ["freighter", "destroyer", "liner"]) for (const b of [4, 8, 12]) PS.ShipArt.sprite(cls, b, 46, "dusk");
      if (q.has("play")) {
        /* debug: ?play=<action id>|practice|gun&seed=<n>&station=<scope|bridge|panel|chart|damage>&hour=<h>&wx=<k>&pause=1 */
        const p = q.get("play"), sd = +(q.get("seed") || 1);
        const S = p === "practice" || p === "gun" ? E.newPractice({ seed: sd, real: PS.prefs.real, kind: p === "gun" ? "gun" : "torpedo" }) : E.newAction(E.ACTIONS.some(a => a.id === p) ? p : "lone", { seed: sd, real: PS.prefs.real });
        if (q.has("hour")) S.t = Math.floor(S.t / C.DAY) * C.DAY + (+q.get("hour")) * 3600;
        if (q.has("wx")) E.setWx(S, q.get("wx"));
        /* &near=<yd>: the boat abeam the biggest merchant at that range; &depth=<ft>: at that depth, the periscope up; &aim=1 the scope or glasses on it; &hi=1 high power; &bino=1 the glasses */
        const big = S.ships.filter(sh => sh.role === "merchant").sort((a, b) => C.SHIPS[b.cls].tons - C.SHIPS[a.cls].tons)[0];
        if (q.has("near") && big) { const r = +q.get("near"); Object.assign(S.sub, { x: big.x + Math.cos(big.hdg) * r + PS.hx(big.hdg) * r * 0.6, y: big.y + Math.sin(big.hdg) * r + PS.hy(big.hdg) * r * 0.6 }); }
        if (q.has("depth")) { const d = +q.get("depth"); Object.assign(S.sub, { depth: d, ordDepth: d }); if (d <= C.PD) Object.assign(S.sub.scope, { up: true, h: 1 }); }
        if (q.has("hi")) S.sub.scope.hi = true;
        startPlay(S, true);
        if (q.has("station")) game.ui.station = q.get("station");
        if (q.has("aim") && big) { const b = PS.angTo(S.sub.x, S.sub.y, big.x, big.y); S.sub.scope.brg = PS.angDiff(S.sub.hdg, b); game.ui.look = b; }
        if (q.has("bino")) game.ui.bino = true;
        if (q.has("still")) S.tcReq = 0;
        if (q.has("pause")) game.pause();
      } else {
        openTitle();
        const saved = PS.loadGame(), car = PS.loadCareer();
        run.finish(["the convoy is sighted", saved ? "a game in progress" : car && !car.over ? `${car.rank} ${car.name} in command` : "tubes loaded"]).then(() => {
          revealTitle(!q.has("shot"));
          const sheet = q.get("sheet");
          if (sheet && UI[sheet]) UI[sheet]();
        });
      }
      game.last = performance.now();
      requestAnimationFrame(frame);
    }, 60);
  }
  boot();
})();
