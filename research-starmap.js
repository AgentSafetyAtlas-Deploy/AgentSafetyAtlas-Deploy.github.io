// Research paths · star map. Universe (every active Atlas work) → cluster (星团, one editorial topic; rings are years,
// sectors are clusters) → cluster (星团, one automatic thread) → one paper and everything related to
// it. Theme groups are galaxies (星系). Star size follows the selected observation band (data/starmap-bands.json).
// What the picture means is stated next to it: position = SPECTER2 content similarity (UMAP), size = Semantic Scholar
// citations (unknown stays unknown), lines = a citation inside the Atlas, shared references, papers cited together, or
// content similarity. Data: data/starmap.json, data/starmap-rel-<n>.json, data/starmap-background.json (build_starmap.py).
import {loadXYZ, spread3d as spreadLocal, principalAxes, mountGraph3d} from './graph3d.js';
let sky = null, shards = new Map(), background = null, papersById = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const hash = (s, k = 0) => {let h = 2166136261 ^ k; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 100000) / 100000;};
const mix = (hex, to, f) => {const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16), c = (x, s) => (x >> s) & 255; return `rgb(${[16, 8, 0].map(s => Math.round(c(a, s) + (c(b, s) - c(a, s)) * f)).join(',')})`;};
const YEAR0 = 2019, YEARS = 8; // rings: ≤2019 … 2026, then unknown
const yearColor = y => {if (!y) return 'rgb(150,165,165)'; const f = Math.max(0, Math.min(1, (y - 2016) / 10)); return mix('#4f7d93', '#e6f28a', f);};
const radiusOf = c => c < 0 ? 0.9 : 0.8 + Math.min(3.6, Math.log10(1 + c) * 1.05);
// brightness = the selected observation band (v0.4 "brightness depends on the observer"); -1 = not observed, drawn small
let band = 'influence';
const BANDS = ['influence', 'bridge', 'resource', 'latest', 'citations'];
// each band is turned into a rank (0..1) over the stars where it is observed and drawn with a steep curve, so only the
// top of the band shines, as with citation counts; unobserved stays small
const glow = q => 0.7 + 3.4 * q ** 6;
function rankOf(values, ok) {
  const idx = values.map((v, i) => i).filter(i => ok(values[i])).sort((a, b) => values[a] - values[b]), out = new Float32Array(values.length).fill(-1);
  idx.forEach((i, r) => out[i] = idx.length > 1 ? r / (idx.length - 1) : 1);
  return out;
}
function sizeOf(i) {
  const B = sky.bands;
  if (!B || band === 'citations') return radiusOf(sky.cites[i]);
  if (band === 'influence') return B.c[i] < 0 ? 0.9 : B.nova[i] ? Math.max(1.0, glow(B.c[i] / 100)) : glow(B.c[i] / 100);
  if (band === 'bridge') return B.rb[i] < 0 ? 0.6 : glow(B.rb[i]);
  if (band === 'resource') return B.u[i] > 0 ? 1.4 + Math.min(3.2, Math.log2(1 + B.u[i]) * 0.75) : 0.6;
  return B.ra[i] < 0 ? 0.6 : glow(B.ra[i]); // latest
}
const novaOf = i => sky.bands && band !== 'latest' && sky.bands.nova[i] === 1;

