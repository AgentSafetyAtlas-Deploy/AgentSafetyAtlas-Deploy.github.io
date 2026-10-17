// Counts describe the screened collection. Curated readings never alter topic membership.
export function shiftMonths(value, months) {
 const d=new Date(value+'T00:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);
 d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));
 return d.toISOString().slice(0,10);
}
export function topicSnapshot(db,slug,months=6){
 const guide=db.guides.find(g=>g.slug===slug);if(!guide)return null;
 months=[3,6,12].includes(+months)?+months:6;
 const end=db.meta.cutoff,start=shiftMonths(end,-months),before=shiftMonths(end,-2*months);
 const papers=db.papers.filter(p=>p.topics.includes(guide.topic));
 const recent=papers.filter(p=>p.date&&p.date>start&&p.date<=end),previous=papers.filter(p=>p.date&&p.date>before&&p.date<=start);
 const corpusRecent=db.papers.filter(p=>p.date&&p.date>start&&p.date<=end).length,corpusPrevious=db.papers.filter(p=>p.date&&p.date>before&&p.date<=start).length;
 const group=key=>[...new Set(papers.map(p=>p[key]).filter(Boolean))].sort().map(value=>({key:value,ids:papers.filter(p=>p[key]===value).map(p=>p.id)}));
 const ranked=papers.filter(p=>p.citation&&Number.isInteger(p.citation.count)).sort((a,b)=>b.citation.count-a.citation.count||a.id.localeCompare(b.id));
 const cross=db.guides.filter(g=>g.slug!==slug).map(g=>({slug:g.slug,topic:g.topic,ids:recent.filter(p=>p.topics.includes(g.topic)).map(p=>p.id),previous:previous.filter(p=>p.topics.includes(g.topic)).length})).filter(g=>g.ids.length).sort((a,b)=>b.ids.length-a.ids.length||a.slug.localeCompare(b.slug));
 return {guide,months,end,start,before,papers,recent,previous,corpusRecent,corpusPrevious,shareChange:corpusRecent&&corpusPrevious?(recent.length/corpusRecent-previous.length/corpusPrevious)*100:null,years:group('year'),forms:group('form'),unknownDates:papers.filter(p=>!p.date).length,unknownYears:papers.filter(p=>!p.year).length,unknownForms:papers.filter(p=>!p.form).length,code:papers.filter(p=>p.code),benchmarks:papers.filter(p=>p.form==='benchmark'),published:papers.filter(p=>p.published),ranked,citationMissing:papers.length-ranked.length,cross,latest:recent.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))};
}
export function evidenceRows(s,key){
 if(key==='recent')return s.recent;
 if(key==='previous')return s.previous;
 if(key==='code')return s.code;
 if(key==='all')return s.papers;
 if(key.startsWith('year:'))return s.papers.filter(p=>p.year===key.slice(5));
 if(key.startsWith('form:'))return s.papers.filter(p=>p.form===key.slice(5));
 if(key.startsWith('cross:')){const ids=new Set(s.cross.find(g=>g.slug===key.slice(6))?.ids||[]);return s.recent.filter(p=>ids.has(p.id));}
 return [];
}
export function exportTopic(db,s,tab){
 return {method:'topic-guides-v1',scope:'screened_collection_not_global_field',release:db.meta.release,cutoff:s.end,topic:s.guide.topic,editorialReviewedOn:s.guide.reviewedOn,citationObservedOn:db.meta.citationObservedOn,tab,window:{months:s.months,recentStartExclusive:s.start,endInclusive:s.end,previousStartExclusive:s.before},counts:{papers:s.papers.length,recent:s.recent.length,previous:s.previous.length,withoutExactDate:s.unknownDates,withCode:s.code.length,citationVerified:s.ranked.length,citationMissing:s.citationMissing},guide:s.guide,references:Object.fromEntries(s.guide.readings.map(r=>[r.ref,db.references[r.ref]])),paperIds:s.papers.map(p=>p.id),recentIds:s.recent.map(p=>p.id),yearCounts:s.years.map(g=>({year:g.key,paperIds:g.ids})),forms:s.forms,citationRanking:s.ranked.map(p=>({paperId:p.id,...p.citation})),intersections:s.cross};
}
