// Four boards of the frozen release (owner, 2026-10-26): Evolution, Landscape, Foundations & protection, Opportunities & tests.
// Every chart of the former Explore and Findings pages sits in one board, grouped by what the reader wants to know. A board
// is a hero (one sentence and four numbers), a sticky chapter bar and one chapter at a time. Chapters reuse the existing
// renderers: findings sections (paper.js), the time map, the Explore charts (analysis.js) and the observation parts
// (lenses.js); this module only arranges them in one frame.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const L = (en, zh) => ({en, zh});

export const BOARDS = {
  evolution: {
    kicker: L('Evolution', '演化'), icon: '↗',
    title: L('How the field grew, and where it is heading.', '领域怎样长出来，又在往哪里走。'),
    lead: L('5,378 works first published through 30 September 2026, placed month by month on a frozen field map of 14 galaxies (themes) and 61 consensus clusters.', '截至 2026 年 9 月 30 日首次公开的 5,378 篇论文，按月放到冻结的领域地图上：14 个星系（主题）、61 个共识星团。'),
    kpi: [['5,378', L('works on the map', '篇论文在地图上')], ['16 → 61', L('clusters, end of 2023 → Sep 2026', '个星团，2023 年底 → 2026 年 9 月')], [L('×2 / 6 months', '6 个月 ×2'), L('the field doubles about every six months', '领域约每 6 个月翻一番')], ['15% → 39%', L('of new works link outside information to authorised action', '的新论文把外部信息与授权行动联系起来')]],
    ch: [
      {id: 'film', label: L('Evolution film', '演化片'), parts: [{paper: 'evolution', secs: ['film']}]},
      {id: 'map', label: L('World map', '世界地图'), parts: [{timemap: true}]},
      {id: 'themes', label: L('Themes', '主题'), parts: [{paper: 'evolution', secs: ['themes']}, {analysis: ['trends']}]},
      {id: 'lines', label: L('Problem lines', '问题主线'), parts: [{paper: 'evolution', secs: ['action']}]},
      {id: 'cases', label: L('Cases', '案例'), parts: [{paper: 'evolution', secs: ['cases']}]},
      {id: 'outcomes', label: L('Evaluation', '评测终点'), parts: [{paper: 'evolution', secs: ['outcomes']}]},
      {id: 'trajectory', label: L('Head and tail', '头部与长尾'), parts: [{lens: 'evolve'}]}]
  },
  structure: {
    kicker: L('Landscape', '格局'), icon: '◎',
    title: L('What the field studies, who does it, and how its lines connect.', '这个领域研究什么、谁在做、各条研究线怎样相连。'),
    lead: L('Positioning, connections, institutions, venues, models and open source, all computed on the frozen field map.', '定位、衔接、机构、发表、模型与开源，全部在冻结领域地图上计算。'),
    kpi: [['14 · 61', L('galaxies (themes) and clusters', '个星系（主题）与星团')], ['1,271', L('institutions in 76 countries and regions', '个机构，分布在 76 个国家和地区')], ['4,689', L('works joined to the rest of the map by citations', '篇论文与地图中其他论文有引用联系')], ['616', L('benchmarks named; 125 used by other works', '个基准被点名，125 个被其他工作使用')]],
    ch: [
      {id: 'position', label: L('Positioning', '定位'), parts: [{lens: 'structure'}]},
      {id: 'connect', label: L('Connection', '衔接'), parts: [{lens: 'connect'}]},
      {id: 'lead', label: L('Countries & institutions', '国家与机构'), parts: [{lens: 'lead'}]},
      {id: 'cross', label: L('Cross-tab', '交叉统计'), parts: [{analysis: ['cross']}]},
      {id: 'venues', label: L('Venues & forms', '发表与形式'), parts: [{analysis: ['forms', 'venues']}]},
      {id: 'models', label: L('Models', '模型'), parts: [{lens: 'models'}]},
      {id: 'oss', label: L('Open source', '开源'), parts: [{lens: 'oss'}]}]
  },
  foundations: {
    kicker: L('Foundations & protection', '基础与保护'), icon: '⛁',
    title: L('New hotspots stand on earlier evaluation tools; their protection rests on inputs that are rarely tested.', '新热点建立在早期的评测工具上；它们的保护依赖很少被检验的输入。'),
    lead: L('Experimental use of earlier contributions in 2026 papers, and what reviewed system-level defences assume about their inputs.', '2026 年论文对早期成果的实验使用，以及已核查的系统级防御对其输入的假设。'),
    kpi: [['32,716', L('citation relations; 90.6% read in context', '条引用关系，90.6% 读到上下文')], ['849', L('attacks, defences and benchmarks followed for a year', '项攻击、防御与基准跟踪满一年')], ['99', L('system-level defences reviewed in full text', '个系统级防御逐篇精读')], ['42', L('AgentDojo papers read for their conditions', '篇 AgentDojo 论文逐篇读条件')]],
    ch: [
      {id: 'adoption', label: L('Adoption', '外部采用'), parts: [{paper: 'foundations', secs: ['adoption']}]},
      {id: 'uses', label: L('Experimental use', '实验使用'), parts: [{paper: 'foundations', secs: ['uses']}]},
      {id: 'inputs', label: L('Trusted inputs', '可信输入'), parts: [{paper: 'foundations', secs: ['inputs']}]},
      {id: 'conditions', label: L('Benchmark conditions', '基准条件'), parts: [{paper: 'foundations', secs: ['conditions']}]}]
  },
  opportunities: {
    kicker: L('Opportunities & tests', '机会与检验'), icon: '✦',
    title: L('Where existing protection should be examined next, and one test of it.', '已有的保护下一步该在哪里检验，以及一项已完成的检验。'),
    lead: L('One gap found in the literature, and one condition tested end to end in an agent that writes records.', '在文献中找到的一处缺口，以及在一个写记录的 Agent 中从头到尾测完的一项条件。'),
    kpi: [['810', L('agent runs in the experiment', '次 Agent 运行')], ['−76.7 pp', L('attacker answers in final records, TrustRAG vs no defence', '最终记录中的攻击者答案，TrustRAG 对比无防御')], ['0 / 810', L('runs with an unauthorised execution', '次运行出现越权执行')], ['19', L('closest works checked for the memory gap', '篇最接近的工作被核查')]],
    ch: [
      {id: 'overview', label: L('At a glance', '一览'), parts: [{paper: 'opportunities', secs: ['experiment']}]},
      {id: 'chain', label: L('Memory and delegation', '记忆与委托'), parts: [{paper: 'opportunities', secs: ['chain']}]},
      {id: 'defences', label: L('Retrieval defences', '检索防御'), parts: [{paper: 'opportunities', secs: ['defences']}]},
      {id: 'experiment', label: L('Retrieval to record', '检索到记录实验'), parts: [{paper: 'opportunities', secs: ['retrieval']}]}]
  }
};
export const BOARD_VIEWS = Object.keys(BOARDS);
// where the observation parts and the old Explore sections now live
export const LENS_HOME = {structure: ['structure', 'position'], connect: ['structure', 'connect'], lead: ['structure', 'lead'], models: ['structure', 'models'],
  oss: ['structure', 'oss'], evolve: ['evolution', 'trajectory']};

