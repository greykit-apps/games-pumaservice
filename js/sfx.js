/* Puma Service -- sound, all of it synthesised: no audio files.
 *
 * On the surface the diesels chug and the sea washes along the casing;
 * under it, only the motors' whine and, when a ship is near, its screws
 * thrashing in the hydrophones. The dive alarm, the torpedo leaving the
 * tube, a hit far off, a dud's clank, the ping of a hunting escort, depth
 * charges, the hull groaning below its test depth. On the title, a naval
 * anthem of our own, brass, strings and drums: the 1985 game had no music
 * to borrow.
 *
 * Two switches (games-meta STANDARD.md §8, §14): Sound is the master, A.out,
 * and silences everything; Music is the tune alone, on its own bus under it,
 * so the boat and the war sound on without it. */
"use strict";
(() => {
  const A = PS.SFX = { ctx: null, muted: false, musicOn: true, out: null, music: null, loops: {}, tune: null };
  let noiseBuf = null;

  A.unlock = () => {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    try { const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext; A.ctx = new Ctx(); } catch (e) { A.ctx = null; return; }
    const a = A.ctx;
    A.out = a.createGain(); A.out.gain.value = A.muted ? 0 : 0.5; A.out.connect(a.destination);
    A.comp = a.createDynamicsCompressor(); A.comp.threshold.value = -16; A.comp.ratio.value = 4; A.comp.connect(A.out);
    A.music = a.createGain(); A.music.gain.value = A.musicOn ? 1 : 0; A.music.connect(A.comp);
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };
  /* the music alone: the tune stops with it, and starts again from the top when it comes back on */
  A.setMusic = on => { A.musicOn = on; if (A.music) A.music.gain.setTargetAtTime(on ? 1 : 0, A.ctx.currentTime, 0.05); if (!on) A.stopTune(); };
  A.setMuted = m => { A.muted = m; if (A.out) A.out.gain.value = m ? 0 : 0.5; if (m) { A.stopTune(); for (const k of Object.keys(A.loops)) A.loop(k, 0); } };

  function tone(f0, f1, ms, type, vol, dest, at = 0) {
    const a = A.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime + 0.005 + at;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + ms / 1000);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + ms / 1000);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + ms / 1000 + 0.02);
  }
  function hiss(ms, vol, freq, dest, q = 0.8, at = 0, type = "lowpass", f1 = null) {
    const a = A.ctx, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + 0.005 + at;
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + ms / 1000); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + ms / 1000);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + ms / 1000 + 0.02);
  }

  const SOUNDS = {
    menu: d => tone(900, 900, 18, "square", 0.04, d),
    /* the title's signal typing itself out: a teleprinter's short clatter */
    type: d => { for (let i = 0; i < 9; i++) tone(1500 + (i * 397) % 700, 1200, 12, "square", 0.022, d, i * 0.075 + (i % 3) * 0.012); },
    bell: d => { tone(1760, 1760, 120, "triangle", 0.06, d); tone(1760, 1760, 160, "triangle", 0.05, d, 0.14); },
    klaxon: d => { for (let i = 0; i < 2; i++) { tone(260, 520, 420, "sawtooth", 0.07, d, i * 0.62); } },
    crash: d => { for (let i = 0; i < 3; i++) tone(300, 560, 300, "sawtooth", 0.08, d, i * 0.4); hiss(1500, 0.3, 600, d, 0.6, 0.2, "bandpass", 1800); },
    blow: d => hiss(1800, 0.45, 600, d, 0.7, 0, "bandpass", 2400),
    launch: d => { tone(110, 40, 260, "sine", 0.6, d); hiss(700, 0.35, 1200, d, 0.8, 0, "bandpass", 300); hiss(1200, 0.12, 2400, d, 0.6, 0.15, "highpass"); },
    hit: d => { hiss(1800, 0.8, 320, d, 0.5, 0, "lowpass", 60); tone(55, 24, 1500, "sine", 0.7, d); hiss(500, 0.3, 1500, d, 0.4, 0.04); },
    bigHit: d => { SOUNDS.hit(d); for (let i = 1; i < 4; i++) hiss(900, 0.45, 400, d, 0.5, i * 0.22, "lowpass", 80); },
    dud: d => { tone(980, 940, 70, "square", 0.05, d); tone(1460, 1400, 110, "triangle", 0.05, d, 0.03); },
    dc: d => { tone(42, 20, 1800, "sine", 0.9, d); hiss(2200, 0.7, 220, d, 0.5, 0, "lowpass", 40); },
    dcNear: d => { hiss(160, 0.8, 2600, d, 0.5, 0, "bandpass"); tone(60, 22, 2000, "sine", 1, d); hiss(2600, 0.9, 300, d, 0.5, 0.02, "lowpass", 40); for (let i = 0; i < 5; i++) tone(2400 + i * 300, 2200, 50, "square", 0.02, d, 0.05 + i * 0.07); },
    splashes: d => { for (let i = 0; i < 4; i++) hiss(260, 0.12, 900, d, 0.8, i * 0.18, "bandpass", 400); },
    ping: d => { tone(1480, 1470, 700, "sine", 0.09, d); tone(1480, 1470, 500, "sine", 0.03, d, 0.32); },
    pingNear: d => { tone(1480, 1470, 500, "sine", 0.14, d); tone(1480, 1470, 400, "sine", 0.1, d, 0.06); },
    creak: d => { tone(72, 52, 1600, "sawtooth", 0.06, d); tone(140, 96, 1100, "triangle", 0.03, d, 0.3); hiss(900, 0.08, 300, d, 3, 0.1, "bandpass"); },
    gun: d => { hiss(130, 0.6, 1800, d, 0.7, 0, "bandpass"); tone(140, 50, 260, "sine", 0.4, d); },
    shellNear: d => { tone(1900, 620, 380, "sine", 0.04, d); SOUNDS.splash(d); },
    splash: d => { hiss(500, 0.4, 1600, d, 0.6, 0.3, "bandpass", 500); hiss(900, 0.15, 3000, d, 0.5, 0.4, "highpass"); },
    shellHit: d => { hiss(400, 0.7, 1200, d, 0.6, 0, "lowpass", 200); tone(200, 60, 300, "square", 0.08, d); },
    breakup: d => { for (let i = 0; i < 4; i++) tone(90 - i * 8, 40, 1400, "sawtooth", 0.045, d, i * 0.5); hiss(3000, 0.3, 260, d, 0.5, 0.2, "lowpass", 50); },
    plane: d => { tone(115, 108, 2000, "sawtooth", 0.035, d); tone(118, 110, 2000, "sawtooth", 0.03, d); },
    bombs: d => { for (let i = 0; i < 3; i++) { tone(60, 25, 900, "sine", 0.7, d, i * 0.25); hiss(700, 0.5, 400, d, 0.5, i * 0.25, "lowpass", 70); } },
    reloaded: d => { tone(220, 160, 90, "square", 0.04, d); tone(320, 300, 40, "square", 0.03, d, 0.09); },
    relief: d => { tone(660, 660, 160, "triangle", 0.05, d); tone(523, 523, 220, "triangle", 0.05, d, 0.16); tone(392, 392, 420, "triangle", 0.04, d, 0.36); },
    sighted: d => { tone(784, 784, 90, "triangle", 0.05, d); tone(1046, 1046, 140, "triangle", 0.05, d, 0.1); },
    warn: d => { for (let i = 0; i < 3; i++) tone(1300, 1300, 70, "square", 0.06, d, i * 0.14); },
    sunk: d => { [523, 659, 784].forEach((f, i) => tone(f, f, 150, "square", 0.05, d, i * 0.12)); },
    won: d => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f, i === 6 ? 500 : 140, "square", 0.06, d, i * 0.13)); },
    over: d => { [392, 349, 330, 262].forEach((f, i) => tone(f, f, 260, "square", 0.07, d, i * 0.24)); },
  };
  /* name; vol 0..1 (a far charge is quieter) */
  /* the sound's own gain, so a caller can cut it short (disconnect it); undefined when nothing played */
  A.play = (name, vol = 1) => {
    if (A.muted || !A.ctx || !SOUNDS[name] || vol < 0.03) return;
    const g = A.ctx.createGain(); g.gain.value = vol; g.connect(A.comp);
    SOUNDS[name](g);
    setTimeout(() => g.disconnect(), 4200);
    return g;
  };

  /* ---- what keeps sounding: the diesels, the motors, the sea, screws in the hydrophones ---- */
  A.loop = (name, level, pitch = 1) => {
    if (!A.ctx) return;
    let L = A.loops[name];
    if (!L) {
      if (level <= 0 || A.muted) return;
      const a = A.ctx, g = a.createGain();
      g.gain.value = 0; g.connect(A.comp);
      const noise = (type, f, q) => { const s = a.createBufferSource(), fl = a.createBiquadFilter(); s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); return { s, fl }; };
      if (name === "diesel") {
        const n = noise("lowpass", 220, 1), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        am.gain.value = 0.5; lfo.type = "square"; lfo.frequency.value = 9; lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain);
        const hum = a.createOscillator(), hg = a.createGain(); hum.type = "sawtooth"; hum.frequency.value = 46; hg.gain.value = 0.06; hum.connect(hg); hg.connect(g);
        n.fl.connect(am); am.connect(g); n.s.start(); lfo.start(); hum.start();
        L = { g, set: p => { lfo.frequency.setTargetAtTime(6 + p * 6, a.currentTime, 0.3); hum.frequency.setTargetAtTime(40 + p * 14, a.currentTime, 0.3); }, stop: () => { n.s.stop(); lfo.stop(); hum.stop(); } };
      } else if (name === "motor") {
        const o = a.createOscillator(), og = a.createGain(), n = noise("bandpass", 900, 2);
        o.type = "sine"; o.frequency.value = 180; og.gain.value = 0.25; o.connect(og); og.connect(g); n.fl.connect(g); n.s.start(); o.start();
        L = { g, set: p => o.frequency.setTargetAtTime(140 + p * 160, a.currentTime, 0.4), stop: () => { o.stop(); n.s.stop(); } };
      } else if (name === "sea") {
        const n = noise("lowpass", 600, 0.5), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        am.gain.value = 0.6; lfo.frequency.value = 0.18; lg.gain.value = 0.35; lfo.connect(lg); lg.connect(am.gain);
        n.fl.connect(am); am.connect(g); n.s.start(); lfo.start();
        L = { g, set: p => n.fl.frequency.setTargetAtTime(400 + p * 700, a.currentTime, 0.5), stop: () => { n.s.stop(); lfo.stop(); } };
      } else {
        /* screws: a thrash at the shafts' pace */
        const n = noise("bandpass", 420, 1.4), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        am.gain.value = 0.3; lfo.type = "sawtooth"; lfo.frequency.value = 3; lg.gain.value = 0.3; lfo.connect(lg); lg.connect(am.gain);
        n.fl.connect(am); am.connect(g); n.s.start(); lfo.start();
        L = { g, set: p => lfo.frequency.setTargetAtTime(2 + p * 4, a.currentTime, 0.3), stop: () => { n.s.stop(); lfo.stop(); } };
      }
      A.loops[name] = L;
    }
    L.set(pitch);
    const v = A.muted ? 0 : Math.max(0, Math.min(1, level)) * ({ diesel: 0.4, motor: 0.08, sea: 0.22, screws: 0.3 }[name] || 0.2);
    L.g.gain.setTargetAtTime(v, A.ctx.currentTime, 0.2);
  };
  A.stopLoops = () => { for (const [k, L] of Object.entries(A.loops)) { try { L.stop(); } catch (e) { /* already */ } delete A.loops[k]; } };

  /* ---- the title theme: ours. A naval anthem in D minor at 80, the newsreels'
   * march of the war at sea: one sonar ping in the dark over the basses, the
   * low strings coming in like the boat's engines, a military snare and the
   * timpani, then the horns with the theme, then the trumpets taking it up an
   * octave over the full brass, home on a D major chord. It goes round from the
   * strings' entry, so the ping is heard once. Lengths are sixteenths. ---- */
  const NOTE = n => { const m = /^([A-G])(b|#)?(\d)$/.exec(n); const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0); return 440 * Math.pow(2, (k + (+m[3] + 1) * 12 - 69) / 12); };
  const parse = s => s.split(/\s+/).filter(x => x && x !== "|").map(t => { const [n, l] = t.split(":"); return [n === "r" ? 0 : NOTE(n), parseInt(l, 10)]; });
  const HORN = parse(`r:64 |
    D4:8 A4:6 A4:2 | Bb4:4 A4:4 G4:4 F4:4 | A4:8 C5:6 A4:2 | G4:12 E4:4 |
    F4:8 E4:4 D4:4 | G4:6 Bb4:2 D5:8 | D5:4 C5:4 Bb4:4 G4:4 | A4:12 A4:2 C#5:2`);
  const TRUMPET = parse(`r:192 |
    D5:8 A5:6 A5:2 | Bb5:4 A5:4 G5:4 F5:4 | A5:8 C6:6 A5:2 | G5:12 E5:4 |
    F5:8 G5:4 A5:4 | Bb5:8 A5:4 G5:4 | A5:6 G5:2 E5:4 C#5:4 | D5:16`);
  const CH = { Dm: "D3 F3 A3 D4", Bb: "D3 F3 Bb3 D4", F: "C3 F3 A3 C4", C: "C3 E3 G3 C4", Gm: "D3 G3 Bb3 D4", A: "C#3 E3 A3 C#4", A7: "C#3 G3 A3 E4", D: "D3 F#3 A3 D4", D5: "D3 A3" };
  /* each bar: the basses' root, the brass's chord and its level, the drums, the strings (1, or 2 doubled up), a crash */
  const SCORE = [
    { b: "D2", drone: 1, k: "none" },
    { b: "D2", drone: 1, c: "D5", cv: 0.022, k: "roll" },
    { b: "D2", ost: 1, c: "D5", cv: 0.02, k: "quiet" },
    { b: "D2", ost: 1, c: "Dm", cv: 0.02, k: "quiet" },
    { b: "D2", ost: 1, c: "Dm", cv: 0.03, k: "march", x: 0.4 },
    { b: "Bb1", ost: 1, c: "Bb", cv: 0.03, k: "march" },
    { b: "F2", ost: 1, c: "F", cv: 0.03, k: "march" },
    { b: "C2", ost: 1, c: "C", cv: 0.03, k: "march" },
    { b: "D2", ost: 1, c: "Dm", cv: 0.032, k: "march", x: 0.4 },
    { b: "G1", ost: 1, c: "Gm", cv: 0.032, k: "march" },
    { b: "Bb1", ost: 1, c: "Bb", cv: 0.034, k: "march" },
    { b: "A1", ost: 1, c: "A", cv: 0.036, k: "build" },
    { b: "D2", ost: 2, c: "Dm", cv: 0.045, k: "full", x: 1 },
    { b: "Bb1", ost: 2, c: "Bb", cv: 0.045, k: "full" },
    { b: "F2", ost: 2, c: "F", cv: 0.045, k: "full" },
    { b: "C2", ost: 2, c: "C", cv: 0.045, k: "full" },
    { b: "Bb1", ost: 2, c: "Bb", cv: 0.048, k: "full", x: 0.7 },
    { b: "G1", ost: 2, c: "Gm", cv: 0.048, k: "full" },
    { b: "A1", ost: 2, c: "A7", cv: 0.05, k: "build" },
    { b: "D2", c: "D", cv: 0.055, k: "end", x: 1 },
  ];
  /* the engines: an eighth and two sixteenths on each beat, the last beat on the fifth below */
  const OST = [[0, 2], [0, 1], [0, 1], [0, 2], [0, 1], [0, 1], [0, 2], [0, 1], [0, 1], [1, 2], [0, 1], [0, 1]];
  /* the snare's march: A an accent, x a stroke, r a pair of thirty-seconds */
  const MARCH = "A..xx.x.A..xx.rr";
  const BPM = 80, STEP = 60 / BPM / 4, N = SCORE.length * 16, LOOP = 32;
  const EV = Array.from({ length: N }, () => []);
  const put = (t, e) => { if (t >= 0 && t < N) EV[t].push(e); };
  for (const [track, k] of [[HORN, "h"], [TRUMPET, "t"]]) { let t = 0; for (const [f, l] of track) { if (f) put(t, [k, f, l]); t += l; } }
  SCORE.forEach((B, i) => {
    const t0 = i * 16, R = NOTE(B.b), F5 = R * 0.75;
    if (i === 0) put(0, ["p"]);
    if (B.drone) put(t0 + (i ? 0 : 4), ["d", R, i ? 16 : 12, i ? 1 : 0.5]);
    if (B.ost) { let t = 0; for (const [q, l] of OST) { const f = q ? F5 : R; put(t0 + t, ["o", f, l, t % 8 ? 0.7 : 1]); if (B.ost > 1) put(t0 + t, ["o", f * 2, l, 0.45]); t += l; } }
    if (B.c) put(t0, ["c", CH[B.c].split(" ").map(NOTE), 16, B.cv]);
    if (B.x) put(t0, ["x", B.x]);
    const march = v => [...MARCH].forEach((c, s) => { if (c === "A") put(t0 + s, ["s", v]); else if (c === "x") put(t0 + s, ["s", v * 0.55]); else if (c === "r") { put(t0 + s, ["s", v * 0.4]); put(t0 + s, ["s", v * 0.4, 0.5]); } });
    const roll = (from, to, v0, v1, drum) => { for (let s = from; s < to; s++) for (const o of [0, 0.5]) { const v = v0 + (v1 - v0) * (s + o - from) / (to - from); put(t0 + s, drum === "s" ? ["s", v, o] : ["T", R, v, o]); } };
    if (B.k === "roll") roll(8, 16, 0.08, 0.5, "T");
    if (B.k === "quiet") { march(0.3); put(t0, ["T", R, 0.35]); }
    if (B.k === "march") { march(0.55); put(t0, ["T", R, 0.5]); put(t0 + 8, ["T", F5, 0.32]); }
    if (B.k === "full") { march(0.85); put(t0, ["T", R, 0.7]); put(t0 + 8, ["T", F5, 0.5]); put(t0, ["k", 1]); put(t0 + 8, ["k", 0.7]); }
    if (B.k === "build") { roll(0, 16, 0.12, 0.85, "s"); put(t0, ["T", R, 0.6]); roll(12, 16, 0.2, 0.7, "T"); }
    if (B.k === "end") { put(t0, ["T", R, 0.9]); put(t0, ["k", 1]); roll(8, 16, 0.06, 0.45, "T"); }
  });

  A.startTune = () => {
    if (A.muted || !A.musicOn || !A.ctx || A.tune) return;
    const a = A.ctx, g = a.createGain();
    g.gain.value = 0.5; g.connect(A.music);
    /* a hall: everything plays into mix, dry and through a long reverb */
    const mix = a.createGain(), rev = a.createConvolver(), wet = a.createGain();
    const len = a.sampleRate * 2.8 | 0, ir = a.createBuffer(2, len, a.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    rev.buffer = ir; wet.gain.value = 0.32;
    mix.connect(g); mix.connect(rev); rev.connect(wet); wet.connect(g);
    /* the ping's echo off the sea: a long delay that comes back fainter */
    const dl = a.createDelay(2), fb = a.createGain(), echo = a.createGain();
    dl.delayTime.value = 1.1; fb.gain.value = 0.38; echo.gain.value = 0.55;
    dl.connect(fb); fb.connect(dl); dl.connect(echo); echo.connect(mix);
    /* brass: three sawtooths a few cents apart, the filter opening on the attack as a player's breath does */
    const brass = (f, at, dur, vol, bright, vib) => {
      const end = at + dur, lp = a.createBiquadFilter(), e = a.createGain();
      const hi = Math.min(f * 3.6 * bright, 5200);
      lp.type = "lowpass"; lp.Q.value = 1.1;
      lp.frequency.setValueAtTime(Math.min(f * 1.1, 900), at); lp.frequency.linearRampToValueAtTime(hi, at + 0.09); lp.frequency.setTargetAtTime(hi * 0.62, at + 0.12, 0.5);
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(vol, at + 0.055); e.gain.setValueAtTime(vol, Math.max(at + 0.06, end - 0.1)); e.gain.linearRampToValueAtTime(0, end + 0.06);
      lp.connect(e); e.connect(mix);
      let lg = null;
      if (vib && dur > 0.6) {
        const lfo = a.createOscillator(); lg = a.createGain();
        lfo.frequency.value = 5.3; lg.gain.setValueAtTime(0, at); lg.gain.setValueAtTime(0, at + 0.25); lg.gain.linearRampToValueAtTime(f * 0.007, at + 0.7);
        lfo.connect(lg); lfo.start(at); lfo.stop(end + 0.1);
      }
      for (const d of [-7, 0, 6]) {
        const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = d;
        if (lg) lg.connect(o.frequency);
        o.connect(lp); o.start(at); o.stop(end + 0.1);
      }
    };
    /* the low strings: short bowed notes, a sub under them */
    const bow = (f, at, dur, vol) => {
      const lp = a.createBiquadFilter(), e = a.createGain();
      lp.type = "lowpass"; lp.frequency.value = 760; lp.Q.value = 0.8;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(vol, at + 0.012); e.gain.exponentialRampToValueAtTime(vol * 0.35, at + dur); e.gain.linearRampToValueAtTime(0, at + dur + 0.04);
      lp.connect(e); e.connect(mix);
      for (const [type, r, d] of [["sawtooth", 1, -5], ["sawtooth", 1, 5], ["sine", 0.5, 0]]) {
        const o = a.createOscillator(); o.type = type; o.frequency.value = f * r; o.detune.value = d;
        o.connect(type === "sine" ? e : lp); o.start(at); o.stop(at + dur + 0.06);
      }
    };
    /* the basses held in the dark under the ping, swelling */
    const drone = (f, at, dur, vol) => {
      const lp = a.createBiquadFilter(), e = a.createGain(), end = at + dur;
      lp.type = "lowpass"; lp.frequency.value = 420;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(vol, end - 0.2); e.gain.linearRampToValueAtTime(0, end + 0.3);
      lp.connect(e); e.connect(mix);
      for (const [r, d] of [[1, -6], [1, 6], [1.5, 0], [0.5, 0]]) { const o = a.createOscillator(); o.type = r === 0.5 ? "sine" : "sawtooth"; o.frequency.value = f * r; o.detune.value = d; o.connect(r === 0.5 ? e : lp); o.start(at); o.stop(end + 0.35); }
    };
    const noise = (at, type, freq, vol, dec, q = 0.7) => {
      const s = a.createBufferSource(), f = a.createBiquadFilter(), e = a.createGain();
      s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
      e.gain.setValueAtTime(vol, at); e.gain.exponentialRampToValueAtTime(0.001, at + dec);
      s.connect(f); f.connect(e); e.connect(mix); s.start(at, Math.random() * 0.5); s.stop(at + dec + 0.02);
    };
    const thump = (at, f0, f1, vol, dec, type = "sine") => {
      const o = a.createOscillator(), e = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + Math.min(0.08, dec * 0.5));
      e.gain.setValueAtTime(vol, at); e.gain.exponentialRampToValueAtTime(0.001, at + dec);
      o.connect(e); e.connect(mix); o.start(at); o.stop(at + dec + 0.02);
    };
    /* the one ping: the sonar's note, and its echo coming back off the sea */
    const ping = at => {
      const o = a.createOscillator(), e = a.createGain();
      o.type = "sine"; o.frequency.value = 1480;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(0.2, at + 0.01); e.gain.exponentialRampToValueAtTime(0.001, at + 1.6);
      o.connect(e); e.connect(mix); e.connect(dl); o.start(at); o.stop(at + 1.7);
    };
    const DRUM = {
      s: (at, v) => { noise(at, "bandpass", 1900, 0.42 * v, 0.13, 0.7); noise(at, "highpass", 5200, 0.16 * v, 0.09); thump(at, 210, 170, 0.18 * v, 0.06, "triangle"); },
      T: (at, f, v) => { thump(at, f * 1.12, f, 0.75 * v, 1.3); thump(at, f * 2.4, f * 2, 0.12 * v, 0.35); noise(at, "lowpass", 320, 0.18 * v, 0.08); },
      k: (at, v) => thump(at, 90, 42, 0.55 * v, 0.45),
      x: (at, v) => { noise(at, "highpass", 4600, 0.2 * v, 2.4, 0.4); noise(at, "bandpass", 3000, 0.08 * v, 1.2, 0.5); },
    };
    const st = { g, fb, t0: a.currentTime + 0.1, n: 0, timer: null };
    const sched = () => {
      const late = a.currentTime + 0.02 - st.t0;
      if (st.n * STEP < late) st.n = Math.ceil(late / STEP);
      for (let at; (at = st.t0 + st.n * STEP) < a.currentTime + 1.5; st.n++) {
        /* round again from the strings' entry: the ping and the dark are the first time only */
        const i = st.n < N ? st.n : LOOP + (st.n - N) % (N - LOOP);
        for (const e of EV[i]) {
          const k = e[0];
          if (k === "h") brass(e[1], at, e[2] * STEP * 0.96, 0.075, 0.8, 1);
          else if (k === "t") { brass(e[1], at, e[2] * STEP * 0.96, 0.07, 1.3, 1); brass(e[1] / 2, at, e[2] * STEP * 0.96, 0.045, 0.8, 1); }
          else if (k === "c") for (const f of e[1]) brass(f, at, e[2] * STEP, e[3], 0.7, 0);
          else if (k === "o") bow(e[1], at, e[2] * STEP * 0.72, 0.11 * e[3]);
          else if (k === "d") drone(e[1], at, e[2] * STEP, 0.09 * e[3]);
          else if (k === "p") ping(at);
          else if (k === "s") DRUM.s(at + (e[2] || 0) * STEP, e[1]);
          else if (k === "T") DRUM.T(at + (e[3] || 0) * STEP, e[1], e[2]);
          else DRUM[k](at, e[1]);
        }
      }
    };
    sched();
    st.timer = setInterval(sched, 250);
    A.tune = st;
  };
  A.stopTune = () => {
    if (!A.tune) return;
    clearInterval(A.tune.timer);
    const { g, fb } = A.tune;
    g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.15);
    setTimeout(() => { g.disconnect(); fb.disconnect(); }, 1800);
    A.tune = null;
  };
})();
