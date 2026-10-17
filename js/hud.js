/* Puma Service -- the HUD: flat dark panels over the station.
 *
 * Across the top, the stations and their keys. Top right, the clock and the
 * date, and the time compression (amber, with the reason, when the
 * situation is holding it back). Bottom left on every station, the TDC, a
 * live readout of the computer: the target, its bearing, range, angle on
 * the bow and speed as the computer has them, the gyro angle and the run on
 * number wheels, and a lamp lit for a solution. Bottom right, the boat, a
 * readout of the same kind repeating the instruments: depth and the ordered
 * depth, speed and the telegraph's bell, course and the ordered course, the
 * battery, the fuel, every tube's lamp and the spares, and what she is doing
 * (silent running, radar, the gun). Dived, both go rose under the red
 * light, but at the chart table, which keeps its white light. Bottom
 * centre, the crew's reports, over the key strip. Nothing here is told by
 * colour alone. Written to the page only when it has changed. */
"use strict";
(() => {
  const C = PS.C, Sub = PS.Sub, W = PS.Weapons, Sea = PS.Sea, esc = PS.esc;
  const HUD = PS.HUD = { el: null, toasts: [], last: {}, built: false };
  const $ = id => document.getElementById(id);
  const set = (el, k, v, f) => { if (HUD.last[k] !== v) { HUD.last[k] = v; f(el, v); } };
  HUD.STATIONS = [["bridge", "Bridge", "1"], ["scope", "Periscope", "2"], ["panel", "Instruments", "3"], ["chart", "Chart", "4"], ["damage", "Damage", "5"]];
  /* number wheels, as the instruments have them: n drums behind a window, each rolling over as the value passes a
   * whole number (every wheel that changes rolls with the last, as an odometer's do), held by a detent until the
   * last part of each unit and then clicking over, so a figure is whole to read. inv: the cream drum (the
   * tenths); dot: the drum a decimal point stands before */
  const STRIP = `<span class="ds">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<i>${d}</i>`).join("")}</span>`;
  const wheels = (n, { inv = -1, dot = -1 } = {}) => `<span class="wh" role="img">${Array.from({ length: n }, (_, i) => `${i === dot ? '<span class="dot"></span>' : ""}<span class="dr${i === inv ? " inv" : ""}">${STRIP}</span>`).join("")}</span>`;
  const roll = (wh, v, label, mod) => {
    v = Math.round(v * 1e4) / 1e4;     /* 64.99999 is 65, not a drum caught between figures */
    const ds = wh.ds || (wh.ds = [...wh.querySelectorAll(".ds")]), n = ds.length;
    mod = mod || 10 ** n;
    const base = Math.floor(v), f = PS.clamp((v - base - 0.75) / 0.25, 0, 1), now = ((base % mod) + mod) % mod, nxt = (now + 1) % mod;
    ds.forEach((d, i) => {
      const p = 10 ** (n - 1 - i), a = Math.floor(now / p) % 10, b = Math.floor(nxt / p) % 10, tr = `translateY(${(-(a + (a !== b ? f : 0)) * 100 / 11).toFixed(2)}%)`;
      if (d.style.transform !== tr) d.style.transform = tr;
    });
    if (wh.getAttribute("aria-label") !== label) wh.setAttribute("aria-label", label);
  };
  /* a whole number on wheels rolls to its new value rather than jumping (at once under reduced motion) */
  const eased = (id, to) => {
    const now = performance.now(), R = HUD.roll || (HUD.roll = {}), e = R[id];
    if (!e || PS.calm() || now - e.at > 250) R[id] = { v: to, at: now };
    else { const st = (now - e.at) / 1000 * 4; e.v = to > e.v ? Math.min(to, e.v + st) : Math.max(to, e.v - st); e.at = now; }
    return R[id].v;
  };
  /* a flip card (the telegraph's bell, the side of a bearing): its upper leaf falls over the hinge when it changes
   * (at once under reduced motion, or when the card is first drawn); k, its key in HUD.last */
  const flip = (e, k, now, label) => {
    const was = HUD.last[k];
    set(e, k, now, () => {
      e.setAttribute("aria-label", label);
      e.innerHTML = `<span class="fl-c">${now}</span>` + (!was || PS.calm() ? "" : `<span class="fl-h fl-ob">${was}</span><span class="fl-h fl-ot">${was}</span><span class="fl-h fl-nb">${now}</span>`);
    });
  };
  /* the TDC's face: the target's name and class over its rows of wheels, and the solution's lamp */
  const TDC = `<div class="ht-name"></div><div class="ht-cls"></div>
    <div class="hb-row" data-t="brg"><span class="lbl">Bearing</span><span class="v">${wheels(3)}</span></div>
    <div class="hb-row" data-t="rng"><span class="lbl">Range</span><span class="v">${wheels(5)}<small>yd</small></span></div>
    <div class="hb-row" data-t="aob"><span class="lbl">Angle on bow</span><span class="v"><span class="fl" role="img"></span>${wheels(3)}</span></div>
    <div class="hb-row" data-t="spd"><span class="lbl">Speed</span><span class="v">${wheels(3, { inv: 2, dot: 2 })}<small>kn</small></span></div>
    <div class="hb-row" data-t="gyro"><span class="lbl" title="How far the torpedo turns after it leaves the tube: R right, L left">Gyro</span><span class="v"><span class="fl sm" role="img"></span>${wheels(3)}</span></div>
    <div class="hb-row" data-t="run"><span class="lbl" title="How far the torpedo runs to meet her, in yards">Run</span><span class="v">${wheels(5)}<small>yd</small></span></div>
    <div class="ht-eyes"></div><div class="ht-sol"><i class="ht-lamp"></i><span></span></div>`;
  const WHY = { ships: "ships near", contact: "a contact", close: "ships close", torps: "torpedoes running", plane: "aircraft", hunted: "hunted", charges: "depth charges", danger: "danger" };

  HUD.build = () => {
    const el = HUD.el = $("hud");
    el.innerHTML = `
      <div class="h-labels" aria-hidden="true"></div>
      <nav class="hp" id="h-tabs" aria-label="Stations">${HUD.STATIONS.map(([k, n, key]) => `<button data-st="${k}"><kbd>${key}</kbd>${n}</button>`).join("")}</nav>
      <div class="hp" id="h-clock"><div class="hc-time num">0000</div><div class="hc-date"></div><div class="hc-tc"><span class="why"></span><span class="lbl">Time</span> <b>1x</b></div></div>
      <div class="hp ro" id="h-boat">
        <div class="hb-row" data-r="depth"><span class="lbl">Depth</span><span class="v">${wheels(3)}<small>ft</small></span><span class="ord"></span></div>
        <div class="hb-row" data-r="speed"><span class="lbl">Speed</span><span class="v">${wheels(3, { inv: 2, dot: 2 })}<small>kn</small></span><span class="fl" role="img"></span></div>
        <div class="hb-row" data-r="course"><span class="lbl">Course</span><span class="v">${wheels(3)}</span><span class="ord"></span></div>
        <div class="hb-row" data-r="bat"><span class="lbl">Battery</span><span class="hb-bar" data-bar="bat">${"<i></i>".repeat(10)}</span><span class="pc">${wheels(3)}<small>%</small></span><span class="chg"></span></div>
        <div class="hb-row" data-r="fuel"><span class="lbl">Fuel</span><span class="hb-bar" data-bar="fuel">${"<i></i>".repeat(10)}</span><span class="pc">${wheels(3)}<small>%</small></span></div>
        <div class="hb-row" data-r="tubes"><span class="lbl">Tubes</span><span class="hb-tubes" role="img">${["F", "A"].map(b => `<span class="bk">${b}</span><span class="tb" data-b="${b}"></span>${wheels(2)}`).join('<span class="gap"></span>')}</span></div>
        <div class="hb-flags"></div>
      </div>
      <div class="hp ro" id="h-tdc"></div>
      <div class="hp" id="h-hull" hidden></div>
      <div class="hp" id="h-dmg" hidden></div>
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
    /* the words are plain text; a <kbd>key</kbd> in them is drawn as a key cap, like everywhere else */
    d.className = "hp h-toast " + tone; d.innerHTML = PS.Input.caps(esc(text).replace(/&lt;(\/?)kbd&gt;/g, "<$1kbd>"));
    box.appendChild(d);
    HUD.toasts.push({ text, d, until: performance.now() + ms });
    while (HUD.toasts.length > 2) HUD.toasts.shift().d.remove();
    const live = $(tone === "red" ? "alert" : "live"); if (live) live.textContent = d.textContent;
  };
  HUD.flash = () => { const f = HUD.el && HUD.el.querySelector(".h-flash"); if (!f) return; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); };
  /* the key strip; tone "danger" when you are hunted, "coach" for the practice's lesson */
  HUD.hint = (html, tone = "") => { const h = HUD.el.querySelector(".h-hint"); if (!html) { h.hidden = true; HUD.hintNow = ""; return; } if (HUD.hintNow !== tone + html) { HUD.hintNow = tone + html; h.innerHTML = PS.Input.caps(html); h.className = "hp h-hint" + (tone ? " " + tone : ""); } h.hidden = false; };
  HUD.end = (title, sub, tone) => { const e = HUD.el.querySelector(".h-end"); if (!title) { e.hidden = true; return; } e.dataset.tone = tone; e.innerHTML = `<b>${esc(title)}</b><span>${esc(sub || "")}</span>`; e.hidden = false; };
  HUD.clear = () => { HUD.toasts.forEach(t => t.d.remove()); HUD.toasts = []; if (HUD.el) { HUD.end(null); HUD.hint(null); HUD.clearLabels(); } HUD.last = {}; };

  /* the station's live readings, set in the HUD's own type over the canvas where the station puts them
   * (PS.Render.labels: canvas pixels, an anchor, a tone); painted legends stay on the canvas */
  const labs = new Map();
  const ANCHOR = { l: "0", c: "-50%", r: "-100%", t: "0", m: "-50%", b: "-100%" };
  function labels(list, red) {
    const box = HUD.el.querySelector(".h-labels"), cv = $("screen"), k = cv.getBoundingClientRect().width / cv.width || 1, seen = new Set();
    if (box.classList.contains("red") !== red) box.classList.toggle("red", red);
    for (const L of list) {
      let n = labs.get(L.id);
      if (!n) { n = document.createElement("div"); box.appendChild(n); labs.set(L.id, n); }
      seen.add(L.id);
      if (n.dataset.h !== L.html) { n.dataset.h = L.html; n.innerHTML = PS.Input.caps(L.html); }
      const cls = "hl " + (L.cls || ""); if (n.className !== cls) n.className = cls;
      const a = L.at || "cm", tr = `translate(${Math.round(L.x * k)}px,${Math.round(L.y * k)}px) translate(${ANCHOR[a[0]]},${ANCHOR[a[1]]})`;
      if (n.style.transform !== tr) n.style.transform = tr;
    }
    for (const [id, n] of labs) if (!seen.has(id)) { n.remove(); labs.delete(id); }
  }
  HUD.clearLabels = () => { for (const n of labs.values()) n.remove(); labs.clear(); };

  /* the part of the play screen no panel covers, in the canvas's pixels: the stations lay out inside it.
   * t and b, the strip of stations and the key strip; tr, the foot of the clock and the buttons up on the
   * right; br, the head of the boat's readout down on the right (the canvas's height when it is not showing) */
  function safe() {
    const cv = $("screen"), k = cv.getBoundingClientRect().width / cv.width || 1, R = PS.Render;
    const tabs = HUD.el.querySelector("#h-tabs").getBoundingClientRect(), hint = HUD.el.querySelector(".h-hint");
    const top = Math.ceil(tabs.bottom / k) + 2;
    let bot = 10;
    if (hint && !hint.hidden) { const r = hint.getBoundingClientRect(); if (r.height) bot = Math.ceil((innerHeight - r.top) / k) + 2; }
    const corner = $("corner").getBoundingClientRect(), boat = HUD.el.querySelector("#h-boat");
    const tr = Math.ceil(Math.max(HUD.el.querySelector("#h-clock").getBoundingClientRect().bottom, corner.bottom) / k) + 2;
    const br = boat.hidden ? cv.height : Math.floor(boat.getBoundingClientRect().top / k) - 2;
    R.safe = { t: top, b: bot, tr, br };
  }
  /* what the station shows, in words, for a screen reader */
  function describe(S, ui, st) {
    const s = S.sub, n = S.ships.filter(q => PS.Detect.known(S, q) && PS.Ships.alive(q)).length;
    const what = { scope: `Periscope, ${s.scope.up && s.scope.h >= 1 ? "up, bearing " + PS.deg3(s.hdg + s.scope.brg) + (s.scope.hi ? ", high power" : ", low power") : "down"}`, bridge: `Bridge, looking ${PS.deg3(ui.look)}`,
      hatch: "Bridge: the hatch is shut. Surface for the bridge", panel: "Instruments", chart: "Chart", damage: `Damage report: hull ${Math.round(s.hull * 100)}%, ${Sub.SYS.filter(([k2]) => s.sys[k2] > 0.001).map(([, nm]) => nm.toLowerCase()).join(", ") || "nothing damaged"}` }[st] || st;
    const t = `${what}. ${n ? n + " ship" + (n > 1 ? "s" : "") + " in sight." : "No ships in sight."}`;
    if (HUD.desc !== t) { HUD.desc = t; $("screen").setAttribute("aria-label", "Puma Service: " + t); }
  }

  /* ---- the damage report's panels: the hull and the water on the left, the repairs on the right ---- */
  const segs = (v, cls) => `<span class="hb-bar${cls}">${Array.from({ length: 10 }, (_, i) => `<i${i < Math.ceil(v * 10) ? ' class="on"' : ""}></i>`).join("")}</span>`;
  const mins = sec => sec < 90 ? "a minute" : Math.round(sec / 60) + " min";
  function damage(S) {
    const s = S.sub, crush = Sub.crushDepth(s), test = Sub.testDepth(s), k = C.SUBS[s.cls];
    const hull = `<div class="ht-name">The boat</div>
      <div class="hb-row${s.hull < 0.5 ? " crit" : s.hull < 0.8 ? " warn" : ""}"><span class="lbl">Hull</span>${segs(s.hull, s.hull < 0.5 ? " crit" : s.hull < 0.8 ? " warn" : "")}<span class="num pc">${Math.round(s.hull * 100)}%</span></div>
      <div class="hb-row${s.water > 0.25 ? " crit" : s.water > 0.05 ? " warn" : ""}"><span class="lbl">Water</span>${segs(s.water, s.water > 0.25 ? " crit" : " warn")}<span class="num pc">${Math.round(s.water * 100)}%</span></div>
      <div class="hb-row"><span class="lbl">Pumps</span><b class="v sm">${s.silent ? "Stopped: silent running" : s.sys.pumps > 0.5 ? "Failing" : s.sys.pumps > 0.001 ? "Damaged" : "Running"}</b><span></span></div>
      <div class="hb-row${s.depth > test ? " crit" : ""}"><span class="lbl">Crush</span><b class="v">${Math.round(crush)} ft</b><span class="ord dim">${crush < k.crush - 1 ? `was ${k.crush}` : `test ${test}`}</span></div>`;
    set(el0("#h-hull"), "hull", hull, (x, v) => { x.innerHTML = v; });
    const hurt = Sub.SYS.filter(([q]) => s.sys[q] > 0.001).sort((a, b) => (b[0] === s.fixing) - (a[0] === s.fixing) || s.sys[b[0]] - s.sys[a[0]]);
    const rows = hurt.map(([q, name, T]) => {
      const v = s.sys[q], port = Sub.portOnly(S, q), st = port ? "a yard's work" : s.fixing === q ? `repairing, ${mins(v * T)}` : "waiting its turn";
      return `<li class="${v >= 0.5 ? "out" : "hurt"}${s.fixing === q ? " fix" : ""}"><span class="nm">${esc(name)}</span><span class="st">${v >= 0.5 ? "Out" : "Damaged"} · ${st}</span><span class="rb"><i style="width:${Math.round((1 - v) * 100)}%"></i></span></li>`;
    }).join("");
    const fixHull = s.fixing === "hull" ? `<p class="ht-eye">The crew are patching the hull.</p>` : "";
    const list = `<div class="ht-name">Repairs</div>${hurt.length ? `<ul class="hd-list">${rows}</ul>` : `<p class="ht-none">Every system sound.</p>`}${fixHull}`;
    set(el0("#h-dmg"), "dmgList", list, (x, v) => { x.innerHTML = v; });
  }
  const el0 = q => HUD.el.querySelector(q);

  /* ---- every frame ---- */
  HUD.draw = (S, ui) => {
    if (!HUD.built) HUD.build();
    const el = HUD.el, s = S.sub, now = performance.now();
    HUD.toasts = HUD.toasts.filter(t => { if (t.until > now) return true; t.d.remove(); return false; });
    const st = PS.Render.stationOf(S, ui);
    /* the instruments show the boat on their own gauges, so her readout goes, leaving the telegraph its corner;
     * the damage report has its own two panels; the gun has its own sight */
    const gunNow = st === "bridge" && s.gun.on, dmg = st === "damage";
    set(el, "onPanel", `${st}:${gunNow}`, e => { e.querySelector("#h-boat").hidden = st === "panel" || dmg; e.querySelector("#h-tdc").hidden = dmg || gunNow; e.querySelector("#h-hull").hidden = !dmg; e.querySelector("#h-dmg").hidden = !dmg; });
    if (now - (HUD.safeAt || 0) > 250) { HUD.safeAt = now; safe(); describe(S, ui, st); }
    /* rigged for red, the plain words over a station go rose with it; at the periscope they stand over the glass,
     * and the chart table keeps its white light */
    labels(PS.Render.labels || [], st !== "scope" && st !== "chart" && PS.K.red > 0.5);
    if (dmg) damage(S);
    set(el.querySelector("#h-tabs"), "tabs", st + ":" + Sub.surfaced(s), e => { for (const b of e.querySelectorAll("button")) { const off = b.dataset.st === "bridge" && !Sub.surfaced(s); b.setAttribute("aria-current", String(b.dataset.st === (st === "hatch" ? "bridge" : st))); b.classList.toggle("off", off); if (off) b.setAttribute("aria-disabled", "true"); else b.removeAttribute("aria-disabled"); } });
    set(el.querySelector(".hc-time"), "time", C.timeStr(S.t), (e, v) => { e.textContent = v; });
    set(el.querySelector(".hc-date"), "date", C.dateStr(S.t) + (S.wx ? " · " + C.WX[S.wx.k].name : ""), (e, v) => { e.textContent = v; });
    const tcReq = C.TC[S.tcReq], tcNow = PS.Engine.tcNow(S), held = tcNow < tcReq;
    set(el.querySelector(".hc-tc"), "tc", `${tcNow}:${tcReq}:${held ? S.tcWhy : ""}`, e => { e.classList.toggle("held", held); e.querySelector("b").textContent = tcNow + "x"; e.querySelector(".why").textContent = held ? `${WHY[S.tcWhy] || "held back"}, not ${tcReq}x` : ""; });
    /* the boat */
    const row = r => el.querySelector(`[data-r="${r}"]`);
    const test = Sub.testDepth(s);
    /* the readings roll on their wheels every frame; the rest is written when it changes */
    roll(row("depth").querySelector(".wh"), Math.max(0, s.depth), Sub.surfaced(s) ? "surfaced" : Math.round(s.depth) + " feet");
    roll(row("speed").querySelector(".wh"), Math.abs(s.spd) * 10, s.spd.toFixed(1) + " knots");
    roll(row("course").querySelector(".wh"), ((s.hdg / PS.DEG) % 360 + 360) % 360, "course " + PS.deg3(s.hdg), 360);
    const ordD = Math.abs(s.ordDepth - s.depth) > 3, ordC = Math.abs(PS.angDiff(s.hdg, s.ordHdg)) > 0.02;
    set(row("depth"), "depth", `${s.ordDepth}:${ordD}:${s.depth > test ? 2 : s.depth > test * 0.85 ? 1 : 0}`, e => {
      e.querySelector(".ord").textContent = ordD ? (s.ordDepth === 0 ? "surface" : s.ordDepth + " ft") : "";
      e.className = "hb-row" + (s.depth > test ? " crit" : s.depth > test * 0.85 ? " warn" : "");
    });
    flip(row("speed").querySelector(".fl"), "bell", C.BELLS[s.bell], "telegraph " + C.BELLS[s.bell]);
    set(row("course"), "course", PS.deg3(s.ordHdg) + ordC, e => { e.querySelector(".ord").textContent = ordC ? PS.deg3(s.ordHdg) : ""; });
    const bar = (r, v, cap) => {
      roll(row(r).querySelector(".pc .wh"), PS.clamp(v, 0, 1) * 100, Math.round(v * 100) + " per cent");
      set(row(r), r, `${Math.ceil(v * 10)}:${v < 0.12 ? 2 : v < 0.3 ? 1 : 0}:${Math.round(cap * 10)}`, e => {
        const n = Math.ceil(v * 10), b = e.querySelector(".hb-bar");
        b.className = "hb-bar" + (v < 0.12 ? " crit" : v < 0.3 ? " warn" : "");
        [...b.children].forEach((q, k) => q.classList.toggle("on", k < n));
      });
    };
    bar("bat", s.bat, Sub.batCap(s)); bar("fuel", s.fuel, 1);
    /* under the battery, on the surface: charging (and when she will be full), or why not */
    const ch = Sub.charge(s), cap = Sub.batCap(s), left = ch.rate > 0 ? (cap - s.bat) / ch.rate : 0;
    /* a cap the crew's repairs lift a hair at a time reads as full, not as "full in 1 min" for good */
    if (ch.rate > 0 && cap - s.bat < 0.005) ch.why = cap < 0.995 ? "cap" : "full";
    const chg = ch.why === null ? ["green", "Charging · full in " + (left < 3600 ? Math.max(1, Math.ceil(left / 60)) + " min" : Math.round(left / 3600) + " h")]
      : { fast: ["amber", "Too fast to charge"], fuel: ["amber", "No fuel to charge"], engines: ["amber", "Diesels damaged: no charge"], full: ["", "Full"], cap: ["amber", `Damaged: holds ${Math.round(cap * 100)}%`] }[ch.why] || ["", ""];
    set(row("bat").querySelector(".chg"), "chg", chg.join(":"), e => { e.className = "chg " + chg[0]; e.textContent = chg[1]; });
    /* each bank's lamps, and its spares on wheels after them, as the instruments show them */
    const tubes = row("tubes").querySelector(".hb-tubes");
    set(tubes, "tubes", s.tubes.F.map(v => v > 0 ? Math.ceil(v / 60) : v).join(",") + "|" + s.tubes.A.map(v => v > 0 ? Math.ceil(v / 60) : v).join(",") + "|" + s.bank, e => {
      const lamp = v => `<i class="${v === 0 ? "on" : v > 0 ? "load" : "out"}"${v > 0 ? ` style="--p:${Math.round((1 - v / C.TORP.reload) * 100)}%"` : ""}></i>`;
      for (const b of ["F", "A"]) e.querySelector(`.tb[data-b="${b}"]`).innerHTML = s.tubes[b].map(lamp).join("");
      e.querySelectorAll(".bk").forEach(k => k.classList.toggle("sel", k.textContent === s.bank));
    });
    tubes.querySelectorAll(".wh").forEach((w, i) => { const b = "FA"[i]; roll(w, eased("spare" + b, s.store[b]), `${s.store[b]} spare ${b === "F" ? "forward" : "aft"}`); });
    set(tubes, "tubesSay", `${Sub.loaded(s, "F")}:${Sub.loaded(s, "A")}:${s.store.F + s.store.A}`, e => e.setAttribute("aria-label", `${Sub.loaded(s, "F")} forward and ${Sub.loaded(s, "A")} after tubes loaded, ${s.store.F + s.store.A} reloads`));
    const hunted = S.ships.some(q => q.role === "escort" && !q.sinking && q.ai.contact && S.t - q.ai.contact < 60);
    const flags = (hunted ? ['<span class="hunt">Hunted</span>'] : []).concat([[s.silent, "Silent"], [Sub.radarWorks(s), "Radar"], [s.gun.on, "Gun"], [s.scope.up, "Scope up"], [S.konami, "Code"]].filter(f => f[0]).map(f => `<span class="on">${f[1]}</span>`))
      .concat(s.water > 0.2 ? ['<span class="bad">Flooding</span>'] : []).concat(s.bottomed ? ['<span class="on">On the bottom</span>'] : []).concat(Sub.surfaced(s) ? ["<span>Surfaced</span>"] : []).concat(s.spread > 1 ? [`<span title="Each press of fire sends the next torpedo of the fan">Spread of ${s.spread}</span>`] : []);
    set(el.querySelector(".hb-flags"), "flags", flags.join(""), (e, v) => { e.innerHTML = v; });
    /* the TDC: its face is put up when it has a target and taken down when it has none; its wheels roll every frame */
    const e = W.est(S), t = S.tdc.tgt !== null ? PS.Ships.byId(S, S.tdc.tgt) : null, tdc = el.querySelector("#h-tdc");
    set(tdc, "tdcOn", !!e, (x, on) => { x.innerHTML = on ? TDC : '<div class="ht-name">Torpedo data computer</div><p class="ht-none"></p>'; for (const k in HUD.last) if (k.startsWith("t:")) delete HUD.last[k]; });
    if (e) {
      const sol = W.solve(S, e, s.bank), ok = sol && sol.ok, gyro = sol && isFinite(sol.gyro), tr = k => tdc.querySelector(`[data-t="${k}"]`);
      set(tdc.querySelector(".ht-name"), "t:name", t ? t.name : "Last known", (x, v) => { x.textContent = v; });
      set(tdc.querySelector(".ht-cls"), "t:cls", t ? C.SHIPS[t.cls].name + (PS.Detect.known(S, t) ? "" : ", not in sight") : "the target is lost", (x, v) => { x.textContent = v; });
      const aob = Math.abs(e.aob) / PS.DEG, gy = gyro ? Math.abs(sol.gyro) / PS.DEG : 0;
      roll(tr("brg").querySelector(".wh"), ((e.brg / PS.DEG) % 360 + 360) % 360, "bearing " + PS.deg3(e.brg), 360);
      roll(tr("rng").querySelector(".wh"), e.rng, PS.num(Math.round(e.rng / 10) * 10) + " yards");
      flip(tr("aob").querySelector(".fl"), "t:aobSide", e.aob >= 0 ? "STBD" : "PORT", e.aob >= 0 ? "starboard" : "port");
      roll(tr("aob").querySelector(".wh"), aob, Math.round(aob) + " degrees on the bow");
      /* her speed is the computer's estimate, held steady: it reads in whole tenths, rolling to each new one */
      roll(tr("spd").querySelector(".wh"), eased("tdcSpd", Math.round(e.s * 10)), e.s.toFixed(1) + " knots");
      flip(tr("gyro").querySelector(".fl"), "t:gyroSide", gyro ? (sol.gyro >= 0 ? "R" : "L") : "", gyro ? (sol.gyro >= 0 ? "right" : "left") : "no gyro angle");
      roll(tr("gyro").querySelector(".wh"), gy, gyro ? Math.round(gy) + " degrees" : "none");
      roll(tr("run").querySelector(".wh"), ok ? sol.run : 0, ok ? PS.num(Math.round(sol.run / 10) * 10) + " yards" : "none");
      set(tdc, "t:off", `${gyro}:${ok}:${S.real.aob}`, () => {
        tr("gyro").classList.toggle("off", !gyro); tr("run").classList.toggle("off", !ok);
        for (const k of ["aob", "spd"]) for (const w of tr(k).querySelectorAll(".wh, .fl")) w.classList.toggle("set", !!S.real.aob);
      });
      set(tdc.querySelector(".ht-eyes"), "t:eyes", `${S.mode === "practice" ? `<p class="ht-eye">Gyro: how far the torpedo turns after the tube. Run: the yards it runs to meet her.</p>` : ""}${S.real.aob ? `<p class="ht-eye">Angle on bow and speed are yours to set: <kbd>[</kbd> <kbd>]</kbd> <kbd>,</kbd> <kbd>.</kbd></p>` : ""}`, (x, v) => { x.innerHTML = PS.Input.caps(v); });
      const say = ok ? "Solution: fire " + (s.bank === "F" ? "forward" : "aft") : sol ? { gyro: "No solution: turn toward it", range: "No solution: out of range", speed: "No solution" }[sol.why] || "No solution" : "No solution";
      set(tdc.querySelector(".ht-sol"), "t:sol", say, (x, v) => { x.className = "ht-sol " + (ok ? "ok" : "no"); x.querySelector("span").textContent = v; });
    } else set(tdc.querySelector(".ht-none"), "t:none", PS.Input.device, (x, d) => { x.innerHTML = PS.Input.caps(`No target. ${d === "pad" ? "<kbd>pad:X</kbd>" : "<kbd>T</kbd>"} locks the nearest ship in sight.`); });
    /* nothing to aim at, nothing in sight: the TDC stands back */
    const idle = !e && !S.ships.some(q => PS.Detect.known(S, q) && PS.Ships.alive(q));
    set(el.querySelector("#h-tdc"), "tdcIdle", idle, (x, v) => x.classList.toggle("thin", v));
    /* dived, the boat is rigged for red: the readouts go rose like the instruments and every plate goes under the
     * red light (the HUD's .rig), but at the chart table, which keeps its white light. Going under or coming
     * up fades it in or out; stepping to or from the chart (or into the game) is at once */
    const surf = Sub.surfaced(s), snap = HUD.last.redSurf === undefined || HUD.last.redSurf === surf;
    HUD.last.redSurf = surf;
    set(el, "red", !surf && st !== "chart", (x, v) => {
      const lit = [...x.querySelectorAll("#h-tdc, #h-boat")];
      for (const c of lit) { c.classList.toggle("snap", snap); c.classList.toggle("red", v); }
      x.classList.toggle("snap", snap); x.classList.toggle("rig", v);
      if (snap) requestAnimationFrame(() => { for (const c of [x, ...lit]) c.classList.remove("snap"); });
    });
    /* a base in reach */
    const p = S.mode === "patrol" && !S.patrol.leaving ? PS.Engine.nearPort(S) : null;
    set(el.querySelector("#h-port"), "port", p ? p.id + PS.Engine.canDock(S) + PS.Input.device : "", (x) => { x.hidden = !p; if (p) x.innerHTML = PS.Engine.canDock(S) ? `${esc(p.name)} ${PS.Input.cap(PS.Input.device === "pad" ? "pad:Y" : "O")} tie up` : `${esc(p.name)}: on the surface, under 9 knots, to tie up`; });
  };
})();