export async function loadStarmap(atlas) {
  if (!sky) {
    const r = await fetch('./data/starmap.json');
    if (!r.ok) throw Error('star map unavailable');
    sky = await r.json();
    sky.n = sky.ids.length;
    sky.pos = new Map(sky.ids.map((id, i) => [id, i]));
    const radii = sky.ids.map((_, i) => Math.hypot(sky.x[i], sky.y[i])).sort((a, b) => a - b);
    sky.maxR = radii[Math.floor(radii.length * 0.98)]; // a few outliers would otherwise shrink the whole sky
    sky.light = sky.themes.map(th => mix(th.color, '#ffffff', 0.2));
    sky.bands = await fetch('./data/starmap-bands.json').then(r => r.ok ? r.json() : null).catch(() => null);
    if (sky.bands && sky.bands.c.length !== sky.n) sky.bands = null; // built for another snapshot: fall back to citations
    if (sky.bands) {sky.bands.rb = rankOf(sky.bands.b, v => v >= 0); sky.bands.ra = rankOf(sky.bands.age.map(a => a < 0 ? NaN : -a), v => !Number.isNaN(v));}
    sky.threadsOf = new Map();
    sky.threads.forEach((th, k) => {for (const m of [...th.members, ...(th.attached || [])]) {if (!sky.threadsOf.has(m)) sky.threadsOf.set(m, []); sky.threadsOf.get(m).push(k);}});
  }
  if (atlas && !papersById) papersById = new Map(atlas.papers.map(p => [p.id, p]));
  return sky;
}
// citing sentences (Semantic Scholar contexts) for citation routes, sharded by the citing star (data/starmap-ctx-<n>.json)
const ctxShards = new Map();
const loadCtx = s => {if (!ctxShards.has(s)) ctxShards.set(s, fetch(`./data/starmap-ctx-${s}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}))); return ctxShards.get(s);};
async function fillContexts(panel, t) {
  for (const el of panel.querySelectorAll('[data-sky-ctx]')) {
    const [a, b] = el.dataset.skyCtx.split('-').map(Number), d = await loadCtx(Math.floor(a / (sky.meta.shardSize || 600))), c = d[a]?.[b];
    if (!c || !el.isConnected) continue;
    const tags = [...c[1]].map(k => ({m: t('uses its method', '使用其方法'), r: t('compares results', '比较结果'), b: t('background', '背景')}[k])).concat(c[2] ? [t('influential', '重要引用')] : []);
    el.innerHTML = `${tags.length ? `<span class="sky-ctx-tag">${tags.map(esc).join(' · ')}</span>` : ''}${esc(c[0])}`;
    el.title = t('Citing sentence from Semantic Scholar; intents are its classifier\'s', '施引原句来自 Semantic Scholar；意图标签来自其分类器');
    el.hidden = false;
  }
}
const shardData = new Map();
const loadShard = s => {if (!shards.has(s)) shards.set(s, fetch(`./data/starmap-rel-${s}.json`).then(r => r.ok ? r.json() : {}).then(d => {shardData.set(s, d); return d;})); return shards.get(s);};
async function rel(i) {
  return (await loadShard(Math.floor(i / sky.meta.shardSize)))[i] || {refs: [], citedBy: [], coupling: [], cocited: [], similar: [], background: [], refsOutside: 0};
}

// ------------------------------------------------------------------ connect two papers over the recorded relations
// Breadth-first search for the fewest hops (at most 4) between A and B. Hops: a citation inside the Atlas (true direction
// kept), three or more shared references, cited together by two or more Atlas papers, and, only when asked, content
// similarity of at least 0.9 (a computed candidate, not a recorded relation). Shortest paths prefer citation hops.
async function connectPaths(a, b, withSim) {
  await Promise.all(Array.from({length: sky.meta.shards}, (_, s) => loadShard(s)));
  const nb = i => {
    const r = shardData.get(Math.floor(i / sky.meta.shardSize))?.[i]; if (!r) return [];
    const out = r.refs.map(j => [j, 'cites', 1]).concat(r.citedBy.map(j => [j, 'citedBy', 1]), r.coupling.filter(x => x[1] >= 3).map(x => [x[0], 'coupling', x[1]]), r.cocited.filter(x => x[1] >= 2).map(x => [x[0], 'cocited', x[1]]));
    return withSim ? out.concat(r.similar.filter(x => x[1] >= 0.9).map(x => [x[0], 'similar', x[1]])) : out;
  };
  const dist = new Map([[a, 0]]), parents = new Map();
  let frontier = [a];
  for (let d = 1; d <= 4 && frontier.length && !dist.has(b); d++) {
    const next = [];
    for (const u of frontier) for (const [w, kind, val] of nb(u)) {
      if (!dist.has(w)) {dist.set(w, d); parents.set(w, [[u, kind, val]]); next.push(w);}
      else if (dist.get(w) === d) parents.get(w).push([u, kind, val]);
    }
    frontier = next;
  }
  if (!dist.has(b)) return [];
  const pref = {cites: 0, citedBy: 0, coupling: 1, cocited: 2, similar: 3}, paths = [];
  const walk = (node, acc) => {
    if (paths.length >= 3) return;
    if (node === a) {paths.push(acc.slice().reverse()); return;}
    for (const [u, kind, val] of [...parents.get(node)].sort((x, y) => pref[x[1]] - pref[y[1]]).slice(0, 4)) {acc.push({from: u, to: node, kind, val}); walk(u, acc); acc.pop(); if (paths.length >= 3) return;}
  };
  walk(b, []);
  return paths;
}
function hopText(h, t) {
  const short = i => esc(titleOf(i).split(':')[0].slice(0, 40));
  if (h.kind === 'cites') return `${short(h.from)} <b>${t('cites →', '引用 →')}</b> ${short(h.to)}`;
  if (h.kind === 'citedBy') return `${short(h.to)} <b>${t('cites →', '引用 →')}</b> ${short(h.from)}`;
  if (h.kind === 'coupling') return `${short(h.from)} <b>· ${h.val} ${t('shared references', '篇共同参考文献')} ·</b> ${short(h.to)}`;
  if (h.kind === 'cocited') return `${short(h.from)} <b>· ${t('cited together by ', '被 ')}${h.val}${t(' Atlas papers', ' 篇 Atlas 论文同时引用')} ·</b> ${short(h.to)}`;
  return `${short(h.from)} <b>· ${t('similar content ', '内容相近 ')}${(+h.val).toFixed(2)} (${t('candidate', '候选')}) ·</b> ${short(h.to)}`;
}
async function loadBackground() {
  if (!background) background = await fetch('./data/starmap-background.json').then(r => r.ok ? r.json() : []);
  return background;
}
const paperOf = i => papersById?.get(sky.ids[i]) || {title: sky.ids[i], authors: []};
const yearOf = i => sky.year[i];
const titleOf = i => paperOf(i).title || sky.ids[i];

// ------------------------------------------------------------------ related papers for one work (open exploration)
function related(r) {
  // reciprocal rank fusion over the five relation lists; each candidate keeps every reason it was found by
  const lists = {
    refs: [...r.refs].sort((a, b) => sky.cites[b] - sky.cites[a]),
    citedBy: [...r.citedBy].sort((a, b) => sky.cites[b] - sky.cites[a]),
    coupling: r.coupling.map(x => x[0]), cocited: r.cocited.map(x => x[0]), similar: r.similar.map(x => x[0]),
  };
  const val = {coupling: new Map(r.coupling.map(x => [x[0], x[1]])), cocited: new Map(r.cocited.map(x => [x[0], x[1]])), similar: new Map(r.similar.map(x => [x[0], x[1]]))};
  const score = new Map(), why = new Map();
  for (const [kind, list] of Object.entries(lists)) list.forEach((j, rank) => {
    score.set(j, (score.get(j) || 0) + 1 / (60 + rank));
    if (!why.has(j)) why.set(j, []);
    why.get(j).push([kind, val[kind]?.get(j)]);
  });
  return {lists, ranked: [...score.entries()].sort((a, b) => b[1] - a[1]).map(([j, s]) => ({i: j, score: s, why: why.get(j)}))};
}
function reasonChips(why, t) {
  const name = {refs: t('it cites', '它引用了'), citedBy: t('cites it', '引用了它'), coupling: t('shared references', '共同参考文献'), cocited: t('cited together', '常被同时引用'), similar: t('similar content', '内容相近')};
  return why.map(([k, v]) => `<span class="sky-why sky-why-${k}">${name[k]}${k === 'coupling' ? ` · ${v}` : k === 'cocited' ? ` · ${v}${t('×', ' 次')}` : k === 'similar' ? ` · ${(+v).toFixed(2)}` : ''}</span>`).join('');
}

// ------------------------------------------------------------------ markup

function bandName(b, t) {
  return {influence: t('Influence (within its group)', '影响（参照组内）'), bridge: t('Bridge (links clusters)', '桥梁（连接星团）'), resource: t('Resource (benchmark used by others)', '资源（被采用的基准）'),
    latest: t('Latest', '最新'), citations: t('Raw citations', '原始引用数')}[b];
}
function bandNote(t) {
  const m = sky.bands?.meta || {};
  return {influence: t(`citation percentile among works of the same cluster, year and form (falls back when a group has fewer than ${m.minGroup || 8}); a ringed star is newer than ${m.novaMonths || 6} months: its light is still on its way, not dim`, `在同星团、同年份、同类型工作中的引用分位（组太小时退到更粗的参照组）；带圈的星不足 ${m.novaMonths || 6} 个月：它的光还在路上，并不暗`),
    bridge: t('how evenly a work\'s observed citations spread over clusters (participation coefficient); small = fewer than 3 routes, not observed', '一项工作的观测引用在各星团间分布得多均匀（参与系数）；小星 = 航线少于 3 条，未观测'),
    resource: t('number of other Atlas works that evaluate on it (benchmark-use routes with a sentence)', '有多少其他 Atlas 工作在它上面评测（带原句的基准采用航线）'),
    latest: t('newer is brighter (first posted within 24 months); no citation signal', '越新越亮（24 个月内首次发布）；不使用引用信号'),
    citations: t('Semantic Scholar citation count; unknown stays small, not zero', 'Semantic Scholar 被引次数；未知时显示为小星，不代表零')}[band];
}
export function renderStarmap(ctx) {
  const {t} = ctx, m = sky.meta, c = m.coverage;
  const hero = `<section class="sky-hero" aria-label="${t('Star map of the Atlas research collection', 'Atlas 研究语料星图')}">
   <canvas class="sky-canvas" data-sky-canvas role="img" aria-label="${t(`${sky.n.toLocaleString()} stars, one per included paper, placed by content similarity`, `${sky.n.toLocaleString()} 颗星，每颗是一篇纳入论文，按内容相近排布`)}"></canvas>
   <div class="sky-overlay">
    <span class="sky-eyebrow">${t('THE UNIVERSE · STAR MAP', '宇宙 · 星图')}</span>
    <h2>${t('Every star is a paper.', '每一颗星，都是一篇论文。')}</h2>
    <p>${t(`${sky.n.toLocaleString()} agent-safety papers of the frozen field map in three dimensions. Drag to turn, double-click to fly closer; click a cluster name to open it, or any star to see everything related to it.`, `冻结领域地图中的 ${sky.n.toLocaleString()} 篇 Agent 安全论文，放在三维空间里。拖动旋转，双击飞近；点击星团名进入这个星团，点击任意一颗星，查看与它相关的全部论文。`)}</p>
    <form class="sky-search" data-sky-search><input type="search" data-sky-q autocomplete="off" placeholder="${t('Find a paper by title…', '按标题找一篇论文…')}" aria-label="${t('Find a paper on the map', '在星图中找论文')}"><ul class="sky-suggest" data-sky-suggest role="listbox"></ul></form>
   </div>
   <div class="sky-tools"><button data-sky-motion aria-pressed="true" title="${t('Pause or resume the slow rotation', '暂停或继续缓慢旋转')}">${t('Pause rotation', '暂停旋转')}</button><button data-sky-zoom="1.4" aria-label="${t('Zoom in', '放大')}">+</button><button data-sky-zoom="0.7" aria-label="${t('Zoom out', '缩小')}">−</button><button data-sky-reset>${t('Reset', '复位')}</button>${sky.bands ? `<label class="sky-band">${t('Brightness', '亮度')} <select data-sky-band aria-label="${t('Observation band: what makes a star bright', '观测波段：什么让一颗星变亮')}">${BANDS.map(b => `<option value="${b}"${b === band ? ' selected' : ''}>${bandName(b, t)}</option>`).join('')}</select></label>` : ''}</div>
   <div class="sky-tip" data-sky-tip hidden></div>
   <details class="sky-legend"><summary>${t('How to read the sky', '怎样读这张星图')}</summary>
    <ul><li><b>${t('Gravity only from observed routes.', '引力只来自观测到的航线。')}</b> ${t('Solid lines are recorded citations; dashed lines are relations computed from recorded reference lists (shared references, cited together); dotted lines are content similarity, a candidate only. Closeness on the map never means one line of work follows another.', '实线是有记录的引用；虚线是由参考文献列表算出的关系（共同参考文献、常被同时引用）；点线是内容相近，只是候选。星图上靠得近，从不意味着思想上一脉相承。')}</li>
     <li>${t('Position: content similarity of title and abstract (SPECTER2 vectors, 3-D UMAP, the same layout as the home sky). Close stars are papers about similar things; distance is not citation distance, and empty space is not a research gap. Stars at the back are drawn fainter.', '位置：标题与摘要的内容相近（SPECTER2 向量，3-D UMAP 降维，与首页星空相同）。靠近的星讨论相近的问题；距离不是引用距离，空白处也不代表研究空白。后方的星画得更暗。')}</li>
     <li data-sky-bandnote><b>${t('Brightness depends on the observer.', '亮度取决于观测者。')}</b> ${t('Size follows the band chosen above: ', '大小随上方选择的波段变化：')}${bandName(band, t)} — ${bandNote(t)}${t('. ', '。')}${t('Citations observed ', '引用观测日期 ')}${esc(m.citationObserved)}${t('.', '。')}</li>
     <li>${t('Colour: the galaxy (theme group) of the paper\'s first cluster.', '颜色：论文第一个星团所属的星系（主题大类）。')} ${sky.themes.filter(th => th.id !== 'other').map((th, k) => `<span class="sky-key"><i style="background:${sky.light[k]}"></i>${esc(ctx.translated ? ctx.translated(th.en) : th.en)}</span>`).join('')}</li>
     <li>${t(`Coverage: ${c.foundOnSemanticScholar.toLocaleString()} of ${sky.n.toLocaleString()} papers found on Semantic Scholar; ${c.atlasCitationLinks.toLocaleString()} citation links inside the Atlas. Missing links mean not recorded, not unrelated.`, `覆盖：${sky.n.toLocaleString()} 篇中 ${c.foundOnSemanticScholar.toLocaleString()} 篇在 Semantic Scholar 找到；Atlas 内部引用 ${c.atlasCitationLinks.toLocaleString()} 条。缺少连线表示未记录，不表示无关。`)}</li>
     <li>${t('Corpus ', '语料 ')}${esc(m.release)} · ${t('cutoff ', '截止 ')}${esc(m.cutoff)} · ${t('citation data: Semantic Scholar Academic Graph', '引用数据：Semantic Scholar Academic Graph')}</li></ul></details>
  </section>`;
  return `<div class="sky" data-sky>${hero}<section class="sky-panel" data-sky-panel aria-live="polite"></section></div>`;
}

// ------------------------------------------------------------------ universe canvas
// The universe in 3-D: the same coordinates as the home sky (3-D UMAP of SPECTER2 vectors, data/starmap-3d.json). It turns
// slowly about the vertical axis (paused on hover, off with reduced motion), mouse-drag turns it, double-click flies to the
// star under the pointer and zooms in, ctrl/⌘+wheel and the +/− buttons zoom. Opening a cluster, cluster or paper
// flies the turning point to it. Stars are depth-sorted and dimmer at the back; cluster names sit at the cluster's medoid.
function universe(canvas, opts) {
  const ctx2 = canvas.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), n = sky.n;
  const st = {yaw: 0.35, pitch: -0.42, zoom: 1, pivot: [0, 0, 0], goal: null, hover: -1, hl: null, focus: -1, links: [], motion: !reduceMotion(), paused: false, last: 0, raf: 0, drag: null};
  const tw = sky.ids.map((id, i) => [0.4 + hash(id, 1) * 1.2, hash(id, 2) * 6.28]);
  const sprites = sky.light.map(col => {const s = document.createElement('canvas'); s.width = s.height = 32; const g = s.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, col); gr.addColorStop(0.22, col); gr.addColorStop(0.45, col.replace('rgb', 'rgba').replace(')', ',0.35)')); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return s;});
  // positions; a work missing from the 3-D layout (older layout file) is left out, never placed at a made-up spot
  const P = new Float32Array(n * 3), has = new Uint8Array(n);
  let cent = [];
  const place = () => {
    // turned to the sky's principal axes so the long axis lies across the wide frame (longest → x, thinnest → y, the
    // other → depth); this is a rotation of the same layout, distances are unchanged
    const pts = [], idx = []; for (let i = 0; i < n; i++) if (xyz3?.[i]) {pts.push(xyz3[i]); idx.push(i);}
    const A = principalAxes(pts), ax = [A[0], A[2], A[1]];
    idx.forEach((i, k) => {const v = pts[k]; for (let a = 0; a < 3; a++) P[i * 3 + a] = ax[a][0] * v[0] + ax[a][1] * v[1] + ax[a][2] * v[2]; has[i] = 1;});
    // cluster names at the member nearest the members' mean, so a name never floats in empty space between two lobes
    const sum = sky.topics.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) if (has[i]) for (const k of sky.topics_of[i] || []) {const c = sum[k]; c[0] += P[i * 3]; c[1] += P[i * 3 + 1]; c[2] += P[i * 3 + 2]; c[3]++;}
    const best = sum.map(() => [Infinity, -1]);
    for (let i = 0; i < n; i++) if (has[i]) for (const k of sky.topics_of[i] || []) {const c = sum[k], d = (P[i * 3] - c[0] / c[3]) ** 2 + (P[i * 3 + 1] - c[1] / c[3]) ** 2 + (P[i * 3 + 2] - c[2] / c[3]) ** 2; if (d < best[k][0]) best[k] = [d, i];}
    cent = best.map(([, i], k) => i < 0 ? null : [P[i * 3], P[i * 3 + 1], P[i * 3 + 2], sum[k][3]]);
  };
  load3d().then(() => {place(); kick();});
  const S = new Float32Array(n * 3), order = new Uint32Array(n).map((_, i) => i), D = 4;
  let W = 0, H = 0, R = 1, CX = 0, CY = 0, M = [1, 0, 1, 0], labelBoxes = [], avoid = [];
  const size = () => {const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; const wide = W > 900; CX = wide ? W * 0.6 : W / 2; CY = wide ? H / 2 : H * 0.6; R = Math.min(wide ? W * 0.34 : W * 0.46, H * 0.8); avoid = [...canvas.parentElement.querySelectorAll('.sky-tools, .sky-overlay')].map(el => {const b = el.getBoundingClientRect(); return [b.left - r.left - 6, b.top - r.top - 6, b.right - r.left + 6, b.bottom - r.top + 6];});};
  // [screen x, screen y, depth (+ = towards the viewer), perspective factor]
  const proj = (x, y, z) => {
    x -= st.pivot[0]; y -= st.pivot[1]; z -= st.pivot[2];
    const [cy, sy, cp, sp] = M, x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, s = D / Math.max(0.6, D - z2);
    return [CX + x1 * R * st.zoom * s, CY - y1 * R * st.zoom * s, z2, s];
  };
  const nearest = (sx, sy) => {
    let best = -1, bd = Infinity;
    for (let i = 0; i < n; i++) {if (!has[i] || (st.hl && !st.hl.has(i))) continue; const dx = S[i * 3] - sx, dy = S[i * 3 + 1] - sy, d = dx * dx + dy * dy; if (d < 100 && d - S[i * 3 + 2] * 30 < bd) {bd = d - S[i * 3 + 2] * 30; best = i;}}
    return best;
  };
  function draw(now) {
    const g = ctx2; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    M = [Math.cos(st.yaw), Math.sin(st.yaw), Math.cos(st.pitch), Math.sin(st.pitch)];
    const bg = g.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.7); bg.addColorStop(0, '#12312d'); bg.addColorStop(1, '#061311');
    g.globalAlpha = 1; g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {if (!has[i]) continue; const [x, y, z] = proj(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); S[i * 3] = x; S[i * 3 + 1] = y; S[i * 3 + 2] = z;}
    order.sort((a, b) => S[a * 3 + 2] - S[b * 3 + 2]);
    // faint glow under each cluster, at its medoid, sized by its paper count
    g.globalCompositeOperation = 'lighter';
    sky.topics.forEach((tp, k) => {
      const c = cent[k]; if (!c) return;
      const [nx, ny, , s] = proj(c[0], c[1], c[2]), rr = Math.sqrt(c[3]) * R * st.zoom * s * 0.0075, col = sky.light[tp.theme] || '#ffffff';
      const ng = g.createRadialGradient(nx, ny, 0, nx, ny, rr); ng.addColorStop(0, col.replace('rgb', 'rgba').replace(')', ',0.10)')); ng.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = ng; g.fillRect(nx - rr, ny - rr, rr * 2, rr * 2);
    });
    g.globalCompositeOperation = 'source-over'; // stars: normal compositing so dense regions keep their colour
    const tsec = now / 1000, kz = Math.sqrt(st.zoom);
    for (const i of order) {
      if (!has[i]) continue;
      const sx = S[i * 3], sy = S[i * 3 + 1], z = S[i * 3 + 2];
      if (sx < -10 || sy < -10 || sx > W + 10 || sy > H + 10) continue;
      const r = sizeOf(i) * kz * (D / Math.max(0.6, D - z)) * (W < 520 ? 0.8 : 1);
      let a = (0.5 + Math.min(0.5, r / 8)) * Math.min(1, 0.45 + 0.55 * (z + 1.2) / 2.4);
      if (st.motion) a *= 0.82 + 0.18 * Math.sin(tsec * tw[i][0] + tw[i][1]);
      if (st.hl && !st.hl.has(i)) a *= 0.12;
      g.globalAlpha = a; g.drawImage(sprites[sky.theme[i]] || sprites[0], sx - r * 2.2, sy - r * 2.2, r * 4.4, r * 4.4);
      if (st.zoom >= 3 && novaOf(i)) {g.globalAlpha = a * 0.55; g.strokeStyle = '#e6f28a'; g.lineWidth = 0.8; g.beginPath(); g.arc(sx, sy, r * 1.6 + 1.6, 0, 6.3); g.stroke();} // new star: light still on its way
    }
    g.globalAlpha = 1;
    if (st.focus >= 0 && has[st.focus]) {
      const fx = S[st.focus * 3], fy = S[st.focus * 3 + 1];
      g.strokeStyle = 'rgba(230,242,138,0.55)'; g.lineWidth = 1;
      for (const j of st.links) {if (!has[j]) continue; const jx = S[j * 3], jy = S[j * 3 + 1]; g.beginPath(); g.moveTo(fx, fy); g.lineTo(jx, jy); g.stroke(); g.beginPath(); g.arc(jx, jy, 3.2, 0, 7); g.stroke();}
      g.strokeStyle = '#e6f28a'; g.lineWidth = 2; g.beginPath(); g.arc(fx, fy, 7, 0, 7); g.stroke();
    }
    if (st.hover >= 0) {g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.arc(S[st.hover * 3], S[st.hover * 3 + 1], 6, 0, 7); g.stroke();}
    // cluster names, nearest first, skipped when they would overlap; names at the back are fainter
    labelBoxes = []; g.font = `600 ${W < 520 ? 11 : 12.5}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const named = sky.topics.map((tp, k) => cent[k] ? [k, ...proj(cent[k][0], cent[k][1], cent[k][2])] : null).filter(Boolean).sort((a, b) => b[3] - a[3]);
    for (const [k, px0, ly, z] of named) {
      const tp = sky.topics[k], label = opts.topicLabel(tp.name), w = g.measureText(label).width + 14, lx = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, px0)), box = [lx - w / 2, ly - 11, lx + w / 2, ly + 11];
      if (ly < 12 || ly > H - 12) continue;
      if ([...labelBoxes, ...avoid].some(b => b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1])) continue;
      labelBoxes.push([...box, k]);
      g.globalAlpha = Math.max(0.45, Math.min(1, 0.55 + 0.45 * (z + 1) / 2));
      g.fillStyle = 'rgba(6,19,17,0.62)'; g.beginPath(); g.roundRect ? g.roundRect(box[0], box[1], w, 22, 11) : g.rect(box[0], box[1], w, 22); g.fill();
      g.fillStyle = sky.light[tp.theme] || '#fff'; g.fillText(label, lx, ly + 0.5);
    }
    g.globalAlpha = 1;
  }
  function frame(now) {
    st.raf = 0;
    if (!canvas.isConnected) return;
    const dt = st.last ? Math.min(100, now - st.last) : 16;
    if (st.motion && !st.paused && !st.drag) st.yaw += dt / 1000 * 0.05;
    let flying = false;
    if (st.goal) {const d = st.goal.map((v, k) => v - st.pivot[k]); if (Math.hypot(...d) < 1e-3) {st.pivot = st.goal; st.goal = null;} else {st.pivot = st.pivot.map((v, k) => v + d[k] * Math.min(1, dt / 160)); flying = true;}}
    st.last = now; draw(now);
    if (st.motion || flying || st.drag) st.raf = requestAnimationFrame(t => setTimeout(() => frame(t), 16)); // about 30 fps
    else st.last = 0;
  }
  const kick = () => {if (!st.raf) st.raf = requestAnimationFrame(frame);};
  const flyTo = (ids, zoom) => {let x = 0, y = 0, z = 0, m = 0; for (const i of ids) if (has[i]) {x += P[i * 3]; y += P[i * 3 + 1]; z += P[i * 3 + 2]; m++;} if (m) {st.goal = [x / m, y / m, z / m]; if (zoom) st.zoom = Math.max(st.zoom, zoom); kick();}};
  const tip = opts.tip;
  const showTip = (i, sx, sy) => {
    if (i < 0) {tip.hidden = true; return;}
    const p = paperOf(i), c = sky.cites[i];
    tip.innerHTML = `<b>${esc(p.title)}</b><span>${yearOf(i) || '—'} · ${(sky.topics_of[i] || []).map(k => esc(opts.topicLabel(sky.topics[k].name))).slice(0, 2).join(' · ')}${c >= 0 ? ' · ' + c.toLocaleString() + ' ' + opts.t('citations', '次被引') : ''}</span>`;
    tip.hidden = false; const r = canvas.getBoundingClientRect(); tip.style.left = Math.min(r.width - 300, sx + 14) + 'px'; tip.style.top = Math.max(8, sy - 12) + 'px';
  };
  const at = e => {const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top];};
  canvas.addEventListener('pointermove', e => {
    const [sx, sy] = at(e);
    if (st.drag) {
      const dx = sx - st.drag.x, dy = sy - st.drag.y; st.drag.moved = st.drag.moved || Math.hypot(dx, dy) > 4;
      st.yaw = st.drag.yaw + dx * 0.006; st.pitch = Math.max(-1.3, Math.min(1.3, st.drag.pitch + dy * 0.005));
      if (st.drag.moved) {st.hover = -1; tip.hidden = true;}
      kick(); return;
    }
    st.paused = true; const i = nearest(sx, sy), label = labelBoxes.find(b => sx > b[0] && sx < b[2] && sy > b[1] && sy < b[3]);
    canvas.style.cursor = i >= 0 || label ? 'pointer' : 'grab';
    if (i !== st.hover) {st.hover = i; showTip(i, sx, sy); kick();}
  });
  canvas.addEventListener('pointerleave', () => {st.paused = false; st.hover = -1; tip.hidden = true; kick();});
  canvas.addEventListener('pointerdown', e => {if (e.pointerType === 'touch') return; const [x, y] = at(e); st.drag = {x, y, yaw: st.yaw, pitch: st.pitch, moved: false}; canvas.setPointerCapture(e.pointerId); kick();});
  canvas.addEventListener('pointerup', e => {
    const [sx, sy] = at(e), moved = st.drag?.moved; st.drag = null;
    if (moved) return;
    const label = labelBoxes.find(b => sx > b[0] && sx < b[2] && sy > b[1] && sy < b[3]), i = nearest(sx, sy);
    if (i >= 0) opts.onStar(i); else if (label) opts.onTopic(label[4]);
  });
  canvas.addEventListener('dblclick', e => {const [sx, sy] = at(e), i = nearest(sx, sy); if (i >= 0) flyTo([i]); st.zoom = Math.min(12, st.zoom * 1.6); kick();});
  canvas.addEventListener('wheel', e => {if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const f = e.deltaY < 0 ? 1.15 : 0.87; st.zoom = Math.max(0.6, Math.min(12, st.zoom * f)); kick();}, {passive: false});
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', e => {const d = {ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12]}[e.key]; if (!d) return; e.preventDefault(); st.yaw += d[0]; st.pitch = Math.max(-1.3, Math.min(1.3, st.pitch + d[1])); kick();});
  new ResizeObserver(() => {size(); kick();}).observe(canvas);
  size(); kick();
  return {
    st, kick,
    zoom(f) {st.zoom = Math.max(0.6, Math.min(12, st.zoom * f)); kick();},
    reset() {st.zoom = 1; st.goal = [0, 0, 0]; st.pitch = -0.42; kick();},
    motion(on) {st.motion = on; st.last = 0; kick();},
    // fly: also move the turning point to the highlighted stars (used for clusters, not for title search)
    highlight(set, fly = false) {st.hl = set; if (fly && set) flyTo(set, 1.6); else if (fly) {st.goal = [0, 0, 0]; st.zoom = 1;} kick();},
    focus(i, links = []) {st.focus = i; st.links = links; if (i >= 0) flyTo([i], 2); kick();},
  };
}
// ------------------------------------------------------------------ solar system (one topic)
const RING0 = 78, RMAX = 350;
const ringOf = y => y ? Math.max(0, Math.min(YEARS - 1, y - YEAR0)) : YEARS;
// ring k spans [edges[k], edges[k+1]]; each annulus area is proportional to its paper count (at least 4% of the disc)
function ringEdges(members) {
  const n = Array(YEARS + 1).fill(0); for (const m of members) n[ringOf(yearOf(m))]++;
  const tot = n.reduce((a, b) => a + b, 0) || 1, share = n.map(c => Math.max(0.04, c / tot)), sum = share.reduce((a, b) => a + b, 0);
  const edges = [RING0]; let area = 0; const A = Math.PI * (RMAX * RMAX - RING0 * RING0);
  for (const sh of share) {area += A * sh / sum; edges.push(Math.sqrt(RING0 * RING0 + area / Math.PI));}
  return edges;
}
function solar(k, ctx) {
  const {t, topicLabel} = ctx, tp = sky.topics[k];
  const threads = sky.threads.map((th, ti) => ({...th, ti})).filter(th => th.topic === tp.name);
  const named = threads.filter(th => !th.unclustered).sort((a, b) => (a.medianYear || 0) - (b.medianYear || 0) || b.members.length - a.members.length);
  const outside = threads.find(th => th.unclustered);
  const size = th => th.members.length + (th.attached?.length || 0);
  const total = named.reduce((s, th) => s + size(th), 0) + (outside ? outside.members.length : 0);
  const everyone = threads.flatMap(th => [...th.members, ...(th.attached || [])]), edgesR = ringEdges(everyone);
  const R = RMAX, col = sky.light[tp.theme] || '#fff';
  let a0 = -Math.PI / 2, stars = '', lines = '', sectors = '', labels = '';
  const place = (m, start, span, kk) => {const k = ringOf(yearOf(m)), lo = edgesR[k], hi = edgesR[k + 1], ang = start + span * (0.06 + 0.88 * hash(sky.ids[m], 7 + kk)), rad = lo + (hi - lo) * (0.15 + 0.7 * hash(sky.ids[m], 3)); return [Math.cos(ang) * rad, Math.sin(ang) * rad];};
  const sectorOf = [...named, ...(outside ? [outside] : [])];
  for (const th of sectorOf) {
    const n = th.unclustered ? th.members.length : size(th), span = Math.max(0.035, 2 * Math.PI * n / total), start = a0; a0 += span;
    const xy = new Map(), fill = th.unclustered ? 'rgba(160,175,175,0.55)' : col, key = th.unclustered ? 'out' : th.ti;
    for (const m of th.members) xy.set(m, place(m, start, span, 0));
    for (const m of th.attached || []) xy.set(m, place(m, start, span, 1));
    for (const [m, [x, y]] of xy) {const att = (th.attached || []).includes(m); stars += `<circle class="sky-sys-star${att ? ' is-attached' : ''}" data-sky-star="${m}" data-th="${key}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(sizeOf(m) * 0.95).toFixed(2)}" fill="${fill}"${novaOf(m) ? ' stroke="#e6f28a" stroke-width="0.8"' : ''}><title>${esc(titleOf(m))} · ${yearOf(m) || '—'}</title></circle>`;}
    for (const [i, j, kind] of th.edges) {const a = xy.get(i), b = xy.get(j); if (a && b) lines += `<line class="sky-edge sky-edge-${kind}" data-th="${key}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>`;}
    const mid = start + span / 2, lr = R + 26, lx = Math.cos(mid) * lr, ly = Math.sin(mid) * lr;
    sectors += `<path class="sky-sector${th.unclustered ? ' is-outside' : ''}" data-sky-thread="${th.unclustered ? '' : th.ti}" data-th="${key}" d="M0 0 L${(Math.cos(start) * (R + 8)).toFixed(1)} ${(Math.sin(start) * (R + 8)).toFixed(1)} A${R + 8} ${R + 8} 0 ${span > Math.PI ? 1 : 0} 1 ${(Math.cos(start + span) * (R + 8)).toFixed(1)} ${(Math.sin(start + span) * (R + 8)).toFixed(1)} Z"><title>${esc(th.unclustered ? t('Not in a cluster', '未归入星团') : th.label.join(' · '))} · ${n}</title></path>`;
    if (span > 0.16) labels += `<g class="sky-sector-label${th.unclustered ? ' is-outside' : ''}" data-th="${key}" data-sky-anchor="${lx.toFixed(1)},${ly.toFixed(1)}" ${th.unclustered ? '' : `data-sky-thread="${th.ti}" role="button" tabindex="0"`} transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)})"><text text-anchor="middle">${esc(th.unclustered ? t('not in a cluster', '未归入星团') : th.label.slice(0, 2).join(' · '))}</text><text class="sky-sector-count" text-anchor="middle" dy="14">${n}</text></g>`;
  }
  const rings = edgesR.slice(1).map((r, k) => `<circle class="sky-ring${k === YEARS ? ' is-unknown' : ''}" r="${r.toFixed(1)}"/>`).join('');
  const ringLabels = edgesR.slice(0, -1).map((lo, k) => (edgesR[k + 1] - lo) > 11 ? `<text class="sky-ring-label" x="${(-R - 96).toFixed(0)}" y="${(-(lo + edgesR[k + 1]) / 2 + 3).toFixed(1)}">${k === YEARS ? t('year unknown', '年份未知') : k === 0 ? '≤' + YEAR0 : YEAR0 + k}</text><line class="sky-ring-tick" x1="${(-R - 50).toFixed(0)}" x2="-8" y1="${(-(lo + edgesR[k + 1]) / 2).toFixed(1)}" y2="${(-(lo + edgesR[k + 1]) / 2).toFixed(1)}"/>` : '').join('');
  const svg = `<svg class="sky-system" viewBox="${-R - 120} ${-R - 70} ${2 * R + 240} ${2 * R + 140}" role="img" aria-label="${t('Cluster: ', '星团：')}${esc(topicLabel(tp.name))}">
   <defs><radialGradient id="sky-sun"><stop offset="0" stop-color="#fffbe0"/><stop offset="0.45" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>
   <g data-sky-rot>${sectors}${rings}${lines}${stars}${labels}</g>${ringLabels}
   <circle r="64" fill="url(#sky-sun)"/><text class="sky-sun-name" text-anchor="middle" dy="-2">${esc(topicLabel(tp.name))}</text><text class="sky-sun-count" text-anchor="middle" dy="16">${(tp.count || 0).toLocaleString()} ${t('papers', '篇')}</text></svg>`;
  const list = named.sort((a, b) => size(b) - size(a)).map(th => {
    const ex = th.members[0];
    return `<button class="sky-thread-card" data-sky-thread="${th.ti}" data-th="${th.ti}"><span class="sky-thread-top"><b>${esc(th.label.join(' · ') || t('unlabelled cluster', '未命名星团'))}</b><em>${size(th)}</em></span><span class="sky-thread-meta">${t('median year ', '中位年份 ')}${th.medianYear || '—'} · ${th.members.length} ${t('core', '核心')}${th.attached?.length ? ` + ${th.attached.length} ${t('loosely attached', '松散归入')}` : ''}</span><span class="sky-thread-ex">${t('e.g. ', '例：')}${esc(titleOf(ex))}</span></button>`;
  }).join('');
  return `<div class="sky-system-wrap"><div class="sky-system-figure">${svg}<p class="sky-note">${t('Rings are years (inner = older). The sector is the cluster, labelled with its most distinctive keywords (c-TF-IDF). Lines join its most cited papers: solid = citation, dashed = shared references (both observed), dotted = similar content (a candidate only). Star size follows the brightness band selected above.', '圆环是年份（越靠内越早）。扇区就是这个星团，用最有区分度的关键词（c-TF-IDF）标注。连线串起它被引最多的论文：实线＝引用，虚线＝共同参考文献（均为观测到的关系），点线＝内容相近（只是候选）。星的大小随上方选择的亮度波段变化。')}</p></div>
   <div class="sky-thread-list"><h3>${t('This cluster', '这个星团')}</h3>${list}${outside ? `<p class="sky-small" data-th="out">${outside.members.length} ${t('papers sit outside every cluster; they still appear in the sky and in search.', '篇论文不属于任何星团；它们仍在星空和搜索中。')}</p>` : ''}</div></div>`;
}

