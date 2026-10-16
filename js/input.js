/* Puma Service -- keys and pads, turned into orders for the next step.
 *
 * W and S are the telegraph, A and D the helm, wherever you are. The arrows
 * mean what the station in front of you needs, as a 1985 joystick did: at
 * the periscope they train it and raise it; on the bridge they look round
 * (and lay the gun); on the chart and the instruments they are the helm and
 * the telegraph again. Holding the helm swings the ordered course, at the
 * same speed in real time whatever the time compression: so a held key
 * never turns the boat further than you meant. */
"use strict";
(() => {
  const I = PS.Input = { held: new Set(), queue: [], pad: new Set(), padPrev: new Set(), stick: null, rstick: null, device: "keys", heldT: {}, tapD: 0 };
  const BIND = {
    KeyW: "tU", KeyS: "tD", KeyA: "hL", KeyD: "hR",
    ArrowUp: "aU", ArrowDown: "aD", ArrowLeft: "aL", ArrowRight: "aR",
    PageUp: "shallower", KeyQ: "shallower", PageDown: "deeper", KeyE: "deeper",
    KeyU: "surface", KeyP: "pd", KeyC: "crash",
    KeyZ: "zoom", KeyT: "lock", KeyR: "range",
    BracketLeft: "aobL", BracketRight: "aobR", Comma: "spdD", Period: "spdU",
    Space: "fire", KeyF: "bank", KeyV: "spread", KeyG: "gun", KeyX: "silent", KeyY: "radar",
    Equal: "tcU", NumpadAdd: "tcU", Minus: "tcD", NumpadSubtract: "tcD", Backspace: "tc1",
    Digit1: "st1", Digit2: "st2", Digit3: "st3", Digit4: "st4", Digit5: "st5", Digit6: "st6",
    F1: "st1", F2: "st2", F3: "st3", F4: "st4", F6: "st5", F7: "st6", Tab: "stNext",
    Escape: "pause", KeyL: "aids", KeyO: "dock",
  };
  I.BIND = BIND;
  I.actionFor = code => BIND[code] || null;
  I.clear = () => { I.held.clear(); I.pad.clear(); I.queue.length = 0; I.stick = null; I.rstick = null; I.heldT = {}; };
  I.push = a => I.queue.push(a);
  I.down = (ev, a) => { I.device = "keys"; I.held.add(a); if (!ev.repeat) I.heldT[a] = performance.now(); };
  I.up = ev => { const a = BIND[ev.code]; if (a) { I.held.delete(a); delete I.heldT[a]; } };
  const on = a => I.held.has(a) || I.pad.has(a);
  /* how long a key has been held, ms (0 if not) */
  const heldFor = a => I.heldT[a] ? performance.now() - I.heldT[a] : 0;

  /* the continuous part of the orders, for one step of stepMs real milliseconds */
  I.cmd = (S, ui, stepMs) => {
    const c = { dHdg: 0, dTrain: 0, dGun: 0, acts: I.queue.splice(0) };
    const sec = stepMs / 1000, fast = I.held.has("shift") ? 3 : 1, st = ui.station;
    /* the helm: A and D everywhere; the arrows on the chart and the instruments */
    let h = 0;
    if (on("hL") || ((st === "chart" || st === "panel" || st === "damage") && on("aL"))) h -= 1;
    if (on("hR") || ((st === "chart" || st === "panel" || st === "damage") && on("aR"))) h += 1;
    if (I.stick && Math.abs(I.stick.x) > 0.3) h += I.stick.x;
    const helmKey = ["hL", "hR", "aL", "aR"].find(k => on(k));
    if (h && (!helmKey || heldFor(helmKey) > 220 || I.stick)) c.dHdg = h * 32 * PS.DEG * sec * fast;
    c.dHdg += I.tapD; I.tapD = 0;
    /* the periscope, or the bridge's glasses, or the gun */
    let tr = 0;
    if ((st === "scope" || st === "bridge") && on("aL")) tr -= 1;
    if ((st === "scope" || st === "bridge") && on("aR")) tr += 1;
    if (I.rstick && Math.abs(I.rstick.x) > 0.25) tr += I.rstick.x;
    const hi = S && S.sub.scope.hi;
    if (tr) {
      const rate = (st === "scope" ? (hi ? 6 : 20) : ui.bino ? 8 : 30) * PS.DEG * sec * fast * tr;
      if (st === "bridge" && S && S.sub.gun.on) c.dGun = rate;
      else if (st === "bridge") ui.look = PS.normAng(ui.look + rate);
      else c.dTrain = rate;
    }
    return c;
  };
  /* a tap of the helm: five degrees at once, before the hold takes over */
  I.tapHelm = d => { I.tapD += d * 5 * PS.DEG; };

  /* ---- gamepads ---- */
  I.pollPad = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    let sx = 0, sy = 0, rx = 0, ry = 0;
    for (const p of pads) {
      if (!p) continue;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      sx = p.axes[0] || 0; sy = p.axes[1] || 0; rx = p.axes[2] || 0; ry = p.axes[3] || 0;
      if (b(0)) now.add("fire"); if (b(1)) now.add("scope"); if (b(2)) now.add("lock"); if (b(3)) now.add("zoom");
      if (b(4)) now.add("stPrev"); if (b(5)) now.add("stNext");
      if (b(6)) now.add("tcD"); if (b(7)) now.add("tcU");
      if (b(8)) now.add("st4"); if (b(9)) now.add("pause");
      if (b(12)) now.add("shallower"); if (b(13)) now.add("deeper"); if (b(14)) now.add("bank"); if (b(15)) now.add("gun");
    }
    I.stick = Math.hypot(sx, sy) > 0.3 ? { x: sx, y: sy } : null;
    I.rstick = Math.hypot(rx, ry) > 0.25 ? { x: rx, y: ry } : null;
    /* the left stick flicked up or down: the telegraph, a bell at a time */
    const flick = sy < -0.75 ? "tU" : sy > 0.75 ? "tD" : null;
    if (flick) now.add(flick);
    const fresh = [...now].filter(a => !I.padPrev.has(a));
    if (fresh.length || I.stick || I.rstick) I.device = "pad";
    I.padPrev = now;
    return fresh;
  };
})();
