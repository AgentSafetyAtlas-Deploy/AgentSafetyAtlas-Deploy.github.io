import {rankPriority,priorityWeights,PRIORITY_VERSION} from './research-priority-model.js';
/* Pure, deterministic research-path calculations. No generated claims or network calls. */
const STOP=new Set('a an and are as at be build by can do for from how i in into is it its make me my of on or our research safety security agent agents llm llms language model models that the their this to using use want we what which with would'.split(' '));
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[-‐‑–—]/g,' ').replace(/\s+/g,' ').trim();
export const tokens=s=>(normalize(s).match(/[a-z][a-z0-9]+/g)||[]).filter(w=>w.length>2&&!STOP.has(w));
const unique=xs=>[...new Set(xs)];
export function preparePaths(db,atlas,locale={}){
 const papers=new Map(atlas.papers.map(p=>[p.id,p])),resources=new Map(atlas.resources.map(r=>[r.id,r]));
 const rows=db.papers.map(p=>({...p,...{paper:papers.get(p.id)}})).filter(p=>p.paper);
 for(const row of rows){const text=row.paper.title+' '+(row.paper.summary||'');row.digitalSignal=/\b(?:llms?|language models?|gpt|chatgpt|claude|mcp|prompt injection|coding agent|tool.using agent)/i.test(text);row.physicalSignal=/robot|embodied|autonomous driv|physical.world|navigation|reinforcement learning/i.test(text);}
 const byId=new Map(rows.map(p=>[p.id,p]));
 const documents=new Map(),df=new Map();let length=0;
 for(const r of rows){const ts=tokens(r.paper.title+' '+r.paper.title+' '+r.paper.summary),tf=new Map();for(const w of ts)tf.set(w,(tf.get(w)||0)+1);documents.set(r.id,{tf,length:ts.length});length+=ts.length;for(const w of tf.keys())df.set(w,(df.get(w)||0)+1);}
 return {db,atlas,locale,rows,byId,papers,resources,documents,df,averageLength:length/Math.max(1,rows.length),routes:new Map(db.routes.map(r=>[r.slug,r]))};
}
function termPresent(q,term){
 term=normalize(term);if(/[\u3400-\u9fff]/.test(term))return q.includes(term);
 const text=q.replace(/[^a-z0-9\u3400-\u9fff]+/g,' ').replace(/\s+/g,' ');
 for(let i=text.indexOf(term);i>=0;i=text.indexOf(term,i+1))if(!/[a-z0-9]/.test(text[i-1]||'')&&!/[a-z0-9]/.test(text[i+term.length]||''))return true;
 return false;
}
export function discoverRoutes(index,query){
 const q=normalize(query).slice(0,1600),defaults=['prompt-injection','memory-retrieval','runtime-monitoring','evaluation'];
 if(!q)return {query:'',mode:'browse',routes:defaults.map(slug=>({route:index.routes.get(slug),score:0,matched:[]})),paperScores:new Map()};
 const direct=index.db.routes.map(route=>{const terms=[...new Map([...route.terms,...(index.locale._terms?.[route.slug]||[])].map(term=>[normalize(term),term])).values()],matched=terms.filter(term=>termPresent(q,term));return {route,matched,score:matched.reduce((n,term)=>n+Math.min(3,normalize(term).length/6+1),0)};});
 const domain=/robot|embodied|physical|autonomous driving|具身|机器人|物理|自动驾驶/.test(q)?'physical':/\bagents?\b|\bllms?\b|black box|黑盒|工具|记忆|提示注入|语言模型/.test(q)?'digital':'all';
 const expanded=unique([...tokens(q),...direct.filter(x=>x.matched.length).flatMap(x=>tokens(x.route.terms.join(' ')))]),literal=new Set(tokens(q));
 const paperScores=new Map();
 for(const [id,doc] of index.documents){let score=0;for(const word of expanded){const f=doc.tf.get(word)||0;if(!f)continue;const df=index.df.get(word)||0,idf=Math.log(1+(index.rows.length-df+.5)/(df+.5));score+=idf*f*2.2/(f+1.2*(.25+.75*doc.length/index.averageLength))*(literal.has(word)?1:.3);}if(score>0){const row=index.byId.get(id);const aligned=domain==='digital'?row.digitalSignal:domain==='physical'?row.physicalSignal:false;paperScores.set(id,score*(aligned?2.5:1));}}
 const best=[...paperScores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,36);
 for(const candidate of direct){const matches=best.filter(([id])=>index.byId.get(id).topics.includes(candidate.route.topic));candidate.evidence=matches.slice(0,3).map(x=>x[0]);candidate.score+=matches.slice(0,5).reduce((n,x)=>n+x[1],0)*.035;}
 const routes=direct.filter(x=>x.matched.length||x.score>.65).sort((a,b)=>b.score-a.score||a.route.slug.localeCompare(b.route.slug)).slice(0,4);
 return {query,mode:routes.length?'matched':'no-match',routes,paperScores,expandedTerms:expanded,domain};
}
export function explainRoute(index,discovery,slug){
 const route=index.routes.get(slug);if(!route)return null;
 const recommendation=discovery.routes.find(x=>x.route.slug===slug),literal=new Set(tokens(discovery.query));
 const evidenceIds=recommendation?recommendation.evidence||[]:[...discovery.paperScores].filter(([id])=>index.byId.get(id).topics.includes(route.topic)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3).map(([id])=>id);
 return {methodVersion:'research-paths-matching-v1.1',origin:recommendation?'recommended':'manual',matchedConcepts:recommendation?.matched||[],basis:'Recorded title/summary vocabulary; methodological conditions require source review.',papers:evidenceIds.map(id=>{
  const doc=index.documents.get(id),shared=words=>words.filter(w=>doc.tf.has(w)).sort((a,b)=>(index.df.get(a)||0)-(index.df.get(b)||0)||a.localeCompare(b)).slice(0,5);
  return {id,title:index.papers.get(id).title,literalTerms:shared([...literal]),expandedTerms:shared((discovery.expandedTerms||[]).filter(w=>!literal.has(w)))};
 })};
}
const citationSort=(a,b)=>(b.citation?.count??-1)-(a.citation?.count??-1)||a.id.localeCompare(b.id);
const recentSort=(a,b)=>(b.date||'').localeCompare(a.date||'')||a.id.localeCompare(b.id);
export function routeDossier(index,slug,paperScores=new Map(),domain='all',hasQuery=paperScores.size>0){
 const route=index.routes.get(slug);if(!route)return null;
 const papers=index.rows.filter(p=>p.topics.includes(route.topic)),ids=new Set(papers.map(p=>p.id));
 const readings=route.readings.map(r=>({...r,row:index.byId.get(r.paperId)}));
 const cited=papers.filter(p=>p.citation).sort(citationSort),latest=papers.filter(p=>p.date&&p.date<=index.db.meta.cutoff).sort(recentSort);
 const relevant=papers.slice().sort((a,b)=>(paperScores.get(b.id)||0)-(paperScores.get(a.id)||0)||citationSort(a,b));
 const domainCandidates=relevant.filter(p=>domain==='digital'?p.digitalSignal:domain==='physical'?p.physicalSignal:true);
 const relevanceFloor=paperScores.size?.5*(paperScores.get(domainCandidates[0]?.id)||0):0;
 const focused=hasQuery?domainCandidates.filter(p=>(paperScores.get(p.id)||0)>0&&(paperScores.get(p.id)||0)>=relevanceFloor).slice(0,Math.min(200,Math.max(30,Math.ceil(papers.length*.2)))):papers;
 const focusIds=new Set(focused.map(p=>p.id)),priorityCited=focused.filter(p=>p.citation).sort(citationSort);
 const relevanceSort=(a,b)=>(paperScores.get(b.id)||0)-(paperScores.get(a.id)||0);
 const benchmark=papers.filter(p=>p.form==='benchmark').sort((a,b)=>relevanceSort(a,b)||Number(b.repos.length>0)-Number(a.repos.length>0)||citationSort(a,b));
 const survey=papers.filter(p=>['survey','position'].includes(p.form)).sort((a,b)=>relevanceSort(a,b)||citationSort(a,b));
 const methods=papers.filter(p=>['method','theory'].includes(p.form)).sort((a,b)=>relevanceSort(a,b)||citationSort(a,b));
 const code=papers.filter(p=>p.repos.length).sort((a,b)=>relevanceSort(a,b)||Number(route.readings.some(r=>r.paperId===b.id))-Number(route.readings.some(r=>r.paperId===a.id))||citationSort(a,b));
 const representative=unique([...readings.map(r=>r.paperId).filter(Boolean),...priorityCited.slice(0,5).map(p=>p.id)]);
 const authors=new Map(),teams=new Map();
 for(const row of papers){for(const name of row.paper.authors||[]){const key=normalize(name.includes(',')?name.split(',').slice(1).join(' ')+' '+name.split(',')[0]:name);if(!authors.has(key))authors.set(key,{name,ids:[],representative:[]});const a=authors.get(key);a.ids.push(row.id);if(representative.includes(row.id))a.representative.push(row.id);}for(const id of row.paper.teams||[]){if(!teams.has(id))teams.set(id,{id,ids:[]});teams.get(id).ids.push(row.id);}}
 const people=[...authors.values()].sort((a,b)=>b.representative.length-a.representative.length||b.ids.length-a.ids.length||a.name.localeCompare(b.name));
 const institutions=[...teams.values()].map(x=>({...x,team:index.atlas.teams.find(t=>t.id===x.id)})).filter(x=>x.team).sort((a,b)=>b.ids.length-a.ids.length||a.id.localeCompare(b.id));
 return {route,papers,ids,readings,cited,priorityCited,focused,focusIds,relevanceFloor,domain,latest,relevant,benchmark,survey,methods,code,people,institutions,unknownDates:papers.length-latest.length,missingCitations:papers.length-cited.length};
}
export function mapSelection(index,discovery,selectedSlug='',selectedPaper=''){
 let routes=discovery.routes.map(x=>x.route);
 if(selectedSlug&&index.routes.has(selectedSlug)&&!routes.some(r=>r.slug===selectedSlug))routes=[index.routes.get(selectedSlug),...routes].slice(0,4);
 if(!routes.length&&selectedSlug)routes=[index.routes.get(selectedSlug)].filter(Boolean);
 const picked=new Set(),memberships=new Map(),orders=new Map();
 for(const route of routes){const d=routeDossier(index,route.slug,discovery.paperScores,discovery.domain,!!discovery.query);
  const refs=d.readings.map(r=>r.paperId).filter(id=>index.byId.has(id));
  const ids=unique([...refs,...d.relevant.slice(0,3).map(p=>p.id),...d.benchmark.slice(0,1).map(p=>p.id),...d.code.slice(0,1).map(p=>p.id),...d.priorityCited.slice(0,2).map(p=>p.id),...d.latest.slice(0,3).map(p=>p.id)]).slice(0,12);
  orders.set(route.slug,ids);for(const id of ids){picked.add(id);if(!memberships.has(id))memberships.set(id,[]);memberships.get(id).push(route.slug);}
 }
 // Include a small, bounded neighborhood so recorded relationships remain visible.
 // Every added paper must have an existing edge and belong to a displayed topic.
 const anchors=[...picked].sort((a,b)=>Number(memberships.get(b).includes(selectedSlug))-Number(memberships.get(a).includes(selectedSlug)));
 const edgeRank={citation:0,coupling:1,text:2};let added=0;
 for(const id of anchors){
  if(added>=16||picked.size>=60)break;
  const candidates=index.db.edges.filter(e=>e.source===id||e.target===id).map(e=>({e,other:e.source===id?e.target:e.source})).filter(({other})=>!picked.has(other)&&routes.some(r=>index.byId.get(other).topics.includes(r.topic))).sort((a,b)=>edgeRank[a.e.kind]-edgeRank[b.e.kind]||(b.e.score||0)-(a.e.score||0)||a.other.localeCompare(b.other));
  if(candidates.length){const {other}=candidates[0];picked.add(other);memberships.set(other,routes.filter(r=>index.byId.get(other).topics.includes(r.topic)).map(r=>r.slug));added++;}
 }
 // A paper that belongs to multiple lanes remains a single, explorable junction.
 for(const id of picked)for(const route of routes)if(index.byId.get(id).topics.includes(route.topic)&&!memberships.get(id).includes(route.slug))memberships.get(id).push(route.slug);
 if(selectedPaper&&index.byId.has(selectedPaper)){
  picked.add(selectedPaper);memberships.set(selectedPaper,routes.filter(r=>index.byId.get(selectedPaper).topics.includes(r.topic)).map(r=>r.slug));
  const neighbors=index.db.edges.filter(e=>e.source===selectedPaper||e.target===selectedPaper).sort((a,b)=>(a.kind==='citation'?0:1)-(b.kind==='citation'?0:1)||(b.score||0)-(a.score||0)).slice(0,7);
  for(const e of neighbors){const id=e.source===selectedPaper?e.target:e.source;picked.add(id);if(!memberships.has(id))memberships.set(id,routes.filter(r=>index.byId.get(id).topics.includes(r.topic)).map(r=>r.slug));}
 }
 const nodes=[...picked].map(id=>({id,row:index.byId.get(id),routes:memberships.get(id)||[]}));
 const edges=index.db.edges.filter(e=>picked.has(e.source)&&picked.has(e.target));
 return {routes,nodes,edges,orders};
}
export function researchPack(index,dossier,query,weights=priorityWeights()){
 const ranking=rankPriority(dossier,index.db.venueCatalog,weights);
 const row=p=>({id:p.id,title:p.paper.title,url:p.paper.url,date:p.date,year:p.year,form:p.form,citation:p.citation,conditionEvidence:index.db.conditionEvidence?.papers.find(n=>n.paperId===p.id)||null,resources:p.repos.map(id=>{const r=index.resources.get(id);return r?{id,url:r.url,title:r.title,license:r.license||null}:null}).filter(Boolean)});
 return {format:'atlas-research-path-v1',query,readingPriority:{methodVersion:PRIORITY_VERSION,weights:ranking.weights,venueCatalog:index.db.venueCatalog,rankedIds:ranking.rows.map(p=>p.id),scores:Object.fromEntries(ranking.scores),interpretation:'Reading preference heuristic; missing atoms use 0.5, range is missing-data sensitivity, not confidence.'},topic:dossier.route.topic,scope:'Current included non-withdrawn Atlas collection; topic labels can overlap.',snapshot:index.db.meta,route:dossier.route,ideaMatch:{domain:dossier.domain,relevanceFloor:dossier.relevanceFloor,candidatePolicy:"Positive context-aligned scores at least half the topic maximum; capped at top 20% (30–200 before availability limits).",candidateIds:dossier.focused.map(p=>p.id),highCitationIds:dossier.priorityCited.slice(0,6).map(p=>p.id),explanation:explainRoute(index,discoverRoutes(index,query),dossier.route.slug)},counts:{papers:dossier.papers.length,citationsVerified:dossier.cited.length,codeLinked:dossier.code.length,preciseDates:dossier.latest.length},readingSelections:dossier.readings.map(({row,...r})=>r),papers:dossier.papers.map(row),relations:index.db.edges.filter(e=>dossier.ids.has(e.source)&&dossier.ids.has(e.target)),people:dossier.people.slice(0,30),institutions:dossier.institutions.slice(0,20).map(x=>({id:x.id,name:x.team.name,paperIds:x.ids})),limits:['Reading order is a navigation recommendation, not a claim of citation or historical priority.','Text similarity and shared references do not prove methodological inheritance.','Citation coverage is incomplete; recent and low-cited work may still be important.','Authors are grouped by normalized name, not resolved personal identities.','Repository presence does not establish reproducibility.']};
}

