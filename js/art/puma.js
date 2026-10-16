/* Puma Service -- the captain, who is a puma: your paws on the periscope's
 * training handles and the bridge rail, and the boat's crest, a puma's head
 * on a brass medallion, on the conning tower and the port's papers.
 * (The paw is The Puma Express's, drawn larger.) */
"use strict";
(() => {
  const K = PS.K, M = K.M, P = PS.Puma = {};
  const INK = "#1a120c";
  /* a paw, s pixels across, seen from above, gripping */
  P.paw = (s = 16) => K.get("paw:" + s, () => {
    const c = K.mk(16, 16), g = c.getContext("2d"), T = M.puma;
    K.disc(g, 8, 10, 6, 5, T[2]);
    for (let y = 5; y < 16; y++) for (let x = 2; x < 15; x++) if (K.bayer(x, y) > 0.2 && (x - 8) * (x - 8) / 36 + (y - 10) * (y - 10) / 25 < 1 && y > 10) K.px(g, x, y, T[3]);
    for (const [x, y] of [[3, 5], [6, 3], [10, 3], [13, 5]]) { K.disc(g, x, y, 2, 2, T[2]); K.px(g, x - 1, y - 1, T[1]); }
    K.disc(g, 8, 11, 3, 2, "#c9877a");
    for (const [x, y] of [[3, 5], [6, 3], [10, 3], [13, 5]]) K.px(g, x, y + 1, "#c9877a");
    K.outline(c, INK);
    if (s === 16) return c;
    const o = K.mk(s, s), og = o.getContext("2d"); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, s, s); return o;
  });
  P.pawFlipped = s => K.get("pawF:" + s, () => K.flip(P.paw(s)));
  /* the crest: a puma's head on a brass medallion, 24 square */
  const HEAD = [
    "..KK........KK..",
    ".KdtK......KtdK.",
    ".KttdK....KdttK.",
    ".KtTtdKKKKdtTtK.",
    "..KtTTTTTTTTtK..",
    "..KTTTTTTTTTTK..",
    ".KtTeeTTTTeeTtK.",
    ".KtTKeTTTTeKTtK.",
    ".KttTTTwwTTTttK.",
    "..KtTTwnnwTTtK..",
    "..KdtTwwwwTtdK..",
    "...KdtwKKwtdK...",
    "....KdtwwtdK....",
    ".....KKddKK.....",
  ];
  P.crest = (size = 24) => K.get("crest:" + size, () => {
    const c = K.mk(24, 24), g = c.getContext("2d"), B = M.brass;
    K.disc(g, 12, 12, 11.5, 11.5, INK); K.disc(g, 12, 12, 10.5, 10.5, B[2]); K.disc(g, 11.5, 11.5, 10, 10, B[1]); K.disc(g, 12, 12, 9, 9, "#16213a");
    for (let y = 3; y < 21; y++) for (let x = 3; x < 21; x++) if (Math.hypot(x - 12, y - 12) < 9 && K.bayer(x, y) > 0.82) K.px(g, x, y, "#1f2c48");
    const head = K.map(HEAD, { K: INK, d: M.puma[3], t: M.puma[2], T: M.puma[1], w: M.puma[0], e: "#d8c05a", n: "#c9877a" });
    g.drawImage(head, 4, 6);
    if (size === 24) return c;
    const o = K.mk(size, size), og = o.getContext("2d"); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, size, size); return o;
  });
  /* the crest as a picture for the page's sheets */
  P.crestURL = (size = 48) => { const k = "crestURL:" + size; return P[k] || (P[k] = P.crest(size).toDataURL()); };
})();
