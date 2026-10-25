// Time map (探索台 · 时空地图): where agent-safety work comes from, month by month. A slider picks the month; the window is
// either the 12 months up to it or everything up to it. Filters: galaxy or cluster, and facet role (attack, defence,
// benchmark ...). Countries are shaded by their share of the window's works (or by works), in fixed steps so a colour means
// the same thing at every month, and the leading countries carry their number on the map; places too small for the 1:110m
// country shapes (Singapore, Hong Kong ...) get a shaded marker at their institutions. Institutions can be shown as dots.
// The side tables list countries (fractional credit, change against the window 12 months earlier) and institutions.
// Insights are computed from the same data on load and each one sets the map to the configuration that shows it.
// Country shapes: Natural Earth 1:110m Admin 0 v5.1.2 (public domain), data/countries.json.
import {flag} from './flags.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const W = 960, H = 440;
const ALL = {cluster: '', role: ''};
// class limits: share of the window's works (%) or works (fractional credit); class 0 is "none"
const STEPS = {share: [0.5, 1, 2, 5, 10], works: [1, 5, 15, 40, 100], insts: [1, 3, 10, 30, 80]};
// the visible part of the map (zoom and pan); k scales labels and markers so they keep their size on screen
const VB = {x: 0, y: 30, w: W, h: H - 90};
let view = {...VB}, drag = null, dragged = false;
let land = null, countries = null, facets = null, model = null, timer = null, landD = '', escBound = false;

export async function loadTimeMap() {
  if (!land) land = await fetch('./data/land.json').then(r => r.json());
  if (!countries) countries = await fetch('./data/countries.json').then(r => r.ok ? r.json() : {countries: []}).catch(() => ({countries: []}));
  if (!facets) facets = await fetch('./data/facets.json').then(r => r.ok ? r.json() : null).catch(() => null);
}

function months(a, b) { return (b.y - a.y) * 12 + (b.m - a.m); }
function build(ctx) {
  // one row per dated work: month index, clusters, galaxies, roles, located institutions
  const {data, taxonomy} = ctx, teamById = new Map(data.teams.map(x => [x.id, x]));
  const cats = taxonomy.categories.filter(c => !c.other), galaxyOf = Object.fromEntries(cats.flatMap((c, gi) => c.topics.map(tp => [tp, gi])));
  const start = {y: 2019, m: 1}, works = [];
  let last = start;
  for (const p of data.papers) {
    if (p.status !== 'included' || !/^\d{4}-\d{2}/.test(p.date || '')) continue;
    const d = {y: +p.date.slice(0, 4), m: +p.date.slice(5, 7)};
    if (d.y < 2019) continue;
    if (months(last, d) > 0) last = d;
    const topics = (taxonomy.paperTopics[p.id] || []).filter(tp => galaxyOf[tp] !== undefined);
    const locs = [];
    for (const tid of p.teams) {
      const tm = teamById.get(tid), loc = tm?.locations?.find(l => l.countryCode && l.lat != null);
      if (loc) locs.push({key: tid, name: tm.name, lat: loc.lat, lon: loc.lon, cc: loc.countryCode});
    }
    const f = facets?.works?.[p.id];
    works.push({id: p.id, mi: months(start, d), topics, galaxies: [...new Set(topics.map(tp => galaxyOf[tp]))], roles: f ? f[0] : null, locs});
  }
  // places without a 1:110m shape get a marker at the mean position of their institutions
  const shaped = new Set(countries.countries.map(c => c.cc)), sums = new Map();
  for (const tm of data.teams) for (const l of tm.locations || []) {
    if (!l.countryCode || l.lat == null || shaped.has(l.countryCode)) continue;
    const s0 = sums.get(l.countryCode) || [0, 0, 0];
    sums.set(l.countryCode, [s0[0] + l.lon, s0[1] + l.lat, s0[2] + 1]);
  }
  const markers = new Map([...sums].map(([cc, [x, y, n]]) => [cc, {x: (x / n + 180) / 360 * W, y: (90 - y / n) / 180 * H}]));
  const nMonths = months(start, last) + 1;
  const label = i => { const y = start.y + Math.floor((start.m - 1 + i) / 12), m = (start.m - 1 + i) % 12 + 1; return `${y}-${String(m).padStart(2, '0')}`; };
  return {works, nMonths, label, cats, markers, byId: new Map(data.papers.map(p => [p.id, p])), roleNames: facets?.fields?.role || [], hasFacets: !!facets};
}

