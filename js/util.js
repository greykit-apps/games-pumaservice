/* Puma Service -- the namespace and the small helpers everything shares.
 *
 * DOM-free: tools/sim-check.js loads this file, and the engine, under node.
 * Nothing here may read the clock or Math.random: the engine's dice are
 * PS.rand(S), so a patrol is the same patrol every time it is sailed from
 * the same seed and the same orders.
 *
 * The sea is one plane in yards: x east, y south (down the chart), headings
 * in radians from north, growing clockwise. Depths are feet, speeds knots,
 * time game seconds. */
"use strict";
var PS = globalThis.PS || {};
globalThis.PS = PS;

/* mulberry32, stepping the state it is handed: S.rs in a game */
PS.rand = o => {
  let t = (o.rs = (o.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* a private stream, for the map and the art's noise */
PS.mulberry = seed => { const o = { rs: seed | 0 }; return () => PS.rand(o); };
PS.ri = (r, n) => Math.floor(r() * n);
PS.pick = (r, a) => a[Math.floor(r() * a.length)];
/* a normal-ish number, mean 0, about 1 wide: three dice summed */
PS.gauss = r => (r() + r() + r() - 1.5) * 2;

PS.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
PS.lerp = (a, b, t) => a + (b - a) * t;

/* ---- units ---- */
PS.YD_NM = 2025.37;                 /* yards in a nautical mile */
PS.KN = PS.YD_NM / 3600;            /* yards a second at one knot */
PS.DEG = Math.PI / 180;

/* ---- headings: 0 is north, up the chart, growing clockwise ---- */
PS.TAU = Math.PI * 2;
PS.hx = a => Math.sin(a);
PS.hy = a => -Math.cos(a);
PS.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
PS.angTo = (ax, ay, bx, by) => PS.normAng(Math.atan2(bx - ax, -(by - ay)));
PS.angDiff = (a, b) => { let d = (b - a) % PS.TAU; if (d > Math.PI) d -= PS.TAU; else if (d < -Math.PI) d += PS.TAU; return d; };
PS.normAng = a => ((a % PS.TAU) + PS.TAU) % PS.TAU;
PS.turnToward = (a, b, rate) => { const d = PS.angDiff(a, b); return PS.normAng(a + PS.clamp(d, -rate, rate)); };
/* a heading as one of n frames */
PS.frame = (a, n = 32) => ((Math.round(PS.normAng(a) / PS.TAU * n) % n) + n) % n;
/* a heading or bearing in whole degrees, 000 to 359 */
PS.deg3 = a => String(Math.round(PS.normAng(a) / PS.DEG) % 360).padStart(3, "0");

PS.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
PS.num = n => Number(Math.round(n)).toLocaleString("en-US");

/* localStorage, tolerant of a private window or none at all */
PS.store = {
  get(k, d = null) { try { const v = globalThis.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { globalThis.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage */ } },
  del(k) { try { globalThis.localStorage.removeItem(k); } catch (e) { /* no storage */ } },
};