export function researchNotes(index,dossier,query='',lang='en',weights=priorityWeights()){
 const ranking=rankPriority(dossier,index.db.venueCatalog,weights);
 const t=(en,zh)=>lang==='zh'?zh:en,clean=s=>String(s??'').replace(/[\r\n]+/g,' ').replace(/([\\\[\]*_`<>])/g,'\\$1');
 const link=(label,url)=>`[${clean(label)}](${String(url||'').replace(/\s/g,'%20').replace(/\)/g,'%29')})`;
 const lines=[`# ${t('Research path','研究路线')} · ${dossier.route.topic}`,'',`> ${clean(query||t('Topic exploration','专题探索'))}`,'',`${index.db.meta.release} · ${t('Research cutoff','研究资料截止')} ${index.db.meta.cutoff}`,'',lang==='zh'?(index.locale[dossier.route.intro]||dossier.route.intro):dossier.route.intro,'',`## ${t('Start with these readings','起点阅读')}`,''];
 for(const r of dossier.readings){lines.push(`- ${link(r.title,r.evidenceUrl||r.url)} — ${clean(lang==='zh'?(index.locale[r.why]||r.why):r.why)}`);}
 const papers=(heading,rows)=>{lines.push('',`## ${heading}`,'');for(const row of rows){lines.push(`- ${link(row.paper.title,row.paper.url)} (${row.date||row.year||'?'})${row.citation?` · ${row.citation.count} OpenAlex ${t('citations','次引用')} (${row.citation.observedOn})`:''}`);}};
 lines.push('',`## ${t('Reading priorities','阅读优先级')}`,'',`${PRIORITY_VERSION} · ${ranking.weights.map(x=>Math.round(x*100)).join(' / ')} · ${t('Publication / cohort citations / artifact records','发表 / 同类引用 / 材料记录')}`,'',t('Missing sub-signals use a neutral 0.5. This preference score is not a validated quality measure.','未知子项使用中性 0.5；此偏好分数不是经过验证的质量指标。'));
 for(const r of ranking.rows.slice(0,10)){const s=ranking.scores.get(r.id);lines.push(`- ${link(r.paper.title,r.paper.url)} · ${s.score===null?'—':s.score.toFixed(1)} · ${t('evidence coverage','依据覆盖')} ${Math.round(s.coverage*100)}%`);}
 papers(t('Related high-citation candidates','相关高引用候选'),dossier.priorityCited.slice(0,6));
 papers(t('Recent papers to investigate','近期阅读候选'),dossier.latest.slice(0,10));
 papers(t('Benchmarks to inspect','待核查的评测基准'),dossier.benchmark.slice(0,8));
 papers(t('Methods to compare against','可比较的方法候选'),dossier.methods.slice(0,5));
 lines.push('',`## ${t('Companion code','配套代码')}`,'');
 for(const row of dossier.code.slice(0,10))for(const id of row.repos){const r=index.resources.get(id);if(r)lines.push(`- ${link(r.title,r.url)} — ${clean(row.paper.title)} · ${r.license||t('license unrecorded','许可证未记录')}`);}
 const conditionNotes=(index.db.conditionEvidence?.papers||[]).filter(n=>dossier.ids.has(n.paperId));
 if(conditionNotes.length){lines.push('',`## ${t('Applicability and source evidence','适用条件与原文证据')}`,'',t('Selected source statements; independent review pending. Repositories have not been executed.','以下为选定原文的陈述，待独立复核；仓库未运行验证。'));
  for(const n of conditionNotes){lines.push('',`### ${clean(n.title)}`,'');for(const f of n.facts)lines.push(`- ${clean(lang==='zh'?f.zh:f.en)} — ${link(t('Source','原文'),f.sourceUrl)}`);lines.push(`- ${link(t('Author-associated repository','作者关联仓库'),n.repository.currentUrl)} · ${n.repository.revision}`);}}
 lines.push('',`## ${t('People and teams, through their papers','通过论文认识作者和团队')}`,'');
 for(const a of dossier.people.slice(0,8)){const p=index.papers.get(a.representative[0]||a.ids[0]);lines.push(`- ${clean(a.name)} — ${p?link(p.title,p.url):''}`);}
 for(const team of dossier.institutions.slice(0,8)){const p=index.papers.get(team.ids[0]);lines.push(`- ${clean(team.team.name)} — ${p?link(p.title,p.url):''}`);}
 lines.push('',`## ${t('Before starting an experiment','开始实验前核对')}`,'',...[
 t('State the protected asset, trust boundary and attacker capabilities.','说明保护资产、信任边界与攻击者能力。'),
 t('Check what the monitor can observe and whether the executor must be modified.','核对监督者可见信息，以及是否需要修改执行者。'),
 t('Fix model, benchmark, repository and configuration versions.','固定模型、评测集、仓库和配置版本。'),
 t('Measure both attack outcomes and benign task utility, with cost and false alarms.','同时测攻击结果与良性任务效用，记录成本和误报。')].map(x=>'- [ ] '+x),
 '',`## ${t('Coverage and interpretation','覆盖与解释范围')}`,'',
 `${dossier.papers.length} ${t('topic works','篇专题研究')}; ${dossier.cited.length} ${t('with verified citation counts','篇有核验引用计数')}; ${dossier.code.length} ${t('with linked repositories','篇关联仓库')}.`,
 t('This is a reading aid. Relatedness does not establish inheritance or applicability; repository links do not establish reproduction. Author names are not fully identity-resolved.','本清单用于组织阅读。相关性不证明继承或适用性；仓库链接不证明复现。作者姓名尚未完成完整身份消歧。'),
 t('Use the JSON research pack for the full paper set, typed relations and source metadata.','完整论文集合、带类型的关系与来源元数据见 JSON 研究包。'),'');
 return lines.join('\n');
}
