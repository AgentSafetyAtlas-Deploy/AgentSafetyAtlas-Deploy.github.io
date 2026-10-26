// Three boards of the frozen release (owner, 2026-10-26): Evolution, Landscape, Foundations & opportunities. A board is a hero
// (one sentence and four numbers), a sticky chapter bar and one chapter at a time. Every chapter is a storyline in one design
// (owner, 10-26): it opens with a question, then steps through its sections one at a time; a section is one global view on the
// left and numbered finding cards on the right (question, one-sentence answer, the background view), and a card lights the part
// of the view it talks about; data tables sit folded below. The observation chapters (lenses.js) already have this form; the
// other chapters take theirs from page-story.json (review/story_data.py) and reuse the existing renderers for their views:
// findings blocks (paper.js), the time map and the Explore charts (analysis.js).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const L = (en, zh) => ({en, zh});

export const BOARDS = {
  evolution: {
    kicker: L('Evolution', '演化'), icon: '↗',
    title: L('How the field grew, and where it is heading.', '领域怎样长出来，又在往哪里走。'),
    lead: L('5,378 works first published through 30 September 2026, placed month by month on a frozen field map of 14 galaxies (themes) and 61 consensus clusters.', '截至 2026 年 9 月 30 日首次公开的 5,378 篇论文，按月放到冻结的领域地图上：14 个星系（主题）、61 个共识星团。'),
    kpi: [['5,378', L('works on the map', '篇论文在地图上')], ['16 → 61', L('clusters, end of 2023 → Sep 2026', '个星团，2023 年底 → 2026 年 9 月')], [L('×2 / 6 months', '6 个月 ×2'), L('the field doubles about every six months', '领域约每 6 个月翻一番')], ['15% → 39%', L('of new works link outside information to authorised action', '的新论文把外部信息与授权行动联系起来')]],
    ch: [
      {id: 'film', label: L('Evolution film', '演化片'), story: true},
      {id: 'map', label: L('World map', '世界地图'), story: true},
      {id: 'themes', label: L('Themes', '主题'), story: true},
      {id: 'shift', label: L('Turning to action', '转向行动'), story: true},
      {id: 'trajectory', label: L('Head and tail', '头部与长尾'), lens: 'evolve'}]
  },
  structure: {
    kicker: L('Landscape', '格局'), icon: '◎',
    title: L('What the field studies, who does it, and how its lines connect.', '这个领域研究什么、谁在做、各条研究线怎样相连。'),
    lead: L('Positioning, connections, institutions, venues, models and open source, all computed on the frozen field map.', '定位、衔接、机构、发表、模型与开源，全部在冻结领域地图上计算。'),
    kpi: [['14 · 61', L('galaxies (themes) and clusters', '个星系（主题）与星团')], ['1,271', L('institutions in 76 countries and regions', '个机构，分布在 76 个国家和地区')], ['4,689', L('works joined to the rest of the map by citations', '篇论文与地图中其他论文有引用联系')], ['616', L('benchmarks named; 125 used by other works', '个基准被点名，125 个被其他工作使用')]],
    ch: [
      {id: 'position', label: L('Positioning', '定位'), lens: 'structure'},
      {id: 'connect', label: L('Connection', '衔接'), lens: 'connect'},
      {id: 'lead', label: L('Countries & institutions', '国家与机构'), lens: 'lead'},
      {id: 'pubs', label: L('Venues & forms', '发表与形式'), story: true},
      {id: 'models', label: L('Models', '模型'), lens: 'models'},
      {id: 'oss', label: L('Open source', '开源'), lens: 'oss'}]
  },
  foundations: {
    kicker: L('Foundations & opportunities', '基础与机会'), icon: '⛁',
    title: L('What new work stands on, what its protection trusts, and what to test next.', '新研究建立在什么上，保护依赖什么，下一步该测什么。'),
    lead: L('Experimental use of earlier contributions in 2026 papers, the inputs reviewed defences trust, one gap in the literature and one condition tested end to end.', '2026 年论文对早期成果的实验使用、已核查防御所信任的输入、文献中的一处缺口，以及一项从头到尾测完的条件。'),
    kpi: [['849', L('attacks, defences and benchmarks followed for a year', '项攻击、防御与基准跟踪满一年')], ['99', L('system-level defences reviewed in full text', '个系统级防御逐篇精读')], ['810', L('agent runs in the retrieval-to-record test', '次 Agent 运行（检索到记录实验）')], ['−76.7 pp', L('attacker answers in final records, TrustRAG vs no defence', '最终记录中的攻击者答案，TrustRAG 对比无防御')]],
    ch: [
      {id: 'basis', label: L('Foundations', '基础'), story: true},
      {id: 'protect', label: L('Protection', '保护'), story: true},
      {id: 'opportunity', label: L('Opportunities', '机会'), story: true}]
  }
};
export const BOARD_VIEWS = Object.keys(BOARDS);
// where the observation parts and the old Explore sections now live
export const LENS_HOME = {structure: ['structure', 'position'], connect: ['structure', 'connect'], lead: ['structure', 'lead'], models: ['structure', 'models'],
  oss: ['structure', 'oss'], evolve: ['evolution', 'trajectory']};
