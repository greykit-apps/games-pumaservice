/* Puma Service -- the screens with words on them: flat dark panels over the
 * sea (css/pumaservice.css). A war patrol's beginning and the port between
 * patrols; the convoy actions and a custom one; target practice; the
 * service record; the pause; the report after an action or a patrol; the
 * captain's log; and Settings, Help and About from the title. */
"use strict";
(() => {
  const esc = PS.esc, C = PS.C, E = PS.Engine, Sea = PS.Sea, num = PS.num;
  const UI = PS.UI = { sheet: null, aidOpen: false };
  const CREDIT = UI.CREDIT = 'Built by <a href="https://greykit.com/" target="_blank" rel="noopener">greykit.com</a>';
  const ICON_BACK = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M7.5 2 L3.5 6 L7.5 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  const ICON_X = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3 L9 9 M9 3 L3 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';

  /* ---- the sheet: a panel of its own over whatever was showing; popup, a window to one side ---- */
  UI.open = (title, { tabs, html, onClick, onClose, onKey, back, tab = 0, wide = false, closable = true, popup = false }) => {
    UI.close(true);
    const el = document.createElement("div");
    el.className = "ps-sheet " + (popup ? "ps-pop" : "full") + (wide ? " wide" : "") + (tabs ? " tabbed" : "");
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    const draw = () => {
      el.innerHTML = '<div class="' + (popup ? "ps-win" : "sh-box") + '"><header class="sh-head">' + (back ? '<button data-back title="Back (Esc)">' + ICON_BACK + "Back</button>" : "") + "<h2>" + esc(title) + "</h2>" +
        (closable && !back && !popup ? '<button data-x title="Close (Esc)">' + ICON_X + "Close</button>" : "") + "</header>" +
        (tabs ? '<div class="sh-tabs" role="tablist" aria-label="' + esc(title) + '">' + tabs.map(([t], i) => '<button role="tab" id="tab-' + i + '" data-tab="' + i + '" aria-selected="' + (i === tab) + '" aria-controls="tabpanel" tabindex="' + (i === tab ? 0 : -1) + '">' + esc(t) + "</button>").join("") + "</div>" : "") +
        '<div class="sh-body"' + (tabs ? ' id="tabpanel" role="tabpanel" aria-labelledby="tab-' + tab + '" tabindex="0"' : "") + '><div class="sh-in">' + PS.Input.caps(tabs ? tabs[tab][1] : html()) + "</div></div></div>";
    };
    draw();
    const api = { refresh: () => { const b = el.querySelector(".sh-body"), y = b.scrollTop, f = document.activeElement && document.activeElement.dataset; draw(); el.querySelector(".sh-body").scrollTop = y; if (f) for (const k of ["set", "act", "d", "start"]) if (f[k]) { const n = el.querySelector(`[data-${k}="${f[k]}"]`); if (n) n.focus({ preventScroll: true }); } }, close: () => UI.close(), el };
    const setTab = i => { tab = (i + tabs.length) % tabs.length; draw(); el.querySelector('[data-tab="' + tab + '"]').focus(); };
    el.addEventListener("click", ev => {
      if (popup && ev.target === el && closable) return UI.close();
      const b = ev.target.closest("button"); if (!b) return;
      PS.SFX.play("menu");
      if (b.hasAttribute("data-x")) return UI.close();
      if (b.hasAttribute("data-back")) return goBack();
      if (b.dataset.tab !== undefined) return setTab(+b.dataset.tab);
      if (onClick) onClick(b, api, ev);
    });
    el.addEventListener("toggle", ev => { if (ev.target.classList && ev.target.classList.contains("aid-list")) { if (ev.target.classList.contains("real")) UI.realOpen = ev.target.open; else UI.aidOpen = ev.target.open; } }, true);
    function goBack() { UI.close(true); back(); }
    document.body.appendChild(el);
    UI.sheet = { el, onClose, onKey, closable, back: back ? goBack : null, tabs: tabs ? setTab : null, tabAt: () => tab };
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = true; }
    (el.querySelector("[autofocus]") || el.querySelector(".sh-body .primary") || el.querySelector('[role="tab"][aria-selected="true"]') || el.querySelector(".sh-body button") || el.querySelector("button")).focus({ preventScroll: true });
    return api;
  };
  UI.close = quiet => {
    if (!UI.sheet) return;
    const s = UI.sheet; UI.sheet = null;
    s.el.remove();
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = false; }
    if (s.onClose && !quiet) s.onClose();
    if (!quiet && PS.game.mode === "title") PS.game.refreshTitle();
  };
  /* the arrows walk the buttons by where they sit on the screen */
  UI.walk = (root, key) => {
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key], a = document.activeElement;
    if (!d || !a || !root.contains(a)) return false;
    const box = n => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; }, o = box(a);
    let best = null, bestS = Infinity;
    for (const n of root.querySelectorAll("button:not(:disabled), summary, input")) {
      if (n === a || n.offsetParent === null || n.getAttribute("role") === "tab" || n.closest(".sh-head")) continue;
      const b = box(n), dx = b.x - o.x, dy = b.y - o.y, along = dx * d[0] + dy * d[1];
      if (along <= (d[0] ? o.r.width : o.r.height) / 4) continue;
      const s = along + Math.abs(d[0] ? dy : dx) * 3;
      if (s < bestS) { bestS = s; best = n; }
    }
    if (!best) return false;
    best.focus({ preventScroll: true }); best.scrollIntoView({ block: "nearest" });
    return true;
  };
  UI.key = ev => {
    const s = UI.sheet;
    if (s.onKey && s.onKey(ev)) return;
    if (ev.key === "Escape") { ev.preventDefault(); if (s.back) s.back(); else if (s.closable) UI.close(); return; }
    if (s.tabs && document.activeElement && document.activeElement.getAttribute("role") === "tab" && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) { ev.preventDefault(); s.tabs(s.tabAt() + (ev.key === "ArrowRight" ? 1 : -1)); return; }
    const inInput = ev.target.closest && ev.target.closest("input");
    if (ev.key.startsWith("Arrow") && !(inInput && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) && UI.walk(s.el, ev.key)) { ev.preventDefault(); return; }
    if (ev.key === "Tab") {
      const f = [...s.el.querySelectorAll('button:not(:disabled), input, summary, a[href], [tabindex]:not([tabindex="-1"])')].filter(n => n.offsetParent !== null);
      if (!f.length) return;
      ev.preventDefault();
      const i = f.indexOf(document.activeElement), d = ev.shiftKey ? -1 : 1;
      f[i < 0 ? 0 : (i + d + f.length) % f.length].focus();
    }
  };
  /* a question before something that cannot be undone: Cancel has the focus */
  UI.ask = (question, yes, title = yes + "?") => new Promise(resolve => {
    const back = document.activeElement, el = document.createElement("div");
    el.className = "ps-ask";
    el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    el.innerHTML = '<div class="ps-win"><header class="sh-head"><h2>' + esc(title) + '</h2></header><div class="sh-body"><p>' + esc(question) +
      '</p><div class="row end"><button data-no class="primary">Cancel</button><button data-yes class="danger">' + esc(yes) + "</button></div></div></div>";
    const done = v => { document.removeEventListener("keydown", onKey, true); el.remove(); if (back && back.isConnected && back.focus) back.focus({ preventScroll: true }); resolve(v); };
    const onKey = ev => {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); done(false); return; }
      if (ev.key === "Tab" || ev.key === "ArrowLeft" || ev.key === "ArrowRight") { const bs = [...el.querySelectorAll("button")], i = bs.indexOf(document.activeElement); ev.preventDefault(); bs[(i + (ev.shiftKey || ev.key === "ArrowLeft" ? -1 : 1) + bs.length) % bs.length].focus(); }
      ev.stopPropagation();
    };
    el.addEventListener("click", ev => { if (ev.target === el) return done(false); const b = ev.target.closest("button"); if (b) done(b.hasAttribute("data-yes")); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(el);
    el.querySelector("[data-no]").focus();
  });

  const pill = (on, label, act) => `<button data-set="${act}" class="pill${on ? " on" : ""}" aria-pressed="${on}">${label}</button>`;
  const toggle = (act, on, n) => `<button data-set="${act}" role="switch" aria-checked="${on}" aria-label="${esc(n)}" class="pill switch${on ? " on" : ""}">${on ? "On" : "Off"}</button>`;
  const line = (n, note, ctl) => `<tr><td><b>${esc(n)}</b><br><span class="note">${note}</span></td><td class="act">${ctl}</td></tr>`;
  /* the reality switches, as a table, for a new game or the defaults */
  const realTable = (real, pre = "real") => `<table class="aids">${C.REAL.map(([k, n, note, v]) => line(n, `${esc(note)} <span class="num">+${v}%</span>`, toggle(pre + ":" + k, !!real[k], n))).join("")}</table>
    <p class="note">Reality <b class="num">${C.realPct(real)}%</b>: tonnage sunk counts for this much toward rank and the record.</p>`;
  const realOnly = real => C.REAL.filter(([k]) => real[k]).map(([, n]) => n.toLowerCase()).join(", ") || "none";
  /* the reality as one line, the switches behind it */
  const realLine = (real, pre) => `<details class="aid-list real"${UI.realOpen ? " open" : ""}><summary>Reality <b class="num">${C.realPct(real)}%</b>: ${esc(realOnly(real))}. Change</summary>${realTable(real, pre)}</details>`;

  /* ---- a war patrol: the career's start, or the port between patrols ---- */
  UI.patrol = () => {
    const car = PS.loadCareer();
    if (car && !car.over) return UI.port(car);
    UI.careerSetup();
  };
  UI.careerSetup = () => {
    const real = Object.assign({}, PS.prefs.real);
    let start = 0;
    UI.open("A new command", { wide: true, back: () => PS.game.toTitle(),
      html: () => `<p class="lede">The Wolf Empire's convoys carry its oil, its ore and its troops across the archipelago. You have a fleet boat out of Port Talon, and the war is just beginning.</p>
        <div class="row"><label for="ps-name">Your name</label><input id="ps-name" maxlength="18" value="${esc(PS.lastName())}" placeholder="Puma" autocomplete="off"></div>
        <h3>Take command in</h3>
        <div class="diffs">${C.START_MONTHS.map(([mi, n, note], i) => `<button data-start="${i}" aria-pressed="${i === start}"${i === start ? ' class="on"' : ""}><b>${esc(n)}</b><span>${esc(note)}</span></button>`).join("")}</div>
        ${realLine(real, "real")}
        <div class="row end"><button data-act="go" class="primary">Take command</button></div>`,
      onClick: (b, api) => {
        if (b.dataset.start !== undefined) { start = +b.dataset.start; const n = document.getElementById("ps-name").value; api.refresh(); document.getElementById("ps-name").value = n; return; }
        const v = b.dataset.set;
        if (v && v.startsWith("real:")) { const k = v.slice(5); real[k] = !real[k]; const n = document.getElementById("ps-name").value; api.refresh(); document.getElementById("ps-name").value = n; return; }
        if (b.dataset.act === "go") {
          const name = (document.getElementById("ps-name").value || "").trim().slice(0, 18) || "Puma";
          PS.setLastName(name);
          const car = PS.Career.make({ name, mi: C.START_MONTHS[start][0], real, seed: 1 + Math.floor(Math.random() * 2 ** 30) });
          PS.saveCareer(car);
          UI.close(true); UI.port(car);
        }
      },
    });
  };
  /* in port: the date, the boat, the orders */
  UI.port = car => {
    const S = E.newPatrol(car, 1 + Math.floor(Math.random() * 2 ** 30)), zone = Sea.ZONES.find(z => z.id === S.patrol.zone), base = Sea.port(car.base);
    const offered = PS.Career.boatsOffered(car).filter(k => k !== car.cls), last = car.patrols[car.patrols.length - 1];
    const news = C.TECH.filter(([mi]) => mi <= C.monthOf(car.t) && mi > (last ? C.monthOf(last.back) : car.start - 1)).map(([, n]) => n);
    UI.open(`${base.name}, ${C.dateStr(car.t)}`, { wide: true, closable: false,
      html: () => `<div class="report"><div>
        <div class="cap"><img class="crest" src="${PS.Puma.crestURL(48)}" alt="" width="48" height="48"><h3 class="mname">${esc(car.rank)} ${esc(car.name)}</h3></div>
        <p class="meta">The ${esc(C.SUBS[car.cls].name)}-class boat <b>${esc(car.boat)}</b> · ${car.patrols.length} patrol${car.patrols.length === 1 ? "" : "s"} · ${num(car.tons)} tons sunk</p>
        <h3>Orders</h3>
        <p class="lede">Patrol ${S.patrol.n}: <b>${esc(zone.name)}</b>. ${C.PATROL_DAYS} days. Sink what you find; come home when the torpedoes or the fuel run low.</p>
        ${news.length ? `<h3>News</h3><ul>${news.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        ${offered.length ? `<h3>A new boat</h3><div class="row">${offered.map(k => `<button data-boat="${k}">The ${esc(C.SUBS[k].name)} class</button>`).join("")}</div><p class="note">${offered.map(k => `${esc(C.SUBS[k].name)}: ${esc(C.SUBS[k].note)}`).join(" ")}</p>` : ""}
      </div><div>
        <h3>The war so far</h3>${car.patrols.length ? `<table class="tally">${car.patrols.slice(-6).map(p => `<tr><td>Patrol ${p.n}${p.zone ? ", " + esc(p.zone) : ""}</td><td class="num">${num(p.tons)} t</td></tr>`).join("")}</table>` : `<p class="note">No patrols yet.</p>`}
        ${car.medals.length ? `<p>${car.medals.map(m => esc(m.name)).join(" · ")}</p>` : ""}
        <p class="note">Reality ${C.realPct(car.real)}%: ${esc(realOnly(car.real))}.</p>
      </div></div>
      <div class="row end"><button data-act="sea" class="primary">Put to sea</button><button data-act="record">Service record</button><button data-act="retire" class="danger">Retire</button><button data-act="title">Main menu</button></div>`,
      onClick: async (b, api) => {
        if (b.dataset.boat) { car.cls = b.dataset.boat; car.boat = PS.pick(Math.random, C.BOAT_NAMES); PS.saveCareer(car); UI.close(true); UI.port(car); return; }
        const a = b.dataset.act;
        if (a === "sea") { UI.close(true); PS.game.startPatrol(S, car); }
        if (a === "record") { UI.close(true); UI.record(() => UI.port(car)); }
        if (a === "title") { UI.close(true); PS.game.toTitle(); }
        if (a === "retire" && await UI.ask(`Retire ${car.rank} ${car.name}? The career goes into the service record, and a new command starts from the beginning.`, "Retire")) {
          car.over = "retired"; PS.addCareer(car); PS.clearCareer(); UI.close(true); UI.record(() => PS.game.toTitle());
        }
        void api;
      },
    });
  };

  /* ---- the convoy actions ---- */
  UI.actions = () => {
    const real = Object.assign({}, PS.prefs.real), f = PS.fame();
    UI.open("Convoy action", { wide: true, back: () => PS.game.toTitle(),
      html: () => `<p class="lede">One engagement, one boat, one night or day of the war.</p>
        <div class="diffs acts">${E.ACTIONS.map((A, i) => `<button data-a="${A.id}"><b><kbd>${i + 1}</kbd>${esc(A.name)}</b><span>${esc(A.note)}</span><span class="meta">${esc(C.dateStr(C.monthStart(A.mi) + ((A.day || 10) - 1) * C.DAY))} · ${esc(C.SUBS[A.cls].name)} class${f.actions[A.id] ? ` · best ${num(f.actions[A.id].tons)} t` : ""}</span></button>`).join("")}
          <button data-a="custom"><b><kbd>9</kbd>Custom action</b><span>The year, the boat, the convoy, the time and the weather of your choosing.</span></button></div>
        ${realLine(real, "real")}`,
      onKey: ev => { const n = +ev.key; if (n >= 1 && n <= E.ACTIONS.length) { ev.preventDefault(); go(E.ACTIONS[n - 1].id); return true; } if (ev.key === "9") { ev.preventDefault(); go("custom"); return true; } return false; },
      onClick: (b, api) => {
        if (b.dataset.a) return go(b.dataset.a);
        const v = b.dataset.set; if (v && v.startsWith("real:")) { const k = v.slice(5); real[k] = !real[k]; PS.prefs.real = Object.assign({}, real); PS.savePrefs(); api.refresh(); }
      },
    });
    function go(id) { if (id === "custom") { UI.close(true); UI.custom(real); return; } UI.close(true); PS.game.startAction(id, real); }
  };
  UI.custom = real => {
    const last = PS.store.get(PS.KEY_LAST, null) || {};
    const c = Object.assign({ mi: 14, cls: "cougar", size: "medium", escorts: "light", time: "night", wx: "clear" }, last);
    const opts = (k, list) => `<div class="row">${list.map(([v, n]) => pill(String(c[k]) === String(v), n, "c:" + k + ":" + v)).join("")}</div>`;
    UI.open("Custom action", { wide: true, back: () => UI.actions(),
      html: () => `<h3>When</h3>${opts("mi", PS.Engine.CUSTOM.when)}
        <h3>Boat</h3>${opts("cls", PS.C.SUB_ORDER.filter(k => C.SUBS[k].from <= c.mi).map(k => [k, C.SUBS[k].name]))}
        <h3>Convoy</h3>${opts("size", E.CUSTOM.size)}
        <h3>Escorts</h3>${opts("escorts", E.CUSTOM.escorts)}
        <h3>Time</h3>${opts("time", E.CUSTOM.time)}
        <h3>Weather</h3>${opts("wx", E.CUSTOM.wx)}
        <div class="row end"><button data-act="go" class="primary">Into action</button></div>`,
      onClick: (b, api) => {
        const v = b.dataset.set;
        if (v) { const [, k, x] = v.split(":"); c[k] = k === "mi" ? +x : x; if (C.SUBS[c.cls].from > c.mi) c.cls = "caracal"; api.refresh(); }
        if (b.dataset.act === "go") { PS.store.set(PS.KEY_LAST, c); UI.close(true); PS.game.startAction("custom", real, c); }
      },
    });
  };
  /* ---- target practice ---- */
  UI.practice = () => UI.open("Target practice", { back: () => PS.game.toTitle(),
    html: () => `<p class="lede">Unescorted targets on a steady course, calm water, good torpedoes. Nothing counts.</p>
      <div class="diffs two"><button data-k="torpedo" autofocus><b><kbd>1</kbd>Torpedoes</b><span>Three ships crossing ahead of you at periscope depth. Lock one, let the TDC solve it, fire.</span></button>
      <button data-k="gun"><b><kbd>2</kbd>The deck gun</b><span>An old coaster, a few thousand yards off, and you on the surface. <kbd>G</kbd> mans the gun.</span></button></div>`,
    onKey: ev => { if (ev.key === "1" || ev.key === "2") { ev.preventDefault(); UI.close(true); PS.game.startPractice(ev.key === "1" ? "torpedo" : "gun"); return true; } return false; },
    onClick: b => { if (b.dataset.k) { UI.close(true); PS.game.startPractice(b.dataset.k); } },
  });

  /* ---- the service record ---- */
  UI.record = after => {
    const f = PS.fame(), car = PS.loadCareer();
    UI.open("Service record", { wide: true, onClose: after,
      html: () => `${car && !car.over ? `<h3>In command</h3><p>${esc(car.rank)} ${esc(car.name)}, ${esc(car.boat)}: ${car.patrols.length} patrols, ${num(car.tons)} tons, ${C.dateStr(car.t)}.</p>` : ""}
        <h3>Careers</h3>${f.careers.length ? `<table class="scores"><tr><th></th><th>Captain</th><th>Rank</th><th class="num">Points</th><th class="num">Tons</th><th>Patrols</th><th>Ended</th></tr>${f.careers.map((e, i) => `<tr><td class="num">${i + 1}</td><td>${esc(e.name)}${e.code ? " · code" : ""}</td><td>${esc(e.rank)}</td><td class="num">${num(e.pts)}</td><td class="num">${num(e.tons)}</td><td>${e.patrols}</td><td>${{ war: "the war won", retired: "retired", lost: "lost at sea" }[e.over] || ""}</td></tr>`).join("")}</table>` : `<p class="note">No careers ended yet. They come here when the war is won, when you retire, or when the boat is lost.</p>`}
        <h3>Convoy actions</h3><table class="scores">${E.ACTIONS.map(A => { const r = f.actions[A.id]; return `<tr><td>${esc(A.name)}</td><td class="num">${r ? num(r.tons) + " t" : "—"}</td><td>${r ? esc(r.rating) + ` · reality ${r.pct}%` : ""}</td></tr>`; }).join("")}</table>`,
    });
  };

  /* ---- pause: the menu, and the keys that matter most under it ---- */
  const KEY_LEGEND = [["W S", "telegraph"], ["A D", "helm"], ["Q E", "depth"], ["C", "crash dive"], ["← →", "train, look"], ["T", "lock"], ["Space", "fire"], ["?", "all keys"]];
  const PAD_LEGEND = [["pad:L-stick", "helm, telegraph"], ["pad:dU pad:dD", "depth"], ["pad:L-click", "crash dive"], ["pad:R-stick", "train, look"], ["pad:X", "lock"], ["pad:A", "fire"], ["pad:LB pad:RB", "stations"], ["pad:Back+Start", "all keys"]];
  UI.pause = () => {
    const S = PS.game.S, patrol = S.mode === "patrol";
    UI.open("Paused", { popup: true,
      html: () => `<h3 class="mname">${esc(patrol ? `Patrol ${S.patrol.n}, ${Sea.ZONES.find(z => z.id === S.patrol.zone).name}` : S.scnName || "Action")}</h3>
        <p class="meta">${esc(C.dateStr(S.t))}, ${C.timeStr(S.t)} · ${S.stats.sunk.length} sunk, ${num(S.stats.tons)} tons</p>
        <div class="col"><button data-act="resume" class="primary">Resume</button>
        <button data-act="log">Captain's log</button>
        <button data-act="settings">Settings</button><button data-act="help">Help</button>
        <button data-act="leave">${patrol || PS.prefs.resume ? "Main menu: resume it later" : "End the action"}</button>
        ${!patrol && PS.prefs.resume ? `<button data-act="end">End the action</button>` : ""}</div>
        <div class="note keys legend">${(PS.Input.device === "pad" ? PAD_LEGEND : KEY_LEGEND).map(([k, w]) => `<span class="k">${k.split(" ").map(x => `<kbd>${x}</kbd>`).join(" ")}</span><span>${w}</span>`).join("")}</div>`,
      onClick: async b => {
        const a = b.dataset.act;
        if (a === "resume") UI.close();
        if (a === "log") { UI.close(true); UI.log(S, () => UI.pause()); }
        if (a === "settings") { UI.close(true); UI.settings(() => UI.pause()); }
        if (a === "help") { UI.close(true); UI.help(0, () => UI.pause()); }
        if (a === "leave") { if (patrol || PS.prefs.resume) { UI.close(true); PS.game.leave(); } else if (await UI.ask("End this action here? What you have sunk still counts.", "End the action")) { UI.close(true); PS.game.endAction(); } }
        if (a === "end" && await UI.ask("End this action here? What you have sunk still counts.", "End the action")) { UI.close(true); PS.game.endAction(); }
      },
      onClose: () => PS.game.unpause(),
    });
  };

  /* ---- the captain's log ---- */
  UI.log = (S, after) => UI.open("Captain's log", { onClose: after,
    html: () => S.log.length ? `<table class="tally log">${S.log.slice().reverse().slice(0, 120).map(l => `<tr><td class="num">${esc(C.timeStr(l.t))}</td><td>${esc(l.text)}</td><td class="note">${esc(C.dateStr(l.t))}</td></tr>`).join("")}</table>` : `<p class="note">Nothing written yet.</p>`,
  });

  /* ---- the end of an action ---- */
  const sunkTable = list => list.length ? `<table class="tally">${list.map(x => `<tr><td>${esc(C.SHIPS[x.cls].name)} ${esc(x.name)}</td><td class="num">${num(x.tons)} t</td></tr>`).join("")}</table>` : `<p class="note">Nothing sunk.</p>`;
  UI.actionOver = S => {
    const pct = C.realPct(S.real), rating = E.rating(S), lost = S.end && (S.end.why === "crushed" || S.end.why === "flooded");
    const rec = { tons: S.stats.tons, pts: Math.round(S.stats.tons * pct / 100), pct, rating, code: !!S.cheated, at: Date.now() };
    const best = S.mode === "action" && !lost && S.stats.tons > 0 ? PS.addAction(S.scn, rec) : false;
    const why = { allSunk: "Every merchant in the convoy is on the bottom.", escaped: "The rest of the convoy got away.", crushed: "The hull gave way under the pressure.", flooded: "She flooded and went down.", ended: "You broke off the action." }[S.end ? S.end.why : "ended"] || "";
    UI.open(lost ? "Lost with all hands" : S.mode === "practice" ? "Practice over" : "The action is over", { wide: true, closable: false,
      html: () => `<div class="report"><div><h3 class="mname big${lost ? " danger" : S.stats.tons ? " ok" : ""}">${num(S.stats.tons)} tons</h3>
        <p class="meta">${esc(why)} ${esc(S.scnName || "")}</p>
        ${S.mode === "action" ? `<p class="rank">Rated <b>${esc(rating)}</b>: ${Math.round(S.potential ? S.stats.tons / S.potential * 100 : 0)}% of the convoy's merchant tonnage${best ? ", your best here" : ""}.</p>` : ""}
        ${!lost && S.stats.charges ? `<p class="honour">Survived ${S.stats.charges} depth charge${S.stats.charges > 1 ? "s" : ""}</p>` : ""}
        ${S.mode === "practice" ? `<p class="lesson">${S.scn === "gun" ? (S.stats.tons ? "That's the gun. Torpedoes next: the other practice." : "Lay the gun with the arrows and its range with up and down; <kbd>Space</kbd> fires when the sight reads READY.") : S.stats.hits ? "That's the attack. Escorts next: a convoy action, where they hunt back." : S.stats.fired ? "A miss teaches the angle: shoot from ahead of her, 1,000 to 2,000 yards off her track, near 90° on the bow." : "Lock a ship with <kbd>T</kbd>, and fire with <kbd>Space</kbd> when the TDC lamp is green."}</p>` : ""}
        <p class="note">${S.mode === "practice" ? "" : `Reality ${pct}%. `}${S.stats.fired} torpedoes fired, ${S.stats.hits} hits${S.stats.duds ? `, ${S.stats.duds} duds` : ""}. Deepest ${Math.round(S.stats.maxDepth)} ft.</p></div>
        <div><h3>Sunk</h3>${sunkTable(S.stats.sunk)}</div></div>
        <div class="row end"><button data-act="again" class="primary">${S.mode === "practice" ? "Again" : "Fight it again"}</button><button data-act="actions">${S.mode === "practice" ? "Practice" : "Convoy actions"}</button><button data-act="title">Main menu</button></div>`,
      onClick: b => {
        const a = b.dataset.act;
        if (a === "again") { UI.close(true); S.mode === "practice" ? PS.game.startPractice(S.scn) : PS.game.startAction(S.scn, S.real, PS.game.lastCustom); }
        if (a === "actions") { UI.close(true); S.mode === "practice" ? UI.practice() : UI.actions(); }
        if (a === "title") { UI.close(true); PS.game.toTitle(); }
      },
    });
  };
  /* ---- home from a patrol ---- */
  UI.patrolReport = (rep, car) => UI.open(rep.towed ? `Towed into ${Sea.port(car.base).name}` : `Patrol ${rep.n}: home to ${Sea.port(car.base).name}`, { wide: true, closable: false,
    html: () => `<div class="report"><div><div class="cap"><img class="crest" src="${PS.Puma.crestURL(48)}" alt="" width="48" height="48"><h3 class="mname big${rep.tons ? " ok" : ""}">${num(rep.tons)} tons</h3></div>
      ${rep.charges ? `<p class="honour">Survived ${rep.charges} depth charge${rep.charges > 1 ? "s" : ""}</p>` : ""}
      <p class="meta">${rep.days} days at sea${rep.zone ? `, ${esc(rep.zone)}` : ""}. ${rep.fired} torpedoes fired.</p>
      ${rep.medal ? `<p class="placed">${esc(rep.medal)}</p>` : ""}${rep.rankUp ? `<p class="rank">Promoted: <b>${esc(rep.rankUp)}</b></p>` : `<p class="rank">${esc(car.rank)}</p>`}
      <p class="note">${num(rep.pts)} points this patrol, at ${C.realPct(car.real)}% reality. ${car.over === "war" ? "The war is over." : `Refit until ${C.dateStr(car.t)}.`}</p></div>
      <div><h3>Sunk</h3>${sunkTable(rep.ships)}</div></div>
      <div class="row end"><button data-act="on" class="primary">${car.over === "war" ? "The end of the war" : "Into port"}</button></div>`,
    onClick: b => {
      if (b.dataset.act !== "on") return;
      UI.close(true);
      if (car.over === "war") { PS.addCareer(car); PS.clearCareer(); UI.record(() => PS.game.toTitle()); }
      else UI.port(car);
    },
  });
  UI.lost = (S, car) => UI.open("Lost with all hands", { wide: true, closable: false,
    html: () => `<div class="report"><div><h3 class="mname big danger">${esc(S.sub.name)}</h3>
      <p class="meta">${S.end.why === "crushed" ? "The hull gave way below her crush depth." : "She flooded and went down."} ${esc(C.dateStr(S.t))}.</p>
      <p>${S.end.why === "crushed" ? "Next time: watch the depth gauge's red arc, and remember that damage brings the crush depth up." : "Next time: water comes in through a damaged hull and the pumps fight it; running silent stops the pumps."}</p>
      <p class="rank">${esc(car.rank)} ${esc(car.name)}: ${car.patrols.length} patrols, ${num(car.tons)} tons.</p></div>
      <div><h3>This patrol</h3>${sunkTable(S.stats.sunk.slice(S.patrol.sunk0))}</div></div>
      <div class="row end"><button data-act="new" class="primary">A new command</button><button data-act="rec">Service record</button><button data-act="title">Main menu</button></div>`,
    onClick: b => { if (b.dataset.act === "new") { UI.close(true); UI.careerSetup(); } if (b.dataset.act === "rec") { UI.close(true); UI.record(() => PS.game.toTitle()); } if (b.dataset.act === "title") { UI.close(true); PS.game.toTitle(); } },
  });

  /* ---- Settings (greykit.games STANDARD.md §7: the game's own, Sound, speed, This browser) ---- */
  function showSettings() {
    const sw = (k, n) => toggle("aidt:" + k, PS.aid(k), n);
    UI.open("Settings", { wide: true,
      html: () => { const changed = Object.keys(PS.prefs.over).length, adj = changed ? ", adjusted" : ""; return `
        <h3>Reality for new games</h3>${realTable(PS.prefs.real, "dreal")}
        <h3>Aids</h3>
        <div class="row">${pill(PS.prefs.aids === "classic", "Classic" + (PS.prefs.aids === "classic" ? adj : ""), "aids:classic")}${pill(PS.prefs.aids === "field", "Field" + (PS.prefs.aids === "field" ? adj : ""), "aids:field")}</div>
        <p class="note">Classic plays as 1985 did: the instruments and your eyes. Field adds the helps below. <kbd>L</kbd> switches between them at sea and keeps the aids you set on your own. Aids never change the war: the reality does that.</p>
        <details class="aid-list"${UI.aidOpen ? " open" : ""}><summary>Set each aid on its own${changed ? ` (${changed} changed)` : ""}</summary>
        <table class="aids">${PS.AID_LIST.map(([k, n, note]) => line(n, esc(note), sw(k, n))).join("")}</table></details>
        <h3>Controls</h3>
        <div class="row">${Object.entries(PS.STEER).map(([k, n]) => pill(PS.prefs.steer === k, n, "steer:" + k)).join("")}</div>
        <p class="note">${PS.modern() ? "The keys, and the mouse too: click the chart to steer for a point, drag through the periscope to train it." : "<kbd>W</kbd> <kbd>S</kbd> the telegraph, <kbd>A</kbd> <kbd>D</kbd> the helm; the arrows work the station in front of you, and a click on a ship locks it. A gamepad works too."}</p>
        <h3>Look</h3>
        <table class="aids">${line("Scanlines", "Fine dark lines over the screen, like an old television.", toggle("scan", PS.prefs.scanlines, "Scanlines"))}
        ${line("Screen shake", "The boat jolts when depth charges go off close." + (PS.calm() ? " Off to begin with, as this computer asks for less motion." : ""), toggle("shake", PS.prefs.shake, "Screen shake"))}</table>
        <h3>Sound</h3>
        <table class="aids">${line("Sound", "Diesels, motors, screws, pings, charges; the theme on the title. <kbd>M</kbd> switches it anywhere.", toggle("mute", !PS.SFX.muted, "Sound"))}</table>
        <h3>Game speed</h3>
        <div class="row">${Object.entries(PS.SPEEDS).map(([k, [n]]) => pill(PS.prefs.speed === k, n, "speed:" + k)).join("")}</div>
        <p class="note">Relaxed slows the whole game down, Brisk speeds it up. Time compression works on top of it.</p>
        <h3>This browser</h3>
        <table class="aids">${line("Resume a game", "Leave an action in the middle and come back to it. A patrol is always kept.", toggle("resume", PS.prefs.resume, "Resume a game"))}</table>
        <div class="row"><button data-set="forget" class="danger">Forget everything</button></div>
        <p class="note">Clears everything Puma Service keeps in this browser: the career, the service record, a game in progress, and these settings.</p>`; },
      onClick: async (b, api) => {
        const v = b.dataset.set; if (!v) return;
        if (v === "forget") {
          if (await UI.ask("Forget everything Puma Service has saved in this browser: the career, the service record, a game in progress, and your settings? This cannot be undone.", "Forget everything")) PS.forgetEverything();
          return;
        }
        const [k, a] = v.split(":");
        if (k === "aids") PS.setAids(a);
        else if (k === "aidt") PS.setAid(a, !PS.aid(a));
        else if (k === "dreal") { PS.prefs.real[a] = !PS.prefs.real[a]; PS.savePrefs(); }
        else if (k === "steer") { PS.prefs.steer = a; PS.savePrefs(); }
        else if (k === "scan") { PS.prefs.scanlines = !PS.prefs.scanlines; PS.savePrefs(); PS.game.applyLook(); }
        else if (k === "shake") { PS.prefs.shake = !PS.prefs.shake; PS.savePrefs(); }
        else if (k === "resume") { PS.prefs.resume = !PS.prefs.resume; PS.savePrefs(); }
        else if (k === "mute") PS.game.toggleMute();
        else if (k === "speed") { PS.prefs.speed = a; PS.savePrefs(); PS.game.applySpeed(); }
        PS.game.syncAids();
        api.refresh();
      },
      onClose: () => { const f = UI.settingsAfter; UI.settingsAfter = null; if (f) f(); },
    });
  }
  UI.settings = after => { UI.settingsAfter = after; showSettings(); };

  /* ---- Help and About ---- */
  /* the angle on the bow, drawn: the target's course, the line of sight to you, the angle between */
  const AOB = `<figure class="aob"><svg viewBox="0 0 160 120" width="160" height="120" aria-hidden="true">
    <path d="M70 20 L82 20 L86 44 L82 70 L70 70 L66 44 Z" fill="currentColor" opacity=".55"/>
    <path d="M76 18 L76 4" stroke="currentColor" stroke-width="2"/><path d="M71 9 L76 2 L81 9" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M76 44 L140 108" stroke="#e6bd6a" stroke-width="2" stroke-dasharray="4 3"/>
    <circle cx="140" cy="108" r="5" fill="#e6bd6a"/>
    <path d="M76 26 A18 18 0 0 1 89 31" fill="none" stroke="#e6bd6a" stroke-width="2"/>
    <text x="92" y="28" fill="#e6bd6a" font-size="11" font-family="Barlow Semi Condensed, sans-serif">45°</text>
    <text x="118" y="100" fill="currentColor" font-size="11" font-family="Barlow Semi Condensed, sans-serif">you</text></svg>
    <figcaption><b>Angle on the bow</b> is the angle between the target's bow and the line to you: 0 is bow on, 90 is beam on, 180 is stern on. Here, starboard 45: you are off its starboard bow.</figcaption></figure>`;
  const keys = rows => `<table class="keys">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  UI.helpTabs = () => [
    ["The boat", `<p><b>Sink the Wolf Empire's merchant ships, and live.</b> On the surface the diesels drive her and charge the battery; under the water the battery does everything, and runs down the faster you go.</p>
      <p>The <b>telegraph</b> (<kbd>W</kbd> <kbd>S</kbd>) orders her speed a bell at a time: Back, Stop, 1/3, 2/3, Standard, Full, Flank. The <b>helm</b> (<kbd>A</kbd> <kbd>D</kbd>) orders her course: a tap turns it five degrees, a hold swings it.</p>
      <p>Periscope depth is ${C.PD} feet (<kbd>P</kbd>); <kbd>Q</kbd> <kbd>E</kbd> take her up and down; <kbd>U</kbd> surfaces; <kbd>C</kbd> crash dives, at full speed. Below the <b>test depth</b> the hull groans; below the <b>crush depth</b> it fails. Damage lowers the crush depth.</p>
      <p>Time compression (<kbd>+</kbd> <kbd>−</kbd>) is held back when ships are near; the clock says why.</p>`],
    ["The attack", `${AOB}<p><b>Lock a target</b> (<kbd>T</kbd>) at the periscope or the bridge. The <b>TDC</b>, the torpedo data computer, tracks its bearing and range and works out the shot: <b>Gyro</b> is how far the torpedo turns after it leaves the tube (R right, L left), <b>Run</b> how far it travels to meet her. A green lamp means a solution: <kbd>Space</kbd> fires.</p>
      <p>With <b>angle on bow by eye</b>, you set it yourself: <kbd>[</kbd> <kbd>]</kbd> for the angle, <kbd>,</kbd> <kbd>.</kbd> for the speed, <kbd>R</kbd> for a stadimeter range.</p>
      <p>The best shot is from ahead of the target, 1,000 to 2,000 yards off its track, at 90°. A spread (<kbd>V</kbd>) fans the next shots across her, a press of <kbd>Space</kbd> for each, to cover a bad guess. <kbd>F</kbd> picks the forward or after tubes.</p>
      <p>The crew's reports give true bearings; TRUE above the periscope glass is where it is looking.</p>`],
    ["Escorts and the war", `<p><b>Escorts</b> hear you when you are fast and see you when you show. When one has you, go deep (<kbd>E</kbd>), slow (<kbd>S</kbd>) and quiet (<kbd>X</kbd> runs silent), and turn across its line. They give up, in time. While they hunt you the key strip turns red, with the keys to get away.</p>
      <p><b>Aircraft</b> come by day near the Empire's islands. When the lookouts call one, dive (<kbd>C</kbd>).</p>
      <p>On <b>patrol</b>, sail to your zone, find a convoy, and come home to a base on the surface (<kbd>O</kbd> to tie up). The torpedoes improve as the war goes on; the hunters do too.</p>`],
    ["Keys", keys([["Telegraph", "<kbd>W</kbd> <kbd>S</kbd>, a bell at a time"], ["Helm", "<kbd>A</kbd> <kbd>D</kbd>, a tap five degrees, a hold to swing"], ["Depth", "<kbd>Q</kbd> <kbd>E</kbd> or <kbd>PgUp</kbd> <kbd>PgDn</kbd>; <kbd>P</kbd> periscope depth, <kbd>U</kbd> surface, <kbd>C</kbd> crash dive"],
      ["Stations", "<kbd>1</kbd> bridge, <kbd>2</kbd> periscope, <kbd>3</kbd> instruments, <kbd>4</kbd> chart, <kbd>5</kbd> damage; <kbd>Tab</kbd> the next, <kbd>Shift</kbd> <kbd>Tab</kbd> the one before"],
      ["Periscope", "<kbd>←</kbd> <kbd>→</kbd> train, <kbd>↑</kbd> <kbd>↓</kbd> raise and lower, <kbd>Z</kbd> high or low power"],
      ["Bridge", "<kbd>←</kbd> <kbd>→</kbd> look, <kbd>↑</kbd> <kbd>↓</kbd> the glasses, <kbd>G</kbd> man the gun; manned, <kbd>←</kbd> <kbd>→</kbd> lay it and <kbd>↑</kbd> <kbd>↓</kbd> its range"],
      ["Elsewhere", "on the instruments, the chart and the damage report the arrows are the helm and the telegraph; <kbd>Z</kbd> zooms the chart"],
      ["Target", "<kbd>T</kbd> lock (again: the next ship), <kbd>R</kbd> stadimeter range, <kbd>[</kbd> <kbd>]</kbd> angle on bow, <kbd>,</kbd> <kbd>.</kbd> her speed"],
      ["Fire", "<kbd>Space</kbd>, a torpedo a press; <kbd>F</kbd> forward or after tubes, <kbd>V</kbd> a spread of one to four"],
      ["Time", "<kbd>+</kbd> <kbd>−</kbd> faster and slower, <kbd>Backspace</kbd> back to 1x"],
      ["Shift", "held: finer dials, a faster helm and periscope, the gun's range by 500; <kbd>Shift</kbd> <kbd>Z</kbd> zooms the chart out"],
      ["Mouse", "a click on a ship locks it, at the periscope, the bridge or the chart"],
      ["Other", "<kbd>6</kbd> captain's log, <kbd>X</kbd> silent running, <kbd>Y</kbd> radar, <kbd>O</kbd> tie up at a base, <kbd>L</kbd> Classic or Field aids, <kbd>M</kbd> sound, <kbd>?</kbd> these keys, <kbd>Esc</kbd> pause"]]) +
      `<p class="note">The keys are where they sit on a US keyboard; where the browser can tell, each shows the letter on your own.</p>`],
    ["Gamepad", keys([["Sticks", "<kbd>pad:L-stick</kbd> the helm, flicked up or down the telegraph; <kbd>pad:R-stick</kbd> trains the periscope, looks round, lays the gun"],
      ["Buttons", "<kbd>pad:A</kbd> fire, <kbd>pad:B</kbd> periscope up or down, <kbd>pad:X</kbd> lock, <kbd>pad:Y</kbd> power, the glasses, the chart's zoom, and at a base tie up"],
      ["D-pad", "<kbd>pad:dU</kbd> <kbd>pad:dD</kbd> depth (the gun's range, when it is manned), <kbd>pad:dL</kbd> the tubes, <kbd>pad:dR</kbd> man the gun"],
      ["Stick clicks", "<kbd>pad:L-click</kbd> crash dive, <kbd>pad:R-click</kbd> up a level: periscope depth, then the surface"],
      ["Shoulders", "<kbd>pad:LB</kbd> <kbd>pad:RB</kbd> stations, <kbd>pad:LT</kbd> <kbd>pad:RT</kbd> time"],
      ["Back, Start", "<kbd>pad:Back</kbd> alone the chart, <kbd>pad:Start</kbd> pause and resume"],
      ["Back held", "<kbd>pad:A</kbd> spread, <kbd>pad:B</kbd> silent running, <kbd>pad:X</kbd> stadimeter, <kbd>pad:Y</kbd> radar, <kbd>pad:dU</kbd> <kbd>pad:dD</kbd> angle on bow, <kbd>pad:dL</kbd> <kbd>pad:dR</kbd> her speed, <kbd>pad:LB</kbd> log, <kbd>pad:RB</kbd> aids, <kbd>pad:LT</kbd> back to 1x, <kbd>pad:Start</kbd> this help"],
      ["Menus", "the d-pad moves, <kbd>pad:A</kbd> chooses, <kbd>pad:B</kbd> goes back, <kbd>pad:LB</kbd> <kbd>pad:RB</kbd> turn these pages"]]) + `<p class="gk-credit">${CREDIT}</p>`],
  ];
  UI.help = (tab = 0, after) => UI.open("Help", { wide: true, tab, tabs: UI.helpTabs(), onClose: after });
  UI.aboutHTML = () => `<p><b>Puma Service</b> is a remake of <i>Silent Service</i> (MicroProse, 1985) for the Commodore 64: a fleet submarine against the convoys, from the periscope, the bridge and the chart.</p>
    <p>The boats, the ships, the islands and the war are our own. No MicroProse code, art, sound or text is used.</p>
    <p class="gk-credit">${CREDIT}</p>`;
  UI.about = after => UI.open("About", { html: UI.aboutHTML, onClose: after });
})();
