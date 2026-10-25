// Home hero: the Atlas as a 3-D sky. Every star is a paper, placed by a 3-D UMAP of its SPECTER2 vector (data/starmap-3d.json,
// build_sky3d.py), coloured by galaxy and sized by citations. The sky turns slowly (not with reduced motion), drags to turn,
// shows a paper's title on hover and opens it on click; cluster names float at their centroids and open the cluster page.
// Stars are drawn with normal compositing so dense regions keep their galaxy colour instead of adding up to white.
let sky = null, xyz = null;

export async function loadSky() {
  if (!sky) {
    const [s, d] = await Promise.all([fetch('./data/starmap.json').then(r => r.json()), fetch('./data/starmap-3d.json').then(r => r.json())]);
    // coordinates by id: if the 3-D layout is from an older release, works it does not know are left out, never misplaced
    const at = new Map((d.ids || s.ids).map((id, i) => [id, d.xyz[i]]));
    sky = s; xyz = s.ids.map(id => at.get(id) || null);
  }
}

const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, p) => a.map((v, i) => Math.round(v * (1 - p) + b[i] * p));
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const hash = (s, k) => { let h = 2166136261 ^ k; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };

export function mountSky(host, ctx) {
  const {t} = ctx, canvas = host.querySelector('canvas'), g = canvas.getContext('2d'), labelsEl = host.querySelector('.hs-labels'), tip = host.querySelector('.hs-tip');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const n = sky.ids.length, theme = sky.theme, cites = sky.cites;
  // galaxy colours lifted for the dark sky but kept saturated (a little white, never most of it)
  const base = sky.themes.map(th => hexRgb(th.color)), col = base.map(c => mix(c, [255, 255, 255], 0.22)), glow = base.map(c => mix(c, [255, 255, 255], 0.08));
  const maxC = Math.log1p(Math.max(...cites.filter(c => c > 0)));
  const size = new Float32Array(n), bright = new Uint8Array(n), P = new Float32Array(n * 3);
  const order = [...Array(n).keys()].sort((a, b) => cites[b] - cites[a]);
  order.forEach((i, r) => { bright[i] = r < n * 0.02 ? 2 : r < n * 0.1 ? 1 : 0; });
  for (let i = 0; i < n; i++) {
    const v = xyz[i] || [0, 0, 0], c = cites[i] > 0 ? Math.log1p(cites[i]) / maxC : 0;
    P[i * 3] = v[0]; P[i * 3 + 1] = v[1]; P[i * 3 + 2] = v[2];
    size[i] = xyz[i] ? 0.8 + 2.6 * c ** 1.5 + hash(sky.ids[i], 3) * 0.3 : 0;
  }
  // cluster centroids in 3-D for the floating names
  const centre = (k, test, extra) => { let x = 0, y = 0, z = 0, m = 0; for (let i = 0; i < n; i++) if (size[i] && test(i)) { x += P[i * 3]; y += P[i * 3 + 1]; z += P[i * 3 + 2]; m += 1; } return {k, ...extra, x: x / m, y: y / m, z: z / m, m}; };
  const nt = Math.min(14, sky.themes.length);
  const cl = [...sky.themes.slice(0, nt).map((th, k) => centre(k, i => theme[i] === k, {kind: 'theme', name: th.en, id: th.id, theme: k})),
              ...sky.topics.map((tp, j) => centre(nt + j, i => sky.topics_of[i].includes(j), {kind: 'cluster', name: tp.name, theme: tp.theme}))];
  labelsEl.innerHTML = cl.map(c => `<button class="hs-label" data-hs-topic="${c.k}" data-kind="${c.kind}" ${c.kind === 'cluster' ? 'hidden' : ''} style="--c:${css(col[c.theme])}">${ctx.esc(ctx.topicName(c.name))}</button>`).join('');
  const labelEls = [...labelsEl.children];
  // far dust: a fixed field behind the stars
  const dust = Array.from({length: 420}, (_, i) => [hash('d' + i, 1), hash('d' + i, 2), 0.2 + hash('d' + i, 3) * 0.9, hash('d' + i, 4)]);
  const sprites = glow.map(c => { const s = document.createElement('canvas'); s.width = s.height = 64; const q = s.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, css(c, 0.55)); gr.addColorStop(0.3, css(c, 0.18)); gr.addColorStop(1, css(c, 0)); q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return s; });
  const st = {yaw: 0.6, pitch: -0.32, vy: reduce ? 0 : 0.045, drag: null, hover: -1, focusTheme: -1, raf: 0, last: 0, visible: true};
  let W = 0, H = 0, dpr = 1, R = 1, CX = 0, CY = 0;
  const D = 3.1, proj = new Float32Array(n * 3), idx = new Uint32Array(n).map((_, i) => i);
  const resize = () => {
    const r = canvas.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const wide = W > 900; CX = wide ? W * 0.64 : W / 2; CY = wide ? H * 0.47 : H * 0.66; R = wide ? Math.min(W * 0.3, H * 0.6) : Math.min(W * 0.6, H * 0.27);
  };
  function frame(now) {
    const dt = Math.min(0.05, (now - (st.last || now)) / 1000); st.last = now;
    if (!st.drag) st.yaw += st.vy * dt;
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, s = D / (D - z2);
      proj[i * 3] = CX + x1 * R * s; proj[i * 3 + 1] = CY - y1 * R * s; proj[i * 3 + 2] = z2;
    }
    idx.sort((a, b) => proj[a * 3 + 2] - proj[b * 3 + 2]);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = g.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.75); bg.addColorStop(0, '#0f2b27'); bg.addColorStop(0.55, '#081a17'); bg.addColorStop(1, '#040d0b');
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // dust drifts a little with the yaw so the sky has depth beyond the stars
    g.fillStyle = '#cfe3dc';
    for (const [u, v, r, a] of dust) { g.globalAlpha = 0.12 + 0.25 * a; const x = ((u + st.yaw * 0.02) % 1 + 1) % 1 * W; g.fillRect(x, v * H, r, r); }
    // nebulae: a soft cloud of each galaxy's colour behind its cluster centres
    g.globalCompositeOperation = 'lighter';
    for (const c of cl) {
      const x1 = c.x * cy + c.z * sy, z1 = -c.x * sy + c.z * cy, y1 = c.y * cp - z1 * sp, z2 = c.y * sp + z1 * cp, s = D / (D - z2);
      const nx = CX + x1 * R * s, ny = CY - y1 * R * s, rr = R * s * (0.18 + Math.sqrt(c.m) / 260);
      g.globalAlpha = (st.focusTheme < 0 || st.focusTheme === c.theme ? 0.15 : 0.03); g.drawImage(sprites[c.theme], nx - rr, ny - rr, rr * 2, rr * 2);
    }
    g.globalCompositeOperation = 'source-over';
    for (let q = 0; q < n; q++) {
      const i = idx[q], sx = proj[i * 3], syy = proj[i * 3 + 1], z = proj[i * 3 + 2], s = D / (D - z), th = theme[i];
      if (!size[i] || sx < -20 || syy < -20 || sx > W + 20 || syy > H + 20) continue;
      let a = 0.42 + 0.58 * (z + 1.2) / 2.4; if (a > 1) a = 1;
      if (st.focusTheme >= 0 && th !== st.focusTheme) a *= 0.12;
      const r = size[i] * s * (W < 600 ? 0.8 : 1);
      if (bright[i]) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * (bright[i] === 2 ? 0.42 : 0.16); const gr = r * (bright[i] === 2 ? 6.5 : 4); g.drawImage(sprites[th], sx - gr, syy - gr, gr * 2, gr * 2); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = a; g.fillStyle = css(col[th]);
      if (r < 1.3) g.fillRect(sx - r, syy - r, r * 2, r * 2); else { g.beginPath(); g.arc(sx, syy, r, 0, 6.2832); g.fill(); }
      if (bright[i] === 2 && r > 1.8) { g.globalAlpha = a * 0.9; g.fillStyle = css(mix(col[th], [255, 255, 255], 0.45)); g.beginPath(); g.arc(sx, syy, r * 0.42, 0, 6.2832); g.fill(); }
    }
    if (st.hover >= 0) { const i = st.hover; g.globalAlpha = 1; g.strokeStyle = '#f4fbe0'; g.lineWidth = 1.4; g.beginPath(); g.arc(proj[i * 3], proj[i * 3 + 1], size[i] * 2 + 5, 0, 6.2832); g.stroke(); }
    // floating cluster names: in front bright and larger, behind faint
    // nearest names first; a name that would overlap one already placed fades back instead of piling up
    const placed = [], lab = labelEls.filter(el => !el.hidden).map(el => { const c = cl[+el.dataset.hsTopic], x1 = c.x * cy + c.z * sy, z1 = -c.x * sy + c.z * cy, y1 = c.y * cp - z1 * sp, z2 = c.y * sp + z1 * cp, s = D / (D - z2); return {el, c, x: CX + x1 * R * s, y: CY - y1 * R * s, front: (z2 + 1) / 2}; }).sort((a, b) => b.front - a.front);
    for (const L of lab) {
      const w = (L.el.offsetWidth || 90) * (0.78 + 0.32 * L.front), h = 18, box = [L.x - w / 2, L.y - h / 2, L.x + w / 2, L.y + h / 2];
      const clash = placed.some(b => box[0] < b[2] && b[0] < box[2] && box[1] < b[3] && b[1] < box[3]), dim = st.focusTheme >= 0 && L.c.theme !== st.focusTheme;
      if (!clash) placed.push(box);
      L.el.style.transform = `translate(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px) translate(-50%, -50%) scale(${(0.78 + 0.32 * L.front).toFixed(3)})`;
      L.el.style.opacity = dim ? 0.1 : clash ? 0.14 : (0.45 + 0.55 * L.front).toFixed(2);
      L.el.style.zIndex = clash ? 1 : Math.round(L.front * 100);
    }
    // keep turning while visible; with reduced motion, draw only when something changes
    if (st.visible && !document.hidden && (st.vy || st.drag)) st.raf = requestAnimationFrame(frame); else st.raf = 0;
  }
  const start = () => { if (!st.raf) { st.last = 0; st.raf = requestAnimationFrame(frame); } };
  const nearest = (mx, my) => { let best = -1, bd = 100; for (let i = 0; i < n; i++) { const dx = proj[i * 3] - mx, dy = proj[i * 3 + 1] - my, d = dx * dx + dy * dy; if (size[i] && d < bd && proj[i * 3 + 2] > -0.6) { bd = d; best = i; } } return best; };
  canvas.addEventListener('pointerdown', e => { st.drag = {x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, moved: false}; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (st.drag) {
      const dx = e.clientX - st.drag.x, dy = e.clientY - st.drag.y;
      if (Math.hypot(dx, dy) > 3) st.drag.moved = true;
      st.yaw = st.drag.yaw + dx * 0.006; st.pitch = Math.max(-1.2, Math.min(1.2, st.drag.pitch + dy * 0.005));
      tip.hidden = true; start(); return;
    }
    const i = nearest(mx, my); st.hover = i;
    if (i >= 0) { tip.textContent = ctx.titleOf(sky.ids[i]) || ''; tip.style.left = Math.min(W - 280, mx + 14) + 'px'; tip.style.top = (my + 14) + 'px'; tip.hidden = !tip.textContent; canvas.style.cursor = 'pointer'; }
    else { tip.hidden = true; canvas.style.cursor = 'grab'; }
    start();
  });
  canvas.addEventListener('pointerup', e => { const d = st.drag; st.drag = null; if (d && !d.moved && st.hover >= 0) ctx.openPaper(sky.ids[st.hover]); });
  canvas.addEventListener('pointerleave', () => { st.hover = -1; tip.hidden = true; });
  labelsEl.addEventListener('click', e => { const b = e.target.closest('[data-hs-topic]'); if (b) { const c = cl[+b.dataset.hsTopic]; if (c.kind === 'cluster') ctx.openCluster(c.name); else ctx.openTheme(c.id); } });
  host.querySelector('[data-hs-clusters]')?.addEventListener('change', e => { for (const el of labelEls) el.hidden = (el.dataset.kind === 'cluster') !== e.target.checked; start(); });
  for (const b of host.querySelectorAll('[data-hs-theme]')) {
    b.addEventListener('mouseenter', () => { st.focusTheme = +b.dataset.hsTheme; start(); });
    b.addEventListener('mouseleave', () => { st.focusTheme = -1; start(); });
    b.addEventListener('focus', () => { st.focusTheme = +b.dataset.hsTheme; start(); });
    b.addEventListener('blur', () => { st.focusTheme = -1; start(); });
  }
  const io = new IntersectionObserver(es => { st.visible = es[0].isIntersecting; if (st.visible) start(); }, {threshold: 0.02});
  io.observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && document.body.contains(host)) start(); });
  const ro = new ResizeObserver(() => { resize(); start(); });
  ro.observe(canvas);
  resize(); start();
  return {themes: sky.themes, works: n};
}
