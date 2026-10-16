/* Puma Service -- the HUD: flat dark panels over the station.
 *
 * Across the top, the stations and their keys. Top right, the clock and the
 * date, and the time compression (amber, with the reason, when the
 * situation is holding it back). Bottom left, the boat: depth and the
 * ordered depth, speed and the telegraph, course and the ordered course,
 * the battery, the fuel, every tube's lamp, and what she is doing (silent
 * running, radar, the gun). Bottom right, the TDC: the target, its range,
 * angle on the bow and speed as the computer has them, and the solution
 * lamp. Bottom centre, the crew's reports, over the key strip. Nothing here
 * is told by colour alone. Written to the page only when it has changed. */
"use strict";
(() => {
  const C = PS.C, Sub = PS.Sub, W = PS.Weapons, Sea = PS.Sea, esc = PS.esc;
  const HUD = PS.HUD = { el: null, toasts: [], last: {}, built: false };
  const $ = id => document.getElementById(id);
  const set = (el, k, v, f) => { if (HUD.last[k] !== v) { HUD.last[k] = v; f(el, v); } };
  HUD.STATIONS = [["bridge", "Bridge", "1"], ["scope", "Periscope", "2"], ["panel", "Instruments", "3"], ["chart", "Chart", "4"], ["damage", "Damage", "5"]];
  const WHY = { ships: "ships near", contact: "contact", close: "close", torps: "torpedoes running", plane: "aircraft", hunted: "hunted", charges: "charges", danger: "danger" };

  HUD.build = () => {
    const el = HUD.el = $("hud");
    el.innerHTML = `
      <nav class="hp" id="h-tabs" aria-label="Stations">${HUD.STATIONS.map(([k, n, key]) => `<button data-st="${k}"><kbd>${key}</kbd>${n}</button>`).join("")}</nav>
      <div class="hp" id="h-clock"><div class="hc-time num">0000</div><div class="hc-date"></div><div class="hc-tc"><span class="why"></span><span class="lbl">Time</span> <b>1x</b></div></div>
      <div class="hp" id="h-boat">
        <div class="hb-row" data-r="depth"><span class="lbl">Depth</span><b class="v">0 ft</b><span class="ord"></span></div>
        <div class="hb-row" data-r="speed"><span class="lbl">Speed</span><b class="v">0 kn</b><span class="ord"></span></div>
        <div class="hb-row" data-r="course"><span class="lbl">Course</span><b class="v">000</b><span class="ord"></span></div>
        <div class="hb-row" data-r="bat"><span class="lbl">Battery</span><span class="hb-bar" data-bar="bat">${"<i></i>".repeat(10)}</span><span class="num pc"></span></div>
        <div class="hb-row" data-r="fuel"><span class="lbl">Fuel</span><span class="hb-bar" data-bar="fuel">${"<i></i>".repeat(10)}</span><span class="num pc"></span></div>
        <div class="hb-row" data-r="tubes"><span class="lbl">Tubes</span><span class="hb-tubes"></span><span class="num st"></span></div>
        <div class="hb-flags"></div>
      </div>
      <div class="hp" id="h-tdc"></div>
      <div class="hp" id="h-port" hidden></div>
      <div class="h-low"><div class="h-toasts"></div><div class="hp h-hint" hidden></div></div>
      <div class="hp h-end" hidden></div>
      <div class="h-flash"></div>`;
    el.querySelector("#h-tabs").addEventListener("click", ev => { const b = ev.target.closest("[data-st]"); if (b && PS.game.setStation) PS.game.setStation(b.dataset.st); });
    HUD.last = {};
    HUD.built = true;
  };

  HUD.toast = (text, tone = "", ms = 2800) => {
    const box = HUD.el && HUD.el.querySelector(".h-toasts");
    if (!box) return;
    if (HUD.toasts.some(t => t.text === text && t.until > performance.now())) return;
    const d = document.createElement("div");
    d.className = "hp h-toast " + tone; d.textContent = text;
    box.appendChild(d);
    HUD.toasts.push({ text, d, until: performance.now() + ms });
    while (HUD.toasts.length > 2) HUD.toasts.shift().d.remove();
    const live = $(tone === "red" ? "alert" : "live"); if (live) live.textContent = text;
  };
  HUD.flash = () => { const f = HUD.el && HUD.el.querySelector(".h-flash"); if (!f) return; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); };
  HUD.hint = html => { const h = HUD.el.querySelector(".h-hint"); if (!html) { h.hidden = true; HUD.hintNow = ""; return; } if (HUD.hintNow !== html) { HUD.hintNow = html; h.innerHTML = html; } h.hidden = false; };
  HUD.end = (title, sub, tone) => { const e = HUD.el.querySelector(".h-end"); if (!title) { e.hidden = true; return; } e.dataset.tone = tone; e.innerHTML = `<b>${esc(title)}</b><span>${esc(sub || "")}</span>`; e.hidden = false; };
  HUD.clear = () => { HUD.toasts.forEach(t => t.d.remove()); HUD.toasts = []; if (HUD.el) { HUD.end(null); HUD.hint(null); } HUD.last = {}; };

  /* the part of the play screen no panel covers, in the canvas's pixels: the stations lay out inside it */
  function safe() {
    const cv = $("screen"), k = cv.getBoundingClientRect().width / cv.width || 1, R = PS.Render;
    const tabs = HUD.el.querySelector("#h-tabs").getBoundingClientRect(), hint = HUD.el.querySelector(".h-hint");
    const top = Math.ceil(tabs.bottom / k) + 2;
    let bot = 10;
    if (hint && !hint.hidden) { const r = hint.getBoundingClientRect(); if (r.height) bot = Math.ceil((innerHeight - r.top) / k) + 2; }
    R.safe = { t: top, b: bot };
  }
  /* what the station shows, in words, for a screen reader */
  function describe(S, ui, st) {
    const s = S.sub, n = S.ships.filter(q => PS.Detect.known(S, q) && PS.Ships.alive(q)).length;
    const what = { scope: `Periscope, ${s.scope.up && s.scope.h >= 1 ? "up, bearing " + PS.deg3(s.hdg + s.scope.brg) + (s.scope.hi ? ", high power" : ", low power") : "down"}`, bridge: `Bridge, looking ${PS.deg3(ui.look)}`,
      panel: "Instruments", chart: "Chart", damage: `Damage report: hull ${Math.round(s.hull * 100)}%, ${Sub.SYS.filter(([k2]) => s.sys[k2] > 0.001).map(([, nm]) => nm.toLowerCase()).join(", ") || "nothing damaged"}` }[st] || st;
    const t = `${what}. ${n ? n + " ship" + (n > 1 ? "s" : "") + " in sight." : "No ships in sight."}`;
    if (HUD.desc !== t) { HUD.desc = t; $("screen").setAttribute("aria-label", "Puma Service: " + t); }
  }

  /* ---- every frame ---- */
  HUD.draw = (S, ui) => {
    if (!HUD.built) HUD.build();
    const el = HUD.el, s = S.sub, now = performance.now();
    HUD.toasts = HUD.toasts.filter(t => { if (t.until > now) return true; t.d.remove(); return false; });
    const st = PS.Render.stationOf(S, ui);
    set(el, "onPanel", st === "panel" || st === "damage", (e, v) => { e.querySelector("#h-boat").hidden = v; e.querySelector("#h-tdc").hidden = v; });
    if (now - (HUD.safeAt || 0) > 250) { HUD.safeAt = now; safe(); describe(S, ui, st); }
    set(el.querySelector("#h-tabs"), "tabs", st + ":" + Sub.surfaced(s), e => { for (const b of e.querySelectorAll("button")) { const off = b.dataset.st === "bridge" && !Sub.surfaced(s); b.setAttribute("aria-current", String(b.dataset.st === st)); b.classList.toggle("off", off); if (off) b.setAttribute("aria-disabled", "true"); else b.removeAttribute("aria-disabled"); } });
    set(el.querySelector(".hc-time"), "time", C.timeStr(S.t), (e, v) => { e.textContent = v; });
    set(el.querySelector(".hc-date"), "date", C.dateStr(S.t) + (S.wx ? " · " + C.WX[S.wx.k].name : ""), (e, v) => { e.textContent = v; });
    const tcReq = C.TC[S.tcReq], tcNow = PS.Engine.tcNow(S), held = tcNow < tcReq;
    set(el.querySelector(".hc-tc"), "tc", `${tcNow}:${tcReq}:${held ? S.det && S.tcCap : ""}`, e => { e.classList.toggle("held", held); e.querySelector("b").textContent = tcNow + "x"; e.querySelector(".why").textContent = held ? `held: ${tcReq}x` : ""; });
    /* the boat */
    const row = r => el.querySelector(`[data-r="${r}"]`);
    const test = Sub.testDepth(s);
    set(row("depth"), "depth", `${Math.round(s.depth)}:${s.ordDepth}:${s.depth > test ? 2 : s.depth > test * 0.85 ? 1 : 0}`, e => {
      e.querySelector(".v").textContent = Sub.surfaced(s) ? "Surfaced" : Math.round(s.depth) + " ft";
      e.querySelector(".ord").textContent = Math.abs(s.ordDepth - s.depth) > 3 ? (s.ordDepth === 0 ? "surface" : s.ordDepth + " ft") : "";
      e.className = "hb-row" + (s.depth > test ? " crit" : s.depth > test * 0.85 ? " warn" : "");
    });
    set(row("speed"), "speed", `${s.spd.toFixed(1)}:${s.bell}:${s.silent}`, e => { e.querySelector(".v").textContent = s.spd.toFixed(1) + " kn"; e.querySelector(".ord").textContent = s.silent ? C.BELLS[s.bell] + ", silent" : C.BELLS[s.bell]; });
    set(row("course"), "course", `${PS.deg3(s.hdg)}:${PS.deg3(s.ordHdg)}`, e => { e.querySelector(".v").textContent = PS.deg3(s.hdg); e.querySelector(".ord").textContent = Math.abs(PS.angDiff(s.hdg, s.ordHdg)) > 0.02 ? PS.deg3(s.ordHdg) : ""; });
    const bar = (r, v, cap) => set(row(r), r, Math.round(v * 100) + ":" + Math.round(cap * 10), e => {
      const n = Math.ceil(v * 10), b = e.querySelector(".hb-bar");
      b.className = "hb-bar" + (v < 0.12 ? " crit" : v < 0.3 ? " warn" : "");
      [...b.children].forEach((i, k) => i.classList.toggle("on", k < n));
      e.querySelector(".pc").textContent = Math.round(v * 100) + "%";
    });
    bar("bat", s.bat, Sub.batCap(s)); bar("fuel", s.fuel, 1);
    const tubesKey = s.tubes.F.map(v => v > 0 ? Math.ceil(v / 60) : v).join(",") + "|" + s.tubes.A.map(v => v > 0 ? Math.ceil(v / 60) : v).join(",") + "|" + s.bank + s.store.F + "." + s.store.A + s.spread;
    set(row("tubes"), "tubes", tubesKey, e => {
      const lamp = v => `<i class="${v === 0 ? "on" : v > 0 ? "load" : "out"}"${v > 0 ? ` style="--p:${Math.round((1 - v / C.TORP.reload) * 100)}%"` : ""}></i>`;
      e.querySelector(".hb-tubes").innerHTML = `<span class="bk${s.bank === "F" ? " sel" : ""}">F</span>${s.tubes.F.map(lamp).join("")}<span class="gap"></span><span class="bk${s.bank === "A" ? " sel" : ""}">A</span>${s.tubes.A.map(lamp).join("")}`;
      e.querySelector(".st").textContent = `+${s.store.F + s.store.A}`;
      e.querySelector(".hb-tubes").setAttribute("aria-label", `${Sub.loaded(s, "F")} forward and ${Sub.loaded(s, "A")} after tubes loaded, ${s.store.F + s.store.A} reloads`);
    });
    const hunted = S.ships.some(q => q.role === "escort" && !q.sinking && q.ai.contact && S.t - q.ai.contact < 60);
    const flags = (hunted ? ['<span class="hunt">Hunted</span>'] : []).concat([[s.silent, "Silent"], [Sub.radarWorks(s), "Radar"], [s.gun.on, "Gun"], [s.scope.up, "Scope up"], [S.konami, "Code"]].filter(f => f[0]).map(f => `<span class="on">${f[1]}</span>`))
      .concat(s.water > 0.2 ? ['<span class="bad">Flooding</span>'] : []).concat(s.bottomed ? ['<span class="on">On the bottom</span>'] : []).concat(s.spread > 1 ? [`<span>Spread ${s.spread}</span>`] : []);
    set(el.querySelector(".hb-flags"), "flags", flags.join(""), (e, v) => { e.innerHTML = v; });
    /* the TDC */
    const e = W.est(S), t = S.tdc.tgt !== null ? PS.Ships.byId(S, S.tdc.tgt) : null;
    let tdc = "";
    if (e) {
      const sol = W.solve(S, e, s.bank), ok = sol && sol.ok;
      tdc = `<div class="ht-name">${t ? esc(t.name) : "Last known"}</div><div class="ht-cls">${t ? esc(C.SHIPS[t.cls].name) + (PS.Detect.known(S, t) ? "" : ", not in sight") : "the target is lost"}</div>
        <div class="ht-grid"><span class="lbl">Bearing</span><b>${PS.deg3(e.brg)}</b><span class="lbl">Range</span><b>${PS.num(Math.round(e.rng / 10) * 10)}</b>
        <span class="lbl">Angle on bow</span><b class="${S.real.aob ? "set" : ""}">${e.aob >= 0 ? "S" : "P"} ${Math.round(Math.abs(e.aob) / PS.DEG)}</b><span class="lbl">Speed</span><b class="${S.real.aob ? "set" : ""}">${e.s.toFixed(1)}</b>
        <span class="lbl">Gyro</span><b>${sol && isFinite(sol.gyro) ? (sol.gyro >= 0 ? "R " : "L ") + Math.round(Math.abs(sol.gyro) / PS.DEG) : "--"}</b><span class="lbl">Run</span><b>${ok ? PS.num(Math.round(sol.run / 10) * 10) : "--"}</b></div>
        ${S.real.aob ? `<p class="ht-eye">Angle on bow and speed are yours to set: <kbd>[</kbd> <kbd>]</kbd> <kbd>,</kbd> <kbd>.</kbd></p>` : ""}<div class="ht-sol ${ok ? "ok" : "no"}"><span class="ht-lamp"></span><span>${ok ? "Solution: fire " + (s.bank === "F" ? "forward" : "aft") : sol ? { gyro: "No solution: turn toward it", range: "No solution: out of range", speed: "No solution" }[sol.why] || "No solution" : "No solution"}</span></div>`;
    } else tdc = `<div class="ht-name">TDC</div><p class="ht-none">No target. <kbd>T</kbd> locks the ship nearest the crosshair.</p>`;
    set(el.querySelector("#h-tdc"), "tdc", tdc, (x, v) => { x.innerHTML = v; });
    /* a base in reach */
    const p = S.mode === "patrol" ? PS.Engine.nearPort(S) : null;
    set(el.querySelector("#h-port"), "port", p ? p.id + PS.Engine.canDock(S) : "", (x) => { x.hidden = !p; if (p) x.innerHTML = PS.Engine.canDock(S) ? `${esc(p.name)} <kbd>O</kbd> tie up` : `${esc(p.name)}: on the surface, under 9 knots, to tie up`; });
  };
})();
