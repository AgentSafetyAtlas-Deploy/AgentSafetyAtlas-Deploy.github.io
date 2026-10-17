import {dateName,datesMarkup,filterMarkup,connectionsMarkup,bindExplorerTools,sourceConditionMarkup,readingPrompt,savedFilterSummary} from './research-explorer-tools-ui.js';
import {latestDate,importReadingRoute} from './research-explorer-evidence.js';
import {ROLES, READING_ROLES, seedIds, findSeeds, edgeKey, readLocalRoute, routeItem, exportReadingRoute, readingRouteMarkdown} from './research-explorer-model.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const STORAGE_KEY = 'atlas-reading-route-v1';
let savedItems, storageAvailable = true;
export const roleName = (role, t) => ({all:t('All relevant', '全部相关'), foundations:t('Starting reads', '起点与基础'), influential:t('Citation signal', '引用影响'), latest:t('Latest', '近期工作'), bridges:t('Cross-topic links', '跨专题连接'), tools:t('Benchmarks & tools', '基准与工具')})[role];
const readingName = (role, t) => ({background:t('Background', '背景'), method:t('Method', '方法'), evaluation:t('Evaluation', '评测'), limitations:t('Conditions & limitations', '条件与限制'), extension:t('Further reading', '延伸阅读'), resources:t('Resources', '实验资源')})[role];

