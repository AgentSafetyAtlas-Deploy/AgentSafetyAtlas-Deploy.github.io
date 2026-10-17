// All scores describe this collection. No citation, career-stage or adoption inference.
export const DIMENSIONS = ['volume', 'momentum', 'breadth', 'continuity', 'code', 'publication'];
export const PRESETS = {
  rising: [10, 45, 10, 10, 15, 10],
  established: [30, 10, 10, 25, 15, 10],
  artifacts: [15, 15, 10, 10, 40, 10]
};
const sum = a => a.reduce((x, y) => x + y, 0);
const unique = a => [...new Set(a)];
const day = 86400000;
export const authorKey = name => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
export function shiftMonth(iso, delta) {
  const d = new Date(iso + 'T00:00:00Z'), dom = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + delta);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dom, last));
  return d.toISOString().slice(0, 10);
}
export function windowBounds(asOf, months) {
  const end = new Date(Date.parse(asOf + 'T00:00:00Z') + day).toISOString().slice(0, 10);
  return {end, start: shiftMonth(end, -months), previous: shiftMonth(end, -months * 2)};
}
export function weightsFor(preset, custom) {
  const a = String(custom || '').split(',').map(Number);
  return a.length === 6 && a.every(x => Number.isFinite(x) && x >= 0 && x <= 100) && sum(a) > 0
    ? a : [...(PRESETS[preset] || PRESETS.rising)];
}
export function percentile(values, value) {
  if (!values.length || values.every(x => x === values[0])) return 50;
  return 100 * (values.filter(x => x < value).length + (values.filter(x => x === value).length - 1) / 2) / (values.length - 1);
}
function aggregateEntities(papers, kind, db, bounds) {
  const names = new Map(db.institutions.map(x => [x.id, x.name])), groups = new Map();
  for (const p of papers) {
    const ids = kind === 'researchers' ? unique(p.authors.map(authorKey)) : p.institutions;
    for (const id of ids) {
      if (!groups.has(id)) groups.set(id, {id, name: kind === 'researchers' ? p.authors.find(a => authorKey(a) === id) : names.get(id) || id, papers: [], credit: 0});
      const g = groups.get(id); g.papers.push(p); g.credit += 1 / ids.length;
    }
  }
  const result = [...groups.values()].map(g => {
    const recent = g.papers.filter(p => p.date >= bounds.start);
    const previous = g.papers.filter(p => p.date >= bounds.previous && p.date < bounds.start);
    const credited = ps => sum(ps.map(p => 1 / (kind === 'researchers' ? unique(p.authors.map(authorKey)).length : p.institutions.length)));
    const rc = credited(recent), pc = credited(previous);
    const activeYears = new Set(g.papers.filter(p => p.date >= shiftMonth(bounds.end, -36)).map(p => {
      const age = (Date.parse(bounds.end) - Date.parse(p.date)) / day;
      return Math.min(2, Math.floor(age / 365.25));
    })).size;
    return {...g, count: g.papers.length, recent: recent.length, previous: previous.length,
      recentCredit: rc, previousCredit: pc, growth: (rc + 1) / (pc + 1) - 1,
      activeYears, codes: g.papers.filter(p => p.code).length,
      raw: {volume: Math.log1p(g.credit), momentum: Math.max(0, Math.log2((rc + 1) / (pc + 1))) * Math.log1p(rc),
        breadth: unique(g.papers.flatMap(p => p.topics)).length, continuity: activeYears,
        code: (g.papers.filter(p => p.code).length + 1) / (g.papers.length + 2),
        publication: (g.papers.filter(p => p.published).length + 1) / (g.papers.length + 2)}};
  }).filter(g => g.count >= 3);
  // Normalize once over the eligible cohort; search and table pagination never change scores.
  const distributions = Object.fromEntries(DIMENSIONS.map(k => [k, result.map(g => g.raw[k]).sort((a,b) => a-b)]));
  function pct(sorted, value) {
    if (sorted.length < 2 || sorted[0] === sorted[sorted.length - 1]) return 50;
    let lo = 0, hi = sorted.length;
    while (lo < hi) {const m = (lo + hi) >> 1; if (sorted[m] < value) lo = m + 1; else hi = m;}
    const lower = lo; hi = sorted.length;
    while (lo < hi) {const m = (lo + hi) >> 1; if (sorted[m] <= value) lo = m + 1; else hi = m;}
    return 100 * (lower + (lo - lower - 1) / 2) / (sorted.length - 1);
  }
  return result.map(g => ({...g, components: Object.fromEntries(DIMENSIONS.map(k => [k, pct(distributions[k], g.raw[k])]))}));
}
export function rankEntities(entities, weights, preset) {
  return entities.filter(g => preset !== 'rising' || g.recent >= 3).map(g => ({
    ...g, score: sum(DIMENSIONS.map((k, i) => g.components[k] * weights[i])) / sum(weights)
  })).sort((a,b) => b.score-a.score || b.recent-a.recent || a.id.localeCompare(b.id));
}
export function computeInsights(db, settings = {}) {
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(settings.asOf || '') && settings.asOf <= db.meta.cutoff &&
    !Number.isNaN(Date.parse(settings.asOf)) && new Date(settings.asOf).toISOString().slice(0,10) === settings.asOf
    ? settings.asOf : db.meta.cutoff;
  const months = [3,6,12].includes(+settings.months) ? +settings.months : 12;
  const bounds = windowBounds(asOf, months);
  const papers = db.papers.filter(p => p.date <= asOf && (!settings.topic || p.topics.includes(settings.topic)));
  const recent = papers.filter(p => p.date >= bounds.start), previous = papers.filter(p => p.date >= bounds.previous && p.date < bounds.start);
  const topics = db.topics.map(id => {
    const all = papers.filter(p => p.topics.includes(id)), r = recent.filter(p => p.topics.includes(id)), p = previous.filter(p => p.topics.includes(id));
    const credits = new Map();
    for (const paper of r) for (const inst of paper.institutions) credits.set(inst, (credits.get(inst) || 0) + 1 / paper.institutions.length);
    const total = sum([...credits.values()]);
    const hhi = total ? sum([...credits.values()].map(x => (x / total) ** 2)) : null;
    // Compare changes in corpus share, with five pseudo-observations per topic.
    const shareRatio = ((r.length + 5) / (recent.length + 5 * db.topics.length)) /
      ((p.length + 5) / (previous.length + 5 * db.topics.length));
    return {id, name:id, papers:all, recent:r.length, previous:p.length, count:all.length,
      growth:(r.length + 5) / (p.length + 5) - 1, momentum:shareRatio - 1,
      authors:unique(r.flatMap(p => p.authors.map(authorKey))).length, institutions:credits.size, hhi,
      institutionCoverage:r.filter(p => p.institutions.length).length,
      codes:r.filter(p => p.code).length, benchmarks:r.filter(p => p.benchmark).length,
      missing:r.filter(p => !p.code).length};
  }).filter(x => x.count);
  const active = topics.filter(x => x.recent >= 5);
  const activity = active.map(x => x.recent).sort((a,b) => a-b);
  const median = activity.length ? activity[Math.floor(activity.length / 2)] : 0;
  for (const topic of topics) {
    topic.crowding = topic.recent < 5 ? null :
      .45 * percentile(active.map(x => x.recent), topic.recent) +
      .20 * percentile(active.map(x => x.authors), topic.authors) +
      .20 * percentile(active.map(x => x.institutions), topic.institutions) +
      .15 * (topic.hhi === null ? 0 : (1 - topic.hhi) * 100);
    topic.quadrant = topic.recent < 5 ? 'small' : topic.recent >= median
      ? (topic.momentum > 0 ? 'hot' : 'established') : (topic.momentum > 0 ? 'emerging' : 'niche');
  }
  return {asOf, months, bounds, papers, recent, previous, topics, median,
    researchers:aggregateEntities(papers, 'researchers', db, bounds),
    institutions:aggregateEntities(papers, 'institutions', db, bounds)};
}
export function rankRepositories(db, topic = '', sort = 'readiness') {
  const reference = Date.parse(db.meta.repositoryDate || db.meta.repositorySnapshot);
  const daysSince = s => s ? (reference - Date.parse(s)) / day : NaN;
  return db.repositories.filter(r => !topic || (r.topics || []).includes(topic)).map(r => {
    const age = daysSince(r.pushedAt), releaseAge = daysSince(r.latestReleaseAt);
    const parts = {
      maintenance:r.archived ? 0 : age >= 0 && age <= 90 ? 25 : age > 90 && age <= 365 ? 12.5 : 0,
      release:!r.archived && releaseAge >= 0 && releaseAge <= 365 ? 15 : 0,
      license:r.license && !['NOASSERTION','OTHER','unknown'].includes(r.license) ? 15 : 0,
      documentation:(r.offers || []).includes('documentation') ? 15 : 0,
      experiments:(r.offers || []).includes('experiment_scripts') ? 15 : 0,
      linkage:Math.min(3, r.papers.length) / 3 * 15
    };
    return {...r, id:r.repo, name:r.repo, parts, score:sum(Object.values(parts)), age};
  }).sort((a,b) => (sort === 'stars' ? (b.stars || 0) - (a.stars || 0) : b.score-a.score) || a.repo.localeCompare(b.repo));
}