// earlier chapter addresses → [chapter, section]
const ALIAS = {
  evolution: {quarters: ['film', 1], lines: ['shift', 0], action: ['shift', 0], outcomes: ['shift', 1], cases: ['shift', 2]},
  structure: {cross: ['pubs', 0], forms: ['pubs', 1], venues: ['pubs', 2]},
  foundations: {adoption: ['basis', 0], uses: ['basis', 1], inputs: ['protect', 0], conditions: ['protect', 1], chain: ['opportunity', 0], defences: ['opportunity', 1],
    experiment: ['opportunity', 2], retrieval: ['opportunity', 2], overview: ['opportunity', 2]}};
const secOf = {};  // open section per board chapter

let token = 0;
export async function renderBoard(v, ctx, H) {
  const my = ++token, {state} = ctx, B = BOARDS[v], tx = o => o ? (state.lang === 'zh' ? o.zh : o.en) : '';
  const al = ALIAS[v]?.[state.boardCh];
  if (al) { state.boardCh = al[0]; secOf[`${v}:${al[0]}`] = al[1]; ctx.writeHash(); }
  const ch = B.ch.find(c => c.id === state.boardCh) || B.ch[0];
  H.stopAll();
  const hero = `<header class="bd-hero"><div class="bd-hero-copy"><span class="bd-kicker"><i aria-hidden="true">${esc(B.icon)}</i>${esc(tx(B.kicker))}</span><h1>${esc(tx(B.title))}</h1><p>${esc(tx(B.lead))}</p></div>
    <dl class="bd-kpis">${B.kpi.map(([n, l]) => `<div><dt>${esc(typeof n === 'string' ? n : tx(n))}</dt><dd>${esc(tx(l))}</dd></div>`).join('')}</dl></header>`;
  const tabs = `<nav class="bd-tabs" aria-label="${esc(tx(B.kicker))}">${B.ch.map((c, i) => `<button data-bd-ch="${c.id}" class="${c === ch ? 'is-on' : ''}" ${c === ch ? 'aria-current="page"' : ''}><span>${String(i + 1).padStart(2, '0')}</span>${esc(tx(c.label))}</button>`).join('')}</nav>`;
  const content = document.querySelector('#content');
  content.innerHTML = `<div class="bd bd-${v}" data-bd-view="${v}">${hero}${tabs}<div class="bd-body" data-bd-ch-body="${ch.id}"><p class="muted" role="status">${esc(tx(L('Loading…', '正在加载…')))}</p></div></div>`;
  content.querySelectorAll('[data-bd-ch]').forEach(b => b.addEventListener('click', () => {
    state.boardCh = b.dataset.bdCh; ctx.writeHash();
    renderBoard(v, ctx, H).then(() => { const bar = document.querySelector('.bd-tabs'); if (bar && bar.getBoundingClientRect().top < 0) bar.scrollIntoView({block: 'start'}); });
  }));
  try {
    if (ch.lens) {
      await H.lensReady();
      if (my !== token) return;
      document.querySelector('.bd-body').innerHTML = `<section class="bd-part bd-lens" data-bd-lens="${ch.lens}"></section>`;
      H.lensRender(ch.lens, () => my === token);
    } else await renderStory(v, ch, ctx, H, () => my === token);
  } catch (e) {
    console.error(e);
    if (my === token) document.querySelector('.bd-body').innerHTML = `<div class="empty"><strong>${esc(tx(L('This chapter could not be loaded.', '这一章加载失败。')))}</strong></div>`;
  }
}