// ------------------------------------------------------------------ constellation (one thread)
async function constellation(ti, ctx) {
  const {t} = ctx, th = sky.threads[ti], all = [...th.members, ...(th.attached || [])];
  const shown = [...new Set([...th.bright, ...[...all].sort((a, b) => sky.cites[b] - sky.cites[a]).slice(0, 150), ...th.members, ...(th.attached || [])])].slice(0, 240);
  const rels = new Map(await Promise.all(all.map(async i => [i, await rel(i)])));
  const set = new Set(all), shownSet = new Set(shown);
  // 3-D: the papers' places in the home sky (3-D UMAP), spread inside this cluster; drawn by mount3d
  await load3d();
  const pts = spread3d(shown), at = new Map(shown.map((i, n) => [i, n])), links = [];
  for (const i of shown) {
    const r = rels.get(i);
    for (const j of r.refs) if (shownSet.has(j)) links.push([at.get(i), at.get(j), 'cites']);
    for (const [j, n] of r.coupling.slice(0, 3)) if (shownSet.has(j) && j > i && n >= 3) links.push([at.get(i), at.get(j), 'shared']);
  }
  const named = th.bright.filter(i => shownSet.has(i)).slice(0, 10);
  pending3d = {ids: shown, pts, links, bright: new Set(th.bright)};
  const labelBtns = named.map(i => `<button class="sky-c3d-label" data-sky-star="${i}" data-g3="${at.get(i)}">${esc(titleOf(i).split(':')[0].slice(0, 32))}</button>`).join('');
  // Connected-Papers-style lists, computed inside the Atlas from recorded references
  const priorCount = new Map(), bgCount = new Map(), deriv = new Map(), bridges = new Map();
  for (const i of all) {
    const r = rels.get(i);
    for (const j of r.refs) if (!set.has(j)) priorCount.set(j, (priorCount.get(j) || 0) + 1);
    for (const b of r.background) bgCount.set(b, (bgCount.get(b) || 0) + 1);
    for (const j of r.citedBy) if (!set.has(j)) deriv.set(j, (deriv.get(j) || 0) + 1);
    const other = new Set();
    for (const j of [...r.refs, ...r.citedBy, ...r.coupling.slice(0, 5).map(x => x[0])]) for (const k of sky.threadsOf.get(j) || []) if (k !== ti && !sky.threads[k].unclustered) other.add(k);
    if (other.size) bridges.set(i, other);
  }
  const top = (map, n, min = 1) => [...map.entries()].filter(([, c]) => c >= min).sort((a, b) => b[1] - a[1]).slice(0, n);
  const row = (i, note) => `<li><button class="sky-link" data-sky-star="${i}">${esc(titleOf(i))}</button><span>${yearOf(i) || '—'} · ${note}</span></li>`;
  const latest = [...all].sort((a, b) => (yearOf(b) || 0) - (yearOf(a) || 0) || sky.cites[b] - sky.cites[a]).slice(0, 8);
  const bgTop = top(bgCount, 8, 2);
  const lists = `<div class="sky-lists">
   <section><h4>${t('Prior works', '前序工作')}</h4><p class="sky-small">${t('Atlas papers outside this cluster that its papers cite most.', '这个星团引用最多的 Atlas 论文（团外）。')}</p><ol>${top(priorCount, 8, 2).map(([i, c]) => row(i, `${t('cited by ', '被 ')}${c}${t(' papers here', ' 篇线内论文引用')}`)).join('') || `<li class="sky-small">${t('No recorded citations yet.', '暂无已记录的引用。')}</li>`}</ol>
    ${bgTop.length ? `<details class="sky-bg"><summary>${t('Background outside the Atlas', 'Atlas 以外的背景文献')} (${bgTop.length})</summary><ol data-sky-bglist="${bgTop.map(([b, c]) => b + ':' + c).join(',')}"><li class="sky-small">${t('Loading…', '加载中…')}</li></ol></details>` : ''}</section>
   <section><h4>${t('Derivative works', '后续工作')}</h4><p class="sky-small">${t('Atlas papers outside this cluster that cite several of its papers.', '引用了这个星团多篇论文的 Atlas 论文（团外）。')}</p><ol>${top(deriv, 8, 2).map(([i, c]) => row(i, `${t('cites ', '引用了 ')}${c}${t(' papers here', ' 篇线内论文')}`)).join('') || `<li class="sky-small">${t('None recorded with two or more links.', '暂无引用两篇以上的记录。')}</li>`}</ol></section>
   <section><h4>${t('Latest in this cluster', '这个星团的最新论文')}</h4><ol>${latest.map(i => row(i, sky.cites[i] >= 0 ? sky.cites[i] + t(' citations', ' 次被引') : t('citations unknown', '被引未知'))).join('')}</ol></section>
   <section><h4>${t('Bridges', '桥梁论文')}</h4><p class="sky-small">${t('Papers here whose citations or shared references reach other clusters.', '通过引用或共同参考文献连到其他星团的论文。')}</p><ol>${[...bridges.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 8).map(([i, o]) => row(i, t('reaches ', '连到 ') + [...o].slice(0, 2).map(k => esc(sky.threads[k].label.slice(0, 2).join(' · '))).join('；'))).join('') || `<li class="sky-small">${t('No recorded links to other clusters.', '暂无已记录的跨团连接。')}</li>`}</ol></section></div>`;
  return `<div class="sky-const"><div class="sky-const-head"><h3>${esc(th.label.join(' · ') || t('Unlabelled cluster', '未命名星团'))}</h3><p>${all.length} ${t('papers', '篇论文')} · ${t('median year ', '中位年份 ')}${th.medianYear || '—'} · ${t('showing ', '图中显示 ')}${shown.length}/${all.length}</p></div>
   <div class="sky-c3d" data-sky-c3d><canvas tabindex="0" role="img" aria-label="${t('Cluster map in 3-D; drag or use the arrow keys to turn', '星团 3-D 图；拖动或用方向键旋转')}"></canvas><div class="sky-c3d-labels">${labelBtns}</div><div class="sky-c3d-tip" data-g3-tip hidden></div><p class="sky-c3d-hint">${t('Drag to turn · hover a star for its title and routes · click to open', '拖动旋转 · 悬停看标题和它的连线 · 点击打开')}</p></div>
   <p class="sky-note">${t('Positions are the papers\' places in the 3-D sky (content similarity), re-centred on this cluster and spread apart to avoid overlap; nearness is not a citation. Colour is year (blue older → yellow-green newer); size follows the brightness band selected above. Lines with arrowheads are citations inside the Atlas (pointing to the cited paper); dashed lines join papers with three or more shared references. Labelled stars are this cluster\'s most cited papers.', '位置是论文在 3-D 星空中的位置（内容相近），以这个星团为中心重新铺开并略作分开；靠得近不代表有引用。颜色是年份（蓝＝较早 → 黄绿＝较新），大小随上方选择的亮度波段变化。带箭头的线是 Atlas 内的引用（指向被引论文）；虚线连接共享三篇以上参考文献的论文。带标签的是这个星团被引最多的论文。')}</p>${lists}</div>`;
}

