/* Reading preferences, not an estimate of scientific quality. No live requests. */
export const PRIORITY_VERSION='reading-priority-v1';
export const PRESETS={balanced:[30,40,30],foundations:[30,55,15],implementation:[20,25,55]};
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,'');
const known=s=>typeof s==='string'&&s.trim()&&!/^(unknown|none|null|not[ _-]?(found|recorded|available)|noassertion|n\/a)$/i.test(s.trim());
export function priorityWeights(value,preset='balanced'){
 const a=Array.isArray(value)?value:typeof value==='string'?value.split(',').map(Number):[];
 const valid=a.length===3&&a.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100)&&a.some(x=>x>0);
 const raw=valid?a:(PRESETS[preset]||PRESETS.balanced);
 const sum=raw.reduce((x,y)=>x+y,0);return raw.map(x=>x/sum);
}
export function venueSignal(publication,catalog){
 const p=publication||{},catalogMatched=p.doiIdentitySafe===true&&(p.sources||[]).some(s=>['official_catalog','crossref_publisher_metadata'].includes(s.locator)&&/^https?:\/\//.test(s.url||'')),verified=['published','accepted'].includes(p.status)&&(!!p.verification||catalogMatched)&&/^https?:\/\//.test(p.url||'');
 if(!verified)return {status:null,category:null,reason:'publication_unverified'};
 const kind=p.track==='Journal'?'journal':['Main','Main conference'].includes(p.track)||p.track==='Datasets and Benchmarks'&&['neurips','advancesinneuralinformationprocessingsystems'].includes(norm(p.venueName))?'conference':null;
 const entry=kind&&(catalog?.entries||[]).find(e=>e.kind===kind&&e.aliases.some(a=>norm(a)===norm(p.venueName)));
 return {status:p.status==='published'?1:.9,category:entry?({A:1,B:.75,C:.5}[entry.grade]):null,entry:entry||null,source:entry?catalog.source.retrievedFrom+'#page='+entry.page:null,reason:!kind?'track_unverified_or_ineligible':!entry?'venue_unmapped':'matched',publication:p};
}
export function citationSignal(row,population){
 if(!row.citation||!Number.isInteger(row.citation.count)||row.citation.count<0||!/^\d{4}$/.test(row.year||''))return {value:null,reason:'citation_or_year_unrecorded'};
 const candidates=population.filter(p=>p.citation&&Number.isInteger(p.citation.count)&&p.citation.count>=0&&/^\d{4}$/.test(p.year||''));
 let cohort=[],window=0;
 for(window=0;window<=2;window++){cohort=candidates.filter(p=>Math.abs(+p.year- +row.year)<=window);if(cohort.length>=20)break;}
 if(cohort.length<20){cohort=candidates;window=null;}
 const years=cohort.map(p=>+p.year),meta={size:cohort.length,year:row.year,window,from:years.length?Math.min(...years):null,to:years.length?Math.max(...years):null,count:row.citation.count,observedOn:row.citation.observedOn,source:row.citation.sourceUrl};
 if(cohort.length<5)return {...meta,value:null,reason:'cohort_too_small'};
 const below=cohort.filter(p=>p.citation.count<row.citation.count).length,ties=cohort.filter(p=>p.citation.count===row.citation.count).length;
 return {...meta,value:(below+(ties-1)/2)/(cohort.length-1),reason:window===null?'topic_fallback':'year_cohort'};
}
export function artifactSignal(row){
 const candidates=(row.artifacts||[]).filter(a=>/^https?:\/\//.test(a.url||'')).map(a=>({repository:1,license:known(a.license)?1:null,revision:known(a.version)?1:null,record:a}));
 // The fields must describe the same repository; never combine unrelated artifacts.
 candidates.sort((a,b)=>(Number(b.license!==null)+Number(b.revision!==null))-(Number(a.license!==null)+Number(a.revision!==null))||a.record.id.localeCompare(b.record.id));
 return candidates[0]||{repository:null,license:null,revision:null,record:null};
}
export function scorePriority(row,population,catalog,weights=priorityWeights(),citation=null){
 weights=priorityWeights(weights);const p=venueSignal(row.publication,catalog),c=citation||citationSignal(row,population),a=artifactSignal(row);
 const components=[{key:'publication',atoms:[[.35,p.status],[.65,p.category]],evidence:p},{key:'citation',atoms:[[1,c.value]],evidence:c},{key:'artifacts',atoms:[[.5,a.repository],[.25,a.license],[.25,a.revision]],evidence:a}].map((part,i)=>{
  let value=0,coverage=0,lower=0;
  for(const [weight,v] of part.atoms){value+=weight*(v===null?.5:v);if(v!==null){coverage+=weight;lower+=weight*v;}}
  return {key:part.key,weight:weights[i],value,coverage,lower,upper:lower+1-coverage,evidence:part.evidence};
 });
 const total=key=>components.reduce((n,c)=>n+c.weight*c[key],0),coverage=total('coverage');
 return {methodVersion:PRIORITY_VERSION,score:coverage?100*total('value'):null,coverage,lower:100*total('lower'),upper:100*total('upper'),components};
}
export function rankPriority(dossier,catalog,weights){
 const cohorts=new Map();
 const scores=new Map(dossier.papers.map(row=>{const key=row.year+':'+row.citation?.count;if(!cohorts.has(key))cohorts.set(key,citationSignal(row,dossier.papers));const c={...cohorts.get(key),source:row.citation?.sourceUrl,observedOn:row.citation?.observedOn};return [row.id,scorePriority(row,dossier.papers,catalog,weights,c)];}));
 const compare=(a,b)=>(scores.get(b.id).score??-1)-(scores.get(a.id).score??-1)||scores.get(b.id).coverage-scores.get(a.id).coverage||a.id.localeCompare(b.id);
 return {weights:priorityWeights(weights),scores,rows:dossier.focused.slice().sort(compare)};
}
export function learningSignals(dossier,cutoff){
 const end=new Date(cutoff+'T00:00:00Z'),start=new Date(end);start.setUTCMonth(start.getUTCMonth()-6);const since=start.toISOString().slice(0,10);
 return {total:dossier.papers.length,preciseDates:dossier.latest.length,recent:dossier.latest.filter(p=>p.date>=since&&p.date<=cutoff).length,since,cutoff,benchmarks:dossier.benchmark.length,codeLinked:dossier.code.length,citations:dossier.cited.length};
}
