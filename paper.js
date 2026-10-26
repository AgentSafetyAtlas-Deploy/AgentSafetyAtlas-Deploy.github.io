// Findings pages of the frozen release (owner, 2026-10-25): research evolution, foundations, opportunities, evidence, method,
// data & versions. Each section is one conclusion with a chart; data and notes sit in a collapsed box. Pages are static JSON
// files written once from the frozen results (review/site_data.py); this module only draws them.
const cache = {};
let recs = null, LANG = 'en', RQ = null;  // RQ: the film player of the earlier research pages (rq.js), loaded only where a page shows the film
const tables = new Map();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const tx = o => o == null ? '' : (typeof o === 'object' ? (o[LANG] ?? o.en ?? '') : String(o));
const T = (en, zh) => LANG === 'zh' ? zh : en;
const pctf = (v, d = 0) => `${(100 * v).toFixed(d)}%`;
const get = n => fetch(`./data/${n}`).then(r => { if (!r.ok) throw Error(n); return r.json(); });

export async function loadPaper(v) {
  if (!cache[v]) cache[v] = await get(`page-${v}.json`);
  if (!cache.home) cache.home = await get('page-home.json');
  if (cache[v].sections.some(s => s.blocks.some(b => b.t === 'film'))) { RQ ??= await import('./rq.js'); await RQ.loadRq(); }
}

export function renderPaper(v, ctx) {
  LANG = ctx.lang === 'zh' ? 'zh' : 'en';
  const P = cache[v];
  tables.clear(); RQ?.stopFilm();
  const toc = P.sections.map(s => `<a href="#pp-${s.id}" class="rq-jump">${esc(tx(s.kicker))}</a>`).join('');
  return `<div class="rq pp" data-pp-view="${v}">
  <div class="pp-head"><span class="rq-eyebrow">${esc(tx(P.kicker))}</span><h1>${esc(tx(P.title))}</h1>${P.lead ? `<p>${esc(tx(P.lead))}</p>` : ''}
  <nav class="rq-toc" aria-label="${T('On this page', '本页目录')}">${toc}</nav></div>
  ${P.sections.map(s => `<section class="rq-sec pp-sec" id="pp-${s.id}"><div class="rq-sec-head"><span class="rq-eyebrow">${esc(tx(s.kicker))}</span><h2>${esc(tx(s.title))}</h2></div>
  ${s.blocks.map((b, i) => block(b, `${s.id}-${i}`, ctx)).join('')}</section>`).join('')}
  </div>`;
}