// ------------------------------------------------------------------ 3-D views (drawing in graph3d.js)
let xyz3 = null, pending3d = null; // pending3d: what the panel being drawn wants in its 3-D canvas
async function load3d() {if (!xyz3) {const at = await loadXYZ(); xyz3 = sky.ids.map(id => at.get(id) || null);}}
const spread3d = ids => spreadLocal(ids.map(i => xyz3[i]), ids.map(i => sky.ids[i]));
function mount3d(panel, turning, t) {
  const host = panel.querySelector('[data-sky-c3d]'), spec = pending3d; pending3d = null; if (!host || !spec) return;
  const {ids, pts, links, seed = -1, note, fit} = spec, degree = ids.map(() => 0);
  for (const [a, b] of links) {degree[a]++; degree[b]++;}
  mountGraph3d(host, {pts, links, fit, ring: seed, turning, attr: 'skyStar', idOf: q => ids[q],
    fill: ids.map((i, q) => q === seed ? '#ffffff' : yearColor(yearOf(i))), rad: ids.map((i, q) => q === seed ? 11 : 3 + sizeOf(i) * 1.6), glow: ids.map(i => !!spec.bright?.has(i)),
    tip: q => {const i = ids[q]; return `<b>${esc(titleOf(i))}</b><span>${yearOf(i) || '—'} · ${sky.cites[i] >= 0 ? sky.cites[i] + t(' citations', ' 次被引') : t('citations unknown', '被引未知')} · ${note ? note(q) : `${degree[q]} ${t('routes in this view', '条图中连线')}`}</span>`;}});
}