function pick(st) {
  // works passing the filters, in the window ending at st.month
  const to = st.month, from = st.window === 'all' ? 0 : Math.max(0, to - 11);
  if (to < 0) return [];
  return model.works.filter(w => w.mi >= from && w.mi <= to && w.locs.length
    && (!st.cluster || (st.cluster.startsWith('g:') ? w.galaxies.includes(+st.cluster.slice(2)) : w.topics.includes(st.cluster)))
    && (st.role === '' || st.role == null || (w.roles && w.roles.includes(+st.role))));
}
function aggregate(ws) {
  const countries = new Map(), insts = new Map();
  for (const w of ws) {
    const ccs = [...new Set(w.locs.map(l => l.cc))];
    for (const cc of ccs) countries.set(cc, (countries.get(cc) || 0) + 1 / ccs.length);
    for (const l of w.locs) {
      const i = insts.get(l.key) || {key: l.key, name: l.name, lat: l.lat, lon: l.lon, cc: l.cc, ids: []};
      i.ids.push(w.id);
      insts.set(l.key, i);
    }
  }
  return {n: ws.length, countries: [...countries].map(([cc, credit]) => ({cc, credit})).sort((a, b) => b.credit - a.credit),
    insts: [...insts.values()].sort((a, b) => b.ids.length - a.ids.length)};
}
const shareOf = (a, cc) => { const c = a.countries.find(x => x.cc === cc); return a.n && c ? c.credit / a.n : 0; };

