/* Source types, explicit filters and bounded graph traversal. No inferred scientific lineage. */
export const DATE_BASES = ['recorded','arxivFirst','publication','arxivUpdated'];
export const FILTER_KEYS = ['pathDateBasis','pathYearFrom','pathYearTo','pathUnknownDate','pathSetting','pathForm','pathCode','pathPubStatus','pathInclude','pathExclude','pathCondition'];
const norm = value => String(value || '').normalize('NFKC').toLowerCase().trim();
const terms = value => norm(value).split(/[,，;；\n]/).map(v=>v.trim()).filter(Boolean).slice(0,8);
export const CONDITIONS = {
  no_memory_write: ['requires_direct_memory_write', false],
  cross_session: ['reports_cross_session_effect', true],
  no_parameter_update: ['requires_llm_parameter_update', false],
  benign_utility: ['reports_benign_utility', true],
};
export function explorerFilters(state) {
  const year = v => /^\d{4}$/.test(String(v)) && +v>=1900 && +v<=2100 ? String(v) : '';
  let from=year(state.pathYearFrom), to=year(state.pathYearTo);
  if(from&&to&&from>to) [from,to]=[to,from];
  return {
    dateBasis: DATE_BASES.includes(state.pathDateBasis) ? state.pathDateBasis : 'recorded', from, to,
    unknownDate: state.pathUnknownDate==='include',
    setting: ['digital','physical','both','unknown'].includes(state.pathSetting) ? state.pathSetting : '',
    form: ['method','benchmark','empirical','position','theory','survey','unknown'].includes(state.pathForm) ? state.pathForm : '',
    code: ['linked','unknown'].includes(state.pathCode) ? state.pathCode : '',
    pubStatus: ['published','accepted','preprint','unknown'].includes(state.pathPubStatus) ? state.pathPubStatus : '',
    include: terms(state.pathInclude), exclude: terms(state.pathExclude),
    condition: Object.hasOwn(CONDITIONS,state.pathCondition||'') ? state.pathCondition : '',
  };
}
export function dateFacts(index,row,basis='recorded') {
  const recorded=index.db.dateEvidence?.papers?.[row.id]?.[basis];
  if(recorded) return recorded;
  return basis==='recorded' && (row.date||row.year) ? [{date:row.date||row.year, precision:row.date?'day':'year',kind:'corpus_recorded_date',sourceUrl:row.paper.url}] : [];
}
export function latestDate(index,row,basis='recorded') {
  return dateFacts(index,row,basis).filter(f=>f.precision==='day'&&f.date<=index.db.meta.cutoff).sort((a,b)=>b.date.localeCompare(a.date))[0] || null;
}
export function conditionState(index,id,condition) {
  if(!CONDITIONS[condition]) return 'unknown';
  const [predicate,value]=CONDITIONS[condition];
  const facts=(index.db.conditionEvidence?.papers.find(p=>p.paperId===id)?.facts||[]).filter(f=>f.predicate===predicate);
  if(!facts.length) return 'unknown';
  const supported=facts.some(f=>f.value===value), contradicted=facts.some(f=>f.value!==value);
  return supported&&contradicted ? 'conflict' : supported ? 'supported' : 'contradicted';
}
export function matchesExplorerFilters(index,row,f,ignoreCondition=false) {
  const text=norm(row.paper.title+' '+(row.paper.summary||''));
  if(f.include.some(term=>!text.includes(term))||f.exclude.some(term=>text.includes(term))) return false;
  if(f.setting==='digital'&&!row.digitalSignal || f.setting==='physical'&&!row.physicalSignal ||
     f.setting==='both'&&!(row.digitalSignal&&row.physicalSignal) || f.setting==='unknown'&&(row.digitalSignal||row.physicalSignal)) return false;
  if(f.form&&(f.form==='unknown'?!!row.form:row.form!==f.form)) return false;
  if(f.code==='linked'&&!row.repos.length || f.code==='unknown'&&row.repos.length) return false;
  const status=row.publication?.status||'unknown';
  if(f.pubStatus&&(f.pubStatus==='unknown'?['published','accepted','preprint'].includes(status):status!==f.pubStatus)) return false;
  if(f.from||f.to) {
    const facts=dateFacts(index,row,f.dateBasis);
    if(!facts.length) {if(!f.unknownDate)return false;}
    else if(!facts.some(fact=>(!f.from||fact.date.slice(0,4)>=f.from)&&(!f.to||fact.date.slice(0,4)<=f.to))) return false;
  }
  return ignoreCondition || !f.condition || conditionState(index,row.id,f.condition)==='supported';
}

