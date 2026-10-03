/* Axial hex math, pointy-top. No DOM. */
(function (factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.Hex = api;
})(function () {
  const SQRT3 = Math.sqrt(3);
  function key(q, r) { return q + "," + r; }
  function parse(k) {
    const p = k.split(",");
    return { q: +p[0], r: +p[1] };
  }
  function toPixel(q, r, size) {
    return { x: size * SQRT3 * (q + r / 2), y: size * 1.5 * r };
  }
  function round(qf, rf) {
    const sf = -qf - rf;
    let q = Math.round(qf), r = Math.round(rf), s = Math.round(sf);
    const qd = Math.abs(q - qf), rd = Math.abs(r - rf), sd = Math.abs(s - sf);
    if (qd > rd && qd > sd) q = -r - s;
    else if (rd > sd) r = -q - s;
    return { q: q, r: r };
  }
  function fromPixel(x, y, size) {
    const q = (SQRT3 / 3 * x - 1 / 3 * y) / size;
    const r = (2 / 3 * y) / size;
    return round(q, r);
  }
  const DIRS = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];
  function neighbors(q, r) {
    return DIRS.map(function (d) { return { q: q + d.q, r: r + d.r }; });
  }
  function dist(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }
  function corners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
      pts.push({ x: cx + size * Math.cos(a), y: cy + size * Math.sin(a) });
    }
    return pts;
  }
  return { key: key, parse: parse, toPixel: toPixel, fromPixel: fromPixel, round: round, neighbors: neighbors, dist: dist, corners: corners, DIRS: DIRS, SQRT3: SQRT3 };
});
