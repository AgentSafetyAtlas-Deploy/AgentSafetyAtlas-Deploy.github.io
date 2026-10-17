// Exploration signals for the Atlas collection, not estimates of risk or impact.
// Every count retains its paper IDs; a missing link is a data-recording condition.
import {windowBounds} from './insights-model.js';

export const OPPORTUNITY_PAIRS = [
  {id:'permissions-multi-agent', topics:['Permissions and identity','Multi-agent safety']},
  {id:'memory-monitoring', topics:['Memory and retrieval safety','Runtime monitoring']},
  {id:'formal-tool-execution', topics:['Formal guarantees','Tool and execution safety']},
  {id:'deception-oversight', topics:['Deception and control','Oversight and assurance']},
  {id:'embodied-prompt-injection', topics:['Embodied and physical-world safety','Prompt injection']},
  {id:'supply-chain-monitoring', topics:['Supply-chain security','Runtime monitoring']}
];
const THRESHOLDS = Object.freeze({recent:20, previous:5, institutions:3,
  institutionCoverageRate:.5, supportedWindows:2, papersPerBin:2, priority:55});
const WEIGHTS = Object.freeze({momentum:.45, gap:.30, sustained:.15, breadth:.10});
const DAY = 86400000;
const clamp = x => Math.max(0, Math.min(1, x));
const ids = ps => ps.map(p => p.id);
const unique = values => [...new Set(values)];
const rate = (n,d) => d ? n/d : null;
const benchmark = p => typeof p.form === 'string' && p.form.length > 0
  ? p.form === 'benchmark' : p.benchmark === true;
const rorIds = p => unique((p.institutions || []).filter(id => /^https:\/\/ror\.org\/[a-z0-9]+$/.test(id)));
const between = (papers,start,end) => papers.filter(p => p.date >= start && p.date < end);
const shareRatio = (recent,previous,totalRecent,totalPrevious,topicCount) =>
  ((recent+5)/(totalRecent+5*topicCount))/((previous+5)/(totalPrevious+5*topicCount));

function rawShares(recent,previous,totalRecent,totalPrevious) {
  const rawShare = rate(recent,totalRecent), previousRawShare = rate(previous,totalPrevious);
  const rawShareRatio = rawShare===null || !previousRawShare ? null : rawShare/previousRawShare;
  return {rawShare,previousRawShare,rawShareRatio,
    rawShareChange:rawShare===null || previousRawShare===null ? null : rawShare-previousRawShare,
    rawMomentum:rawShareRatio===null ? null : rawShareRatio-1};
}

function evidenceSummary(papers) {
  const code = papers.filter(p => p.code === true), benchmarks = papers.filter(benchmark);
  return {count:papers.length,ids:ids(papers),codes:code.length,codeIds:ids(code),
    benchmarks:benchmarks.length,benchmarkIds:ids(benchmarks)};
}

function institutionEvidence(papers) {
  const credits = new Map(), covered = [];
  for (const p of papers) {
    const institutions = rorIds(p);
    if (institutions.length) covered.push(p.id);
    for (const id of institutions) credits.set(id,(credits.get(id)||0)+1/institutions.length);
  }
  const total = [...credits.values()].reduce((a,b)=>a+b,0);
  return {ids:[...credits.keys()],paperIds:covered,coverage:rate(covered.length,papers.length),
    concentration:total ? [...credits.values()].reduce((a,b)=>a+(b/total)**2,0) : null};
}

function binsFor(papers,bounds) {
  const start = Date.parse(bounds.start+'T00:00:00Z'), end = Date.parse(bounds.end+'T00:00:00Z');
  const days = Math.round((end-start)/DAY);
  const edges = Array.from({length:4},(_,i)=>new Date(start+Math.floor(days*i/3)*DAY).toISOString().slice(0,10));
  return Array.from({length:3},(_,i)=>{
    const ps = between(papers,edges[i],edges[i+1]);
    return {start:edges[i],end:edges[i+1],count:ps.length,ids:ids(ps)};
  });
}

