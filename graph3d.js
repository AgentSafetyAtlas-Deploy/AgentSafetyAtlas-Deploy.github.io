// Shared 3-D graph canvas for 路径: the candidate cluster and single-paper views of the star map, and the paper network of
// the research desk. Positions come from the home sky's 3-D UMAP of SPECTER2 vectors (data/starmap-3d.json), so nearness
// keeps meaning "similar content", never "cites". The view turns slowly (paused on hover; off when `turning()` is false),
// drags or arrow keys turn it, hovering a node names it and lights up its links, and a click goes through the page's own
// click handler: the canvas carries the hovered node's id in a data attribute (spec.attr), so delegation works unchanged.
let xyzById = null;
export async function loadXYZ() {
  if (!xyzById) xyzById = fetch('./data/starmap-3d.json').then(r => r.ok ? r.json() : null).catch(() => null)
    .then(d => new Map((d?.ids || []).map((id, k) => [id, d.xyz[k]])));
  return xyzById;
}

const hash = (s, k = 0) => {let h = 2166136261 ^ k; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 100000) / 100000;};

export function eigen3(A) { // eigenvectors of a symmetric 3×3 matrix (Jacobi rotations), as rows
  const a = A.map(r => [...r]), v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 12; sweep++) for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
    if (Math.abs(a[p][q]) < 1e-12) continue;
    const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]), c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < 3; k++) {const x = a[k][p], y = a[k][q]; a[k][p] = c * x - s * y; a[k][q] = s * x + c * y;}
    for (let k = 0; k < 3; k++) {const x = a[p][k], y = a[q][k]; a[p][k] = c * x - s * y; a[q][k] = s * x + c * y;}
    for (let k = 0; k < 3; k++) {const x = v[k][p], y = v[k][q]; v[k][p] = c * x - s * y; v[k][q] = s * x + c * y;}
  }
  return [0, 1, 2].map(k => [v[0][k], v[1][k], v[2][k]]);
}
// principal axes of centred points, longest first
export function principalAxes(pts) {
  const C = [0, 1, 2].map(a => [0, 1, 2].map(b => pts.reduce((s, p) => s + p[a] * p[b], 0) / Math.max(1, pts.length))), V = eigen3(C);
  const ev = V.map(v => [0, 1, 2].reduce((s, a) => s + v[a] * [0, 1, 2].reduce((t, b) => t + C[a][b] * v[b], 0), 0));
  return [0, 1, 2].sort((a, b) => ev[b] - ev[a]).map(k => V[k]);
}

// A local group (a candidate cluster, a direction's papers): re-centred, turned to its own principal axes, spread (part
// linear, part rank order on each axis, as in the flat layouts) and nudged apart; the longest axis is drawn longer so the
// cloud fills a wide frame. raw[n] is [x, y, z] or null (missing from an older layout: placed near the middle).
export function spread3d(raw, keys, stretch = 1.7) {
  const have = raw.filter(Boolean), c = [0, 1, 2].map(k => have.length ? have.reduce((s, p) => s + p[k], 0) / have.length : 0);
  let pts = raw.map((p, n) => p ? p.map((x, k) => x - c[k]) : [0, 1, 2].map(k => (hash(keys[n], 11 + k) - 0.5) * 0.02));
  const axes = principalAxes(pts);
  pts = pts.map(p => axes.map(v => p[0] * v[0] + p[1] * v[1] + p[2] * v[2]));
  for (let k = 0; k < 3; k++) {
    const vals = pts.map(p => p[k]), lo = Math.min(...vals), hi = Math.max(...vals), rank = Array(vals.length);
    vals.map((x, n) => [x, n]).sort((a, b) => a[0] - b[0]).forEach(([, n], r) => rank[n] = vals.length > 1 ? r / (vals.length - 1) : 0.5);
    pts.forEach((p, n) => p[k] = (0.35 * (hi > lo ? (vals[n] - lo) / (hi - lo) : 0.5) + 0.65 * rank[n]) * 2 - 1);
  }
  const m = pts.length, minD = 0.5 * Math.cbrt(8 / Math.max(1, m));
  for (let it = 0; it < 40; it++) for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) {
    const dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1], dz = pts[b][2] - pts[a][2], d = Math.hypot(dx, dy, dz) || 1e-6;
    if (d < minD) {const f = (minD - d) / 2 / d; pts[a][0] -= dx * f; pts[a][1] -= dy * f; pts[a][2] -= dz * f; pts[b][0] += dx * f; pts[b][1] += dy * f; pts[b][2] += dz * f;}
  }
  return pts.map(p => [p[0] * stretch, p[1], p[2]]);
}

