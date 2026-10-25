// The paper pages of the review copy (owner, 2026-10-25): RQ1, RQ2, RQ3, Evidence, Method, Data & versions.
// Each page is a static JSON file written once from the frozen results (review/paper_data.py); this module only draws it.
const cache = {};
let recs = null, LANG = 'en';
const tables = new Map();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const tx = o => o == null ? '' : (typeof o === 'object' ? (o[LANG] ?? o.en ?? '') : String(o));
const T = (en, zh) => LANG === 'zh' ? zh : en;
const pctf = (v, d = 0) => `${(100 * v).toFixed(d)}%`;
const get = n => fetch(`./data/${n}`).then(r => { if (!r.ok) throw Error(n); return r.json(); });

export async function loadPaper(v) {
  if (!cache[v]) cache[v] = await get(`paper-${v}.json`);
  if (!cache.home) cache.home = await get('paper-home.json');
}

export function renderPaper(v, ctx) {
  LANG = ctx.lang === 'zh' ? 'zh' : 'en';
  const P = cache[v];
  tables.clear();
  const toc = P.sections.map(s => `<a href="#pp-${s.id}" class="rq-jump">${/^[0-9.]+$/.test(tx(s.kicker)) ? esc(tx(s.kicker)) + ' ' : ''}${esc(tx(s.title))}</a>`).join('');
  return `<div class="rq pp" data-pp-view="${v}">
  <div class="pp-head"><span class="rq-eyebrow">${esc(tx(P.kicker))}</span><h1>${esc(tx(P.title))}</h1><p>${esc(tx(P.lead))}</p>
  <nav class="rq-toc" aria-label="${T('On this page', '本页目录')}">${toc}</nav></div>
  ${P.sections.map(s => `<section class="rq-sec pp-sec" id="pp-${s.id}"><div class="rq-sec-head"><span class="rq-eyebrow">${esc(tx(s.kicker))}</span><h2>${esc(tx(s.title))}</h2></div>
  ${s.blocks.map((b, i) => block(b, `${s.id}-${i}`, ctx)).join('')}</section>`).join('')}
  </div>`;
}

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
    case 'downloads': return `<ul class="pp-downloads">${cache.home.downloads.map(d => `<li>${csvLink(d.file, d.file.replace('tables/', ''))}<span>${esc(d.en)}</span></li>`).join('')}</ul>`;
    default: return '';
  }
}

