import {explorerFilters,matchesExplorerFilters,conditionState,latestDate,dateFacts} from './research-explorer-evidence.js';
/* Shared paper population for map/list views. All evidence comes from the frozen Atlas. */
export const EXPLORER_VERSION = 'research-explorer-v2';
export const ROLES = ['all', 'foundations', 'influential', 'latest', 'bridges', 'tools'];
export const READING_ROLES = ['background', 'method', 'evaluation', 'limitations', 'extension', 'resources'];
const unique = values => [...new Set(values)];
const norm = value => String(value || '').normalize('NFKC').toLowerCase().trim();
export const edgeKey = edge => [edge.kind, edge.source, edge.target].join('|');

export function seedIds(index, value) {
  return unique(String(value || '').split(',')).filter(id => index.byId.has(id)).slice(0, 5);
}

export function findSeeds(index, query) {
  const q = norm(query).slice(0, 300);
  if (!q) return [];
  const words = q.split(/\s+/);
  return index.rows.map(row => {
    const title = norm(row.paper.title);
    const identities = [row.id, row.paper.url, row.paper.preprintUrl].map(norm);
    const score = identities.includes(q) || title === q ? 3 : title.includes(q) ? 2 : words.every(w => title.includes(w)) ? 1 : 0;
    return {row, score};
  }).filter(x => x.score).sort((a, b) => b.score - a.score || a.row.id.localeCompare(b.row.id)).slice(0, 8).map(x => x.row);
}

export function explorePapers(index, discovery, state) {
  const seeds = seedIds(index, state.pathSeeds), seedSet = new Set(seeds);
  const topic = index.routes.get(state.pathRoute)?.topic || '';
  const role = ROLES.includes(state.pathRole) ? state.pathRole : 'all';
  const neighbors = new Map(), links = new Map(), readings = new Map();
  for (const edge of index.db.edges) {
    for (const [id, other] of [[edge.source, edge.target], [edge.target, edge.source]]) {
      if (!links.has(id)) links.set(id, []);
      links.get(id).push(edge);
      if (seedSet.has(other)) {
        if (!neighbors.has(id)) neighbors.set(id, []);
        neighbors.get(id).push(edge);
      }
    }
  }
  for (const route of index.db.routes.filter(r => !topic || r.topic === topic)) {
    for (const reading of route.readings) {
      if (!index.byId.has(reading.paperId)) continue;
      if (!readings.has(reading.paperId)) readings.set(reading.paperId, []);
      readings.get(reading.paperId).push({...reading, topic: route.topic, route: route.slug});
    }
  }
  const constrained = !!discovery.query || seeds.length > 0;
  const candidates = index.rows.filter(row => (!topic || row.topics.includes(topic)) &&
    (!constrained || discovery.paperScores.has(row.id) || seedSet.has(row.id) || neighbors.has(row.id)));
  const filters = explorerFilters(state);
  const metadataMatches = candidates.filter(row=>matchesExplorerFilters(index,row,filters,true));
  const conditionCounts = Object.fromEntries(['supported','contradicted','unknown','conflict'].map(name=>[name,metadataMatches.filter(row=>conditionState(index,row.id,filters.condition)===name).length]));
  const base = metadataMatches.filter(row=>!filters.condition||conditionState(index,row.id,filters.condition)==='supported');
  const crossLinks = row => (links.get(row.id) || []).filter(edge => {
    const other = index.byId.get(edge.source === row.id ? edge.target : edge.source);
    return other && row.topics.length && other.topics.some(t => !row.topics.includes(t));
  });
  const qualifies = (row, name) => name === 'all' ||
    name === 'foundations' && readings.has(row.id) ||
    name === 'influential' && row.citation?.count != null ||
    name === 'latest' && !!latestDate(index,row,filters.dateBasis) ||
    name === 'bridges' && crossLinks(row).length > 0 ||
    name === 'tools' && (row.form === 'benchmark' || row.repos.length > 0);
  const counts = Object.fromEntries(ROLES.map(name => [name, base.filter(row => qualifies(row, name)).length]));
  const relevance = row => (seedSet.has(row.id) ? 1e6 : 0) + (discovery.paperScores.get(row.id) || 0) + (neighbors.has(row.id) ? 1 : 0);
  const rows = base.filter(row => qualifies(row, role)).sort((a, b) => {
    if (role === 'influential') return b.citation.count - a.citation.count || a.id.localeCompare(b.id);
    if (role === 'latest') return latestDate(index,b,filters.dateBasis).date.localeCompare(latestDate(index,a,filters.dateBasis).date) || a.id.localeCompare(b.id);
    return relevance(b) - relevance(a) || (role === 'all' && !constrained ? Number(readings.has(b.id)) - Number(readings.has(a.id)) : 0) || a.id.localeCompare(b.id);
  });
  const evidence = row => ({
    seed: seedSet.has(row.id),
    textScore: discovery.paperScores.get(row.id) || null,
    terms: (discovery.expandedTerms || []).filter(term => index.documents.get(row.id)?.tf.has(term)).slice(0, 8),
    seedRelations: neighbors.get(row.id) || [],
    readings: readings.get(row.id) || [],
    bridges: crossLinks(row),
  });
  return {filters, conditionCounts, candidates, rows, ids: new Set(rows.map(row => row.id)), base, role, topic, seeds, counts, evidence,
    query: discovery.query || '', expandedTerms: discovery.expandedTerms || [],
    domain: discovery.domain || 'all', cutoff: index.db.meta.cutoff};
}