export function localReadingItems(index) {
  if (!savedItems) {
    try {savedItems = readLocalRoute(index, JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));}
    catch {savedItems = []; storageAvailable = false;}
  }
  return savedItems;
}
function persist() {
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify({format: 'atlas-local-reading-route-v1', items: savedItems})); storageAvailable = true;}
  catch {storageAvailable = false;}
}
const download = (body, filename, type) => {
  const url = URL.createObjectURL(new Blob([body], {type})), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function reasonText(index, population, row, t) {
  const e = population.evidence(row), tr = value => t(value, index.locale[value] || value);
  if (population.role === 'foundations' && e.readings.length) return tr(e.readings[0].why);
  if (population.role === 'influential') return t('Ordered by recorded OpenAlex citations within these results; counts were observed on ', '按当前结果内的 OpenAlex 引用计数排列；观察日期 ') + row.citation?.observedOn;
  if (population.role === 'latest') return dateName(population.filters.dateBasis,t)+': '+latestDate(index,row,population.filters.dateBasis)?.date;
  if (population.role === 'bridges') return t('Recorded relations reach papers with other topic labels; inspect each connection below.', '已记录关系连接到带有其他专题标签的论文；可逐条核查连接。');
  if (population.role === 'tools') return row.form === 'benchmark' ? t('Recorded as a benchmark; inspect tasks, versions and conditions.', '登记为评测基准；请核查任务、版本和适用条件。') : t('A companion repository is recorded; execution has not been verified.', '记录了配套仓库；尚未验证运行结果。');
  if (e.seed) return t('Selected by you as a seed paper.', '你选定的种子论文。');
  if (e.terms.length) return t('Title/summary matches: ', '标题／摘要命中：') + e.terms.join(' · ');
  if (e.seedRelations.length) return t('A recorded citation or similarity relation connects this paper to your seeds.', '通过已记录的引用或相似关系连接到种子论文。');
  if (e.readings.length) return t('A sourced starting read from the topic guide: ', '来自专题导读的起点阅读：') + tr(e.readings[0].why);
  return population.topic ? t('Included under this topic: ', '本专题收录：') + tr(population.topic) : t('Included in the current Atlas research collection.', '纳入当前 Atlas 研究语料。');
}

export function paperActions(index, id, state, t) {
  const added = localReadingItems(index).some(item => item.paperId === id), seeded = seedIds(index, state.pathSeeds).includes(id);
  return `<div class="rx-paper-actions"><button data-rx-add="${esc(id)}" ${added ? 'disabled' : ''}>${added ? t('In reading route', '已加入阅读路线') : t('+ Reading route', '+ 阅读路线')}</button><button data-rx-seed="${esc(id)}" ${seeded ? 'disabled' : ''}>${seeded ? t('Seed paper', '种子论文') : t('+ Use as seed', '+ 作为种子')}</button><button data-rx-connect-a="${esc(id)}" aria-label="${esc(t('Set connection A: ','设为连接 A：')+index.papers.get(id).title)}">A</button><button data-rx-connect-b="${esc(id)}" aria-label="${esc(t('Set connection B: ','设为连接 B：')+index.papers.get(id).title)}">B</button></div>`;
}

export function renderExplorer(index, population, model, state, t, topicName, external) {
  const items = localReadingItems(index), view = ['map','papers','connect','route'].includes(state.pathView) ? state.pathView : 'map';
  const seedMatches = findSeeds(index, state.pathSeedQuery), total = population.rows.length;
  const pages = Math.max(1, Math.ceil(total / 20)), page = Math.min(pages, Math.max(1, parseInt(state.pathResultsPage, 10) || 1));
  const rows = population.rows.slice((page - 1) * 20, page * 20);
  const relationList = (row, edges) => edges.slice(0, 6).map(edge => {
    const other = index.byId.get(edge.source === row.id ? edge.target : edge.source);
    const label = edge.kind === 'citation' ? edge.source === row.id ? t('Cites →', '引用 →') : t('Cited by ←', '被引用 ←') : edge.kind === 'coupling' ? t('Shared references ↔', '共同参考文献 ↔') : t('Text related ↔', '文本关联 ↔');
    return `<button data-rp-edge="${esc(edgeKey(edge))}"><span>${label}</span> ${esc(other.paper.title)}</button>`;
  }).join('');
  const card = row => {
    const e = population.evidence(row), links = population.role === 'bridges' ? e.bridges : e.seedRelations;
    return `<article class="rx-result" data-rx-result="${esc(row.id)}"><div class="rx-result-meta"><span>${esc((population.role==='latest'?latestDate(index,row,population.filters.dateBasis)?.date:null) || row.date || row.year || t('Date unknown', '日期未知'))}</span><span>${esc(row.form || t('Form unknown', '类型未知'))}</span>${row.citation ? `<span>${row.citation.count.toLocaleString()} ${t('citations', '次引用')}</span>` : `<span>${t('Citations unknown', '引用数未知')}</span>`}</div><button class="rp-paper-title" data-paper="${esc(row.id)}">${esc(row.paper.title)}</button><p class="rx-reason">${esc(reasonText(index, population, row, t))}</p>${e.readings.length && population.role === 'foundations' ? `<small>${t('Topic-guide selection', '专题导读精选')} · ${external(e.readings[0].evidenceUrl || e.readings[0].url, t('Selection source', '精选依据'))}</small>` : ''}<div class="rx-topic-labels">${row.topics.map(topic => `<span>${esc(topicName(topic))}</span>`).join('') || `<span>${t('Topic unknown', '专题未知')}</span>`}</div>${links.length ? `<details class="rx-relations"><summary>${t('Inspect connections', '核查连接')} · ${links.length}</summary>${relationList(row, links)}</details>` : ''}<div class="rx-paper-links"><button data-rp-node="${esc(row.id)}">${t('Locate on map', '在图中定位')}</button>${external(row.paper.url, t('Original paper', '论文原文'))}</div>${sourceConditionMarkup(index,row,population.filters.condition,t,external)}${datesMarkup(index,row,t,external)}${paperActions(index, row.id, state, t)}</article>`;
  };
  const roleNotes = {
    all: t('Title/summary and topic matches, plus recorded neighbors of your seeds. These are discovery candidates; check methodological conditions in the source.', '标题／摘要与专题匹配，加上种子论文的已记录邻居。这里提供发现候选，方法条件仍需回查原文。'),
    foundations: t('Sourced starting and representative readings from the topic guides. These editorial selections are distinct from citation ranking.', '沿用有来源的专题起点与代表阅读；精选依据与引用排名分别展示。'),
    influential: t('Sorted by recorded OpenAlex citation count within this result set. Counts are neither topic-specific citations nor an independent quality assessment. Missing counts are excluded from this role only.', '按当前结果内已记录的 OpenAlex 引用数排序。计数是全局被引数；不代表本方向引用数或独立质量评估。缺少计数的论文只在此入口中暂不显示。'),
    latest: dateName(population.filters.dateBasis,t)+' · '+t('Sorted by the selected date basis through the corpus cutoff. Only day-precision observations qualify. Month/year-only, unknown and later observations remain inspectable under All relevant.', '按所选日期依据排序，截止于语料截止日；仅采用精确到日的记录。仅有月／年份、未知及晚于截止日的记录仍可在“全部相关”核查。'),
    bridges: t('Papers with recorded relations to other topic labels. A cross-topic link is a candidate to inspect; it does not establish transfer, inheritance or an unexplored opportunity.', '具有已记录跨专题关系的论文。跨专题连接提供待核查线索，尚不能证明迁移、继承或研究空白。'),
    tools: t('Recorded benchmark papers and papers with linked repositories. Inspect protocol, license, revision and applicability before use.', '已登记的评测基准论文，以及关联仓库的论文。使用前核查协议、许可、版本和适用条件。'),
  };
  const controls = `<section class="rx-controls" aria-labelledby="rx-heading"><div class="rp-section-heading"><div><span class="rp-step">02</span><h3 id="rx-heading">${t('Find papers. Build a reading route.', '找到论文，组织阅读路线。')}</h3></div><span class="rp-small">${index.db.meta.release} · ${t('Corpus cutoff', '语料截止')} ${index.db.meta.cutoff}</span></div><div class="rx-scope"><strong>${t('Scope', '范围')} · ${esc(population.topic ? topicName(population.topic) : t('Entire Atlas corpus', 'Atlas 全库'))}</strong>${population.topic ? `<button data-rx-all-topics>${t('Search all topics', '检索全部专题')}</button>` : ''}<span>${population.base.length.toLocaleString()} ${t('candidates', '篇候选')} / ${index.rows.length.toLocaleString()} ${t('collected works', '篇收录研究')}</span></div><details class="rx-seed-picker" ${state.pathSeedQuery ? 'open' : ''}><summary>${t('Start from a known paper', '从已知论文出发')} <span>${population.seeds.length ? `· ${population.seeds.length} / 5` : ''}</span></summary><form data-rx-seed-form><label for="rx-seed-query">${t('Search the Atlas by paper title, record ID or recorded URL', '按标题、记录 ID 或已记录网址查找 Atlas 论文')}</label><div><input id="rx-seed-query" maxlength="300" value="${esc(state.pathSeedQuery || '')}"><button type="submit">${t('Find paper', '查找论文')}</button></div></form>${state.pathSeedQuery ? `<div class="rx-seed-results">${seedMatches.map(row => `<button data-rx-seed="${esc(row.id)}" ${population.seeds.includes(row.id) ? 'disabled' : ''}>${esc(row.paper.title)} <span>＋</span></button>`).join('') || `<p>${t('No recorded title or identity matched. Try a shorter title.', '尚未匹配到已记录标题或身份信息，可试试更短的标题。')}</p>`}</div>` : ''}</details>${population.seeds.length ? `<div class="rx-seeds">${population.seeds.map(id => `<button data-rx-remove-seed="${esc(id)}" aria-label="${esc(t('Remove seed: ', '移除种子：') + index.papers.get(id).title)}">${esc(index.papers.get(id).title)} <span>×</span></button>`).join('')}</div><p class="rp-small">${t('Seeds and their recorded one-hop neighbors join the text matches. Topic and role filters still apply; removing a seed restores the earlier scope.', '种子及其已记录的一跳邻居加入文本匹配结果，专题和角色筛选继续生效；移除种子即可撤回该次扩展。')}</p>` : ''}${population.query ? `<details class="rx-query-terms"><summary>${t('Inspect search terms', '查看检索理解')}</summary><p>${esc(population.query)}</p><div class="rp-term-chips">${population.expandedTerms.map(term => `<span>${esc(term)}</span>`).join('')}</div><p class="rp-small">${t('Edit the question above to change these terms. Digital/physical cues affect text ranking; they do not exclude a setting from this result set.', '可修改上方问题来调整词项。数字／物理场景线索影响文本排序，此结果集不据此排除其他场景。')}</p></details>` : ''}${filterMarkup(index,population,state,t)}<div class="rx-roles" role="group" aria-label="${t('Paper discovery role', '论文发现角色')}">${ROLES.map(role => `<button data-rx-role="${role}" aria-pressed="${population.role === role}">${roleName(role, t)} <small>${population.counts[role]}</small></button>`).join('')}</div><p class="rx-role-note">${roleNotes[population.role]}</p><div class="rx-view-bar"><div role="group" aria-label="${t('Exploration view', '探索视图')}">${[['map',t('Map', '地图')],['papers',t('Papers', '论文列表')],['connect',t('Connections','论文连接')],['route',t('My reading route', '我的阅读路线')]].map(([id,label]) => `<button data-rx-view="${id}" aria-pressed="${view === id}">${label}${id === 'route' ? ` <small>${items.length}</small>` : ''}</button>`).join('')}</div><span data-rx-count data-total="${total}">${view === 'map' ? `${model.nodes.length} / ${total.toLocaleString()} ${t('matching papers shown', '篇匹配论文已显示')}` : `${total.toLocaleString()} ${t('matching papers', '篇匹配论文')}`}</span></div><div class="rx-sharing"><label class="rx-share-question"><input type="checkbox" data-rx-share-question ${state.pathShareQuestion?'checked':''}>${t('Include question & phrases','包含问题与短语')}</label><button data-rp-share>${t('Copy view link','复制视图链接')} ↗</button></div><p class="rx-message" id="rx-message" role="status">${esc(state.pathExplorerMessage || '')}</p></section>`;
  const papers = `<section class="rx-results" aria-label="${t('Matching papers', '匹配论文')}">${rows.map(card).join('') || `<div class="rp-no-match"><h4>${t('No matches under these conditions.', '当前条件下没有匹配结果。')}</h4><p>${t('Change the question, topic or role; this result does not establish an absence of research.', '可调整问题、专题或角色；当前结果不能证明没有相关研究。')}</p></div>`}</section>${pages > 1 ? `<nav class="rx-pagination" aria-label="${t('Result pages', '结果分页')}"><button data-rx-page="${page-1}" ${page === 1 ? 'disabled' : ''}>${t('Previous', '上一页')}</button><span>${page} / ${pages} · ${total.toLocaleString()} ${t('papers', '篇论文')}</span><button data-rx-page="${page+1}" ${page === pages ? 'disabled' : ''}>${t('Next', '下一页')}</button></nav>` : ''}`;
  const route = `<section class="rx-reading" aria-labelledby="rx-reading-heading"><div class="rx-reading-head"><div><h3 id="rx-reading-heading">${t('Your reading order', '安排你的阅读顺序')}</h3><p>${t('Saved only in this browser. Each item keeps the question, scope and reason from when you added it.', '仅保存在本浏览器。每篇保留加入时的问题、范围和理由。')} ${items.filter(item => !population.ids.has(item.paperId)).length} ${t('saved papers are outside the current filters.', '篇已存论文在当前筛选范围之外。')}</p>${!storageAvailable ? `<p role="status">${t('Browser storage is unavailable. Keep this tab open and export your route to preserve it.', '浏览器存储不可用。请保持此页面打开，并导出路线以保存。')}</p>` : ''}</div><div class="rx-route-exports"><label class="rx-import-label">${t('Import JSON','导入 JSON')}<input type="file" accept="application/json,.json" data-rx-import></label><button data-rx-export="md" ${!items.length ? 'disabled' : ''}>Markdown ↓</button><button data-rx-export="json" ${!items.length ? 'disabled' : ''}>JSON ↓</button></div></div><ol>${items.map((item, i) => {const row = index.byId.get(item.paperId);return `<li class="rx-reading-item" data-rx-item="${esc(item.paperId)}"><div class="rx-order">${String(i+1).padStart(2,'0')}</div><div><button class="rp-paper-title" data-paper="${esc(item.paperId)}">${esc(row.paper.title)}</button><p class="rp-small">${esc(item.topic ? topicName(item.topic) : t('Entire Atlas corpus', 'Atlas 全库'))} · ${esc(item.release)} · ${esc(item.cutoff)}${population.ids.has(item.paperId) ? '' : ' · '+t('Outside current filters', '当前筛选外')}</p><label>${t('Reading role', '阅读角色')}<select data-rx-item-role="${esc(item.paperId)}">${READING_ROLES.map(role => `<option value="${role}" ${role===item.role ? 'selected' : ''}>${readingName(role,t)}</option>`).join('')}</select></label><p class="rx-reading-prompt" data-rx-prompt="${esc(item.paperId)}">${readingPrompt(item.role,t)}</p><label>${t('Why read it?', '为什么读这篇？')}<textarea data-rx-reason="${esc(item.paperId)}" maxlength="1200" rows="2">${esc(item.reason)}</textarea></label><details><summary>${t('Context when added', '加入时的研究问题')}</summary><p>${esc(item.query || t('Topic exploration', '专题探索'))}</p>${item.filters?`<p class="rp-small">${t('Saved filter conditions','加入时的筛选条件')}：${esc(savedFilterSummary(item.filters,t))}</p>`:''}</details><div class="rx-reorder"><button data-rx-up="${esc(item.paperId)}" ${i===0 ? 'disabled' : ''} aria-label="${esc(t('Move up: ', '上移：')+row.paper.title)}">↑ ${t('Up', '上移')}</button><button data-rx-down="${esc(item.paperId)}" ${i===items.length-1 ? 'disabled' : ''} aria-label="${esc(t('Move down: ', '下移：')+row.paper.title)}">↓ ${t('Down', '下移')}</button><button data-rx-remove="${esc(item.paperId)}">${t('Remove', '移除')}</button>${external(row.paper.url,t('Original paper', '论文原文'))}</div></div></li>`;}).join('')}</ol>${!items.length ? `<div class="rp-desk-empty"><p>${t('Add papers from the list, map inspector or topic readings, then arrange their order here.', '从论文列表、地图详情或专题阅读中加入论文，再在这里安排顺序。')}</p><button data-rx-view="papers">${t('Browse matching papers', '浏览匹配论文')} →</button></div>` : ''}</section>`;
  return {controls, body: view === 'papers' ? papers : view === 'route' ? route : view==='connect' ? connectionsMarkup(index,population,state,t,external) : '', view};
}

export function bindExplorer(root, index, population, state, t, render) {
  bindExplorerTools(root,index,population,state,t,render,path=>{
    const items=localReadingItems(index);let added=0;
    for(const id of path.ids)if(items.length<100&&!items.some(item=>item.paperId===id)){
      items.push(routeItem(index,population,id,t('Added from a recorded connection. Inspect each hop; choose the learning order after reading.','从已记录的论文连接加入。请核查每一跳，并在阅读后安排学习顺序。')));added++;
    }
    persist();render({pathExplorerMessage:added+' '+t('papers added; existing notes preserved.','篇已加入；已有笔记保留。')+(items.length===100?' '+t('Route limit: 100 papers.','路线最多 100 篇。'):'')});
  });
  root.querySelector('[data-rx-import]')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {
      if(file.size>5*1024*1024)throw Error('File exceeds 5 MB');
      const result=importReadingRoute(index,JSON.parse(await file.text()),localReadingItems(index));
      savedItems=readLocalRoute(index,{format:'atlas-local-reading-route-v1',items:result.items});persist();
      render({pathExplorerMessage:`${result.added} ${t('added','篇已加入')} · ${result.duplicates} ${t('duplicates kept unchanged','篇重复且保留原笔记')} · ${result.unknown} ${t('unknown IDs skipped','个未知 ID 已跳过')} · ${result.overflow} ${t('over limit','篇超过容量')}`});
    }catch {render({pathExplorerMessage:t('Import failed. Choose an Atlas reading-route JSON export under 5 MB. Your current route is preserved.','导入失败。请选择小于 5 MB 的 Atlas 阅读路线 JSON 导出文件。当前路线已保留。')});}
  });
  root.querySelector('[data-rx-seed-form]')?.addEventListener('submit', event => {
    event.preventDefault(); render({pathSeedQuery: root.querySelector('#rx-seed-query').value.trim()}, '#rx-seed-query');
  });
  root.addEventListener('change', event => {
    const el = event.target, id = el.dataset.rxReason || el.dataset.rxItemRole;
    if (!id) return;
    const item = localReadingItems(index).find(item => item.paperId === id); if (!item) return;
    if (el.dataset.rxReason) item.reason = el.value.slice(0,1200);
    else if (READING_ROLES.includes(el.value)) {item.role = el.value; const prompt=root.querySelector('[data-rx-prompt="'+id+'"]');if(prompt)prompt.textContent=readingPrompt(item.role,t);}
    persist();
    const status = root.querySelector('#rx-message');
    status.textContent = storageAvailable ? t('Reading route saved in this browser.', '阅读路线已保存在本浏览器。') : t('Storage unavailable; export to save your changes.', '存储不可用，请导出以保存修改。');
  });
  root.addEventListener('click', event => {
    const b = event.target.closest('[data-rx-view],[data-rx-role],[data-rx-page],[data-rx-all-topics],[data-rx-seed],[data-rx-remove-seed],[data-rx-add],[data-rx-remove],[data-rx-up],[data-rx-down],[data-rx-export]');
    if (!b || b.disabled) return;
    const d = b.dataset, items = localReadingItems(index);
    if (d.rxView) render({pathView:d.rxView}, '[data-rx-view="'+d.rxView+'"]');
    else if (d.rxRole) render({pathRole:d.rxRole, pathResultsPage:1, pathEdge:''}, '[data-rx-role="'+d.rxRole+'"]');
    else if (d.rxPage) {render({pathResultsPage:d.rxPage}); requestAnimationFrame(() => document.querySelector('.rx-controls')?.scrollIntoView({block:'start'}));}
    else if ('rxAllTopics' in d) render({pathRoute:'', pathResultsPage:1, pathEdge:''});
    else if (d.rxSeed) {
      const ids = seedIds(index, state.pathSeeds);
      if (ids.length >= 5) {render({pathExplorerMessage:t('You can use up to five seed papers. Remove one to add another.', '最多使用五篇种子论文，可先移除一篇。')}); return;}
      if (index.byId.has(d.rxSeed) && !ids.includes(d.rxSeed)) render({pathSeeds:[...ids,d.rxSeed].join(','), pathSeedQuery:'', pathResultsPage:1, pathExplorerMessage:''});
    } else if (d.rxRemoveSeed) render({pathSeeds:seedIds(index,state.pathSeeds).filter(id => id!==d.rxRemoveSeed).join(','), pathResultsPage:1, pathExplorerMessage:''});
    else if (d.rxExport) {
      const pack = exportReadingRoute(index, items, population), markdown = d.rxExport==='md';
      download(markdown ? readingRouteMarkdown(pack,state.lang) : JSON.stringify(pack,null,2), 'atlas-my-reading-route.'+(markdown?'md':'json'), markdown?'text/markdown;charset=utf-8':'application/json');
    } else {
      if (d.rxAdd) {
        if (items.length >= 100) {render({pathExplorerMessage:t('The route holds up to 100 papers. Export it or remove an item to continue.', '阅读路线最多保留 100 篇。可先导出或移除一项。')}); return;}
        const row = index.byId.get(d.rxAdd);
        if (row && !items.some(item=>item.paperId===row.id)) items.push(routeItem(index,population,row.id,reasonText(index,population,row,t)));
      } else if (d.rxRemove) savedItems = items.filter(item=>item.paperId!==d.rxRemove);
      else {
        const id = d.rxUp || d.rxDown, i = items.findIndex(item=>item.paperId===id), j = i+(d.rxUp?-1:1);
        if (i>=0 && j>=0 && j<items.length) [items[i],items[j]]=[items[j],items[i]];
      }
      persist();
      const focus = d.rxUp || d.rxDown;
      render({pathExplorerMessage: storageAvailable ? t('Reading route saved in this browser.', '阅读路线已保存在本浏览器。') : t('Storage unavailable; export your route to preserve it.', '存储不可用，请导出路线以保存。')}, focus ? '[data-rx-item="'+focus+'"] .rp-paper-title' : '');
    }
  });
}