export function computeOpportunities(db,model) {
  const papers = model.papers, topicCount = Math.max(1,db.topics.length);
  const recent = between(papers,model.bounds.start,model.bounds.end);
  const previous = between(papers,model.bounds.previous,model.bounds.start);
  // These windows use the same filtered collection and cutoff, without re-ranking entities.
  const windows = [3,6,12].map(months=>{
    const bounds = windowBounds(model.asOf,months);
    const r = between(papers,bounds.start,bounds.end), p = between(papers,bounds.previous,bounds.start);
    return {months,bounds,recent:r,previous:p,recentIds:ids(r),previousIds:ids(p)};
  });
  const topics = db.topics.map(id=>{
    const all = papers.filter(p=>p.topics.includes(id));
    if (!all.length) return null;
    const r = recent.filter(p=>p.topics.includes(id)), p = previous.filter(p=>p.topics.includes(id));
    const rs = evidenceSummary(r), ps = evidenceSummary(p), inst = institutionEvidence(r);
    const robustnessWindows = windows.map(w=>{
      const wr = w.recent.filter(p=>p.topics.includes(id)), wp = w.previous.filter(p=>p.topics.includes(id));
      const ratio = shareRatio(wr.length,wp.length,w.recent.length,w.previous.length,topicCount);
      return {months:w.months,bounds:w.bounds,recent:wr.length,previous:wp.length,
        corpusRecent:w.recent.length,corpusPrevious:w.previous.length,shareRatio:ratio,momentum:ratio-1,
        ...rawShares(wr.length,wp.length,w.recent.length,w.previous.length),
        enoughData:wr.length>=THRESHOLDS.recent && wp.length>=THRESHOLDS.previous,
        recentIds:ids(wr),previousIds:ids(wp),corpusRecentIds:w.recentIds,corpusPreviousIds:w.previousIds};
    });
    const supported = robustnessWindows.filter(w=>w.enoughData);
    const positiveWindows = supported.filter(w=>w.momentum>0 && w.rawShareChange>0).length;
    const robust = supported.length>=THRESHOLDS.supportedWindows && positiveWindows===supported.length;
    const ratio = shareRatio(r.length,p.length,recent.length,previous.length,topicCount);
    const raw = rawShares(r.length,p.length,recent.length,previous.length);
    const bins = binsFor(r,model.bounds), codeRate = rate(rs.codes,r.length), benchmarkRate = rate(rs.benchmarks,r.length);
    const gap = {code:codeRate===null?null:1-codeRate, benchmark:benchmarkRate===null?null:1-benchmarkRate};
    const components = {
      momentum:supported.length ? 100*supported.reduce((total,w)=>total+(w.rawShareChange>0 ? clamp(Math.log2(w.shareRatio)) : 0),0)/supported.length : 0,
      gap:r.length ? 100*(.6*gap.code+.4*gap.benchmark) : 0,
      sustained:r.length ? 100*clamp(3*Math.min(...bins.map(b=>b.count))/r.length) : 0,
      breadth:100*clamp(inst.ids.length/10)*(inst.coverage||0)
    };
    const priority = Object.entries(WEIGHTS).reduce((total,[key,weight])=>total+components[key]*weight,0);
    const eligibilityReasons = [];
    if (r.length<THRESHOLDS.recent) eligibilityReasons.push('recent-sample');
    if (p.length<THRESHOLDS.previous) eligibilityReasons.push('previous-sample');
    if (inst.ids.length<THRESHOLDS.institutions) eligibilityReasons.push('institution-count');
    if ((inst.coverage||0)<THRESHOLDS.institutionCoverageRate) eligibilityReasons.push('institution-coverage');
    const eligible = eligibilityReasons.length===0;
    const sustained = bins.every(b=>b.count>=THRESHOLDS.papersPerBin);
    const growing = ratio>1 && raw.rawShareChange>0;
    const status = eligible && growing && robust && sustained && priority>=THRESHOLDS.priority
      ? 'priority' : eligible && growing ? 'candidate' : 'watchlist';
    return {id,name:id,count:all.length,recent:r.length,previous:p.length,
      growth:(r.length+5)/(p.length+5)-1,momentum:ratio-1,...raw,
      codeRate,previousCodeRate:rate(ps.codes,p.length),benchmarkRate,previousBenchmarkRate:rate(ps.benchmarks,p.length),
      institutions:inst.ids.length,institutionCoverage:inst.paperIds.length,institutionCoverageRate:inst.coverage,
      concentration:inst.concentration,eligible,eligibilityReasons,status,priority,components,gap,
      sustained,bins,robustness:{windows:robustnessWindows,positiveWindows,eligibleWindows:supported.length,robust},
      counts:{recent:r.length,previous:p.length,codes:rs.codes,previousCodes:ps.codes,benchmarks:rs.benchmarks,previousBenchmarks:ps.benchmarks},
      evidence:{allIds:ids(all),recentIds:rs.ids,previousIds:ps.ids,codeIds:rs.codeIds,previousCodeIds:ps.codeIds,
        benchmarkIds:rs.benchmarkIds,previousBenchmarkIds:ps.benchmarkIds,institutionIds:inst.ids,institutionPaperIds:inst.paperIds}};
  }).filter(Boolean).sort((a,b)=>b.priority-a.priority || b.recent-a.recent || a.id.localeCompare(b.id));
  const pairs = OPPORTUNITY_PAIRS.map(pair=>{
    const both = p => pair.topics.every(t=>p.topics.includes(t));
    const either = p => pair.topics.some(t=>p.topics.includes(t));
    const all = papers.filter(both), r = recent.filter(both), p = previous.filter(both);
    const ur = recent.filter(either), up = previous.filter(either);
    const rs = evidenceSummary(r), ps = evidenceSummary(p), inst = institutionEvidence(r);
    const overlapRate = rate(r.length,ur.length), previousOverlapRate = rate(p.length,up.length);
    const smallSample = r.length<THRESHOLDS.recent || p.length<THRESHOLDS.previous;
    return {...pair,count:all.length,recent:r.length,previous:p.length,unionRecent:ur.length,unionPrevious:up.length,
      overlapRate,previousOverlapRate,
      // Pair momentum is the change in raw co-occurrence share within the union (percentage points / 100).
      momentum:overlapRate===null || previousOverlapRate===null ? null : overlapRate-previousOverlapRate,
      institutions:inst.ids.length,institutionCoverage:inst.paperIds.length,institutionCoverageRate:inst.coverage,
      codeRate:rate(rs.codes,r.length),benchmarkRate:rate(rs.benchmarks,r.length),
      previousCodeRate:rate(ps.codes,p.length),previousBenchmarkRate:rate(ps.benchmarks,p.length),
      smallSample,status:smallSample?'watchlist':'observed',
      evidence:{allIds:ids(all),recentIds:rs.ids,previousIds:ps.ids,unionRecentIds:ids(ur),unionPreviousIds:ids(up),
        codeIds:rs.codeIds,previousCodeIds:ps.codeIds,benchmarkIds:rs.benchmarkIds,previousBenchmarkIds:ps.benchmarkIds,
        institutionIds:inst.ids,institutionPaperIds:inst.paperIds}};
  });
  return {meta:{methodVersion:'atlas-opportunities-v1',asOf:model.asOf,months:model.months,scope:'filtered-corpus',
    thresholds:{...THRESHOLDS},notes:[
      'All signals describe the recorded and currently filtered collection, not research quality, impact, risk severity or real-world urgency.',
      'Missing repository links mean no link is recorded here; they do not establish that code was not released.',
      'Benchmark-form coverage measures the mix of recorded research forms; low coverage does not establish that relevant benchmarks are unavailable.',
      'Share momentum uses five pseudo-observations per topic and the full filtered-corpus denominator. Multi-label topic shares do not sum to one.',
      'Positive-growth gates require both raw and smoothed share increases, so smoothing alone cannot qualify an unchanged or falling share.',
      'Robustness checks agreement across overlapping 3/6/12-month windows with at least 20 recent and 5 prior works; it is not a statistical significance test.',
      'Institution breadth and concentration use recorded ROR identities and cannot establish independent replication.',
      'The six intersections are curated prompts. Counts measure topic-label co-occurrence; sparse co-occurrence alone does not establish a missed research opportunity.',
      'Historical cutoffs are recalculated using current metadata; they are not archived snapshots.'
    ]},formula:{weights:{...WEIGHTS},scoreRange:[0,100],
      momentum:'100 × mean(clamp(log2(smoothed corpus-share ratio), 0, 1)) across supported 3/6/12-month windows; a window contributes zero when its raw share does not increase',
      gap:'100 × [0.6 × (1 − recorded repository-link rate) + 0.4 × (1 − benchmark-form rate)]',
      sustained:'100 × min(1, 3 × smallest within-window bin count / recent count); three contiguous equal-day bins',
      breadth:'100 × min(1, unique recorded ROR institutions / 10) × ROR-covered-paper rate',
      priority:'0.45 × momentum + 0.30 × gap + 0.15 × sustained + 0.10 × breadth',
      selection:'Eligibility + positive current raw and smoothed share momentum + all supported windows positive in both (at least two) + at least two papers in each bin + score at least 55',
      gapInterpretation:'Recorded resource and research-form coverage is a prompt to inspect infrastructure needs, not evidence that infrastructure is absent.',
      pairMomentum:'Recent intersection / recent union minus previous intersection / previous union; null when either union is empty'},
    corpus:{recent:evidenceSummary(recent),previous:evidenceSummary(previous)},topics,pairs};
}