export function explorerMap(index, population, selectedPaper = '', readingIds = []) {
  const rows = population.rows.slice(0, 60);
  const priority = unique([selectedPaper, ...readingIds]).filter(id => population.ids.has(id)).slice(0,60);
  const protectedIds = new Set(priority);
  for (const id of priority) {
    if (rows.some(row => row.id === id)) continue;
    if (rows.length === 60) {
      const replace = rows.findLastIndex(row => !protectedIds.has(row.id));
      rows.splice(replace,1);
    }
    rows.push(index.byId.get(id));
  }
  const frequencies = new Map();
  for (const row of rows) for (const topic of row.topics) frequencies.set(topic, (frequencies.get(topic) || 0) + 1);
  const selectedRoute = index.db.routes.find(route => route.topic === population.topic);
  const routes = index.db.routes.filter(route => frequencies.has(route.topic)).sort((a, b) =>
    Number(b === selectedRoute) - Number(a === selectedRoute) || frequencies.get(b.topic) - frequencies.get(a.topic) || a.slug.localeCompare(b.slug)).slice(0, 4);
  if (rows.some(row => !routes.some(route => row.topics.includes(route.topic)))) {
    routes.push({slug: '_other', topic: 'Other matching papers', color: '#8ab5ac', readings: []});
  }
  const nodes = rows.map(row => {
    const memberships = routes.filter(route => row.topics.includes(route.topic)).map(route => route.slug);
    return {id: row.id, row, routes: memberships.length ? memberships : ['_other']};
  });
  const ids = new Set(nodes.map(n => n.id));
  const occupied = new Set(nodes.map(node => node.routes[0]));
  return {routes: routes.filter(route => occupied.has(route.slug)), nodes, edges: index.db.edges.filter(e => ids.has(e.source) && ids.has(e.target)),
    orders: new Map(routes.map(r => [r.slug, nodes.filter(n => n.routes.includes(r.slug)).map(n => n.id)]))};
}

