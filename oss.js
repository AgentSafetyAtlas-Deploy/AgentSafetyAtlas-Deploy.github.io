// Open-source landscape view (loaded on demand by app.js). Inclusion spec of 2026-09-24: three groups counted
// separately, no star threshold, stars/forks as dated attention signals only, never summed into an "influence" score.
const GROUP_KEYS = ['agent_security', 'ecosystem', 'resources'];
const TYPE_KEYS = {agent_security: ['tool', 'evaluation', 'research_implementation', 'dataset'],
  ecosystem: ['framework_module', 'execution_environment', 'infrastructure'], resources: ['awesome_list', 'bibliography', 'guide_course']};
const LOG_TICKS = [10, 100, 1000, 10000, 100000];
let oss = null, loading = null, bound = false, current = null;  // current: {ctx, list, g} of the last render, for chart switching
const COLS = ['repo', 'type', 'topics', 'stars', 'forks', 'change', 'act', 'why'];
const colWidths = () => { try { return JSON.parse(localStorage.getItem('atlas-oss-cols') || 'null'); } catch { return null; } };
const saveWidths = w => { try { w ? localStorage.setItem('atlas-oss-cols', JSON.stringify(w)) : localStorage.removeItem('atlas-oss-cols'); } catch { /* per-viewer convenience only */ } };

export async function loadOss() {
  if (oss) return oss;
  loading ??= fetch('./data/oss.json').then(r => { if (!r.ok) throw Error('oss'); return r.json(); }).then(j => (oss = j));
  return loading;
}

const fmt = (n, lang) => n == null ? '–' : Number(n).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
const compact = n => n >= 1e5 ? Math.round(n / 1e3) + 'k' : n >= 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
const day = s => (s || '').slice(0, 10);

function labels(t) {
  return {
    group: {agent_security: t('Agent security tools & research', 'Agent 安全工具与研究实现'), ecosystem: t('Related infrastructure & frameworks', '相关基础设施与框架'),
      resources: t('Resource lists & guides', '资料与资源清单')},
    type: {tool: t('Tool', '工具'), evaluation: t('Evaluation / benchmark', '评测'), research_implementation: t('Research implementation', '研究实现'),
      dataset: t('Dataset', '数据集'), framework_module: t('Framework module', '框架模块'), execution_environment: t('Execution environment', '隔离执行环境'),
      infrastructure: t('Infrastructure', '基础设施'), awesome_list: t('Awesome list', 'Awesome 清单'), bibliography: t('Reading list', '文献清单'),
      guide_course: t('Guide / course', '指南与课程')},
    offers: {code: t('Code', '代码'), experiment_scripts: t('Experiment scripts', '实验脚本'), dataset: t('Dataset', '数据集'), documentation: t('Documentation', '文档'),
      link_list: t('Link list', '链接清单'), product_material_only: t('Product material only', '仅产品资料')},
    provenance: {original_implementation: t('Original implementation', '原作者实现'), third_party_implementation: t('Third-party implementation', '第三方实现'),
      fork_or_mirror: t('Fork / mirror', '派生／镜像'), unclear: t('Provenance unclear', '来源待核实')},
    sort: {stars: t('Most starred', 'Most Starred · 按 Star'), forks: t('Most forked', 'Most Forked · 按 Fork'),
      change: t('Largest 30-day star gain', 'Largest 30-day Star Gain · 30 天净增'), pushed: t('Most recent push', '最近推送')},
  };
}

function filteredRepos(ctx) {
  const s = ctx.state, q = (s.ossQuery || '').trim().toLowerCase();
  return oss.repos.filter(r => r.group === (s.ossGroup || 'agent_security')
    && (!s.ossType || r.type === s.ossType) && (!s.ossTopic || r.topics.includes(s.ossTopic))
    && (s.ossTab !== 'research' || r.papers.length || ['evaluation', 'research_implementation'].includes(r.type))
    && (s.ossTab !== 'change' || r.starChange30d != null)
    && (!s.ossPaper || r.papers.length) && (!s.ossLicense || (s.ossLicense === 'specified' ? r.license : !r.license))
    && (!q || [r.repo, r.description, r.relation, r.module, ...r.topics].join(' ').toLowerCase().includes(q)));
}

function sorted(list, key) {
  const by = {stars: r => r.stars, forks: r => r.forks, change: r => r.starChange30d ?? -Infinity, pushed: r => Date.parse(r.pushedAt || 0)}[key || 'stars'];
  return list.slice().sort((a, b) => by(b) - by(a) || a.repo.localeCompare(b.repo));
}

