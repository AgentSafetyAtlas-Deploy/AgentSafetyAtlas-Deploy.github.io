import {opportunityData, opportunityPreview, renderOpportunities, opportunityEvidence, selectedResearchNotes} from './opportunities.js';
import {computeInsights, rankEntities, rankRepositories, weightsFor, DIMENSIONS, PRESETS} from './insights-model.js';
import {idsFlag} from './flags.js';

let dataset, loading, cached, cacheKey;
export async function loadInsights() {
  if (!loading) loading = fetch('./data/insights.json').then(r => {
    if (!r.ok) throw Error('Insights data unavailable');
    return r.json();
  }).then(d => dataset = d).catch(e => {loading = null; throw e;});
  return loading;
}
const tabs = {
  overview:['Discover','发现'], opportunities:['Research opportunities','研究机会'], topics:['Topic radar','主题雷达'], researchers:['Researchers','研究者'],
  institutions:['Institutions','机构'], gaps:['Research gaps','研究缺口'], repositories:['Open source','开源项目']
};
const labels = {
  volume:['Research volume','研究积累'], momentum:['Momentum','增长动能'], breadth:['Topic breadth','主题广度'],
  continuity:['Continuity','持续产出'], code:['Code coverage','代码覆盖'], publication:['Publication evidence','发表证据']
};
const quadLabels = {
  hot:['Active & gaining share','活跃且份额上升'], emerging:['Smaller & gaining share','小规模且份额上升'],
  established:['Active & losing share','活跃但份额未升'], niche:['Smaller & losing share','小规模且份额未升'],
  small:['Small sample','小样本']
};
const palette = ['#256652','#b78139','#7c659b','#51799a','#b75f59','#789044'];
const fmt = n => Number(n).toLocaleString('en-US', {maximumFractionDigits:1});
const pc = (a,b) => b ? Math.round(100*a/b) + '%' : '—';
const signed = v => (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
const attr = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function model(s) {
  if (!dataset.topics.includes(s.insightTopic)) s.insightTopic='';
  const key = [s.insightAsOf,s.insightMonths,s.insightTopic].join('|');
  if (!cached || key !== cacheKey) {cached = computeInsights(dataset, {asOf:s.insightAsOf, months:s.insightMonths, topic:s.insightTopic}); cacheKey = key;}
  return cached;
}
function button(id, text, cls='') {return '<button class="' + cls + '" data-insight-action="' + attr(id) + '">' + text + '</button>';}
function select(key, items, value, label) {
  return '<label>' + label + '<select data-insight-setting="' + key + '">' + items.map(([v,n]) =>
    '<option value="' + attr(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + attr(n) + '</option>').join('') + '</select></label>';
}
function heading(kicker, title, sub='') {
  return '<div class="in-section-head"><div><span class="in-kicker">' + kicker + '</span><h2>' + title + '</h2>' +
    (sub ? '<p>' + sub + '</p>' : '') + '</div></div>';
}
// an institution's flag: the country of the first merged institution record that has a registry address
let instById = null;
const instFlag = (ctx, id) => {instById ??= new Map(dataset.institutions.map(x => [x.id, x.sourceIds])); return idsFlag(ctx.data?.teams, instById.get(id));};
function evidenceButton(kind, id, label, cls='in-text-button') {
  return '<button class="' + cls + '" data-insight-evidence="' + kind + '" data-insight-id="' + attr(id) + '">' + label + '</button>';
}
function blank(t) {return '<div class="in-empty">' + t('Not enough records for this selection. Try a longer window or another topic.','当前选择下证据不足。可以扩大时间窗口或切换主题。') + '</div>';}
function ranking(ctx, m, kind, compact=false) {
  const {t,state:s} = ctx, weights = weightsFor(s.insightPreset, s.insightWeights), preset = s.insightPreset || 'rising';
  const ranked = rankEntities(m[kind], weights, preset);
  const q = (s.insightQuery || '').toLowerCase();
  const rows = compact ? ranked.slice(0,5) : ranked.filter(x => x.name.toLowerCase().includes(q));
  const pages = Math.max(1,Math.ceil(rows.length / 15)), page = Math.min(pages,Math.max(1,+s.insightPage || 1));
  const presetNames = [['rising',t('Rising contributions','近期上升')],['established',t('Sustained contributions','持续贡献')],['artifacts',t('Open-source collaboration','开源合作')]];
  const warning = kind === 'researchers'
    ? t('Names are not fully disambiguated: namesakes may be merged and variants split. These are contribution signals, not career-stage or academic-quality rankings.','作者姓名尚未充分消歧：同名可能合并、异名可能拆分。这里衡量署名贡献信号，不能据此判断职业阶段或学术质量。')
    : t('Only institutions with a recorded ROR identity are ranked; aliases share one entry. Credit is split across the recorded ROR institutions of each work.','仅排名已有 ROR 身份的机构；同一 ROR 的不同署名合并。每篇论文在已记录的 ROR 机构间平分贡献。');
  return (compact ? '' :
    '<div class="in-rank-controls">' + select('insightPreset',presetNames,preset,t('Ranking lens','排名视角')) +
    '<label>' + t('Find a name','查找名称') + '<input data-insight-search type="search" value="' + attr(s.insightQuery || '') + '" placeholder="' +
    t('Search within this ranking','在当前榜单中搜索') + '"></label><span class="in-count">' + fmt(rows.length) + ' ' + t('eligible entries','个符合条件的条目') + '</span></div>' +
    '<p class="in-note">' + warning + '</p>' +
    '<details class="in-weights"><summary>' + t('Adjust the index · inspect all six weights','调整综合指数 · 查看六项权重') +
    ' <span>' + (s.insightWeights ? t('Custom','自定义') : presetNames.find(x=>x[0]===preset)?.[1]) + '</span></summary>' +
    '<p>' + t('Each component is a percentile in this filtered cohort. The index is their weighted mean; it is not an absolute score.','各项分数是当前筛选群体内的百分位，综合指数为加权平均，不是绝对分数。') + '</p><div class="in-weight-grid">' +
    DIMENSIONS.map((k,i) => '<label><span><i style="background:' + palette[i] + '"></i>' + t(...labels[k]) +
      '</span><input type="number" min="0" max="100" step="1" data-insight-weight="' + i + '" value="' + weights[i] + '" aria-label="' + t(...labels[k]) + '"></label>').join('') +
    '</div><div class="in-weight-actions">' + button('weights',t('Apply weights','应用权重'),'in-primary') + button('reset-weights',t('Reset','重置'),'in-text-button') +
    '<span id="in-weight-status" role="status"></span></div></details>') +
    (rows.length ? '<div class="in-table-scroll"><table class="in-ranking"><thead><tr><th>#</th><th>' + t('Contributor','贡献者') + '</th><th>' +
    t('Index','综合指数') + '</th><th>' + t('Previous → recent','前期 → 近期') + '</th>' + (compact ? '' : '<th>' + t('Evidence','证据') + '</th>') + '</tr></thead><tbody>' +
    (compact ? rows : rows.slice((page-1)*15,page*15)).map((r,i) => '<tr><td class="in-rank-no">' + (ranked.indexOf(r)+1) + '</td><td>' +
      evidenceButton(kind,r.id,(kind==='institutions'?instFlag(ctx,r.id):'')+attr(r.name),'in-name') + '<small>' + fmt(r.count) + ' ' + t('works','篇论文') + ' · ' + fmt(r.credit) + ' ' + t('fractional credit','份平分贡献') + '</small></td><td><b>' + r.score.toFixed(1) +
      '</b><div class="in-scorebar" aria-label="' + t('Weighted component contributions','各分项的加权贡献') + '">' +
      DIMENSIONS.map((k,j)=>'<i style="width:'+(r.components[k]*weights[j]/weights.reduce((a,b)=>a+b,0)).toFixed(2)+'%;background:'+palette[j]+'"></i>').join('') +
      '</div></td><td><span class="in-transition">' + r.previous + ' <span>→</span> <b>' + r.recent + '</b></span>' +
      '<small>' + (r.previous===0 ? t('No earlier-window record','前一窗口无记录') : t('linked works','关联论文数')) + '</small></td>' +
      (compact ? '' : '<td>' + evidenceButton(kind,r.id,t('Why this rank ↗','查看依据 ↗')) + '</td>') + '</tr>').join('') +
    '</tbody></table></div>' + (!compact ? pagination(page,pages,t) : '') : blank(t));
}
function pagination(page,pages,t) {
  return '<div class="in-pagination"><button data-insight-page="' + (page-1) + '"' + (page<=1?' disabled':'') + '>' + t('Previous','上一页') +
    '</button><span>' + page + ' / ' + pages + '</span><button data-insight-page="' + (page+1) + '"' + (page>=pages?' disabled':'') + '>' + t('Next','下一页') + '</button></div>';
}
function scatter(ctx,m) {
  const {t,topicName,topicColor} = ctx;
  const rows = m.topics.filter(x=>x.recent>=5).sort((a,b)=>b.recent-a.recent);
  if (!rows.length) return blank(t);
  const maxX = Math.log1p(Math.max(...rows.map(x=>x.recent))) * 1.08;
  const maxY = Math.max(.25,...rows.map(x=>Math.abs(Math.log2(1+x.momentum)))) * 1.2;
  const x = n => 65 + Math.log1p(n)/maxX*660, y = v => 217-Math.log2(1+v)/maxY*153;
  const mid = x(m.median);
  return '<div class="in-radar"><svg viewBox="0 0 790 440" role="group" aria-label="' + t('Topic activity and change in corpus share; numbered points open supporting evidence.','主题活跃度与收录份额变化；编号点可打开证据。') + '">' +
    '<rect x="65" y="44" width="' + (mid-65) + '" height="173" fill="#edf3e3"/><rect x="' + mid + '" y="44" width="' + (725-mid) + '" height="173" fill="#e3eee8"/>' +
    '<rect x="65" y="217" width="' + (mid-65) + '" height="173" fill="#f4f3ee"/><rect x="' + mid + '" y="217" width="' + (725-mid) + '" height="173" fill="#edf0f3"/>' +
    '<path d="M65 44V390H725 M65 217H725 M' + mid + ' 44V390" fill="none" stroke="#b4c4bd" stroke-dasharray="4 5"/>' +
    '<text x="78" y="64" class="in-quadrant">' + t('EMERGING','小规模 · 份额上升') + '</text><text x="711" y="64" text-anchor="end" class="in-quadrant">' + t('HOT & ACTIVE','高活跃 · 份额上升') + '</text>' +
    '<text x="78" y="377" class="in-quadrant">' + t('NICHE','小规模 · 份额未升') + '</text><text x="711" y="377" text-anchor="end" class="in-quadrant">' + t('ESTABLISHED ACTIVITY','高活跃 · 份额未升') + '</text>' +
    '<text x="58" y="221" text-anchor="end" class="in-axis">0%</text><text x="58" y="51" text-anchor="end" class="in-axis">' + signed(2**maxY-1) + '</text>' +
    '<text x="58" y="393" text-anchor="end" class="in-axis">' + signed(2**(-maxY)-1) + '</text>' +
    '<text x="65" y="410" class="in-axis">0</text><text x="' + mid + '" y="410" text-anchor="middle" class="in-axis">' + m.median + '</text>' +
    '<text x="725" y="410" text-anchor="end" class="in-axis">' + Math.round(Math.expm1(maxX)) + '</text>' +
    '<text x="65" y="22" class="in-axis">' + t('↑ Change in corpus share (log ratio)','↑ 收录份额变化（对数比）') + '</text>' +
    '<text x="725" y="436" text-anchor="end" class="in-axis">' + t('Recent works · log scale →','近期论文数 · 对数刻度 →') + '</text>' +
    rows.map((r,i) => '<g class="in-dot" role="button" tabindex="0" data-insight-evidence="topics" data-insight-id="' + attr(r.id) +
      '" aria-label="' + attr(topicName(r.id)) + ', ' + r.recent + ', ' + signed(r.momentum) + '"><title>' + attr(topicName(r.id)) + ': ' + r.previous + ' → ' + r.recent +
      '; ' + signed(r.momentum) + '</title><circle cx="' + x(r.recent).toFixed(1) + '" cy="' + y(r.momentum).toFixed(1) + '" r="13" fill="' +
      topicColor(r.id) + '"/><text x="' + x(r.recent).toFixed(1) + '" y="' + (y(r.momentum)+4).toFixed(1) + '">' + (i+1) + '</text></g>').join('') +
    '</svg></div><div class="in-radar-key">' + rows.map((r,i)=>evidenceButton('topics',r.id,'<span style="background:' + topicColor(r.id) + '">' +
      (i+1) + '</span>' + attr(topicName(r.id)))).join('') + '</div><p class="in-note">' +
    t('Dashed lines: median activity and unchanged share. At least 5 recent works per point. A topic can gain papers while losing share as the collection grows.','虚线分别是活跃度中位数与份额不变线。每个点至少有 5 篇近期论文；论文增加时，也可能因整体增长更快而份额下降。') + '</p>';
}
function topicTable(ctx,m,gaps=false) {
  const {t,topicName} = ctx;
  const rows = [...m.topics].filter(x=>!gaps||x.recent>=5).sort((a,b)=>gaps ? b.missing-a.missing : b.recent-a.recent);
  return rows.length ? '<div class="in-table-scroll"><table class="in-ranking"><thead><tr><th>' + t('Topic','主题') + '</th><th>' +
    t('Previous → recent','前期 → 近期') + '</th><th>' + (gaps ? t('Code linked','有代码链接') : t('Share change','份额变化')) + '</th><th>' +
    (gaps ? t('Benchmark-form works','基准类论文') : t('Crowding proxy','拥挤度代理指标')) + '</th><th>' +
    (gaps ? t('No recorded code','未记录代码') : t('Signal','信号')) + '</th></tr></thead><tbody>' +
    rows.map(r=>'<tr><td>' + evidenceButton('topics',r.id,attr(topicName(r.id)),'in-name') + '</td><td class="in-transition">' + r.previous + ' → <b>' +
      r.recent + '</b></td><td>' + (gaps ? r.codes + '/' + r.recent + ' · ' + pc(r.codes,r.recent) : signed(r.momentum)) +
      '</td><td>' + (gaps ? r.benchmarks : r.crowding===null ? '—' : r.crowding.toFixed(1)) + '</td><td>' +
      (gaps ? evidenceButton('gaps',r.id,r.missing + ' ' + t('works ↗','篇 ↗')) : '<span class="in-badge">' + t(...quadLabels[r.quadrant]) + '</span>') + '</td></tr>').join('') +
    '</tbody></table></div>' : blank(t);
}
function repoTable(ctx) {
  const {t,state:s,external} = ctx, sort=s.insightRepoSort || 'readiness', q=(s.insightQuery||'').toLowerCase();
  const all=rankRepositories(dataset,s.insightTopic,sort), rows=all.filter(r=>(r.name+' '+r.description).toLowerCase().includes(q));
  const pages=Math.max(1,Math.ceil(rows.length/15)),page=Math.min(pages,Math.max(1,+s.insightPage||1));
  return '<div class="in-callout"><b>' + t('Repository snapshot','仓库快照') + ' · ' + attr(dataset.meta.repositorySnapshot || '—') + '</b><p>' +
    t('Repository signals always use this snapshot; the paper cutoff and comparison window do not reconstruct past GitHub states. Documentation and scripts are recorded signals, not execution tests.','仓库指标始终使用此快照；论文截止日期和比较窗口不能还原过去的 GitHub 状态。文档与脚本是已记录信号，未经过运行复现。') + '</p></div>' +
    '<div class="in-rank-controls">' + select('insightRepoSort',[['readiness',t('Artifact readiness','开放资源完备度')],['stars',t('GitHub stars','GitHub stars')]],sort,t('Sort by','排序依据')) +
    '<label>' + t('Find a project','查找项目') + '<input type="search" data-insight-search value="' + attr(s.insightQuery||'') + '"></label><span class="in-count">' +
    fmt(rows.length) + ' ' + t('reviewed entries','项已通过筛选的记录') + '</span></div>' + (rows.length ?
    '<div class="in-table-scroll"><table class="in-ranking"><thead><tr><th>#</th><th>' + t('Repository','仓库') + '</th><th>' + t('Readiness / 100','完备度 / 100') +
    '</th><th>Stars</th><th>' + t('Evidence','证据') + '</th></tr></thead><tbody>' + rows.slice((page-1)*15,page*15).map(r=>'<tr><td>' + (all.indexOf(r)+1) +
    '</td><td>' + external(r.url,r.repo,'in-name') + '<small>' + attr(r.license||t('License unknown','许可证未知')) + ' · ' +
    (r.archived ? t('Archived','已归档') : Number.isFinite(r.age) ? Math.max(0,Math.floor(r.age)) + ' ' + t('days since push','天前推送') : t('Push date unknown','推送时间未知')) +
    '</small></td><td><b>' + r.score.toFixed(1) + '</b><div class="in-scorebar">' + Object.values(r.parts).map((v,i)=>'<i style="width:'+v+'%;background:'+palette[i]+'"></i>').join('') +
    '</div></td><td>' + fmt(r.stars||0) + '</td><td>' + evidenceButton('repositories',r.id,t('View signals ↗','查看信号 ↗')) + '</td></tr>').join('') +
    '</tbody></table></div>' + pagination(page,pages,t) : blank(t));
}
function overview(ctx,m) {
  const {t,topicName,state:s} = ctx;
  const rising = [...m.topics].filter(x=>x.recent>=5).sort((a,b)=>b.momentum-a.momentum)[0];
  const gap = [...m.topics].filter(x=>x.recent>=5).sort((a,b)=>b.missing-a.missing)[0];
  const weights=PRESETS.rising, inst=rankEntities(m.institutions,weights,'rising')[0], person=rankEntities(m.researchers,weights,'rising')[0];
  const cards = [
    rising && {kind:'topics',r:rising,label:t('Strongest share momentum','份额变化居前'),name:topicName(rising.id),value:signed(rising.momentum),
      note:t(rising.previous+' → '+rising.recent+' works; smoothed corpus-share change.',rising.previous+' → '+rising.recent+' 篇论文；经平滑处理的收录份额变化。')},
    inst && {kind:'institutions',r:inst,label:t('Institution to explore','值得关注的机构'),name:inst.name,value:inst.recent,
      note:t('recent works · ranks first with the Rising weights.','篇近期论文 · 按「近期上升」权重位列首位。')},
    person && {kind:'researchers',r:person,label:t('Researcher to explore','值得关注的作者署名'),name:person.name,value:person.recent,
      note:t('recent works · name identity still needs verification.','篇近期论文 · 作者身份仍需消歧核实。')},
    gap && {kind:'gaps',r:gap,label:t('Largest recorded code gap','记录中的最大代码缺口'),name:topicName(gap.id),value:gap.missing,
      note:t('recent works without a recorded code link; '+pc(gap.codes,gap.recent)+' link code.','篇近期论文未记录代码链接；代码覆盖率 '+pc(gap.codes,gap.recent)+'。')}
  ].filter(Boolean);
  return heading(t('SIGNALS TO FOLLOW','值得追踪的信号'),t('Start with a finding. Follow the evidence.','从发现出发，追溯每一条证据。')) +
    '<div class="in-findings">' + cards.map((c,i)=>'<button class="in-finding" data-insight-evidence="'+c.kind+'" data-insight-id="'+attr(c.r.id)+'"><span class="in-card-top"><span>0'+(i+1)+' / '+c.label+
      '</span><span>↗</span></span><h3>'+attr(c.name)+'</h3><strong>'+fmtValue(c.value)+'</strong><p>'+c.note+'</p><span class="in-card-link">'+t('Explore the evidence','查看证据')+' →</span></button>').join('') +
    '</div>'+opportunityPreview(ctx,dataset,m)+'<div class="in-overview-grid"><section class="in-panel">' + heading(t('THE FIELD IN MOTION','领域动向'),t('Where is attention moving?','研究关注正在向哪里移动？')) +
    scatter(ctx,m) + '</section><aside class="in-panel in-reading"><span class="in-kicker">'+t('READ THIS SNAPSHOT','理解当前快照')+'</span><h2>'+t('A starting point for your next question.','让数据引出下一步问题。')+'</h2>'+
    '<div><b>01</b><h3>'+t('Choose a research direction','选择研究方向')+'</h3><p>'+t('Compare activity with share growth, then inspect the papers behind an emerging topic.','同时看活跃度与份额增长，再检查新兴方向背后的具体研究。')+'</p>'+
    button('tab:topics',t('Explore topic radar →','探索主题雷达 →'),'in-text-button')+'</div><div><b>02</b><h3>'+t('Find people and groups','寻找研究者与机构')+'</h3><p>'+
    t('Change the ranking lens to emphasize sustained work, recent momentum or code availability.','切换排名视角，侧重持续贡献、近期增长或代码可用性。')+'</p>'+button('tab:institutions',t('Explore institutions →','探索机构 →'),'in-text-button')+
    '</div><div><b>03</b><h3>'+t('Investigate a gap','调查研究缺口')+'</h3><p>'+t('Check missing code links and benchmark-form work. Missing records are leads to investigate.','查看代码链接与基准类论文的覆盖，沿着缺失记录继续调查。')+'</p>'+
    button('tab:gaps',t('Explore research gaps →','探索研究缺口 →'),'in-text-button')+'</div></aside></div>'+
    '<div class="in-preview-grid">'+['researchers','institutions'].map(kind=>'<section class="in-panel">'+heading(t('CONTRIBUTION SIGNALS','贡献信号'),t(...tabs[kind]))+
      '<p class="in-note">'+(kind==='researchers'?t('Author-name contributions · identities still need disambiguation.','作者署名贡献 · 身份尚需消歧。'):t('Recorded ROR institutions · fractional paper credit.','已记录 ROR 机构 · 按论文平分贡献。'))+'</p>'+ranking({...ctx,state:{...s,insightPreset:'rising',insightWeights:''}},m,kind,true)+button('tab:'+kind,t('Explore full ranking →','查看完整榜单 →'),'in-text-button')+'</section>').join('')+'</div>';
}
function fmtValue(value) {return typeof value==='number'?fmt(value):attr(value);}
function methodology(ctx,m) {
  const {t} = ctx, ex=dataset.meta.excluded;
  const entries=[
    [t('Corpus and time','样本与时间'),t('Included, non-withdrawn works with exact first-recorded dates only. Equal calendar-month windows end at the selected cutoff. Older cutoffs recalculate today’s corpus; they are not archived rankings.','仅使用已纳入、未撤回且首次记录日期精确到日的研究。相邻窗口使用相同日历月数。历史截止日期基于当前收录回算，不是当时的归档榜单。')],
    [t('Topic momentum','主题增长动能'),t('Share ratio = ((recent + 5) / (all recent + 5T)) ÷ ((previous + 5) / (all previous + 5T)); T is the number of canonical topics. Display = (ratio − 1) × 100%. Multi-topic papers count in each topic.','份额比 = ((近期数 + 5) / (近期总数 + 5T)) ÷ ((前期数 + 5) / (前期总数 + 5T))；T 为标准主题数，显示值为 (比值 − 1) × 100%。多主题论文分别计入每个主题。')],
    [t('Crowding and gaps','拥挤度与缺口'),t('Crowding = 45% activity percentile + 20% author-name percentile + 20% ROR-institution percentile + 15% (1 − institution HHI). HHI uses fractional institutional credits. Unknown institutions contribute no diversity evidence. Gaps sort by recent works lacking recorded code, with at least 5 recent works; no importance or absence-of-research inference.','拥挤度 = 45% 活跃度百分位 + 20% 作者署名数百分位 + 20% ROR 机构数百分位 + 15% (1 − 机构 HHI)。HHI 按平分机构贡献计算；未知机构不增加多样性分数。缺口按近期未记录代码的论文数排序，至少需 5 篇近期论文；不推断重要性或研究不存在。')],
    [t('People and institutions','人物与机构'),t('At least 3 cumulative works; Rising also requires 3 recent works. Volume = log(1 + fractional credit). Momentum = max(0, log₂((recent credit + 1)/(previous credit + 1))) × log(1 + recent credit). Breadth counts topics. Continuity counts occupied one-year bins over the last 3 years. Code and verified-publication ratios use (count + 1)/(works + 2). Each component becomes a cohort percentile, then a weighted mean. Names use NFKC, whitespace and case normalization only.','至少有 3 篇累计论文；「近期上升」另需 3 篇近期论文。积累 = log(1 + 平分贡献)。动能 = max(0, log₂((近期贡献 + 1)/(前期贡献 + 1))) × log(1 + 近期贡献)。广度为主题数；持续性为过去三年中有产出的年度区间数。代码与已核实发表比例使用 (数量 + 1)/(论文数 + 2) 平滑。各项转为群体百分位后加权。姓名仅做 NFKC、空白与大小写归一化。')],
    [t('Repository readiness','开源资源完备度'),t('25 points for a push within 90 days (12.5 within 365), 15 for a release within 365 days, 15 each for a recorded license, documentation and experiment scripts, and up to 15 for 3 linked eligible papers. Archived projects get no maintenance or release points. Unknown signals earn 0; this is an evidence score, not a quality verdict. Stars are a separate sort; adoption and reproducibility are not measured.','90 天内推送计 25 分（365 天内计 12.5），365 天内发布版本计 15 分；许可证、文档、实验脚本各 15 分；关联 3 篇符合日期条件的论文最多计 15 分。归档项目不计维护与版本分；未知信号计 0，仅代表缺少证据。Stars 可单独排序；尚未衡量实际采用率或可复现性。')]
  ];
  return '<details class="in-method" id="in-method"><summary>'+t('Methods, coverage & limits','方法、覆盖与局限')+' <span>'+attr(dataset.meta.methodVersion)+'</span></summary>'+
    '<div class="in-method-meta"><b>'+fmt(dataset.meta.eligible)+' / '+fmt(dataset.meta.included)+' '+t('included works eligible for analysis','篇纳入论文可参与分析')+'</b><p>'+
    fmt(ex.impreciseDate||0)+' '+t('without exact dates','篇日期不精确')+' · '+fmt(ex.withdrawn||0)+' '+t('withdrawn','篇已撤回')+' · '+fmt(ex.afterCutoff||0)+' '+t('after cutoff','篇晚于截止日')+
    ' · '+pc(dataset.meta.withRegistryInstitution,dataset.meta.eligible)+' '+t('with a recorded ROR institution','有已记录 ROR 机构')+'</p></div>'+
    '<div class="in-method-grid">'+entries.map(([h,p])=>'<section><h3>'+h+'</h3><p>'+p+'</p></section>').join('')+'</div><p class="in-note">'+
    t('The collection is incomplete and collection practices change. Scores and weights are exploratory design choices, not validated measures of research quality. No historical rank changes or benchmark adoption are inferred. Every build refreshes these inputs from the Atlas.','收录并不完整，采集方式也会变化。分数与权重属于探索性设计，未经研究质量评估验证。不推断历史排名变动或基准采用率。每次网站构建会从图谱刷新这些输入。')+
    '</p><a class="in-text-button" href="./data/insights.json" download>'+t('Download source inputs','下载计算输入')+' ↗</a></details>';
}
export function renderInsights(ctx) {
  const {t,state:s,topicName} = ctx, m=model(s), tab=tabs[s.insightTab]?s.insightTab:'overview';
  const preset=PRESETS[s.insightPreset]?s.insightPreset:'rising';s.insightPreset=preset;
  const filteredTopic=dataset.topics.includes(s.insightTopic)?s.insightTopic:'';
  const controls='<div class="in-controls">'+select('insightMonths',[[3,t('3 months','3 个月')],[6,t('6 months','6 个月')],[12,t('12 months','12 个月')]],m.months,t('Comparison window','比较窗口'))+
    '<label>'+t('Paper cutoff','论文截止日期')+'<input type="date" data-insight-setting="insightAsOf" max="'+dataset.meta.cutoff+'" value="'+m.asOf+'"></label>'+
    select('insightTopic',[['',t('All safety topics','全部安全主题')],...dataset.topics.map(x=>[x,topicName(x)])],filteredTopic,t('Research interest','关注主题'))+
    '<div class="in-actions">'+button('share',t('Copy view link','复制视图链接'),'in-text-button')+button('export',t('Export snapshot ↗','导出快照 ↗'),'in-primary')+'</div></div>';
  let body;
  if(tab==='overview') body=overview(ctx,m);
  else if(tab==='opportunities') body=renderOpportunities(ctx,dataset,m);
  else if(tab==='topics') body='<section class="in-panel">'+heading(t('ACTIVITY × MOMENTUM','活跃度 × 增长动能'),t('Find the direction of change.','找到研究变化的方向。'))+
    (filteredTopic?'<p class="in-note">'+t('Clear the topic filter to compare across the whole collection.','清除主题筛选，可比较整个收录集中的相对变化。')+'</p>':'')+scatter(ctx,m)+topicTable(ctx,m)+'</section>';
  else if(['researchers','institutions'].includes(tab)) body='<section class="in-panel">'+heading(t('EXPLAINABLE INDICES','可解释的综合指数'),t(...tabs[tab]),t('Explore the score, adjust its weights, and read the work behind it.','检查分项、调整权重，阅读排名背后的研究。'))+ranking(ctx,m,tab)+'</section>';
  else if(tab==='gaps') body='<section class="in-panel">'+heading(t('QUESTIONS WORTH INVESTIGATING','值得进一步调查的问题'),t('Where is the recorded infrastructure thin?','哪些方向的基础设施记录仍然薄弱？'),
    t('Recent paper-level coverage. A missing link is a collection gap to verify; benchmark-form counts do not measure adoption or benchmark quality.','按近期论文统计覆盖。未记录的链接是待核查的收录缺口；基准类论文数量不能衡量采用率或基准质量。'))+topicTable(ctx,m,true)+'</section>';
  else body='<section class="in-panel">'+heading(t('BEYOND POPULARITY','热度之外'),t('Inspect the evidence of a usable artifact.','检查开放资源的可用性证据。'))+repoTable(ctx)+'</section>';
  return '<div class="insights"><section class="in-hero"><div><span class="in-kicker">AGENT SAFETY / RESEARCH OBSERVATORY</span><h1>'+t('From records to research signals.','从数据，看见研究动向。')+
    '</h1><p>'+t('Discover emerging directions, follow contributors and investigate gaps. Every finding leads back to the work.','发现新兴方向，追踪研究贡献，调查潜在缺口。每条发现，都能回到原始研究。')+
    '</p><div class="in-hero-meta"><span class="in-live"></span>'+attr(dataset.meta.release)+' · '+t('Paper data through','论文数据截至')+' '+dataset.meta.cutoff+
    ' <span> / </span>'+t('Recomputed with each Atlas build','随图谱构建自动重算')+'</div></div><div class="in-hero-stats"><div><strong>'+fmt(m.recent.length)+'</strong><span>'+
    t('works in this window','篇窗口内研究')+'</span></div><div><strong>'+fmt(m.previous.length)+'</strong><span>'+t('in the previous window','篇前一窗口研究')+'</span></div><div><strong>'+
    pc(m.recent.filter(p=>p.code).length,m.recent.length)+'</strong><span>'+t('link their own code','记录有配套代码')+'</span></div></div></section>'+controls+
    '<div class="in-window"><span>'+t('Recent','近期')+': '+m.bounds.start+' — '+m.asOf+' <span class="in-window-sep">/</span> '+t('Previous','前期')+': '+m.bounds.previous+' ≤ '+t('date','日期')+' < '+m.bounds.start+
    '</span><span id="in-status" role="status"></span></div><nav class="in-tabs" aria-label="'+t('Insight sections','洞察栏目')+'">'+Object.entries(tabs).map(([id,text])=>
    '<button data-insight-tab="'+id+'" aria-current="'+(tab===id?'page':'false')+'">'+t(...text)+'</button>').join('')+'</nav>'+body+
    methodology(ctx,m)+'<dialog class="in-evidence" id="insight-evidence" aria-labelledby="in-evidence-title"></dialog></div>';
}

export function bindInsights(ctx) {
  const {state:s,t,openPaper} = ctx, root=document.querySelector('.insights'),m=model(s);
  const rerender=(focus) => {
    const y=window.scrollY;
    ctx.render();
    requestAnimationFrame(()=>{window.scrollTo(0,y);if(focus) document.querySelector(focus)?.focus();});
  };
  function update(key,value) {
    s[key]=value;s.insightPage='';
    if(key==='insightPreset')s.insightWeights='';
    if(key==='insightTab')s.insightQuery='';
    ctx.writeHash();rerender();
  }
  let dialogKind,dialogRow,dialogPage=1;
  function showEvidence(kind,id,page=1) {
    let row,papers,extra='',evidenceNote='';
    if(kind.startsWith('opportunity')) {
      const evidence=opportunityEvidence(ctx,dataset,m,kind,id);if(!evidence)return;
      ({row,papers,extra}=evidence);evidenceNote=evidence.note;
    } else if(kind==='topics'||kind==='gaps') {
      row=m.topics.find(r=>r.id===id);if(!row)return;
      papers=row.papers.filter(p=>p.date>=m.bounds.previous&&(kind!=='gaps'||(p.date>=m.bounds.start&&!p.code)));
      extra='<div class="in-evidence-stats"><span><b>'+row.previous+' → '+row.recent+'</b>'+t('previous → recent works','前期 → 近期论文')+'</span><span><b>'+signed(row.momentum)+'</b>'+
        t('smoothed share change','平滑后的份额变化')+'</span><span><b>'+row.codes+'/'+row.recent+'</b>'+t('recent works with code','近期有代码的论文')+'</span></div><p class="in-note">'+
        row.institutionCoverage+'/'+row.recent+' '+t('recent works have a recorded ROR institution.','篇近期论文记录有 ROR 机构。')+' '+t('Institution HHI','机构 HHI')+': '+
        (row.hhi===null?'—':row.hhi.toFixed(3))+'. '+t('Counts reflect this collection, not field completeness.','数量反映当前收录，不代表领域全貌。')+'</p>';
      row={...row,name:ctx.topicName(row.id)};
    } else if(kind==='repositories') {
      row=rankRepositories(dataset,s.insightTopic).find(r=>r.id===id);if(!row)return;
      papers=dataset.papers.filter(p=>row.papers.includes(p.id));
      const names=[t('Maintenance / 25','维护 / 25'),t('Release / 15','版本 / 15'),t('License / 15','许可证 / 15'),t('Documentation / 15','文档 / 15'),t('Experiment scripts / 15','实验脚本 / 15'),t('Paper linkage / 15','论文关联 / 15')];
      extra='<p>'+attr(row.description)+'</p>'+ctx.external(row.url,t('Open repository','打开仓库'),'in-text-button')+'<p class="in-note">'+t('Metrics captured','指标采集时间')+': '+attr(row.metricsCapturedAt||'—')+
        ' · '+t('Last push','最近推送')+': '+attr(row.pushedAt||'—')+'</p>'+breakdown(Object.values(row.parts),names,ctx,25);
    } else {
      const inOverview=!tabs[s.insightTab]||s.insightTab==='overview';
      const w=inOverview?PRESETS.rising:weightsFor(s.insightPreset,s.insightWeights);
      row=rankEntities(m[kind],w,inOverview?'rising':s.insightPreset||'rising').find(r=>r.id===id);if(!row)return;
      papers=row.papers;
      extra='<div class="in-evidence-stats"><span><b>'+row.score.toFixed(1)+'</b>'+t('composite index','综合指数')+'</span><span><b>'+row.previous+' → '+row.recent+'</b>'+
        t('previous → recent works','前期 → 近期论文')+'</span><span><b>'+row.credit.toFixed(1)+'</b>'+t('fractional contribution','平分贡献')+'</span></div>'+
        '<p class="in-note">'+t('Recent / previous fractional credit','近期 / 前期平分贡献')+': '+row.recentCredit.toFixed(2)+' / '+row.previousCredit.toFixed(2)+'. '+
        (kind==='researchers'?t('Author-name identity is not fully disambiguated.','作者署名尚未充分消歧。'):t('Institutions are merged by ROR identity.','机构按 ROR 身份合并。'))+'</p>'+
        breakdown(DIMENSIONS.map(k=>row.components[k]),DIMENSIONS.map((k,i)=>t(...labels[k])+' · '+w[i]+'/'+w.reduce((a,b)=>a+b,0)),ctx);
    }
    dialogKind=kind;dialogRow=id;dialogPage=page;
    papers=[...papers].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
    const pages=Math.max(1,Math.ceil(papers.length/12));page=Math.min(pages,Math.max(1,page));
    const d=root.querySelector('#insight-evidence');
    d.innerHTML='<div class="in-evidence-head"><span class="in-kicker">'+t('FINDING → SIGNAL → EVIDENCE','发现 → 指标 → 证据')+'</span><button data-insight-close aria-label="'+
      t('Close evidence','关闭证据')+'">×</button></div><h2 id="in-evidence-title">'+attr(row.name)+'</h2>'+extra+'<h3>'+fmt(papers.length)+' '+t('supporting works','篇支撑研究')+'</h3><p class="in-note">'+
      (evidenceNote || (kind==='gaps'?t('Recent works without a recorded code link.','近期未记录代码链接的论文。'):kind==='topics'?t('Works in the recent and previous windows.','近期及前期窗口内的论文。'):
        kind==='repositories'?t('Linked eligible papers from the repository snapshot, independent of the selected paper cutoff.','仓库快照关联的符合条件论文，不受所选论文截止日期影响。'):t('Cumulative works through the selected cutoff.','截至所选日期的累计论文。')))+
      '</p><div class="in-evidence-papers">'+papers.slice((page-1)*12,page*12).map(p=>'<button data-insight-paper="'+attr(p.id)+'"><span>'+p.date+
      '</span><b>'+attr(p.title)+'</b><span>↗</span></button>').join('')+'</div><div class="in-pagination"><button data-insight-evidence-page="'+(page-1)+'"'+(page===1?' disabled':'')+'>'+
      t('Previous','上一页')+'</button><span>'+page+' / '+pages+'</span><button data-insight-evidence-page="'+(page+1)+'"'+(page===pages?' disabled':'')+'>'+t('Next','下一页')+'</button></div>';
    if(!d.open)d.showModal();
    else d.scrollTop=0;
  }
  root.addEventListener('change',e=>{
    const key=e.target.dataset.insightSetting;
    if(key) {
      if(key==='insightAsOf' && (!e.target.checkValidity()||!e.target.value)){e.target.reportValidity();return;}
      update(key,e.target.value);
    }
  });
  root.addEventListener('input',e=>{
    if(!e.target.matches('[data-insight-search]'))return;
    s.insightQuery=e.target.value;s.insightPage='';ctx.writeHash();
    const start=e.target.selectionStart;
    rerender('[data-insight-search]');
    requestAnimationFrame(()=>document.querySelector('[data-insight-search]')?.setSelectionRange(start,start));
  });
  root.addEventListener('keydown',e=>{
    if(['Enter',' '].includes(e.key)&&e.target.matches('.in-dot')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  });
  root.addEventListener('click',async e=>{
    const el=e.target.closest('button,[data-insight-evidence]');if(!el||el.disabled)return;
    const d=el.dataset;
    if(d.insightLens){update('insightOpportunity',d.insightLens);return;}
    if(d.insightTab){update('insightTab',d.insightTab);return;}
    if(d.insightEvidence){showEvidence(d.insightEvidence,d.insightId);return;}
    if(d.insightPage){s.insightPage=d.insightPage;ctx.writeHash();rerender();return;}
    if(d.insightEvidencePage){showEvidence(dialogKind,dialogRow,+d.insightEvidencePage);return;}
    if(el.hasAttribute('data-insight-close')){root.querySelector('#insight-evidence').close();return;}
    if(d.insightPaper){root.querySelector('#insight-evidence').close();openPaper(d.insightPaper);return;}
    const action=d.insightAction;if(!action)return;
    if(action.startsWith('tab:')){update('insightTab',action.slice(4));return;}
    if(action==='weights'){
      const w=[...root.querySelectorAll('[data-insight-weight]')].map(x=>+x.value);
      if(w.some(x=>!Number.isFinite(x)||x<0||x>100)||!w.some(x=>x>0)){
        root.querySelector('#in-weight-status').textContent=t('Use weights from 0 to 100, with at least one above zero.','权重须在 0–100 之间，且至少一项大于 0。');return;
      }
      update('insightWeights',w.join(','));return;
    }
    if(action==='reset-weights'){update('insightWeights','');return;}
    if(action==='share'){
      ctx.writeHash();
      try{await navigator.clipboard.writeText(location.href);root.querySelector('#in-status').textContent=t('View link copied.','视图链接已复制。');}
      catch{root.querySelector('#in-status').textContent=t('Copy the current URL from your address bar.','请从地址栏复制当前视图链接。');}
    }
    if(action==='export'){
      const w=weightsFor(s.insightPreset,s.insightWeights), trim=r=>({...r,papers:r.papers.map(p=>typeof p==='string'?p:p.id)});
      const snapshot={meta:dataset.meta,exportedAt:new Date().toISOString(),view:location.hash,
        opportunities:opportunityData(dataset,m),researchNotes:selectedResearchNotes(ctx,m),
        selection:{opportunityLens:s.insightOpportunity||'potential',asOf:m.asOf,months:m.months,topic:s.insightTopic||null,preset:s.insightPreset,weights:w},windows:m.bounds,
        topics:m.topics.map(trim),researchers:rankEntities(m.researchers,w,s.insightPreset).map(trim),
        institutions:rankEntities(m.institutions,w,s.insightPreset).map(trim),
        repositories:rankRepositories(dataset,s.insightTopic,s.insightRepoSort),paperIds:m.papers.map(p=>p.id)};
      const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='atlas-insights-'+m.asOf+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      root.querySelector('#in-status').textContent=t('Snapshot exported with weights and evidence IDs.','已导出含权重和证据 ID 的快照。');
    }
  });
  root.querySelector('#insight-evidence').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
}
function breakdown(values,names,ctx,max=100) {
  return '<div class="in-breakdown">'+values.map((v,i)=>'<div><span>'+attr(names[i])+'</span><div><i style="width:'+Math.min(100,v/max*100)+'%;background:'+palette[i]+'"></i></div><b>'+v.toFixed(1)+'</b></div>').join('')+'</div>';
}