export function mapGeometry(model, mode) {
  const width = 1100, positions = new Map(), laneLabels = [], clusters = new Map();
  const laneOf = node => Math.max(0,model.routes.findIndex(route => node.routes.includes(route.slug)));
  const xyear = year => !year ? 1040 : +year <= 2022 ? 230 : +year === 2023 ? 385 : +year === 2024 ? 545 : +year === 2025 ? 725 : 900;
  for (const node of model.nodes) {
    const lane = laneOf(node);
    if (!clusters.has(lane)) clusters.set(lane,[]);
    clusters.get(lane).push(node);
  }
  if (mode === 'network') {
    const columns = model.routes.length > 1 ? 2 : 1;
    const largest = Math.max(1,...[...clusters.values()].map(nodes => nodes.length));
    const cellHeight = Math.max(290,2*(34+17*Math.sqrt(largest))+75);
    const height = Math.max(440,Math.ceil(model.routes.length/columns)*cellHeight+50);
    model.routes.forEach((route,lane) => {
      const x = (lane%columns+.5)*width/columns, top = Math.floor(lane/columns)*cellHeight;
      laneLabels.push({x,y:top+30});
      (clusters.get(lane)||[]).forEach((node,i) => {
        const angle=i*2.399963, radius=34+17*Math.sqrt(i+1);
        positions.set(node.id,{x:x+Math.cos(angle)*radius*(columns===1?1.5:1.2),y:top+cellHeight/2+35+Math.sin(angle)*radius,lane});
      });
    });
    return {width,height,positions,laneLabels};
  }
  const laneHeights = model.routes.map((_,lane) => {
    const counts = new Map();
    for(const node of clusters.get(lane)||[]) counts.set(xyear(node.row.year),(counts.get(xyear(node.row.year))||0)+1);
    return Math.max(115,Math.ceil(Math.max(0,...counts.values())/3)*22+48);
  });
  const contentHeight = laneHeights.reduce((a,b)=>a+b,0), height = Math.max(440,contentHeight+100);
  let top = 65+(height-100-contentHeight)/2;
  model.routes.forEach((route,lane) => {
    const center = top+laneHeights[lane]/2, buckets = new Map();
    laneLabels.push({x:22,y:center});
    for(const node of clusters.get(lane)||[]) {
      const x=xyear(node.row.year);if(!buckets.has(x))buckets.set(x,[]);buckets.get(x).push(node);
    }
    for(const [x,nodes] of buckets) nodes.forEach((node,i)=>positions.set(node.id,{
      x:x+(i%3-1)*37,y:center+(Math.floor(i/3)-(Math.ceil(nodes.length/3)-1)/2)*22,lane,
    }));
    top+=laneHeights[lane];
  });
  return {width,height,positions,laneLabels};
}

export function readLocalRoute(index, raw) {
  if (!raw || raw.format !== 'atlas-local-reading-route-v1' || !Array.isArray(raw.items)) return [];
  const used = new Set();
  return raw.items.filter(item => item && index.byId.has(item.paperId) && !used.has(item.paperId) && used.add(item.paperId)).slice(0, 100).map(item => ({
    paperId: item.paperId,
    role: READING_ROLES.includes(item.role) ? item.role : 'background',
    reason: String(item.reason || '').slice(0, 1200),
    query: String(item.query || '').slice(0, 1600),
    topic: String(item.topic || '').slice(0, 200),
    addedFromRole: ROLES.includes(item.addedFromRole) ? item.addedFromRole : 'all',
    filters: item.filters && typeof item.filters==='object' ? filterState(explorerFilters(item.filters)) : null,
    release: String(item.release || '').slice(0, 30),
    cutoff: String(item.cutoff || '').slice(0, 30),
    addedOn: String(item.addedOn || '').slice(0, 40),
  }));
}

function filterState(f) {return f ? {pathDateBasis:f.dateBasis,pathYearFrom:f.from,pathYearTo:f.to,pathUnknownDate:f.unknownDate?'include':'',pathSetting:f.setting,pathForm:f.form,pathCode:f.code,pathPubStatus:f.pubStatus,pathInclude:f.include.join(', '),pathExclude:f.exclude.join(', '),pathCondition:f.condition} : null;}

export function routeItem(index, population, id, reason) {
  if (!index.byId.has(id)) return null;
  const row = index.byId.get(id);
  return {paperId: id, role: row.form === 'benchmark' ? 'evaluation' : row.form === 'method' ? 'method' : 'background',
    reason: String(reason || '').slice(0, 1200), query: population.query, topic: population.topic,
    filters: filterState(population.filters),
    addedFromRole: population.role, release: index.db.meta.release, cutoff: index.db.meta.cutoff, addedOn: new Date().toISOString()};
}

export function exportReadingRoute(index, items, context) {
  const savedIds=new Set(items.map(item=>item.paperId));
  return {format: 'atlas-reading-route-v1', methodVersion: EXPLORER_VERSION,
    snapshot: index.db.meta, context: {query: context.query, topic: context.topic, seeds: context.seeds, role: context.role, filters: context.filters},
    interpretation: 'User-arranged reading order; does not assert citation, inheritance or independent expert endorsement.',
    recordedRelations: index.db.edges.filter(edge=>savedIds.has(edge.source)&&savedIds.has(edge.target)),
    items: items.map((item, position) => {
      const row = index.byId.get(item.paperId);
      return {...item, order: position + 1, title: row.paper.title, url: row.paper.url, recordedDate: row.date || row.year,
        dateEvidence: Object.fromEntries(['recorded','arxivFirst','publication','arxivUpdated'].map(key=>[key,dateFacts(index,row,key)])), publication: row.publication, citation: row.citation, resources: row.artifacts || [],
        conditionEvidence: index.db.conditionEvidence?.papers.find(p => p.paperId === item.paperId) || null};
    })};
}