function insights(ctx) {
  // computed once per load; each one carries the configuration that shows it
  const {t, topicName} = ctx, last = model.nMonths - 1, C = cc => country(ctx, cc), pct = x => Math.round(100 * x);
  const rolling = Array.from({length: model.nMonths}, (_, m) => aggregate(pick({month: m, window: 'rolling', ...ALL})));
  const top = aggregate(pick({month: last, window: 'all', ...ALL})).countries.slice(0, 6).map(c => c.cc);
  const cross = [], gain = [], role = [], lead = [];
  // crossovers: a was behind b two years in, and has been ahead of b in every 12-month window since some month
  const m0 = 24;
  for (const a of top) for (const b of top) {
    if (a === b || shareOf(rolling[m0], a) >= shareOf(rolling[m0], b) || shareOf(rolling[last], a) < 0.05) continue;
    let flip = null;
    for (let m = m0; m <= last; m += 1) if (shareOf(rolling[m], a) > shareOf(rolling[m], b)) { if (flip === null) flip = m; } else flip = null;
    if (flip !== null) cross.push({text: t(`${C(a)} overtook ${C(b)} in ${model.label(flip)} (12-month window) and has stayed ahead since: ${pct(shareOf(rolling[last], a))}% vs ${pct(shareOf(rolling[last], b))}% now.`,
      `${C(a)}在 ${model.label(flip)} 超过${C(b)}（12 个月窗口），此后一直领先：目前 ${pct(shareOf(rolling[last], a))}% 对 ${pct(shareOf(rolling[last], b))}%。`), cfg: {month: flip, window: 'rolling', ...ALL, focus: a}});
  }
  // the largest share changes, last 12 months against the 12 before
  const ch = top.map(cc => [cc, shareOf(rolling[last], cc) - shareOf(rolling[last - 12], cc)]).sort((x, y) => y[1] - x[1]);
  for (const [cc, d] of [ch[0], ch[ch.length - 1]]) if (cc && Math.abs(d) >= 0.01) gain.push({text: d > 0
    ? t(`${C(cc)} gained the most share in the last 12 months: +${(100 * d).toFixed(1)} points, to ${pct(shareOf(rolling[last], cc))}%.`, `${C(cc)}在近 12 个月份额上升最多：+${(100 * d).toFixed(1)} 个百分点，达到 ${pct(shareOf(rolling[last], cc))}%。`)
    : t(`${C(cc)} lost the most share in the last 12 months: ${(100 * d).toFixed(1)} points, to ${pct(shareOf(rolling[last], cc))}%.`, `${C(cc)}在近 12 个月份额下降最多：${(100 * d).toFixed(1)} 个百分点，降到 ${pct(shareOf(rolling[last], cc))}%。`),
    cfg: {month: last, window: 'rolling', ...ALL, focus: cc}});
  // with labels: who writes the attacks and who writes the defences
  if (model.hasFacets) {
    const shares = {}, word = {attack: t('attack', '攻击'), defense: t('defence', '防御'), benchmark: t('benchmark', '基准')};
    for (const r of ['attack', 'defense', 'benchmark']) {
      const ri = model.roleNames.indexOf(r);
      if (ri >= 0) shares[r] = {a: aggregate(pick({month: last, window: 'rolling', cluster: '', role: String(ri)})), ri};
    }
    for (const cc of top.slice(0, 3)) {
      const xs = Object.entries(shares).filter(([, s]) => s.a.n >= 40).map(([r, s]) => [r, shareOf(s.a, cc), s.ri]).sort((x, y) => y[1] - x[1]);
      if (xs.length < 2) continue;
      const hi = xs[0], lo = xs[xs.length - 1];
      if (hi[1] - lo[1] >= 0.04) role.push({text: t(`${C(cc)} writes ${pct(hi[1])}% of ${word[hi[0]]} papers but ${pct(lo[1])}% of ${word[lo[0]]} papers (last 12 months).`,
        `近 12 个月，${C(cc)}贡献了 ${pct(hi[1])}% 的${word[hi[0]]}论文，但只有 ${pct(lo[1])}% 的${word[lo[0]]}论文。`), cfg: {month: last, window: 'rolling', cluster: '', role: String(hi[2]), focus: cc}});
    }
  }
  // clusters led by a country other than the overall leader, last 12 months
  for (const tp of model.cats.flatMap(c => c.topics)) {
    const a = aggregate(pick({month: last, window: 'rolling', cluster: tp, role: ''}));
    if (a.n < 30 || !a.countries.length || a.countries[0].cc === top[0]) continue;
    // since when the cluster leader has been ahead of the overall leader in every 12-month window
    const cc = a.countries[0].cc, other = top[0];
    let since = null;
    for (let m = m0; m <= last; m += 1) {
      const w = aggregate(pick({month: m, window: 'rolling', cluster: tp, role: ''}));
      if (w.n >= 10 && shareOf(w, cc) > shareOf(w, other)) { if (since === null) since = m; } else since = null;
    }
    const ahead = since !== null && since < last;
    lead.push({n: a.n, text: t(`${topicName(tp)}: ${C(cc)} leads in the last 12 months with ${pct(a.countries[0].credit / a.n)}% of ${a.n} works.${ahead ? ` It has been ahead of ${C(other)} in every 12-month window since ${model.label(since)} (${C(other)} ${pct(shareOf(a, other))}% now).` : ''}`,
      `${topicName(tp)}：近 12 个月由${C(cc)}领先，${a.n} 项中占 ${pct(a.countries[0].credit / a.n)}%${ahead ? `；自 ${model.label(since)} 起每个 12 个月窗口都领先${C(other)}（${C(other)}目前 ${pct(shareOf(a, other))}%）` : ''}。`),
      cfg: {month: last, window: 'rolling', cluster: tp, role: '', focus: cc}});
  }
  lead.sort((x, y) => y.n - x.n);
  return [];
}
function country(ctx, cc) {
  try { return new Intl.DisplayNames([ctx.state.lang === 'zh' ? 'zh-CN' : 'en'], {type: 'region'}).of(cc); } catch { return cc; }
}
function landPath() {
  if (landD) return landD;
  const ring = r => r.map(([x, y], i) => `${i ? 'L' : 'M'}${((x + 180) / 360 * W).toFixed(1)},${((90 - y) / 180 * H).toFixed(1)}`).join('') + 'Z';
  landD = land.features.map(f => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]).map(poly => poly.map(ring).join('')).join('')).join('');
  return landD;
}