// ---------------------------------------------------------------- storyline chapters
async function renderStory(v, ch, ctx, H, alive) {
  const {state} = ctx, tx = o => o == null ? '' : typeof o === 'object' ? (state.lang === 'zh' ? o.zh : o.en) : String(o), T = (en, zh) => state.lang === 'zh' ? zh : en;
  const PM = await H.paper(), probe = await PM.loadStory(), S = probe[v][ch.id], key = `${v}:${ch.id}`;
  const k = Math.max(0, Math.min(S.secs.length - 1, secOf[key] || 0)), sec = S.secs[k];
  if ((sec.view || []).some(b => b.t === 'film')) await PM.loadStory(true);
  if (sec.ext === 'analysis') await H.analysisReady();
  if (sec.ext === 'timemap') await H.timemapReady();
  if (!alive()) return;
  PM.resetBlocks(ctx);
  const anCtx = sec.ext === 'analysis' ? H.anCtx() : null;
  const cards = () => sec.auto ? (sec.ext === 'analysis' ? H.analysis().storyCards(anCtx, sec.auto) : H.timemap().storyCards(H.tmCtx(), sec.auto)) : sec.cards.map(c => ({q: tx(c.q), a: tx(c.a), bg: tx(c.bg), k: c.k || [], cfg: c.cfg}));
  const view = sec.ext === 'analysis' ? `<div class="bd-an">${H.analysis().renderSection(anCtx, sec.keys)}</div>`
    : sec.ext === 'timemap' ? '<div id="tm-root"></div>' : `<div class="rq pp pp-in-board">${PM.renderBlocks(sec.view, `${ch.id}-${k}`, ctx)}</div>`;
  const n = S.secs.length;
  const nav = `<nav class="pb-nav pb-steps bd-steps" style="--n:${n}" aria-label="${T('Sections', '节')}">${S.secs.map((s, i) => `<button data-bd-sec="${i}" class="${i < k ? 'is-done' : ''}" aria-current="${i === k ? 'page' : 'false'}"><span>${i + 1}</span><b>${esc(tx(s.name))}</b><small>${esc(tx(s.sub))}</small></button>`).join('')}</nav>`;
  const head = `<div class="pb-head"><span class="fd-kicker">${T(`SECTION ${k + 1}`, `第 ${k + 1} 节`)}</span><h3>${esc(tx(sec.name))}</h3><p class="fd-note">${esc(tx(sec.lead))}</p></div>`;
  const foot = `<div class="pb-foot">${k > 0 ? `<button class="pb-prev" data-bd-sec="${k - 1}">← ${esc(tx(S.secs[k - 1].name))}</button>` : '<span></span>'}${k < n - 1 ? `<button class="pb-next" data-bd-sec="${k + 1}">${T('Next section', '下一节')}：${esc(tx(S.secs[k + 1].name))} →</button>` : ''}</div>`;
  const cardList = cs => cs.map((c, j) => `<article class="cr-card pb-card-q bd-card" data-bd-card="${j}"><button class="cr-card-head" data-bd-open="${j}" aria-pressed="false"><span class="ln-qn">${String(j + 1).padStart(2, '0')}</span><span class="cr-card-text"><b>${esc(c.q)}</b><em>${esc(c.a)}</em></span></button>
    <p class="fd-note cr-config"><span><b>${T('Background view', '相关背景视图')}</b> ${esc(c.bg)}</span><button class="cr-show pb-show" data-bd-show="${j}">${T('Show in the view', '在图中查看')}</button></p></article>`).join('');
  const more = sec.more?.length ? `<details class="pp-more bd-more"><summary>${T('Data and notes', '数据与说明')}</summary><div class="rq pp pp-in-board">${PM.renderBlocks(sec.more, `${ch.id}-${k}-m`, ctx)}</div>${sec.dir ? H.instDirectory() : ''}</details>` : (sec.dir ? H.instDirectory() : '');
  const lead = `<section class="ln-lead bd-lead"><span class="fd-kicker">${esc(tx(ch.label))} · ${T('frozen map v2', '冻结地图 v2')}</span><h2>${esc(tx(S.q))}</h2>${S.lead ? `<p class="fd-note">${esc(tx(S.lead))}</p>` : ''}</section>`;
  const body = document.querySelector('.bd-body');
  let cs = cards();
  body.innerHTML = `<div class="fd bd-story pb-lens" data-bd-story="${key}">${lead}${nav}${head}<div class="cr-wrap${sec.stack ? ' bd-stack' : ''}"><div class="cr-stage bd-stage${sec.ext ? ' is-' + sec.ext : ''}">${view}</div><div class="cr-cards pb-cards-col">${cardList(cs)}${foot}</div></div>${more}</div>`;
  if (sec.ext === 'analysis') { body.querySelector('.bd-story').insertAdjacentHTML('beforeend', H.analysis().analysisNotes(anCtx)); H.analysis().bindAnalysis(anCtx); }
  if (sec.ext === 'timemap') H.timemapRender();
  body.querySelectorAll('.bd-story .pp').forEach(r => PM.bindPaper(v, ctx, r));
  const root = body.querySelector('.bd-story'), stage = root.querySelector('.bd-stage');
  let on = -1;
  const light = j => {
    on = j;
    root.querySelectorAll('[data-bd-card]').forEach(a => { const me = +a.dataset.bdCard === j; a.classList.toggle('is-active', me); a.querySelector('[data-bd-open]').setAttribute('aria-pressed', me); });
    const c = cs[j], ks = j >= 0 ? c.k : [];
    stage.classList.toggle('has-hl', ks.length > 0);
    let first = null;
    stage.querySelectorAll('[data-k]').forEach(el => { const kk = el.dataset.k, hit = ks.some(h => kk === h || kk.startsWith(h + '-')); el.classList.toggle('is-hl', hit); if (hit && !first) first = el; });
    if (j >= 0 && c.cfg && sec.ext === 'timemap') { H.timemap().applyStory(H.tmCtx(), c.cfg); H.timemapRender(); }
    if (first && stage.scrollHeight > stage.clientHeight) { const r = first.getBoundingClientRect(), s0 = stage.getBoundingClientRect(); if (r.top < s0.top || r.bottom > s0.bottom) stage.scrollTop += r.top - s0.top - 40; }
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-bd-sec]');
    if (s) { secOf[key] = +s.dataset.bdSec; renderStory(v, ch, ctx, H, alive).then(() => { const nb = document.querySelector('.bd-steps'); if (nb && nb.getBoundingClientRect().top < 0) nb.scrollIntoView({block: 'start'}); }); return; }
    const o = e.target.closest('[data-bd-open]');
    if (o) { const j = +o.dataset.bdOpen; light(on === j ? -1 : j); return; }
    const sh = e.target.closest('[data-bd-show]');
    if (sh) { light(+sh.dataset.bdShow); stage.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  });
  // the Explore charts redraw themselves when their controls change: recompute their cards
  if (sec.ext === 'analysis') stage.addEventListener('click', e => { if (e.target.closest('[data-an-mode],[data-an-axis],[data-an-vmode],[data-an-xmode],[data-an-norm],[data-an-tview],[data-an-lmeasure]')) setTimeout(() => refreshCards(), 0); });
  if (sec.ext === 'analysis') stage.addEventListener('change', () => setTimeout(() => refreshCards(), 0));
  function refreshCards() {
    if (!sec.auto || !alive()) return;
    cs = cards(); on = -1;
    const col = root.querySelector('.pb-cards-col');
    col.innerHTML = cardList(cs) + foot;
  }
}