// one or more sections of a page inside a board chapter (board.js); same blocks, no page head
export function renderSections(v, ids, ctx) {
  LANG = ctx.lang === 'zh' ? 'zh' : 'en';
  tables.clear(); RQ?.stopFilm();
  const P = cache[v];
  return `<div class="rq pp pp-in-board" data-pp-view="${v}">${P.sections.filter(s => ids.includes(s.id)).map(s => `<section class="rq-sec pp-sec" id="pp-${s.id}"><div class="rq-sec-head"><span class="rq-eyebrow">${esc(tx(s.kicker))}</span><h2>${esc(tx(s.title))}</h2></div>
  ${s.blocks.map((b, i) => block(b, `${s.id}-${i}`, ctx)).join('')}</section>`).join('')}</div>`;
}
export const stopFilm = () => RQ?.stopFilm();
// storyline chapters of the boards (owner, 10-26: every chapter = question, sections, one view + numbered finding cards); the
// sections, cards and their views are in page-story.json (review/story_data.py); marks carry data-k keys so a card can light them
export async function loadStory(film = false) {
  cache.story ??= await get('page-story.json');
  cache.home ??= await get('page-home.json');
  if (film && !RQ) { RQ = await import('./rq.js'); await RQ.loadRq(); }
  return cache.story;
}
export function resetBlocks(ctx) { LANG = ctx.lang === 'zh' ? 'zh' : 'en'; tables.clear(); RQ?.stopFilm(); }
export const renderBlocks = (blocks, idp, ctx) => blocks.map((b, i) => block(b, `${idp}-${i}`, ctx)).join('');
const kOf = o => String(typeof o === 'object' && o ? o.en : o ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const csvLink = (href, label) => href ? `<a class="pp-csv" href="./${esc(href)}" download>${esc(label || T('Download CSV', '下载 CSV'))}</a>` : '';
const note = n => n ? `<p class="rq-note pp-note">${esc(tx(n))}</p>` : '';
const head = (title, csv) => title || csv ? `<div class="pp-bhead">${title ? `<h3>${esc(tx(title))}</h3>` : ''}${csvLink(csv)}</div>` : '';

function block(b, id, ctx) {
  switch (b.t) {
    case 'prose': return `<div class="pp-prose">${b.p.map(p => `<p>${tx(p)}</p>`).join('')}</div>`;
    case 'takeaway': return `<aside class="pp-take"><strong>${T('Takeaway', '小结')}</strong><p>${esc(tx(b.p))}</p></aside>`;
    case 'stats': return `<dl class="pp-stats">${b.items.map(s => `<div><dd>${esc(s.v)}</dd><dt>${esc(tx(s))}</dt></div>`).join('')}</dl>`;
    case 'table': return table(b, id, ctx);
    case 'lines': return lines(b);
    case 'endpoints': return endpoints(b);
    case 'flows': return flows(b);
    case 'segbars': return segbars(b);
    case 'fig4': return fig4(b);
    case 'cases': return cases(b, ctx);
    case 'coverage': return coverage(b, ctx);
    case 'design': return `<div class="pp-design">${head(b.title)}<dl>${b.items.map(([k, v]) => `<dt>${esc(tx(k))}</dt><dd>${esc(tx(v))}</dd>`).join('')}</dl>${note(b.note)}</div>`;
    case 'flow': return `<ol class="pp-flow">${b.steps.map(([k, v]) => `<li><strong>${esc(tx(k))}</strong><span>${esc(tx(v))}</span></li>`).join('')}</ol>`;
    case 'records': return `<div class="pp-records" data-records="${id}">${head(b.title, b.csv)}<button class="btn pp-load" data-load-records="${id}">${T('Show the 810 records', '显示 810 条记录')}</button></div>`;
    case 'details': return `<details class="pp-more"><summary>${esc(tx(b.label))}</summary>${b.blocks.map((x, i) => block(x, `${id}-${i}`, ctx)).join('')}</details>`;
    case 'divbars': return divbars(b);
    case 'hbars': return hbars(b);
    case 'chain': return chain(b, ctx);
    case 'matrix': return matrix(b);
    case 'film': return `<div class="pp-film">${RQ ? RQ.filmSection(T) : ''}</div>`;
    case 'heat': return heatmap(b);
    case 'vbars': { const m = Math.max(...b.values) || 1; return `<figure class="pp-fig">${head(b.title)}<div class="rq-bars pp-vbars">${b.values.map((n, j) => `<div class="rq-bar" data-k="${kOf(b.cols[j])}"><span style="height:${Math.max(2, 100 * n / m)}%" title="${n}"></span><b>${n.toLocaleString('en-US')}</b><i>${esc(b.cols[j])}</i></div>`).join('')}</div>${note(b.note)}</figure>`; }
    case 'wall': return `<div class="pp-wall">${b.items.map(w => `<div class="pp-wcard"><span class="pp-wicon" aria-hidden="true">${esc(w.icon)}</span><strong>${esc(w.v)}</strong><p>${esc(tx(w.label))}</p></div>`).join('')}</div>`;
    case 'ranges': return ranges(b);
    case 'outstack': return outstack(b);
    case 'row': return `<div class="pp-row">${b.blocks.map((x, i) => block(x, `${id}-r${i}`, ctx)).join('')}</div>`;
    case 'downloads': return `<ul class="pp-downloads">${cache.home.downloads.map(d => `<li>${csvLink(d.file, d.file.replace('tables/', ''))}<span>${esc(d.en)}</span></li>`).join('')}</ul>`;
    default: return '';
  }
}

// ---------------------------------------------------------------- tables: search, filters, pages, links to papers
const NAMES = {home: ['Universe', '宇宙'], evolution: ['Research evolution', '研究演化'], foundations: ['Foundations & opportunities', '基础与机会'], opportunities: ['Opportunities & tests', '机会与检验'],
  evidence: ['Checks', '核查'], versions: ['Method and data', '方法与数据'], method: ['Method and data', '方法与数据'], action: ['Problem lines', '问题主线'], themes: ['Themes', '主题'], cases: ['Cases', '案例'],
  outcomes: ['Evaluation', '评测'], checks: ['Checks', '核查'], uses: ['Experimental use', '实验使用'], inputs: ['Trusted inputs', '可信输入'], conditions: ['Conditions', '条件'],
  chain: ['Memory and delegation', '记忆与委托'], defences: ['Retrieval defences', '检索防御'], retrieval: ['Retrieval to record', '检索到记录'],
  wall: ['Checks', '核查'], shift: ['Turning to action', '转向行动'], film: ['Evolution film', '演化片'], quarters: ['Evolution film', '演化片'], adoption: ['Adoption', '外部采用'], experiment: ['The experiment', '实验']};
const nm = k => NAMES[k] ? T(...NAMES[k]) : k;
function gotoLabel(view, anchor) { return nm(view) + (anchor ? ' · ' + nm(anchor) : ''); }
function cellHtml(c, v, row, ctx) {
  const s = tx(v);
  if (c.kind === 'work') {
    const p = ctx.data.papers.find(x => x.id === s);
    return p ? `<button class="pp-work" data-paper="${esc(s)}">${esc(p.title)}</button>` : `<span class="pp-code">${esc(s)}</span>`;
  }
  if (c.kind === 'quote') return s ? `<q class="pp-quote">${esc(s)}</q>` : '';
  if (c.kind === 'code') return `<span class="pp-code">${esc(s)}</span>`;
  if (c.kind === 'goto') { const [view, anchor] = s.split('#'); return `<button class="pp-goto" data-goto="${esc(s)}">${esc(gotoLabel(view, anchor))} →</button>`; }
  if (row.tag && c.k === 'name') return `<button class="pp-tag" data-tag="${esc(row.tag)}">${esc(s)}</button>`;
  return esc(s);
}

function table(b, id, ctx) {
  tables.set(id, {b, q: '', f: {}, page: 1});
  const filters = (b.filters || []).map(k => {
    const c = b.cols.find(x => x.k === k), vals = [...new Set(b.rows.map(r => tx(r[k])))].filter(Boolean).sort();
    return `<label class="pp-filter">${esc(tx(c))} <select data-tf="${id}" data-key="${k}"><option value="">${T('All', '全部')}</option>${vals.map(v => `<option>${esc(v)}</option>`).join('')}</select></label>`;
  }).join('');
  const extra = (b.extra_csv || []).map(([l, f]) => csvLink(f, tx(l))).join('');
  return `<div class="pp-table" data-table="${id}">${head(b.title, b.csv)}${b.search || filters ? `<div class="pp-tools">${b.search ? `<input type="search" data-tq="${id}" placeholder="${T('Search this table', '搜索本表')}">` : ''}${filters}</div>` : ''}
  <div class="rq-scroll" data-tbody="${id}">${tableBody(id, ctx)}</div>${note(b.note)}${extra ? `<p class="pp-extra">${extra}</p>` : ''}</div>`;
}

function tableBody(id, ctx) {
  const st = tables.get(id), b = st.b, q = st.q.toLowerCase();
  let rs = b.rows.filter(r => Object.entries(st.f).every(([k, v]) => !v || tx(r[k]) === v));
  if (q) rs = rs.filter(r => b.cols.some(c => tx(r[c.k]).toLowerCase().includes(q) || (c.kind === 'work' && (ctx.data.papers.find(x => x.id === tx(r[c.k]))?.title || '').toLowerCase().includes(q))));
  const size = b.page || 1000, pages = Math.max(1, Math.ceil(rs.length / size));
  st.page = Math.min(st.page, pages);
  const shown = rs.slice((st.page - 1) * size, st.page * size);
  const nav = pages > 1 ? `<div class="pp-pager"><button data-tp="${id}" data-d="-1" ${st.page === 1 ? 'disabled' : ''}>‹</button><span>${st.page} / ${pages} · ${rs.length} ${T('rows', '行')}</span><button data-tp="${id}" data-d="1" ${st.page === pages ? 'disabled' : ''}>›</button></div>` : (q || Object.values(st.f).some(Boolean) ? `<div class="pp-pager"><span>${rs.length} ${T('rows', '行')}</span></div>` : '');
  return `<table class="pp-tbl"><thead><tr>${b.cols.map(c => `<th class="${c.kind === 'num' ? 'num' : ''}">${esc(tx(c))}</th>`).join('')}</tr></thead>
  <tbody>${shown.map(r => `<tr>${b.cols.map(c => `<td class="${c.kind === 'num' ? 'num' : ''}${c.kind === 'quote' ? ' wide' : ''}">${cellHtml(c, r[c.k], r, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table>${nav}`;
}

// ---------------------------------------------------------------- charts
function lines(b) {
  const W = 700, H = 270, L = 44, R = 34, Tp = 14, B = 30, n = b.x.length, max = 0.5;
  const X = i => L + (W - L - R) * i / (n - 1), Y = v => Tp + (H - Tp - B) * (1 - v / max);
  const grid = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${pctf(v)}</text>`).join('');
  const xs = b.x.map((x, i) => `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(x)}</text>`).join('');
  const ser = b.series.map(s => `<g data-k="${kOf(s.name)}"><polyline points="${s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2"/>${s.values.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3.2" fill="${s.color}"><title>${esc(tx(s.name))} · ${esc(b.x[i])}: ${pctf(v, 1)} (${s.counts[i]})</title></circle>`).join('')}</g>`).join('');
  const leg = b.series.map(s => `<span data-k="${kOf(s.name)}"><i style="background:${s.color}"></i>${esc(tx(s.name))} <b>${pctf(s.values[s.values.length - 1])}</b></span>`).join('');
  return `<figure class="pp-fig">${head(b.title)}<svg viewBox="0 0 ${W} ${H}" class="pp-svg" role="img" aria-label="${esc(tx(b.title))}">${grid}${xs}${ser}</svg><div class="pp-legend">${leg}</div>${note(b.note)}</figure>`;
}

function endpoints(b) {
  const cats = [['text_only', T('Text output only', '只有文本输出'), 'var(--pp-c1)'], ['environment_state', T('Environment state', '环境状态'), 'var(--pp-c2)'], ['consequence', T('Consequence', '后果'), 'var(--pp-c3)']];
  const panel = ln => `<div class="pp-ep"><h4 style="--c:${ln.color}">${esc(tx(ln.line))}</h4><table><tbody>${ln.periods.map(p => `<tr><th>${esc(p.period)}</th><td>${cats.map(([k, lab, c]) => {
    const v = p[k] / p.n, [lo, hi] = p.bounds[k];
    return `<div class="pp-epbar" title="${esc(lab)}: ${p[k]}/${p.n} = ${pctf(v)} · ${T('missing-data bound', '缺失数据界')} ${pctf(lo)}–${pctf(hi)}"><span class="rng" style="left:${100 * lo}%;width:${100 * (hi - lo)}%"></span><span class="val" style="width:${100 * v}%;background:${c}"></span></div>`;
  }).join('')}</td><td class="num">${p.n}/${p.n + p.missing}</td></tr>`).join('')}</tbody></table></div>`;
  return `<figure class="pp-fig">${head(L_('Deepest evaluated outcome among defences, by problem line', '各问题主线中防御测到的最深结果'), b.csv)}<div class="pp-legend">${cats.map(([, l, c]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join('')}<span><i class="rng"></i>${T('missing-data bound', '缺失数据界')}</span></div>
  <div class="pp-eps">${b.lines.map(panel).join('')}</div>${note(b.note)}</figure>`;
}
const L_ = (en, zh) => ({en, zh});

function stack(parts, total, soft = false) {
  const op = soft ? 'opacity:.8;filter:saturate(.6) brightness(1.08);' : '';   // theme colours softened (owner, 10-25: too loud at full saturation)
  return `<div class="pp-stack">${parts.map(([lab, v, c]) => `<span style="flex:${v};${op}${c === 'hollow' ? 'background:transparent;border:1px solid var(--rq-ink)' : `background:${c}`}" title="${esc(tx(lab))}: ${v}/${total}"></span>`).join('')}</div>
  <div class="pp-stack-l">${parts.map(([lab, v, c]) => `<span><i style="${op}${c === 'hollow' ? 'border:1px solid var(--rq-ink)' : `background:${c}`}"></i>${esc(tx(lab))} <b>${v}</b></span>`).join('')}</div>`;
}

function flows(b) {
  const d = b.data;
  return `<figure class="pp-fig">${head(b.title)}<div class="pp-flows">${d.into.map(g => `<div data-k="into-${kOf(g.label)}"><h4>${esc(tx(g.label))} · ${g.total} ${T('uses from', '次使用，来自')} ${g.works} ${T('works', '篇论文')}</h4>${stack(g.from, g.total, true)}</div>`).join('')}
  <div data-k="purposes"><h4>${T(`Purposes of the ${d.cross} cross-theme uses in tool injection and skills`, `工具注入与技能中 ${d.cross} 次跨主题使用的用途`)}</h4>${stack(d.purposes, d.cross)}</div></div>${note(b.note)}</figure>`;
}

function segbars(b) {
  const [c0, c1, c2] = b.colors;
  return `<figure class="pp-fig">${head(b.title)}<div class="pp-legend">${b.legend.map((l, i) => `<span><i style="background:${b.colors[i]}"></i>${esc(tx(l))}</span>`).join('')}</div>
  <div class="pp-seg">${b.rows.map(r => `<div class="pp-segrow" data-k="${kOf(r.label)}"><span class="lab">${esc(tx(r.label))}</span><div class="pp-segbar"><span style="width:${100 * r.segs[0] / r.n}%;background:${c0}"></span><span style="width:${100 * r.segs[1] / r.n}%;background:${c1}"></span><span style="flex:1;background:${c2}"></span></div><span class="num">${r.segs[0] + r.segs[1]}/${r.n}</span></div>`).join('')}</div>${note(b.note)}</figure>`;
}

function fig4(b) {
  const a = b.a.map(r => `<div class="pp-segrow" data-k="a-${kOf(r.label)}"><span class="lab">${esc(tx(r.label))}</span><div class="pp-segbar"><span style="width:${100 * r.v / 90}%;background:var(--pp-pois)"></span><span style="flex:1;background:var(--pp-track)"></span></div><span class="num">${r.v}/90</span></div>`).join('');
  const bb = b.b.map(g => `<div class="pp-f4g" data-k="b-${kOf(g.label)}"><span class="lab">${esc(tx(g.label))}</span><div>${g.rows.map(r => `<div class="pp-segrow"><span class="lab2">${esc(tx(r.input))}</span><div class="pp-segbar"><span style="width:${100 * r.yes / 90}%;background:${r.kind === 'clean' ? 'var(--pp-clean)' : 'var(--pp-pois)'}"></span><span class="unc" style="width:${100 * r.unc / 90}%"></span><span style="flex:1;background:var(--pp-track)"></span></div><span class="num">${r.yes}${r.unc ? ` · ${r.unc} ${T('uncertain', '含糊')}` : ''}</span><span class="num rec">${r.recovery}/90</span></div>`).join('')}</div></div>`).join('');
  return `<figure class="pp-fig pp-fig4">
  <div class="pp-flowmini"><span class="st">${T('Retrieved Passages', '检索材料')}</span><span class="ar">→</span><span class="st">${T('Knowledge Tool', '知识工具')} <small>${T('Answer + Sources', '答案 + 来源')}</small><em>● ${T('Tool Answer', '工具回答')}</em></span><span class="ar">→</span><span class="st">Agent</span><span class="ar">→</span><span class="st">${T('Final Record', '最终记录')}<em>● ${T('Final Record', '最终记录')}</em></span></div>
  <h3>${T('Target answer in the final record, original poisoning', '目标答案进入最终记录（原始投毒）')}</h3><div class="pp-seg">${a}</div>
  <p class="pp-diff">${T('TrustRAG − no defence', 'TrustRAG − 无防御')}: <b>${esc(b.diff)} ${T('percentage points', '个百分点')}</b> <span>(${T('paired 95% bootstrap interval', '逐题配对 95% bootstrap 区间')} ${esc(b.ci)})</span></p>
  <h3>${T('Correct and clean completion, and tasks requiring recovery prompts', '正确且无越权地完成，以及需要补救提示的任务')}</h3>
  <div class="pp-legend"><span><i style="background:var(--pp-clean)"></i>${T('Judged correct · clean', '判为正确 · 干净')}</span><span><i style="background:var(--pp-pois)"></i>${T('Judged correct · original poisoning', '判为正确 · 原始投毒')}</span><span><i class="unc"></i>${T('Uncertain', '含糊')}</span></div>
  <div class="pp-f4g pp-f4h"><span></span><div class="pp-segrow"><span></span><span></span><span></span><span class="num rec">${T('Tasks requiring recovery prompts', '需要补救提示的任务')}</span></div></div>
  <div class="pp-seg">${bb}</div>${note(b.note)}</figure>`;
}

function cases(b, ctx) {
  return `<div class="pp-cases pp-cases3">${b.cases.map(c => `<article class="pp-case" data-k="${kOf(c.title)}"><span class="pp-case-when">${esc(c.when)}</span><h3>${esc(tx(c.title))}</h3>
  <p class="pp-case-n"><b>${esc(c.count)}</b> ${T('later works on the new condition', '篇后期论文涉及新条件')}</p><p>${esc(tx(c.lead))}</p>
  <details><summary>${T(`${c.rows.length} records with passages`, `${c.rows.length} 条记录与原文`)}</summary><ul class="pp-evl">${c.rows.map(r => `<li><span class="pp-tagl">${esc(tx(r.side))} · ${esc(r.date)}</span> ${cellHtml({kind: 'work'}, r.work, r, ctx)}<q class="pp-quote">${esc(r.quote)}</q><small>${esc(r.where)} · ${esc(tx(r.support))}</small></li>`).join('')}</ul></details></article>`).join('')}</div>${b.csv ? `<p class="pp-extra">${csvLink(b.csv)}</p>` : ''}`;
}

function coverage(b, ctx) {
  return `<div class="pp-cov">${head(b.title, b.csv)}<div class="rq-scroll"><table class="pp-tbl"><thead><tr><th>${T('Work', '工作')}</th>${b.heads.map(h => `<th>${esc(tx(h))}</th>`).join('')}</tr></thead><tbody>${b.works.map(w => `<tr><td><strong>${esc(w.work)}</strong><br>${cellHtml({kind: 'work'}, w.id, w, ctx)}<br><small>${esc(w.date)}${w.after ? ` · ${T('after the corpus cutoff', '晚于语料截止日')}` : ''} · ${esc(w.found)}</small>
  <details><summary>${T('Evidence', '证据')}</summary>${w.quotes.map(q => `<q class="pp-quote">${esc(q.quote)}</q><small>${esc(q.where)}</small>`).join('')}</details></td>${w.fields.map(f => `<td>${esc(f)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}

function heatmap(b) {
  // optional first row with the period totals and last column with each row's change (owner, 10-26: one table instead of three charts)
  const max = Math.max(...b.rows.flatMap(r => r.values)) || 1, dl = b.deltaLabel;
  const dcell = v => v == null ? '<td></td>' : `<td class="pp-delta ${v > 0 ? 'is-up' : v < 0 ? 'is-down' : ''}">${v > 0 ? '+' : ''}${v.toFixed(1)}</td>`;
  const total = b.totals ? `<tr class="pp-heat-total"><th scope="row">${esc(tx(b.totalsLabel))}</th>${b.totals.map(n => `<td>${Number(n).toLocaleString('en-US')}</td>`).join('')}${dl ? '<td></td>' : ''}</tr>` : '';
  return `<figure class="pp-fig">${head(b.title)}<div class="rq-scroll"><table class="rq-heat pp-heat"><thead><tr><th></th>${b.cols.map(c => `<th>${esc(c)}</th>`).join('')}${dl ? `<th class="pp-delta-h">${esc(tx(dl))}</th>` : ''}</tr></thead><tbody>${total}${b.rows.map(r =>
    `<tr data-k="${kOf(r.label)}"><th scope="row"><i class="pp-dot" style="background:${r.color}"></i>${esc(tx(r.label))}</th>${r.values.map((v, j) => `<td style="--h:${Math.round(85 * v / max)}%" title="${esc(r.titles?.[j] || '')}">${pctf(v)}</td>`).join('')}${dl ? dcell(r.delta) : ''}</tr>`).join('')}</tbody></table></div>${note(b.note)}</figure>`;
}

// deepest evaluated outcome as one 100% bar per period: text only → tool call → environment state → consequence
function outstack(b) {
  const K = [['text_only', T('Text only', '只测文本')], ['tool_call', T('Tool call', '工具调用')], ['environment_state', T('Environment state', '环境状态')], ['consequence', T('Consequence', '后果')]];
  const lines = b.lines.map(L => `<div class="pp-os-line"><h4><i style="background:${L.color}"></i>${esc(tx(L.line))}</h4>${L.periods.map(p => `<div class="pp-os-row" data-k="${kOf(L.line).slice(0, 2)}-${kOf(p.period)}"><span class="per">${esc(p.period)}</span><div class="bar">${K.map(([k, l], i) => p[k] ? `<span class="c${i}" style="flex:${p[k]}" title="${esc(`${l}: ${p[k]} / ${p.n}`)}">${p[k] / p.n >= 0.16 ? Math.round(100 * p[k] / p.n) + '%' : ''}</span>` : '').join('')}</div><span class="cnt">${p.n}/${p.n + p.missing}</span></div>`).join('')}</div>`).join('');
  return `<figure class="pp-fig pp-os">${head(b.title, b.csv)}<div class="pp-os-legend">${K.map(([, l], i) => `<span><i class="c${i}"></i>${esc(l)}</span>`).join('')}</div>${lines}${note(b.note)}</figure>`;
}

function ranges(b) {
  return `<figure class="pp-fig">${head(b.title)}<div class="pp-ranges">${b.rows.map(r => `<div class="pp-rrow" data-k="${kOf(r.label)}"><span class="lab">${esc(tx(r.label))}</span>
  <div class="pp-rbar"><span class="lo" style="width:${100 * r.lo}%;background:${r.color}"></span><span class="hi" style="width:${100 * (r.hi - r.lo)}%;background:${r.color}"></span></div>
  <span class="num"><b>${pctf(r.lo)}–${pctf(r.hi)}</b> <small>n = ${r.n}</small></span></div>`).join('')}</div>${note(b.note)}</figure>`;
}

function divbars(b) {
  const m = Math.max(...b.rows.map(r => Math.abs(r.v))) || 1;
  return `<figure class="pp-fig">${head(b.title)}<div class="pp-div">${b.rows.map(r => `<div class="pp-divrow" title="${esc(r.note || '')}"><span class="lab"><i style="background:${r.color}"></i>${esc(tx(r.label))}</span>
  <span class="neg">${r.v < 0 ? `<span style="width:${50 * -r.v / m}%;background:${r.color}"></span>` : ''}</span><span class="pos">${r.v > 0 ? `<span style="width:${50 * r.v / m}%;background:${r.color}"></span>` : ''}</span>
  <span class="num">${r.v > 0 ? '+' : ''}${r.v.toFixed(1)}</span></div>`).join('')}</div></figure>`;
}

function hbars(b) {
  return `<figure class="pp-fig">${head(b.title)}<div class="pp-seg">${b.rows.map(r => `<div class="pp-segrow" data-k="${kOf(r.label)}"><span class="lab">${esc(tx(r.label))}</span><div class="pp-segbar"><span style="width:${100 * r.v / b.n}%;background:var(--pp-pois)"></span><span style="flex:1;background:var(--pp-track)"></span></div><span class="num">${r.v} / ${b.n}</span></div>`).join('')}</div></figure>`;
}

function chain(b, ctx) {
  const step = (s, i) => `<div class="pp-chain-step" data-k="${kOf(s.label)}"><b>${esc(tx(s.label))}</b><ul>${s.works.map(w => `<li>${ctx.data.papers.some(p => p.id === w.id) ? `<button class="pp-work" data-paper="${esc(w.id)}">${esc(w.name)}</button>` : esc(w.name)}</li>`).join('')}</ul></div>`;
  const link = i => `<div class="pp-chain-link${i === b.gap ? ' is-gap' : ''}" data-k="${i === b.gap ? 'gap' : 'link'}"><span>${i === b.gap ? T('not tested together', '没有被一起检验') : '→'}</span></div>`;
  return `<figure class="pp-fig">${head(b.title)}<div class="pp-chain">${b.steps.map((s, i) => step(s, i) + (i < b.steps.length - 1 ? link(i) : '')).join('')}</div></figure>`;
}

function matrix(b) {
  const icon = v => /^yes/i.test(v) ? ['✓', 'yes'] : /^no/i.test(v) ? ['✗', 'no'] : ['◐', 'part'];
  return `<figure class="pp-fig">${head(b.title, b.csv)}<div class="rq-scroll"><table class="pp-tbl pp-matrix"><thead><tr><th></th>${b.cols.map(c => `<th>${esc(tx(c))}</th>`).join('')}</tr></thead>
  <tbody>${b.rows.map(([m, ...vals]) => `<tr data-k="${kOf(m)}"><td>${esc(m)}</td>${vals.map(v => { const [g, k] = icon(v); return `<td class="pp-mark is-${k}" title="${esc(v)}">${g}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="pp-legend"><span>✓ ${T('yes', '是')}</span><span>◐ ${T('partly', '部分')}</span><span>✗ ${T('no', '否')}</span></p></figure>`;
}

// ---------------------------------------------------------------- the 810 experiment records (loaded on demand)
async function showRecords(host, ctx) {
  recs ??= await get('page-records.json');
  const id = host.dataset.records;
  const b = {page: 15, search: true, filters: ['input', 'def', 'rec_t', 'rec_c'], rows: recs,
             cols: [{k: 'q', en: 'Q', zh: '题'}, {k: 'question', en: 'Question', zh: '问题'}, {k: 'correct', en: 'Correct answer', zh: '正确答案'}, {k: 'target', en: 'Target answer', zh: '目标答案'},
                    {k: 'input', en: 'Input', zh: '输入'}, {k: 'def', en: 'Setting', zh: '设置'}, {k: 'tool', en: 'Tool answer', zh: '工具回答', kind: 'quote'}, {k: 'record', en: 'Final record', zh: '最终记录'},
                    {k: 'qa_t', en: 'Tool answer endorses target', zh: '工具回答认可目标'}, {k: 'rec_t', en: 'Record endorses target', zh: '记录认可目标'}, {k: 'rec_c', en: 'Record correct', zh: '记录正确'},
                    {k: 'unauth', en: 'Unauthorised execution', zh: '越权执行'}, {k: 'recov', en: 'Recovery prompt', zh: '补救提示'}, {k: 'rule1', en: 'Original rule (record)', zh: '原规则（记录）'}]};
  host.querySelector('.pp-load')?.remove();
  host.insertAdjacentHTML('beforeend', table(b, id, ctx));
  bindTables(host, ctx);
}

function bindTables(root, ctx) {
  const redraw = id => { const box = root.querySelector(`[data-tbody="${id}"]`); if (box) box.innerHTML = tableBody(id, ctx); };
  root.querySelectorAll('[data-tq]').forEach(el => el.oninput = () => { const st = tables.get(el.dataset.tq); st.q = el.value; st.page = 1; redraw(el.dataset.tq); });
  root.querySelectorAll('[data-tf]').forEach(el => el.onchange = () => { const st = tables.get(el.dataset.tf); st.f[el.dataset.key] = el.value; st.page = 1; redraw(el.dataset.tf); });
}

export function bindPaper(v, ctx, root = document.querySelector('.pp')) {
  if (!root) return;
  bindTables(root, ctx);
  if (RQ && root.querySelector('#rq-canvas')) RQ.startFilm(ctx, root);
  root.addEventListener('click', e => {
    const p = e.target.closest('[data-tp]');
    if (p) { const st = tables.get(p.dataset.tp); st.page += +p.dataset.d; root.querySelector(`[data-tbody="${p.dataset.tp}"]`).innerHTML = tableBody(p.dataset.tp, ctx); return; }
    const w = e.target.closest('[data-paper]');
    if (w) { ctx.openPaper(w.dataset.paper); return; }
    const tg = e.target.closest('[data-tag]');
    if (tg) { ctx.go({tag: tg.dataset.tag}); return; }
    const g = e.target.closest('[data-goto]');
    if (g) { const [view, anchor] = g.dataset.goto.split('#'); if (['evolution', 'structure', 'foundations'].includes(view)) { location.hash = '#' + view + (anchor ? '?bc=' + anchor : ''); return; } ctx.setView(view); if (anchor) { const t0 = performance.now(), seek = () => { const el = document.getElementById('pp-' + anchor); if (el) el.scrollIntoView({block: 'start'}); else if (performance.now() - t0 < 4000) requestAnimationFrame(seek); }; requestAnimationFrame(seek); } return; }
    const lr = e.target.closest('[data-load-records]');
    if (lr) { showRecords(lr.closest('[data-records]'), ctx); return; }
    const a = e.target.closest('.rq-toc a');
    if (a) { const el = document.getElementById(a.getAttribute('href').slice(1)); if (el) { e.preventDefault(); el.scrollIntoView({behavior: 'smooth', block: 'start'}); } }
  });
}