// ------------------------------------------------------------------ one paper: everything related to it
async function paperView(i, ctx, v) {
  const {t} = ctx, r = await rel(i), {lists, ranked} = related(r), p = paperOf(i);
  const tab = v.tab || 'all', hop2 = v.hops === '2';
  let rows = tab === 'all' ? ranked : tab === 'background' ? [] : lists[tab].map(j => ranked.find(x => x.i === j));
  let second = [];
  if (hop2 && tab === 'all') {
    const firstSet = new Set([i, ...ranked.map(x => x.i)]), agg = new Map();
    for (const x of ranked.slice(0, 15)) {
      const rr = related(await rel(x.i)).ranked;
      for (const y of rr.slice(0, 20)) if (!firstSet.has(y.i)) {const e = agg.get(y.i) || {i: y.i, score: 0, via: []}; e.score += x.score * y.score * 60; e.via.push(x.i); agg.set(y.i, e);}
    }
    second = [...agg.values()].sort((a, b) => b.score - a.score);
  }
  const graphIds = ranked.slice(0, 28).map(x => x.i);
  // 3-D: the paper sits at the centre; each related paper keeps its direction from it in the 3-D sky, and its distance is
  // its relatedness rank (closer = more related); directions are then spread a little so stars do not overlap
  await load3d();
  const ids = [i, ...graphIds], base = xyz3[i], m = graphIds.length;
  const target = [0, ...graphIds.map((k, r) => 0.5 + 0.5 * r / Math.max(1, m - 1))];
  const pts = ids.map((k, q) => {
    if (!q) return [0, 0, 0];
    const d = base && xyz3[k] ? xyz3[k].map((x, a) => x - base[a]) : [0, 1, 2].map(a => hash(sky.ids[k], 21 + a) - 0.5), L = Math.hypot(...d) || 1;
    return d.map(x => x / L * target[q]);
  });
  for (let it = 0; it < 80; it++) {
    for (let a = 1; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      const dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1], dz = pts[b][2] - pts[a][2], d = Math.hypot(dx, dy, dz) || 1e-6;
      if (d < 0.46) {const f = (0.46 - d) / 2 / d; pts[a][0] -= dx * f; pts[a][1] -= dy * f; pts[a][2] -= dz * f; pts[b][0] += dx * f; pts[b][1] += dy * f; pts[b][2] += dz * f;}
    }
    for (let q = 1; q < ids.length; q++) {const L = Math.hypot(...pts[q]) || 1; pts[q] = pts[q].map(x => x / L * target[q]);}
  }
  const kindOf = why => ['refs', 'citedBy', 'coupling', 'cocited', 'similar'].find(k => why.some(w => w[0] === k));
  const style = {refs: 'cites', citedBy: 'cites', coupling: 'shared', cocited: 'cocited', similar: 'similar'};
  const why = new Map(ranked.slice(0, 28).map(x => [x.i, x.why]));
  const links = graphIds.map((k, r) => {const kind = kindOf(why.get(k)); return kind === 'citedBy' ? [r + 1, 0, style[kind]] : [0, r + 1, style[kind]];});
  const whyText = {refs: t('it cites this', '被它引用'), citedBy: t('cites it', '引用了它'), coupling: t('shared references', '共同参考文献'), cocited: t('cited together', '常被同时引用'), similar: t('similar content', '内容相近')};
  pending3d = {ids, pts, links, seed: 0, fit: [0.4, 0.43], note: q => q ? `${t('related rank ', '相关排名第 ')}${q}${t('', ' 位')} · ${(why.get(ids[q]) || []).map(w => whyText[w[0]]).join(' · ')}` : t('this paper', '当前论文')};
  const named = [...graphIds].sort((a, b) => sky.cites[b] - sky.cites[a]).slice(0, 8);
  const labelBtns = named.map(k => `<button class="sky-c3d-label${k === i ? ' is-seed' : ''}" data-sky-star="${k}" data-g3="${ids.indexOf(k)}">${esc(titleOf(k).split(':')[0].slice(0, 30))}</button>`).join('');
  const counts = {all: ranked.length, refs: lists.refs.length, citedBy: lists.citedBy.length, coupling: lists.coupling.length, cocited: lists.cocited.length, similar: lists.similar.length, background: r.background.length};
  const tabName = {all: t('All related', '全部相关'), refs: t('References', '参考文献'), citedBy: t('Cited by', '被引用'), coupling: t('Shared references', '共同参考文献'), cocited: t('Cited together', '常被同时引用'), similar: t('Similar content', '内容相近'), background: t('Outside the Atlas', 'Atlas 以外')};
  const tabs = Object.keys(tabName).map(k => `<button data-sky-tab="${k}" aria-pressed="${tab === k}">${tabName[k]} <span>${counts[k]}</span></button>`).join('');
  const item = (x, extra = '') => `<li class="sky-rel"><div><button class="sky-link" data-sky-star="${x.i}">${esc(titleOf(x.i))}</button><span class="sky-rel-meta">${yearOf(x.i) || '—'} · ${sky.cites[x.i] >= 0 ? sky.cites[x.i].toLocaleString() + t(' citations', ' 次被引') : t('citations unknown', '被引未知')}</span><span class="sky-rel-why">${extra || reasonChips(x.why, t)}</span>${(x.why || []).some(w => w[0] === 'refs') ? `<q class="sky-ctx" data-sky-ctx="${i}-${x.i}" hidden></q>` : (x.why || []).some(w => w[0] === 'citedBy') ? `<q class="sky-ctx" data-sky-ctx="${x.i}-${i}" hidden></q>` : ''}</div><div class="sky-rel-actions"><button data-sky-open="${x.i}">${t('Details', '详情')}</button><button data-sky-route="${x.i}">${t('+ Route', '加入路线')}</button></div></li>`;
  let body;
  if (tab === 'background') {
    body = r.background.length ? `<ol class="sky-rel-list" data-sky-bglist="${r.background.map(b => b + ':0').join(',')}"><li class="sky-small">${t('Loading…', '加载中…')}</li></ol>` : `<p class="sky-small">${t('No outside reference here is cited by two or more Atlas papers.', '这篇论文没有被两篇以上 Atlas 论文共同引用的库外参考文献。')}</p>`;
  } else {
    const page = rows.filter(Boolean).slice(0, v.more ? 200 : 30);
    body = `<ol class="sky-rel-list">${page.map(x => item(x)).join('') || `<li class="sky-small">${t('None recorded. Missing links mean not recorded in the current data, not unrelated.', '暂无记录。缺少关系表示当前数据未记录，不表示无关。')}</li>`}</ol>${rows.length > page.length ? `<button class="sky-more" data-sky-more>${t('Show all ', '显示全部 ')}${rows.length}</button>` : ''}`;
    if (hop2 && tab === 'all') body += `<h4 class="sky-hop">${t('One step further', '再向外一步')} <span>${second.length}</span></h4><p class="sky-small">${t('Papers related to the related papers above, ranked by how strongly they connect through them.', '与上面相关论文相关的论文，按经由它们的连接强度排序。')}</p><ol class="sky-rel-list">${second.slice(0, v.more ? 300 : 30).map(x => item(x, `<span class="sky-why">${t('via ', '经由 ')}${x.via.slice(0, 2).map(k => esc(titleOf(k).split(':')[0].slice(0, 28))).join('；')}</span>`)).join('')}</ol>`;
  }
  const outside = r.refsOutside ? `<p class="sky-small">${r.refsOutside} ${t('of its references are outside the Atlas.', '篇参考文献在 Atlas 以外。')}</p>` : '';
  let connectResult = '';
  if (v.connectB !== '' && v.connectB !== undefined && +v.connectB !== i) {
    const b = +v.connectB, paths = await connectPaths(i, b, v.csim);
    connectResult = `<p class="sky-small">${t('To: ', '连到：')}<button class="sky-link" data-sky-star="${b}">${esc(titleOf(b))}</button> <button class="sky-more" data-sky-cclear>${t('Clear', '清除')}</button></p>` + (paths.length
      ? paths.map((path, k) => `<div class="sky-path"><span class="sky-path-head">${t('Connection ', '连接 ')}${k + 1} · ${path.length} ${t(path.length === 1 ? 'hop' : 'hops', '步')}</span><ol>${path.map(h => `<li>${hopText(h, t)}</li>`).join('')}</ol><button class="sky-more" data-sky-route-many="${[...new Set(path.flatMap(h => [h.from, h.to]))].join(',')}">${t('Add these papers to the reading route', '把这些论文加入阅读路线')}</button></div>`).join('') +
        `<p class="sky-small">${t('A connection shows how the recorded relations link the two papers; it is not a line of influence, and the shortest path is not the best reading order.', '连接说明已记录的关系如何把两篇论文连起来；它不是影响链，最短路径也不等于最佳阅读顺序。')}</p>`
      : `<p class="sky-small">${t('No connection found within four hops in the current data and settings. That does not mean the two are unrelated.', '当前数据与设置下，四步之内未发现连接。这不表示两篇论文无关。')}</p>`);
  }
  const connect = `<details class="sky-connect" ${v.connectB !== '' && v.connectB !== undefined ? 'open' : ''}><summary>${t('Connect to another paper', '连接到另一篇论文')}</summary>
   <form class="sky-search sky-csearch" data-sky-cform><input type="search" data-sky-cq autocomplete="off" placeholder="${t('Title of the other paper…', '另一篇论文的标题…')}" aria-label="${t('Find the other paper', '查找另一篇论文')}"><ul class="sky-suggest" data-sky-csuggest></ul></form>
   <label class="sky-hops"><input type="checkbox" data-sky-csim ${v.csim ? 'checked' : ''}> ${t('Also use content similarity (≥ 0.90, a computed candidate)', '也使用内容相近（≥ 0.90，计算出的候选关联）')}</label>${connectResult}</details>`;
  return `<div class="sky-paper"><div class="sky-paper-head"><div><span class="sky-eyebrow">${t('OPEN EXPLORATION', '开放探索')}</span><h3>${esc(p.title)}</h3><p>${esc((p.authors || []).slice(0, 4).join(', '))}${(p.authors || []).length > 4 ? ' …' : ''} · ${yearOf(i) || '—'} · ${sky.cites[i] >= 0 ? sky.cites[i].toLocaleString() + t(' citations', ' 次被引') : t('citations unknown', '被引未知')}</p></div>
   <div class="sky-paper-actions"><button data-sky-open="${i}">${t('Details', '详情')}</button><button data-sky-seed="${i}">${t('Use as seed', '设为种子')}</button><button data-sky-route="${i}">${t('Add to reading route', '加入阅读路线')}</button>${v.history?.length ? `<button data-sky-back>← ${t('Back', '返回')}</button>` : ''}</div></div>
   <div class="sky-paper-grid"><div><div class="sky-c3d is-paper" data-sky-c3d><canvas tabindex="0" role="img" aria-label="${t('Related papers in 3-D; drag or use the arrow keys to turn', '相关论文 3-D 图；拖动或用方向键旋转')}"></canvas><div class="sky-c3d-labels">${labelBtns}</div><div class="sky-c3d-tip" data-g3-tip hidden></div><p class="sky-c3d-hint">${t('Drag to turn · hover a star · click to explore from it', '拖动旋转 · 悬停看关系 · 点击从它继续探索')}</p></div>
    <p class="sky-note">${t('The 28 most related papers around this one (white). Distance from the centre = relatedness rank (closer = more related); direction = where the paper lies from this one in the 3-D sky, spread a little to avoid overlap; colour = year; size = the brightness band selected above. Arrow = citation inside the Atlas (its citing sentence is shown in the list when Semantic Scholar has it); dashed = shared references; dash-dot = cited together by Atlas papers; dotted = similar content, a candidate only. Click any star to explore from it.', '与这篇论文（白色）最相关的 28 篇。离中心越近越相关（按相关排名）；方向＝在 3-D 星空中它相对这篇论文的方位（略作分开以免重叠）；颜色＝年份；大小＝上方选择的亮度波段。箭头＝Atlas 内引用（Semantic Scholar 有施引原句时，列表中会显示）；虚线＝共同参考文献；点划线＝被 Atlas 论文同时引用；点线＝内容相近，只是候选。点击任意一颗星，从它继续探索。')}</p></div>
    <div class="sky-paper-lists"><div class="sky-tabs" role="group">${tabs}</div><label class="sky-hops"><input type="checkbox" data-sky-hops ${hop2 ? 'checked' : ''}> ${t('Also go one step further (related to the related)', '再向外一步（相关论文的相关论文）')}</label>${body}${outside}${connect}
     <p class="sky-small">${t('All related merges the five lists by reciprocal rank fusion; each paper shows every reason it was found. Shared references count references in common (inside and outside the Atlas); cited together counts Atlas papers citing both.', '“全部相关”用倒数排名融合合并五个列表，每篇都列出被找到的全部理由。共同参考文献统计两篇共有的参考文献（含 Atlas 以外）；同时被引统计同时引用两篇的 Atlas 论文。')}</p></div></div></div>`;
}

