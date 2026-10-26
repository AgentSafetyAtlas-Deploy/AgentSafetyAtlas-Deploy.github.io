// Landscape analysis (loaded on demand by app.js). Every chart counts included works from atlas.json / topic-taxonomy.json.
// A work in several themes or topics counts once in each (memberships); captions say so where it matters.
// Clickable marks carry data-go (the filters to apply) and open the matching papers; other marks explain themselves on hover.
import {flag, teamFlag} from './flags.js';

const PALETTE = ['#336aab', '#c26541', '#905082', '#5e8c2e', '#6458aa', '#ab4440', '#b48b12', '#00897a'];  // palette B (deepened), validated order
const ACCENT = '#1c6a57', ACCENT_LIGHT = '#a9cbc1';  // single measures (code, institutions, neutral cross-tabs): the site's own green
const GRAY = '#9aa3a1', INK = '#163b3a', FORM_SHADE = [100, 78, 60, 46, 34, 24];
const PAL = ctx => ctx.palette || PALETTE;
// heat cells in a given hue: mix with white by step, text colour picked for contrast
const SHADE = [0, 0.14, 0.3, 0.48, 0.66, 0.84, 1];
function mixHex(hex, p, base = '#ffffff') { const a = parseInt(hex.slice(1), 16), z = parseInt(base.slice(1), 16), ch = s => Math.round(((a >> s) & 255) * p + ((z >> s) & 255) * (1 - p)); return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join(''); }
function lum(hex) { const n = parseInt(hex.slice(1), 16); const c = [16, 8, 0].map(s => { const v = ((n >> s) & 255) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
// heat cells: light theme mixes toward white; the dark theme mixes toward its surface, with the site green brightened
const heat = (color, step) => {
  if (!step || !/^#[0-9a-f]{6}$/i.test(color)) return '';
  const dark = document.documentElement.dataset.theme === 'dark', bg = dark ? mixHex(color === ACCENT ? '#5fbf9f' : color, SHADE[step], '#0f2a26') : mixHex(color, SHADE[step]);
  // whichever of the dark ink and white reads better on this cell
  const ink = dark ? '#0b1f1c' : INK, L = lum(bg), cr = l => (Math.max(L, l) + 0.05) / (Math.min(L, l) + 0.05);
  return ` style="background:${bg};color:${cr(lum(ink)) >= cr(1) ? ink : '#fff'}"`;
};
const FAMILY_VENUES = {ml3: ['neurips', 'icml', 'iclr'], security4: ['sp', 'usenix', 'ccs', 'ndss'], ai: ['aaai', 'ijcai', 'aamas'],
  nlp: ['acl', 'emnlp', 'naacl', 'eacl', 'ijcnlp', 'coling', 'colm', 'tacl', 'acl-workshop']};
let bound = false, ctxRef = null;

const verified = p => ['published', 'accepted'].includes(p.publication.status);
// short labels in charts; the note under each chart spells them out
const FAMILY_SHORT = t => ({ml3: t('ML top-3', '机器学习三大会'), security4: t('Security top-4', '安全四大'), ai: t('AI conferences', 'AI 综合会议'), nlp: t('NLP venues', 'NLP 会议'),
  journals: t('Journals', '期刊'), other: t('Other venues', '其他来源'), unverified: t('Not yet verified', '尚未核实')});
const VENUE_SHORT = {'acl-workshop': ['ACL workshops', 'ACL 研讨会'], tacl: ['TACL', 'TACL'], ijcnlp: ['IJCNLP-AACL', 'IJCNLP-AACL'], usenix: ['USENIX Sec.', 'USENIX Sec.']};
const plain = s => String(s || '').replace(/[{}]/g, '');
function familyNote(ctx) {
  const {t} = ctx, ws = ctx.data.venueRegistry.find(v => v.id === 'acl-workshop');
  return `<p class="an-foot">${ctx.escape(t(`ML top-3: NeurIPS, ICML, ICLR. Security top-4: IEEE S&P, USENIX Security, ACM CCS, NDSS. AI conferences: AAAI, IJCAI, AAMAS. NLP venues: ACL, EMNLP, NAACL, EACL, IJCNLP-AACL, COLING, COLM, TACL and ACL workshops (ACL and EMNLP include Findings)${ws ? `; ACL workshops here: ${plain(ws.name)}` : ''}. Journals and other venues: any other verified publication; “not yet verified”: no formal publication found yet.`,
    `机器学习三大会：NeurIPS、ICML、ICLR。安全四大：IEEE S&P、USENIX Security、ACM CCS、NDSS。AI 综合会议：AAAI、IJCAI、AAMAS。NLP 会议：ACL、EMNLP、NAACL、EACL、IJCNLP-AACL、COLING、COLM、TACL 及 ACL 研讨会（ACL 与 EMNLP 含 Findings）${ws ? `；此处的 ACL 研讨会为：${plain(ws.name)}` : ''}。期刊与其他来源：其余已核实的发表；“尚未核实”：尚未找到正式发表记录。`))}</p>`;
}
const pct = (n, d) => d ? (n / d * 100) : 0;
const fmtPct = v => (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + '%';
const goAttr = (ctx, f) => f ? ` data-go="${ctx.escape(JSON.stringify(f))}"` : '';
const clickHint = ctx => ctx.t(' · click to list papers', ' · 点击查看论文');
const inTheme = (ctx, c) => p => ctx.topicsOf(p).some(tp => c.topics.includes(tp));
const themes = ctx => ctx.taxonomy.categories.filter(c => !c.other);
const ramp = (v, max) => v ? Math.min(6, 1 + Math.floor(v / max * 5.999)) : 0;

// dimensions shared by the time chart and the cross-tab: values, membership test, filter to apply on click
function dimension(ctx, dim, works, theme = '') {
  const {t} = ctx;
  if (dim === 'form') return ctx.taxonomy.forms.map((f, i) => ({id: f.id, name: ctx.translated(f.en), color: `color-mix(in srgb, ${INK} ${FORM_SHADE[i]}%, #fff)`, has: p => ctx.formOf(p) === f.id, go: {form: f.id}}));
  if (dim === 'family') return Object.entries(FAMILY_SHORT(t)).map(([id, name], i) => ({id, name, color: id === 'unverified' ? GRAY : PAL(ctx)[i % 8], has: p => ctx.famOf(p) === id, go: {group: id}}));
  if (dim === 'topic') return themes(ctx).flatMap(c => c.topics.map(tp => ({id: tp, name: ctx.topicName(tp), color: c.color, has: p => ctx.topicsOf(p).includes(tp), go: {tag: tp}})));
  if (dim === 'year') { const Y = years(ctx, works); return Y.bins.map(b => ({id: b, name: b, color: INK, has: p => Y.bin(ctx.yearOf(p)) === b, go: b.startsWith('≤') ? null : {year: b}})); }
  if (dim === 'country') {
    const counts = new Map();
    for (const p of works) for (const cc of ctx.countriesOf(p)) counts.set(cc, (counts.get(cc) || 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([cc]) => cc);
    return [...top.map((cc, i) => ({id: cc, name: ctx.countryName(cc), color: PAL(ctx)[i % 8], has: p => ctx.countriesOf(p).has(cc), go: {country: cc}})),
      {id: 'none', name: t('No located affiliation', '无已定位署名'), color: GRAY, has: p => !ctx.countriesOf(p).size, go: null}];
  }
  if (ctx.FACET_KEYS?.includes(dim) && ctx.facetsReady()) {
    // facet labels: one row per option, plus works labelled with none of them (not for roles or evaluation, which every labelled work has)
    const opts = ctx.facetOptions(dim).map(o => ({id: o, name: ctx.facetName(t, dim, o), color: ACCENT, has: p => (ctx.facetValues(p.id, dim) || []).includes(o), go: {facet: `${dim}:${o}`}}));
    return ['role', 'evaluation'].includes(dim) ? opts : [...opts, {id: 'none', name: t('None named', '未提及'), color: GRAY, has: p => { const v = ctx.facetValues(p.id, dim); return !!v && !v.length; }, go: null}];
  }
  if (dim === 'code') return [{id: 'code', name: t('Released code', '有公开代码'), color: ACCENT, has: p => ctx.hasCode(p), go: {art: 'code'}},
    {id: 'other', name: t('Other artifacts only', '仅有其他配套资源'), color: ACCENT_LIGHT, has: p => p.resources.length && !ctx.hasCode(p), go: {art: 'any'}},
    {id: 'none', name: t('No released artifact', '无公开资源'), color: GRAY, has: p => !p.resources.length, go: null}];
  const c = themes(ctx).find(x => x.id === theme);
  if (c) return c.topics.map((tp, i) => ({id: tp, name: ctx.topicName(tp), color: PAL(ctx)[i % 8], has: p => ctx.topicsOf(p).includes(tp), go: {tag: tp}}));
  return ctx.taxonomy.categories.map((x, i) => ({id: x.id, name: ctx.categoryName(x), color: x.other ? GRAY : PAL(ctx)[i % 8], has: inTheme(ctx, x), go: x.other ? null : {cat: x.id}}));
}
const DIMS = ctx => { const {t} = ctx; return [['theme', t('Theme', '主题')], ['topic', t('Cluster', '星团')], ['form', t('Paper form', '论文形式')], ['family', t('Venue family', '发表来源')],
  ['year', t('Year', '年份')], ['country', t('Country / region', '国家/地区')], ['code', t('Released code', '公开代码')],
  ...(ctx.facetsReady?.() ? ctx.FACET_KEYS.map(k => [k, `${ctx.facetTitle(t, k)} · ${t('label', '标签')}`]) : [])]; };

function years(ctx, works) {
  const ys = works.map(ctx.yearOf).filter(y => /^\d{4}$/.test(y)).map(Number), last = Math.max(...ys);
  const from = ctx.state.anFrom || '2020', y1 = Math.min(last, +(ctx.state.anTo || last));
  if (from === 'all') { const y0 = Math.max(Math.min(...ys), 2015); return {bins: [`≤${y0}`, ...Array.from({length: y1 - y0}, (_, i) => String(y0 + 1 + i))], bin: y => (+y <= y0 ? `≤${y0}` : +y > y1 ? null : String(y)), y0, y1, last}; }
  const y0 = Math.min(+from, y1);
  return {bins: Array.from({length: y1 - y0 + 1}, (_, i) => String(y0 + i)), bin: y => (+y >= y0 && +y <= y1 ? String(y) : null), y0, y1, last};
}
function rangeControls(ctx, works) {
  const {t} = ctx, Y = years(ctx, works), ys = works.map(ctx.yearOf).filter(y => /^\d{4}$/.test(y)).map(Number), first = Math.max(Math.min(...ys), 2015);
  const opts = [['all', t('All years', '全部年份')], ...Array.from({length: Y.last - first + 1}, (_, i) => String(first + i)).map(y => [y, y])];
  return `${pick(ctx, 'anFrom', opts, ctx.state.anFrom || '2020', t('From', '起始'))}${pick(ctx, 'anTo', Array.from({length: Y.last - first + 1}, (_, i) => String(Y.last - i)).map(y => [y, y]), String(Y.y1), t('to', '至'))}`;
}
// one small bar chart per series on a shared scale: each panel a single colour, no stacked patchwork
function multiples(ctx, S, cells, Y, mode, tc, controls, note, by) {
  const {t, escape} = ctx, last = String(Y.last);
  const val = (c, i) => mode === 'share' ? pct(c.v[i], c.n) : c.v[i];
  const max = Math.max(1, ...cells.flatMap(c => S.map((_, i) => val(c, i))));
  const panels = S.map((s, i) => ({s, i, tot: cells.reduce((a, c) => a + c.v[i], 0)})).filter(p => p.tot);
  const base = tc ? {cat: tc.id} : {};
  return `<figure class="an-chart"><figcaption><b>${t('Research over time', '研究随时间的分布')}</b><span>${escape(note)} ${t(`One panel per ${by === 'theme' ? (tc ? 'cluster' : 'theme') : 'group'}, all on the same scale; ${last} is partial (lighter).`, `每个${by === 'theme' ? (tc ? '星团' : '主题') : '分组'}一张小图，刻度相同；${last} 年未完（颜色较浅）。`)}</span></figcaption>${controls}
  <div class="an-multi" style="--cols:${panels.length <= 4 ? panels.length : panels.length % 3 === 0 || panels.length === 5 ? 3 : 4}">${panels.map(({s, i, tot}, pi) => `<div class="an-panel" style="--i:${pi}"><button class="an-ptitle"${goAttr(ctx, merge(base, s.go))}><i style="background:${s.color}"></i><span>${escape(s.name)}</span><b>${ctx.num(tot)}</b></button>
    <div class="an-pbars">${cells.map(c => { const v = val(c, i), yf = c.b.startsWith('≤') ? {} : {year: c.b}; return `<span class="an-pcol"><i style="height:${Math.max(v ? 2 : 0, pct(v, max)).toFixed(1)}%;background:${s.color}${c.b === last ? ';opacity:.5' : ''}" tabindex="0"${c.v[i] ? goAttr(ctx, merge(base, s.go, yf)) : ''} data-tip="${escape(`${s.name} · ${c.b}${s.go && c.v[i] ? clickHint(ctx) : ''}|${ctx.num(c.v[i])}${mode === 'share' ? ` (${fmtPct(v)} ${t('of the year', '占当年')})` : ''}`)}"></i></span>`; }).join('')}</div>
    <div class="an-paxis"><span>${cells[0].b}</span><span>${cells[cells.length - 1].b}</span></div></div>`).join('')}</div>
  <p class="an-foot">${t(`Shared scale: the tallest bar is ${mode === 'share' ? fmtPct(max) + ' of a year\'s works' : ctx.num(max) + ' works'}.`, `共用刻度：最高的条形为${mode === 'share' ? '当年研究的 ' + fmtPct(max) : ' ' + ctx.num(max) + ' 项研究'}。`)}</p>
  ${by === 'family' ? familyNote(ctx) : ''}
  ${tableView(ctx, [t('Year', '年份'), ...S.map(s => s.name), t('Works', '研究数')], cells.map(c => [c.b, ...c.v.map(v => mode === 'share' ? fmtPct(pct(v, c.n)) : ctx.num(v)), ctx.num(c.n)]))}</figure>`;
}

function niceTicks(max) {
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000].find(s => max / s <= 5) || 10000;
  return Array.from({length: Math.ceil(max / step) + 1}, (_, i) => i * step);
}
// several facet filters combine (all must hold); other keys from the later filter win
const merge = (...fs) => fs.some(f => f === null) ? null : Object.assign({}, ...fs, fs.filter(f => f.facet).length > 1 ? {facet: fs.filter(f => f.facet).map(f => f.facet).join(',')} : {});
const seg = (ctx, attr, opts, cur, label) => `<div class="seg" role="group" aria-label="${ctx.escape(label)}">${opts.map(([k, n]) => `<button ${attr}="${k}" aria-pressed="${cur === k}">${n}</button>`).join('')}</div>`;
const pick = (ctx, key, opts, cur, label) => `<label>${label} <select data-an="${key}">${opts.map(([k, n]) => ctx.option(k, n, cur)).join('')}</select></label>`;

// ---------- research over time ----------
function timeChart(ctx) {
  const {t, escape, state} = ctx, works = ctx.included(), by = state.anBy || 'theme', mode = state.anMode || 'count';
  const theme = by === 'theme' ? state.anTheme || '' : '';
  const tc = themes(ctx).find(c => c.id === theme);
  const scope = tc ? works.filter(inTheme(ctx, tc)) : works;
  const S = dimension(ctx, by === 'theme' ? 'themeSeries' : by, works, theme), Y = years(ctx, works);
  const cells = Y.bins.map(b => { const ws = scope.filter(p => Y.bin(ctx.yearOf(p)) === b); return {b, n: ws.length, v: S.map(s => ws.filter(s.has).length)}; });
  const colMax = Math.max(1, ...cells.map(c => c.v.reduce((a, x) => a + x, 0)));
  const ticks = mode === 'share' ? [0, 25, 50, 75, 100] : niceTicks(colMax), top = mode === 'share' ? 100 : ticks[ticks.length - 1];
  const controls = `<div class="an-controls">${pick(ctx, 'anBy', [['theme', t('Theme', '星团主题')], ['form', t('Paper form', '论文形式')], ['family', t('Venue family', '发表来源')], ['code', t('Released code', '公开代码')]], by, t('Colour by', '着色依据'))}
    ${by === 'theme' ? pick(ctx, 'anTheme', [['', t('All themes', '全部主题')], ...themes(ctx).map(c => [c.id, ctx.categoryName(c)])], theme, t('Theme', '主题')) : ''}
    ${seg(ctx, 'data-an-mode', [['count', t('Count', '数量')], ['share', t('Share', '占比')]], mode, t('Measure', '度量'))}
    ${seg(ctx, 'data-an-layout', [['', t('Stacked', '堆叠')], ['multi', t('Small multiples', '分面小图')]], state.anLayout || '', t('Layout', '布局'))}${rangeControls(ctx, works)}</div>`;
  const cols = cells.map((c, ci) => { const tot = c.v.reduce((a, x) => a + x, 0), h = mode === 'share' ? (tot ? 100 : 0) : pct(tot, top), yf = c.b.startsWith('≤') ? {} : {year: c.b};
    return `<div class="an-col" style="--i:${ci}"><div class="an-stack" style="height:${h.toFixed(2)}%">${c.v.map((v, i) => v ? `<i style="flex:${v};background:${S[i].color}" tabindex="0"${goAttr(ctx, merge(tc ? {cat: tc.id} : {}, S[i].go, yf))} data-tip="${escape(`${S[i].name} · ${c.b}${S[i].go ? clickHint(ctx) : ''}|${ctx.num(v)}${mode === 'share' ? ` (${fmtPct(pct(v, tot))})` : ''}`)}"></i>` : '').reverse().join('')}</div><button class="an-x"${goAttr(ctx, c.b.startsWith('≤') ? null : merge(tc ? {cat: tc.id} : {}, yf))}>${c.b}</button><span class="an-n">${ctx.num(c.n)}</span></div>`; }).join('');
  const note = by === 'theme' ? t('A work in several themes or clusters counts once in each, so stacks can exceed the number of works (under each year).', '属于多个主题或星团的研究在每个中各计一次，因此堆叠可能超过研究数（见各年份下方）。')
    : by === 'family' ? t('Venue families use verified publications only; works not yet verified are gray.', '发表来源仅计已核实的发表记录；尚未核实的研究为灰色。')
    : by === 'code' ? t('Released code: the work links a code repository of its own.', '公开代码：该研究链接了自己的代码仓库。')
    : t('One primary form per work, labelled by a model from the title and abstract with a verified quote.', '每项研究一个主要形式，由模型依据标题与摘要判定，并附经核对的原文引述。');
  if (state.anLayout === 'multi') return multiples(ctx, S, cells, Y, mode, tc, controls, note, by);
  return `<figure class="an-chart"><figcaption><b>${t('Research over time', '研究随时间的分布')}</b><span>${escape(note)} ${t(`Years follow the verified publication year, otherwise the first recorded date; ${Y.last} is partial. Most work dates from 2020 on, so the range starts there by default. For which clusters gain or lose attention, see “Cluster trends by year” below.`, `年份优先采用已核实的发表年份，否则用首次记录日期；${Y.last} 年未完。研究大多集中在 2020 年之后，因此默认从 2020 年开始显示。各星团关注度的升降见下方“各星团的逐年趋势”。`)}</span></figcaption>${controls}
  <div class="an-plot"><div class="an-grid">${ticks.slice().reverse().map(v => `<span style="bottom:${pct(v, top)}%">${mode === 'share' ? v + '%' : ctx.num(v)}</span>`).join('')}</div><div class="an-cols">${cols}</div></div>
  <div class="an-legend">${S.map(s => `<button${goAttr(ctx, merge(tc ? {cat: tc.id} : {}, s.go))}><i style="background:${s.color}"></i>${escape(s.name)}</button>`).join('')}</div>
  ${by === 'family' ? familyNote(ctx) : ''}
  ${tableView(ctx, [t('Year', '年份'), ...S.map(s => s.name), t('Works', '研究数')], cells.map(c => [c.b, ...c.v.map(v => mode === 'share' ? fmtPct(pct(v, c.v.reduce((a, x) => a + x, 0))) : ctx.num(v)), ctx.num(c.n)]))}</figure>`;
}

// ---------- venue contributions ----------
// venue table: short theme names in angled column headers, full names in the tooltip (owner, 10-26: no wrapped labels)
const VSHORT_MAP = {'Tool execution, coding and runtime': 'Tool execution', 'Tool-agent injection, skills': 'Tool-agent injection', 'Embodied agents': 'Embodied', 'Alignment, oversight': 'Alignment', 'Deception, AI control': 'Deception, control', 'LLM-app prompt injection': 'LLM-app injection', 'Multi-agent societies': 'Multi-agent', 'Identity, MCP, governance': 'Identity, MCP', 'Evaluation, guardrails': 'Evaluation', 'Web, GUI, computer use': 'Web, GUI', 'RAG security': 'RAG', 'Memory poisoning': 'Memory', 'Contextual privacy': 'Privacy', 'Offensive cyber': 'Offensive cyber', '工具执行、编码与运行时（混合主题）': '工具执行与编码', '工具型 Agent 的注入、授权与技能生态': '工具注入与技能', '具身智能：VLA、机器人与自动驾驶': '具身智能', '对齐、监督、自主权与规范': '对齐与监督', '欺骗、思维链监控与 AI 控制': '欺骗与控制', 'LLM 应用中的提示注入、指令层级与后门': 'LLM 应用注入', '多智能体社会与智能体之间的攻击': '多智能体', '身份、委托、协议（MCP）与治理': '身份与 MCP', '安全评测、护栏与红队': '评测与护栏', '网页、GUI、电脑操作与语音 Agent': '网页与 GUI', 'RAG 检索安全': 'RAG 安全', 'Agent 记忆投毒': '记忆投毒', '情境完整性与隐私': '情境隐私', '攻击性网络能力': '攻击性网络'};
const VSHORT = s => VSHORT_MAP[s] || (s.length > 20 ? s.slice(0, 19) + '…' : s);
function venueChart(ctx) {
  const {t, escape, state} = ctx, works = ctx.included().filter(verified), mode = state.anVenueMode || 'count', axis = state.anAxis || 'theme';
  const reg = new Map(ctx.data.venueRegistry.map(v => [v.id, v.name])), names = FAMILY_SHORT(t);
  const cols = dimension(ctx, axis === 'topic' ? 'topic' : 'themeCols', works).filter(c => c.go);
  const row = (label, ws, cls, go) => ({label, cls, go, n: ws.length, v: cols.map(c => ws.filter(c.has).length)});
  const rows = [];
  for (const [id, vids] of Object.entries(FAMILY_VENUES)) {
    const fam = works.filter(p => ctx.famOf(p) === id);
    rows.push(row(names[id], fam, 'fam', {group: id}));
    for (const vid of vids) { const ws = fam.filter(p => p.publication.venueId === vid); if (ws.length) rows.push(row(VENUE_SHORT[vid] ? t(...VENUE_SHORT[vid]) : plain(reg.get(vid) || vid), ws, 'venue', {venue: vid})); }
  }
  for (const id of ['journals', 'other']) rows.push(row(names[id], works.filter(p => ctx.famOf(p) === id), 'fam', {group: id}));
  rows.push(row(t('All verified publications', '全部已核实发表'), works, 'fam total', null));
  const colTot = rows[rows.length - 1].v;
  const val = (r, i) => mode === 'row' ? pct(r.v[i], r.n) : mode === 'col' ? pct(r.v[i], colTot[i]) : r.v[i];
  const max = Math.max(1, ...rows.filter(r => r.cls === 'venue' || (mode !== 'col' && r.cls === 'fam')).flatMap(r => cols.map((_, i) => val(r, i))));
  const controls = `<div class="an-controls">${seg(ctx, 'data-an-axis', [['theme', t('Themes', '主题')], ['topic', t('Clusters', '星团')]], axis, t('Columns', '列'))}
    ${seg(ctx, 'data-an-vmode', [['count', t('Count', '数量')], ['row', t('Share within venue', '占该来源比例')], ['col', t('Share of column', '占该列比例')]], mode, t('Measure', '度量'))}</div>`;
  return `<figure class="an-chart an-venues"><figcaption><b>${t('Venue contributions by theme', '主流发表来源在各主题的贡献')}</b><span>${t(`${ctx.num(works.length)} works with a verified formal publication; a work in several themes counts once in each. “Share within venue” reads across a row, “share of column” down a column. ACL and EMNLP include their Findings track.`, `共 ${ctx.num(works.length)} 项具有已核实正式发表的研究；属于多个主题的研究在每个中各计一次。“占该来源比例”按行阅读，“占该列比例”按列阅读。ACL 与 EMNLP 含 Findings。`)}</span></figcaption>${controls}
  <div class="heatwrap"><table class="an-heat"><thead><tr><th></th><th class="num">${t('Works', '研究数')}</th>${cols.map(c => `<th class="an-vh" title="${escape(c.name)}"><span><i class="dot" style="--cat:${c.color}"></i>${escape(VSHORT(c.name))}</span></th>`).join('')}</tr></thead><tbody>
  ${rows.map((r, ri) => `<tr class="${r.cls}" data-k="v${ri}" style="--i:${ri}"><th${goAttr(ctx, r.go)}>${escape(r.label)}</th><td class="num">${ctx.num(r.n)}</td>${cols.map((c, i) => { const v = val(r, i), g = r.go ? merge(r.go, c.go) : c.go; const st = r.cls.includes('total') ? 0 : ramp(v, max); return `<td class="s${st}"${heat(c.color, st)} tabindex="0"${r.v[i] ? goAttr(ctx, g) : ''} data-tip="${escape(`${r.label} · ${c.name}${r.v[i] ? clickHint(ctx) : ''}|${ctx.num(r.v[i])}${mode !== 'count' ? ' · ' + fmtPct(v) : ''}`)}">${r.v[i] ? (mode === 'count' ? ctx.num(r.v[i]) : fmtPct(v)) : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>${familyNote(ctx)}</figure>`;
}

// ---------- paper forms by theme ----------
function formChart(ctx) {
  const {t, escape} = ctx, works = ctx.included(), forms = ctx.taxonomy.forms;
  const groups = [[t('All works', '全部研究'), works, INK, {}], ...themes(ctx).map(c => [ctx.categoryName(c), works.filter(inTheme(ctx, c)), c.color, {cat: c.id}])];
  const rows = groups.map(([name, ws, color, go]) => ({name, color, go, n: ws.length, v: forms.map(f => ws.filter(p => ctx.formOf(p) === f.id).length)}));
  return `<figure class="an-chart"><figcaption><b>${t('Paper forms by theme', '各主题的论文形式')}</b><span>${t('Share of each form within a theme; surveys first. One primary form per work (model-labelled from title and abstract, with a verified quote).', '各主题内不同形式的占比；综述排在最前。每项研究一个主要形式（模型依据标题与摘要判定，并附经核对的原文引述）。')}</span></figcaption>
  <div class="an-forms">${rows.map((r, ri) => `<div class="an-frow" data-k="f${ri}" style="--i:${ri}"><button class="lbl"${goAttr(ctx, Object.keys(r.go).length ? r.go : null)}><i class="dot" style="--cat:${r.color}"></i>${escape(r.name)}<small>${ctx.num(r.n)}</small></button><span class="an-fbar">${r.v.map((v, i) => v ? `<i style="flex:${v};background:color-mix(in srgb, ${INK} ${FORM_SHADE[i]}%, #fff)" tabindex="0"${goAttr(ctx, merge(r.go, {form: forms[i].id}))} data-tip="${escape(`${r.name} · ${ctx.translated(forms[i].en)}${clickHint(ctx)}|${ctx.num(v)} · ${fmtPct(pct(v, r.n))}`)}">${pct(v, r.n) >= 9 ? `<em${FORM_SHADE[i] < 55 ? ' class="on-light"' : ''}>${fmtPct(pct(v, r.n))}</em>` : ''}</i>` : '').join('')}</span><button class="an-survey"${goAttr(ctx, merge(r.go, {form: 'survey'}))}>${ctx.num(r.v[0])} ${t('surveys', '篇综述')}</button></div>`).join('')}</div>
  <div class="an-legend">${forms.map((f, i) => `<button${goAttr(ctx, {form: f.id})}><i style="background:color-mix(in srgb, ${INK} ${FORM_SHADE[i]}%, #fff)"></i>${escape(ctx.translated(f.en))}</button>`).join('')}</div>
  ${tableView(ctx, [t('Theme', '主题'), ...forms.map(f => ctx.translated(f.en)), t('Works', '研究数')], rows.map(r => [r.name, ...r.v.map(v => ctx.num(v)), ctx.num(r.n)]))}</figure>`;
}

// ---------- any two dimensions ----------
function crossChart(ctx) {
  const {t, escape, state} = ctx, works = ctx.included(), rd = state.anRow || 'theme', cd = state.anCol || 'family', mode = state.anXmode || 'count';
  const R = dimension(ctx, rd === 'theme' ? 'themeRows' : rd, works), C = dimension(ctx, cd === 'theme' ? 'themeCols' : cd, works);
  const grid = R.map(r => { const ws = works.filter(r.has); return {r, n: ws.length, v: C.map(c => ws.filter(c.has).length)}; });
  const colTot = C.map((_, i) => works.filter(C[i].has).length);
  const val = (g, i) => mode === 'row' ? pct(g.v[i], g.n) : mode === 'col' ? pct(g.v[i], colTot[i]) : g.v[i];
  const max = Math.max(1, ...grid.flatMap(g => C.map((_, i) => val(g, i))));
  const found = crossInsights(ctx, works, rd, cd, grid, C, colTot), flagged = new Set(found.filter(x => x.cell).map(x => x.cell));
  const controls = `<div class="an-controls">${pick(ctx, 'anRow', DIMS(ctx), rd, t('Rows', '行'))}${pick(ctx, 'anCol', DIMS(ctx), cd, t('Columns', '列'))}
    ${seg(ctx, 'data-an-xmode', [['count', t('Count', '数量')], ['row', t('Row %', '行占比')], ['col', t('Column %', '列占比')]], mode, t('Measure', '度量'))}</div>`;
  return `<figure class="an-chart an-cross"><figcaption><b>${t('Cross-tabulate any two dimensions', '任选两个维度交叉统计')}</b><span>${t('Pick rows and columns; click a cell to list its papers. Each work has one theme and at most one cluster; countries are memberships (a work can list several), so rows and columns need not add up.', '选择行与列；点击单元格可查看对应论文。每项研究只有一个主题、至多一个星团；国家为归属计数（一项研究可列多个），因此行列合计不一定相加。')}</span></figcaption>${controls}
  <div class="an-cross-body"><div class="heatwrap"><table class="an-heat"><thead><tr><th></th><th class="num">${t('Works', '研究数')}</th>${C.map(c => `<th${goAttr(ctx, c.go)}>${escape(c.name)}</th>`).join('')}</tr></thead><tbody>
  ${grid.map((g, ri) => `<tr style="--i:${ri}"><th${goAttr(ctx, g.r.go)} title="${escape(g.r.name)}"><i class="dot" style="--cat:${g.r.color}"></i>${escape(VSHORT(g.r.name))}</th><td class="num">${ctx.num(g.n)}</td>${C.map((c, i) => { const v = val(g, i), go = g.r.go && c.go ? merge(g.r.go, c.go) : null; const hue = ['theme', 'topic'].includes(rd) ? g.r.color : ['theme', 'topic'].includes(cd) ? c.color : ACCENT; return `<td data-k="x${ri}-${i}" class="s${ramp(v, max)}${flagged.has(`${ri}:${i}`) ? ' is-flag' : ''}"${heat(hue, ramp(v, max))} tabindex="0"${g.v[i] ? goAttr(ctx, go) : ''} data-tip="${escape(`${g.r.name} · ${c.name}${g.v[i] && go ? clickHint(ctx) : ''}|${ctx.num(g.v[i])}${mode !== 'count' ? ' · ' + fmtPct(v) : ''}`)}">${g.v[i] ? (mode === 'count' ? ctx.num(g.v[i]) : fmtPct(v)) : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
  <aside class="an-insights"><h4>${t('What stands out · click for the papers', '值得注意 · 点击查看论文')}</h4>${found.length ? `<ul>${found.map(x => `<li><button class="an-insight an-${x.kind}"${goAttr(ctx, x.go)}${x.go ? '' : ' disabled'}>${escape(x.text)}</button></li>`).join('')}</ul>` : `<p class="muted">${t('Nothing stands out in this table: every cell is close to what its row and column sizes predict, or too small to tell.', '这张表里没有明显偏离：每个单元格都接近按行列规模的预期，或者样本太小无法判断。')}</p>`}
  <p class="an-foot">${t('Expected = row works × column works ÷ all works, as if rows and columns were unrelated. Listed: cells of at least 8 works at 1.5× or more, cells at 0.6× or less where 10 or more were expected, and with a year axis the largest changes in share between the first and last year with 30 or more works. Outlined in the table.', '预期 = 行工作数 × 列工作数 ÷ 全部工作数，即假设行与列无关时的数量。列出的是：至少 8 项且达到预期 1.5 倍以上的单元格、预期 10 项以上但只有 0.6 倍以下的单元格；若有一轴是年份，则列出首末年份（各至少 30 项工作）之间份额变化最大的项。表中已加框标出。')}</p></aside></div>${[rd, cd].includes('family') ? familyNote(ctx) : ''}</figure>`;
}
// cells far from what their row and column sizes predict, and with a year axis the biggest gains and losses in share
function crossInsights(ctx, works, rd, cd, grid, C, colTot) {
  const {t} = ctx, N = works.length, out = [], cand = [], skip = id => ['none', 'other', 'unverified'].includes(id);
  if (!N || rd === cd) return out;
  grid.forEach((g, ri) => { if (!g.n || skip(g.r.id)) return; C.forEach((c, i) => {
    if (skip(c.id) || !colTot[i]) return;
    const exp = g.n * colTot[i] / N, obs = g.v[i];
    cand.push({ri, i, g, c, obs, exp, lift: obs / exp, resid: (obs - exp) / Math.sqrt(exp)});
  }); });
  const go = x => x.g.r.go && x.c.go ? merge(x.g.r.go, x.c.go) : null, fx = v => !v ? '0' : v >= 10 ? v.toFixed(0) : v.toFixed(1);
  if (![rd, cd].includes('year')) {
    for (const x of cand.filter(x => x.obs >= 8 && x.lift >= 1.5).sort((a, b) => b.resid - a.resid).slice(0, 4))
      out.push({kind: 'over', cell: `${x.ri}:${x.i}`, go: go(x), text: t(`${x.g.r.name} × ${x.c.name}: ${ctx.num(x.obs)} works, ${fx(x.lift)}× what the row and column sizes predict.`, `“${x.g.r.name}”×“${x.c.name}”：${ctx.num(x.obs)} 项，是按行列规模预期的 ${fx(x.lift)} 倍。`)});
    for (const x of cand.filter(x => x.exp >= 10 && x.lift <= 0.6).sort((a, b) => a.resid - b.resid).slice(0, 2))
      out.push({kind: 'under', cell: `${x.ri}:${x.i}`, go: go(x), text: t(`${x.g.r.name} × ${x.c.name}: ${ctx.num(x.obs)} works where about ${Math.round(x.exp)} would be expected.`, `“${x.g.r.name}”×“${x.c.name}”：只有 ${ctx.num(x.obs)} 项，预期约 ${Math.round(x.exp)} 项。`)});
    return out;
  }
  // a year axis: each entity's share of the first and the last year bin that have at least 30 works
  const yearRows = rd === 'year', years = yearRows ? grid.map(g => g.r) : C, ents = yearRows ? C : grid.map(g => g.r);
  const yTot = yearRows ? grid.map(g => g.n) : colTot, cell = (e, y) => yearRows ? grid[y].v[e] : grid[e].v[y];
  const ys = years.map((y, k) => k).filter(k => yTot[k] >= 30 && !String(years[k].id).startsWith('≤'));
  if (ys.length < 2) return out;
  const y0 = ys[0], y1 = ys[ys.length - 1];
  const ch = ents.map((e, k) => ({e, k, a: 100 * cell(k, y0) / yTot[y0], b: 100 * cell(k, y1) / yTot[y1]})).filter(x => !skip(x.e.id) && cell(x.k, y0) + cell(x.k, y1) >= 10);
  const yGo = (x, y) => x.e.go && years[y].go ? merge(x.e.go, years[y].go) : null, cellKey = (k, y) => yearRows ? `${y}:${k}` : `${k}:${y}`;
  const line = x => t(`${x.e.name}: ${fx(x.a)}% of ${years[y0].name} works → ${fx(x.b)}% in ${years[y1].name}.`, `“${x.e.name}”：占 ${years[y0].name} 年工作的 ${fx(x.a)}% → ${years[y1].name} 年 ${fx(x.b)}%。`);
  for (const x of ch.filter(x => x.b - x.a >= 2).sort((p, q) => (q.b - q.a) - (p.b - p.a)).slice(0, 3)) out.push({kind: 'over', cell: cellKey(x.k, y1), go: yGo(x, y1), text: line(x)});
  for (const x of ch.filter(x => x.a - x.b >= 2).sort((p, q) => (q.a - q.b) - (p.a - p.b)).slice(0, 2)) out.push({kind: 'under', cell: cellKey(x.k, y1), go: yGo(x, y1), text: line(x)});
  return out;
}

// ---------- topic trends: which topics gain or lose attention (volume and composition: "Research over time") ----------
// measures: count; share of the year's works (removes the overall growth of the field); relative to each series' own peak
const TMEASURES = t => [['count', t('Count', '数量')], ['share', t("Share of the year's works", '占当年研究比例')], ['peak', t('Relative to peak', '相对自身峰值')]];
function trendData(ctx, works, Y, bins) {
  const all = works.filter(p => /^\d{4}$/.test(ctx.yearOf(p)));
  const byYear = new Map(); for (const p of all) { const y = ctx.yearOf(p); if (!byYear.has(y)) byYear.set(y, []); byYear.get(y).push(p); }
  const tot = y => (byYear.get(String(y)) || []).length, n = (has, y) => (byYear.get(String(y)) || []).filter(has).length;
  const a = Y.last - 1, b = Y.last - 2, share = (has, y) => tot(y) ? n(has, y) / tot(y) * 100 : 0;
  return {tot, n, a, b, binTot: bins.map(tot), change: has => share(has, a) - share(has, b), growth: has => { const x = n(has, a), z = n(has, b); return z ? (x - z) / z : x ? 1 : 0; }};
}
const measureVal = (m, r, i, D) => m === 'share' ? pct(r.v[i], D.binTot[i]) : m === 'peak' ? pct(r.v[i], Math.max(1, ...r.v)) : r.v[i];
const fmtPts = d => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(1)}`;
const trendViewSeg = ctx => seg(ctx, 'data-an-tview', [['', ctx.t('Heatmap', '热力图')], ['line', ctx.t('Lines', '折线图')]], ctx.state.anTview || '', ctx.t('View', '视图'));
const seeTime = ctx => ctx.t('For volume and theme shares by period, see Findings › Research evolution.', '各时期的数量与主题份额见“发现 › 研究演化”。');

function trendChart(ctx) {
  const {t, escape, state} = ctx, works = ctx.included();
  const Y = years(ctx, works), bins = Y.bins.filter(b => !b.startsWith('≤')), D = trendData(ctx, works, Y, bins);
  if (state.anTview === 'line') return trendLines(ctx, works, Y, bins, D);
  const m = state.anNorm === 'topic' ? 'peak' : state.anNorm === 'share' ? 'share' : 'count';
  const rows = themes(ctx).flatMap(c => c.topics.map(tp => { const has = p => ctx.topicsOf(p).includes(tp), ws = works.filter(has); return {tp, c, has, v: bins.map(b => ws.filter(p => ctx.yearOf(p) === b).length)}; }));
  const max = Math.max(1, ...rows.flatMap(r => r.v.map((_, i) => measureVal(m, r, i, D))));
  const cell = (r, i) => { const v = measureVal(m, r, i, D); return m === 'count' ? (r.v[i] || '') : r.v[i] ? fmtPct(v) : ''; };
  const last = r => m === 'share' ? D.change(r.has) : D.growth(r.has);
  return `<figure class="an-chart an-trends"><figcaption><b>${t('Cluster trends by year', '各星团的逐年趋势')}</b><span>${t(`Which clusters gain or lose attention, all clusters at once. Count: works per cluster; share of the year's works: removes the overall growth of the field, so it shows where attention moves; relative to peak: each cluster scaled to its own peak. The last column compares the last two complete years (${D.a} with ${D.b}) — percentage points in share mode, count growth otherwise; ${Y.last} is partial.`, `一次看全部星团的热度升降。数量：各星团每年的研究数；占当年研究比例：去掉整个领域的整体增长，显示关注度往哪里移动；相对自身峰值：每个星团按自身峰值缩放。最后一列比较最近两个完整年份（${D.a} 与 ${D.b}）——比例模式为百分点变化，其余为数量增长；${Y.last} 年未完。`)} ${seeTime(ctx)}</span></figcaption>
  <div class="an-controls">${trendViewSeg(ctx)}${seg(ctx, 'data-an-norm', TMEASURES(t).map(([k, l]) => [k === 'count' ? '' : k === 'peak' ? 'topic' : k, l]), state.anNorm || '', t('Measure', '度量'))}${rangeControls(ctx, works)}</div>
  <div class="heatwrap"><table class="an-heat an-trend"><thead><tr><th></th>${bins.map(b => `<th${goAttr(ctx, {year: b})}>${b}</th>`).join('')}<th class="num">${m === 'share' ? t('Share change', '比例变化') : t('Growth', '增长')}</th></tr></thead><tbody>
  ${rows.map((r, ri) => { const g = last(r); return `<tr style="--i:${ri}" data-k="${r.tp}"><th${goAttr(ctx, {tag: r.tp})}><i class="dot" style="--cat:${r.c.color}"></i>${escape(ctx.topicName(r.tp))}</th>${r.v.map((v, i) => { const st = ramp(measureVal(m, r, i, D), max); return `<td class="s${st}"${heat(r.c.color, st)} tabindex="0"${v ? goAttr(ctx, {tag: r.tp, year: bins[i]}) : ''} data-tip="${escape(`${ctx.topicName(r.tp)} · ${bins[i]}${v ? clickHint(ctx) : ''}|${ctx.num(v)}${D.binTot[i] ? ` · ${fmtPct(pct(v, D.binTot[i]))} ${t('of the year', '占当年')}` : ''}`)}">${cell(r, i)}</td>`; }).join('')}<td class="num growth ${g > 0 ? 'up' : g < 0 ? 'down' : ''}">${g > 0 ? '▲' : g < 0 ? '▼' : '–'} ${m === 'share' ? fmtPts(g).replace(/^[+−±]/, '') + t(' pts', ' 个百分点') : Math.abs(g * 100).toFixed(0) + '%'}</td></tr>`; }).join('')}</tbody></table></div></figure>`;
}

// line view: by default the six topics whose share of the year's works changed most (three up, three down); or the
// topics of one theme; or the eight themes. Colours follow taxonomy order, never rank.
function trendLines(ctx, works, Y, bins, D) {
  const {t, escape, state} = ctx, sel = state.anLineTheme || '', m = state.anLmeasure || 'share', tc = themes(ctx).find(c => c.id === sel);
  const topics = themes(ctx).flatMap(c => c.topics.map(tp => ({tp, c, has: p => ctx.topicsOf(p).includes(tp)})));
  let series;
  if (sel === 'themes') series = themes(ctx).map(c => ({name: ctx.categoryName(c), color: c.color, has: inTheme(ctx, c), go: {cat: c.id}}));
  else if (tc) series = tc.topics.map((tp, i) => ({name: ctx.topicName(tp), color: PAL(ctx)[i % 8], has: p => ctx.topicsOf(p).includes(tp), go: {tag: tp}}));
  else {
    const ch = topics.map(x => ({...x, d: D.change(x.has)})), up = ch.filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 3), down = ch.filter(x => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 3);
    const pick6 = [...up, ...down, ...ch.filter(x => !up.includes(x) && !down.includes(x)).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))].slice(0, 6);
    series = topics.filter(x => pick6.includes(x) || pick6.some(y => y.tp === x.tp)).map((x, i) => ({name: ctx.topicName(x.tp), color: PAL(ctx)[i % 8], has: x.has, go: {tag: x.tp}, d: D.change(x.has)}));
  }
  const base = tc ? {cat: tc.id} : {};
  const rows = series.map(sr => { const ws = works.filter(sr.has); return {...sr, v: bins.map(b => ws.filter(p => ctx.yearOf(p) === b).length)}; });
  const val = (r, i) => measureVal(m, r, i, D), vmax = Math.max(1, ...rows.flatMap(r => r.v.map((_, i) => val(r, i))));
  const ticks = m === 'peak' ? [0, 25, 50, 75, 100] : niceTicks(m === 'share' ? Math.ceil(vmax) : vmax), top = ticks[ticks.length - 1];
  const unit = v => m === 'count' ? ctx.num(v) : v + '%';
  const x = i => bins.length > 1 ? i / (bins.length - 1) * 100 : 50, y = v => 100 - pct(v, top);
  const partial = bins[bins.length - 1] === String(Y.last), n = bins.length;
  const path = (r, from, to) => r.v.slice(from, to + 1).map((_, k) => `${k ? 'L' : 'M'}${x(from + k).toFixed(2)} ${y(val(r, from + k)).toFixed(2)}`).join(' ');
  const lines = rows.map(r => { const end = partial && n > 1 ? n - 2 : n - 1;
    return `<path d="${path(r, 0, end)}" stroke="${r.color}"/>${partial && n > 1 ? `<path class="partial" d="${path(r, n - 2, n - 1)}" stroke="${r.color}"/>` : ''}`; }).join('');
  const fmt = (r, i) => `${ctx.num(r.v[i])} ${t('works', '项研究')}${D.binTot[i] ? ` · ${fmtPct(pct(r.v[i], D.binTot[i]))} ${t('of the year', '占当年')}` : ''}${m === 'peak' ? ` · ${fmtPct(val(r, i))} ${t('of its peak', '占自身峰值')}` : ''}`;
  const shown = v => m === 'count' ? ctx.num(v) : fmtPct(v);
  const bands = bins.map((b, i) => { const list = rows.map(r => [r.color, r.name, val(r, i)]).sort((a, c) => c[2] - a[2]);
    return `<button class="an-band" style="left:${x(i).toFixed(2)}%;width:${(n > 1 ? 100 / (n - 1) : 100).toFixed(2)}%"${goAttr(ctx, merge(base, {year: b}))} data-tip="${escape(`${b}${b === String(Y.last) ? t(' (partial year)', '（年份未完）') : ''}${clickHint(ctx)}|${ctx.num(D.binTot[i])} ${t('works that year', '当年研究')}`)}" data-tip-rows="${escape(JSON.stringify(list.map(([c, nm, v]) => [c, nm, shown(v)])))}"></button>`; }).join('');
  const pts = rows.flatMap(r => r.v.map((v, i) => `<button class="an-pt${partial && i === n - 1 ? ' partial' : ''}" style="left:${x(i).toFixed(2)}%;top:${y(val(r, i)).toFixed(2)}%;--c:${r.color}"${v ? goAttr(ctx, merge(base, r.go, {year: bins[i]})) : ''} data-tip="${escape(`${r.name} · ${bins[i]}${v ? clickHint(ctx) : ''}|${fmt(r, i)}`)}" aria-label="${escape(`${r.name} ${bins[i]}: ${ctx.num(v)}`)}"></button>`)).join('');
  const opts = [['', t('Largest share changes (6 clusters)', '比例变化最大的 6 个星团')], ...themes(ctx).map(c => [c.id, t(`Clusters in: ${ctx.categoryName(c)}`, `星团：${ctx.categoryName(c)}`)]), ['themes', t('Themes (8 lines)', '主题（8 条线）')]];
  const controls = `<div class="an-controls">${trendViewSeg(ctx)}${pick(ctx, 'anLineTheme', opts, sel, t('Lines', '折线'))}${seg(ctx, 'data-an-lmeasure', TMEASURES(t), m, t('Measure', '度量'))}${rangeControls(ctx, works)}</div>`;
  const what = sel === 'themes' ? t(`the ${themes(ctx).length} themes`, `${themes(ctx).length} 个主题`) : tc ? t(`the clusters of “${ctx.categoryName(tc)}”`, `“${ctx.categoryName(tc)}”下的各星团`) : t(`the six clusters whose share of the year's works changed most between ${D.b} and ${D.a} (up to three rising, three falling)`, `${D.b} 至 ${D.a} 年占当年研究比例变化最大的 6 个星团（最多 3 升 3 降）`);
  return `<figure class="an-chart an-trends"><figcaption><b>${t('Cluster trends by year', '各星团的逐年趋势')}</b><span>${t(`Lines for ${what}. The field grows fast (${ctx.num(D.tot(D.b))} works in ${D.b}, ${ctx.num(D.tot(D.a))} in ${D.a}), so counts rise almost everywhere; the share of each year's works shows where attention moves. A work in several clusters counts once in each. ${Y.last} is partial (dashed). Hover a year for all values; click a point or a year to open the papers.`, `折线显示${what}。整个领域增长很快（${D.b} 年 ${ctx.num(D.tot(D.b))} 项、${D.a} 年 ${ctx.num(D.tot(D.a))} 项），因此数量几乎处处上升；占当年研究的比例才显示关注度往哪里移动。属于多个星团的研究在每个中各计一次。${Y.last} 年未完（虚线）。悬停某一年可查看全部数值；点击数据点或年份可查看论文。`)} ${seeTime(ctx)}</span></figcaption>${controls}
  <div class="an-lplot"><div class="an-lgrid">${ticks.slice().reverse().map(v => `<span style="top:${y(v)}%">${unit(v)}</span>`).join('')}</div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${bands}${pts}
    <div class="an-lx">${bins.map((b, i) => `<button style="left:${x(i).toFixed(2)}%"${goAttr(ctx, merge(base, {year: b}))}>${b}</button>`).join('')}</div></div>
  <div class="an-legend">${rows.map(r => `<button${goAttr(ctx, merge(base, r.go))}><i style="background:${r.color}"></i>${escape(r.name)}${r.d !== undefined ? `<small class="${r.d > 0 ? 'up' : 'down'}">${r.d > 0 ? '▲' : '▼'} ${fmtPts(r.d).replace(/^[+−±]/, '')}${t(' pts', ' 个百分点')}</small>` : ''}</button>`).join('')}</div>
  ${tableView(ctx, [t('Year', '年份'), t('Works that year', '当年研究数'), ...rows.map(r => r.name)], bins.map((b, i) => [b, ctx.num(D.binTot[i]), ...rows.map(r => `${ctx.num(r.v[i])} (${fmtPct(pct(r.v[i], D.binTot[i]))})`)]))}</figure>`;
}

// ---------- institutions and countries ----------
function peopleChart(ctx) {
  const {t, escape, state} = ctx, works = ctx.included(), theme = state.anTheme2 || '', tc = themes(ctx).find(c => c.id === theme);
  const scope = tc ? works.filter(inTheme(ctx, tc)) : works, ids = new Set(scope.map(p => p.id)), base = tc ? {cat: tc.id} : {};
  const inst = ctx.data.teams.map(x => [x, x.papers.filter(id => ids.has(id)).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const cc = new Map();
  for (const p of scope) for (const c of ctx.countriesOf(p)) cc.set(c, (cc.get(c) || 0) + 1);
  const ctry = [...cc].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const list = (rows, label, go, color) => { const m = Math.max(1, ...rows.map(r => r[1])); return `<div class="an-rank"><h3>${label}</h3>${rows.map(([k, n, name, fl], i) => `<button class="hbar" style="--i:${i}"${goAttr(ctx, merge(base, go(k)))} data-tip="${escape(`${name}${clickHint(ctx)}|${ctx.num(n)} ${t('works', '项研究')}`)}"><span class="lbl">${fl || ''}${escape(name)}</span><span class="track"><span class="fill" style="width:${pct(n, m).toFixed(1)}%;background:${color}"></span></span><span class="val">${ctx.num(n)}</span></button>`).join('')}</div>`; };
  return `<figure class="an-chart"><figcaption><b>${t('Leading institutions and countries', '主要研究机构与国家/地区')}</b><span>${t('Works with affiliation evidence, by institution and by the registry country of the institutions (a work counts once per country). Registry locations are current institution addresses, not author nationality.', '按机构及机构登记所在国家/地区统计有署名证据的研究（一项研究在每个国家/地区各计一次）。登记地点是机构当前地址，不代表作者国籍。')}</span></figcaption>
  <div class="an-controls">${pick(ctx, 'anTheme2', [['', t('All themes', '全部主题')], ...themes(ctx).map(c => [c.id, ctx.categoryName(c)])], theme, t('Theme', '主题'))}</div>
  <div class="an-ranks">${list(inst.map(([x, n]) => [x.id, n, x.name, teamFlag(x)]), t('Institutions', '机构'), id => ({team: id}), tc?.color || ACCENT)}${list(ctry.map(([c, n]) => [c, n, ctx.countryName(c), flag(c)]), t('Countries and regions', '国家和地区'), c => ({country: c}), tc?.color || ACCENT)}</div></figure>`;
}

// ---------- papers and released code ----------
function codeChart(ctx) {
  const {t, escape} = ctx, works = ctx.included();
  const rows = [[t('All works', '全部研究'), works, INK, {}], ...themes(ctx).map(c => [ctx.categoryName(c), works.filter(inTheme(ctx, c)), c.color, {cat: c.id}]),
    ...ctx.taxonomy.forms.map((f, i) => [ctx.translated(f.en), works.filter(p => ctx.formOf(p) === f.id), `color-mix(in srgb, ${INK} ${FORM_SHADE[i]}%, #fff)`, {form: f.id}])]
    .map(([name, ws, color, go]) => ({name, color, go, n: ws.length, code: ws.filter(ctx.hasCode).length, any: ws.filter(p => p.resources.length).length}));
  const os = ctx.pipeline?.openSource;
  return `<figure class="an-chart"><figcaption><b>${t('Papers and released code', '论文与公开代码')}</b><span>${t('Share of works that link their own code repository (dark) or only other artifacts such as datasets, models or project pages (light).', '链接了自有代码仓库（深色）或仅有数据集、模型、项目页等其他配套资源（浅色）的研究占比。')}${os?.included ? t(` The open-source landscape lists ${ctx.num(os.included)} repositories.`, ` 开源全景共收录 ${ctx.num(os.included)} 个仓库。`) : ''}</span></figcaption>
  <div class="an-forms an-code">${rows.map((r, ri) => `<div class="an-frow${ri === 0 || ri === 9 ? ' sep' : ''}" style="--i:${ri}"><span class="lbl"><i class="dot" style="--cat:${r.color}"></i>${escape(r.name)}<small>${ctx.num(r.n)}</small></span><span class="an-fbar"><i style="flex:${r.code};background:${ACCENT}" tabindex="0"${r.code ? goAttr(ctx, merge(r.go, {art: 'code'})) : ''} data-tip="${escape(`${r.name} · ${t('released code', '公开代码')}${clickHint(ctx)}|${ctx.num(r.code)} · ${fmtPct(pct(r.code, r.n))}`)}">${pct(r.code, r.n) >= 8 ? `<em>${fmtPct(pct(r.code, r.n))}</em>` : ''}</i><i style="flex:${r.any - r.code};background:${ACCENT_LIGHT}" tabindex="0" data-tip="${escape(`${r.name} · ${t('other artifacts only', '仅其他配套资源')}|${ctx.num(r.any - r.code)}`)}"></i><i style="flex:${r.n - r.any};background:#eef2f1" data-tip="${escape(`${r.name} · ${t('no released artifact', '无公开资源')}|${ctx.num(r.n - r.any)}`)}"></i></span><span class="an-survey">${fmtPct(pct(r.code, r.n))}</span></div>`).join('')}</div>
  ${tableView(ctx, [t('Group', '分组'), t('Works', '研究数'), t('Released code', '公开代码'), t('Any artifact', '任一配套资源')], rows.map(r => [r.name, ctx.num(r.n), `${ctx.num(r.code)} (${fmtPct(pct(r.code, r.n))})`, `${ctx.num(r.any)} (${fmtPct(pct(r.any, r.n))})`]))}</figure>`;
}

function tableView(ctx, head, rows) {
  const {t, escape} = ctx;
  return `<details class="an-table"><summary>${t('Show as table', '以表格查看')}</summary><div class="tablewrap"><table class="coverage"><thead><tr>${head.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}

// ---------- key takeaways (computed on every load) ----------
function notes(ctx) {
  const {t} = ctx, works = ctx.included(), ver = works.filter(verified).length;
  const items = [
    t(`Counts describe this collection (${ctx.num(works.length)} included works, those withdrawn on arXiv left out), not the whole field, and are recomputed with every update.`, `数字描述本图谱的收录（${ctx.num(works.length)} 项纳入研究，不含已在 arXiv 撤回的），不代表整个领域，并随每次更新重新计算。`),
    t('A work in several themes or clusters counts once in each, so stacks and rows can exceed the number of works.', '属于多个主题或星团的研究在每个中各计一次，因此堆叠和行合计可能超过研究数。'),
    t('Years use the verified publication year, otherwise the date the work first appeared in the record; the current year is partial.', '年份优先采用已核实的发表年份，否则采用该研究首次出现在记录中的日期；当前年份未完。'),
    t(`Venue families count verified formal publications only (${ctx.num(ver)} works); ACL and EMNLP include their Findings track.`, `发表来源只计已核实的正式发表（${ctx.num(ver)} 项）；ACL 与 EMNLP 含 Findings。`),
    t('Paper form is one primary form per work, labelled by a model from the title and abstract with a verified quote.', '论文形式为每项研究的一个主要形式，由模型依据标题与摘要判定，并附经核对的原文引述。'),
    t('Released code means the work links a code repository of its own. Institutions and countries come from affiliation evidence and registry locations, not author nationality.', '“公开代码”指该研究链接了自己的代码仓库。机构与国家/地区来自署名证据与机构登记地点，不代表作者国籍。'),
    t('Click a bar, segment or cell to open the matching papers with those filters; hover for exact counts.', '点击条形、色块或单元格可带着对应筛选条件打开论文；悬停可查看具体数字。'),
    ...(ctx.facetsReady?.() ? (() => { const au = ctx.facetAudit?.() || {}, n = au.checked, ra = n ? Math.round(100 * au.roleAgree / n) : null; return [t(`Dimensions marked “label” (contribution role, attack entry point, agent setting, risk source, defence mechanism, evaluation setting) are model labels from the title and abstract (rules ${au.rules || ''}), each backed by a phrase copied from the text${n ? `; on ${n} works checked by a second model, roles agreed in ${ra}%` : ''}; a role counts both the main and the secondary contributions.`, `标注“标签”的维度（贡献角色、攻击入口、智能体类型、风险来源、防御机制、评测方式）由模型依据标题与摘要标注（规则 ${au.rules || ''}），每个标签都附有从原文摘取的短语${n ? `；第二个模型核对的 ${n} 篇中，主要角色一致 ${ra}%` : ''}；角色同时计入主要与次要贡献。`)]; })() : []),
  ];
  return `<section class="panel section an-notes"><h2>${t('Notes on these figures', '图表说明')}</h2><ul>${items.map(x => `<li>${ctx.escape(x)}</li>`).join('')}</ul></section>`;
}

// separate cards laid out in a grid: wide charts span the row, compact ones sit side by side
const LAYOUT = [['cross', 'wide'], ['time', 'wide'], ['trends', 'wide'], ['forms', 'wide'], ['code', ''], ['venues', 'wide'], ['people', 'wide']];
const BODY = {time: timeChart, venues: venueChart, forms: formChart, cross: crossChart, trends: trendChart, people: peopleChart, code: codeChart};
const RANGE_CARDS = ['time', 'trends', 'cross'];

export function renderAnalysis(ctx) {
  ctxRef = ctx;
  return `<section class="an-layout">${LAYOUT.map(([k, w]) => `<div class="panel an-card ${w}" data-an-card="${k}">${BODY[k](ctx)}</div>`).join('')}</section>${notes(ctx)}<div class="oss-tip an-tip" role="tooltip" hidden></div>`;
}

// one section of the explore page: the cards for these keys, in layout order
export function renderSection(ctx, keys) {
  ctxRef = ctx;
  return `<section class="an-layout">${LAYOUT.filter(([k]) => keys.includes(k)).map(([k, w]) => `<div class="panel an-card ${w}" data-an-card="${k}">${BODY[k](ctx)}</div>`).join('')}</section>`;
}
export const analysisNotes = ctx => `${notes(ctx)}<div class="oss-tip an-tip" role="tooltip" hidden></div>`;

function refresh(ctx, keys) {
  for (const k of keys) { const card = document.querySelector(`[data-an-card="${k}"]`); if (card) card.innerHTML = BODY[k](ctx); }
}

export function bindAnalysis(ctx) {
  if (bound) return;
  bound = true;
  const root = document.getElementById('app'), live = () => ctxRef || ctx;
  root.addEventListener('click', e => {
    const c = live(), card = e.target.closest('[data-an-card]');
    if (!card) return;
    const g = e.target.closest('[data-go]');
    if (g) { c.go(JSON.parse(g.dataset.go)); return; }
    const b = e.target.closest('[data-an-mode],[data-an-axis],[data-an-vmode],[data-an-xmode],[data-an-norm],[data-an-layout],[data-an-tview],[data-an-lmeasure]');
    if (!b) return;
    const d = b.dataset;
    if (d.anMode) c.state.anMode = d.anMode === 'count' ? '' : d.anMode;
    if (d.anAxis) c.state.anAxis = d.anAxis === 'theme' ? '' : d.anAxis;
    if (d.anVmode) c.state.anVenueMode = d.anVmode === 'count' ? '' : d.anVmode;
    if (d.anXmode) c.state.anXmode = d.anXmode === 'count' ? '' : d.anXmode;
    if (d.anNorm !== undefined) c.state.anNorm = d.anNorm;
    if (d.anLayout !== undefined) c.state.anLayout = d.anLayout;
    if (d.anTview !== undefined) c.state.anTview = d.anTview;
    if (d.anLmeasure !== undefined) c.state.anLmeasure = d.anLmeasure === 'share' ? '' : d.anLmeasure;
    c.writeHash();
    refresh(c, [card.dataset.anCard]);
  });
  root.addEventListener('change', e => {
    const c = live(), el = e.target.closest('[data-an]'), card = e.target.closest('[data-an-card]');
    if (!el || !card) return;
    c.state[el.dataset.an] = el.value;
    if (el.dataset.an === 'anBy') c.state.anTheme = '';
    c.writeHash();
    refresh(c, ['anFrom', 'anTo'].includes(el.dataset.an) ? RANGE_CARDS : [card.dataset.anCard]);
  });
  const tip = () => document.querySelector('.an-tip');
  const show = el => { const tp = tip(); if (!tp) return; const [head, val] = el.dataset.tip.split('|'); tp.replaceChildren(); const v = document.createElement('strong'); v.textContent = val; const h = document.createElement('span'); h.textContent = head; tp.append(v, h);
    if (el.dataset.tipRows) for (const [color, name, val] of JSON.parse(el.dataset.tipRows)) { const r = document.createElement('span'); r.className = 'an-tiprow'; const i = document.createElement('i'); i.style.background = color; const b = document.createElement('b'); b.textContent = val; r.append(i, document.createTextNode(name), b); tp.append(r); }
    tp.hidden = false; const r = el.getBoundingClientRect();
    if (el.classList.contains('an-band')) {  // beside the year's hover line, inside the plot, so the controls above stay visible
      const cx = r.left + r.width / 2, edge = Math.min(window.innerWidth - 8, (el.closest('.an-lplot') || el).getBoundingClientRect().right + 12), right = cx + 14 + tp.offsetWidth <= edge;
      tp.style.left = `${right ? cx + 14 : Math.max(8, cx - 14 - tp.offsetWidth)}px`; tp.style.top = `${Math.max(8, r.top + 8)}px`; return;
    }
    tp.style.left = `${Math.max(8, Math.min(window.innerWidth - tp.offsetWidth - 8, r.left + r.width / 2 - tp.offsetWidth / 2))}px`; tp.style.top = `${Math.max(8, r.top - tp.offsetHeight - 8)}px`; };
  root.addEventListener('pointerover', e => { const el = e.target.closest('.an-card [data-tip]'); if (el) show(el); });
  root.addEventListener('pointerout', e => { if (e.target.closest('[data-tip]') && tip()) tip().hidden = true; });
  root.addEventListener('focusin', e => { const el = e.target.closest('.an-card [data-tip]'); if (el) show(el); });
  root.addEventListener('focusout', () => { if (tip()) tip().hidden = true; });
}

// finding cards of the Landscape › Venues & forms storyline (owner, 10-26): computed from the same tables the charts draw,
// so they follow the controls; k: the keys of the rows or cells a card lights (data-k)
export function storyCards(ctx, key) {
  const {t} = ctx, works = ctx.included(), share = (a, b) => b ? fmtPct(pct(a, b)) : '–';
  if (key === 'cross') {
    const rd = ctx.state.anRow || 'theme', cd = ctx.state.anCol || 'family';
    const R = dimension(ctx, rd === 'theme' ? 'themeRows' : rd, works), C = dimension(ctx, cd === 'theme' ? 'themeCols' : cd, works);
    const grid = R.map(r => { const ws = works.filter(r.has); return {r, n: ws.length, v: C.map(c => ws.filter(c.has).length)}; });
    const colTot = C.map((_, i) => works.filter(C[i].has).length);
    const found = crossInsights(ctx, works, rd, cd, grid, C, colTot);
    if (!found.length) return [{q: t('Does any cell stand out?', '有没有明显偏离的单元格？'), a: t('No: every cell is close to what its row and column sizes predict, or too small to tell.', '没有：每个单元格都接近按行列规模的预期，或者样本太小无法判断。'), bg: t('The whole table', '整张表'), k: []}];
    return found.map(x => { const s = x.text, i = s.indexOf(ctx.state.lang === 'zh' ? '：' : ': '), cut = i > 0 ? i : 0;
      return {q: cut ? s.slice(0, cut) : (x.kind === 'over' ? t('More than expected', '高于预期') : t('Fewer than expected', '低于预期')), a: cut ? s.slice(cut + (ctx.state.lang === 'zh' ? 1 : 2)) : s,
        bg: x.kind === 'over' ? t('Outlined cell: more works than the row and column sizes predict', '加框单元格：多于按行列规模的预期') : t('Outlined cell: fewer works than expected', '加框单元格：少于预期'), k: x.cell ? ['x' + x.cell.replace(':', '-')] : []}; });
  }
  if (key === 'forms') {
    const forms = ctx.taxonomy.forms, fi = id => forms.findIndex(f => f.id === id);
    const rows = [[t('All works', '全部研究'), works], ...themes(ctx).map(c => [ctx.categoryName(c), works.filter(inTheme(ctx, c))])].map(([name, ws], ri) => ({ri, name, n: ws.length, v: forms.map(f => ws.filter(p => ctx.formOf(p) === f.id).length)}));
    const all = rows[0], big = rows.slice(1).filter(r => r.n >= 50), top = id => big.slice().sort((a, b) => b.v[fi(id)] / b.n - a.v[fi(id)] / a.n)[0];
    const cards = [{q: t('What form do the works take?', '研究以什么形式出现？'), a: t(`${share(all.v[fi('method')], all.n)} methods or systems, ${share(all.v[fi('empirical')], all.n)} empirical studies, ${share(all.v[fi('benchmark')], all.n)} benchmarks or datasets and ${share(all.v[fi('survey')], all.n)} surveys, of ${ctx.num(all.n)} works.`, `${ctx.num(all.n)} 项研究中，方法或系统占 ${share(all.v[fi('method')], all.n)}，实证研究 ${share(all.v[fi('empirical')], all.n)}，基准或数据集 ${share(all.v[fi('benchmark')], all.n)}，综述 ${share(all.v[fi('survey')], all.n)}。`), bg: t('Top row: all works', '第一行：全部研究'), k: ['f0']}];
    for (const [id, q, qz, w, wz] of [['benchmark', 'Which theme builds the most benchmarks?', '哪个主题最常做基准？', 'benchmarks or datasets', '是基准或数据集'], ['survey', 'Which theme has the most surveys?', '哪个主题综述最多？', 'surveys', '是综述'], ['empirical', 'Which theme is the most empirical?', '哪个主题实证研究最多？', 'empirical studies', '是实证研究']]) {
      const r = top(id); if (!r) continue;
      cards.push({q: t(q, qz), a: t(`${r.name}: ${share(r.v[fi(id)], r.n)} of its ${ctx.num(r.n)} works are ${w} (${ctx.num(r.v[fi(id)])}).`, `${r.name}：${ctx.num(r.n)} 项中 ${share(r.v[fi(id)], r.n)}${wz}（${ctx.num(r.v[fi(id)])} 项）。`), bg: t('Highlighted row; themes with at least 50 works', '高亮行；只比较至少 50 项研究的主题'), k: ['f' + r.ri]});
    }
    return cards;
  }
  if (key === 'venues') {
    const ws = works.filter(verified), names = FAMILY_SHORT(t), reg = new Map(ctx.data.venueRegistry.map(v => [v.id, v.name])), rows = [];
    for (const [id, vids] of Object.entries(FAMILY_VENUES)) {
      const fam = ws.filter(p => ctx.famOf(p) === id);
      rows.push({label: names[id], fam: true, n: fam.length});
      for (const vid of vids) { const n = fam.filter(p => p.publication.venueId === vid).length; if (n) rows.push({label: VENUE_SHORT[vid] ? t(...VENUE_SHORT[vid]) : plain(reg.get(vid) || vid), n}); }
    }
    for (const id of ['journals', 'other']) rows.push({label: names[id], fam: true, n: ws.filter(p => ctx.famOf(p) === id).length});
    rows.forEach((r, i) => { r.ri = i; });
    const tot = rows.length, fams = rows.filter(r => r.fam && r.label !== names.other).sort((a, b) => b.n - a.n), vens = rows.filter(r => !r.fam).sort((a, b) => b.n - a.n);
    const cards = [{q: t('How many works have a formal publication?', '多少研究已正式发表？'), a: t(`${ctx.num(ws.length)} of ${ctx.num(works.length)} works (${share(ws.length, works.length)}) have a verified formal publication; the rest are preprints so far.`, `${ctx.num(works.length)} 项研究中 ${ctx.num(ws.length)} 项（${share(ws.length, works.length)}）有已核实的正式发表，其余目前为预印本。`), bg: t('Bottom row: all verified publications', '最后一行：全部已核实发表'), k: ['v' + tot]}];
    if (fams[0]) cards.push({q: t('Which venue family publishes the most?', '哪类来源发表最多？'), a: t(`${fams[0].label}: ${ctx.num(fams[0].n)} works, ${share(fams[0].n, ws.length)} of verified publications; then ${fams[1]?.label} (${ctx.num(fams[1]?.n || 0)}).`, `${fams[0].label}：${ctx.num(fams[0].n)} 项，占已核实发表的 ${share(fams[0].n, ws.length)}；其次是${fams[1]?.label}（${ctx.num(fams[1]?.n || 0)} 项）。`), bg: t('Highlighted family rows', '高亮的来源类别行'), k: ['v' + fams[0].ri, ...(fams[1] ? ['v' + fams[1].ri] : [])]});
    if (vens[0]) cards.push({q: t('Which single venues publish the most?', '哪些会议发表最多？'), a: t(`${vens.slice(0, 3).map(r => `${r.label} ${ctx.num(r.n)}`).join(', ')}.`, `${vens.slice(0, 3).map(r => `${r.label} ${ctx.num(r.n)} 项`).join('，')}。`), bg: t('Highlighted venue rows', '高亮的会议行'), k: vens.slice(0, 3).map(r => 'v' + r.ri)});
    return cards;
  }
  return [];
}