let token = 0;
export async function renderBoard(v, ctx, H) {
  const my = ++token, {state} = ctx, B = BOARDS[v], tx = o => o ? (state.lang === 'zh' ? o.zh : o.en) : '';
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
  // load what the chapter needs, then fill the body in part order
  const parts = ch.parts, html = [];
  let paperMod = null, anCtx = null, lensPart = null;
  try {
    for (const p of parts) {
      if (p.paper) { paperMod = await H.paper(); await paperMod.loadPaper(p.paper); }
      if (p.analysis) { await H.analysisReady(); anCtx = anCtx || H.anCtx(); }
      if (p.timemap) await H.timemapReady();
      if (p.lens) { await H.lensReady(); lensPart = p; }
    }
    if (my !== token) return;
    for (const p of parts) {
      if (p.paper) html.push(`<section class="bd-part bd-paper">${paperMod.renderSections(p.paper, p.secs, ctx)}</section>`);
      else if (p.analysis) html.push(`<section class="bd-part bd-analysis">${H.analysis().renderSection(anCtx, p.analysis)}</section>`);
      else if (p.timemap) html.push(`<section class="bd-part bd-map"><div id="tm-root"></div>${H.instDirectory()}</section>`);
      else if (p.lens) html.push(`<section class="bd-part bd-lens" data-bd-lens="${p.lens}"></section>`);
    }
    if (parts.some(p => p.analysis)) html.push(H.analysis().analysisNotes(anCtx));
    const body = document.querySelector('.bd-body');
    body.innerHTML = html.join('');
    for (const p of parts) {
      if (p.paper) paperMod.bindPaper(p.paper, ctx);
      if (p.analysis) H.analysis().bindAnalysis(anCtx);
      if (p.timemap) H.timemapRender();
    }
    if (lensPart) H.lensRender(lensPart.lens, () => my === token);
  } catch (e) {
    console.error(e);
    if (my === token) document.querySelector('.bd-body').innerHTML = `<div class="empty"><strong>${esc(tx(L('This chapter could not be loaded.', '这一章加载失败。')))}</strong></div>`;
  }
}