// ---------- charts (plain SVG; hover/focus tooltip on every mark; values also in the table below) ----------
function scatter(ctx, list) {
  const {t, escape} = ctx, W = 720, H = 300, P = {l: 48, r: 16, t: 12, b: 34};
  const times = list.map(r => Date.parse(r.createdAt)).filter(Boolean);
  if (!times.length) return '';
  const t0 = new Date(Math.min(...times)).getFullYear(), t1 = new Date(Math.max(...times)).getFullYear() + 1;
  const x = d => P.l + (Date.parse(d) - Date.UTC(t0, 0, 1)) / (Date.UTC(t1, 0, 1) - Date.UTC(t0, 0, 1)) * (W - P.l - P.r);
  const ymax = Math.log10(Math.max(10, ...list.map(r => r.stars)) + 1), y = s => H - P.b - Math.log10(s + 1) / ymax * (H - P.t - P.b);
  const years = Array.from({length: t1 - t0 + 1}, (_, i) => t0 + i).filter((yr, i, a) => a.length < 9 || i % 2 === 0);
  const dots = list.map(r => `<g class="oss-dot" tabindex="0" data-oss-repo="${escape(r.repo)}" data-tip="${escape(`${r.repo}|${fmt(r.stars, ctx.state.lang)} ★ · ${t('created', '创建于')} ${day(r.createdAt)}`)}">`
    + `<circle class="hit" cx="${x(r.createdAt).toFixed(1)}" cy="${y(r.stars).toFixed(1)}" r="12"/><circle class="mark g-${r.group}" cx="${x(r.createdAt).toFixed(1)}" cy="${y(r.stars).toFixed(1)}" r="4"/></g>`).join('');
  return `<figure class="oss-chart"><figcaption><b>${t('Attention by repository age', '仓库关注度与创建时间')}</b><span>${t('Each dot is one repository in the current view; stars on a log scale.', '每个点是当前视图中的一个仓库；Star 为对数刻度。')}</span></figcaption>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(t('Stars against creation date for the repositories in view', '当前视图仓库的 Star 与创建时间'))}">
  ${LOG_TICKS.filter(v => Math.log10(v + 1) <= ymax).map(v => `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`).join('')}
  <line class="axis" x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}"/>
  ${years.map(yr => `<text class="tick" x="${x(new Date(Date.UTC(yr, 0, 1)).toISOString())}" y="${H - P.b + 18}" text-anchor="middle">${yr}</text>`).join('')}
  ${dots}</svg></figure>`;
}

function bars(ctx, title, note, rows, cls) {
  const {escape} = ctx, max = Math.max(1, ...rows.map(r => r[1]));
  if (!rows.length) return '';
  return `<figure class="oss-chart"><figcaption><b>${escape(title)}</b>${note ? `<span>${escape(note)}</span>` : ''}</figcaption>
  <div class="hbars" role="list">${rows.map(([name, n], i) => `<div class="hbar oss-bar" style="--i:${i}" role="listitem" tabindex="0" data-tip="${escape(`${name}|${n}`)}"><span class="lbl" title="${escape(name)}">${escape(name)}</span><span class="track"><span class="fill ${cls}" style="width:${Math.max(2, n / max * 100).toFixed(1)}%"></span></span><span class="val">${n}</span></div>`).join('')}</div></figure>`;
}