function state(ctx) {
  const s = ctx.state, last = model.nMonths - 1;
  return {month: s.tmMonth === '' || s.tmMonth == null ? last : Math.max(0, Math.min(last, +s.tmMonth)), window: s.tmWindow === 'rolling' ? 'rolling' : 'all',
    cluster: s.tmCluster || '', role: s.tmRole ?? '', focus: s.tmFocus || '', measure: ['share', 'insts'].includes(s.tmMeasure) ? s.tmMeasure : 'works', dots: s.tmDots === '1'};
}
const stepOf = (v, measure) => { if (!(v > 0)) return 0; let k = 1; for (const lim of STEPS[measure]) if (v >= lim) k += 1; return Math.min(k, 6); };
const fmtShare = v => (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + '%';
function legend(ctx, measure) {
  const {t} = ctx, lim = STEPS[measure], f = measure === 'share' ? (x => x + '%') : (x => String(x));
  const labels = [`< ${f(lim[0])}`, ...lim.slice(0, 4).map((x, i) => `${f(x)}–${f(lim[i + 1])}`), `≥ ${f(lim[4])}`];
  return `<span class="tm-legend-title">${measure === 'share' ? t("Share of the window's works", '占本时间窗工作的比例') : measure === 'insts' ? t('Institutions in the window', '本时间窗的机构数') : t('Works in the window', '本时间窗工作数')}</span>${labels.map((l, i) => `<span class="tm-key"><i class="tm-c s${i + 1}"></i>${l}</span>`).join('')}<span class="tm-key"><i class="tm-c s0"></i>${t('none', '无')}</span>`;
}
function side(ctx, st, agg, prev) {
  const {t} = ctx;
  const rows = agg.countries.slice(0, 10).map(c => {
    const sh = c.credit / agg.n, d = sh - shareOf(prev, c.cc);
    return `<tr class="${st.focus === c.cc ? 'is-focus' : ''}"><th><button class="tm-cc" data-tm-focus="${c.cc}" title="${esc(country(ctx, c.cc))}">${flag(c.cc)}${esc(country(ctx, c.cc))}</button></th><td>${(100 * sh).toFixed(1)}%</td><td>${Math.round(c.credit).toLocaleString()}</td><td class="${d >= 0 ? 'tm-up' : 'tm-down'}">${prev.n ? (d >= 0 ? '+' : '') + (100 * d).toFixed(1) : ''}</td></tr>`;
  }).join('');
  const focusInsts = st.focus ? agg.insts.filter(i => i.cc === st.focus) : agg.insts;
  const irows = focusInsts.slice(0, 10).map(i => `<tr><th><button class="tm-cc" data-tm-inst="${esc(i.key)}" title="${esc(i.name)}">${flag(i.cc)}${esc(i.name)}</button></th><td>${agg.n ? (100 * i.ids.length / agg.n).toFixed(1) + '%' : ''}</td><td>${i.ids.length.toLocaleString()}</td></tr>`).join('');
  const head = cols => `<thead><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  if (!agg.n) return `<p class="muted">${t('No work in this window.', '本时间窗内没有工作。')}</p>`;
  return `<div><h4>${t('Countries and regions', '国家和地区')}</h4><table class="fd-table tm-table tm-rank tm-rank-c">${head([t('Share', '份额'), t('Works', '工作'), t('Change', '变化')])}<tbody>${rows}</tbody></table></div>
  <div><h4>${st.focus ? flag(st.focus) : ''}${st.focus ? t(`Institutions in ${country(ctx, st.focus)}`, `${country(ctx, st.focus)}的机构`) : t('Institutions', '机构')}</h4><table class="fd-table tm-table tm-rank tm-rank-i">${head([t('Share', '占比'), t('Works', '工作')])}<tbody>${irows || '<tr><th>—</th><td></td><td></td></tr>'}</tbody></table></div>
`;
}
function redraw(ctx) {
  // everything that changes with the month, filters or focus; the country shapes stay in place and only change class
  const root = document.querySelector('.tm');
  if (!root) return;
  const {t} = ctx, st = state(ctx), agg = aggregate(pick(st)), prev = aggregate(pick({...st, month: st.month - 12}));
  const nInst = new Map();
  for (const i of agg.insts) nInst.set(i.cc, (nInst.get(i.cc) || 0) + 1);
  const val = new Map(agg.countries.map(c => [c.cc, st.measure === 'share' ? 100 * c.credit / agg.n : st.measure === 'insts' ? nInst.get(c.cc) || 0 : c.credit]));
  const credit = new Map(agg.countries.map(c => [c.cc, c]));
  const tipOf = cc => { const c = credit.get(cc); return c ? `${country(ctx, cc)} · ${fmtShare(100 * c.credit / agg.n)} · ${Math.round(c.credit).toLocaleString()} ${t('works', '项')} · ${(nInst.get(cc) || 0).toLocaleString()} ${t('institutions', '个机构')}` : `${country(ctx, cc)} · 0`; };
  const k = view.w / W, svg = root.querySelector('.tm-map svg');
  svg.setAttribute('viewBox', `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`);
  svg.style.setProperty('--k', k.toFixed(4));
  for (const el of root.querySelectorAll('.tm-countries path')) {
    const cc = el.dataset.cc;
    el.setAttribute('class', `tm-c s${stepOf(val.get(cc), st.measure)}${st.focus === cc ? ' is-focus' : ''}`);
    el.setAttribute('data-tip', tipOf(cc));
  }
  // markers for places without a shape, labels for the leading countries (largest first, skipped when they would collide)
  const small = agg.countries.filter(c => model.markers.has(c.cc));
  root.querySelector('.tm-small').innerHTML = small.map(c => { const m = model.markers.get(c.cc); return `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${(5.5 * k).toFixed(2)}" class="tm-c s${stepOf(val.get(c.cc), st.measure)}${st.focus === c.cc ? ' is-focus' : ''}" data-tm-focus="${c.cc}" data-tip="${esc(tipOf(c.cc))}"/>`; }).join('');
  const pos = new Map(countries.countries.map(c => [c.cc, {x: c.lx, y: c.ly, anchor: 'middle'}]));
  for (const [cc, m] of model.markers) pos.set(cc, {x: m.x + 8 * k, y: m.y, anchor: 'start'});
  const order = agg.countries.filter(c => pos.has(c.cc)).sort((a, b) => (b.cc === st.focus) - (a.cc === st.focus) || b.credit - a.credit).slice(0, 24);
  const boxes = [], labels = [];
  for (const c of order) {
    if (labels.length >= Math.min(40, Math.round(14 / k))) break;
    const v = val.get(c.cc), txt = st.measure === 'share' ? fmtShare(v) : Math.round(v).toLocaleString(), p = pos.get(c.cc);
    if (p.x < view.x || p.x > view.x + view.w || p.y < view.y || p.y > view.y + view.h) continue;
    // the label point first, then just above, below, right or left of it; skipped only when all of these collide
    const w = (txt.length * 7.6 + 4) * k, free = bx => !boxes.some(b => bx[0] < b[2] && b[0] < bx[2] && bx[1] < b[3] && b[1] < bx[3]);
    const tries = [[0, 0], [0, -15 * k], [0, 15 * k], [w / 2 + 6 * k, 0], [-w / 2 - 6 * k, 0], [0, -30 * k], [0, 30 * k]];
    for (const [dx, dy] of tries) {
      const x = p.x + dx, y = p.y + dy, x0 = p.anchor === 'start' ? x : x - w / 2, box = [x0, y - 8 * k, x0 + w, y + 7 * k];
      if (!free(box)) continue;
      boxes.push(box);
      // on the two strongest steps the number flips to the other ink so it never sits light-on-lime (dark) or dark-on-dark (light)
      const strong = p.anchor === 'middle' && dx === 0 && dy === 0 && stepOf(v, st.measure) >= 5;
      labels.push(`<text x="${x.toFixed(1)}" y="${(y + 4.5 * k).toFixed(1)}" text-anchor="${p.anchor}"${strong ? ' class="on-strong"' : ''}>${esc(txt)}</text>`);
      break;
    }
  }
  root.querySelector('.tm-labels').innerHTML = labels.join('');
  const maxW = Math.max(1, ...agg.insts.map(i => i.ids.length)), r = n => (1.4 + 6 * Math.sqrt(n / maxW)) * Math.sqrt(k);
  root.querySelector('.tm-dots').innerHTML = st.dots ? agg.insts.slice().reverse().map(i => `<circle cx="${((i.lon + 180) / 360 * W).toFixed(1)}" cy="${((90 - i.lat) / 180 * H).toFixed(1)}" r="${r(i.ids.length).toFixed(1)}" class="tm-dot${st.focus && i.cc === st.focus ? ' is-focus' : ''}" data-tm-inst="${esc(i.key)}" data-tip="${esc(`${i.name} · ${i.ids.length} ${t('works', '项')}`)}"/>`).join('') : '';
  root.querySelector('.tm-legend').innerHTML = legend(ctx, st.measure);
  root.querySelector('.tm-summary').textContent = t(`${agg.n.toLocaleString()} works with a located institution in this window; ${agg.insts.length.toLocaleString()} institutions in ${agg.countries.length} countries and regions. Institution addresses, not nationalities.${st.dots ? ' Dots: institutions, area by works; click one for its papers.' : ''}`, `本时间窗内有已定位机构的工作 ${agg.n.toLocaleString()} 项；机构 ${agg.insts.length.toLocaleString()} 个，分布在 ${agg.countries.length} 个国家和地区。统计的是机构地址，不是国籍。${st.dots ? '圆点：机构，面积为工作数；点击查看论文。' : ''}`);
  root.querySelector('.tm-side').innerHTML = side(ctx, st, agg, prev);
  const from = st.window === 'all' ? 0 : Math.max(0, st.month - 11);
  root.querySelector('.tm-when').textContent = `${model.label(from)} → ${model.label(st.month)}`;
  const rg = root.querySelector('[data-tm="month"]');
  if (rg && +rg.value !== st.month) rg.value = st.month;
}
export function renderTimeMap(ctx) {
  const {t, topicName} = ctx;
  if (!model) { model = build(ctx); model.insights = insights(ctx); }
  const st = state(ctx);
  const clusterOpts = `<option value="">${t('All clusters', '全部星团')}</option>${model.cats.map((c, gi) => `<optgroup label="${esc(ctx.translated(c.en))}"><option value="g:${gi}"${st.cluster === 'g:' + gi ? ' selected' : ''}>${esc(ctx.translated(c.en))} · ${t('whole galaxy', '整个星系')}</option>${c.topics.map(tp => `<option value="${esc(tp)}"${st.cluster === tp ? ' selected' : ''}>${esc(topicName(tp))}</option>`).join('')}</optgroup>`).join('')}`;
  const roleNames = {attack: t('Attack', '攻击'), defense: t('Defence', '防御'), benchmark: t('Benchmark', '基准'), measurement: t('Measurement', '测量'), analysis_theory: t('Analysis & theory', '分析与理论'), system_tool: t('System & tool', '系统与工具'), survey_position: t('Survey & position', '综述与立场')};
  const roleOpts = model.hasFacets ? `<option value="">${t('All roles', '全部角色')}</option>${model.roleNames.map((n, i) => `<option value="${i}"${String(st.role) === String(i) ? ' selected' : ''}>${roleNames[n] || n}</option>`).join('')}` : '';
  const seg = [['works', t('Works', '工作数')], ['share', t('Share', '份额')], ['insts', t('Institutions', '机构数')]].map(([k, l]) => `<button data-tm-measure="${k}" aria-pressed="${st.measure === k}" class="${st.measure === k ? 'is-on' : ''}">${l}</button>`).join('');
  return `<div class="fd tm">
  <div class="tm-controls"><label>${t('Cluster', '星团')} <select data-tm="cluster">${clusterOpts}</select></label>
  ${roleOpts ? `<label>${t('Role', '角色')} <select data-tm="role">${roleOpts}</select></label>` : ''}
  <label>${t('Window', '时间窗')} <select data-tm="window"><option value="all"${st.window === 'all' ? ' selected' : ''}>${t('All time up to the month', '截至该月的全部时间')}</option><option value="rolling"${st.window === 'rolling' ? ' selected' : ''}>${t('12 months up to the month', '截至该月的 12 个月')}</option></select></label>
  <span class="tm-seg" role="group" aria-label="${t('Shade by', '着色依据')}">${seg}</span>
  <label class="tm-check"><input type="checkbox" data-tm="dots"${st.dots ? ' checked' : ''}> ${t('Institutions', '机构圆点')}</label>
  ${st.cluster || st.role !== '' || st.focus ? `<button class="tm-reset" data-tm-reset>${t('Reset', '重置')}</button>` : ''}</div>
  <div class="tm-time"><button class="tm-play" data-tm-play aria-label="${timer ? t('Pause', '暂停') : t('Play', '播放')}">${timer ? '❚❚' : '▶'}</button><input type="range" min="0" max="${model.nMonths - 1}" value="${st.month}" data-tm="month" aria-label="${t('Month', '月份')}"><b class="tm-when"></b></div>
  <div class="tm-grid"><div class="tm-main"><div class="tm-map"><div class="tm-zoom" role="group" aria-label="${t('Map zoom', '地图缩放')}"><button data-tm-zoom="in" aria-label="${t('Zoom in', '放大')}">+</button><button data-tm-zoom="out" aria-label="${t('Zoom out', '缩小')}">−</button><button data-tm-zoom="reset" aria-label="${t('Reset view', '复位')}">⟲</button></div><svg viewBox="${view.x} ${view.y} ${view.w} ${view.h}" role="img" aria-label="${t('Countries shaded by agent-safety works', '按 Agent 安全工作着色的国家')}"><path d="${landPath()}" class="tm-land"/>
  <g class="tm-countries">${countries.countries.map(c => `<path d="${c.d}" data-cc="${c.cc}" data-tm-focus="${c.cc}" class="tm-c s0"/>`).join('')}</g><g class="tm-small"></g><g class="tm-dots"></g><g class="tm-labels" aria-hidden="true"></g></svg></div>
  <div class="tm-legend"></div><p class="fd-note tm-summary"></p><p class="fd-note tm-rank-note">${t('Rankings: papers with institutions in several countries count in part for each; change is in share points against the window 12 months earlier; the share of an institution is its works over all located works. Click to highlight or open the papers.', '右侧排行：多国机构的论文按比例计入各国；变化为与早 12 个月的时间窗相比的份额百分点；机构占比为其参与的工作占已定位工作的比例。点击可高亮或查看论文。')}</p></div>
  <aside class="tm-ranks"><div class="tm-side"></div></aside></div>
  <div class="fd-tip" hidden></div><aside class="fd-drawer" hidden aria-live="polite"><div class="fd-drawer-head"><h3></h3><button class="fd-close" aria-label="${t('Close', '关闭')}">×</button></div><div class="fd-drawer-body"></div></aside></div>`;
}
function stop() { if (timer) { clearInterval(timer); timer = null; } }
export function bindTimeMap(ctx) {
  const root = document.querySelector('.tm');
  if (!root) return;
  const {t} = ctx, tip = root.querySelector('.fd-tip'), drawer = root.querySelector('.fd-drawer');
  const set = patch => { stop(); Object.assign(ctx.state, patch); ctx.writeHash(); ctx.render(); };
  const playBtn = () => { const b = root.querySelector('[data-tm-play]'); b.textContent = timer ? '❚❚' : '▶'; b.setAttribute('aria-label', timer ? t('Pause', '暂停') : t('Play', '播放')); };
  root.addEventListener('change', e => {
    const k = e.target.dataset.tm;
    if (k === 'cluster') set({tmCluster: e.target.value}); else if (k === 'role') set({tmRole: e.target.value}); else if (k === 'window') set({tmWindow: e.target.value});
    else if (k === 'month') { ctx.state.tmMonth = e.target.value; ctx.writeHash(); }
    else if (k === 'dots') { ctx.state.tmDots = e.target.checked ? '1' : ''; ctx.writeHash(); redraw(ctx); }
  });
  root.querySelector('[data-tm="month"]').addEventListener('input', e => { stop(); playBtn(); ctx.state.tmMonth = e.target.value; redraw(ctx); });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-tm-play],[data-tm-focus],[data-tm-inst],[data-tm-insight],[data-tm-reset],[data-tm-measure],[data-tm-zoom],.fd-close');
    if (!b) return;
    if (dragged && b.closest('svg')) { dragged = false; return; }  // the end of a pan is not a click
    if (b.matches('.fd-close')) { drawer.hidden = true; return; }
    if (b.dataset.tmZoom) { zoom(b.dataset.tmZoom === 'in' ? 0.5 : b.dataset.tmZoom === 'out' ? 2 : 0); redraw(ctx); return; }
    if (b.dataset.tmMeasure) {
      ctx.state.tmMeasure = b.dataset.tmMeasure === 'works' ? 'works' : '';
      for (const x of root.querySelectorAll('[data-tm-measure]')) { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); }
      ctx.writeHash(); redraw(ctx); return;
    }
    if (b.hasAttribute('data-tm-play')) {
      if (timer) { stop(); playBtn(); ctx.writeHash(); return; }
      const last = model.nMonths - 1;
      if (ctx.state.tmMonth === '' || ctx.state.tmMonth == null || +ctx.state.tmMonth >= last) ctx.state.tmMonth = 0;  // from the first month
      redraw(ctx);
      timer = setInterval(() => {
        if (!document.querySelector('.tm')) { stop(); return; }
        const m = +ctx.state.tmMonth + 1;
        if (m > last) { stop(); playBtn(); ctx.writeHash(); return; }
        ctx.state.tmMonth = m;
        redraw(ctx);
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 900 : 260);
      playBtn();
    } else if (b.hasAttribute('data-tm-reset')) set({tmCluster: '', tmRole: '', tmFocus: ''});
    else if (b.dataset.tmFocus) { ctx.state.tmFocus = ctx.state.tmFocus === b.dataset.tmFocus ? '' : b.dataset.tmFocus; ctx.writeHash(); redraw(ctx); }
    else if (b.dataset.tmInsight !== undefined) {
      const c = model.insights[+b.dataset.tmInsight].cfg;
      set({tmMonth: String(c.month), tmWindow: c.window, tmCluster: c.cluster, tmRole: c.role, tmFocus: c.focus});
      document.querySelector('.tm-time')?.scrollIntoView({block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    } else if (b.dataset.tmInst) {
      const inst = aggregate(pick(state(ctx))).insts.find(i => i.key === b.dataset.tmInst);
      if (!inst) return;
      const ids = inst.ids.slice().sort((x, y) => (model.byId.get(y)?.date || '').localeCompare(model.byId.get(x)?.date || ''));
      drawer.querySelector('h3').textContent = inst.name;
      drawer.querySelector('.fd-drawer-body').innerHTML = `<p class="fd-note">${t(`${ids.length} works in this window and filter`, `本时间窗与筛选下 ${ids.length} 项工作`)}</p><ol class="fd-drawer-list">${ids.map(id => { const p = model.byId.get(id); return `<li><button class="fd-paper" data-paper="${esc(id)}">${esc(p?.title || id)}</button><small>${esc((p?.date || '').slice(0, 7))}${p?.venue ? ' · ' + esc(p.venue) : ''}</small></li>`; }).join('')}</ol>`;
      drawer.hidden = false;
      drawer.querySelector('.fd-close').focus();
    }
  });
  root.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.getAttribute('data-tip');
    tip.hidden = false;
    const r = el.getBoundingClientRect(), host = root.getBoundingClientRect();
    tip.style.left = Math.min(host.width - 300, Math.max(0, r.left - host.left + r.width / 2 - 140)) + 'px';
    tip.style.top = (r.bottom - host.top + 8) + 'px';
  });
  root.addEventListener('mouseleave', () => { tip.hidden = true; });
  if (!escBound) {
    escBound = true;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { const d = document.querySelector('.tm .fd-drawer'); if (d && !d.hidden) d.hidden = true; } });
  }
  // pan by dragging, zoom with ctrl/cmd + wheel
  const svg = root.querySelector('.tm-map svg');
  svg.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, r: svg.getBoundingClientRect()}; dragged = false; });
  svg.addEventListener('pointermove', e => {
    if (!drag || view.w >= VB.w) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragged && Math.hypot(dx, dy) < 4) return;
    dragged = true;
    view.x = clamp(drag.vx - dx * view.w / drag.r.width, VB.x, VB.x + VB.w - view.w);
    view.y = clamp(drag.vy - dy * view.h / drag.r.height, VB.y, VB.y + VB.h - view.h);
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  });
  const end = () => { if (drag && dragged) redraw(ctx); drag = null; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointerleave', end);
  svg.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoom(e.deltaY < 0 ? 0.7 : 1 / 0.7); redraw(ctx); }, {passive: false});
  redraw(ctx);
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function zoom(f) {
  if (!f) { view = {...VB}; return; }
  const cx = view.x + view.w / 2, cy = view.y + view.h / 2, w = clamp(view.w * f, VB.w / 10, VB.w), h = w * VB.h / VB.w;
  view = {w, h, x: clamp(cx - w / 2, VB.x, VB.x + VB.w - w), y: clamp(cy - h / 2, VB.y, VB.y + VB.h - h)};
}