// Breadth-first search finds minimum-hop paper chains. Citation arrows keep source -> target,
// even when a researcher traverses the relation in reverse. Parallel types prefer citation.
export function connectPapers(index,start,end,{kind='citation',maxHops=4,allowedIds=null,limit=3}={}) {
  maxHops=[2,4,6].includes(+maxHops)?+maxHops:4;
  kind=kind==='all'?'all':'citation';
  const adjacency=new Map(),priority={citation:0,coupling:1,text:2};
  for(const edge of [...index.db.edges].sort((a,b)=>priority[a.kind]-priority[b.kind]||a.source.localeCompare(b.source)||a.target.localeCompare(b.target))) {
    if(kind!=='all'&&edge.kind!==kind)continue;
    if(allowedIds&&(!allowedIds.has(edge.source)||!allowedIds.has(edge.target)))continue;
    for(const [id,other] of [[edge.source,edge.target],[edge.target,edge.source]]) {
      if(!adjacency.has(id))adjacency.set(id,new Map());
      if(!adjacency.get(id).has(other))adjacency.get(id).set(other,edge);
    }
  }
  const result={start,end,kind,maxHops,paths:[],coveredPapers:adjacency.size,totalPapers:allowedIds?allowedIds.size:index.rows.length,status:'choose_endpoints'};
  if(!index.byId.has(start)||!index.byId.has(end))return result;
  if(allowedIds&&(!allowedIds.has(start)||!allowedIds.has(end)))return {...result,status:'outside_scope'};
  if(start===end)return {...result,status:'same_endpoint'};
  if(!adjacency.has(start)||!adjacency.has(end))return {...result,status:'uncovered_endpoint'};
  const distance=new Map([[start,0]]),parents=new Map(),queue=[start];let targetDepth=Infinity;
  for(let i=0;i<queue.length;i++) {
    const id=queue[i],depth=distance.get(id);if(depth>=maxHops||depth>=targetDepth)continue;
    for(const [other,edge] of [...adjacency.get(id)].sort(([a],[b])=>a.localeCompare(b))) {
      if(!distance.has(other)){distance.set(other,depth+1);parents.set(other,[]);queue.push(other);}
      if(distance.get(other)===depth+1) parents.get(other).push({id,edge});
      if(other===end)targetDepth=depth+1;
    }
  }
  if(!distance.has(end))return {...result,status:'no_path_within_limit'};
  const paths=[];
  function unwind(id,nodes,hops) {
    if(paths.length>=limit)return;
    if(id===start){paths.push({ids:[...nodes].reverse(),hops:[...hops].reverse()});return;}
    for(const {id:previous,edge} of parents.get(id)||[]) {
      unwind(previous,[...nodes,previous],[...hops,{from:previous,to:id,edge,reversed:edge.kind==='citation'&&edge.source!==previous}]);
      if(paths.length>=limit)return;
    }
  }
  unwind(end,[end],[]);
  return {...result,status:'found',paths,distance:distance.get(end)};
}
export function connectionContext(index,population,state) {
  return connectPapers(index,state.pathConnectA,state.pathConnectB,{
    kind:state.pathConnectKind,maxHops:state.pathConnectHops,
    allowedIds:state.pathConnectScope==='results'?population.ids:null,
  });
}
export function importReadingRoute(index,raw,existing=[]) {
  if(!raw||!['atlas-reading-route-v1','atlas-local-reading-route-v1'].includes(raw.format)||!Array.isArray(raw.items))throw Error('Invalid route format');
  const items=[...existing],ids=new Set(items.map(i=>i.paperId));let unknown=0,duplicates=0,overflow=0;
  for(const item of raw.items) {
    if(!item||!index.byId.has(item.paperId)){unknown++;continue;}
    if(ids.has(item.paperId)){duplicates++;continue;}
    if(items.length>=100){overflow++;continue;}
    // Caller applies the same local-route validator to the merged result.
    items.push(item);ids.add(item.paperId);
  }
  return {items,unknown,duplicates,overflow,added:items.length-existing.length};
}