function heatmap(ctx, list, g) {
  const {t, escape, topicName} = ctx, L = labels(t), types = TYPE_KEYS[g].filter(ty => list.some(r => r.type === ty));
  const topics = [...new Set(list.flatMap(r => r.topics))];
  const count = (tp, ty) => list.filter(r => r.type === ty && r.topics.includes(tp)).length;
  const rows = topics.map(tp => [tp, types.map(ty => count(tp, ty))]).filter(([, c]) => c.some(Boolean)).sort((a, b) => b[1].reduce((s, v) => s + v) - a[1].reduce((s, v) => s + v));
  const title = t('Security topic × repository type', '安全主题 × 仓库类型');
  if (!rows.length) return `<figure class="oss-chart oss-heat g-${g}"><figcaption><b>${title}</b><span>${t('No security topics recorded for the current selection.', '当前选择下没有记录安全主题。')}</span></figcaption></figure>`;
  const max = Math.max(1, ...rows.flatMap(([, c]) => c)), step = n => n ? Math.min(6, 1 + Math.floor(n / max * 5.999)) : 0;
  return `<figure class="oss-chart oss-heat g-${g}"><figcaption><b>${title}</b><span>${t('Counts of repositories; a repository can carry several topics, so rows do not add up to the total.', '仓库数量；一个仓库可带多个主题，各行不能直接相加。')}</span></figcaption>
  <div class="heatwrap"><table><thead><tr><th></th>${types.map(ty => `<th>${escape(L.type[ty])}</th>`).join('')}</tr></thead><tbody>${rows.map(([tp, c], i) => `<tr style="--i:${i}"><th><i class="dot" style="--cat:${ctx.topicColor(tp)}"></i>${escape(topicName(tp))}</th>${c.map((n, i) => `<td class="s${step(n)}" tabindex="0" data-tip="${escape(`${topicName(tp)} · ${L.type[types[i]]}|${n}`)}">${n || ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></figure>`;
}

const EVIDENCE_NOTE = {
  verbatim_elided: t => t('quote shortened with “…”; each part matches the source', '引文以“…”省略，各部分均与原文一致'),
  nearest_sentence: t => t('closest source sentence to the reviewer’s paraphrase', '与审核摘述最接近的原文句子'),
};

function starHistory(ctx) {
  const {t, escape} = ctx, h = oss.starHistory || {}, series = (h.series || []).filter(s => s.points?.length > 1);
  if (!series.length) return `<figure class="oss-chart oss-history-empty"><figcaption><b>${t('Star trend', 'Star 趋势')}</b><span>${t('Insufficient history.', '历史不足。')}</span></figcaption>
  <p>${t(`Trends are drawn only from this platform’s own daily snapshots, not reconstructed. Snapshots began ${h.firstSnapshot || '—'} (${h.snapshotDays || 0} so far); 30-day star change is shown from ${h.changeAvailableFrom || '—'}.`, `趋势只使用本平台每日快照绘制，不做重建。快照始于 ${h.firstSnapshot || '—'}（目前 ${h.snapshotDays || 0} 天）；30 天 Star 净增自 ${h.changeAvailableFrom || '—'} 起显示。`)}</p></figure>`;
  const pick = series.find(s => s.full_name === ctx.state.ossHist) || series[0], W = 720, H = 260, P = {l: 52, r: 110, t: 12, b: 30};
  const all = series.flatMap(s => s.points), t0 = Math.min(...all.map(p => Date.parse(p[0]))), t1 = Math.max(...all.map(p => Date.parse(p[0])));
  const ymax = Math.max(...pick.points.map(p => p[1])) * 1.08, x = d => P.l + (Date.parse(d) - t0) / (t1 - t0 || 1) * (W - P.l - P.r), y = v => H - P.b - v / ymax * (H - P.t - P.b);
  const path = s => s.points.filter(p => p[1] <= ymax).map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  const ticks = [0, .25, .5, .75, 1].map(f => Math.round(ymax * f / 10) * 10);
  const last = pick.points[pick.points.length - 1];
  return `<figure class="oss-chart"><figcaption><b>${t('Stars in daily snapshots', '每日快照中的 Star 数')}</b><span>${t(`Most-starred agent-security repositories; one point per daily snapshot since ${h.firstSnapshot}.`, `Star 数最多的 Agent 安全仓库；自 ${h.firstSnapshot} 起每日快照一个点。`)}</span></figcaption>
  <label class="oss-select">${t('Highlight', '突出显示')} <select data-oss-hist>${series.map(s => `<option value="${escape(s.full_name)}" ${s === pick ? 'selected' : ''}>${escape(s.full_name)}</option>`).join('')}</select></label>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(t('Stars in daily snapshots', '每日快照中的 Star 数'))}">
  ${ticks.map(v => `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`).join('')}
  ${series.filter(s => s !== pick).map(s => `<path class="line ctx" d="${path(s)}"/>`).join('')}
  <path class="line emph" d="${path(pick)}"/>
  ${pick.points.map(p => `<g class="oss-dot" tabindex="0" data-tip="${escape(`${pick.full_name}|${fmt(p[1], ctx.state.lang)} ★ · ${p[0]}`)}"><circle class="hit" cx="${x(p[0])}" cy="${y(p[1])}" r="10"/><circle class="mark emph-dot" cx="${x(p[0])}" cy="${y(p[1])}" r="4"/></g>`).join('')}
  <text class="end" x="${x(last[0]) + 8}" y="${y(last[1]) + 4}">${escape(compact(last[1]))} ★</text>
  <line class="axis" x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}"/>
  ${[t0, (t0 + t1) / 2, t1].map(v => `<text class="tick" x="${x(new Date(v).toISOString())}" y="${H - 8}" text-anchor="middle">${new Date(v).toISOString().slice(0, 7)}</text>`).join('')}
  </svg><div class="oss-legend"><span><i class="ln emph"></i>${escape(pick.full_name)}</span><span><i class="ln ctx"></i>${t('Other top repositories', '其他高关注仓库')}</span></div></figure>`;
}

function coverage(ctx) {
  const {t, escape} = ctx, rows = (oss.awesomeCoverage || []).slice(0, 12);
  if (!rows.length) return '';
  const segs = [['included', t('In the Atlas', '已收录'), 's1'], ['excluded_after_screening', t('Screened out', '筛选后排除'), 's2'],
    ['boundary', t('Boundary', '边界待定'), 's3'], ['not_collected', t('Not in our candidates', '未进入候选'), 's4']];
  return `<figure class="oss-chart oss-cov"><figcaption><b>${t('Awesome-list papers against the Atlas', 'Awesome 清单论文与本平台对照')}</b><span>${t('arXiv papers cited by each curated list: how many the Atlas includes, screened out, holds as boundary, or never collected — a recall check on our corpus.', '各清单引用的 arXiv 论文中：本平台已收录、筛选后排除、边界待定、未进入候选的数量——用于检验论文库的召回。')}</span></figcaption>
  ${rows.map(r => `<div class="cov-row"><a href="https://github.com/${escape(r.list)}" target="_blank" rel="noopener noreferrer">${escape(r.list)}</a><div class="cov-bar">${segs.map(([k, name, c]) => r[k] ? `<span class="${c}" style="flex:${r[k]}" tabindex="0" data-tip="${escape(`${name}|${r[k]} / ${r.papers}`)}"></span>` : '').join('')}</div><span class="cov-n">${Math.round(r.included / r.papers * 100)}%</span></div>`).join('')}
  <div class="oss-legend">${segs.map(([, name, c]) => `<span><i class="sw ${c}"></i>${escape(name)}</span>`).join('')}</div></figure>`;
}

// ---------- page ----------
export function renderOss(ctx) {
  const {t, escape, state} = ctx, L = labels(t);
  const q0 = (state.ossQuery || '').trim().toLowerCase();
  if (q0.includes('/')) { const hit = oss.repos.find(r => r.repo.toLowerCase() === q0); if (hit && hit.group !== (state.ossGroup || 'agent_security')) state.ossGroup = hit.group; }
  const g = state.ossGroup || 'agent_security', list = sorted(filteredRepos(ctx), state.ossSort), rows = ctx.paged(list);
  const counts = oss.meta.counts || {}, groupRepos = oss.repos.filter(r => r.group === g);
  const orgs = new Set(groupRepos.filter(r => r.ownerType === 'Organization').map(r => r.owner.toLowerCase()));
  const withPaper = groupRepos.filter(r => r.papers.length).length;
  const typeRows = TYPE_KEYS[g].map(ty => [L.type[ty], list.filter(r => r.type === ty).length]).filter(r => r[1]);
  const orgRows = Object.entries(list.filter(r => r.ownerType === 'Organization').reduce((m, r) => (m[r.owner] = (m[r.owner] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const personal = list.filter(r => r.ownerType !== 'Organization').length;
  const tabs = [['attention', t('Public attention', '公开关注度')], ['change', t('Recent change', '近期变化')], ['research', t('Research & evaluation', '研究与评测实现')]];
  current = {ctx, list, g};
  const all = GROUP_KEYS.reduce((a, k) => a + (counts[k] || 0), 0) || 1;
  return `<div class="metrics oss-kpis">${GROUP_KEYS.map(k => `<button class="metric ${g === k ? 'is-on' : ''}" data-oss-group="${k}" aria-pressed="${g === k}"><span>${escape(L.group[k])}</span><strong data-count="${counts[k] || 0}">${fmt(counts[k] || 0, state.lang)}</strong><i class="kpi-bar" aria-hidden="true"><b style="width:${((counts[k] || 0) / all * 100).toFixed(1)}%"></b></i><small>${t(`${((counts[k] || 0) / all * 100).toFixed(0)}% of listed repositories`, `占已收录仓库的 ${((counts[k] || 0) / all * 100).toFixed(0)}%`)}</small></button>`).join('')}
  <div class="metric"><span>${t('Maintaining organizations', '维护组织')}</span><strong>${fmt(orgs.size, state.lang)}</strong><small>${t(`${ctx.num(withPaper)} repositories in this group linked to Atlas papers`, `本组 ${ctx.num(withPaper)} 个仓库关联本平台论文`)}</small></div></div>
  <nav class="oss-tabs" aria-label="${t('Browse', '浏览方式')}">${tabs.map(([k, name]) => `<button data-oss-tab="${k}" class="${(state.ossTab || 'attention') === k ? 'active' : ''}" aria-pressed="${(state.ossTab || 'attention') === k}">${escape(name)}</button>`).join('')}</nav>
  ${state.ossTab === 'change' && !list.length ? `<div class="hint">${t(`30-day change needs two stored snapshots 30 days apart. Snapshots began ${oss.starHistory?.firstSnapshot || '—'}; until then this view is empty rather than estimated.`, `30 天净增需要相隔 30 天的两次快照。快照自 ${oss.starHistory?.firstSnapshot || '—'} 开始保存；在此之前本视图保持为空，不做估算。`)}</div>` : ''}
  <form class="toolbar oss-filters" role="search">
    <input type="search" data-oss-q value="${escape(state.ossQuery || '')}" placeholder="${escape(t('Search repositories, descriptions, modules…', '搜索仓库、描述、模块…'))}" aria-label="${escape(t('Search repositories', '搜索仓库'))}">
    <select data-oss-type aria-label="${escape(t('Type', '类型'))}">${ctx.option('', t('All types', '全部类型'), state.ossType || '')}${TYPE_KEYS[g].map(ty => ctx.option(ty, L.type[ty], state.ossType || '')).join('')}</select>
    <select data-oss-topic aria-label="${escape(t('Security topic', '安全主题'))}">${ctx.option('', t('All security topics', '全部安全主题'), state.ossTopic || '')}${[...new Set(groupRepos.flatMap(r => r.topics))].sort().map(tp => ctx.option(tp, ctx.topicName(tp), state.ossTopic || '')).join('')}</select>
    <select data-oss-license aria-label="${escape(t('License', '许可证'))}">${ctx.option('', t('Any license status', '全部许可证状态'), state.ossLicense || '')}${ctx.option('specified', t('License specified', '已声明许可证'), state.ossLicense || '')}${ctx.option('unspecified', t('License not specified', '许可证未明确'), state.ossLicense || '')}</select>
    <select data-oss-sort aria-label="${escape(t('Sort', '排序'))}">${Object.entries(L.sort).map(([k, name]) => ctx.option(k, name, state.ossSort || 'stars')).join('')}</select>
    <label class="check"><input type="checkbox" data-oss-paper ${state.ossPaper ? 'checked' : ''}>${t('Linked to Atlas papers', '关联本平台论文')}</label>
  </form>
  ${chartWindow(ctx, list, g)}
  <section class="panel results" id="results"><div class="panel-title"><strong>${escape(L.group[g])}</strong><span class="muted" role="status">${fmt(list.length, state.lang)} ${t('repositories', '个仓库')}</span><span class="panel-tools">${colWidths() ? `<button class="textlink" data-cols-reset>${t('Reset column widths', '恢复默认列宽')}</button>` : ''}<a class="textlink" href="./data/oss.json" download>${t('Download data', '下载数据')} ↓</a></span></div>
  ${list.length ? ctx.pager(list.length, 'top') + table(ctx, rows, list.some(r => r.starChange30d != null)) + ctx.pager(list.length, 'bottom') : `<div class="empty"><strong>${t('No matching repositories', '暂无匹配仓库')}</strong></div>`}</section>
  ${criteria(ctx)}
  <div class="oss-tip" role="tooltip" hidden></div>`;
}

const CHARTS = t => [
  ['heat', t('Security topic × type', '安全主题 × 类型'), t('where the selection concentrates', '当前选择集中在哪些主题')],
  ['orgs', t('Maintaining organizations', '维护组织'), t('organization accounts with the most repositories', '仓库最多的组织账号')],
  ['age', t('Attention by repository age', '关注度与创建时间'), t('stars against creation date', 'Star 与创建时间')],
  ['recall', t('Awesome lists vs the Atlas', 'Awesome 清单对照'), t('recall check on the paper corpus', '论文库召回检验')],
  ['types', t('Repository types', '仓库类型'), t('tools, evaluations, implementations…', '工具、评测、研究实现…')],
  ['trend', t('Star trend', 'Star 趋势'), t('daily snapshots, whole landscape', '每日快照，全景')],
];

function chartBody(ctx, list, g, key) {
  const {t} = ctx, L = labels(t);
  const typeRows = TYPE_KEYS[g].map(ty => [L.type[ty], list.filter(r => r.type === ty).length]).filter(r => r[1]);
  const orgRows = Object.entries(list.filter(r => r.ownerType === 'Organization').reduce((m, r) => (m[r.owner] = (m[r.owner] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const personal = list.filter(r => r.ownerType !== 'Organization').length;
  const empty = title => `<figure class="oss-chart"><figcaption><b>${title}</b><span>${t('Nothing to show for the current selection.', '当前选择下没有可显示的内容。')}</span></figcaption></figure>`;
  const chart = {
    heat: () => heatmap(ctx, list, g),
    types: () => bars(ctx, t('Repository types', '仓库类型'), '', typeRows, 'g-' + g) || empty(t('Repository types', '仓库类型')),
    orgs: () => bars(ctx, t('Maintaining organizations', '维护组织'), t(`Top organization accounts; ${ctx.num(personal)} repositories in the selection are kept by personal accounts, which are not listed.`, `排名靠前的组织账号；当前选择中另有 ${ctx.num(personal)} 个仓库由个人账号维护，不单独列出。`), orgRows, 'g-' + g) || empty(t('Maintaining organizations', '维护组织')),
    age: () => scatter(ctx, list) || empty(t('Attention by repository age', '关注度与创建时间')),
    trend: () => starHistory(ctx),
    recall: () => coverage(ctx) || empty(t('Awesome lists vs the Atlas', 'Awesome 清单对照')),
  }[key] || (() => heatmap(ctx, list, g));
  return chart();
}

function chartWindow(ctx, list, g) {
  const {t, escape, state} = ctx, L = labels(t), key = state.ossChart || 'heat';
  return `<section class="chart-window" aria-label="${escape(t('Statistics', '统计'))}"><div class="section-note"><b>${escape(L.group[g])}</b> · ${t(`statistics for the current selection (${ctx.num(list.length)} repositories); “Awesome lists vs the Atlas” and “Star trend” cover the whole landscape`, `当前选择的统计（${ctx.num(list.length)} 个仓库）；“Awesome 清单对照”与“Star 趋势”覆盖全景`)}</div>
  <div class="chart-shell"><nav class="chart-menu" aria-label="${escape(t('Charts', '图表'))}">${CHARTS(t).map(([k, name, note]) => `<button data-oss-chart="${k}" class="${k === key ? 'active' : ''}" aria-pressed="${k === key}"><b>${escape(name)}</b><small>${escape(note)}</small></button>`).join('')}</nav>
  <div class="chart-view">${chartBody(ctx, list, g, key)}</div></div></section>`;
}

function criteria(ctx) {
  const {t, escape, state} = ctx, m = oss.meta, basis = m.inclusionBasis || {}, ps = ctx.pipeline?.openSource || {};
  const items = [
    [t('Scope', '范围'), t('The security and safety of AI agents themselves: tool/API, coding, browser and computer-use agents, MCP servers and clients, multi-agent systems.', 'AI 智能体自身的安全：工具/API 智能体、编程智能体、浏览器与计算机操作智能体、MCP 服务端与客户端、多智能体系统。')],
    [t('Three groups', '三个分组'), t('Agent security tools & research — tools, evaluations and benchmarks, research implementations, datasets. Related infrastructure & frameworks — only when the README documents a specific module used for agent security (for example sandboxed execution or permission control); its metrics describe the whole repository, not the module. Resource lists & guides — curated lists, reading lists and courses specifically about agent security.', 'Agent 安全工具与研究实现——工具、评测与基准、研究实现、数据集。相关基础设施与框架——仅当 README 写明某个用于 Agent 安全的具体模块（如隔离执行、权限控制）时收录；其指标描述整个仓库，而非该模块。资料与资源清单——专门关于 Agent 安全的清单、文献列表与课程。')],
    [t('Not included', '不收录'), t('Agents used for general cybersecurity work or to attack third-party systems; hallucination-only work; generic tools without an explicit agent-security link; robotics and embodied projects without a safety or security focus, and classical control without a learned agent; empty repositories. Safety and security of embodied, robotic, RL, driving and drone agents is in scope (policy v4). Studying how to attack the agent under test is in scope; using an agent to attack other systems is not.', '用智能体从事一般网络安全工作或攻击第三方系统；只涉及幻觉的工作；与 Agent 安全无明确关联的通用工具；不涉及安全的机器人与具身项目，以及不含学习型智能体的经典控制；空仓库。具身、机器人、强化学习、自动驾驶与无人机智能体的安全属于范围之内（范围政策 v4）。研究如何攻击被测智能体属于范围之内；用智能体攻击其他系统则不属于。')],
    [t('Evidence', '依据'), t('Every repository cites a passage from its description or README that is checked against the text; a model (DeepSeek) classifies, a stricter second check confirms infrastructure and lists, and passages that cannot be found in the text are held back.', '每个仓库都引用其描述或 README 中的一段原文，并与原文逐字核对；由模型（DeepSeek）分类，基础设施与清单另经更严格的二次核查；在原文中找不到的引文不予收录。')],
    [t('Paper code', '论文代码'), t(`A repository that an Atlas-included paper links as its own code or data is listed as a research implementation through that paper (${ctx.num(basis.paper_association || 0)} repositories), with the paper's sentence as evidence.`, `本平台纳入论文自己链接的代码或数据仓库，依据该论文作为研究实现收录（${ctx.num(basis.paper_association || 0)} 个），并以论文中的相应句子为依据。`)],
    [t('No star threshold', '不设 Star 门槛'), t('Stars and forks only order the review work; they are public GitHub signals, not a measure of quality, security effectiveness or adoption.', 'Star 与 Fork 只用于安排审核顺序；它们是 GitHub 的公开信号，不代表质量、安全有效性或实际采用。')],
    [t('License and metrics', '许可证与指标'), t('A missing license is shown as “not specified” and never treated as open source. Stars and forks come from dated daily snapshots; 30-day change is shown only when two snapshots 30 days apart exist.', '未声明许可证显示为“未明确”，不视为开源。Star 与 Fork 取自带日期的每日快照；只有存在相隔 30 天的两次快照时才显示 30 天净增。')],
    [t('Discovery', '发现途径'), t(`${ctx.num(ps.search_queries)} topic and keyword searches, ${ctx.num(ps.awesome_lists)} curated lists and paper links gave ${ctx.num(ps.candidates)} candidates; ${ctx.num(m.candidatesReviewed)} were reviewed and ${ctx.num(m.excluded)} excluded with a recorded reason.`, `${ctx.num(ps.search_queries)} 组主题与关键词检索、${ctx.num(ps.awesome_lists)} 个精选清单与论文链接，共得到 ${ctx.num(ps.candidates)} 个候选；其中 ${ctx.num(m.candidatesReviewed)} 个经过审核，${ctx.num(m.excluded)} 个因记录在案的理由被排除。`)],
  ];
  return `<section class="panel section oss-criteria"><h2>${t('How repositories are selected', '仓库收录标准')}</h2><dl>${items.map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`).join('')}</dl>
  <p class="muted oss-note">${escape(t(oss.meta.disclaimer, 'Star 和 Fork 为 GitHub 公开指标，不代表安全有效性、生产采用或本平台背书。'))} ${t(`Stars and forks from the daily snapshot of ${oss.meta.latestSnapshot || day(oss.meta.generatedAt)} (UTC).`, `Star 与 Fork 取自 ${oss.meta.latestSnapshot || day(oss.meta.generatedAt)}（UTC）的每日快照。`)} <a class="textlink" href="./data/oss-excluded.json" download>${t('Excluded list', '排除清单')} ↓</a></p></section>`;
}

function table(ctx, rows, withChange) {
  const {t, escape, state} = ctx, L = labels(t), cols = COLS.filter(c => c !== 'change' || withChange), w = colWidths();
  const head = {repo: t('Repository', '仓库'), type: t('Type', '类型'), topics: t('Security topics', '安全主题'), stars: 'Stars', forks: 'Forks', change: t('30-day', '30 天'), act: t('Activity', '活跃度'), why: t('Why included', '收录依据')};
  const sized = w && cols.every(c => w[c]);
  return `<div class="tablewrap"><table class="coverage oss-table${withChange ? ' with-change' : ''}${sized ? ' sized' : ''}"${sized ? ` style="width:${cols.reduce((s, c) => s + w[c], 0)}px"` : ''}><colgroup>${cols.map(c => `<col class="c-${c}"${sized ? ` style="width:${w[c]}px"` : ''}>`).join('')}</colgroup><thead><tr>${cols.map((c, i) => `<th class="${['stars', 'forks', 'change'].includes(c) ? 'num' : ''}" scope="col">${head[c]}${i < cols.length - 1 ? `<span class="col-resize" data-col-resize="${i}" role="separator" aria-orientation="vertical" aria-label="${escape(t('Drag to resize column', '拖动调整列宽'))}" title="${escape(t('Drag to resize; double-click to reset', '拖动调整列宽；双击恢复默认'))}"></span>` : ''}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(r => `<tr><td><button class="textlink repo-name" data-oss-repo="${escape(r.repo)}">${escape(r.repo).replace(/([/_.-])/g, '$1<wbr>')}</button>${r.fork ? ` <span class="tag">${t('fork', '派生')}</span>` : ''}${r.module ? `<small>${t('Module', '相关模块')}: ${escape(r.module)}</small>` : ''}</td>
  <td>${escape(L.type[r.type] || r.type || '')}</td><td class="topics">${r.topics.map((tp, i) => `<span class="tag topic-tag${i >= 3 ? ' more' : ''}" style="--cat:${ctx.topicColor(tp)}">${escape(ctx.topicName(tp))}</span>`).join('')}${r.topics.length > 3 ? `<button class="more-toggle" data-more="${r.topics.length - 3}" aria-expanded="false">+${r.topics.length - 3}</button>` : ''}</td>
  <td class="num">${fmt(r.stars, state.lang)}</td><td class="num">${fmt(r.forks, state.lang)}</td>${withChange ? `<td class="num">${r.starChange30d == null ? '–' : (r.starChange30d > 0 ? '+' : '') + fmt(r.starChange30d, state.lang)}</td>` : ''}
  <td>${escape(day(r.pushedAt))}${r.archived ? `<small>${t('Archived', '已归档')}</small>` : ''}${r.license ? '' : `<small>${t('No license', '无许可证')}</small>`}</td>
  <td class="why">${escape(r.relation || '')}${r.papers.length ? `<small>${t(`${r.papers.length} linked Atlas paper(s)`, `关联 ${r.papers.length} 篇本平台论文`)}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}

export function openRepo(ctx, name) {
  const {t, escape, external} = ctx, L = labels(t), r = oss.repos.find(x => x.repo === name);
  if (!r) return;
  const paper = id => ctx.data.papers.find(p => p.id === id);
  document.querySelector('#detail .detail').innerHTML = `<span class="overline">${escape(L.group[r.group])} · ${escape(L.type[r.type] || '')}</span><h2>${escape(r.repo)}</h2>
  <p class="authors">${escape(r.description || '')}</p>
  <h3>${t('Relation to agent security', '与 Agent 自身安全的关系')}</h3><p>${escape(r.relation || '')}</p>
  ${r.module ? `<p><strong>${t('Relevant module', '相关模块')}:</strong> ${escape(r.module)} <span class="muted">${t('(repository metrics cover the whole repository, not this module)', '（仓库指标覆盖整个仓库，并非该模块）')}</span></p>` : ''}
  <div class="evidence"><strong>${r.evidence.location === 'paper' ? t('From the linking paper', '来自链接该仓库的论文') : r.evidence.location === 'readme' ? 'README' : t('Repository description', '仓库描述')}</strong>${EVIDENCE_NOTE[r.evidence.check] ? ` · ${EVIDENCE_NOTE[r.evidence.check](t)}` : ''}${r.evidence.quote ? `<p>“${escape(r.evidence.quote)}”</p>` : r.evidence.location === 'paper' ? `<p class="muted">${t('The Atlas record of the paper lists this repository as its own code or data.', '该论文在本平台的记录中将此仓库列为其自有代码或数据。')}</p>` : `<p class="muted">${t('The supporting passage is in the repository’s original non-English text; open the repository to read it.', '支持依据位于仓库的非英文原文中，请打开仓库查看。')}</p>`}${external(r.url, t('Open repository', '打开仓库'))}</div>
  <h3>${t('What it publishes', '公开内容')}</h3><div class="tags">${r.offers.map(o => `<span class="tag">${escape(L.offers[o] || o)}</span>`).join('')}</div><p class="muted">${t('Content presence only; nothing was installed, run or verified.', '仅确认内容存在；未安装、运行或验证。')}</p>
  <h3>${t('Maintainer and provenance', '维护者与来源')}</h3><p>${escape(r.owner)} · ${r.ownerType === 'Organization' ? t('organization account', '组织账号') : t('personal account', '个人账号')} · ${escape(r.provenance === 'original_implementation' && r.type !== 'research_implementation' ? t('Original repository (not a fork)', '原始仓库（非派生）') : L.provenance[r.provenance] || r.provenance || '')}${r.parent ? ` · ${t('forked from', '派生自')} ${external('https://github.com/' + r.parent, r.parent)}` : ''}</p>${r.provenanceQuote ? `<p class="muted">“${escape(r.provenanceQuote)}”</p>` : ''}
  ${r.project ? `<p class="muted">${t('Same project (grouped by owner and name, heuristic):', '同一项目（按维护者与名称归组，启发式）：')} ${r.project.repositories.map(escape).join(' · ')}</p>` : ''}
  <h3>${t('Public metrics', '公开指标')}</h3><p>Stars ${fmt(r.stars, ctx.state.lang)} · Forks ${fmt(r.forks, ctx.state.lang)} · ${t('captured', '采集于')} ${escape(day(r.metricsCapturedAt))}</p>
  <p>${t('30-day star change', '30 天 Star 净增')}: ${r.starChange30d == null ? t('insufficient history', '历史不足') : fmt(r.starChange30d, ctx.state.lang)} · ${t('created', '创建')} ${escape(day(r.createdAt))} · ${t('last push', '最近推送')} ${escape(day(r.pushedAt))}${r.latestRelease ? ` · ${t('latest release', '最近发布')} ${escape(r.latestRelease)} (${escape(day(r.latestReleaseAt))})` : ''} · ${r.archived ? t('archived', '已归档') : t('not archived', '未归档')}</p>
  <p>${t('License', '许可证')}: ${r.license ? escape(r.license) : t('not specified — public access is not an open-source license', '未明确——公开可访问不等于开源许可')}</p>
  ${r.papers.length ? `<h3>${t('Linked Atlas papers', '关联的本平台论文')}</h3>${r.papers.map(l => { const p = paper(l.paper); return p ? `<div class="evidence"><button class="textlink" data-paper="${escape(p.id)}">${escape(p.title)}</button><small>${escape(l.relation === 'readme_cites_paper' ? t('README cites this paper', 'README 引用该论文') : t('the paper links this repository', '论文链接到该仓库'))}</small></div>` : ''; }).join('')}` : ''}
  ${r.awesomeLists.length ? `<p class="muted">${t('Listed in', '收录于清单')}: ${r.awesomeLists.slice(0, 6).map(escape).join(' · ')}</p>` : ''}
  <p class="muted">${t('Found via', '发现途径')}: ${r.foundVia.map(escape).join(', ')} · ${t('last checked', '最近核查')} ${escape(day(r.lastChecked))}${r.needsReview ? ` · ${t('flagged for review', '标记待核查')}` : ''}${r.missing.length ? ` · ${t('missing', '缺失')}: ${r.missing.map(escape).join(', ')}` : ''}</p>
  <p class="hint">${escape(t(oss.meta.disclaimer, 'Star 和 Fork 为 GitHub 公开指标，不代表安全有效性、生产采用或本平台背书。'))}</p>`;
  const dlg = document.getElementById('detail');
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

export function bindOss(ctx) {
  if (bound) return;
  bound = true;
  const root = document.getElementById('app');
  const rerender = () => { ctx.state.page = 1; ctx.writeHash(); ctx.render(); };
  root.addEventListener('click', e => {
    if (ctx.state.view !== 'oss') return;
    const more = e.target.closest('[data-more]');
    if (more) { const td = more.closest('td'), open = td.classList.toggle('open'); more.setAttribute('aria-expanded', open); more.textContent = open ? ctx.t('less', '收起') : '+' + more.dataset.more; return; }
    const ch = e.target.closest('[data-oss-chart]');
    if (ch && current) {
      const key = ch.dataset.ossChart; ctx.state.ossChart = key === 'heat' ? '' : key; ctx.writeHash();
      for (const b of document.querySelectorAll('[data-oss-chart]')) { const on = b.dataset.ossChart === key; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); }
      const view = document.querySelector('.chart-view');
      if (view) {
        const h0 = view.offsetHeight;
        view.style.height = h0 + 'px';
        view.innerHTML = chartBody(current.ctx, current.list, current.g, key);
        const h1 = view.scrollHeight;
        requestAnimationFrame(() => { view.style.height = h1 + 'px'; });
        const done = () => { view.style.height = ''; };
        view.addEventListener('transitionend', done, {once: true});
        setTimeout(done, 600);
      }
      return;
    }
    if (e.target.closest('[data-cols-reset]')) { saveWidths(null); ctx.render(); return; }
    const b = e.target.closest('[data-oss-group],[data-oss-tab],[data-oss-repo]');
    if (!b) return;
    if (b.dataset.ossGroup) { ctx.state.ossGroup = b.dataset.ossGroup; ctx.state.ossType = ''; ctx.state.ossTopic = ''; rerender(); }
    else if (b.dataset.ossTab) { ctx.state.ossTab = b.dataset.ossTab === 'attention' ? '' : b.dataset.ossTab; if (b.dataset.ossTab === 'change') ctx.state.ossSort = 'change'; rerender(); }
    else if (b.dataset.ossRepo) { e.preventDefault(); openRepo(ctx, b.dataset.ossRepo); }
  });
  root.addEventListener('change', e => {
    if (ctx.state.view !== 'oss') return;
    const el = e.target, map = {ossType: 'data-oss-type', ossTopic: 'data-oss-topic', ossLicense: 'data-oss-license', ossSort: 'data-oss-sort', ossHist: 'data-oss-hist'};
    for (const [key, attr] of Object.entries(map)) if (el.hasAttribute(attr)) { ctx.state[key] = el.value; key === 'ossHist' ? ctx.render() : rerender(); return; }
    if (el.hasAttribute('data-oss-paper')) { ctx.state.ossPaper = el.checked ? '1' : ''; rerender(); }
  });
  root.addEventListener('input', e => { if (ctx.state.view === 'oss' && e.target.hasAttribute('data-oss-q')) { ctx.state.ossQuery = e.target.value; ctx.state.page = 1; ctx.writeHash(); ctx.renderKeepFocus(); } });
  root.addEventListener('submit', e => { if (e.target.classList.contains('oss-filters')) e.preventDefault(); });
  // column resize: widths are measured once, then kept in pixels (table may scroll sideways); remembered in this browser only
  root.addEventListener('pointerdown', e => {
    const h = e.target.closest('[data-col-resize]');
    if (!h || ctx.state.view !== 'oss') return;
    e.preventDefault();
    const table = h.closest('table'), cols = [...table.querySelectorAll('col')], i = +h.dataset.colResize;
    const widths = cols.map(c => c.getBoundingClientRect().width || table.querySelectorAll('th')[cols.indexOf(c)].getBoundingClientRect().width);
    const x0 = e.clientX, w0 = widths[i];
    table.classList.add('sized');
    const apply = () => { cols.forEach((c, k) => { c.style.width = widths[k] + 'px'; }); table.style.width = widths.reduce((s, v) => s + v, 0) + 'px'; };
    apply();
    const move = ev => { widths[i] = Math.max(60, w0 + ev.clientX - x0); apply(); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      const names = COLS.filter(c => c !== 'change' || table.classList.contains('with-change')), saved = colWidths() || {};
      names.forEach((c, k) => { saved[c] = Math.round(widths[k]); }); saveWidths(saved); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  });
  root.addEventListener('dblclick', e => { if (e.target.closest('[data-col-resize]') && ctx.state.view === 'oss') { saveWidths(null); ctx.render(); } });
  const tip = () => document.querySelector('.oss-tip');
  const show = el => { const tp = tip(); if (!tp) return; const [head, val] = el.dataset.tip.split('|'); tp.replaceChildren(); const v = document.createElement('strong'); v.textContent = val; const h = document.createElement('span'); h.textContent = head; tp.append(v, h); tp.hidden = false; const r = el.getBoundingClientRect(); tp.style.left = `${Math.max(8, Math.min(window.innerWidth - tp.offsetWidth - 8, r.left + r.width / 2 - tp.offsetWidth / 2))}px`; tp.style.top = `${Math.max(8, r.top - tp.offsetHeight - 8)}px`; };
  root.addEventListener('pointerover', e => { const el = e.target.closest('[data-tip]'); if (el && ctx.state.view === 'oss') show(el); });
  root.addEventListener('pointerout', e => { if (e.target.closest('[data-tip]') && tip()) tip().hidden = true; });
  root.addEventListener('focusin', e => { const el = e.target.closest('[data-tip]'); if (el && ctx.state.view === 'oss') show(el); });
  root.addEventListener('focusout', () => { if (tip()) tip().hidden = true; });
}