// ------------------------------------------------------------------ mount and interaction
export function mountStarmap(root, ctx) {
  const {t, state} = ctx;
  band = BANDS.includes(state.skyBand) ? state.skyBand : sky.bands ? 'influence' : 'citations';
  const topicLabel = name => ctx.topicName ? ctx.topicName(name) : name;
  const c = {...ctx, topicLabel};
  root.innerHTML = renderStarmap(c);
  const panel = root.querySelector('[data-sky-panel]'), canvas = root.querySelector('[data-sky-canvas]');
  const v = {topic: state.skyTopic ?? '', thread: state.skyThread ?? '', paper: '', tab: 'all', hops: '', more: false, history: [], connectB: '', csim: false};
  if (state.skyPaper && sky.pos.has(state.skyPaper)) v.paper = sky.pos.get(state.skyPaper);
  const u = universe(canvas, {t, topicLabel, tip: root.querySelector('[data-sky-tip]'), onStar: i => go({paper: i}), onTopic: k => go({topic: k, thread: '', paper: ''})});
  const motionBtn = root.querySelector('[data-sky-motion]');
  const setMotion = on => {u.motion(on); motionBtn.setAttribute('aria-pressed', on); motionBtn.textContent = on ? t('Pause rotation', '暂停旋转') : t('Rotate', '旋转');};
  setMotion(u.st.motion);
  let rot = null;
  function spin() {
    cancelAnimationFrame(rot);
    const g = panel.querySelector('[data-sky-rot]'); if (!g || !u.st.motion) return;
    const labels = [...g.querySelectorAll('[data-sky-anchor]')];
    let a = 0, last = 0;
    const step = now => {if (!g.isConnected) return; if (u.st.motion && !g.matches(':hover')) {a += (last ? Math.min(100, now - last) : 16) / 1000 * 0.6;} last = now; g.setAttribute('transform', `rotate(${a.toFixed(2)})`); for (const l of labels) l.setAttribute('transform', `translate(${l.dataset.skyAnchor.replace(',', ' ')}) rotate(${(-a).toFixed(2)})`); rot = requestAnimationFrame(step);};
    rot = requestAnimationFrame(step);
  }
  function sync() {
    state.skyTopic = v.topic === '' ? '' : String(v.topic); state.skyThread = v.thread === '' ? '' : String(v.thread); state.skyPaper = v.paper === '' ? '' : sky.ids[v.paper];
    ctx.writeHash?.();
  }
  // The panel is a stack of levels that stay open: 1 a cluster, chosen from the row of clusters right above its disc of
  // clusters, 2 one cluster, 3 one paper. Choosing something opens the next level below without closing
  // those above, and the largest cluster is open by default so the disc is visible without a click. Only a level whose
  // content changed is redrawn, so the 3-D views and the turning disc above keep their state.
  const defaultTopic = sky.topics.map((tp, k) => [tp.count || 0, k]).sort((a, b) => b[0] - a[0])[0][1], drawn = {};
  panel.innerHTML = [1, 2, 3].map(n => `<section class="sky-level" data-sky-level="${n}"></section>`).join('');
  const head = (n, title, close) => `<div class="sky-level-head"><span class="sky-level-kicker">${t(`Level ${n}`, `第${'一二三'[n - 1]}层`)}</span><h3>${title}</h3>${close ? `<button class="sky-level-close" data-sky-close="${n}">${t('Close', '收起')}</button>` : ''}</div>`;
  const hint = text => `<p class="sky-level-hint">${text}</p>`;
  async function draw(scrollTo) {
    sync();
    const topicK = v.topic !== '' ? +v.topic : defaultTopic;
    // the 3-D sky above follows explicit choices only, so its first view is the whole universe
    if (v.paper !== '') {const r = await rel(v.paper), {ranked} = related(r); u.focus(v.paper, ranked.slice(0, 14).map(x => x.i));}
    else {
      u.focus(-1);
      if (v.thread !== '') u.highlight(new Set([...sky.threads[v.thread].members, ...(sky.threads[v.thread].attached || [])]), true);
      else if (v.topic !== '') u.highlight(new Set(sky.topics_of.map((ts, i) => ts.includes(+v.topic) ? i : -1).filter(i => i >= 0)), true);
      else u.highlight(null, true);
    }
    const name = topicLabel(sky.topics[topicK].name);
    const want = {1: `disc:${topicK}`, 2: v.thread === '' ? '' : `thread:${v.thread}`,
      3: v.paper === '' ? '' : JSON.stringify([v.paper, v.tab, v.more, v.hops, v.connectB, v.csim, v.history.length])};
    for (const n of [1, 2, 3]) {
      if (drawn[n] === want[n]) continue;
      const sec = panel.querySelector(`[data-sky-level="${n}"]`);
      pending3d = null;
      let body;
      if (n === 1) body = head(1, t(`Cluster “${name}”`, `星团“${name}”`)) + clusterRow(c, topicK) + solar(topicK, c);
      else if (n === 2) body = v.thread === '' ? head(2, t('Cluster', '星团')) + hint(t('Click a sector or a card in the disc above to open that cluster here: its papers in 3-D, and its prior, derivative, latest and bridge works.', '在上面的星盘里点一个扇区或一张卡片，这里会展开那个星团：论文的 3-D 图，以及前序、后续、最新和桥梁论文。'))
        : head(2, t('Cluster', '星团'), true) + await constellation(+v.thread, c);
      else body = v.paper === '' ? head(3, t('Paper', '论文')) + hint(t('Click any star, in the sky or in the levels above, to open that paper here with everything related to it.', '点击任意一颗星（上方星空或以上各层里），这里会展开那篇论文和与它相关的全部论文。'))
        : head(3, t('Paper', '论文'), true) + await paperView(v.paper, c, v);
      sec.innerHTML = body; drawn[n] = want[n];
      sec.classList.toggle('is-empty', want[n] === '');
      if (pending3d) mount3d(sec, () => u.st.motion && !reduceMotion(), c.t);
      if (n === 1) {spin(); const row = sec.querySelector('.sky-chips'), on = row?.querySelector('.is-active'); if (on) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;}
      fillBackground(sec); fillContexts(sec, t);
    }
    // the chosen cluster and cluster stay marked on the levels above
    for (const el of panel.querySelectorAll('[data-sky-level="1"] [data-th]')) el.classList.toggle('is-picked', v.thread !== '' && el.dataset.th === String(v.thread));
    if (scrollTo) panel.querySelector(`[data-sky-level="${scrollTo}"]`)?.scrollIntoView({block: 'start', behavior: reduceMotion() ? 'instant' : 'smooth'});
  }
  async function fillBackground(scope) {
    for (const ol of scope.querySelectorAll('[data-sky-bglist]')) {
      const bg = await loadBackground(), items = ol.dataset.skyBglist.split(',').filter(Boolean).map(s => s.split(':').map(Number));
      ol.innerHTML = items.map(([b, n]) => {const e = bg[b]; return e ? `<li><a href="https://www.semanticscholar.org/paper/${esc(e.s2)}" target="_blank" rel="noopener">${esc(e.title)}</a><span>${e.year || '—'} · ${t('cited by ', '被 ')}${e.atlasCiting}${t(' Atlas papers', ' 篇 Atlas 论文引用')}${n ? ` · ${n}${t(' here', ' 篇在此')}` : ''}</span></li>` : '';}).join('');
    }
  }
  function go(next, back) {
    // papers visited in open exploration form a back stack; leaving paper view clears it
    if (next.paper !== undefined && next.paper !== '' && v.paper !== '' && next.paper !== v.paper && !back) v.history.push(v.paper);
    if (next.paper === '') v.history = [];
    Object.assign(v, {tab: 'all', more: false, connectB: ''}, next);
    draw(next.paper !== undefined && next.paper !== '' ? 3 : next.thread !== undefined && next.thread !== '' ? 2 : next.topic !== undefined && next.topic !== '' ? 1 : 0);
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-sky-close],[data-sky-cb],[data-sky-cclear],[data-sky-route-many],[data-sky-go],[data-sky-thread],[data-sky-star],[data-sky-tab],[data-sky-open],[data-sky-route],[data-sky-seed],[data-sky-back],[data-sky-more],[data-sky-topic],[data-sky-zoom],[data-sky-reset],[data-sky-motion]');
    if (!b) return;
    const d = b.dataset;
    if (d.skyClose) {if (d.skyClose === '2') v.thread = ''; else {v.paper = ''; v.history = [];} draw(0); return;}
    // a cluster chosen in the row stays in view: its disc redraws right below it
    if (b.matches('.sky-chip')) {Object.assign(v, {topic: +d.skyTopic, thread: '', paper: '', tab: 'all', more: false, connectB: '', history: []}); draw(0); return;}
    if (d.skyCb !== undefined) {v.connectB = +d.skyCb; draw(0); return;}
    if ('skyCclear' in d) {v.connectB = ''; draw(0); return;}
    if (d.skyRouteMany) {
      const host = document.querySelector('.research-paths'); if (!host) { ctx.handOff?.('seed', sky.ids[+d.skyRouteMany.split(',')[0]]); return; }
      for (const k of d.skyRouteMany.split(',')) {const btn = document.createElement('button'); btn.hidden = true; btn.dataset.rxAdd = sky.ids[+k]; host.appendChild(btn); btn.click(); btn.remove();}
      b.textContent = t('Added ✓', '已加入 ✓'); return;
    }
    if (d.skyGo) {if (d.skyGo === 'universe') go({topic: '', thread: '', paper: ''}); else if (d.skyGo === 'system') go({thread: '', paper: ''}); else if (d.skyGo === 'thread') go({paper: ''});}
    else if (d.skyThread !== undefined && d.skyThread !== '') {const k = +d.skyThread; go({topic: sky.topics.findIndex(tp => tp.name === sky.threads[k].topic), thread: k, paper: ''});}
    else if (d.skyStar !== undefined) go({paper: +d.skyStar});
    else if (d.skyTopic !== undefined) go({topic: +d.skyTopic, thread: '', paper: ''});
    else if (d.skyTab) {v.tab = d.skyTab; v.more = false; draw(0);}
    else if ('skyMore' in d) {v.more = true; draw(0);}
    else if (d.skyOpen) ctx.openPaper?.(sky.ids[+d.skyOpen]);
    else if (d.skyRoute || d.skySeed) {
      // hand the paper to the explorer below, so the route and seeds keep a single implementation
      const host = document.querySelector('.research-paths');
      if (!host) { ctx.handOff?.(d.skyRoute ? 'route' : 'seed', sky.ids[+(d.skyRoute || d.skySeed)]); return; }  // the explorer is on the paths page
      const btn = document.createElement('button'); btn.hidden = true; btn.dataset[d.skyRoute ? 'rxAdd' : 'rxSeed'] = sky.ids[+(d.skyRoute || d.skySeed)];
      host.appendChild(btn); btn.click(); btn.remove();
      const s = document.getElementById('rp-action-status'); b.textContent = d.skyRoute ? t('Added ✓', '已加入 ✓') : t('Seed added ✓', '已设为种子 ✓');
      if (s && !s.textContent) s.textContent = b.textContent;
    }
    else if ('skyBack' in d) {const prev = v.history.pop(); if (prev !== undefined) go({paper: prev}, true);}
    else if (d.skyZoom) u.zoom(+d.skyZoom);
    else if ('skyReset' in d) u.reset();
    else if ('skyMotion' in d) setMotion(!u.st.motion);
  });
  root.addEventListener('change', e => {
    if (e.target.matches('[data-sky-band]')) {band = e.target.value; state.skyBand = band === 'influence' ? '' : band; ctx.writeHash?.(); u.kick(); const n = root.querySelector('[data-sky-bandnote]'); if (n) n.innerHTML = `<b>${t('Brightness depends on the observer.', '亮度取决于观测者。')}</b> ${t('Size follows the band chosen above: ', '大小随上方选择的波段变化：')}${bandName(band, t)} — ${bandNote(t)}${t('.', '。')}`; draw(0); return;}
    if (e.target.matches('[data-sky-hops]')) {v.hops = e.target.checked ? '2' : ''; draw(0);}
    else if (e.target.matches('[data-sky-csim]')) {v.csim = e.target.checked; draw(0);}
  });
  root.addEventListener('submit', e => {if (e.target.matches('[data-sky-cform]')) {e.preventDefault(); e.target.querySelector('[data-sky-cb]')?.click();}});
  root.addEventListener('input', e => {
    if (!e.target.matches('[data-sky-cq]')) return;
    const terms = e.target.value.toLowerCase().split(/\s+/).filter(w => w.length > 1), list = e.target.parentElement.querySelector('[data-sky-csuggest]');
    if (!terms.length) {list.innerHTML = ''; return;}
    const hits = []; lower.forEach((x, k) => {if (terms.every(w => x.includes(w))) hits.push(k);});
    list.innerHTML = hits.sort((a, b) => sky.cites[b] - sky.cites[a]).slice(0, 8).map(k => `<li><button type="button" data-sky-cb="${k}">${esc(titleOf(k))}<span>${yearOf(k) || ''}</span></button></li>`).join('') || `<li class="sky-small">${t('No title matches.', '没有匹配的标题。')}</li>`;
  });
  // a sector, its label, its stars and its card name the same cluster: hovering any of them lights up the rest
  function lightThread(wrap, key, fromFigure) {
    if ((wrap.dataset.hl ?? '') === (key ?? '')) return;
    wrap.dataset.hl = key ?? '';
    wrap.querySelectorAll('.is-on').forEach(el => el.classList.remove('is-on'));
    wrap.classList.toggle('is-th-focus', key != null);
    if (key == null) return;
    wrap.querySelectorAll(`[data-th="${key}"]`).forEach(el => el.classList.add('is-on'));
    const card = fromFigure && wrap.querySelector(`.sky-thread-card[data-th="${key}"]`), list = card && card.closest('.sky-thread-list');
    if (list) {const lr = list.getBoundingClientRect(), cr = card.getBoundingClientRect(); if (cr.top < lr.top || cr.bottom > lr.bottom) list.scrollBy({top: cr.top - lr.top - (lr.height - cr.height) / 2, behavior: 'smooth'});}
  }
  root.addEventListener('pointerover', e => {const w = e.target.closest('.sky-system-wrap'); if (!w) return; const el = e.target.closest('[data-th]'); lightThread(w, el ? el.dataset.th : null, !!e.target.closest('.sky-system'));});
  root.addEventListener('pointerout', e => {const w = e.target.closest('.sky-system-wrap'); if (w && !w.contains(e.relatedTarget)) lightThread(w, null);});
  root.addEventListener('focusin', e => {const w = e.target.closest('.sky-system-wrap'), el = e.target.closest('[data-th]'); if (w) lightThread(w, el ? el.dataset.th : null, false);});
  root.addEventListener('keydown', e => {if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-sky-star],g[data-sky-thread]')) {e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', {bubbles: true}));}});
  // title search: highlights matching stars, lists the best matches
  const q = root.querySelector('[data-sky-q]'), sug = root.querySelector('[data-sky-suggest]');
  const lower = sky.ids.map((_, i) => titleOf(i).toLowerCase());
  q.addEventListener('input', () => {
    const terms = q.value.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (!terms.length) {u.highlight(null); sug.innerHTML = ''; return;}
    const hits = []; lower.forEach((s, i) => {if (terms.every(w => s.includes(w))) hits.push(i);});
    u.highlight(new Set(hits));
    sug.innerHTML = hits.sort((a, b) => sky.cites[b] - sky.cites[a]).slice(0, 8).map(i => `<li><button data-sky-star="${i}">${esc(titleOf(i))}<span>${yearOf(i) || ''}</span></button></li>`).join('') + (hits.length ? `<li class="sky-small">${hits.length} ${t('matching stars lit', '颗匹配的星已点亮')}</li>` : `<li class="sky-small">${t('No title matches.', '没有匹配的标题。')}</li>`);
  });
  root.querySelector('[data-sky-search]').addEventListener('submit', e => {e.preventDefault(); sug.querySelector('[data-sky-star]')?.click();});
  draw(0);
}