export function readingRouteMarkdown(pack, lang = 'en') {
  const t = (en, zh) => lang === 'zh' ? zh : en;
  const clean = value => String(value || '').replace(/[\r\n]+/g, ' ').replace(/([\\\[\]*_`<>#])/g, '\\$1');
  const url = value => {try {const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href.replace(/[()]/g, c => encodeURIComponent(c).replace('(', '%28').replace(')', '%29')) : ''; } catch {return '';}};
  const lines = [`# ${t('My reading route', '我的阅读路线')}`, '', `${pack.snapshot.release} · ${t('Corpus cutoff', '语料截止')} ${pack.snapshot.cutoff}`, '',
    `${t('Current question', '当前问题')}: ${clean(pack.context.query || t('Topic exploration', '专题探索'))}`,
    `${t('Current topic', '当前专题')}: ${clean(pack.context.topic || t('Entire Atlas corpus', 'Atlas 全库'))}`, '',
    t('The order and reading roles were arranged by the reader. They do not establish scientific inheritance.', '顺序和阅读角色由读者安排，不代表学术继承关系。'), ''];
  for (const item of pack.items) {
    lines.push(`## ${item.order}. ${clean(item.title)}`, '', `[${t('Original paper', '论文原文')}](${url(item.url)})`,
      `${t('Reading role', '阅读角色')}: ${item.role}`, `${t('Reason', '加入理由')}: ${clean(item.reason)}`,
      `${t('Question when added', '加入时的问题')}: ${clean(item.query || '—')}`,
      `${t('Scope when added', '加入时的范围')}: ${clean(item.topic || t('Entire Atlas corpus', 'Atlas 全库'))}`,
      `${t('Source snapshot', '加入时快照')}: ${item.release} · ${item.cutoff}`, '');
    for(const [basis,facts] of Object.entries(item.dateEvidence||{}))for(const f of facts)lines.push(`- ${clean(basis)}: ${clean(f.date)} (${clean(f.precision)}, ${clean(f.kind)})${url(f.sourceUrl)?` — [${t('Source','来源')}](${url(f.sourceUrl)})`:''}`);
    if(item.filters)lines.push(`- ${t('Filters when added','加入时的筛选条件')}: ${clean(JSON.stringify(item.filters))}`);
    lines.push('');
    for (const fact of item.conditionEvidence?.facts || []) lines.push(`- ${clean(lang === 'zh' ? fact.zh : fact.en)} — [${t('Source', '原文')}](${url(fact.sourceUrl)})`);
  }
  if(pack.recordedRelations?.length) {
    lines.push(`## ${t('Recorded relations among saved papers','已存论文之间的已记录关系')}`, '');
    const titles=new Map(pack.items.map(item=>[item.paperId,item.title]));
    for(const edge of pack.recordedRelations) {
      lines.push(`- ${clean(titles.get(edge.source))} ${edge.kind==='citation'?'→':'↔'} ${clean(titles.get(edge.target))} · ${clean(edge.kind)}: ${clean(edge.basis)}`);
      if(url(edge.sourceUrl))lines.push(`  [${t('Provider record','来源记录')}](${url(edge.sourceUrl)}) · ${clean(edge.observedOn)}`);
      for(const ref of edge.sharedReferences||[])if(url(ref))lines.push(`  [${t('Shared reference','共同参考文献')}](${url(ref)})`);
      if(edge.terms?.length)lines.push('  '+edge.terms.map(clean).join(' · '));
    }
  }
  return lines.join('\n') + '\n';
}

export function publicExplorerLink(href, includeQuestion = false) {
  const u = new URL(href), [view, query] = u.hash.slice(1).split('?'), source = new URLSearchParams(query || ''), params = new URLSearchParams();
  const allowed = ['path','ptab','paper','layout','edges','edge','plimit','pp','pw','pview','prole','seeds','rpage','dbasis','yfrom','yto','udate','setting','pform','pcode','pstatus','cond','ca','cb','ckind','chops','cscope','cpath'];
  if (includeQuestion) allowed.push('idea','include','exclude');
  for (const key of allowed) if (source.has(key)) params.set(key,source.get(key));
  // A private local route is never part of a shared URL or the recipient's view.
  if (params.get('pview') === 'route') params.set('pview', 'papers');
  u.hash = view + (params.size ? '?' + params.toString() : '');
  return u.href;
}