const LINES = {
  cites: ['#8fd3c4', [], true], shared: ['#c9b8f0', [4, 4]], cocited: ['#f0c98a', [7, 3, 1.5, 3]], similar: ['#9fb8b2', [1.5, 3.5]],
  reading: ['#d4e966', [6, 4]], path: ['#e6f28a', [], true],
};

// spec: {pts, links: [[a, b, kind, lit?]], fill[q], rad[q], glow[q], dim[q], ring (index or -1), fit: [w, h], turning(),
//        tip(q) → html, attr (dataset key, e.g. 'skyStar'), idOf(q)}; label buttons inside host carry data-g3="<index>".
export function mountGraph3d(host, spec) {
  const {pts, links, fill, rad, glow = [], dim = [], ring = -1, fit = [0.25, 0.3], turning, tip: tipOf, attr, idOf} = spec;
  const n = pts.length, canvas = host.querySelector('canvas'), g = canvas.getContext('2d');
  const tip = host.querySelector('[data-g3-tip]'), labelEls = [...host.querySelectorAll('[data-g3]')];
  const nbr = Array.from({length: n}, () => new Set()); for (const [a, b] of links) {nbr[a].add(b); nbr[b].add(a);}
  const anyLit = links.some(l => l[3]);
  const st = {yaw: 0.25, pitch: -0.22, zoom: 1, drag: null, hover: -1, raf: 0, last: 0};
  const P = new Float32Array(n * 3), order = [...Array(n).keys()], D = 4.2;
  let W = 0, H = 0, dpr = 1, R = 1, k = 1;
  const resize = () => {const r = canvas.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; R = Math.min(W * fit[0], H * fit[1]); k = Math.max(0.7, Math.min(1.15, W / 1000));};
  const arrow = (x1, y1, x2, y2, back) => {const a = Math.atan2(y2 - y1, x2 - x1), x = x2 - Math.cos(a) * back, y = y2 - Math.sin(a) * back, h = 5.5 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x - h * Math.cos(a - 0.42), y - h * Math.sin(a - 0.42)); g.lineTo(x - h * Math.cos(a + 0.42), y - h * Math.sin(a + 0.42)); g.closePath(); g.fill();};
  function frame(now) {
    if (!host.isConnected) return;
    const dt = Math.min(0.05, (now - (st.last || now)) / 1000); st.last = now;
    const spin = turning() && !st.drag && st.hover < 0;
    if (spin) st.yaw += 0.12 * dt;
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    for (let q = 0; q < n; q++) {
      const [x, y, z] = pts[q], x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, s = D / (D - z2);
      P[q * 3] = W / 2 + x1 * R * st.zoom * s; P[q * 3 + 1] = H / 2 - y1 * R * st.zoom * s; P[q * 3 + 2] = z2;
    }
    order.sort((a, b) => P[a * 3 + 2] - P[b * 3 + 2]);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7); bg.addColorStop(0, '#12312d'); bg.addColorStop(1, '#081614');
    g.globalAlpha = 1; g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const h = st.hover, front = q => 0.35 + 0.65 * (P[q * 3 + 2] + 1) / 2, sz = q => rad[q] * k * Math.sqrt(st.zoom) * D / (D - P[q * 3 + 2]);
    // links: faint and depth-shaded; links lit by the page (a selected paper, a connection) stay bright; with a node
    // hovered, only its own links are lit
    g.lineWidth = 1;
    for (const pass of [0, 1]) for (const [a, b, kind, lit] of links) {
      const mine = h >= 0 ? (a === h || b === h) : !!lit; if ((pass === 1) !== mine) continue;
      const [col, dash, arrowed] = LINES[kind] || LINES.similar, depth = (front(a) + front(b)) / 2;
      g.globalAlpha = mine ? 0.95 : h >= 0 || anyLit ? 0.05 : (kind === 'cites' ? 0.1 : 0.08) + 0.22 * depth;
      g.strokeStyle = g.fillStyle = col; g.lineWidth = kind === 'path' || kind === 'reading' ? 2 : 1;
      g.setLineDash(dash);
      g.beginPath(); g.moveTo(P[a * 3], P[a * 3 + 1]); g.lineTo(P[b * 3], P[b * 3 + 1]); g.stroke();
      if (arrowed && (mine || (h < 0 && !anyLit))) {g.setLineDash([]); arrow(P[a * 3], P[a * 3 + 1], P[b * 3], P[b * 3 + 1], sz(b) + 1.5);}
    }
    g.setLineDash([]);
    const isLit = q => h >= 0 ? q === h || q === ring || nbr[h].has(q) : !dim[q];
    for (const q of order) {
      const x = P[q * 3], y = P[q * 3 + 1], r = sz(q), lit = isLit(q);
      const a = lit ? front(q) * (h >= 0 ? 1.25 : 1) : 0.12;
      if (glow[q] && lit) {const gl = g.createRadialGradient(x, y, 0, x, y, r * 4); gl.addColorStop(0, 'rgba(230,242,138,0.35)'); gl.addColorStop(1, 'rgba(230,242,138,0)'); g.globalAlpha = Math.min(1, a); g.fillStyle = gl; g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);}
      g.globalAlpha = Math.min(1, a); g.fillStyle = fill[q]; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      g.strokeStyle = 'rgba(6,19,17,0.8)'; g.lineWidth = 1; g.stroke();
    }
    if (ring >= 0) {g.globalAlpha = 1; g.strokeStyle = '#d4e966'; g.lineWidth = 3; g.beginPath(); g.arc(P[ring * 3], P[ring * 3 + 1], sz(ring) + 1.5, 0, 6.2832); g.stroke();}
    if (h >= 0) {g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(P[h * 3], P[h * 3 + 1], sz(h) + 3, 0, 6.2832); g.stroke();}
    // names: nearest first; one that would overlap a placed name fades back
    const placed = [];
    for (const L of labelEls.map(el => ({el, q: +el.dataset.g3})).sort((a, b) => P[b.q * 3 + 2] - P[a.q * 3 + 2])) {
      const x = P[L.q * 3], y = P[L.q * 3 + 1] - sz(L.q) - 11, w = L.el.offsetWidth || 120, box = [x - w / 2, y - 9, x + w / 2, y + 9];
      const clash = placed.some(b => box[0] < b[2] && b[0] < box[2] && box[1] < b[3] && b[1] < box[3]); if (!clash) placed.push(box);
      L.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      L.el.style.opacity = !isLit(L.q) ? 0.12 : clash ? 0.15 : (0.4 + 0.6 * (P[L.q * 3 + 2] + 1) / 2).toFixed(2);
      L.el.style.zIndex = clash ? 1 : Math.round(50 + 40 * P[L.q * 3 + 2]);
    }
    st.raf = spin || st.drag ? requestAnimationFrame(frame) : 0;
  }
  const start = () => {if (!st.raf) {st.last = 0; st.raf = requestAnimationFrame(frame);}};
  const nearest = (mx, my) => {let best = -1, bd = Infinity; for (let q = 0; q < n; q++) {const dx = P[q * 3] - mx, dy = P[q * 3 + 1] - my, d = dx * dx + dy * dy, lim = Math.max(10, rad[q] * k + 5); if (d < lim * lim && d - P[q * 3 + 2] * 40 < bd) {bd = d - P[q * 3 + 2] * 40; best = q;}} return best;};
  const hover = q => {
    st.hover = q;
    if (q >= 0) {canvas.dataset[attr] = idOf(q); canvas.style.cursor = 'pointer'; tip.innerHTML = tipOf(q); tip.hidden = false;}
    else {delete canvas.dataset[attr]; canvas.style.cursor = 'grab'; tip.hidden = true;}
  };
  canvas.addEventListener('pointerdown', e => {st.drag = {x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, moved: false}; canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (st.drag) {
      const dx = e.clientX - st.drag.x, dy = e.clientY - st.drag.y;
      if (Math.hypot(dx, dy) > 3) {st.drag.moved = true; hover(-1);}
      st.yaw = st.drag.yaw + dx * 0.008; st.pitch = Math.max(-1.3, Math.min(1.3, st.drag.pitch + dy * 0.006)); start(); return;
    }
    const q = nearest(mx, my); if (q !== st.hover) {hover(q); start();}
    if (q >= 0) {tip.style.left = Math.min(W - 300, mx + 14) + 'px'; tip.style.top = Math.min(H - 60, my + 14) + 'px';}
  });
  canvas.addEventListener('pointerup', () => {st.drag = null; start();});
  canvas.addEventListener('pointerleave', () => {if (!st.drag) {hover(-1); start();}});
  canvas.addEventListener('keydown', e => {const d = {ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12]}[e.key]; if (!d) return; e.preventDefault(); st.yaw += d[0]; st.pitch = Math.max(-1.3, Math.min(1.3, st.pitch + d[1])); start();});
  for (const el of labelEls) {el.addEventListener('mouseenter', () => {hover(+el.dataset.g3); tip.hidden = true; start();}); el.addEventListener('mouseleave', () => {hover(-1); start();});}
  new ResizeObserver(() => {if (host.isConnected) {resize(); start();}}).observe(canvas);
  resize(); start();
  return {zoom(f) {st.zoom = Math.max(0.5, Math.min(4, st.zoom * f)); start();}, reset() {st.zoom = 1; st.yaw = 0.25; st.pitch = -0.22; start();}};
}