function clusterRow(ctx, active) {
  const {t, topicLabel} = ctx, m = sky.meta.coverage;
  const chips = sky.topics.map((tp, k) => ({tp, k})).sort((a, b) => (b.tp.count || 0) - (a.tp.count || 0))
    .map(({tp, k}) => `<button class="sky-chip${k === active ? ' is-active' : ''}" data-sky-topic="${k}" aria-pressed="${k === active}" style="--c:${sky.light[tp.theme]}"><i></i>${esc(topicLabel(tp.name))}<span>${(tp.count || 0).toLocaleString()}</span></button>`).join('');
  return `<p class="sky-small">${t('Choose one of the 61 consensus clusters of the field map; its colour is its theme (galaxy). Each paper belongs to at most one cluster; the disc below shows the cluster\'s papers by year.', '从领域地图的 61 个共识星团中选择一个，颜色表示它所属的主题（星系）。每篇论文至多属于一个星团；下面的星盘按年份展示这个星团的论文。')} ${t(`${m.worksWithAtlasLink.toLocaleString()} of the ${sky.n.toLocaleString()} papers have at least one recorded citation link to another paper of the map.`, `${sky.n.toLocaleString()} 篇论文中有 ${m.worksWithAtlasLink.toLocaleString()} 篇至少有一条与地图中其他论文的引用关系。`)}</p><div class="sky-chips" role="group" aria-label="${t('Clusters', '星团')}">${chips}</div>`;
}