// ---------------------------------------------------------------- tables: search, filters, pages, links to papers
const VIEW_LABEL = {rq1: 'RQ1', rq2: 'RQ2', rq3: 'RQ3', evidence: 'Evidence', versions: 'Data & versions', method: 'Method'};
function gotoLabel(view, anchor) {
  const m = /^s(\d)(\d)$/.exec(anchor || '');
  const a = !anchor ? '' : m ? `§${m[1]}.${m[2]}` : anchor === 's4c' ? T('Appendix C checks', '附录 C 核查') : anchor === 'samples' ? T('sample manifest', '样本清单') : anchor;
  return (LANG === 'zh' && view === 'versions' ? '数据与版本' : LANG === 'zh' && view === 'evidence' ? '证据与核查' : VIEW_LABEL[view] || view) + (a ? ' · ' + a : '');
}
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
  const ser = b.series.map(s => `<polyline points="${s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2"/>${s.values.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3.2" fill="${s.color}"><title>${esc(tx(s.name))} · ${esc(b.x[i])}: ${pctf(v, 1)} (${s.counts[i]})</title></circle>`).join('')}`).join('');
  const leg = b.series.map(s => `<span><i style="background:${s.color}"></i>${esc(tx(s.name))} <b>${pctf(s.values[s.values.length - 1])}</b></span>`).join('');
  return `<figure class="pp-fig">${head(b.title)}<svg viewBox="0 0 ${W} ${H}" class="pp-svg" role="img" aria-label="${esc(tx(b.title))}">${grid}${xs}${ser}</svg><div class="pp-legend">${leg}</div>${note(b.note)}</figure>`;
}

function endpoints(b) {
  const cats = [['text_only', T('Text output only', '只有文本输出'), 'var(--pp-c1)'], ['environment_state', T('Environment state', '环境状态'), 'var(--pp-c2)'], ['consequence', T('Consequence', '后果'), 'var(--pp-c3)']];
  const panel = ln => `<div class="pp-ep"><h4 style="--c:${ln.color}">${esc(tx(ln.line))}</h4><table><tbody>${ln.periods.map(p => `<tr><th>${esc(p.period)}</th><td>${cats.map(([k, lab, c]) => {
    const v = p[k] / p.n, [lo, hi] = p.bounds[k];
    return `<div class="pp-epbar" title="${esc(lab)}: ${p[k]}/${p.n} = ${pctf(v)} · ${T('missing-data bound', '缺失数据界')} ${pctf(lo)}–${pctf(hi)}"><span class="rng" style="left:${100 * lo}%;width:${100 * (hi - lo)}%"></span><span class="val" style="width:${100 * v}%;background:${c}"></span></div>`;
  }).join('')}</td><td class="num">${p.n}/${p.n + p.missing}</td></tr>`).join('')}</tbody></table></div>`;
  return `<figure class="pp-fig">${head(L_('Deepest evaluated outcome among defences (Figure 2c, Table 6)', '防御测到的最深结果（图 2c、表 6）'), b.csv)}<div class="pp-legend">${cats.map(([, l, c]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join('')}<span><i class="rng"></i>${T('missing-data bound', '缺失数据界')}</span></div>
  <div class="pp-eps">${b.lines.map(panel).join('')}</div>${note(b.note)}</figure>`;
}
const L_ = (en, zh) => ({en, zh});

function stack(parts, total, soft = false) {
  const op = soft ? 'opacity:.8;filter:saturate(.6) brightness(1.08);' : '';   // theme colours softened like the ribbons of Figure 3 (owner, 10-25)
  return `<div class="pp-stack">${parts.map(([lab, v, c]) => `<span style="flex:${v};${op}${c === 'hollow' ? 'background:transparent;border:1px solid var(--rq-ink)' : `background:${c}`}" title="${esc(tx(lab))}: ${v}/${total}"></span>`).join('')}</div>
  <div class="pp-stack-l">${parts.map(([lab, v, c]) => `<span><i style="${op}${c === 'hollow' ? 'border:1px solid var(--rq-ink)' : `background:${c}`}"></i>${esc(tx(lab))} <b>${v}</b></span>`).join('')}</div>`;
}

function flows(b) {
  const d = b.data;
  return `<figure class="pp-fig">${head(b.title)}<div class="pp-flows">${d.into.map(g => `<div><h4>${esc(tx(g.label))} · ${g.total} ${T('uses from', '次使用，来自')} ${g.works} ${T('works', '篇论文')}</h4>${stack(g.from, g.total, true)}</div>`).join('')}
  <div><h4>${T(`Purposes of the ${d.cross} cross-theme uses in tool injection and skills`, `工具注入与技能中 ${d.cross} 次跨主题使用的用途`)}</h4>${stack(d.purposes, d.cross)}</div></div>${note(b.note)}</figure>`;
}

function segbars(b) {
  const [c0, c1, c2] = b.colors;
  return `<figure class="pp-fig">${head(b.title)}<div class="pp-legend">${b.legend.map((l, i) => `<span><i style="background:${b.colors[i]}"></i>${esc(tx(l))}</span>`).join('')}</div>
  <div class="pp-seg">${b.rows.map(r => `<div class="pp-segrow"><span class="lab">${esc(tx(r.label))}</span><div class="pp-segbar"><span style="width:${100 * r.segs[0] / r.n}%;background:${c0}"></span><span style="width:${100 * r.segs[1] / r.n}%;background:${c1}"></span><span style="flex:1;background:${c2}"></span></div><span class="num">${r.segs[0] + r.segs[1]}/${r.n}</span></div>`).join('')}</div>${note(b.note)}</figure>`;
}

function fig4(b) {
  const a = b.a.map(r => `<div class="pp-segrow"><span class="lab">${esc(tx(r.label))}</span><div class="pp-segbar"><span style="width:${100 * r.v / 90}%;background:var(--pp-pois)"></span><span style="flex:1;background:var(--pp-track)"></span></div><span class="num">${r.v}/90</span></div>`).join('');
  const bb = b.b.map(g => `<div class="pp-f4g"><span class="lab">${esc(tx(g.label))}</span><div>${g.rows.map(r => `<div class="pp-segrow"><span class="lab2">${esc(tx(r.input))}</span><div class="pp-segbar"><span style="width:${100 * r.yes / 90}%;background:${r.kind === 'clean' ? 'var(--pp-clean)' : 'var(--pp-pois)'}"></span><span class="unc" style="width:${100 * r.unc / 90}%"></span><span style="flex:1;background:var(--pp-track)"></span></div><span class="num">${r.yes}${r.unc ? ` · ${r.unc} ${T('uncertain', '含糊')}` : ''}</span><span class="num rec">${r.recovery}/90</span></div>`).join('')}</div></div>`).join('');
  return `<figure class="pp-fig pp-fig4">
  <div class="pp-flowmini"><span class="st">${T('Retrieved Passages', '检索材料')}</span><span class="ar">→</span><span class="st">${T('Knowledge Tool', '知识工具')} <small>${T('Answer + Sources', '答案 + 来源')}</small><em>● ${T('Tool Answer', '工具回答')}</em></span><span class="ar">→</span><span class="st">Agent</span><span class="ar">→</span><span class="st">${T('Final Record', '最终记录')}<em>● ${T('Final Record', '最终记录')}</em></span></div>
  <h3>${T('(a) Target answer in the final record, original poisoning', '(a) 目标答案进入最终记录（原始投毒）')}</h3><div class="pp-seg">${a}</div>
  <p class="pp-diff">${T('TrustRAG − no defence', 'TrustRAG − 无防御')}: <b>${esc(b.diff)} ${T('percentage points', '个百分点')}</b> <span>(${T('paired 95% bootstrap interval', '逐题配对 95% bootstrap 区间')} ${esc(b.ci)})</span></p>
  <h3>${T('(b) Correct and clean completion, and tasks requiring recovery prompts', '(b) 正确且无越权地完成，以及需要补救提示的任务')}</h3>
  <div class="pp-legend"><span><i style="background:var(--pp-clean)"></i>${T('Judged correct · clean', '判为正确 · 干净')}</span><span><i style="background:var(--pp-pois)"></i>${T('Judged correct · original poisoning', '判为正确 · 原始投毒')}</span><span><i class="unc"></i>${T('Uncertain', '含糊')}</span></div>
  <div class="pp-f4g pp-f4h"><span></span><div class="pp-segrow"><span></span><span></span><span></span><span class="num rec">${T('Tasks requiring recovery prompts', '需要补救提示的任务')}</span></div></div>
  <div class="pp-seg">${bb}</div>${note(b.note)}</figure>`;
}

function cases(b, ctx) {
  return `<div class="pp-cases">${head(L_('Case records', '案例记录'), b.csv)}${b.cases.map(c => `<article class="pp-case"><h3>${esc(tx(c.title))}</h3>
  <p class="pp-case-meta"><span>${esc(c.interval)}</span><span>${T('Jaccard v1/v2', 'v1/v2 Jaccard')} ${c.jaccard.toFixed(2)}</span><span>${esc(c.count)} ${T('later works', '篇后期论文')}</span></p><p>${esc(tx(c.lead))}</p>
  <details><summary>${T(`All ${c.rows.length} records with passages`, `全部 ${c.rows.length} 条记录与原文`)}</summary><ul class="pp-evl">${c.rows.map(r => `<li><span class="pp-tagl">${esc(tx(r.side))} · ${esc(r.date)}</span> ${cellHtml({kind: 'work'}, r.work, r, ctx)}<q class="pp-quote">${esc(r.quote)}</q><small>${esc(r.where)} · ${esc(tx(r.support))}</small></li>`).join('')}</ul></details></article>`).join('')}</div>`;
}

function coverage(b, ctx) {
  return `<div class="pp-cov">${head(b.title, b.csv)}<div class="rq-scroll"><table class="pp-tbl"><thead><tr><th>${T('Work', '工作')}</th>${b.heads.map(h => `<th>${esc(tx(h))}</th>`).join('')}</tr></thead><tbody>${b.works.map(w => `<tr><td><strong>${esc(w.work)}</strong><br>${cellHtml({kind: 'work'}, w.id, w, ctx)}<br><small>${esc(w.date)}${w.after ? ` · ${T('after the corpus cutoff', '晚于语料截止日')}` : ''} · ${esc(w.found)}</small>
  <details><summary>${T('Evidence', '证据')}</summary>${w.quotes.map(q => `<q class="pp-quote">${esc(q.quote)}</q><small>${esc(q.where)}</small>`).join('')}</details></td>${w.fields.map(f => `<td>${esc(f)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}

// ---------------------------------------------------------------- the 810 experiment records (loaded on demand)
async function showRecords(host, ctx) {
  recs ??= await get('paper-rq3-records.json');
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

export function bindPaper(v, ctx) {
  const root = document.querySelector('.pp');
  if (!root) return;
  bindTables(root, ctx);
  root.addEventListener('click', e => {
    const p = e.target.closest('[data-tp]');
    if (p) { const st = tables.get(p.dataset.tp); st.page += +p.dataset.d; root.querySelector(`[data-tbody="${p.dataset.tp}"]`).innerHTML = tableBody(p.dataset.tp, ctx); return; }
    const w = e.target.closest('[data-paper]');
    if (w) { ctx.openPaper(w.dataset.paper); return; }
    const tg = e.target.closest('[data-tag]');
    if (tg) { ctx.go({tag: tg.dataset.tag}); return; }
    const g = e.target.closest('[data-goto]');
    if (g) { const [view, anchor] = g.dataset.goto.split('#'); ctx.setView(view); if (anchor) { const t0 = performance.now(), seek = () => { const el = document.getElementById('pp-' + anchor); if (el) el.scrollIntoView({block: 'start'}); else if (performance.now() - t0 < 4000) requestAnimationFrame(seek); }; requestAnimationFrame(seek); } return; }
    const lr = e.target.closest('[data-load-records]');
    if (lr) { showRecords(lr.closest('[data-records]'), ctx); return; }
    const a = e.target.closest('.rq-toc a');
    if (a) { const el = document.getElementById(a.getAttribute('href').slice(1)); if (el) { e.preventDefault(); el.scrollIntoView({behavior: 'smooth', block: 'start'}); } }
  });
}
