// Lenses (redesign 2026-10): the findings pages 演化 / 衔接 / 引领 / 攻防 / 对象 / 导航, the minor-findings page and the method
// page, all from data/findings.json (build_findings.py). A lens is a list of questions; each question has a one-line answer
// filled from the data and its evidence below. Every aggregate opens into the works or sentences behind it; nothing here is
// typed in by hand except the wording of the sentences.
let dataset, loading;
export async function loadFindings() {
  if (!loading) loading = fetch('./data/findings.json').then(r => {
    if (!r.ok) throw Error('Findings data unavailable');
    return r.json();
  }).then(d => dataset = d).catch(e => {loading = null; throw e;});
  return loading;
}

const COLORS = {attention: '#00897a', connection: '#c26541', supply: '#6458aa'};
const SERIES = ['#336aab', '#c26541', '#905082', '#5e8c2e', '#6458aa', '#ab4440'];
let INK = '#1c6a57', RING = '#fff';
const isDark = () => document.documentElement.dataset.theme !== 'light';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = n => n == null ? '—' : Number(n).toLocaleString('en-US');
const pctf = (v, d = 1) => v == null ? '—' : Number(v).toFixed(d) + '%';
const share = (v, d = 1) => v == null ? '—' : pctf(100 * v, d);
let C, T, P, byId, drawer = {items: [], title: ''};

function setup(ctx) {
  C = ctx; T = ctx.t; P = dataset;
  if (!byId || byId.size !== ctx.data.papers.length) byId = new Map(ctx.data.papers.map(p => [p.id, p]));
  // chart colours validated for each surface (dataviz validator: light #fcfcfb, dark #10302b)
  const d = isDark();
  Object.assign(COLORS, d ? {attention: '#24a593', connection: '#d4714b', supply: '#8f80d6'} : {attention: '#00897a', connection: '#c26541', supply: '#6458aa'});
  SERIES.splice(0, SERIES.length, ...(d ? ['#4f8fd4', '#d4714b', '#a670bd', '#6fa33c', '#8f80d6', '#d65f5c'] : ['#336aab', '#c26541', '#905082', '#5e8c2e', '#6458aa', '#ab4440']));
  INK = d ? '#5fbf9f' : '#1c6a57';
  RING = d ? '#0b1f1c' : '#fff';
}
const cl = k => C.topicName(P.meta.clusters[k]);
const galaxy = g => C.translated ? C.translated(P.meta.galaxies[g].en) : P.meta.galaxies[g].en;
const clusterColor = k => P.meta.galaxies[P.meta.clusterGalaxy[k]].color;
const title = id => byId.get(id)?.title || id;
const year = id => byId.get(id)?.displayYear || '';
const paperLink = (id, cls = 'fd-paper') => `<button class="${cls}" data-fd-paper="${esc(id)}">${esc(title(id))}</button>`;
function listButton(ids, label, heading) {
  if (!ids || !ids.length) return '';
  const key = 'L' + Math.random().toString(36).slice(2, 9);
  lists.set(key, {ids, heading});
  return `<button class="fd-more" data-fd-list="${key}">${label} ↗</button>`;
}
const lists = new Map();
function status(s) {
  const m = {supported: [T('Consistent so far', '目前一致'), 'ok'], mixed: [T('Mixed', '部分一致'), 'mixed'],
    notSupported: [T('Not observed', '未观察到'), 'no'], untestable: [T('Not testable yet', '暂不可检验'), 'na']}[s] || [s, 'na'];
  return `<span class="fd-status fd-status-${m[1]}">${m[0]}</span>`;
}
const hyp = id => (P.hypotheses || []).find(h => h.id === id) || {status: 'untestable', values: {}};
function head(id, kicker, h, sub) {
  return `<div class="fd-head" id="fd-${id}"><span class="fd-kicker">${kicker}</span><h2>${h}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;
}

// ------------------------------------------------------------------------------------------------ universe + fractures
// ------------------------------------------------------------------------------------------------ trends
function country(code) {
  try { return new Intl.DisplayNames([C.state.lang === 'zh' ? 'zh-CN' : 'en'], {type: 'region'}).of(code); } catch { return code; }
}
function bars(values, labels, color, {fmt = v => v, w = 220, h = 70, partialLast = false} = {}) {
  const vals = values.map(v => v ?? 0), max = Math.max(1e-9, ...vals), n = vals.length, bw = (w - 8) / n;
  return `<svg viewBox="0 0 ${w} ${h + 16}" class="fd-tbars">${vals.map((v, i) => {
    const bh = (h - 14) * v / max, x = 4 + i * bw, y = h - bh;
    return `<rect x="${x + 1}" y="${y}" width="${bw - 2}" height="${bh}" rx="2" fill="${color}" opacity="${partialLast && i === n - 1 ? 0.45 : 1}" data-tip="${esc(labels[i] + ': ' + fmt(values[i]))}"/>${i === 0 || i === n - 1 ? `<text x="${x + bw / 2}" y="${y - 3}" text-anchor="middle" class="fd-axis">${esc(fmt(values[i]))}</text>` : ''}`;
  }).join('')}${labels.map((l, i) => i === 0 || i === n - 1 ? `<text x="${4 + i * bw + bw / 2}" y="${h + 12}" text-anchor="middle" class="fd-axis">${esc(l)}</text>` : '').join('')}</svg>`;
}
function lineChart(years, series, {w = 640, h = 250, partialLast = true} = {}) {
  const left = 34, right = 150, top = 12, bottom = 26, max = Math.max(...series.flatMap(s => s.values.map(v => v ?? 0))) * 1.08;
  const x = i => left + i * (w - left - right) / (years.length - 1), y = v => top + (h - top - bottom) * (1 - (v ?? 0) / max);
  let svg = `<svg viewBox="0 0 ${w} ${h}" class="fd-line" role="img">`;
  for (const t of (max > 55 ? [0, 25, 50, 75, 100] : [0, 10, 20, 30, 40, 50]).filter(t => t <= max)) svg += `<line x1="${left}" x2="${w - right}" y1="${y(t)}" y2="${y(t)}" class="fd-grid"/><text x="${left - 6}" y="${y(t) + 4}" text-anchor="end" class="fd-axis">${t}%</text>`;
  years.forEach((yr, i) => svg += `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" class="fd-axis">${yr}${partialLast && i === years.length - 1 ? '*' : ''}</text>`);
  const ends = series.map(s => ({s, y: y(s.values[s.values.length - 1])})).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 13) ends[k].y = ends[k - 1].y + 13;
  const over = ends.length ? ends[ends.length - 1].y - (h - bottom - 4) : 0;
  if (over > 0) ends.forEach(e => e.y -= over);
  series.forEach(s => {
    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`), n = pts.length;
    svg += `<polyline points="${pts.slice(0, partialLast ? n - 1 : n).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2"/>`;
    if (partialLast) svg += `<polyline points="${pts.slice(n - 2).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="3 3"/>`;
    s.values.forEach((v, i) => svg += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}" stroke="${RING}" stroke-width="1.5" data-tip="${esc(`${s.label} · ${years[i]}: ${pctf(v)}`)}"/>`);
  });
  ends.forEach(({s, y: yy}) => svg += `<text x="${w - right + 26}" y="${yy + 4}" class="fd-axis fd-endlabel" fill="${s.color}">${esc(s.label)} ${pctf(s.values[s.values.length - 1], 0)}</text>`);
  return svg + '</svg>';
}
function miniBars(vals) {
  const max = Math.max(1, ...vals), w = 90, h = 22, bw = w / vals.length;
  return `<svg viewBox="0 0 ${w} ${h}" class="fd-mini">${vals.map((v, i) => `<rect x="${i * bw + 1}" y="${h - (h - 2) * v / max}" width="${bw - 2}" height="${(h - 2) * v / max}" fill="${INK}" opacity="${i === vals.length - 1 ? 0.45 : 0.85}"/>`).join('')}</svg>`;
}
function listKey(ids, heading) {
  const key = 'L' + Math.random().toString(36).slice(2, 9);
  lists.set(key, {ids, heading});
  return key;
}

function universe() {
  const u = P.universe;
  const m = [[u.works, T('stars · works', '星 · 研究工作')], [u.clusters, T('clusters · topics', '星团 · 主题')], [u.galaxies, T('galaxies · themes', '星系 · 大方向')],
    [u.candidateClusters, T('candidate clusters (automatic)', '候选星团（自动）')], [u.citationRoutes, T('citation routes inside the Atlas', 'Atlas 内引用航线')],
    [u.benchmarkUseRoutes, T('benchmark-use routes with a sentence', '带原句的基准采用航线')], [u.institutions, T('institutions (ROR)', '机构（ROR）')], [u.countries, T('countries', '国家与地区')]];
  return `<section class="fd-section fd-universe">${head('universe', T('THE UNIVERSE AT A GLANCE', '宇宙概览'), T('What was observed', '观测到了什么'),
    T(`Analysis ${P.meta.analysisVersion || ''} on data release ${P.meta.release}, works dated up to ${P.universe.asOf}. ${num(u.onSemanticScholar)} works were found on Semantic Scholar and ${num(u.referenceListed)} have a reference list; ${num(u.fullTexts)} full texts were read locally for benchmark use.`,
      `分析版本 ${P.meta.analysisVersion || ''}（基于数据 ${P.meta.release}），工作日期截至 ${P.universe.asOf}。${num(u.onSemanticScholar)} 项工作在 Semantic Scholar 上找到，${num(u.referenceListed)} 项有参考文献列表；本地读取了 ${num(u.fullTexts)} 篇全文以识别基准采用。`))}
  <div class="fd-metrics">${m.map(([v, l]) => `<div><b>${num(v)}</b><span>${l}</span></div>`).join('')}</div></section>`;
}

function fractures() {
  const f = P.fractures, s = f.scale, imp = f.importance, tl = f.timeliness, a = P.audit;
  const card = (n, name, symptom, measured, response, open) => `<article class="fd-fracture"><span class="fd-fracture-n">${n}</span><h3>${name}</h3><p class="fd-symptom">${symptom}</p><ul>${measured.map(x => `<li>${x}</li>`).join('')}</ul><p class="fd-response"><b>${T('Response', '宇宙中的回应')}</b> ${response}</p>${open ? `<p class="fd-open"><b>${T('Still to measure', '尚待测量')}</b> ${open}</p>` : ''}</article>`;
  return `<section class="fd-section">${head('fractures', T('THE FOUR FRACTURES, MEASURED', '四种断裂的实测证据'), T('Why the field has to be organized', '为什么这个领域必须被组织'),
    T('Each fracture in the paper needs a measurable symptom, not only a statement. Below: what the current snapshot shows for each.', '论文中的每种断裂都要有可测的证据，而不只是一句陈述。以下是当前快照中各自的表现。'))}
  <div class="fd-fractures">
  ${card(1, T('Scale fracture', '尺度断裂'), T('Single papers, links between topics and field trends are hard to switch between and trace back.', '单篇论文、主题间联系与领域趋势难以沿同一证据链切换与回查。'),
    [T(`${pctf(s.multiClusterPct)} of works sit in two or more clusters, ${pctf(s.multiGalaxyPct)} in two or more galaxies.`, `${pctf(s.multiClusterPct)} 的工作同时属于两个以上星团，${pctf(s.multiGalaxyPct)} 跨两个以上星系。`),
     T(`${pctf(s.crossClusterPct)} of the ${num(f.basis.citationRoutes)} citation routes join works that share no cluster; ${pctf(s.crossGalaxyPct)} join works that share no galaxy.`, `${num(f.basis.citationRoutes)} 条引用航线中，${pctf(s.crossClusterPct)} 连接的两项工作没有共同星团，${pctf(s.crossGalaxyPct)} 没有共同星系。`),
     T('Because labels are this liberal, a "cross-cluster star" should be defined by its observed routes (the bridge band), not by carrying several labels.', '由于标签这样宽松，“跨团星”应按观测到的航线定义（桥梁波段），而不是按是否带多个标签。')],
    T('every number on this page decomposes into works and routes (buttons marked ↗).', '本页每个数字都能拆回工作与航线（带 ↗ 的按钮）。'),
    T('share of published figures recomputed from the frozen v1 package.', '由冻结 v1 资源包复算的发布数字比例。'))}
  ${card(2, T('Recommendation-basis fracture', '推荐依据断裂'), T('Finding a paper does not explain why it is relevant, why to read it first, or how it links to another line.', '找到一篇论文，不等于解释了它为何相关、为何先读、如何连接另一条研究线。'),
    [T(`All ${num(f.basis.citationRoutes)} citation routes carry a record-level source (the citing work's reference list on Semantic Scholar).`, `全部 ${num(f.basis.citationRoutes)} 条引用航线都有记录级出处（施引工作在 Semantic Scholar 上的参考文献列表）。`),
     ...(f.basis.citationSentence != null ? [T(`${num(f.basis.citationSentence)} citation routes also carry the citing sentence (Semantic Scholar contexts; ${num(f.basis.contextCoverage[0])} of ${num(f.basis.contextCoverage[1])} citing works fetched so far). Open a paper in the star map to read them.`, `${num(f.basis.citationSentence)} 条引用航线还带有施引原句（Semantic Scholar 引用上下文；目前已获取 ${num(f.basis.contextCoverage[1])} 篇施引工作中的 ${num(f.basis.contextCoverage[0])} 篇）。在星图中打开一篇论文即可阅读。`)] : []),
     T(`${num(f.basis.benchmarkUseRoutes)} benchmark-use routes point to the sentence in the citing paper (spot-check precision ${pctf(a?.precision)}, 95% CI ${a?.precisionCI?.join('–')}%); that is ${pctf(f.basis.sentenceLevelPct)} of all routes.`, `${num(f.basis.benchmarkUseRoutes)} 条基准采用航线指向施引论文中的原句（抽查精确率 ${pctf(a?.precision)}，95% 置信区间 ${a?.precisionCI?.join('–')}%），占全部航线的 ${pctf(f.basis.sentenceLevelPct)}。`)],
    T('typed routes with their basis; reasons in every band list are counts you can check.', '有类型、有出处的航线；每个波段列表的理由都是可核对的计数。'),
    f.basis.contextCoverage && f.basis.contextCoverage[0] >= f.basis.contextCoverage[1] ? T('the hallucination rate of an LLM reading-list baseline.', 'LLM 阅读清单基线的虚构论文率。') : T('citing sentences for the remaining citation routes (fetch in progress) and the hallucination rate of an LLM reading-list baseline.', '其余引用航线的施引原句（正在获取），以及 LLM 阅读清单基线的虚构论文率。'))}
  ${card(3, T('Importance fracture', '重要性判断断裂'), T('Relevant, cited, foundational, bridging, recent and reusable get mixed into one ranking.', '相关、热门、基础、桥梁、最新、可复用常被混成同一种排序。'),
    [T(`Top-10 lists of the four bands overlap by ${share(imp.meanBandOverlap)} on average.`, `四个波段的前 10 名平均重合 ${share(imp.meanBandOverlap)}。`),
     T(`Citation and bridging rankings: median Kendall τ ${imp.medianTauCitationBridge} across clusters (global vs in-Atlas citations: ${imp.medianTauGlobalLocal}).`, `引用排序与桥接排序：各星团 Kendall τ 中位数 ${imp.medianTauCitationBridge}（全局引用与 Atlas 内引用：${imp.medianTauGlobalLocal}）。`),
     T(`Citation ranking gives recent works ${imp.novaGlobalTop20} of ${imp.top20Slots} top-20 slots although they are ${pctf(imp.novaShareCorpus)} of the corpus.`, `新作占语料 ${pctf(imp.novaShareCorpus)}，按引用排序却只得到 ${imp.top20Slots} 个前 20 席位中的 ${imp.novaGlobalTop20} 个。`)],
    T('observation bands instead of one leaderboard; new stars compared only with their own cohort.', '用观测波段代替单一排行榜；新星只与同期参照组比较。'))}
  ${card(4, T('Timeliness fracture', '时效断裂'), T('New work appears weekly; surveys and trend reports lag by months, and ad-hoc “latest” numbers cannot be compared later.', '新工作每周出现，综述与趋势报告往往滞后数月；临时拼出的“最新”数字下次无法对照。'),
    [T(`Doubling time ${tl.doublingMonths} months (${tl.doublingWindow.join('–')}).`, `翻倍时间 ${tl.doublingMonths} 个月（${tl.doublingWindow.join('–')}）。`),
     T(`Median survey: newest Atlas reference ${tl.surveyLag.newestRefMonths} months before release; ${tl.surveyLag.nearSince} of its 300 nearest works are newer than it after ${tl.surveyLag.surveyAgeMonths} months.`, `中位综述：最新的 Atlas 参考文献比其发表早 ${tl.surveyLag.newestRefMonths} 个月；发表 ${tl.surveyLag.surveyAgeMonths} 个月后，其 300 个最近邻中已有 ${tl.surveyLag.nearSince} 篇晚于它。`),
     T(`Scheduled updates (${tl.intake.releases.join(', ')}): ${num(tl.intake.works)} arXiv works added a median ${tl.intake.medianDays} days after submission; ${pctf(tl.intake.within14)} within 14 days.`, `定期更新（${tl.intake.releases.join('、')}）：${num(tl.intake.works)} 项 arXiv 工作在提交后中位 ${tl.intake.medianDays} 天入库，${pctf(tl.intake.within14)} 在 14 天内。`)],
    T('Mon/Thu intake; every figure here carries its snapshot and is recomputed with the same procedure.', '每周一、四入库；这里每个数字都注明快照，并用同一流程重算。'))}
  </div></section>`;
}

// ------------------------------------------------------------------------------------------------ RQ1
function barCell(v, max, color) {
  const w = v == null ? 0 : Math.max(0, Math.min(100, 100 * v / max));
  return `<span class="fd-bar"><span style="width:${w}%;background:${color}"></span></span>`;
}
// ------------------------------------------------------------------------------------------------ RQ2
const LAYERS = () => ({semantic: [T('Semantic similarity', '语义相似'), T('mean SPECTER2 cosine between the two clusters', '两个星团间 SPECTER2 平均余弦')],
  citeRatio: [T('Citation flow', '引用流'), T('observed citations between the clusters ÷ expected from their citing and cited volume', '星团间观测引用数 ÷ 按施引与被引规模的期望值')],
  collab: [T('Shared institutions', '共同机构'), T('cosine of works-per-institution profiles (ROR)', '按机构（ROR）计的工作数分布余弦')],
  resource: [T('Shared benchmarks', '共用基准'), T('cosine of benchmark-use profiles', '基准采用分布余弦')]});
function heatmap(layer) {
  const K = P.meta.clusters.length, pairs = new Map(P.rq2.pairs.map(p => [p.a + '-' + p.b, p])), cell = 26, left = 210, top = 8;
  const w = left + K * cell + 10, h = top + K * cell + 10;
  const ramp = v => { const t = v / 100, [a, b] = isDark() ? [[22, 58, 52], [212, 233, 102]] : [[235, 243, 240], [16, 82, 66]]; return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`; };
  let out = `<svg viewBox="0 0 ${w} ${h}" class="fd-heat" role="img" aria-label="${esc(LAYERS()[layer][0])}"><defs><pattern id="fd-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="${isDark() ? '#123430' : '#f3f6f5'}"/><line x1="0" y1="0" x2="0" y2="5" stroke="${isDark() ? '#2c5049' : '#c9d6d3'}" stroke-width="1.5"/></pattern></defs>`;
  for (let i = 0; i < K; i++) {
    out += `<text x="${left - 8}" y="${top + i * cell + cell / 2 + 4}" text-anchor="end" class="fd-axis">${esc(cl(i))}</text><rect x="${left - 6}" y="${top + i * cell + 6}" width="3" height="${cell - 12}" fill="${clusterColor(i)}"/>`;
    for (let j = 0; j < i; j++) {
      const p = pairs.get(j + '-' + i);
      if (!p) continue;
      const res = p.resource == null ? T(`not observed (fewer than ${P.rq2.minUsers} works with benchmark use on one side)`, `未观测（某一侧有基准采用的工作少于 ${P.rq2.minUsers} 项）`) : `${p.resource.toFixed(3)}, ${p.sharedBench} ${T('shared', '个共用')} (${p.pct.resource}th)`;
      const tip = `${cl(j)} × ${cl(i)}\n${LAYERS().semantic[0]}: ${p.semantic.toFixed(3)} (${p.pct.semantic}th pct)\n${LAYERS().citeRatio[0]}: ${p.citeObs} / ${p.citeExp} = ${p.citeRatio}× (${p.pct.citeRatio}th)\n${LAYERS().collab[0]}: ${p.collab.toFixed(3)} (${p.pct.collab}th)\n${LAYERS().resource[0]}: ${res}`;
      const v = p.pct[layer];
      out += `<rect class="fd-cell${v == null ? ' fd-cell-na' : ''}" x="${left + j * cell + 1}" y="${top + i * cell + 1}" width="${cell - 2}" height="${cell - 2}" rx="3" ${v == null ? '' : `fill="${ramp(v)}"`} data-tip="${esc(tip)}" data-fd-pair="${j}-${i}"/>`;
    }
  }
  return out + '</svg>';
}
const pctCells = p => Object.entries(LAYERS()).map(([k, [l]]) => `<span><small>${l}</small>${p.pct[k] == null ? `<b class="is-na" title="${esc(T('Too few observed benchmark uses on one side', '某一侧观测到的基准采用太少'))}">${T('n/o', '未观测')}</b>` : `<b>${p.pct[k]}</b>`}</span>`).join('');
function pairCard(p, kind) {
  const ex = p.examples || {};
  return `<article class="fd-pair"><h4><span style="background:${clusterColor(p.a)}"></span>${esc(cl(p.a))} <i>×</i> <span style="background:${clusterColor(p.b)}"></span>${esc(cl(p.b))}</h4>
  <div class="fd-pair-pcts">${pctCells(p)}</div>
  <p class="fd-note">${T(`${p.citeObs} citations observed where ${p.citeExp} were expected (${p.citeRatio}×); ${p.sharedBench} benchmarks used on both sides.`, `观测到 ${p.citeObs} 次引用，期望 ${p.citeExp} 次（${p.citeRatio}×）；两侧共用 ${p.sharedBench} 个基准。`)}</p>
  ${kind === 'a' && ex.closeNotCiting?.length ? `<h5>${T('Closest pairs that do not cite each other', '内容最接近却互不引用的论文对')}</h5><ul class="fd-pairs">${ex.closeNotCiting.slice(0, 3).map(([x, y, s]) => `<li>${paperLink(x)}<span class="fd-sim">${s}</span>${paperLink(y)}</li>`).join('')}</ul>` : ''}
  ${kind === 'b' && p.benchEvidence?.length ? `<h5>${T('Shared benchmarks, with the sentences that use them', '共用的基准及采用原句')}</h5><ul class="fd-evidence">${p.benchEvidence.slice(0, 4).map(e => `<li><b>${esc(title(e.benchmark).split(':')[0])}</b> · ${paperLink(e.user)}<q>${esc(e.evidence)}</q></li>`).join('')}</ul>` : ''}
  ${ex.citing?.length ? `<details><summary>${T('Citations that do exist', '已存在的引用')} (${ex.citing.length})</summary><ul class="fd-pairs">${ex.citing.map(([x, y]) => `<li>${paperLink(x)}<span class="fd-sim">→</span>${paperLink(y)}</li>`).join('')}</ul></details>` : ''}</article>`;
}
function h2bNote() {
  const c = {};
  P.rq2.h2b.forEach(([a, b]) => { c[a] = (c[a] || 0) + 1; c[b] = (c[b] || 0) + 1; });
  const top = Object.entries(c).sort((x, y) => y[1] - x[1])[0];
  if (!top || top[1] < 3) return '';
  return `<p class="fd-note"><b>${T(`${top[1]} of the ${P.rq2.h2b.length} pairs involve ${cl(+top[0])}`, `${P.rq2.h2b.length} 对中有 ${top[1]} 对涉及“${cl(+top[0])}”`)}</b>${T(': its works evaluate on the same benchmarks as clusters whose papers they rarely cite.', '：它的工作与那些很少被它引用的星团在同样的基准上评测。')}</p>`;
}
// ------------------------------------------------------------------------------------------------ RQ3
function rankPlot() {
  const rows = [...P.rq3.clusters].sort((a, b) => a.rank.works - b.rank.works), K = rows.length, left = 220, right = 30, rowH = 28, top = 30, W = 760;
  const x = r => left + (r - 1) * (W - left - right) / (K - 1);
  const marks = [['works', COLORS.attention, 'circle', T('Attention: works', '关注：工作数')], ['crossShare', COLORS.connection, 'diamond', T('Connection: share of routes leaving the cluster', '连接：离开本星团的航线占比')], ['suppliedOutside', COLORS.supply, 'square', T('Supply: benchmark uses by other clusters', '供给：被其他星团采用的基准次数')]];
  const shape = (s, cx, cy, c, tip) => s === 'circle' ? `<circle cx="${cx}" cy="${cy}" r="5.5" fill="${c}" stroke="${RING}" stroke-width="2" data-tip="${esc(tip)}"/>`
    : s === 'diamond' ? `<path d="M${cx} ${cy - 7}L${cx + 7} ${cy}L${cx} ${cy + 7}L${cx - 7} ${cy}Z" fill="${c}" stroke="${RING}" stroke-width="2" data-tip="${esc(tip)}"/>`
      : `<rect x="${cx - 5.5}" y="${cy - 5.5}" width="11" height="11" rx="2" fill="${c}" stroke="${RING}" stroke-width="2" data-tip="${esc(tip)}"/>`;
  let svg = `<svg viewBox="0 0 ${W} ${top + K * rowH + 30}" class="fd-rank" role="img" aria-label="${T('Rank of each cluster by attention, connection and supply', '各星团在关注、连接、供给三项上的排名')}">`;
  for (let r = 1; r <= K; r++) svg += `<line x1="${x(r)}" x2="${x(r)}" y1="${top - 8}" y2="${top + K * rowH - 8}" class="fd-grid"/>${r === 1 || r % 3 === 0 || r === K ? `<text x="${x(r)}" y="${top - 14}" text-anchor="middle" class="fd-axis">#${r}</text>` : ''}`;
  rows.forEach((row, i) => {
    const cy = top + i * rowH + 4, rs = marks.map(([k]) => row.rank[k]);
    svg += `<text x="${left - 12}" y="${cy + 4}" text-anchor="end" class="fd-axis">${esc(cl(row.cluster))}</text><line x1="${x(Math.min(...rs))}" x2="${x(Math.max(...rs))}" y1="${cy}" y2="${cy}" class="fd-span"/>`;
    marks.forEach(([k, c, s, l], m) => svg += shape(s, x(row.rank[k]), cy + (m - 1) * 5, c, `${cl(row.cluster)}\n${l}: #${row.rank[k]} (${k === 'crossShare' ? pctf(row[k]) : num(row[k])})`));
  });
  svg += `<text x="${left}" y="${top + K * rowH + 14}" class="fd-axis">${T('← higher rank', '← 排名更高')}</text></svg>`;
  return `<div class="fd-legend">${marks.map(([k, c, s, l]) => `<span><svg width="14" height="14" viewBox="0 0 14 14">${s === 'circle' ? `<circle cx="7" cy="7" r="5.5" fill="${c}"/>` : s === 'diamond' ? `<path d="M7 0L14 7L7 14L0 7Z" fill="${c}"/>` : `<rect x="1.5" y="1.5" width="11" height="11" rx="2" fill="${c}"/>`}</svg>${l}</span>`).join('')}</div>${svg}`;
}
// ------------------------------------------------------------------------------------------------ RQ4
function spark(values, incomplete, color, w = 230, h = 64) {
  const max = Math.max(1, ...values), n = values.length, x = i => 4 + i * (w - 8) / (n - 1), y = v => h - 6 - (h - 14) * v / max;
  const full = values.slice(0, n - incomplete), pts = full.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const tail = incomplete ? values.slice(n - incomplete - 1).map((v, i) => `${x(n - incomplete - 1 + i)},${y(v)}`).join(' ') : '';
  return `<svg viewBox="0 0 ${w} ${h}" class="fd-spark"><polygon points="${x(0)},${h - 6} ${pts} ${x(full.length - 1)},${h - 6}" fill="${color}" opacity=".14"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>${tail ? `<polyline points="${tail}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3 3" opacity=".6"/>` : ''}<text x="${w - 4}" y="12" text-anchor="end" class="fd-axis">${num(max)}</text></svg>`;
}
// ------------------------------------------------------------------------------------------------ Web, hypotheses, method
function web() {
  const w = P.web, hosts = w.resourceHosts, tot = Object.values(hosts).reduce((a, b) => a + b, 0), it = P.fractures.timeliness.intake;
  return `<section class="fd-section">${head('web', T('WEB RELEVANCE', 'Web 相关性'), T('Scattered Web knowledge, linked and observed', '分散在 Web 上的知识：关联与观测'),
    T('The WWW resource track asks for a Web question answered with analysis, not only the use of Web data. These figures support §4 and §6.4.', 'WWW 资源方向要求回答 Web 相关问题并给出分析，而不只是使用 Web 数据。这些数字支撑第 4 节与 6.4 节。'))}
  <div class="fd-metrics"><div><b>${pctf(w.arxivPct)}</b><span>${T('of works have an arXiv record', '的工作有 arXiv 记录')}</span></div><div><b>${pctf(w.unverifiedPct)}</b><span>${T('have no verified venue yet', '尚无核实的正式发表')}</span></div>
  <div><b>${pctf(100 * hosts['github.com'] / tot)}</b><span>${T('of paper resources sit on GitHub', '的论文配套资源位于 GitHub')} · ${pctf(100 * (hosts['huggingface.co'] || 0) / tot)} Hugging Face</span></div><div><b>${pctf(w.worksWithCodePct)}</b><span>${T('of works link code or data', '的工作链接了代码或数据')}</span></div>
  <div><b>${num(w.paperReposArchived)} / ${num(w.paperRepos)}</b><span>${T('paper repositories archived', '个论文仓库已归档')} · ${num(w.paperReposUnavailable)} ${T('unavailable', '个不可访问')}</span></div><div><b>${it.medianDays} ${T('days', '天')}</b><span>${T('median arXiv-to-Atlas delay (scheduled updates)', 'arXiv 到 Atlas 的中位延迟（定期更新）')}</span></div></div></section>`;
}
function hypotheses() {
  const rule = {H1: T('Consistent if salience beats citation ranking on recall@50 and shows more recent works in its top 20.', '若显著度的召回@50 高于引用排序且前 20 中近期工作更多，则一致。'),
    H2a: T('Consistent if at least two cluster pairs are in the top quarter semantically and the bottom quarter for citation flow.', '若至少两对星团语义位于前四分之一、引用流位于后四分之一，则一致。'),
    H2b: T('Consistent if at least two pairs are below the median for citation flow and in the top quarter for shared benchmarks.', '若至少两对星团引用流低于中位数、共用基准位于前四分之一，则一致。'),
    H3: T('Consistent if ρ(works, outside supply) < 0.6 and at least three top-15 suppliers are outside the top 15 by output.', '若 ρ（工作数，外部供给）< 0.6，且至少三个供给前 15 的机构不在产出前 15，则一致。'),
    H4a: T('Consistent if benchmarks reach five works at least six months after attacks in three or more clusters.', '若至少三个星团的基准比攻击晚 6 个月以上达到 5 项，则一致。'),
    H4b: T('Consistent if young candidate clusters send at least 10 points more of their references outside their topic than older ones.', '若年轻候选星团指向本主题之外的参考文献比例比较老星团高至少 10 个百分点，则一致。')};
  const caveat = {H1: T('Survey references favour cited works; no expert lists yet; adoption signal not in the formula.', '综述参考文献偏向高被引工作；尚无专家清单；采用信号未纳入。'),
    H2a: T('Depends on reference-list coverage; few pairs qualify.', '依赖参考文献覆盖；满足条件的星团对很少。'), H2b: T('Benchmark-use extraction: ~85% precision, roughly half the uses found.', '基准采用抽取：精确率约 85%，约能找到一半的采用。'),
    H3: T('Supply counts only Atlas benchmarks; ROR coverage incomplete.', '供给只计 Atlas 内的基准；ROR 覆盖不完整。'), H4a: T('Title-keyword labels for attack/defence are unaudited.', '攻击/防御的标题关键词标签未经审计。'),
    H4b: T('Older works are less covered; candidate clusters are automatic.', '较早工作覆盖较少；候选星团为自动生成。')};
  const v = x => { const d = x.values || {}; return ({
    H1: T(`recall@50 ${share(d.salienceRecall50)} vs ${share(d.citationRecall50)}; recent in top 20 ${share(d.salienceNova20)} vs ${share(d.citationNova20)}; ${d.surveys} surveys`, `召回@50 ${share(d.salienceRecall50)} 对 ${share(d.citationRecall50)}；前 20 中近期工作 ${share(d.salienceNova20)} 对 ${share(d.citationNova20)}；${d.surveys} 篇综述`),
    H2a: T(`${d.pairs} of ${d.of} pairs; ρ(semantic, citation) = ${d.rhoSemanticCitation}`, `${d.of} 对中 ${d.pairs} 对；ρ（语义，引用）= ${d.rhoSemanticCitation}`),
    H2b: T(`${d.pairs} of ${d.of} pairs; ρ(citation, benchmarks) = ${d.rhoCitationResource}`, `${d.of} 对中 ${d.pairs} 对；ρ（引用，基准）= ${d.rhoCitationResource}`),
    H3: T(`ρ(works, supply) = ${d.rhoWorksSupply} for clusters, ${d.instCorr} for institutions; ${d.supplyNotOutput} top suppliers outside the top 15 by output`, `星团 ρ（工作数，供给）= ${d.rhoWorksSupply}，机构 ${d.instCorr}；${d.supplyNotOutput} 个供给前 15 的机构不在产出前 15`),
    H4a: T(`${d.clustersLate6} of ${d.clusters} clusters lag ≥ 6 months; median lag ${d.medianLag} months`, `${d.clusters} 个星团中 ${d.clustersLate6} 个滞后 ≥ 6 个月；中位滞后 ${d.medianLag} 个月`),
    H4b: T(`${pctf(d.youngCross)} vs ${pctf(d.oldCross)} of references leave the topic (${d.youngWithRefs} young, ${d.oldWithRefs} older)`, `${pctf(d.youngCross)} 对 ${pctf(d.oldCross)} 的参考文献指向主题之外（年轻 ${d.youngWithRefs} 个，较老 ${d.oldWithRefs} 个）`)}[x.id] || ''); };
  return `<section class="fd-section">${head('hyp', T('HYPOTHESES', '假设'), T('Where each hypothesis stands on this snapshot', '各假设在本快照上的状态'),
    T('Statuses follow fixed rules, computed with each analysis version. "Consistent so far" is the strongest status: these are observations, not tests on held-out data. The paper\'s ¶7 should only report what survives the frozen v1 snapshot.', '状态按固定规则随每个分析版本计算。“目前一致”是最强的状态：这些是观察，不是留出数据上的检验。论文 ¶7 只报告在冻结 v1 快照上仍然成立的结果。'))}
  <table class="fd-table fd-hyptable"><thead><tr><th></th><th>${T('Status', '状态')}</th><th>${T('Rule', '规则')}</th><th>${T('Values', '数值')}</th><th>${T('Main caveat', '主要局限')}</th></tr></thead><tbody>${P.hypotheses.map(x => `<tr><th>${x.id}</th><td>${status(x.status)}</td><td>${rule[x.id] || ''}</td><td class="fd-values">${v(x)}</td><td>${caveat[x.id] || ''}</td></tr>`).join('')}</tbody></table></section>`;
}
function method() {
  const a = P.audit, m = P.meta;
  return `<section class="fd-section">${head('method', T('METHOD & LIMITS', '方法与局限'), T('How these numbers are made', '这些数字是怎样得到的'))}
  <div class="fd-method">
  <div><h4>${T('Routes (relations)', '航线（关系）')}</h4><p>${T('Citation: the citing work\'s Semantic Scholar reference list, matched to Atlas works by Semantic Scholar id, arXiv id or DOI. Benchmark use: a sentence in the citing work\'s full text (read locally, before its reference list) that names an Atlas benchmark and either speaks in the first person about evaluating, testing or adopting, or reports results on it; negated sentences and descriptions of the benchmark itself do not count. Layout proximity and semantic similarity are never routes.', '引用：施引工作在 Semantic Scholar 上的参考文献列表，按 Semantic Scholar id、arXiv id 或 DOI 匹配到 Atlas 工作。基准采用：施引工作全文（本地读取，参考文献列表之前）中提到某个 Atlas 基准的句子，且作者以第一人称谈评测、测试或采用，或报告在其上的结果；否定句和对该基准本身的描述不算。布局邻近与语义相似从不算作航线。')}</p></div>
  <div><h4>${T('Benchmark-use spot check', '基准采用抽查')}</h4><p>${a ? T(`${a.correct} of ${a.checked} sampled use routes were real uses: precision ${pctf(a.precision)} (95% CI ${a.precisionCI.join('–')}%). ${a.mentionsUse} of ${a.mentionsChecked} sampled non-use mentions were in fact uses, so roughly half of all uses are found. ${a.stillApplicable} of ${a.judged} judged sentences still match a route under the current rule and are counted. Checked on ${a.date} by ${a.reviewer}.`,
    `抽样的 ${a.checked} 条采用航线中 ${a.correct} 条确为采用：精确率 ${pctf(a.precision)}（95% 置信区间 ${a.precisionCI.join('–')}%）。抽样的 ${a.mentionsChecked} 条非采用提及中有 ${a.mentionsUse} 条其实是采用，因此大约只找到一半的采用。${a.judged} 条判定中有 ${a.stillApplicable} 条在当前规则下仍对应航线并计入。抽查日期 ${a.date}，抽查者：${a.reviewer === 'Claude (the assistant that wrote the rule); not an independent audit' ? '编写该规则的助手 Claude，非独立审计' : a.reviewer}。`) : T('No spot check recorded.', '暂无抽查记录。')}</p>
  ${a?.wrong?.length ? `<details><summary>${T('The sentences judged not to be uses', '被判为非采用的句子')} (${a.wrong.length})</summary><ul class="fd-evidence">${a.wrong.map(x => `<li><b>${esc(x.name)}</b> · ${paperLink(x.user)}<q>${esc(x.evidence)}</q></li>`).join('')}</ul></details>` : ''}</div>
  <div><h4>${T('Definitions used here (proposed)', '此处采用的定义（建议值）')}</h4><ul><li>${T(`New star: first posted less than τ = ${m.novaMonths} months before the snapshot.`, `新星：快照前不足 τ = ${m.novaMonths} 个月首次发布。`)}</li><li>${T(`Reference group g(p) = (cluster, year, form); falls back to (cluster, year), then year, below ${m.minGroup} works with a citation count.`, `参照组 g(p) =（星团，年份，类型）；有引用数的工作少于 ${m.minGroup} 项时依次退到（星团，年份）和年份。`)}</li><li>${T('Bridge B: participation coefficient of a work\'s observed citation routes over clusters (at least 3 routes).', '桥接 B：一项工作观测到的引用航线在各星团上的参与系数（至少 3 条航线）。')}</li><li>${T('Clusters are the editorial topics; candidate clusters are automatic (HDBSCAN on SPECTER2) and labelled as candidates.', '星团即编辑主题；候选星团为自动生成（SPECTER2 上的 HDBSCAN），并标为候选。')}</li></ul></div>
  <div><h4>${T('Not yet measured (needed for the paper)', '尚未测量（论文需要）')}</h4><ul><li>${T('LLM reading-list baseline and its hallucination rate (RQ1).', 'LLM 阅读清单基线及其虚构论文率（RQ1）。')}</li><li>${T('Expert must-read lists for 15–25 directions (RQ1 reference sets).', '15–25 个方向的专家必读清单（RQ1 参照集）。')}</li><li>${T('Co-authorship by external author ids (RQ2 collaboration layer currently uses institutions).', '基于外部作者 ID 的合作关系（RQ2 合作层目前用机构代替）。')}</li><li>${T('Two-person audit of relations and a frozen v1 snapshot with a DOI.', '关系的独立双人审计，以及带 DOI 的冻结 v1 快照。')}</li><li>${T('Method and baseline adoption beyond benchmarks (U for non-benchmark works).', '基准之外的方法与基线采用（非基准工作的 U）。')}</li></ul></div>
  </div><p class="fd-note">${T(`Computed on ${m.computedOn} from snapshot ${m.release} by build_findings.py (seed ${m.seed}). Data: Semantic Scholar Academic Graph, cached full texts, Atlas records.`, `${m.computedOn} 由 build_findings.py 基于快照 ${m.release} 计算（随机种子 ${m.seed}）。数据：Semantic Scholar Academic Graph、缓存全文、Atlas 记录。`)}</p></section>`;
}

function openDrawer(heading, body) {
  const d = document.querySelector('.fd-drawer');
  d.querySelector('h3').textContent = heading;
  d.querySelector('.fd-drawer-body').innerHTML = body;
  d.hidden = false;
  d.querySelector('.fd-close').focus();
}
function paperRows(ids) {
  return `<p class="fd-note">${T(`${ids.length} works`, `${ids.length} 项工作`)}</p><ol class="fd-drawer-list">${ids.map(id => `<li>${paperLink(id)}<small>${esc(year(id))}${byId.get(id)?.venue ? ' · ' + esc(byId.get(id).venue) : ''}</small></li>`).join('')}</ol>`;
}
function pairDrawer(a, b) {
  const p = P.rq2.pairs.find(x => x.a === a && x.b === b) || P.rq2.pairs.find(x => x.a === b && x.b === a);
  if (!p) return;
  const detail = P.rq2.h2aDetail.concat(P.rq2.h2bDetail).find(x => x.a === p.a && x.b === p.b);
  openDrawer(`${cl(p.a)} × ${cl(p.b)}`, detail ? pairCard(detail, P.rq2.h2a.some(([x, y]) => x === p.a && y === p.b) ? 'a' : 'b')
    : `<div class="fd-pair-pcts">${pctCells(p)}</div><p class="fd-note">${T(`${p.citeObs} citations observed where ${p.citeExp} were expected (${p.citeRatio}×); ${p.sharedInst} institutions and ${p.sharedBench} benchmarks appear on both sides.`, `观测到 ${p.citeObs} 次引用，期望 ${p.citeExp} 次（${p.citeRatio}×）；两侧共有 ${p.sharedInst} 个机构、${p.sharedBench} 个基准。`)}</p>${p.sharedBenchTop?.length ? `<h5>${T('Shared benchmarks', '共用基准')}</h5><ul class="fd-drawer-list">${p.sharedBenchTop.map(id => `<li>${paperLink(id)}</li>`).join('')}</ul>` : ''}`);
}

export function bindLenses(ctx) {
  setup(ctx);
  const root = document.querySelector('.fd');
  if (!root) return;
  const tip = root.querySelector('.fd-tip');
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-fd-ids],[data-fd-paper],[data-fd-list],[data-fd-jump],[data-fd-layer],[data-fd-pair],[data-fd-bench],[data-ln-lens],[data-ln-goto],[data-ln-q],[data-ln-ms-kind],[data-ln-insight],.fd-close');
    if (!el) return;
    if (el.matches('.fd-close')) { root.querySelector('.fd-drawer').hidden = true; return; }
    if (el.dataset.fdIds) { const l = lists.get(el.dataset.fdIds); if (l) openDrawer(l.heading, paperRows(l.ids)); return; }
    if (el.dataset.fdPaper) return ctx.openPaper(el.dataset.fdPaper);
    if (el.dataset.fdList) { const l = lists.get(el.dataset.fdList); if (l) openDrawer(l.heading, paperRows(l.ids)); return; }
    if (el.dataset.fdJump) { document.getElementById('fd-' + el.dataset.fdJump)?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); return; }
    if (el.dataset.fdLayer) { ctx.state.findingsLayer = el.dataset.fdLayer; ctx.writeHash(); rerender(ctx, '[data-ln-layers]'); return; }
    if (el.dataset.lnLens) { ctx.state.lens = el.dataset.lnLens === 'key' ? '' : el.dataset.lnLens; ctx.writeHash(); ctx.render(); window.scrollTo({top: 0, behavior: 'instant'}); return; }
    if (el.dataset.lnGoto) {
      const [lens, qid] = el.dataset.lnGoto.split(':');
      ctx.state.lens = lens; ctx.writeHash(); ctx.render();
      requestAnimationFrame(() => document.getElementById('q-' + qid)?.scrollIntoView({block: 'start'}));
      return;
    }
    if (el.dataset.lnQ) { document.getElementById('q-' + el.dataset.lnQ)?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); return; }
    if (el.dataset.lnInsight) { ctx.state.insightTab = el.dataset.lnInsight; ctx.setView('insights'); return; }
    if (el.dataset.lnMsKind) {
      const on = new Set(milestoneModel().kinds), k = el.dataset.lnMsKind;
      on.has(k) ? on.delete(k) : on.add(k);
      ctx.state.msKinds = MS_KINDS().map(z => z[0]).filter(z => on.has(z)).join(',') || 'attack';
      ctx.writeHash(); rerender(ctx, '.ln-ms-controls'); return;
    }
    if (el.dataset.fdPair) { const [a, b] = el.dataset.fdPair.split('-').map(Number); pairDrawer(a, b); return; }
    if (el.dataset.fdBench) {
      const b = P.benchmarks.find(x => x.id === el.dataset.fdBench);
      openDrawer(b.name, `<p>${paperLink(b.id)}</p><p class="fd-note">${T(`Used by ${b.users} Atlas works (${b.usersOutside} share none of its clusters); first use ${b.firstUse || '—'}. Latest uses:`, `被 ${b.users} 项 Atlas 工作采用（其中 ${b.usersOutside} 项与它没有共同星团）；首次采用 ${b.firstUse || '—'}。最近的采用：`)}</p><ul class="fd-evidence">${b.evidence.map(x => `<li>${paperLink(x.user)}<q>${esc(x.evidence)}</q></li>`).reverse().join('')}</ul><h5>${T('All users', '全部采用者')}</h5>${paperRows(b.userIds)}`);
    }
  });
  root.querySelector('[data-fd-cluster]')?.addEventListener('change', e => { ctx.state.findingsCluster = e.target.value; ctx.writeHash(); rerender(ctx, '.fd-bands'); });
  // the timeline: N moves while dragging (label only), the chart redraws on release; several timelines share the state
  for (const r of root.querySelectorAll('[data-ln-ms="n"]')) {
    r.addEventListener('input', e => { e.target.nextElementSibling.textContent = e.target.value; });
    r.addEventListener('change', e => { ctx.state.msN = e.target.value; ctx.writeHash(); rerender(ctx, '#' + e.target.closest('.ln-q').id); });
  }
  for (const s of root.querySelectorAll('[data-ln-ms="from"]')) s.addEventListener('change', e => { ctx.state.msFrom = e.target.value; ctx.writeHash(); rerender(ctx, '#' + e.target.closest('.ln-q').id); });
  root.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.getAttribute('data-tip');
    tip.hidden = false;
    const r = el.getBoundingClientRect(), host = root.getBoundingClientRect();
    tip.style.left = Math.min(host.width - 300, Math.max(0, r.left - host.left + r.width / 2 - 140)) + 'px';
    tip.style.top = (r.bottom - host.top + 8) + 'px';
  });
  root.addEventListener('mouseleave', () => { tip.hidden = true; });
  if (!escBound) {
    escBound = true;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { const d = document.querySelector('.fd-drawer'); if (d && !d.hidden) d.hidden = true; } });
  }
}
let escBound = false;
function rerender(ctx, anchor) {
  const el = document.querySelector(anchor), y = el ? el.getBoundingClientRect().top : 0;
  ctx.render();
  const again = document.querySelector(anchor);
  if (again) window.scrollBy(0, again.getBoundingClientRect().top - y);
}

// ================================================================================================ evidence blocks
// Each block is the evidence under one question; it has no heading of its own (the question is the heading).
const B = {
  growth() {
    const g = P.rq4.growth, inc = g.incomplete.length, qs = g.quarters, start = qs.indexOf('2022Q1');
    return `<p class="fd-note">${T(`Works with a dated first appearance, from 2022. Dashed: the current, incomplete quarter. Doubling time from a log-linear fit over ${g.fitWindow.join('–')}. A work in several galaxies counts in each; each panel has its own scale (maximum at top right).`, `按首次出现日期计，自 2022 年起。虚线为当前未完整的季度。翻倍时间来自 ${g.fitWindow.join('–')} 的对数线性拟合。一项工作跨多个星系时各计一次；每个小图刻度独立（右上角为最大值）。`)}</p>
    <div class="fd-multiples">${P.meta.galaxies.map((gx, i) => `<div class="fd-multiple"><h4><span style="background:${gx.color}"></span>${esc(galaxy(i))}</h4>${spark(g.byGalaxy[i].slice(start), inc, gx.color)}<small>${T('doubles every', '翻倍时间')} ${g.doublingByGalaxy[i] ?? '—'} ${T('months', '个月')}</small></div>`).join('')}
    <div class="fd-multiple is-total"><h4>${T('All works', '全部工作')}</h4>${spark(g.total.slice(start), inc, INK)}<small>${T('doubles every', '翻倍时间')} ${g.doublingMonths} ${T('months', '个月')}</small></div></div>`;
  },
  shift() {
    const cs = P.trends.clusterShares, rows = [...cs.rows].sort((a, b) => (b.shareRecent - b.shareBefore) - (a.shareRecent - a.shareBefore)), maxS = Math.max(...rows.flatMap(r => [r.shareBefore, r.shareRecent]));
    const W = 560, L = 220, sx = v => L + (W - L - 50) * v / maxS;
    return `<p class="fd-note">${T(`Fractional shares: a work splits one unit over its clusters, because recent works carry more labels (${cs.labelsRecent} per work vs ${cs.labelsBefore}); otherwise every share would seem to rise. Hollow dot: previous 12 months (${num(cs.beforeWorks)} works); filled dot: last 12 months (${num(cs.recentWorks)}). Numbers: change in percentage points.`, `按比例计份额：一项工作把 1 份分给它所属的各星团，因为近期工作的标签更多（每项 ${cs.labelsRecent} 个，之前 ${cs.labelsBefore} 个），否则所有份额都会显得上升。空心点：前 12 个月（${num(cs.beforeWorks)} 项）；实心点：近 12 个月（${num(cs.recentWorks)} 项）。数字为百分点变化。`)}</p>
    <svg viewBox="0 0 ${W} ${rows.length * 24 + 30}" class="fd-dumbbell" role="img" aria-label="${esc(T('Cluster shares, previous 12 months vs last 12 months', '星团份额：前 12 个月与近 12 个月'))}">${[0, 5, 10, 15].filter(t => t <= maxS).map(t => `<line x1="${sx(t)}" x2="${sx(t)}" y1="10" y2="${rows.length * 24 + 8}" class="fd-grid"/><text x="${sx(t)}" y="${rows.length * 24 + 24}" text-anchor="middle" class="fd-axis">${t}%</text>`).join('')}${rows.map((r, i) => {
      const y = 20 + i * 24, up = r.shareRecent >= r.shareBefore, c = clusterColor(r.cluster);
      return `<text x="${L - 10}" y="${y + 4}" text-anchor="end" class="fd-axis">${esc(cl(r.cluster))}</text><line x1="${sx(r.shareBefore)}" x2="${sx(r.shareRecent)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="2.5" opacity=".55"/><circle cx="${sx(r.shareBefore)}" cy="${y}" r="4.5" fill="${RING}" stroke="${c}" stroke-width="2" data-tip="${esc(`${cl(r.cluster)}\n${T('previous 12 months', '前 12 个月')}: ${pctf(r.shareBefore)} (${r.before} ${T('works', '项')})`)}"/><circle cx="${sx(r.shareRecent)}" cy="${y}" r="5" fill="${c}" data-tip="${esc(`${cl(r.cluster)}\n${T('last 12 months', '近 12 个月')}: ${pctf(r.shareRecent)} (${r.recent} ${T('works', '项')})`)}"/><text x="${sx(Math.max(r.shareBefore, r.shareRecent)) + 9}" y="${y + 4}" class="fd-axis ${up ? 'fd-up' : 'fd-down'}">${up ? '+' : ''}${(r.shareRecent - r.shareBefore).toFixed(1)}</text>`;
    }).join('')}</svg>`;
  },
  terms() {
    const terms = P.trends.terms;
    const termRow = x => `<tr><th><button class="fd-paper" data-fd-ids="${esc(listKey(x.ids, T(`Recent works with “${x.term}” in the title`, `标题含“${x.term}”的近期工作`)))}">${esc(x.term)}</button></th><td>${num(x.recent)}</td><td>${num(x.earlier)}</td><td>${x.lift}×</td><td>${miniBars(x.quarters)}</td></tr>`;
    const tableHead = `<thead><tr><th>${T('Word', '词')}</th><th>${T('Recent', '近期')}</th><th>${T('Earlier', '之前')}</th><th>${T('Lift', '倍数')}</th><th>${T('Per quarter', '季度')}</th></tr></thead>`;
    return `<p class="fd-note">${T(`Last 6 months (${num(terms.recentWorks)} works) vs the 18 months before (${num(terms.earlierWorks)}); at least 15 recent titles; lift = change in the share of titles using the word. Bars: titles per quarter. Click a word for its works.`, `近 6 个月（${num(terms.recentWorks)} 项）对比之前 18 个月（${num(terms.earlierWorks)} 项）；近期至少 15 个标题；倍数 = 使用该词的标题比例之比。柱：每季度标题数。点词查看论文。`)}</p>
    <div class="fd-two"><div><h4>${T('Rising', '上升')}</h4><table class="fd-table fd-terms">${tableHead}<tbody>${terms.rising.map(termRow).join('')}</tbody></table></div>
    <div><h4>${T('Fading', '下降')}</h4><table class="fd-table fd-terms">${tableHead}<tbody>${terms.fading.map(termRow).join('')}</tbody></table>
    <h4>${T('Emerging candidate clusters', '新兴的候选星团')}</h4><p class="fd-note">${T('Automatic groups (keywords from their titles and abstracts) with at least 60% of their works from the last 6 months.', '自动分组（关键词取自标题与摘要），其中至少 60% 的工作来自近 6 个月。')}</p>
    <div class="fd-emerging">${P.trends.emerging.slice(0, 8).map(e => `<div><b>${esc((e.label || []).join(' · '))}</b><span>${esc(e.topic != null ? cl(e.topic) : '')} · ${e.size} ${T('works', '项')} · ${pctf(e.recentShare, 0)} ${T('in 6 months', '近 6 个月')}</span><button class="fd-more" data-fd-ids="${esc(listKey(e.ids, (e.label || []).join(' · ')))}">${T('Works', '工作')} ↗</button></div>`).join('')}</div></div></div>`;
  },
  milestones() {
    const m = milestoneModel(), W = 520, X0 = 6;
    const t0 = Date.UTC(m.from, 0, 1), t1 = Date.parse(P.universe.asOf), xx = ym => X0 + (W - 2 * X0) * (Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 15) - t0) / (t1 - t0);
    const kinds = MS_KINDS().filter(([k]) => m.kinds.includes(k));
    const dot = (k, ym, cnt, c) => {
      if (!ym) return '';
      const x = xx(ym), tip = `${c}\n${MS_KINDS().find(z => z[0] === k)[1]}: ${T(`work no. ${m.n} on ${ym}`, `${ym} 达到第 ${m.n} 项`)} (${T('total', '共')} ${cnt})`;
      const col = MS_COLOR()[k];
      return k === 'attack' ? `<circle cx="${x}" cy="10" r="5" fill="${col}" data-tip="${esc(tip)}"/>` : k === 'defense' ? `<path d="M${x} 4L${x + 6} 10L${x} 16L${x - 6} 10Z" fill="${col}" data-tip="${esc(tip)}"/>`
        : k === 'benchmark' ? `<rect x="${x - 5}" y="5" width="10" height="10" rx="2" fill="${col}" data-tip="${esc(tip)}"/>` : `<path d="M${x} 4L${x + 6} 15L${x - 6} 15Z" fill="${col}" data-tip="${esc(tip)}"/>`;
    };
    const years = []; for (let y = m.from; y <= +P.universe.asOf.slice(0, 4); y++) years.push(y);
    return `<div class="ln-ms-controls"><label>${T('Threshold N', '阈值 N')} <input type="range" min="1" max="50" value="${m.n}" data-ln-ms="n"><b>${m.n}</b></label>
      <label>${T('From', '起点')} <select data-ln-ms="from">${[2016, 2020, 2022, 2023, 2024].map(y => `<option value="${y}"${y === m.from ? ' selected' : ''}>${y}</option>`).join('')}</select></label>
      <span class="ln-ms-kinds">${MS_KINDS().map(([k, l]) => `<button class="ln-chip${m.kinds.includes(k) ? ' is-on' : ''}" data-ln-ms-kind="${k}" aria-pressed="${m.kinds.includes(k)}"><i style="background:${MS_COLOR()[k]}"></i>${l}</button>`).join('')}</span></div>
    <p class="fd-note">${T(`Each row is a cluster; each mark is the month in which the ${m.n}th work of that kind appeared (counted from ${m.from}). Sorted by how long benchmarks took after attacks.`, `每行一个星团；每个标记是该类工作（从 ${m.from} 年起计）达到第 ${m.n} 项的月份。按基准比攻击晚多久排序。`)} ${labelNote()}</p>
    <table class="fd-table ln-ms"><thead><tr><th>${T('Cluster', '星团')}</th><th><svg viewBox="0 0 ${W} 14" class="ln-ms-axis">${years.map(y => `<text x="${xx(y + '-01')}" y="11" class="fd-axis">${y}</text>`).join('')}</svg></th><th>${T('Benchmark after attack', '基准晚于攻击')}</th><th>${T('Defence after attack', '防御晚于攻击')}</th></tr></thead>
    <tbody>${m.rows.map(r => `<tr><th>${esc(cl(r.cluster))}</th><td><svg viewBox="0 0 ${W} 20" class="ln-ms-line"><line x1="${X0}" x2="${W - X0}" y1="10" y2="10" class="fd-grid"/>${kinds.map(([k]) => dot(k, r.at[k], r.count[k], cl(r.cluster))).join('')}</svg></td>
      <td class="${(r.benchLag ?? 0) >= 6 ? 'is-late' : ''}">${lagText(r.benchLag)}</td><td class="${(r.defLag ?? 0) >= 6 ? 'is-late' : ''}">${lagText(r.defLag)}</td></tr>`).join('')}</tbody></table>`;
  },
  crossYears() {
    const conn = P.rq4.connection, maxC = Math.max(...conn.map(c => c.crossPct)), h4b = P.rq4.threads.h4b;
    return `<div class="fd-hbars">${conn.map(c => `<div class="fd-hbar"><span>${c.year} <small>${T(`${num(c.routes)} routes · ${c.perWork} per work`, `${num(c.routes)} 条航线 · 每项 ${c.perWork} 条`)}</small></span>${barCell(c.crossPct, maxC * 1.15, COLORS.connection)}<b>${pctf(c.crossPct)}</b></div>`).join('')}</div>
    <p class="fd-note">${T('Share of citations (by the citing work\'s year) that land on a work sharing none of the citing work\'s clusters. The current year is incomplete.', '按施引工作年份计，落在与施引工作没有共同星团的工作上的引用比例。当年数据不完整。')}</p>
    <h4>${T('How young candidate clusters connect', '年轻候选星团如何接入')}</h4>
    <div class="fd-hbars"><div class="fd-hbar"><span>${T(`Young (median work ≤ 9 months old; ${h4b.youngWithRefs})`, `年轻（中位工作 ≤ 9 个月；${h4b.youngWithRefs} 个）`)}</span>${barCell(h4b.youngCross, 100, COLORS.connection)}<b>${pctf(h4b.youngCross)}</b></div><div class="fd-hbar"><span>${T(`Older (median > 18 months; ${h4b.oldWithRefs})`, `较老（中位 > 18 个月；${h4b.oldWithRefs} 个）`)}</span>${barCell(h4b.oldCross, 100, COLORS.connection)}<b>${pctf(h4b.oldCross)}</b></div></div>
    <p class="fd-note">${T('Median share of a candidate cluster\'s Atlas references that point outside its topic (clusters with at least 10 references). Older clusters cite older works, which the Atlas covers less: read the gap as a direction, not a size.', '候选星团的 Atlas 参考文献中指向本主题之外的比例的中位数（至少 10 条参考文献的星团）。较老星团引用的是更早的工作，Atlas 对其覆盖较少；差值只说明方向，不说明大小。')}</p>`;
  },
  publicationPath() {
    const pub = P.rq4.publication, lag = P.fractures.timeliness.surveyLag, vg = {ml3: T('ML top-3', 'ML 三大会'), security4: T('Security top-4', '安全四大会'), journals: T('Journals', '期刊'), other: T('Other venues', '其他会议')};
    return `<div class="fd-metrics fd-metrics-small"><div><b>${pctf(pub.preprintFirstPct)}</b><span>${T(`of published works were on arXiv before the venue (n = ${num(pub.withPublicationAndPreprint)})`, `的已发表工作先出现在 arXiv（n = ${num(pub.withPublicationAndPreprint)}）`)}</span></div>${Object.entries(pub.byVenueGroup).map(([k, [n, m]]) => `<div><b>${m} ${T('mo', '个月')}</b><span>${vg[k] || k} · ${T('median lag', '中位时滞')} · n = ${n}</span></div>`).join('')}</div>
    <h4>${T('Surveys age fast', '综述老得很快')}</h4>
    <div class="fd-metrics fd-metrics-small"><div><b>${lag.newestRefMonths} ${T('mo', '个月')}</b><span>${T('between a survey and its newest Atlas reference (median)', '综述与其最新 Atlas 参考文献之间的间隔（中位）')}</span></div><div><b>${lag.nearSince} / 300</b><span>${T(`of a survey's nearest works are newer than it, ${lag.surveyAgeMonths} months after release (median)`, `发表 ${lag.surveyAgeMonths} 个月后，综述最近邻中晚于它的工作数（中位）`)}</span></div><div><b>${lag.nearInGapCited} / ${lag.nearInGap}</b><span>${T(`works from its last ${lag.p90RefMonths} months of writing that it cites`, `其最后 ${lag.p90RefMonths} 个月写作期内出现、并被它引用的工作`)}</span></div></div>
    <p class="fd-note">${T(`${lag.surveys} surveys first posted since July 2024; nearest works by SPECTER2 similarity.`, `${lag.surveys} 篇 2024 年 7 月以后首次发布的综述；最近邻按 SPECTER2 相似度。`)}</p>`;
  },
  layers() {
    const layer = LAYERS()[C.state.findingsLayer] ? C.state.findingsLayer : 'citeRatio', corr = P.rq2.correlation, L = LAYERS(), keys = Object.keys(L);
    const corrTable = `<table class="fd-table fd-corr"><thead><tr><th></th>${keys.map(k => `<th>${L[k][0]}</th>`).join('')}</tr></thead><tbody>${keys.map(a => `<tr><th>${L[a][0]}</th>${keys.map(b => { const v = a === b ? 1 : corr[`${a}|${b}`] ?? corr[`${b}|${a}`]; return `<td style="background:rgba(${isDark() ? '212,233,102' : '28,106,87'},${a === b ? 0 : Math.max(0, v) * (isDark() ? 0.3 : 0.45)})">${a === b ? '—' : v?.toFixed(2)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    return `<div data-ln-layers><p class="fd-note">${T(`The same ${P.meta.clusters.length} clusters seen through four layers. Each pair is compared on works that belong to only one of the two clusters. Cells show the pair's percentile within the layer (brighter = more connected); hover for all four values, click for examples.`, `同一组 ${P.meta.clusters.length} 个星团，四层连接。每对星团只用分属其中一方的工作比较。格子显示该对在本层中的百分位（越亮越相连）；悬停查看四层数值，点击查看例子。`)}</p>
    <div class="fd-layer-tabs" role="tablist">${keys.map(k => `<button role="tab" aria-selected="${k === layer}" class="${k === layer ? 'active' : ''}" data-fd-layer="${k}">${L[k][0]}</button>`).join('')}</div>
    <p class="fd-note">${L[layer][1]}</p>
    <div class="fd-heat-wrap"><div class="fd-heat-scroll">${heatmap(layer)}</div><div class="fd-heat-side"><h4>${T('How much the layers agree', '各层之间的一致程度')}</h4>${corrTable}<p class="fd-note">${T(`Spearman correlation over ${P.rq2.pairs.length} cluster pairs.`, `基于 ${P.rq2.pairs.length} 个星团对的 Spearman 相关。`)}</p></div></div></div>`;
  },
  notReading() {
    return `<p class="fd-note">${T('Pairs in the top quarter for semantic similarity and the bottom quarter for citation flow.', '语义相似度位于前四分之一、引用流位于后四分之一的星团对。')} ${status(hyp('H2a').status)}</p>
    <div class="fd-pair-grid">${P.rq2.h2aDetail.map(p => pairCard(p, 'a')).join('') || `<p class="muted">${T('No pair meets the rule on this snapshot.', '本快照中没有星团对满足条件。')}</p>`}</div>`;
  },
  hubs() {
    const bench = P.benchmarks.slice(0, 15), maxU = Math.max(...bench.map(b => b.users));
    return `<div class="fd-bench">${bench.map(b => `<div class="fd-bench-row"><button data-fd-bench="${esc(b.id)}" class="fd-bench-name">${esc(b.name)}</button>${barCell(b.users, maxU, COLORS.supply)}<span>${T(`${b.users} works · ${b.clusters} clusters · first use ${b.firstUse || '—'}`, `${b.users} 项工作 · ${b.clusters} 个星团 · 首次采用 ${b.firstUse || '—'}`)}</span></div>`).join('')}</div>
    <p class="fd-note">${T('A use is a sentence in another Atlas work that evaluates on, adopts or reports results on the benchmark (see Method). Counts are a lower bound: only Atlas benchmarks with a distinctive name are matched. Click a benchmark for its users and sentences.', '“采用”指另一项 Atlas 工作中在该基准上评测、采用它或报告结果的句子（见方法）。计数是下限：只匹配名称独特的 Atlas 基准。点基准名查看采用者与原句。')}</p>
    <h4>${T('Pairs linked mainly through shared benchmarks', '主要经由共用基准相连的星团对')} ${status(hyp('H2b').status)}</h4>
    <p class="fd-note">${T('Pairs below the median for citation flow but in the top quarter for shared benchmarks.', '引用流低于中位数、共用基准位于前四分之一的星团对。')}</p>
    ${h2bNote()}
    <div class="fd-pair-grid">${P.rq2.h2bDetail.slice(0, 4).map(p => pairCard(p, 'b')).join('')}</div>
    ${P.rq2.h2b.length > 4 ? `<p class="fd-note">${T(`${P.rq2.h2b.length} pairs in total: `, `共 ${P.rq2.h2b.length} 对：`)}${P.rq2.h2b.slice(4).map(([a, b]) => `${esc(cl(a))} × ${esc(cl(b))}`).join(' · ')}</p>` : ''}`;
  },
  inflation() {
    const con = P.trends.concentration, reuse = con.benchmarkReuse, bu = con.benchmarkUses, yl = con.years.map(String), pc = v => v == null ? '—' : Number(v).toFixed(1) + '%';
    return `<div class="fd-tiles">${tile(T('New benchmark works per year', '每年新基准工作'), T(`of ${num(reuse.benchmarks)} named benchmarks older than 6 months, ${pctf(reuse.unusedPct)} have no recorded use by another Atlas work; ${reuse.usedThree} are used three or more times`, `在 ${num(reuse.benchmarks)} 个发布超过 6 个月的具名基准中，${pctf(reuse.unusedPct)} 没有被其他 Atlas 工作采用的记录；${reuse.usedThree} 个被采用 3 次以上`), reuse.benchmarkWorksByYear, yl, COLORS.supply, v => num(v))}
    ${tile(T('Most used benchmark\'s share of uses', '最常用基准的采用份额'), T(`by half-year of the using work; distinct benchmarks used: ${bu.map(x => x.distinct).join(' → ')}`, `按采用工作的半年计；被采用的不同基准数：${bu.map(x => x.distinct).join(' → ')}`), bu.map(x => x.top1Share), bu.map(x => x.half), COLORS.connection, pc)}</div>`;
  },
  rank() {
    const h = hyp('H3');
    return `<p class="fd-note">${T(`Three roles, ranked separately and never combined. Spearman ρ between works and outside supply: ${h.values.rhoWorksSupply}; works and citations: ${P.rq3.correlation['works|citations']}.`, `三种角色分别排序，从不合并。工作数与外部供给的 Spearman ρ：${h.values.rhoWorksSupply}；工作数与引用数：${P.rq3.correlation['works|citations']}。`)}</p>
    ${rankPlot()}
    <details class="fd-tableview"><summary>${T('Table view', '表格视图')}</summary><table class="fd-table"><thead><tr><th>${T('Cluster', '星团')}</th><th>${T('Works', '工作')}</th><th>${T('Citations', '引用')}</th><th>${T('Repository stars', '仓库星标')}</th><th>${T('Routes leaving', '外连航线')}</th><th>${T('Benchmarks', '基准')}</th><th>${T('Uses by other clusters', '被其他星团采用')}</th></tr></thead><tbody>${P.rq3.clusters.map(r => `<tr><th>${esc(cl(r.cluster))}</th><td>${num(r.works)}</td><td>${num(r.citations)}</td><td>${num(r.stars)}</td><td>${pctf(r.crossShare)}</td><td>${num(r.benchmarks)}</td><td>${num(r.suppliedOutside)}</td></tr>`).join('')}</tbody></table></details>`;
  },
  geo() {
    const geo = P.trends.geography, con = P.trends.concentration, pc = v => v == null ? '—' : Number(v).toFixed(1) + '%';
    const series = geo.countries.slice(0, 6).map((c, i) => ({label: country(c), color: SERIES[i], values: geo.share[c]}));
    return `<p class="fd-note">${T(`Share of located works by year; a work with institutions in several countries splits its credit. Located works per year: ${geo.located.map((n, i) => `${geo.years[i]} ${num(n)}`).join(' · ')}. Institution addresses, not nationalities.${con.corrections?.teamsSplit ? ` ${con.corrections.teamsSplit} wrong registry matches were corrected (${con.corrections.papersMoved} papers).` : ''}`, `按年份计的已定位工作份额；一项工作的机构分布在多个国家时按比例分摊。各年已定位工作数：${geo.located.map((n, i) => `${geo.years[i]} ${num(n)}`).join(' · ')}。统计的是机构地址，不是国籍。${con.corrections?.teamsSplit ? `已修正 ${con.corrections.teamsSplit} 个错误的机构登记匹配（${con.corrections.papersMoved} 篇）。` : ''}`)}</p>
    <div class="fd-geo">${lineChart(geo.years, series)}<div class="fd-geo-side"><h4>${T('International collaboration', '国际合作')}</h4>${bars(geo.international, geo.years.map(String), INK, {fmt: pc, partialLast: true})}<small>${T(`Share of located works with institutions in two or more countries. With both ${country('US')} and ${country('CN')} institutions: ${geo.usCn.map((v, i) => `${geo.years[i]} ${pc(v)}`).slice(-3).join(' · ')}.`, `机构分布在两个以上国家的已定位工作比例。同时有${country('US')}与${country('CN')}机构：${geo.usCn.map((v, i) => `${geo.years[i]} ${pc(v)}`).slice(-3).join(' · ')}。`)}</small></div></div>`;
  },
  lean() {
    const geo = P.trends.geography, lean = [...geo.byCluster].sort((a, b) => ((b.CN || 0) - (b.US || 0)) - ((a.CN || 0) - (a.US || 0)));
    const LW = 560, LL = 220, lx = v => LL + (LW - LL - 30) * v / 50;
    return `<div class="fd-legend"><span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="${SERIES[0]}"/></svg>${country('US')} · ${T('overall', '整体')} ${pctf(geo.overallSince2023.US)}</span><span><svg width="12" height="12"><rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="${SERIES[1]}"/></svg>${country('CN')} · ${T('overall', '整体')} ${pctf(geo.overallSince2023.CN)}</span></div>
    <svg viewBox="0 0 ${LW} ${lean.length * 22 + 30}" class="fd-dumbbell" role="img">${[0, 10, 20, 30, 40, 50].map(t => `<line x1="${lx(t)}" x2="${lx(t)}" y1="8" y2="${lean.length * 22 + 6}" class="fd-grid"/><text x="${lx(t)}" y="${lean.length * 22 + 22}" text-anchor="middle" class="fd-axis">${t}%</text>`).join('')}${lean.map((r, i) => {
      const y = 18 + i * 22;
      return `<text x="${LL - 10}" y="${y + 4}" text-anchor="end" class="fd-axis">${esc(cl(r.cluster))}</text><line x1="${lx(r.US || 0)}" x2="${lx(r.CN || 0)}" y1="${y}" y2="${y}" class="fd-span"/><circle cx="${lx(r.US || 0)}" cy="${y}" r="5" fill="${SERIES[0]}" data-tip="${esc(`${cl(r.cluster)} · ${country('US')}: ${pctf(r.US)}`)}"/><rect x="${lx(r.CN || 0) - 4.5}" y="${y - 4.5}" width="9" height="9" rx="2" fill="${SERIES[1]}" data-tip="${esc(`${cl(r.cluster)} · ${country('CN')}: ${pctf(r.CN)}`)}"/>`;
    }).join('')}</svg><p class="fd-note">${T('Works since 2023 with a located institution, fractional credit.', '2023 年以来有已定位机构的工作，按比例计。')}</p>`;
  },
  institutions() {
    const ins = P.rq3.institutions, row = Object.fromEntries(ins.rows.map(x => [x.id, x])), both = new Set(ins.top.works.filter(i => ins.top.supply.includes(i)));
    const instList = (key, label, val) => `<div class="fd-inst"><h4>${label}</h4><ol>${ins.top[key].map(id => `<li class="${both.has(id) ? 'is-both' : ''}"><span>${esc(row[id].name)}</span><b>${val(row[id])}</b></li>`).join('')}</ol></div>`;
    return `<p class="fd-note">${T(`${ins.eligible} ROR-identified institutions with at least 5 works. Only ${ins.overlapWorksSupply} of the top 15 by output are also in the top 15 by supply (uses of their benchmarks by other institutions); highlighted rows are in both.`, `至少有 5 项工作、具有 ROR 身份的机构共 ${ins.eligible} 个。产出前 15 的机构中只有 ${ins.overlapWorksSupply} 个同时位于供给前 15（其基准被其他机构采用的次数）；高亮行两者皆是。`)} ${status(hyp('H3').status)}</p>
    <div class="fd-insts">${instList('works', T('Top 15 by works', '工作数前 15'), x => num(x.works))}${instList('supply', T('Top 15 by benchmark supply', '基准供给前 15'), x => `${num(x.supply)} <small>${T('output', '产出')} #${x.outputRank}</small>`)}</div>`;
  },
  concentration() {
    const con = P.trends.concentration, yl = con.years.map(String), pc = v => v == null ? '—' : Number(v).toFixed(1) + '%', cit = con.citations;
    const indTop = [...con.industryByCluster].filter(r => r.typed >= 100).sort((a, b) => b.industry - a.industry);
    return `<div class="fd-tiles">${tile(T('Active institutions', '活跃机构数'), T('ROR institutions with at least one work that year', '当年至少有一项工作的 ROR 机构'), con.institutions.map(x => x.institutions), yl, INK, v => num(v))}
    ${tile(T('Top-10 institutions\' share', '前 10 机构份额'), T('fractional credit of the ten largest institutions that year', '当年最大 10 个机构的按比例产出份额'), con.institutions.map(x => x.top10Share), yl, COLORS.connection, pc)}
    ${tile(T('First-time institutions', '首次出现的机构'), T('institutions whose first Atlas work is from that year', '首项 Atlas 工作出现在当年的机构'), con.institutions.map(x => x.newInstitutions), yl, INK, v => num(v))}
    ${tile(T('Works with an industry institution', '有企业机构参与的工作'), T('share of works with typed (ROR) institutions', '在有 ROR 类型机构的工作中的比例'), con.industry.map(x => x.industry), yl, COLORS.connection, pc)}</div>
    <div class="fd-metrics fd-metrics-small"><div><b>${pctf(cit.top1Share)}</b><span>${T(`of all Semantic Scholar citations go to the top 1% of works; the top 10% hold ${pctf(cit.top10Share)}`, `的 Semantic Scholar 引用落在前 1% 的工作上；前 10% 占 ${pctf(cit.top10Share)}`)}</span></div>
    <div><b>${esc(con.topCompanies.slice(0, 3).map(x => x.name).join(', '))}</b><span>${T(`companies with the most works; industry-heavy clusters: ${indTop.slice(0, 3).map(r => `${cl(r.cluster)} ${pctf(r.industry, 0)}`).join(', ')}`, `工作最多的企业；企业参与最多的星团：${indTop.slice(0, 3).map(r => `${cl(r.cluster)} ${pctf(r.industry, 0)}`).join('、')}`)}</span></div></div>`;
  },
  balance() {
    const rows = P.lenses.balance.map(r => ({...r, ratio: (r.recent[0] + 0.5) / (r.recent[1] + 0.5), before: (r.before[0] + 0.5) / (r.before[1] + 0.5)})).sort((a, b) => b.ratio - a.ratio);
    const W = 560, L = 220, mid = L + (W - L - 60) / 2, span = (W - L - 60) / 2, lx = r => mid + span * Math.max(-1, Math.min(1, Math.log2(r) / 3));
    return `<p class="fd-note">${T('Attack works per defence work in the last 12 months (bars) and the 12 months before (hollow marks), per cluster. Right of the centre line: more attacks than defences. Log scale, capped at 8:1.', '每个星团近 12 个月攻击论文与防御论文之比（条）以及之前 12 个月（空心标记）。中线右侧：攻击多于防御。对数刻度，上限 8:1。')} ${labelNote()}</p>
    <svg viewBox="0 0 ${W} ${rows.length * 24 + 34}" class="fd-dumbbell" role="img">${[1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8].map(t => `<line x1="${lx(t)}" x2="${lx(t)}" y1="8" y2="${rows.length * 24 + 8}" class="fd-grid"/><text x="${lx(t)}" y="${rows.length * 24 + 24}" text-anchor="middle" class="fd-axis">${t >= 1 ? t + ':1' : '1:' + 1 / t}</text>`).join('')}
    ${rows.map((r, i) => { const y = 20 + i * 24, x = lx(r.ratio), c = r.ratio >= 1 ? COLORS.connection : COLORS.attention;
      return `<text x="${L - 10}" y="${y + 4}" text-anchor="end" class="fd-axis">${esc(cl(r.cluster))}</text><rect x="${Math.min(mid, x)}" y="${y - 6}" width="${Math.abs(x - mid)}" height="12" rx="3" fill="${c}" data-tip="${esc(`${cl(r.cluster)}\n${T('last 12 months', '近 12 个月')}: ${r.recent[0]} ${T('attack', '攻击')} / ${r.recent[1]} ${T('defence', '防御')} / ${r.recent[2]} ${T('benchmark', '基准')}\n${T('12 months before', '之前 12 个月')}: ${r.before[0]} / ${r.before[1]} / ${r.before[2]}`)}"/><circle cx="${lx(r.before)}" cy="${y}" r="4" fill="none" stroke="${c}" stroke-width="1.6"/><text x="${W - 4}" y="${y + 4}" text-anchor="end" class="fd-axis">${r.recent[0]}:${r.recent[1]}</text>`; }).join('')}
    <line x1="${mid}" x2="${mid}" y1="8" y2="${rows.length * 24 + 8}" stroke="${INK}" stroke-width="1.5"/></svg>`;
  },
  comparability() {
    const frag = [...P.fragmentation].sort((a, b) => b.defenses - a.defenses), comp = P.lenses.comparability.filter(c => c.pairShare != null);
    return `<div class="fd-two"><div><h4>${T('Within each cluster', '各星团内')}</h4><table class="fd-table"><thead><tr><th>${T('Cluster', '星团')}</th><th>${T('Defences', '防御')}</th><th>${T('Benchmarks', '基准')}</th><th>${T('Most used', '最常用')}</th><th>${T('Pairs sharing one', '共用基准的对')}</th></tr></thead><tbody>${frag.map(f => `<tr><th>${esc(cl(f.cluster))}</th><td>${f.defenses}</td><td>${f.benchmarks}</td><td>${esc(title(f.topBenchmark).split(':')[0])} ${pctf(f.topShare, 0)}</td><td>${pctf(f.pairShare)}</td></tr>`).join('')}</tbody></table></div>
    <div><h4>${T('Over time, all defences', '随时间变化（全部防御）')}</h4><div class="fd-hbars">${comp.map(c => `<div class="fd-hbar"><span>${c.half} <small>${c.defenses} ${T('defences', '项防御')}</small></span>${barCell(c.pairShare, 60, COLORS.attention)}<b>${pctf(c.pairShare)}</b></div>`).join('')}</div>
    <p class="fd-note">${T('Share of defence pairs published in the same half-year that evaluate on at least one common Atlas benchmark. Only defences with a recorded benchmark use count; half-years with fewer than eight are left out.', '同一半年内发表的防御论文两两之间，至少共用一个 Atlas 基准的比例。只计有基准采用记录的防御；不足 8 项的半年未列出。')} ${labelNote()}</p></div></div>`;
  },
  models() {
    const md = P.lenses.models, fams = ['GPT', 'Claude', 'Qwen', 'Gemini', 'Llama', 'DeepSeek'];
    return `<p class="fd-note">${T(`Share of works naming each model family in their full text (before the reference list), among works that name at least one: ${md.years.map((y, i) => `${y} ${num(md.papers[i])}`).join(' · ')}. Read locally with name patterns; a mention is not always a tested model.`, `在全文（参考文献之前）至少点名一个模型家族的工作中，点名各家族的比例：${md.years.map((y, i) => `${y} ${num(md.papers[i])}`).join(' · ')} 篇。本地按名称规则读取；被提到不一定是被测试。`)}</p>
    ${lineChart(md.years, fams.map((f, i) => ({label: f, color: SERIES[i], values: md.share[f]})))}`;
  },
  modelsByCountry() {
    const bc = P.lenses.models.byCountry, fams = P.lenses.models.families.filter(f => (bc.US.share[f] || 0) + (bc.CN.share[f] || 0) >= 8).sort((a, b) => ((bc.CN.share[b] || 0) - (bc.US.share[b] || 0)) - ((bc.CN.share[a] || 0) - (bc.US.share[a] || 0)));
    return `<div class="fd-legend"><span><svg width="12" height="12"><rect width="12" height="12" rx="2" fill="${SERIES[0]}"/></svg>${country('US')} (${num(bc.US.papers)})</span><span><svg width="12" height="12"><rect width="12" height="12" rx="2" fill="${SERIES[1]}"/></svg>${country('CN')} (${num(bc.CN.papers)})</span></div>
    <div class="ln-pairs">${fams.map(f => `<div class="ln-pair"><span>${f}</span><div>${barCell(bc.US.share[f], 100, SERIES[0])}<b>${pctf(bc.US.share[f], 0)}</b></div><div>${barCell(bc.CN.share[f], 100, SERIES[1])}<b>${pctf(bc.CN.share[f], 0)}</b></div></div>`).join('')}</div>
    <p class="fd-note">${T('Works whose located institutions are all in one country, 2023 onwards, among works naming at least one model.', '2023 年以来、已定位机构全部在同一国家、且至少点名一个模型的工作。')}</p>`;
  },
  settings() {
    const st = P.lenses.settings, names = SETTING_NAMES();
    if (st.basis === 'facet labels') return B.facetMultiples('settings', names, T('Share of labelled works per half-year that study each kind of agent (a work can study several).', '每半年已标注工作中研究各类 agent 的比例（一项工作可涉及多类）。'));
    return `<div class="fd-multiples">${Object.entries(st.share).map(([k, v]) => `<div class="fd-multiple"><h4>${names[k] || k}</h4>${spark(v.map(x => x ?? 0), 1, INK)}<small>${st.halves[0]} ${pctf(v[0])} → ${st.halves[st.halves.length - 1]} ${pctf(v[v.length - 1])}</small></div>`).join('')}</div>
    <p class="fd-note">${T(`Share of works per half-year whose title or abstract names the setting (keyword rules; a work can name several). Works per half-year: ${st.halves.map((h, i) => `${h} ${num(st.works[i])}`).join(' · ')}. The facet labels will replace these rules.`, `每半年中标题或摘要提到该类 agent 的工作比例（关键词规则；一项工作可提到多类）。各半年工作数：${st.halves.map((h, i) => `${h} ${num(st.works[i])}`).join(' · ')}。将由 LLM 标签替换。`)}</p>`;
  },
  pilot() {
    const pilot = P.rq1.pilot, rows = pilot.table;
    const names = {random: T('Random', '随机'), citations: T('Citation count (in cluster)', '引用数（同星团）'), relevance: T('Relevance only (SPECTER2)', '仅相关性（SPECTER2）'),
      relevanceCitations: T('Relevance × raw citations', '相关性 × 原始引用'), salience: T('Navigation salience (0.75 C + 0.25 B)', '导航显著度（0.75 C + 0.25 B）'),
      salienceC: T('Salience, citation signal only', '显著度，仅引用信号'), salience50: T('Salience, 0.5 C + 0.5 B', '显著度，0.5 C + 0.5 B')};
    const maxR = Math.max(...rows.map(r => r.recall50 || 0)), maxN = Math.max(...rows.map(r => r.nova20 || 0));
    return `<p class="fd-note">${T(`Each of ${pilot.surveys} surveys (first posted since July 2024, at least 20 cited Atlas works that predate it) defines a question. Rankers only see works dated before the survey, with citation counts as of that date. Relevant set: the Atlas works the survey cites (median ${pilot.medianRelevant} of ${num(pilot.medianPool)} candidates). Salience = relevance gate (300 nearest by SPECTER2) × (0.75 · in-group citation percentile + 0.25 · bridging).`, `${pilot.surveys} 篇综述（2024 年 7 月以后首次发布，且至少引用 20 项早于它的 Atlas 工作）各自定义一个问题。排序方法只看到综述发表前的工作，引用数也截至该日期。相关集：综述引用的 Atlas 工作（中位 ${pilot.medianRelevant} 项，候选 ${num(pilot.medianPool)} 项）。显著度 = 相关性门槛（SPECTER2 最近的 300 项）×（0.75 · 参照组内引用分位 + 0.25 · 桥接）。`)} ${status(hyp('H1').status)}</p>
    <table class="fd-table fd-pilot"><thead><tr><th>${T('Ranker', '排序方法')}</th><th>${T('Recall@20', '召回@20')}</th><th>${T('Recall@50', '召回@50')}</th><th>nDCG@50</th><th>${T(`Top 20 under ${P.meta.novaMonths} months`, `前 20 中不足 ${P.meta.novaMonths} 个月的比例`)}</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.ranker === 'salience' ? 'is-main' : ''}${r.ranker.startsWith('salience') && r.ranker !== 'salience' ? ' is-sens' : ''}"><th>${names[r.ranker] || r.ranker}</th><td>${share(r.recall20)}</td><td>${barCell(r.recall50, maxR, COLORS.attention)}${share(r.recall50)}</td><td>${r.ndcg50 == null ? '—' : r.ndcg50.toFixed(3)}</td><td>${barCell(r.nova20, maxN, COLORS.supply)}${share(r.nova20)}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T('Relevance × raw citations finds the most references but almost no recent works; salience gives up about two points of recall for roughly five times more recent works in its top 20. Changing the weights (grey rows) moves recall by less than one point. Caveats: survey reference lists favour well-cited works; one snapshot; no expert must-read lists yet.', '相关性 × 原始引用找回的参考文献最多，但几乎不含近期工作；显著度以约 2 个百分点的召回为代价，让前 20 中的近期工作多出约五倍。调整权重（灰色行）对召回的影响不到 1 个百分点。注意：综述参考文献偏向高被引工作；只有一个快照；还没有专家必读清单。')}</p>
    ${listButton(pilot.detail.map(d => d.survey), T(`The ${pilot.surveys} surveys`, `这 ${pilot.surveys} 篇综述`), T('Surveys used as reference sets', '用作参照集的综述'))}`;
  },
  nova() {
    const s = P.rq1.bands.summary, rows = [[T('All works in the corpus', '语料全部工作'), s.novaShareCorpus], [T('Top 20 by citation count (19 clusters)', '按引用数前 20（19 个星团）'), 100 * s.novaGlobalTop20 / s.top20Slots], [T('Top 20 by in-group percentile', '按参照组内分位前 20'), 100 * s.novaGroupTop20 / s.top20Slots]];
    return `<div class="fd-hbars">${rows.map(([l, v]) => `<div class="fd-hbar"><span>${l}</span>${barCell(v, 40, COLORS.supply)}<b>${pctf(v)}</b></div>`).join('')}</div>
    <p class="fd-note">${T(`Works first posted less than ${P.meta.novaMonths} months before the snapshot. In-group percentiles compare a work only with works of the same cluster, year and form.`, `指快照前不足 ${P.meta.novaMonths} 个月首次发布的工作。参照组内分位只与同星团、同年份、同类型的工作比较。`)}</p>`;
  },
  bands() {
    const k = Math.min(P.meta.clusters.length - 1, Math.max(0, +C.state.findingsCluster || P.meta.clusters.indexOf('Prompt injection')));
    const band = P.rq1.bands.perCluster.find(x => x.cluster === k), s = P.rq1.bands.summary;
    const reasonText = ([key, v]) => ({citedInCluster: T(`cited by ${v} in this cluster`, `被本星团 ${v} 项引用`), citations: T(`${num(v)} citations`, `${num(v)} 次引用`),
      groupPercentile: T(`${v}th pct. in its group`, `参照组第 ${v} 百分位`), clustersLinked: T(`links ${v} clusters`, `连接 ${v} 个星团`), usedBy: T(`used by ${v} works`, `被 ${v} 项工作采用`), code: T('code', '有代码'), nova: T('new star', '新星')}[key] || key);
    const bandNames = [['foundation', T('Foundation', '基础'), T('older than 12 months, most cited inside this cluster', '发表超过 12 个月、被本星团引用最多')],
      ['influence', T('Influence', '影响'), T('highest citation percentile within (cluster, year, form)', '在（星团、年份、类型）参照组内引用分位最高')],
      ['bridge', T('Bridge', '桥梁'), T('observed routes spread over many clusters; surveys left out', '观测到的航线分布在多个星团；不含综述')],
      ['resource', T('Resource', '资源'), T('benchmarks other works evaluate on', '被其他工作用于评测的基准')], ['latest', T('Latest', '最新'), T('newest dated works; no citation signal', '日期最新的工作；不使用引用信号')]];
    return `<p class="fd-note">${T(`Across clusters the four bands' top 10 overlap by ${share(s.meanBandOverlap)} on average; citation and bridging rankings barely agree (median Kendall τ ${s.medianTauCitationBridge}).`, `各星团中四个波段的前 10 名平均只重合 ${share(s.meanBandOverlap)}；引用排序与桥接排序几乎不一致（Kendall τ 中位数 ${s.medianTauCitationBridge}）。`)}</p>
    <div class="fd-controls"><label>${T('Cluster', '星团')} <select data-fd-cluster>${P.meta.clusters.map((c, i) => `<option value="${i}"${i === k ? ' selected' : ''}>${esc(cl(i))}</option>`).join('')}</select></label>
    <span class="fd-note">${T(`${num(band.works)} works · band overlap ${share(band.bandOverlap)} · τ(citation, bridge) ${band.tauCitationBridge ?? '—'}`, `${num(band.works)} 项工作 · 波段重合 ${share(band.bandOverlap)} · τ（引用，桥接）${band.tauCitationBridge ?? '—'}`)}</span></div>
    <div class="fd-bands">${bandNames.map(([key, label, note]) => `<div class="fd-band"><h4>${label}</h4><small>${note}</small><ol>${(band.bands[key] || []).slice(0, 5).map(id => `<li>${paperLink(id)}<span class="fd-reasons">${(band.reasons[id] || []).filter(r => key !== 'latest' || ['nova', 'code', 'usedBy'].includes(r[0])).slice(0, 3).map(reasonText).map(esc).join(' · ')}${year(id) ? ' · ' + esc(year(id)) : ''}</span></li>`).join('') || `<li class="muted">${T('No work has this signal yet.', '暂无工作具备该信号。')}</li>`}</ol></div>`).join('')}</div>
    <p class="fd-note">${T('Reasons are counts on this snapshot, not quality judgements. A band list is a set of starting points for one purpose, not a leaderboard.', '理由是本快照上的计数，不是质量判断。波段列表是为某一目的准备的起点集合，不是排行榜。')}</p>`;
  },
  facetMultiples(key, names, note) {
    const d = P.lenses[key], keys = Object.keys(d.share).filter(k => d.share[k].some(v => v != null));
    const last = v => [...v].reverse().find(x => x != null), first = v => v.find(x => x != null);
    keys.sort((a, b) => (last(d.share[b]) - first(d.share[b])) - (last(d.share[a]) - first(d.share[a])));
    return `<div class="fd-multiples">${keys.map(k => { const v = d.share[k]; return `<div class="fd-multiple"><h4>${names[k] || k}</h4>${spark(v.map(x => x ?? 0), 1, INK)}<small>${d.halves[v.findIndex(x => x != null)]} ${pctf(first(v))} → ${pctf(last(v))}</small></div>`; }).join('')}</div><p class="fd-note">${note} ${labelNote()}</p>`;
  },
  mechanisms() {
    const m = P.lenses.mechanisms, names = MECH_NAMES(), rows = Object.entries(m.share).sort((a, b) => b[1][1] - a[1][1]), W = 560, L = 220, sx = v => L + (W - L - 40) * v / 70;
    return `<svg viewBox="0 0 ${W} ${rows.length * 26 + 30}" class="fd-dumbbell" role="img">${[0, 20, 40, 60].map(t => `<line x1="${sx(t)}" x2="${sx(t)}" y1="8" y2="${rows.length * 26 + 6}" class="fd-grid"/><text x="${sx(t)}" y="${rows.length * 26 + 22}" text-anchor="middle" class="fd-axis">${t}%</text>`).join('')}
    ${rows.map(([k, [b, r]], i) => { const y = 18 + i * 26, up = r >= b; return `<text x="${L - 10}" y="${y + 4}" text-anchor="end" class="fd-axis">${names[k]}</text><line x1="${sx(b)}" x2="${sx(r)}" y1="${y}" y2="${y}" stroke="${INK}" stroke-width="2.5" opacity=".5"/><circle cx="${sx(b)}" cy="${y}" r="4.5" fill="${RING}" stroke="${INK}" stroke-width="2"/><circle cx="${sx(r)}" cy="${y}" r="5" fill="${INK}" data-tip="${esc(`${names[k]}: ${pctf(b)} → ${pctf(r)}`)}"/><text x="${sx(Math.max(b, r)) + 9}" y="${y + 4}" class="fd-axis ${up ? 'fd-up' : 'fd-down'}">${up ? '+' : ''}${(r - b).toFixed(1)}</text>`; }).join('')}</svg>
    <p class="fd-note">${T(`Share of defence papers (main role) using each mechanism; a defence can combine several. Hollow: the 12 months before (${m.before} defences); filled: the last 12 months (${m.recent}).`, `各机制在防御论文（主要角色）中的比例；一项防御可以组合多种机制。空心：之前 12 个月（${m.before} 项）；实心：近 12 个月（${m.recent} 项）。`)} ${labelNote()}</p>`;
  },
  adaptive() {
    const a = P.lenses.adaptive, rows = a.byHalf.filter(x => x.yes != null);
    return `<div class="fd-two"><div><h4>${T('Over time', '随时间变化')}</h4><div class="fd-hbars">${rows.map(x => `<div class="fd-hbar"><span>${x.half} <small>${x.defenses} ${T('defences', '项防御')}</small></span>${barCell(x.yes, 30, COLORS.attention)}<b>${pctf(x.yes)}</b></div>`).join('')}</div></div>
    <div><h4>${T('By cluster', '各星团')}</h4><table class="fd-table"><thead><tr><th>${T('Cluster', '星团')}</th><th>${T('Defences', '防御')}</th><th>${T('Adaptive tests reported', '报告自适应检验')}</th></tr></thead><tbody>${a.byCluster.slice(0, 10).map(r => `<tr><th>${esc(cl(r.cluster))}</th><td>${r.defenses}</td><td>${pctf(r.yes)}</td></tr>`).join('')}</tbody></table></div></div>
    ${listButton(rows.flatMap(x => x.ids), T('Defences that report adaptive tests', '报告自适应检验的防御'), T('Defences whose abstract reports tests against adaptive attacks', '摘要报告了自适应攻击检验的防御'))}
    <p class="fd-note">${T('Share of defence papers (main role) whose abstract says the defence was tested against adaptive attacks (attacks that know the defence). An abstract that does not say so counts as not reported, which is a lower bound on what the full papers contain.', '防御论文（主要角色）中，摘要说明经过自适应攻击（知道防御存在的攻击）检验的比例。摘要未提及按“未报告”计，所以这是全文实际情况的下限。')} ${labelNote()}</p>`;
  },
  release() {
    const r = P.lenses.release;
    return tile(T('Abstracts that promise released code or data', '摘要声明公开代码或数据'), T('share of labelled works by year', '各年已标注工作中的比例'), r.share, r.years.map(String), INK, v => v == null ? '—' : Number(v).toFixed(1) + '%');
  },
  insightsLink(tab, label, note) {
    return `<p class="fd-note">${note}</p><button class="btn ln-open" data-ln-insight="${tab}">${label} →</button>`;
  },
  pending(text) {
    return `<p class="ln-pending">${text}</p>`;
  },
};
function tile(title, note, values, labels, color, fmt) {
  return `<div class="fd-tile"><h4>${title}</h4>${bars(values, labels, color, {fmt, partialLast: true})}<small>${note}</small></div>`;
}
const lagText = v => v == null ? '—' : (v > 0 ? '+' : '') + v + T(' mo', ' 个月');
function settingsAnswer(st) {
  const sh = st.share, f = v => (v || []).find(x => x != null), l = v => [...(v || [])].reverse().find(x => x != null), g = (...ks) => ks.map(k => sh[k]).find(Boolean);
  const coding = g('coding'), mcp = g('mcp_skills_ecosystem', 'mcp_skills'), mem = g('rag_memory_assistant', 'rag_memory'), emb = g('embodied_robot'), drv = g('driving_drone');
  return T(`Coding agents ${pctf(f(coding))} → ${pctf(l(coding))} of works, MCP/skills ${pctf(f(mcp))} → ${pctf(l(mcp))}, RAG/memory ${pctf(f(mem))} → ${pctf(l(mem))}; embodied ${pctf(f(emb))} → ${pctf(l(emb))}, driving ${pctf(f(drv))} → ${pctf(l(drv))}.`,
    `编码 agent ${pctf(f(coding))} → ${pctf(l(coding))}，MCP/skills ${pctf(f(mcp))} → ${pctf(l(mcp))}，RAG/记忆 ${pctf(f(mem))} → ${pctf(l(mem))}；具身 ${pctf(f(emb))} → ${pctf(l(emb))}，自动驾驶 ${pctf(f(drv))} → ${pctf(l(drv))}。`);
}
const labelNote = () => { const l = P.lenses.labels; return l.source === 'facet labels' ? T(`Labels: DeepSeek on title and abstract (rules ${l.rules}), ${num(l.labelled)} of ${num(l.works)} works; agreement with Opus on the main role ${l.roleAgree}/${l.checked}.`, `标签：DeepSeek 读取标题与摘要（规则 ${l.rules}），已标注 ${num(l.works)} 项中的 ${num(l.labelled)} 项；与 Opus 在主要角色上一致 ${l.roleAgree}/${l.checked}。`) : T('Attack and defence read from title keywords (no facet labels yet).', '攻击与防御暂按标题关键词识别（尚无 LLM 标签）。'); };
const SURFACE_NAMES = () => ({direct_instruction: T('Direct instruction', '直接指令'), web_external_content: T('Web & external content', '网页与外部内容'), tool_output: T('Tool output', '工具返回'), tool_description_mcp_skills: T('Tool descriptions, MCP, skills', '工具描述·MCP·skills'), memory_retrieval: T('Memory & retrieval', '记忆与检索'), multi_agent_communication: T('Agent-to-agent messages', '多智能体通信'), code_system_execution: T('Code & system execution', '代码与系统执行'), permissions_credentials: T('Permissions & credentials', '权限与凭证'), training_data_weights: T('Training data & weights', '训练数据与权重'), physical_sensing_environment: T('Physical sensing', '物理感知与环境'), human_interface_oversight: T('Human interface & oversight', '人机界面与监督')});
const MECH_NAMES = () => ({detection_filtering: T('Detection & filtering', '检测与过滤'), prompt_architecture_design: T('Prompt & architecture design', '提示与架构设计'), training_alignment: T('Training & alignment', '训练与对齐'), isolation_least_privilege: T('Isolation & least privilege', '隔离与最小权限'), information_flow_formal: T('Information flow & formal', '信息流·形式化'), runtime_monitoring: T('Runtime monitoring', '运行时监控'), human_approval: T('Human approval', '人工审批')});
const RISK_NAMES = () => ({external_attacker: T('External attacker', '外部攻击者'), malicious_user: T('Malicious user', '恶意用户'), agent_itself: T('The agent itself', 'agent 自身'), non_adversarial: T('Non-adversarial failure', '非对抗性失误')});
const EVAL_NAMES = () => ({static_dataset: T('Static dataset', '静态数据集'), simulated_environment: T('Simulated environment', '模拟环境'), real_system: T('Real system', '真实系统'), no_experiment: T('No experiment', '无实验')});
const SETTING_NAMES = () => ({general_tool_assistant: T('General tool assistant', '通用工具助手'), mcp_skills_ecosystem: T('MCP / skills ecosystem', 'MCP / skills 生态'), rag_memory_assistant: T('RAG / memory assistant', 'RAG / 记忆助手'), rl_simulator: T('RL in simulators', '模拟器中的 RL'), enterprise_workflow: T('Enterprise workflow', '企业工作流'), science_research: T('Science / research', '科研 agent'),web_browser: T('Web / browser', '网页 / 浏览器'), computer_gui_mobile: T('Computer use / GUI / mobile', '电脑 / GUI / 手机'), coding: T('Coding', '编码'),
  mcp_skills: T('MCP / skills', 'MCP / skills'), rag_memory: T('RAG / memory', 'RAG / 记忆'), multi_agent: T('Multi-agent', '多智能体'), embodied_robot: T('Embodied / robots', '具身 / 机器人'), driving_drone: T('Driving / drones', '自动驾驶 / 无人机')});

// ---- cosmic timeline (milestones): the page picks the threshold N, the start year and the kinds
const MS_KINDS = () => [['attack', T('attack', '攻击')], ['defense', T('defence', '防御')], ['benchmark', T('benchmark', '基准')], ['survey', T('survey', '综述')]];
const MS_COLOR = () => ({attack: COLORS.connection, defense: COLORS.attention, benchmark: COLORS.supply, survey: isDark() ? '#c9c37a' : '#8a7a2a'});
function monthsBetween(a, b) { return (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7)); }
function milestoneModel() {
  const n = Math.max(1, Math.min(50, +C.state.msN || 5)), from = [2016, 2020, 2022, 2023, 2024].includes(+C.state.msFrom) ? +C.state.msFrom : 2023;
  const kinds = (C.state.msKinds || 'attack,defense,benchmark').split(',').filter(k => MS_KINDS().some(z => z[0] === k));
  const rows = P.lenses.milestones.rows.map(r => {
    const at = {}, count = {};
    for (const [k] of MS_KINDS()) { const ds = r[k].filter(d => +d.slice(0, 4) >= from); count[k] = ds.length; at[k] = ds.length >= n ? ds[n - 1] : null; }
    const benchLag = at.attack && at.benchmark ? monthsBetween(at.attack, at.benchmark) : null, defLag = at.attack && at.defense ? monthsBetween(at.attack, at.defense) : null;
    return {cluster: r.cluster, at, count, benchLag, defLag};
  }).sort((a, b) => (b.benchLag ?? -999) - (a.benchLag ?? -999));
  const late = rows.filter(r => (r.benchLag ?? -1) >= 6).length, lateDef = rows.filter(r => (r.defLag ?? -1) >= 6).length, both = rows.filter(r => r.benchLag != null).length;
  return {n, from, kinds, rows, late, lateDef, both};
}

// ================================================================================================ lenses and questions
// the lenses follow the paper's five research questions (owner decision 2026-10-17): structure, connection, leadership,
// attack/defence and evaluation, evolution and frontier; navigation is a check of the resource itself, not a question about
// the field. Old links to the former Targets and Tail lenses open the lens that now holds most of their questions.
const LENS_ALL = ['structure', 'connect', 'lead', 'attack', 'evolve', 'navigate'];
const LENS_LEGACY = {targets: 'structure', tail: 'evolve'};
const lensIds = () => LENS_ALL;
export function lensMeta(t) {
  return {structure: [t('Structure', '结构'), t('What the field is made of, and where its edges lie', '这个领域由哪些部分组成，边界在哪里')],
    connect: [t('Connection', '衔接'), t('What connects research lines, and how knowledge flows between them', '研究线之间靠什么连接，知识怎样流动')],
    lead: [t('Leadership', '引领'), t('Who opens directions, who leads them, and whether output means influence', '谁开创、谁引领，产出与影响是否一致')],
    attack: [t('Attack, defence & evaluation', '攻防与评测'), t('Whether defences and evaluation keep pace with attacks', '攻击、防御、评测是否同步，防御经得起检验吗')],
    evolve: [t('Evolution & frontier', '演化与前沿'), t('How the field grows, and where the next directions come from', '领域怎样生长，下一批方向从哪里来')],
    navigate: [t('Resource check', '资源检验'), t('Whether the Atlas finds grounded starting points', 'Atlas 能否找到有依据的起点')]};
}
// ------------------------------------------------------------------------------------------------ second-round analyses (findings.deeper)
const B3 = {
  punch() {
    const inf = P.deeper.influence, ys = inf.cohorts;
    const cell = r => {
      const ratio = r.workShare ? r.top10Share / r.workShare : null;
      return `<td data-tip="${esc(T(`Works ${pctf(r.workShare)} · most-cited tenth ${pctf(r.top10Share)} · all citations ${pctf(r.citeShare)} · citations from Atlas works ${pctf(r.atlasCiteShare)} (${num(r.works)} works that year)`, `工作 ${pctf(r.workShare)} · 被引最多的前 10% ${pctf(r.top10Share)} · 全部引用 ${pctf(r.citeShare)} · 来自 Atlas 工作的引用 ${pctf(r.atlasCiteShare)}（当年 ${num(r.works)} 项）`))}">${pctf(r.workShare, 0)} → <b>${pctf(r.top10Share, 0)}</b> <small class="${ratio >= 1 ? 'ln-up' : 'ln-down'}">×${ratio == null ? '—' : ratio.toFixed(2)}</small></td>`;
    };
    return `<p class="fd-note">${T('Per publication year: the country’s share of that year’s works → its share of the most-cited tenth of that year’s works (Semantic Scholar citations), and the ratio of the two. Comparing within a year keeps young papers from being judged against old ones. Fractional credit; hover a cell for all-citation and Atlas-citation shares.', '按发表年份：该国在当年工作中的份额 → 在当年被引最多的前 10% 工作中的份额（Semantic Scholar 引用），以及两者之比。只在同一年内比较，避免拿新论文和老论文比被引。按比例计；悬停可看全部引用与 Atlas 内引用的份额。')}</p>
    <table class="fd-table ln-punch"><thead><tr><th>${T('Country / region', '国家/地区')}</th>${ys.map(y => `<th>${y}</th>`).join('')}</tr></thead><tbody>${inf.countries.map(c => `<tr><th>${esc(country(c))}</th>${ys.map(y => { const r = inf.rows[c].find(x => x.year === y); return r ? cell(r) : '<td>—</td>'; }).join('')}</tr>`).join('')}</tbody></table>`;
  },
  pioneers() {
    const rows = [...P.deeper.pioneers].sort((a, b) => (a.first === a.now) - (b.first === b.now) || a.from.localeCompare(b.from));
    return `<p class="fd-note">${T('Leader among each cluster’s first 30 works with a located institution (the months they span), and leader in the last 12 months; fractional credit. Rows where the leader changed come first; the bracket gives the first leader’s share now.', '每个星团最早 30 项有已定位机构的工作（及其时间跨度）中的领先者，以及近 12 个月的领先者；按比例计。领先者发生变化的行排在前面；括号内是最初领先者现在的份额。')}</p>
    <table class="fd-table"><thead><tr><th>${T('Cluster', '星团')}</th><th>${T('First 30 works', '最早 30 项工作')}</th><th>${T('Led by', '领先者')}</th><th>${T('Last 12 months', '近 12 个月')}</th><th>${T('Led by', '领先者')}</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.first !== r.now ? 'ln-changed' : ''}"><th>${esc(cl(r.cluster))}</th><td>${r.from} – ${r.to} ${listButton(r.firstIds, T('read', '阅读'), `${cl(r.cluster)} · ${T('first 30 works', '最早 30 项工作')}`)}</td><td>${esc(country(r.first))} ${pctf(r.firstShare, 0)}</td><td>${num(r.nowWorks)} ${T('works', '项')}</td><td><b>${esc(country(r.now))}</b> ${pctf(r.nowShare, 0)}${r.first !== r.now ? ` <small>(${esc(country(r.first))} ${pctf(r.firstNowShare, 0)})</small>` : ''}</td></tr>`).join('')}</tbody></table>`;
  },
  geoconc() {
    const rows = [...P.deeper.geoConcentration].sort((a, b) => b.topShare - a.topShare);
    return `<p class="fd-note">${T('Works since 2023 with a located institution, fractional credit. Leading country’s share, number of countries, and the share of works with institutions in two or more countries.', '2023 年以来有已定位机构的工作，按比例计。领先国家的份额、涉及的国家数，以及机构分布在两个及以上国家的工作比例。')}</p>
    <table class="fd-table"><thead><tr><th>${T('Cluster', '星团')}</th><th>${T('Works', '工作')}</th><th>${T('Leading country', '领先国家')}</th><th></th><th>${T('Countries', '国家数')}</th><th>${T('International', '国际合作')}</th></tr></thead><tbody>${rows.map(r => `<tr><th>${esc(cl(r.cluster))}</th><td>${num(r.works)}</td><td>${esc(country(r.top))} ${pctf(r.topShare, 0)}</td><td>${barCell(r.topShare, 60, COLORS.connection)}</td><td>${r.countries}</td><td>${pctf(r.international, 0)}</td></tr>`).join('')}</tbody></table>`;
  },
  buildsOn() {
    const b = P.deeper.buildsOn, sup = b.supply, W = 560, L = 220, mid = L + (W - L - 40) / 2, span = (W - L - 40) / 2, lim = 0.4, x = v => mid + span * Math.max(-1, Math.min(1, v / lim));
    const chart = `<svg viewBox="0 0 ${W} ${sup.length * 22 + 30}" class="fd-dumbbell" role="img">${[-0.4, -0.2, 0, 0.2, 0.4].map(t => `<line x1="${x(t)}" x2="${x(t)}" y1="6" y2="${sup.length * 22 + 6}" class="fd-grid"/><text x="${x(t)}" y="${sup.length * 22 + 22}" text-anchor="middle" class="fd-axis">${t > 0 ? '+' : ''}${t}</text>`).join('')}
    ${sup.map((r, i) => { const y = 16 + i * 22, xv = x(r.net); return `<text x="${L - 10}" y="${y + 4}" text-anchor="end" class="fd-axis">${esc(cl(r.cluster))}</text><rect x="${Math.min(mid, xv)}" y="${y - 6}" width="${Math.max(1, Math.abs(xv - mid))}" height="12" rx="3" fill="${r.net >= 0 ? COLORS.supply : COLORS.connection}" data-tip="${esc(`${cl(r.cluster)}\n${T('cited by other clusters', '被其他星团引用')} ${num(Math.round(r.in))} · ${T('cites other clusters', '引用其他星团')} ${num(Math.round(r.out))}\n${T('median age', '中位年龄')} ${r.medianAgeMonths} ${T('months', '个月')}`)}"/>`; }).join('')}
    <line x1="${mid}" x2="${mid}" y1="6" y2="${sup.length * 22 + 6}" stroke="${INK}" stroke-width="1.5"/></svg>`;
    return `<p class="fd-note">${T('Citations between Atlas works in different clusters, each split over the citing and cited clusters. Right: cited by other clusters more than it cites them, a base others build on; left: builds on others. Score = (cited − citing) ÷ (cited + citing). Older clusters have had more time to be cited; hover for each cluster’s median age.', '不同星团的 Atlas 工作之间的引用，每条引用在施引与被引星团间分摊。右侧：被其他星团引用多于引用别人，是别人的基础；左侧：建立在别人之上。得分 = (被引 − 施引) ÷ (被引 + 施引)。较老的星团有更多时间被引用；悬停可看每个星团的中位年龄。')}</p>
    <div class="fd-two"><div>${chart}</div><div><h4>${T('Most one-sided pairs', '最单向的星团对')}</h4><table class="fd-table"><thead><tr><th>${T('Cites →', '施引 →')}</th><th>${T('→ is cited', '→ 被引')}</th><th>${T('One way : back', '去 : 回')}</th><th>${T('Most cited there', '最常被引')}</th></tr></thead><tbody>${b.pairs.slice(0, 8).map(p => `<tr><th>${esc(cl(p.from))}</th><td>${esc(cl(p.to))}</td><td>${num(Math.round(p.forward))} : ${num(Math.round(p.back))} <small>×${p.ratio}</small></td><td>${p.examples.slice(0, 1).map(([id, n]) => `${paperLink(id)} <small>${n}×</small>`).join('')}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T(`Pairs with at least 40 citations between them (${b.pairsConsidered} pairs).`, `两者之间至少有 40 条引用的星团对（共 ${b.pairsConsidered} 对）。`)}</p></div></div>`;
  },
  lifecycle() {
    const L = P.deeper.benchmarkLife, mo = v => v == null ? '—' : `${v} ${T('mo', '个月')}`;
    return `<div class="fd-metrics fd-metrics-small"><div><b>${mo(L.medianFirstUse)}</b><span>${T('median from release to the first use by another Atlas work', '从发布到第一次被其他 Atlas 工作使用的中位时间')}</span></div>
    <div><b>${mo(L.medianFifthUse)}</b><span>${T('median to the fifth use', '到第五次使用的中位时间')}</span></div>
    <div><b>${mo(L.medianFirstOutside)}</b><span>${T(`median to the first use from a cluster the benchmark is not in (${L.withOutside} of ${L.benchmarks} have one)`, `到第一次被其他星团使用的中位时间（${L.benchmarks} 个中有 ${L.withOutside} 个发生过）`)}</span></div>
    <div><b>${L.oldStillUsed} / ${L.oldBenchmarks}</b><span>${T(`benchmarks older than 18 months still used in the last 6 months; ${L.oldGrowing} used more than in the 6 months before`, `个发布超过 18 个月的基准在近 6 个月仍被使用；其中 ${L.oldGrowing} 个比再往前 6 个月用得更多`)}</span></div></div>
    <table class="fd-table"><thead><tr><th>${T('Benchmark', '基准')}</th><th>${T('Uses', '使用')}</th><th>${T('First use', '首次使用')}</th><th>${T('Fifth use', '第五次')}</th><th>${T('Last 6 months', '近 6 个月')}</th><th>${T('6 months before', '再往前 6 个月')}</th></tr></thead><tbody>${L.rows.map(r => `<tr><th>${paperLink(r.id)}<small> · ${esc(r.name)}${r.approxDate ? ' · ' + T('release year only', '仅知发布年份') : ''}</small></th><td>${listButton(r.userIds, num(r.users), `${r.name} · ${T('works that use it', '使用它的工作')}`)}</td><td>${mo(r.firstUse)}</td><td>${mo(r.fifthUse)}</td><td class="${r.last6 > r.prev6 ? 'ln-up' : r.last6 < r.prev6 ? 'ln-down' : ''}">${r.last6}</td><td>${r.prev6}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T(`Benchmarks with at least five uses found in Atlas full texts (${L.benchmarks}); months after the benchmark’s first posting. Uses are only counted where a full text was read, so these are lower bounds; a release dated only by year counts from mid-year.`, `在 Atlas 全文中找到至少五次使用的基准（${L.benchmarks} 个）；月数从基准首次发布算起。只有读到全文的工作才计入使用，所以这些是下限；仅知发布年份的按年中计。`)}</p>`;
  },
  traditions() {
    const D = P.deeper.traditions, c = D.citations, names = [T('LLM agents', 'LLM 智能体'), T('Control & robotics', '控制与机器人')];
    const SET = {general_tool_assistant: T('tool assistants', '工具助手'), multi_agent: T('multi-agent', '多智能体'), coding: T('coding', '编码'), enterprise_workflow: T('enterprise workflows', '企业工作流'), rag_memory_assistant: T('RAG / memory', 'RAG / 记忆'), mcp_skills_ecosystem: T('MCP / skills', 'MCP / skills'), embodied_robot: T('robots', '机器人'), rl_simulator: T('RL simulators', 'RL 模拟器'), driving_drone: T('driving / drones', '驾驶 / 无人机'), web_browser: T('web', '网页'), computer_gui_mobile: T('computer use', '电脑操作'), science_research: T('science', '科研')};
    const side = (g, k) => `<div class="ln-trad"><h4>${names[k]} <small>${num(g.works)} ${T('works', '项')} · ${pctf(g.share, 0)}</small></h4><p class="fd-note">${T(`${pctf(g.since2025, 0)} since 2025 · median year ${g.medianYear}`, `${pctf(g.since2025, 0)} 发表于 2025 年以后 · 中位年份 ${g.medianYear}`)}</p>
      <div class="fd-hbars">${g.topics.slice(0, 5).map(([t, v]) => `<div class="fd-hbar"><span>${esc(cl(t))}</span>${barCell(v, 80, k ? COLORS.connection : COLORS.attention)}<b>${pctf(v, 0)}</b></div>`).join('')}</div>
      <p class="fd-note">${T('Agents studied', '研究的智能体')}: ${g.settings.slice(0, 4).map(([x, v]) => `${SET[x] || x} ${pctf(v, 0)}`).join(' · ')}</p>
      <p class="fd-note">${listButton(g.top, T('Most cited works', '被引最多的工作'), names[k])}</p></div>`;
    const sh = D.shape;
    return `<p class="fd-note">${T('Two groups found by k-means (k = 2) on the SPECTER2 vectors of the titles and abstracts themselves, not on any map drawing; named by what they contain.', '在论文标题与摘要的 SPECTER2 向量上直接做 k-means（k = 2）得到两组，与任何星图画法无关；名称按组内内容取。')}</p>
    <div class="fd-two">${side(D.groups[0], 0)}${side(D.groups[1], 1)}</div>
    <div class="fd-metrics fd-metrics-small"><div><b>${pctf(c.cross, 1)}</b><span>${T(`of ${num(c.links)} citations between Atlas works cross the two groups; group sizes alone would give ${pctf(c.expectedCross, 0)}`, `的 Atlas 内引用（共 ${num(c.links)} 条）跨越两组；仅按两组大小随机互引，应约为 ${pctf(c.expectedCross, 0)}`)}</span></div>
    <div><b>${pctf(c.llmCitesControl, 1)} : ${pctf(c.controlCitesLlm, 1)}</b><span>${T('LLM-agent works citing control works, against the reverse: the newer group draws on the older one', 'LLM 智能体工作引用控制工作，对比反方向：新的一组借用老的一组')}</span></div>
    <div><b>${pctf(D.boundary.share, 1)} → ${pctf(D.boundary.crossTouching, 0)}</b><span>${T('the works nearest the boundary between the groups take part in this share of all cross-group citations', '最靠近两组分界的工作，参与了这一比例的跨组引用')} ${listButton(D.boundary.ids, T('boundary works', '分界上的工作'), T('Works nearest the boundary between the two groups', '最靠近两组分界的工作'))}</span></div></div>
    <h4>${T('What the two groups share: the works most cited across them', '两组共同的祖先：跨组被引最多的工作')}</h4><ol class="fd-drawer-list">${D.ancestors.slice(0, 6).map(([id, n, g]) => `<li>${paperLink(id)}<small>${num(n)} ${T('cross-group citations', '次跨组引用')} · ${names[g]}</small></li>`).join('')}</ol>
    ${sh ? `<p class="fd-note">${T(`Why the home-page sky is long rather than round: in its 3-D layout the first axis holds ${pctf(100 * sh.variance[0], 0)} of the spread (a round cloud would split it about evenly). The far end of the control group is autonomous-driving decision making; the loneliest stars are single topics without a community yet.`, `首页星空为什么是长条而不是球形：在三维布局里，第一条轴占了 ${pctf(100 * sh.variance[0], 0)} 的差异（球形的话三个方向大致均分）。控制一组的最远端是自动驾驶决策；最孤独的星是还没形成社区的单点题目。`)} ${listButton(sh.farthest, T('farthest stars', '最远的星'), T('Farthest from the centre of the 3-D sky', '离三维星空中心最远的星'))} ${listButton(sh.loneliest, T('loneliest stars', '最孤独的星'), T('Fewest close neighbours in the 3-D sky', '三维星空中近邻最少的星'))}</p>` : ''}`;
  },
  apart() {
    const g = P.deeper.global, rows = g.usCn.filter(r => r.cn >= 20), last = rows[rows.length - 1];
    const series = [{label: T(`${country('CN')}: US partner`, `中国：有美方合作`), color: SERIES[1], values: rows.map(r => r.cnWithUs)},
      {label: T('US: China partner', '美国：有中方合作'), color: SERIES[0], values: rows.map(r => r.usWithCn)}];
    const part = (key, title) => { const p = g.partners[key]; return `<div><h4>${title}</h4><small class="fd-note">${num(p.works)} ${T('international works', '项国际合作工作')}</small><div class="fd-hbars">${p.top.map(([c, v]) => `<div class="fd-hbar"><span>${esc(country(c))}</span>${barCell(v, 60, c === 'US' || c === 'CN' ? COLORS.connection : COLORS.attention)}<b>${pctf(v, 0)}</b></div>`).join('')}</div></div>`; };
    return `<p class="fd-note">${T('Works with a located institution in China (or the US) that also have one in the other country, by year (current year partial). Below: which countries appear on the international works of each, 2020–23 against 2025 onward; a work counts once for every partner country.', '有已定位中国（或美国）机构、同时也有另一国机构的工作占比，按年（当年未完）。下方：各自的国际合作工作中出现的伙伴国家，2020–23 年与 2025 年以来对比；一项工作对每个伙伴国家各计一次。')}</p>
    ${lineChart(rows.map(r => r.year), series)}
    <div class="ln-partners">${part('CN_before', T(`Partners of ${country('CN')}, 2020–23`, `${country('CN')}的合作伙伴，2020–23`))}${part('CN_recent', T(`Partners of ${country('CN')}, 2025–`, `${country('CN')}的合作伙伴，2025 年以来`))}${part('US_before', T(`Partners of ${country('US')}, 2020–23`, `${country('US')}的合作伙伴，2020–23`))}${part('US_recent', T(`Partners of ${country('US')}, 2025–`, `${country('US')}的合作伙伴，2025 年以来`))}</div>
    <p class="fd-note">${listButton(last.bothIds, T(`US–China works in ${last.year}`, `${last.year} 年的中美合作工作`), T(`Works with institutions in both the US and China, ${last.year}`, `${last.year} 年同时有中美机构的工作`))}</p>`;
  },
  rising() {
    const g = P.deeper.global, [a, b] = g.growthYears, max = Math.max(...g.rising.map(r => r[3]));
    return `<div class="fd-two"><div><table class="fd-table"><thead><tr><th>${T('Country / region', '国家/地区')}</th><th>${a}</th><th>${b}</th><th>${T('Growth', '增长')}</th><th></th></tr></thead><tbody>${g.rising.map(r => `<tr><th>${esc(country(r[0]))}</th><td>${num(Math.round(r[1]))}</td><td>${num(Math.round(r[2]))}</td><td><b>×${r[3]}</b></td><td>${barCell(r[3], max, r[3] > g.fieldGrowth ? COLORS.connection : COLORS.attention)}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T(`Located works (fractional credit) in the last two full years, countries with at least 15 in ${a}; the field as a whole grew ×${g.fieldGrowth}. Orange: faster than the field.`, `最近两个完整年份的已定位工作（按比例计），${a} 年至少 15 项的国家；整个领域增长 ×${g.fieldGrowth}。橙色：快于整个领域。`)}</p></div>
    <div class="fd-tiles">${tile(T('Countries and regions taking part', '参与的国家和地区'), T('with at least one located work that year', '当年至少有一项已定位工作'), g.countries.map(r => r.countries), g.countries.map(r => String(r.year)), INK, v => num(v))}
    ${tile(T('Effective number of countries', '有效国家数'), T('1 ÷ sum of squared shares; rises when output spreads beyond the leaders', '1 ÷ 份额平方和；产出越分散越高'), g.countries.map(r => r.effective), g.countries.map(r => String(r.year)), COLORS.attention, v => v == null ? '—' : Number(v).toFixed(1))}</div></div>`;
  },
  bigteams() {
    const t = P.deeper.teams;
    return `<table class="fd-table"><thead><tr><th>${T('Year', '年份')}</th><th>${T('Works', '工作')}</th><th>${T('Median authors', '作者数中位数')}</th><th>${T('Ten or more authors', '10 位以上作者')}</th><th>${T('…their share of the most-cited tenth', '…占被引前 10% 的比例')}</th><th>${T('…with a company', '…其中有企业参与')}</th></tr></thead><tbody>${t.rows.map(r => `<tr><th>${r.year}</th><td>${num(r.works)}</td><td>${r.medianAuthors ?? '—'}</td><td>${pctf(r.bigShare)}</td><td>${r.bigTop10Share != null ? `<b>${pctf(r.bigTop10Share, 0)}</b>` : '—'}</td><td>${r.bigIndustry != null ? pctf(r.bigIndustry, 0) : '—'}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T('Author lists as recorded; the most-cited tenth is measured within each publication year (years with enough citation time only). The current year is partial.', '作者名单以记录为准；被引前 10% 在每个发表年份内计算（只算有足够被引时间的年份）。当年未完。')} ${listButton(t.bigIds, T('Most-cited big-team works', '被引最多的大团队工作'), T('Works with ten or more authors, most cited first', '10 位以上作者的工作，按被引排序'))}</p>`;
  },
  venues() {
    const v = P.deeper.venues, rows = [...v.byCluster].sort((a, b) => b.security4 - a.security4), yr = v.byYear.filter(r => r.verified >= 100);
    const names = {ml3: T('ML top-3', '机器学习三大会'), security4: T('Security top-4', '安全四大'), journals: T('Journals', '期刊'), other: T('Other venues', '其他来源')};
    return `<p class="fd-note">${T('Verified publications only (conference or journal confirmed). ML top-3: NeurIPS, ICML, ICLR; security top-4: IEEE S&P, USENIX Security, CCS, NDSS.', '只计已核实的正式发表。机器学习三大会：NeurIPS、ICML、ICLR；安全四大：IEEE S&P、USENIX Security、CCS、NDSS。')}</p>
    <div class="fd-two"><div><h4>${T('Over time', '随时间')}</h4><table class="fd-table"><thead><tr><th>${T('Year', '年份')}</th><th>${T('Verified', '已核实')}</th>${Object.values(names).map(n => `<th>${n}</th>`).join('')}</tr></thead><tbody>${yr.map(r => `<tr><th>${r.year}</th><td>${num(r.verified)}</td>${Object.keys(names).map(k => `<td>${pctf(r[k], 0)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div><h4>${T('By cluster, since 2024', '各星团，2024 年以来')}</h4><div class="fd-hbars">${rows.map(r => `<div class="fd-hbar ln-venue"><span>${esc(cl(r.cluster))} <small>${num(r.verified)}</small></span>${barCell(r.security4, 30, COLORS.connection)}<b>${pctf(r.security4, 0)}</b><span class="ln-ml">${T('ML', 'ML')} ${pctf(r.ml3, 0)}</span>${r.securityIds.length >= 5 ? listButton(r.securityIds, T('security papers', '安全会议论文'), `${cl(r.cluster)} · ${names.security4}`) : ''}</div>`).join('')}</div>
    <p class="fd-note">${T('Bar: share at the security top-4; beside it the ML top-3 share. Clusters with at least 50 verified publications.', '条：安全四大的比例；旁边是机器学习三大会的比例。至少有 50 项已核实发表的星团。')}</p></div></div>`;
  },
  diversify() {
    const d = P.deeper.diversity, yl = d.map(r => String(r.year));
    return `<div class="fd-tiles">${tile(T('Effective number of clusters', '有效星团数'), T('1 ÷ sum of squared cluster shares (fractional credit); rises when work spreads over more clusters', '1 ÷ 星团份额平方和（按比例计）；研究分布到越多星团越高'), d.map(r => r.clusters), yl, COLORS.attention, v => v == null ? '—' : Number(v).toFixed(1))}
    ${tile(T('Effective number of countries', '有效国家数'), T('the same measure over countries of located works', '对已定位工作的国家做同样计算'), d.map(r => r.countries), yl, INK, v => v == null ? '—' : Number(v).toFixed(1))}</div>`;
  },
  industry() {
    const d = P.deeper.industry;
    return `<p class="fd-note">${T(`Works with at least one institution of known type in the registry (ROR; ${num(d.typed)} works); “with industry” means at least one company among them (${num(d.industryWorks)} works). Per publication year: share of that year’s works → share of its most-cited tenth (Semantic Scholar citations).`, `在机构登记库（ROR）中有已知类型机构的工作（${num(d.typed)} 项）；“有企业参与”指其中至少有一家公司（${num(d.industryWorks)} 项）。按发表年份：占当年工作的份额 → 占当年被引最多前 10% 的份额（Semantic Scholar 引用）。`)}</p>
    <div class="fd-two"><div><table class="fd-table ln-punch"><thead><tr><th>${T('Year', '年份')}</th><th>${T('Works', '工作')}</th><th>${T('With industry: works → most-cited tenth', '有企业参与：工作 → 被引前 10%')}</th><th>${T('Citations', '引用')}</th></tr></thead><tbody>${d.cohorts.map(r => `<tr><th>${r.year}</th><td>${num(r.works)}</td><td>${pctf(r.workShare, 0)} → <b>${pctf(r.top10Share, 0)}</b> <small class="ln-up">×${(r.top10Share / r.workShare).toFixed(1)}</small></td><td>${pctf(r.citeShare, 0)}</td></tr>`).join('')}</tbody></table></div>
    <div><div class="fd-metrics fd-metrics-small"><div><b>${pctf(d.academicRefsToIndustry, 0)}</b><span>${T(`of the Atlas references in academic-only works point to works with industry, which are ${pctf(d.industryShareTyped, 0)} of works`, `的学术界工作的 Atlas 内引用指向有企业参与的工作，而后者只占工作的 ${pctf(d.industryShareTyped, 0)}`)}</span></div></div>
    <h4>${T('Most cited works with industry', '被引最多的企业参与工作')}</h4><ol class="fd-drawer-list">${d.topCited.slice(0, 6).map(id => `<li>${paperLink(id)}</li>`).join('')}</ol></div></div>`;
  },
  newcomers() {
    const d = P.deeper.newcomers, ys = [...new Set(d.rows.map(r => r.year))];
    const row = (y, g) => d.rows.find(r => r.year === y && r.group === g);
    return `<p class="fd-note">${T('Newcomers: works whose institutions all appear in the Atlas for the first time that year; established: works whose institutions all appeared before. Only works whose reference list is known. A classic is one of the 50 most-cited Atlas works published up to 2023.', '新来者：所有机构都在当年首次出现在 Atlas 中的工作；老牌：所有机构都更早出现过的工作。只计参考文献列表已知的工作。经典指 2023 年及以前发表、被引最多的 50 项 Atlas 工作。')}</p>
    <table class="fd-table"><thead><tr><th>${T('Year', '年份')}</th><th></th><th>${T('Works', '工作')}</th><th>${T('Cite any Atlas work', '引用了 Atlas 工作')}</th><th>${T('Atlas works cited (mean)', '平均引用 Atlas 工作数')}</th><th>${T('Cite a classic', '引用了经典')}</th></tr></thead><tbody>${ys.map(y => ['new', 'established'].map(g => { const r = row(y, g); return r ? `<tr><th>${g === 'new' ? y : ''}</th><td>${g === 'new' ? T('Newcomers', '新来者') + ' ' + listButton(r.ids, T('read', '阅读'), `${y} · ${T('works from newcomer institutions', '新来机构的工作')}`) : T('Established', '老牌')}</td><td>${num(r.works)}</td><td>${pctf(r.anyAtlasRef, 0)}</td><td>${Number(r.meanAtlasRefs).toFixed(1)}</td><td>${pctf(r.citesClassic, 0)}</td></tr>` : ''; }).join('')).join('')}</tbody></table>
    <p class="fd-note">${listButton(d.classics, T('The 50 classics', '50 篇经典'), T('The 50 most-cited Atlas works up to 2023', '2023 年及以前被引最多的 50 项 Atlas 工作'))}</p>`;
  },
  diffusion() {
    const d = P.deeper.diffusion, M = 30, W = 620, L = 200, x = v => L + (W - L - 30) * Math.min(v, M) / M;
    const rows = d.terms, h = rows.length * 24 + 34;
    return `<div class="fd-legend"><span><svg width="12" height="12"><circle cx="6" cy="6" r="3.5" fill="${COLORS.attention}" opacity=".45"/></svg>${T('3 clusters', '3 个星团')}</span><span><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="${COLORS.attention}" opacity=".7"/></svg>${T('5 clusters', '5 个星团')}</span><span><svg width="12" height="12"><circle cx="6" cy="6" r="5.5" fill="${COLORS.attention}"/></svg>${T('10 clusters', '10 个星团')}</span></div>
    <svg viewBox="0 0 ${W} ${h}" class="fd-dumbbell" role="img">${[0, 6, 12, 18, 24, 30].map(t => `<line x1="${x(t)}" x2="${x(t)}" y1="6" y2="${h - 26}" class="fd-grid"/><text x="${x(t)}" y="${h - 10}" text-anchor="middle" class="fd-axis">${t}${t === 30 ? '+' : ''} ${t === 0 ? T('months', '个月') : ''}</text>`).join('')}
    ${rows.map((r, i) => { const y = 18 + i * 24, pts = [[r.to3, 3.5, .45], [r.to5, 4.5, .7], [r.to10, 5.5, 1]].filter(p => p[0] != null), end = pts.length ? pts[pts.length - 1][0] : 0;
      return `<text x="${L - 10}" y="${y + 4}" text-anchor="end" class="fd-axis">${esc(r.label)} · ${r.start}</text><line x1="${x(0)}" x2="${x(end)}" y1="${y}" y2="${y}" class="fd-span"/>${pts.map(([v, rad, op]) => `<circle cx="${x(v)}" cy="${y}" r="${rad}" fill="${COLORS.attention}" opacity="${op}"/>`).join('')}<text x="${x(end) + 10}" y="${y + 4}" class="fd-axis" data-tip="${esc(`${r.label}: ${r.works} ${T('titles', '个标题')}, ${r.clusters} ${T('clusters now', '个星团（目前）')}`)}">${r.to10 == null ? T(`${r.clusters} clusters so far`, `目前 ${r.clusters} 个星团`) : ''}</text>`; }).join('')}</svg>
    <p class="fd-note">${T(`Two-word terms and acronyms in titles, first seen in Atlas titles (third title) in 2023 or later and fewer than three titles before 2023, with at least 25 titles; spelled-out forms and acronyms are merged (MCP, VLA, RAG). A cluster counts once two of its titles use the term. Months from first seen; ${d.considered} terms qualify.`, `标题中的双词术语与缩写：在 Atlas 标题中首次出现（第三个标题）于 2023 年或之后、2023 年前少于三个标题、且至少有 25 个标题；全称与缩写合并（MCP、VLA、RAG）。一个星团中至少两个标题使用该术语才算进入该星团。月数从首次出现算起；共 ${d.considered} 个术语符合。`)} ${rows.map(r => listButton(r.ids, r.label, `${r.label} · ${T('titles', '标题')}`)).join(' ')}</p>`;
  },
};


// ------------------------------------------------------------------------------------------------ tail & gaps (RQ5, findings.tail)
const FACET_NAME = (kind, v) => ({surface: SURFACE_NAMES(), setting: SETTING_NAMES(), mechanism: MECH_NAMES()}[kind] || {})[v] || v.replace(/_/g, ' ');
const tierName = t => ({head: T('head', '头部'), torso: T('middle', '中部'), tail: T('tail', '长尾'), absent: T('absent', '尚未出现')}[t] || t);
const B4 = {
  caveat() {
    return `<p class="fd-note ln-tail-caveat">${T('Candidates for a reader to judge, not findings that work is missing or worth doing: the Atlas covers agent safety only, facet labels come from a language model, and some combinations are not meaningful. Empty space on the star map is never used as evidence; every gap here is a count against what similar combinations predict.', '这些是供读者判断的候选，不是“这里缺研究”或“值得做”的结论：Atlas 只收录 Agent 安全研究，分面标签由语言模型给出，有些组合本身没有意义。星图上的空白从不作为证据；这里的每个空白都是“实际数量”对比“相似组合推算的数量”。')}</p>`;
  },
  shape() {
    const th = P.tail.shape.threads, tm = P.tail.shape.terms;
    const row = (label, v, max, note) => `<div class="fd-hbar"><span>${label}</span>${barCell(v, max, COLORS.connection)}<b>${note}</b></div>`;
    return `${B4.caveat()}<div class="fd-hbars">${row(T('Head: the largest candidate clusters', '头部：最大的候选星团'), th.headUnits, th.units, `${num(th.headUnits)} / ${num(th.units)}`)}${row(T('Works in the tail', '长尾中的工作'), th.tailWorksShare, 100, pctf(th.tailWorksShare))}
     ${row(T('Head grew in a year', '头部一年增长'), th.head.ratio, Math.max(th.head.ratio, th.tail.ratio), '×' + th.head.ratio)}${row(T('Tail grew in a year', '长尾一年增长'), th.tail.ratio, Math.max(th.head.ratio, th.tail.ratio), '×' + th.tail.ratio)}</div>
     <p class="fd-note">${T(`Candidate clusters are the ${num(th.units)} automatic research threads of the star map; the head is the largest set that holds half of their works. In titles of the last 12 months, the 100 most used two-word terms and acronyms carry ${pctf(tm.headOccurrenceShare)} of term uses and the ${num(tm.tailTerms)} tail terms (2–10 titles each) carry ${pctf(tm.tailOccurrenceShare)}. ${num(tm.systemNamesDropped)} acronyms that mostly name a single system ("XYZ: …") are left out.`, `候选星团是星图中 ${num(th.units)} 条自动发现的研究线；头部是合计占其中一半工作的那些最大的研究线。在近 12 个月的标题中，最常用的 100 个两词术语与缩写占术语使用的 ${pctf(tm.headOccurrenceShare)}，${num(tm.tailTerms)} 个长尾术语（各出现在 2–10 篇标题中）合计占 ${pctf(tm.tailOccurrenceShare)}。主要作为单个系统名称出现的 ${num(tm.systemNamesDropped)} 个缩写（“XYZ: …”）不计入。`)}</p>`;
  },
  backtest() {
    const b = P.tail.backtest[0], b2 = P.tail.backtest[1], o = b.roseOrigin, tot = b.rose || 1, order = ['absent', 'tail', 'torso', 'head'];
    const bars = order.map(k => `<div class="fd-hbar"><span>${T('A year earlier: ', '一年前：')}${tierName(k)}</span>${barCell(100 * (o[k] || 0) / tot, 100, k === 'tail' || k === 'absent' ? COLORS.supply : COLORS.attention)}<b>${num(o[k] || 0)}</b></div>`).join('');
    const ex = b.examples.map(e => `<tr><th>${esc(e.term)}</th><td>${num(e.before)} → <b>${num(e.after)}</b></td><td>${tierName(e.tier)}</td><td>${e.ids.slice(0, 2).map(id => paperLink(id)).join('<br>')}</td></tr>`).join('');
    const sens = (b.sensitivity || []).map(x => `<tr><td>×${x.factor}, ≥ ${x.minTitles}</td><td>${num(x.rose)}</td><td>${pctf(x.fromTailOrAbsent, 0)}</td></tr>`).join('');
    const sg = b.signals, sname = {acceleration: T('Acceleration', '加速度'), clusters: T('Clusters reached', '覆盖星团'), citesPerWork: T('Citations per work (before)', '篇均被引（之前）'), institutionsPerWork: T('Institutions per work', '篇均机构'), code: T('Share with code', '有代码比例'), adoptions: T('Benchmark adoptions', '基准采用'), combined: T('All four combined', '四项合并')};
    const hn = b.headAfterOrigin || {};
    return `${B4.caveat()}<div class="fd-hbars">${bars}</div>
     <p class="fd-note">${T(`Title terms whose share of titles rose at least threefold to 20 titles or more between ${b.t0.slice(0, 7)} − 12 months and the following 12 months (${num(b.worksBefore)} → ${num(b.worksAfter)} works dated in the two windows), by where they stood a year earlier: head = the 100 most used, middle = 11 or more titles, tail = 2 to 10, absent = fewer than 2. Of today's 100 most used terms, ${num((hn.tail || 0) + (hn.absent || 0))} were in the tail or absent a year before.`, `在 ${b.t0.slice(0, 7)} 前后各 12 个月之间（两个窗口内有日期的工作 ${num(b.worksBefore)} → ${num(b.worksAfter)} 篇），标题占比至少涨到三倍且达到 20 篇以上的术语，按一年前所处位置分：头部 = 最常用的 100 个，中部 = 11 篇以上，长尾 = 2–10 篇，尚未出现 = 少于 2 篇。今天最常用的 100 个术语里，有 ${num((hn.tail || 0) + (hn.absent || 0))} 个一年前在长尾或尚未出现。`)}</p>
     <table class="fd-table"><thead><tr><th>${T('Term', '术语')}</th><th>${T('Titles: year before → year after', '标题数：前一年 → 后一年')}</th><th>${T('A year earlier', '一年前')}</th><th>${T('Most cited since', '此后被引最多')}</th></tr></thead><tbody>${ex}</tbody></table>
     <h4>${T('Other definitions of "rose" (declared in advance)', '“上升”的其他口径（事先设定）')}</h4>
     <table class="fd-table fd-compact"><thead><tr><th>${T('Share grew / titles', '占比增长 / 标题数')}</th><th>${T('Terms that rose', '上升术语')}</th><th>${T('From tail or absent', '来自长尾或尚未出现')}</th></tr></thead><tbody><tr><td>×3, ≥ 20</td><td>${num(b.rose)}</td><td>${pctf(b.roseFromTailOrAbsent, 0)}</td></tr>${sens}</tbody></table>
     <h4>${T('Could they have been picked in advance?', '能不能提前挑出来？')}</h4>
     <p class="fd-note">${T(`Not reliably yet. Of ${num(b.tailTerms)} tail terms a year ago, ${num(b.tailRose)} rose (base rate ${share(b.baseRate, 1)}). Ranking them by early signals measured only with data dated before then puts more risers near the top than chance, but with this few events the difference is not conclusive; ${b2 ? `18 months back: ${num(b2.tailRose)} of ${num(b2.tailTerms)}.` : ''}`, `暂时还不能可靠地做到。一年前的 ${num(b.tailTerms)} 个长尾术语中有 ${num(b.tailRose)} 个后来上升（基准率 ${share(b.baseRate, 1)}）。只用当时之前的数据计算早期信号来排序，排在前面的上升者比随机多，但事件太少，差别还不能下结论；${b2 ? `往前 18 个月：${num(b2.tailTerms)} 个中 ${num(b2.tailRose)} 个。` : ''}`)}</p>
     <table class="fd-table fd-compact"><thead><tr><th>${T('Signal (before the cut-off)', '信号（截点之前）')}</th><th>${T('Risers in top 50', '前 50 中的上升者')}</th><th>${T('× base rate', '相对基准率')}</th></tr></thead><tbody>${Object.entries(sg).map(([k, v]) => `<tr><td>${sname[k] || k}</td><td>${share(v.p50, 0)}</td><td>${v.lift50 == null ? '—' : '×' + v.lift50}</td></tr>`).join('')}</tbody></table>`;
  },
  rising() {
    const r = P.tail.rising;
    return `${B4.caveat()}<p class="fd-note">${T('Tail terms of the last 12 months (2–10 titles) ranked by the same four early signals as the backtest. The backtest has too few events to validate the ranking: treat it as a reading list, not a forecast.', '近 12 个月的长尾术语（2–10 篇标题），按回测中的四个早期信号排序。回测事件太少，排序未经验证：请把它当作阅读线索，而不是预测。')}</p>
     <table class="fd-table"><thead><tr><th>${T('Term', '术语')}</th><th>${T('Titles', '标题')}</th><th>${T('First seen', '首次出现')}</th><th>${T('Clusters', '星团')}</th><th>${T('Institutions / work', '机构/篇')}</th><th>${T('Citations / work', '被引/篇')}</th><th></th></tr></thead><tbody>${r.map(x => `<tr><th>${esc(x.term)}</th><td>${num(x.works)}</td><td>${esc((x.firstSeen || '').slice(0, 7))}</td><td>${num(x.clusters)}</td><td>${x.institutionsPerWork}</td><td>${x.citesPerWork}</td><td>${listButton(x.ids, T('Papers', '论文'), x.term)}</td></tr>`).join('')}</tbody></table>`;
  },
  gaps() {
    return `${B4.caveat()}${P.tail.gaps.map(g => `<h4>${{surface: T('Attack surface', '攻击入口'), setting: T('Agent setting', '智能体场景'), mechanism: T('Defence mechanism', '防御机制')}[g.x]} × ${{surface: T('attack surface', '攻击入口'), setting: T('agent setting', '智能体场景'), mechanism: T('defence mechanism', '防御机制')}[g.y]} <small>(${num(g.labelled)} ${T('labelled works', '项有标签的工作')})</small></h4>
     ${g.cells.length ? `<table class="fd-table"><thead><tr><th>${T('Combination', '组合')}</th><th>${T('Works', '工作')}</th><th>${T('Expected', '推算')}</th><th>${T('Expected from', '推算依据')}</th><th></th></tr></thead><tbody>${g.cells.slice(0, 8).map(c => `<tr><th>${esc(FACET_NAME(g.x, c.x))} × ${esc(FACET_NAME(g.y, c.y))}</th><td><b>${num(c.observed)}</b></td><td>${num(Math.round(c.expected))}</td><td class="fd-small">${(c.similarY || []).map(v => esc(FACET_NAME(g.y, v))).join(' · ')}</td><td>${listButton(c.xIds, esc(FACET_NAME(g.x, c.x)), FACET_NAME(g.x, c.x))} ${listButton(c.yIds, esc(FACET_NAME(g.y, c.y)), FACET_NAME(g.y, c.y))}${c.outside ? `<br><small>${T('Outside the Atlas', 'Atlas 之外')}: ${num(c.outside.total)}</small>` : ''}</td></tr>`).join('')}</tbody></table>` : `<p class="fd-note">${T('No combination meets the gap rule.', '没有组合满足空白的标准。')}</p>`}`).join('')}
     <p class="fd-note">${T('Expected = the share this surface (row) takes in the three settings whose surface mix is most like this one, times this setting\'s total — and the same the other way round; the smaller estimate is used. A gap needs ≥ 8 expected and ≤ 35% of it observed.', '推算 = 这个入口在“入口构成最相似的三个场景”中所占的份额 × 本场景总数；再反过来按最相似的三个入口推算一次，取较小者。空白要求推算 ≥ 8 篇、实际 ≤ 推算的 35%。')}</p>`;
  },
  imbalance() {
    const im = P.tail.imbalance;
    return `${B4.caveat()}<h4>${T('Most attack-heavy combinations', '最偏攻击的组合')}</h4><p class="fd-note">${T(`${num(im.attackOnlyCells)} surface × setting combinations have three times more attacks than defences; the most attack-heavy ones:`, `有 ${num(im.attackOnlyCells)} 个“入口 × 场景”组合的攻击数是防御的三倍以上；最偏攻击的是：`)}</p>
     <table class="fd-table fd-compact"><thead><tr><th>${T('Surface × setting', '入口 × 场景')}</th><th>${T('Attacks', '攻击')}</th><th>${T('Defences', '防御')}</th><th></th></tr></thead><tbody>${im.attackHeavy.map(r => `<tr><th>${esc(FACET_NAME('surface', r.surface))} × ${esc(FACET_NAME('setting', r.setting))}</th><td>${num(r.attacks)}</td><td>${num(r.defenses)}</td><td>${listButton(r.attackIds, T('Attacks', '攻击'), '')} ${listButton(r.defenseIds, T('Defences', '防御'), '')}</td></tr>`).join('')}</tbody></table>
     <h4>${T('Defences that are rarely tested in practice', '很少在实战条件下检验的防御')}</h4><p class="fd-note">${T('Combinations with at least 15 defences, of which at most 10% are tested in a real system or against adaptive attacks (as their abstracts state).', '至少有 15 篇防御、其中最多 10% 在真实系统中或针对自适应攻击做过检验（按摘要所述）的组合。')}</p>
     <table class="fd-table fd-compact"><thead><tr><th>${T('Surface × setting', '入口 × 场景')}</th><th>${T('Defences', '防御')}</th><th>${T('Tested', '经过检验')}</th><th></th></tr></thead><tbody>${im.untested.map(r => `<tr><th>${esc(FACET_NAME('surface', r.surface))} × ${esc(FACET_NAME('setting', r.setting))}</th><td>${num(r.defenses)}</td><td>${num(r.tested)} (${pctf(r.testedShare, 0)})</td><td>${listButton(r.defenseIds, T('Defences', '防御'), '')}</td></tr>`).join('')}</tbody></table>`;
  },
  bridges() {
    return `${B4.caveat()}<p class="fd-note">${T('Pairs of candidate clusters in different editorial clusters whose content is among the closest 3% of pairs, but which cite each other far less than pairs that close usually do. A missing bridge can be a chance to carry a method or a threat model across.', '分属不同编辑星团、内容接近度位于所有组合前 3%，但相互引用远少于同等接近的组合的候选星团对。缺失的桥梁可能意味着把方法或威胁模型带过去的机会。')}</p>
     <table class="fd-table"><thead><tr><th>${T('Candidate cluster A', '候选星团 A')}</th><th>${T('Candidate cluster B', '候选星团 B')}</th><th>${T('Closeness', '接近度')}</th><th>${T('Citations between', '相互引用')}</th><th>${T('Typical for that closeness', '同等接近的常见值')}</th></tr></thead><tbody>${P.tail.bridges.map(b => `<tr><td><b>${esc(b.a.label)}</b><br><small>${esc(b.a.cluster ? C.topicName(b.a.cluster) : '')} · ${num(b.a.works)}</small> ${listButton(b.a.ids, T('Papers', '论文'), b.a.label)}</td><td><b>${esc(b.b.label)}</b><br><small>${esc(b.b.cluster ? C.topicName(b.b.cluster) : '')} · ${num(b.b.works)}</small> ${listButton(b.b.ids, T('Papers', '论文'), b.b.label)}</td><td>${b.similarity.toFixed(2)}</td><td><b>${num(b.citations)}</b></td><td>${b.expected}</td></tr>`).join('')}</tbody></table>`;
  },
  open() {
    const o = P.tail.open;
    if (!o) return `<p class="fd-note">${T('Not computed in this analysis version.', '本分析版本未计算。')}</p>`;
    const st = o.stats, label = {open: T('No follow-up found', '未见后续'), 'being taken up': T('Being taken up', '已有少量跟进'), addressed: T('Taken up', '已被跟进')};
    return `${B4.caveat()}<p class="fd-note">${T(`From the limitation and future-work passages of ${num(st.worksRead)} full texts (read locally; only those passages were sent to DeepSeek, which had to quote the text verbatim), ${num(st.problems)} open problems were stated by ${num(st.worksWithProblems)} works. ${num(st.recurring)} problems recur across three papers or more; for ${num(st.recurringOpen)} of them no later Atlas work takes them up.`, `从 ${num(st.worksRead)} 篇全文的“局限 / 未来工作”段落中（本地读取；只把这些段落发给 DeepSeek，并要求逐字引用原文），${num(st.worksWithProblems)} 篇工作共提出 ${num(st.problems)} 个开放问题。其中 ${num(st.recurring)} 个被三篇以上论文反复提到；其中 ${num(st.recurringOpen)} 个在 Atlas 中没有看到后续工作接手。`)}</p>
     <ol class="ln-open">${o.groups.slice(0, 20).map(g => `<li><b>${esc(g.problem)}</b><span class="fd-small">${T(`Raised by ${num(g.papers)} papers (${(g.firstRaised || '').slice(0, 7)} → ${(g.lastRaised || '').slice(0, 7)}) · `, `${num(g.papers)} 篇论文提出（${(g.firstRaised || '').slice(0, 7)} → ${(g.lastRaised || '').slice(0, 7)}）· `)}<span class="ln-open-${g.status.replace(/ /g, '-')}">${label[g.status] || g.status}</span>${g.followUps ? ` (${num(g.followUps)})` : ''}</span> ${listButton(g.ids, T('Raised by', '提出的论文'), g.problem)}${g.followUpIds?.length ? ' ' + listButton(g.followUpIds, T('Possible follow-ups', '可能的后续'), g.problem) : ''}</li>`).join('')}</ol>
     <p class="fd-note">${T('Follow-up = a later Atlas work that cites a raising paper and is close in content to the problem, or is very close without citing. A problem with no follow-up may be hard, out of scope, or solved outside the Atlas: check before starting.', '后续 = 引用了提出论文、且内容与问题接近的后来的 Atlas 工作，或虽未引用但内容非常接近的工作。没有后续的问题可能很难、超出范围，或已在 Atlas 之外解决：动手之前请先核实。')}</p>`;
  },
};

function questionPool() {
  const dp = P.deeper;
  const tr = P.trends, g = P.rq4.growth, b = P.rq1.bands.summary, geo = tr.geography, con = tr.concentration, ys = geo.years, i23 = ys.indexOf(2023), iL = ys.length - 1;
  const rows = [...tr.clusterShares.rows].sort((a, c) => (c.shareRecent - c.shareBefore) - (a.shareRecent - a.shareBefore)), up = rows.slice(0, 3), down = rows.slice(-2).reverse();
  const conn = P.rq4.connection, c0 = conn[0], cMax = conn.reduce((a, x) => x.crossPct > a.crossPct ? x : a, conn[0]), pub = P.rq4.publication, lag = P.fractures.timeliness.surveyLag;
  const top = P.benchmarks[0], h2a = P.rq2.h2aDetail[0], inst = P.rq3.institutions, instRow = Object.fromEntries(inst.rows.map(x => [x.id, x])), firstSupplier = instRow[inst.top.supply[0]];
  const mm = [...P.rq3.clusters].sort((a, c) => (c.rank.suppliedOutside - c.rank.works) - (a.rank.suppliedOutside - a.rank.works)), under = mm[0], over = mm[mm.length - 1];
  const lead = geo.byCluster.filter(r => (r.CN || 0) > (r.US || 0)), bal = P.lenses.balance.map(r => ({...r, ratio: (r.recent[0] + 0.5) / (r.recent[1] + 0.5)})).sort((a, c) => c.ratio - a.ratio);
  const frag = [...P.fragmentation].sort((a, c) => c.defenses - a.defenses)[0], comp = P.lenses.comparability.filter(c => c.pairShare != null), md = P.lenses.models,
    usUk = P.trends.geography.byCluster.filter(r => r.works >= 100).sort((a, c) => (c.US + (c.GB || 0)) - (a.US + (a.GB || 0))).slice(0, 3),
    compDelta = comp.length > 1 ? comp[comp.length - 1].pairShare - comp[0].pairShare : 0,
    compWord = compDelta > 3 ? T('Rising from a low base', '比例偏低，但在上升') : compDelta < -3 ? T('Less and less', '越来越难') : T('Rarely, and not improving', '一直偏低'), mi = md.years.length - 1, bc = md.byCountry, st = P.lenses.settings, sl = st.halves.length - 1;
  const fx = P.lenses, lastOf = v => [...(v || [])].reverse().find(x => x != null), firstOf = v => (v || []).find(x => x != null);
  const surf = fx.surfaces ? Object.entries(fx.surfaces.share).map(([k, v]) => [k, firstOf(v), lastOf(v)]).filter(r => r[1] != null).sort((x, y) => (y[2] - y[1]) - (x[2] - x[1])) : [];
  const mech = fx.mechanisms ? Object.entries(fx.mechanisms.share).sort((x, y) => (y[1][1] - y[1][0]) - (x[1][1] - x[1][0])) : [];
  const adaptRows = fx.adaptive ? fx.adaptive.byHalf.filter(x => x.yes != null) : [];
  const ms = milestoneModel(), pilot = Object.fromEntries(P.rq1.pilot.table.map(r => [r.ranker, r])), words = tr.terms.rising.slice(0, 5).map(x => x.term.toLowerCase());
  const pp = r => `${cl(r.cluster)} ${pctf(r.shareBefore)}→${pctf(r.shareRecent)}`;
  const Q = {
    evolve: [
      ['growth', T('How fast is the field growing?', '这个领域长得多快？'), T(`It doubles about every ${g.doublingMonths} months; ${pctf(b.novaShareCorpus)} of all works are less than ${P.meta.novaMonths} months old.`, `约每 ${g.doublingMonths} 个月翻一番；${pctf(b.novaShareCorpus)} 的工作不足 ${P.meta.novaMonths} 个月。`), B.growth()],
      ['shift', T('Where is the focus moving?', '重心在往哪里移？'), T(`Toward execution: ${up.map(pp).join(', ')}; ${down.map(pp).join(' and ')} lost share.`, `移向执行环节：${up.map(pp).join('，')}；${down.map(pp).join('、')}份额下降。`), B.shift()],
      dp?.diversity ? ['diversify', T('Is the field spreading out or converging?', '这个领域在分散还是收敛？'), (() => { const d = dp.diversity, a = d.find(r => r.year === 2022) || d[0], full = d.filter(r => r.year < new Date(P.universe.asOf).getFullYear()), b = full[full.length - 1]; return T(`${b.clusters > a.clusters ? 'Spreading out' : 'Converging'}: the effective number of clusters went from ${a.clusters} (${a.year}) to ${b.clusters} (${b.year}), and of countries from ${a.countries} to ${b.countries}.`, `${b.clusters > a.clusters ? '在分散' : '在收敛'}：有效星团数从 ${a.clusters}（${a.year}）变为 ${b.clusters}（${b.year}），有效国家数从 ${a.countries} 变为 ${b.countries}。`); })(), B3.diversify()] : null,
      ['terms', T('What are new papers talking about?', '新论文在谈什么？'), T(`Rising in titles: ${words.join(', ')}; fading: ${tr.terms.fading.slice(0, 3).map(x => x.term.toLowerCase()).join(', ')}.`, `标题中上升：${words.join('、')}；下降：${tr.terms.fading.slice(0, 3).map(x => x.term.toLowerCase()).join('、')}。`), B.terms()],
      dp ? ['diffusion', T('How fast do new ideas spread across clusters?', '新想法在星团间扩散得多快？'), (() => { const d = dp.diffusion, a = d.to10Before2025[0], b = d.to10Since2025[0], f = [...d.terms].filter(x => x.to5 != null).sort((x, y) => x.to5 - y.to5)[0]; return T(`${b != null && a != null && b < a ? 'Faster than before' : 'Not faster than before'}: terms first seen since 2025 reached 10 clusters in a median ${b ?? '—'} months, against ${a ?? '—'} for 2023–24 terms${f ? `; ${f.label} reached 5 clusters in ${f.to5} months` : ''}.`, `${b != null && a != null && b < a ? '比以前更快' : '没有比以前更快'}：2025 年以来首次出现的术语进入 10 个星团的中位时间是 ${b ?? '—'} 个月，2023–24 年的术语是 ${a ?? '—'} 个月${f ? `；${f.label} 只用 ${f.to5} 个月就进入 5 个星团` : ''}。`); })(), B3.diffusion()] : null,
      ['timeline', T('When did attacks, defences and benchmarks take shape?', '攻击、防御、基准各在什么时候成形？'), T(`With N = ${ms.n} from ${ms.from}: benchmarks reached N at least six months after attacks in ${ms.late} of ${ms.both} clusters; defences did in ${ms.lateDef}. Move N to see the history change.`, `N = ${ms.n}、从 ${ms.from} 年起：${ms.both} 个星团中有 ${ms.late} 个的基准比攻击晚 6 个月以上达到 N，防御晚 6 个月以上的有 ${ms.lateDef} 个。拖动 N 看这段历史怎样变化。`), B.milestones()],
      ['reading', T('Are research lines reading each other more?', '研究线之间是否越读越多？'), T(`Citations into other clusters rose from ${pctf(c0.crossPct)} (${c0.year}) to ${pctf(cMax.crossPct)} (${cMax.year}); young candidate clusters send ${pctf(P.rq4.threads.h4b.youngCross)} of references outside their topic vs ${pctf(P.rq4.threads.h4b.oldCross)} for older ones.`, `落到其他星团的引用从 ${pctf(c0.crossPct)}（${c0.year}）升到 ${pctf(cMax.crossPct)}（${cMax.year}）；年轻候选星团有 ${pctf(P.rq4.threads.h4b.youngCross)} 的参考文献指向本主题之外，较老的为 ${pctf(P.rq4.threads.h4b.oldCross)}。`), B.crossYears()],
      ['path', T('How fast does work move from preprint to venue to survey?', '从预印本到正式发表、到被综述，有多快？'), T(`${pctf(pub.preprintFirstPct)} appear on arXiv first, a median ${pub.medianLagMonths} months before the venue; ${lag.surveyAgeMonths} months after release, ${lag.nearSince} of a survey's 300 nearest works are already newer than it.`, `${pctf(pub.preprintFirstPct)} 先发 arXiv，中位比正式发表早 ${pub.medianLagMonths} 个月；综述发表 ${lag.surveyAgeMonths} 个月后，其 300 个最近邻中已有 ${lag.nearSince} 篇晚于它。`), B.publicationPath()],
      ['radar', T('Which topics are active and gaining share? (topic radar)', '哪些主题活跃且份额在升？（主题雷达）'), T('Activity against change in share, with the papers behind each point.', '活跃度与份额变化，每个点都可查看背后的论文。'), B.insightsLink('topics', T('Open the topic radar', '打开主题雷达'), T('Built from the same snapshot by the Research signals module.', '由研究信号模块基于同一快照生成。'))],
    ],
    connect: [
      dp?.traditions ? ['traditions', T('Is agent safety one field or two?', 'Agent 安全是一个领域还是两个？'), (() => { const t = dp.traditions, c = t.citations, a = t.ancestors[0]; return T(`Two traditions joined by a thin bridge: LLM-agent work (${pctf(t.groups[0].share, 0)} of works, ${pctf(t.groups[0].since2025, 0)} since 2025) and control and robotics work (${pctf(t.groups[1].share, 0)}); only ${pctf(c.cross, 1)} of citations cross between them against ${pctf(c.expectedCross, 0)} expected from their sizes, and the ${pctf(t.boundary.share, 1)} of works on the boundary carry ${pctf(t.boundary.crossTouching, 0)} of those crossings.`, `两个传统，一条细桥：LLM 智能体工作（占 ${pctf(t.groups[0].share, 0)}，${pctf(t.groups[0].since2025, 0)} 发表于 2025 年以后）与控制和机器人工作（占 ${pctf(t.groups[1].share, 0)}）；两者之间只有 ${pctf(c.cross, 1)} 的引用，按规模应有约 ${pctf(c.expectedCross, 0)}；分界上 ${pctf(t.boundary.share, 1)} 的工作承载了其中 ${pctf(t.boundary.crossTouching, 0)} 的跨越。`); })(), B3.traditions()] : null,
      ['layers', T('What connects different research lines?', '不同研究线靠什么连接？'), T(`Citations follow content closely (ρ = ${P.rq2.correlation['citeRatio|semantic']}); shared institutions and shared benchmarks add links of their own (ρ with citations ${P.rq2.correlation['citeRatio|collab']} and ${P.rq2.correlation['citeRatio|resource']}).`, `引用与内容高度同步（ρ = ${P.rq2.correlation['citeRatio|semantic']}）；共同机构与共用基准各自补充了不同的连接（与引用的 ρ 分别为 ${P.rq2.correlation['citeRatio|collab']} 和 ${P.rq2.correlation['citeRatio|resource']}）。`), B.layers()],
      ['notreading', T('Which close research lines do not read each other?', '哪些内容相近的方向彼此不读？'), h2a ? T(`${cl(h2a.a)} and ${cl(h2a.b)} write about similar things but cite each other at ${h2a.citeRatio}× the expected rate and draw on different institutions.`, `“${cl(h2a.a)}”与“${cl(h2a.b)}”内容相近，互相引用却只有期望值的 ${h2a.citeRatio} 倍，机构来源也几乎不同。`) : T('No pair meets the rule on this snapshot.', '本快照中没有星团对满足条件。'), B.notReading()],
      dp ? ['buildson', T('Who builds on whom?', '谁建立在谁之上？'), (() => { const b = dp.buildsOn, p0 = b.pairs[0], s = b.supply.filter(r => r.net > 0).slice(0, 3); return T(`${cl(p0.from)} cites ${cl(p0.to)} ${p0.ratio}× as often as the reverse; the clusters others build on most are ${s.map(r => cl(r.cluster)).join(', ')}.`, `“${cl(p0.from)}”引用“${cl(p0.to)}”的次数是反向的 ${p0.ratio} 倍；最常被其他星团当作基础的是${s.map(r => `“${cl(r.cluster)}”`).join('、')}。`); })(), B3.buildsOn()] : null,
      dp?.venues ? ['venues', T('Is agent safety an ML field or a security field?', 'Agent 安全是机器学习领域还是安全领域？'), (() => { const v = dp.venues, rs = v.byYear.filter(r => r.year >= 2024 && r.verified >= 100), ml = rs.map(r => r.ml3), se = rs.map(r => r.security4), top = [...v.byCluster].sort((a, b) => b.security4 - a.security4).slice(0, 3), mostlyMl = Math.min(...ml) > 3 * Math.max(...se); return T(`${mostlyMl ? 'Mostly ML' : 'Both'}: since 2024 the ML top-3 take ${pctf(Math.min(...ml), 0)}–${pctf(Math.max(...ml), 0)} of verified publications and the security top-4 ${pctf(Math.min(...se), 0)}–${pctf(Math.max(...se), 0)}; security venues matter for ${top.map(r => `${cl(r.cluster)} (${pctf(r.security4, 0)})`).join(', ')}.`, `${mostlyMl ? '主要是机器学习' : '两者兼有'}：2024 年以来，机器学习三大会占已核实发表的 ${pctf(Math.min(...ml), 0)}–${pctf(Math.max(...ml), 0)}，安全四大只占 ${pctf(Math.min(...se), 0)}–${pctf(Math.max(...se), 0)}；安全会议对${top.map(r => `“${cl(r.cluster)}”（${pctf(r.security4, 0)}）`).join('、')}更重要。`); })(), B3.venues()] : null,
      ['hubs', T('Are benchmarks the hubs?', '基准是连接的枢纽吗？'), T(`${top.name} is used in experiments by ${top.users} works from ${top.clusters} clusters; shared benchmarks also join clusters that rarely cite each other.`, `${top.name} 被 ${top.clusters} 个星团的 ${top.users} 项工作用于实验；共用基准还把引用上很少往来的星团连在一起。`), B.hubs()],
      ['inflation', T('Are there too many benchmarks?', '基准是否过剩？'), T(`${pctf(con.benchmarkReuse.unusedPct)} of named benchmarks older than six months have no recorded use by another Atlas work; only ${con.benchmarkReuse.usedThree} of ${num(con.benchmarkReuse.benchmarks)} are used three or more times.`, `发布超过 6 个月的具名基准中 ${pctf(con.benchmarkReuse.unusedPct)} 没有被其他 Atlas 工作采用的记录；${num(con.benchmarkReuse.benchmarks)} 个中只有 ${con.benchmarkReuse.usedThree} 个被采用 3 次以上。`), B.inflation()],
      dp ? ['lifecycle', T('How long does a benchmark take to catch on, and does it last?', '一个基准多久被用起来，能用多久？'), (() => { const L = dp.benchmarkLife; return T(`Only ${L.benchmarks} benchmarks reach five uses; for them the first use comes a median ${L.medianFirstUse} months after release and the fifth after ${L.medianFifthUse}; ${L.oldStillUsed === L.oldBenchmarks ? `all ${L.oldBenchmarks}` : `${L.oldStillUsed} of the ${L.oldBenchmarks}`} older than 18 months are still in use.`, `只有 ${L.benchmarks} 个基准达到五次使用；它们在发布后中位 ${L.medianFirstUse} 个月迎来首次使用、${L.medianFifthUse} 个月迎来第五次；发布超过 18 个月的 ${L.oldStillUsed === L.oldBenchmarks ? `${L.oldBenchmarks} 个全部` : `${L.oldBenchmarks} 个中有 ${L.oldStillUsed} 个`}仍在被使用。`); })(), B3.lifecycle()] : null,
      ['supply', T('Which clusters supply the benchmarks others use?', '哪些星团提供了被他人使用的基准？'), T(`Size and supply differ: ${cl(under.cluster)} is #${under.rank.works} by works but #${under.rank.suppliedOutside} for benchmarks used outside it; ${cl(over.cluster)} goes from #${over.rank.works} to #${over.rank.suppliedOutside}.`, `规模与供给不一致：“${cl(under.cluster)}”工作数第 ${under.rank.works}，被外部采用的基准却排第 ${under.rank.suppliedOutside}；“${cl(over.cluster)}”从第 ${over.rank.works} 升到第 ${over.rank.suppliedOutside}。`), B.rank()],
    ],
    lead: [
      ['shares', T('Where does the work come from, and how is that shifting?', '研究来自哪里，格局怎样变化？'), T(`${country('CN')} rose from ${pctf(geo.share.CN[i23])} (2023) to ${pctf(geo.share.CN[iL])} (${ys[iL]}) of located works; ${country('US')} went from ${pctf(geo.share.US[i23])} to ${pctf(geo.share.US[iL])}, ${country('GB')} from ${pctf(geo.share.GB?.[i23])} to ${pctf(geo.share.GB?.[iL])}.`, `${country('CN')}在已定位工作中的份额从 ${pctf(geo.share.CN[i23])}（2023）升到 ${pctf(geo.share.CN[iL])}（${ys[iL]}）；${country('US')}从 ${pctf(geo.share.US[i23])} 降到 ${pctf(geo.share.US[iL])}，${country('GB')}从 ${pctf(geo.share.GB?.[i23])} 降到 ${pctf(geo.share.GB?.[iL])}。`), B.geo()],
      ['directions', T('Who leads each direction?', '各方向由谁主导？'), lead.length ? T(`${country('CN')} leads ${country('US')} only in ${lead.map(r => cl(r.cluster)).join(', ')}; the most US- and UK-heavy clusters are ${usUk.map(r => `${cl(r.cluster)} (${pctf(r.US + (r.GB || 0), 0)})`).join(', ')}.`, `只有在“${lead.map(r => cl(r.cluster)).join('、')}”中${country('CN')}超过${country('US')}；美英合计占比最高的星团是${usUk.map(r => `“${cl(r.cluster)}”（${pctf(r.US + (r.GB || 0), 0)}）`).join('、')}。`) : '', B.lean()],
      dp ? ['pioneers', T('Who opened each direction, and who leads it now?', '每个方向由谁开创，现在由谁领先？'), (() => { const r = dp.pioneers, f = Object.entries(r.reduce((m, x) => ({...m, [x.first]: (m[x.first] || 0) + 1}), {})).sort((a, b) => b[1] - a[1])[0], ch = r.filter(x => x.first !== x.now); return T(`${f[1] === r.length ? `All ${r.length} clusters were` : `${f[1]} of ${r.length} clusters were`} opened mainly from ${country(f[0])} (their first 30 works); ${ch.length ? `the lead has since moved in ${ch.map(x => `${cl(x.cluster)} (to ${country(x.now)})`).join(', ')}` : 'no cluster has changed leader since'}.`, `${f[1] === r.length ? `全部 ${r.length} 个星团都` : `${r.length} 个星团中有 ${f[1]} 个`}主要由${country(f[0])}开创（看最早 30 项工作）；${ch.length ? `此后领先者发生变化的有${ch.map(x => `“${cl(x.cluster)}”（转到${country(x.now)}）`).join('、')}` : '此后没有星团更换领先者'}。`); })(), B3.pioneers()] : null,
      dp ? ['geoconc', T('Which directions depend most on one country?', '哪些方向最依赖单一国家？'), (() => { const g = dp.geoConcentration, c = [...g].sort((a, b) => b.topShare - a.topShare)[0], i = [...g].sort((a, b) => b.international - a.international)[0]; return T(`Most concentrated: ${cl(c.cluster)}, ${pctf(c.topShare, 0)} from ${country(c.top)}; most international: ${cl(i.cluster)}, where ${pctf(i.international, 0)} of works span two or more countries.`, `最集中：“${cl(c.cluster)}”，${pctf(c.topShare, 0)} 来自${country(c.top)}；最国际化：“${cl(i.cluster)}”，${pctf(i.international, 0)} 的工作跨两个及以上国家。`); })(), B3.geoconc()] : null,
      ['influence', T('Does leading in output mean leading in influence?', '产出领先是否等于影响力领先？'), T(`Not for benchmarks: only ${inst.overlapWorksSupply} of the top 15 institutions by output are in the top 15 by benchmark supply; ${firstSupplier?.name} supplies the most while #${firstSupplier?.outputRank} by output.`, `在基准上不是：产出前 15 的机构中只有 ${inst.overlapWorksSupply} 个同时位于基准供给前 15；${firstSupplier?.name} 供给最多，产出仅排第 ${firstSupplier?.outputRank}。`), B.institutions()],
      dp ? ['punch', T('Are countries cited in line with their share?', '各国的被引是否与产出份额相称？'), (() => { const inf = dp.influence, y = inf.cohorts[inf.cohorts.length - 1], y0 = inf.cohorts[inf.cohorts.length - 2], r = (c, yy) => inf.rows[c]?.find(x => x.year === yy); const us = r('US', y), cn = r('CN', y), cn0 = r('CN', y0); return us && cn ? T(`Among ${y} papers, ${country('US')} has ${pctf(us.workShare, 0)} of works but ${pctf(us.top10Share, 0)} of the most-cited tenth; ${country('CN')} ${pctf(cn.workShare, 0)} and ${pctf(cn.top10Share, 0)}${cn0 ? ` (${y0}: ${pctf(cn0.workShare, 0)} and ${pctf(cn0.top10Share, 0)})` : ''}.`, `${y} 年的论文中，${country('US')}占 ${pctf(us.workShare, 0)} 的工作，却占被引最多前 10% 的 ${pctf(us.top10Share, 0)}；${country('CN')}分别为 ${pctf(cn.workShare, 0)} 和 ${pctf(cn.top10Share, 0)}${cn0 ? `（${y0} 年：${pctf(cn0.workShare, 0)} 和 ${pctf(cn0.top10Share, 0)}）` : ''}。`) : ''; })(), B3.punch()] : null,
      dp?.global ? ['apart', T('Are the two largest producers pulling apart?', '两个最大的产出国在疏远吗？'), (() => { const g = dp.global, r0 = g.usCn.find(r => r.year === 2023) || g.usCn[0], rL = g.usCn[g.usCn.length - 1], pr = g.partners.CN_recent.top, down = rL.cnWithUs < r0.cnWithUs - 5; return T(`${down ? 'From China’s side, yes' : 'Not clearly'}: works from ${country('CN')} that include a ${country('US')} institution went from ${pctf(r0.cnWithUs, 0)} (${r0.year}) to ${pctf(rL.cnWithUs, 0)} (${rL.year}); its international partners are now led by ${pr.slice(0, 3).map(([c, v]) => `${country(c)} ${pctf(v, 0)}`).join(', ')}, while ${pctf(rL.usWithCn, 0)} of US works include China.`, `${down ? '从中国一侧看，是的' : '不明显'}：有${country('US')}机构参与的${country('CN')}工作从 ${pctf(r0.cnWithUs, 0)}（${r0.year}）降到 ${pctf(rL.cnWithUs, 0)}（${rL.year}）；中国的国际合作伙伴现在依次是${pr.slice(0, 3).map(([c, v]) => `${country(c)} ${pctf(v, 0)}`).join('、')}；美国工作中有中国机构参与的比例为 ${pctf(rL.usWithCn, 0)}。`); })(), B3.apart()] : null,
      dp?.global ? ['rising', T('Who is rising fastest, and how many countries take part?', '谁增长最快？有多少国家参与？'), (() => { const g = dp.global, r = g.rising.slice(0, 3), c0 = g.countries.find(x => x.year === 2023) || g.countries[0], cL = g.countries[g.countries.length - 1]; return T(`From ${g.growthYears[0]} to ${g.growthYears[1]}: ${r.map(x => `${country(x[0])} ×${x[3]}`).join(', ')}, against ×${g.fieldGrowth} for the field; ${cL.countries} countries and regions took part in ${cL.year}, against ${c0.countries} in ${c0.year}.`, `${g.growthYears[0]} 到 ${g.growthYears[1]} 年：${r.map(x => `${country(x[0])} ×${x[3]}`).join('、')}，整个领域 ×${g.fieldGrowth}；${cL.year} 年有 ${cL.countries} 个国家和地区参与，${c0.year} 年为 ${c0.countries} 个。`); })(), B3.rising()] : null,
      dp?.teams ? ['bigteams', T('Is agent safety becoming big-team science?', 'Agent 安全在变成大团队科学吗？'), (() => { const rows = dp.teams.rows, r0 = rows.find(r => r.year === 2023) || rows[0], rows2 = rows.filter(r => r.bigTop10Share != null), mx = rows.filter(r => r.year < new Date(P.universe.asOf).getFullYear()).reduce((a, r) => r.bigShare > a.bigShare ? r : a, r0); const lo = Math.min(...rows2.map(r => r.bigTop10Share)), hi = Math.max(...rows2.map(r => r.bigTop10Share)); return T(`Works with ten or more authors went from ${pctf(r0.bigShare, 0)} (${r0.year}) to ${pctf(mx.bigShare, 0)} (${mx.year}) and hold ${pctf(lo, 0)}–${pctf(hi, 0)} of each year’s most-cited tenth.`, `10 位以上作者的工作从 ${pctf(r0.bigShare, 0)}（${r0.year}）升到 ${pctf(mx.bigShare, 0)}（${mx.year}），却占每年被引前 10% 的 ${pctf(lo, 0)}–${pctf(hi, 0)}。`); })(), B3.bigteams()] : null,
      dp?.industry ? ['industry', T('Does industry work carry more weight than its share?', '企业参与的工作，分量是否超过它的份额？'), (() => { const d = dp.industry, r = d.cohorts[d.cohorts.length - 1], r0 = d.cohorts[0]; return T(`${r.top10Share > r.workShare ? 'Yes' : 'No'}: works with a company are ${pctf(r.workShare, 0)} of ${r.year} works but ${pctf(r.top10Share, 0)} of its most-cited tenth (${r0.year}: ${pctf(r0.workShare, 0)} and ${pctf(r0.top10Share, 0)}); academic works give ${pctf(d.academicRefsToIndustry, 0)} of their Atlas references to them.`, `${r.top10Share > r.workShare ? '是' : '否'}：有企业参与的工作占 ${r.year} 年工作的 ${pctf(r.workShare, 0)}，却占被引最多前 10% 的 ${pctf(r.top10Share, 0)}（${r0.year} 年：${pctf(r0.workShare, 0)} 和 ${pctf(r0.top10Share, 0)}）；学术界工作把 ${pctf(d.academicRefsToIndustry, 0)} 的 Atlas 内引用给了它们。`); })(), B3.industry()] : null,
      ['concentration', T('Is the field concentrating?', '这个领域在集中还是分散？'), T(`Output spreads out — the top ten institutions went from ${pctf(con.institutions[0].top10Share)} to ${pctf(con.institutions[iL].top10Share)} and ${num(con.institutions[iL].newInstitutions)} institutions are new in ${ys[iL]} — while attention concentrates: the top 1% of works hold ${pctf(con.citations.top1Share)} of citations.`, `产出在分散——前 10 机构份额从 ${pctf(con.institutions[0].top10Share)} 降到 ${pctf(con.institutions[iL].top10Share)}，${ys[iL]} 年有 ${num(con.institutions[iL].newInstitutions)} 个机构首次出现；关注度却在集中：前 1% 的工作拿走 ${pctf(con.citations.top1Share)} 的引用。`), B.concentration()],
      ['people', T('Which researchers and institutions to watch?', '值得关注的研究者与机构'), T('Contribution indices with the evidence behind each rank (names are not fully disambiguated).', '贡献指数及每个排名背后的证据（姓名尚未完全消歧）。'), B.insightsLink('researchers', T('Open researchers and institutions', '打开研究者与机构'), T('Built from the same snapshot by the Research signals module; institutions are on the next tab there.', '由研究信号模块基于同一快照生成；机构在该页下一个标签。'))],
    ],
    attack: [
      ['balance', T('Which entry points are attacked more than defended?', '哪些入口攻多守少？'), T(`In the last 12 months: ${bal.slice(0, 3).map(r => `${cl(r.cluster)} ${r.recent[0]}:${r.recent[1]}`).join(', ')} attacks to defences; ${bal.slice(-2).map(r => `${cl(r.cluster)} ${r.recent[0]}:${r.recent[1]}`).join(' and ')} are defence-heavy.`, `近 12 个月攻击与防御之比：${bal.slice(0, 3).map(r => `“${cl(r.cluster)}” ${r.recent[0]}:${r.recent[1]}`).join('，')}；${bal.slice(-2).map(r => `“${cl(r.cluster)}” ${r.recent[0]}:${r.recent[1]}`).join('、')}以防御为主。`), B.balance()],
      ...(fx.surfaces ? [['surfaces', T('Through which channels do attacks come, and which are rising?', '攻击从哪些入口进来，哪些在上升？'), T(`${surf.slice(0, 2).map(([k, a0, a1]) => `${SURFACE_NAMES()[k]} ${pctf(a0)}→${pctf(a1)}`).join(', ')} of attack papers; ${surf.slice(-1).map(([k, a0, a1]) => `${SURFACE_NAMES()[k]} ${pctf(a0)}→${pctf(a1)}`).join('')}.`, `攻击论文中，${surf.slice(0, 2).map(([k, a0, a1]) => `${SURFACE_NAMES()[k]} ${pctf(a0)}→${pctf(a1)}`).join('，')}；${surf.slice(-1).map(([k, a0, a1]) => `${SURFACE_NAMES()[k]} ${pctf(a0)}→${pctf(a1)}`).join('')}。`), B.facetMultiples('surfaces', SURFACE_NAMES(), T('Share of attack papers per half-year that name each entry channel (a paper can name several).', '每半年攻击论文中提到各入口的比例（一篇可提到多个）。'))]] : []),
      ['timeline', T('How long did defences and benchmarks take to follow attacks?', '防御与基准跟上攻击用了多久？'), T(`With N = ${ms.n} from ${ms.from}: defences reached N six months or more after attacks in ${ms.lateDef} of ${ms.both} clusters, benchmarks in ${ms.late}.`, `N = ${ms.n}、从 ${ms.from} 年起：${ms.both} 个星团中有 ${ms.lateDef} 个的防御、${ms.late} 个的基准比攻击晚 6 个月以上达到 N。`), B.milestones()],
      ...(fx.mechanisms ? [['mechanisms', T('How are defences built, and how is that changing?', '防御是怎样做的，正在怎样变化？'), T(`${mech.slice(0, 2).map(([k, [x, y]]) => `${MECH_NAMES()[k]} ${pctf(x)}→${pctf(y)}`).join(', ')}; ${mech.slice(-1).map(([k, [x, y]]) => `${MECH_NAMES()[k]} ${pctf(x)}→${pctf(y)}`).join('')} of defences.`, `防御论文中，${mech.slice(0, 2).map(([k, [x, y]]) => `${MECH_NAMES()[k]} ${pctf(x)}→${pctf(y)}`).join('，')}；${mech.slice(-1).map(([k, [x, y]]) => `${MECH_NAMES()[k]} ${pctf(x)}→${pctf(y)}`).join('')}。`), B.mechanisms()]] : []),
      ['comparable', T('Can defences be compared with each other?', '防御之间能否直接比较？'), T(`${compWord}: two defences published in the same half-year share a benchmark ${comp.map(c => `${pctf(c.pairShare, 0)} (${c.half})`).join(' → ')}; in ${cl(frag.cluster)}, ${pctf(frag.pairShare)} across ${frag.defenses} defences.`, `${compWord}：同一半年发表的两项防御共用基准的比例为 ${comp.map(c => `${pctf(c.pairShare, 0)}（${c.half}）`).join(' → ')}；“${cl(frag.cluster)}”的 ${frag.defenses} 项防御中为 ${pctf(frag.pairShare)}。`), B.comparability()],
      fx.adaptive ? ['adaptive', T('Are defences tested against adaptive attacks?', '防御是否经过自适应攻击检验？'), T(`${fx.adaptive.overall < 15 ? 'Rarely' : 'Sometimes'}: ${pctf(fx.adaptive.overall)} of ${num(fx.adaptive.defenses)} defences report it in the abstract (${adaptRows.map(x => `${x.half} ${pctf(x.yes)}`).slice(-3).join(' → ')}).`, `${fx.adaptive.overall < 15 ? '很少' : '有时'}：${num(fx.adaptive.defenses)} 项防御中有 ${pctf(fx.adaptive.overall)} 在摘要中报告（${adaptRows.map(x => `${x.half} ${pctf(x.yes)}`).slice(-3).join(' → ')}）。`), B.adaptive()]
        : ['adaptive', T('Are defences tested against adaptive attacks?', '防御是否经过自适应攻击检验？'), T('Waiting for the facet labels.', '等待 LLM 标签。'), B.pending(T('The facet labelling records, for each defence, whether its abstract reports tests against adaptive attacks.', 'LLM 标签会为每项防御记录其摘要是否报告了自适应攻击检验。'))],
      ...(fx.evaluation ? [['realism', T('How realistic are the evaluations?', '评测有多接近真实？'), T(`Among attack, defence and benchmark papers, simulated environments went to ${pctf(lastOf(fx.evaluation.share.simulated_environment))}; real systems stay at ${pctf(lastOf(fx.evaluation.share.real_system))}.`, `在攻击、防御与基准论文中，模拟环境升到 ${pctf(lastOf(fx.evaluation.share.simulated_environment))}；真实系统一直只有 ${pctf(lastOf(fx.evaluation.share.real_system))}。`), B.facetMultiples('evaluation', EVAL_NAMES(), T('Share per half-year of attack, defence and benchmark papers by how results are obtained.', '每半年攻击、防御与基准论文按结果获取方式的比例。'))]] : []),
    ],
    targets: [
      ['models', T('Which models are put to the test?', '大家在测哪些模型？'), T(`GPT went from ${pctf(md.share.GPT[0])} to ${pctf(md.share.GPT[mi])} of works naming a model (${md.years[0]}→${md.years[mi]}); Claude rose to ${pctf(md.share.Claude[mi])}, Qwen from ${pctf(md.share.Qwen[0])} to ${pctf(md.share.Qwen[mi])}.`, `点名模型的工作中，GPT 从 ${pctf(md.share.GPT[0])} 降到 ${pctf(md.share.GPT[mi])}（${md.years[0]}→${md.years[mi]}）；Claude 升到 ${pctf(md.share.Claude[mi])}，Qwen 从 ${pctf(md.share.Qwen[0])} 升到 ${pctf(md.share.Qwen[mi])}。`), B.models()],
      ['country', T('Do US and Chinese papers test different models?', '中美论文测的模型不同吗？'), T(`Yes: works from ${country('CN')} name Qwen ${pctf(bc.CN.share.Qwen, 0)} and DeepSeek ${pctf(bc.CN.share.DeepSeek, 0)} of the time, works from ${country('US')} ${pctf(bc.US.share.Qwen, 0)} and ${pctf(bc.US.share.DeepSeek, 0)}.`, `是的：${country('CN')}的工作点名 Qwen 的比例为 ${pctf(bc.CN.share.Qwen, 0)}、DeepSeek ${pctf(bc.CN.share.DeepSeek, 0)}；${country('US')}的工作分别为 ${pctf(bc.US.share.Qwen, 0)} 和 ${pctf(bc.US.share.DeepSeek, 0)}。`), B.modelsByCountry()],
      ['settings', T('Which kinds of agents are studied?', '研究的是哪些 agent？'), settingsAnswer(st), B.settings()],
    
      ...(fx.risk ? [['risk', T('Where does the risk come from?', '风险来自哪里？'), T(`External attackers ${pctf(lastOf(fx.risk.share.external_attacker))}, the agent itself ${pctf(lastOf(fx.risk.share.agent_itself))}, non-adversarial failures ${pctf(lastOf(fx.risk.share.non_adversarial))} of recent labelled works.`, `近期已标注工作中，外部攻击者 ${pctf(lastOf(fx.risk.share.external_attacker))}，agent 自身 ${pctf(lastOf(fx.risk.share.agent_itself))}，非对抗性失误 ${pctf(lastOf(fx.risk.share.non_adversarial))}。`), B.facetMultiples('risk', RISK_NAMES(), T('Share of labelled works per half-year by where the risk comes from (a work can name several).', '每半年已标注工作按风险来源的比例（一项可涉及多类）。'))]] : []),
    ],
    tail: !P.tail ? [] : (() => {
      const tl = P.tail, th = tl.shape.threads, b = tl.backtest[0], o = b.roseOrigin, ex = b.examples.slice(0, 4);
      const cells = tl.gaps.flatMap(g => g.cells.map(c => ({...c, gx: g.x, gy: g.y}))).sort((a, c) => c.score - a.score).slice(0, 3);
      const un = tl.imbalance.untested.slice(0, 2), ah = tl.imbalance.attackHeavy[0], br = tl.bridges[0], op = tl.open?.stats;
      return [
        ['shape', T('How long is the tail?', '长尾有多长？'), T(`Half of the works sit outside the ${num(th.headUnits)} largest of ${num(th.units)} candidate clusters (${pctf(th.tailWorksShare)} in the tail); in a year the tail grew ×${th.tail.ratio} against ×${th.head.ratio} for the head.`, `一半的工作落在 ${num(th.units)} 条候选研究线中最大的 ${num(th.headUnits)} 条之外（长尾占 ${pctf(th.tailWorksShare)}）；一年里长尾增长 ×${th.tail.ratio}，头部 ×${th.head.ratio}。`), B4.shape()],
        ['backtest', T('Where were last year\'s risers a year before?', '去年冒头的方向，一年前在哪里？'), T(`Mostly in the tail or nowhere: of the ${num(b.rose)} title terms whose share rose threefold to 20+ titles in the past year, ${num((o.tail || 0) + (o.absent || 0))} were in the tail or absent a year earlier — ${ex.map(e => `${e.term} (${e.before}→${e.after})`).join(', ')}.`, `大多在长尾，甚至还没出现：过去一年标题占比涨到三倍、达到 20 篇以上的 ${num(b.rose)} 个术语中，有 ${num((o.tail || 0) + (o.absent || 0))} 个一年前在长尾或尚未出现——${ex.map(e => `${e.term}（${e.before}→${e.after}）`).join('、')}。`), B4.backtest()],
        ['rising', T('What is stirring in the tail now?', '现在长尾里有什么在升温？'), T(`By the same early signals: ${tl.rising.slice(0, 6).map(r => r.term).join(', ')} (unvalidated; a reading list, not a forecast).`, `按同样的早期信号：${tl.rising.slice(0, 6).map(r => r.term).join('、')}（未经验证；是阅读线索，不是预测）。`), B4.rising()],
        ['gaps', T('Which combinations does almost nobody work on?', '哪些组合几乎没人做？'), cells.length ? T(`${cells.map(c => `${FACET_NAME(c.gx, c.x)} × ${FACET_NAME(c.gy, c.y)}: ${num(c.observed)} works where similar combinations suggest ~${num(Math.round(c.expected))}`).join('; ')}.`, `${cells.map(c => `${FACET_NAME(c.gx, c.x)} × ${FACET_NAME(c.gy, c.y)}：${num(c.observed)} 篇，相似组合推算约 ${num(Math.round(c.expected))} 篇`).join('；')}。`) : '', B4.gaps()],
        ['imbalance', T('Where do attacks outrun defences, or defences go untested?', '哪里攻多守少，哪里有守无评？'), T(`No combination has three times more attacks than defences${ah ? ` (most attack-heavy: ${FACET_NAME('surface', ah.surface)} in ${FACET_NAME('setting', ah.setting)}, ${ah.attacks} vs ${ah.defenses})` : ''}; but ${un.map(r => `${FACET_NAME('surface', r.surface)} in ${FACET_NAME('setting', r.setting)} has ${r.defenses} defences, ${r.tested} tested in practice`).join('; ')}.`, `没有组合的攻击数达到防御的三倍${ah ? `（最偏攻击：${FACET_NAME('setting', ah.setting)}中的${FACET_NAME('surface', ah.surface)}，${ah.attacks} 对 ${ah.defenses}）` : ''}；但${un.map(r => `${FACET_NAME('setting', r.setting)}中的${FACET_NAME('surface', r.surface)}有 ${r.defenses} 篇防御，只有 ${r.tested} 篇在实战条件下检验`).join('；')}。`), B4.imbalance()],
        ['bridges', T('Which research lines are close in content but do not cite each other?', '哪些研究线内容相近却互不引用？'), br ? T(`e.g. ${br.a.label} (${C.topicName(br.a.cluster || '')}) and ${br.b.label} (${C.topicName(br.b.cluster || '')}): closeness ${br.similarity.toFixed(2)}, ${br.citations} citations where similar pairs have ~${br.expected}.`, `例如 ${br.a.label}（${C.topicName(br.a.cluster || '')}）与 ${br.b.label}（${C.topicName(br.b.cluster || '')}）：接近度 ${br.similarity.toFixed(2)}，相互引用 ${br.citations} 次，同等接近的组合通常约 ${br.expected} 次。`) : '', B4.bridges()],
        ...(op ? [['open', T('Which open problems do papers keep raising — and does anyone take them up?', '论文反复提出、却没人接手的问题有哪些？'), T(`${num(op.problems)} open problems stated by ${num(op.worksWithProblems)} works; ${num(op.recurring)} recur across three papers or more, and ${num(op.recurringOpen)} of those have no later Atlas work taking them up.`, `${num(op.worksWithProblems)} 篇工作提出 ${num(op.problems)} 个开放问题；${num(op.recurring)} 个被三篇以上论文反复提到，其中 ${num(op.recurringOpen)} 个在 Atlas 中没有看到后续工作接手。`), B4.open()]] : []),
      ];
    })(),
    navigate: [
      ['pilot', T('Can a research question be turned into grounded starting points?', '能否从一个问题找到有依据的起点？'), T(`In ${P.rq1.pilot.surveys} held-out surveys, navigation salience finds ${share(pilot.salience?.recall50)} of each survey's Atlas references in its top 50 (citation ranking ${share(pilot.citations?.recall50)}), with ${share(pilot.salience?.nova20, 0)} recent works in its top 20 (citation ranking ${share(pilot.citations?.nova20)}).`, `在 ${P.rq1.pilot.surveys} 篇留出综述上，导航显著度在前 50 中找回 ${share(pilot.salience?.recall50)} 的综述参考文献（引用排序 ${share(pilot.citations?.recall50)}），前 20 中近期工作占 ${share(pilot.salience?.nova20, 0)}（引用排序 ${share(pilot.citations?.nova20)}）。`), B.pilot()],
      ['bands', T('How many kinds of "important" are there?', '“重要”有几种？'), T(`At least four: the foundation, influence, bridge and resource bands' top 10 overlap by ${share(b.meanBandOverlap)} on average.`, `至少四种：基础、影响、桥梁、资源四个波段的前 10 名平均只重合 ${share(b.meanBandOverlap)}。`), B.bands()],
      ['nova', T('Does new work get buried?', '新作会被埋没吗？'), T(`By citation count, works under ${P.meta.novaMonths} months take ${b.novaGlobalTop20} of ${b.top20Slots} top-20 slots; compared within their own year and form they take ${b.novaGroupTop20}.`, `按引用数，不足 ${P.meta.novaMonths} 个月的新作只占 ${b.top20Slots} 个前 20 席位中的 ${b.novaGlobalTop20} 个；在同年份、同类型参照组内比较则占 ${b.novaGroupTop20} 个。`), B.nova()],
      dp?.newcomers ? ['newcomers', T('Do newcomers read the field?', '新来者读这个领域吗？'), (() => { const d = dp.newcomers, y = Math.max(...d.rows.map(r => r.year)), n = d.rows.find(r => r.year === y && r.group === 'new'), e = d.rows.find(r => r.year === y && r.group === 'established'); return n && e ? T(`${n.meanAtlasRefs < e.meanAtlasRefs ? 'Less' : 'As much'}: in ${y}, works from institutions new to the field cite ${n.meanAtlasRefs} Atlas works on average against ${e.meanAtlasRefs} for established ones, and ${pctf(n.citesClassic, 0)} cite one of its classics against ${pctf(e.citesClassic, 0)}.`, `${n.meanAtlasRefs < e.meanAtlasRefs ? '读得更少' : '读得一样多'}：${y} 年，新来机构的工作平均引用 ${n.meanAtlasRefs} 项 Atlas 工作，老牌机构为 ${e.meanAtlasRefs} 项；引用经典的比例为 ${pctf(n.citesClassic, 0)}，老牌为 ${pctf(e.citesClassic, 0)}。`) : ''; })(), B3.newcomers()] : null,
      ['next', T('What could I work on next?', '下一步可以做什么？'), T('Research opportunities and gaps, each with a testable proposal and its evidence.', '研究机会与研究缺口，每条都有可检验的建议和证据。'), B.insightsLink('opportunities', T('Open research opportunities', '打开研究机会'), T('Built from the same snapshot by the Research signals module; research gaps are on a neighbouring tab there.', '由研究信号模块基于同一快照生成；研究缺口在该页相邻标签。'))],
    ],
  };
  return Q;
}
// where each question sits: by default the lens of its group; the questions below move to the research question they answer
const PLACE = {'connect:traditions': 'structure', 'connect:venues': 'structure', 'attack:surfaces': 'structure', 'attack:mechanisms': 'structure',
  'tail:shape': 'structure', 'tail:gaps': 'structure', 'evolve:reading': 'connect', 'tail:bridges': 'connect', 'navigate:newcomers': 'lead',
  'targets:country': 'lead', 'evolve:timeline': 'attack', 'targets:models': 'attack', 'tail:imbalance': 'attack', 'navigate:next': 'evolve'};
const HOME_LENS = {evolve: 'evolve', connect: 'connect', lead: 'lead', attack: 'attack', targets: 'structure', tail: 'evolve', navigate: 'navigate'};
const RENAME = {'evolve:timeline': 'onset'};  // two questions named "timeline" now share the attack lens
const ORDER = {structure: ['traditions', 'venues', 'settings', 'risk', 'surfaces', 'mechanisms', 'shape', 'gaps'],
  connect: ['layers', 'buildson', 'hubs', 'supply', 'lifecycle', 'inflation', 'reading', 'notreading', 'bridges'],
  attack: ['balance', 'timeline', 'onset', 'comparable', 'adaptive', 'realism', 'models', 'imbalance'],
  evolve: ['growth', 'shift', 'diversify', 'terms', 'diffusion', 'path', 'radar', 'backtest', 'rising', 'open', 'next'],
  navigate: ['pilot', 'bands', 'nova']};
function lensQuestions(id) {
  const out = [];
  for (const [group, qs] of Object.entries(questionPool())) for (const q of qs || []) {
    if (!q) continue;
    const key = `${group}:${q[0]}`;
    if ((PLACE[key] || HOME_LENS[group]) === id) out.push(RENAME[key] ? [RENAME[key], ...q.slice(1)] : q);
  }
  const rank = qid => { const i = (ORDER[id] || []).indexOf(qid); return i < 0 ? ORDER[id]?.length ?? 0 : i; };
  return out.map((q, i) => [q, i]).sort((a, b) => rank(a[0][0]) - rank(b[0][0]) || a[1] - b[1]).map(x => x[0]);
}

// ================================================================================================ pages
// the report is an analysis version with its own clock (release_analysis.py): say which one, on which data release, and
// when the data has moved on since
const versionKicker = () => `${T('ANALYSIS', '分析版本')} ${esc(P.meta.analysisVersion || '—')} · ${T('ON DATA', '基于数据')} ${esc(P.meta.release)} · ${T('DATA THROUGH', '数据截至')} ${esc(P.universe.asOf)}`;
function versionNote() {
  const now = C.data?.meta?.researchRelease;
  if (!now || now === P.meta.release) return '';
  return `<p class="fd-note ln-version">${T(`The data has moved on to release ${esc(now)} (through ${esc(C.data.meta.cutoff || '')}); the numbers here stay those of analysis ${esc(P.meta.analysisVersion || '')} on ${esc(P.meta.release)} until the next analysis version, which is prepared monthly and published after review.`, `数据已更新到 ${esc(now)}（截至 ${esc(C.data.meta.cutoff || '')}）；这里的数字仍是分析版本 ${esc(P.meta.analysisVersion || '')}（基于 ${esc(P.meta.release)}）的结果。分析版本每月准备一次，复核后发布，届时纳入新数据。`)} <a href="#updates">${T('About the two versions', '关于两种版本')} →</a></p>`;
}
function shell(inner, extraClass = '') {
  return `<div class="fd ln ${extraClass}">${inner}<aside class="fd-drawer" hidden aria-label="${T('Works behind this number', '数字背后的工作')}"><div class="fd-drawer-head"><h3></h3><button class="fd-close" aria-label="${T('Close', '关闭')}">×</button></div><div class="fd-drawer-body"></div></aside><div class="fd-tip" hidden></div></div>`;
}
// the headline findings, in reading order: [lens, question id]; each card opens its question under the lens
const KEY_FINDINGS = [['structure', 'traditions'], ['structure', 'venues'], ['structure', 'settings'], ['connect', 'hubs'], ['connect', 'inflation'],
  ['connect', 'buildson'], ['lead', 'apart'], ['lead', 'punch'], ['lead', 'pioneers'], ['lead', 'bigteams'], ['lead', 'newcomers'], ['attack', 'balance'],
  ['attack', 'adaptive'], ['attack', 'models'], ['evolve', 'growth'], ['evolve', 'shift'], ['evolve', 'diffusion'], ['evolve', 'backtest'], ['navigate', 'nova']];
function keyFindings(meta) {
  const cache = {}, cards = KEY_FINDINGS.map(([lens, qid]) => { const q = (cache[lens] ??= lensQuestions(lens)).find(x => x[0] === qid); return q && q[2] ? [lens, q] : null; }).filter(Boolean);
  return `<section class="ln-lead"><span class="fd-kicker">${T('KEY FINDINGS', '重要发现')} · ${versionKicker()}</span><h2>${T('What the data says, in one page', '一页看懂数据在说什么')}</h2>${versionNote()}
  <p class="fd-note">${T('The strongest results across the six lenses. Every number belongs to the analysis version named above; open a card for the evidence, method notes and the papers behind it. Smaller observations are under Notes.', '六个视角中最重要的结论。所有数字都属于上方注明的分析版本；点开卡片可看到证据、方法说明和背后的论文。较小的观察放在“小发现”。')}</p></section>
  <div class="ln-keys">${cards.map(([lens, [qid, q, a]]) => `<button class="ln-key" data-ln-goto="${lens}:${qid}"><span class="ln-key-lens">${meta[lens][0]}</span><b>${q}</b><em>${esc(a)}</em><span class="ln-key-go">${T('Evidence', '看证据')} →</span></button>`).join('')}</div>`;
}
export function renderLens(ctx) {
  setup(ctx); lists.clear();
  const meta = {key: [T('Key findings', '重要发现'), T('The strongest results across all lenses', '各视角中最重要的结论')], ...lensMeta(T)};
  const want = LENS_LEGACY[C.state.lens] || C.state.lens, id = lensIds().includes(want) ? want : 'key', qs = id === 'key' ? [] : lensQuestions(id);
  const tabs = `<nav class="ln-tabs" aria-label="${T('Lenses', '视角')}">${['key', ...lensIds()].map(k => `<button data-ln-lens="${k}" class="${k === id ? 'active' : ''}" aria-current="${k === id ? 'page' : 'false'}"><b>${meta[k][0]}</b><small>${meta[k][1]}</small></button>`).join('')}</nav>`;
  const list = `<ol class="ln-qlist">${qs.map(([qid, q, a], i) => `<li><button data-ln-q="${qid}"><span class="ln-qn">${String(i + 1).padStart(2, '0')}</span><span><b>${q}</b><em>${esc(a)}</em></span></button></li>`).join('')}</ol>`;
  const blocks = qs.map(([qid, q, a, body], i) => `<section class="fd-section ln-q" id="q-${qid}"><div class="ln-qhead"><span class="ln-qn">${String(i + 1).padStart(2, '0')}</span><div><h2>${q}</h2><p class="ln-answer">${esc(a)}</p></div></div>${body}</section>`).join('');
  if (id === 'key') return shell(`${tabs}${keyFindings(meta)}`);
  return shell(`${tabs}<section class="ln-lead"><span class="fd-kicker">${T('LENS', '视角')} · ${meta[id][0]} · ${versionKicker()}</span><h2>${meta[id][1]}</h2>${versionNote()}${list}</section>${blocks}`);
}
export const findingsData = () => dataset;
export const routeCount = () => dataset.universe.citationRoutes + dataset.universe.benchmarkUseRoutes;
export function lensCards(ctx) {
  // one card per lens with its first answer: used on the home page
  setup(ctx);
  const meta = lensMeta(T);
  const lead = {connect: 'hubs'};  // the question each home card shows; otherwise the lens's first
  return lensIds().map(id => { const qs = lensQuestions(id), q = qs.find(x => x[0] === lead[id]) || qs[0]; return {id, name: meta[id][0], lead: meta[id][1], question: q[1], answer: q[2]}; });
}
const NOTES = () => {
  const con = P.trends.concentration, yl = con.years.map(String), w = P.web, hosts = w.resourceHosts, tot = Object.values(hosts).reduce((a, b) => a + b, 0), s = P.fractures.scale, cs = P.trends.clusterShares, pc = v => v == null ? '—' : Number(v).toFixed(1) + '%', it = P.fractures.timeliness.intake, imp = P.fractures.importance;
  return [
    [T('Evolution', '演化'), `${cs.labelsBefore} → ${cs.labelsRecent}`, T('Recent works carry more cluster labels per work than a year earlier, so raw cluster shares overstate growth everywhere (the shares on this site are fractional).', '近期论文平均带的星团标签比一年前多，直接按标签计的份额会让所有方向都显得在涨（本站的份额按比例计）。'), ''],
    [T('Evolution', '演化'), pctf(con.code[con.code.length - 3].share), T('Works linking code or data; recent works are linked later, so the last years read low.', '链接代码或数据的工作；近期工作的链接补得较晚，最近一两年偏低。'), tile(T('Works linking code or data', '链接代码或数据的工作'), T('share by year', '各年比例'), con.code.map(x => x.share), yl, INK, pc)],
    [T('Leadership', '引领'), pctf(con.citations.zeroShare), T('of works have no citation yet.', '的工作尚无引用。'), ''],
    [T('Connection', '衔接'), pctf(s.multiClusterPct), T('of works carry two or more cluster labels, so a "cross-cluster star" is defined by observed routes, not by labels.', '的工作带两个以上星团标签，因此“跨团星”按观测到的航线定义，而不是按标签。'), ''],
    [T('Connection', '衔接'), pctf(s.crossGalaxyPct), T(`of citation routes join works that share no galaxy (${pctf(s.crossClusterPct)} share no cluster).`, `的引用航线连接两个没有共同星系的工作（${pctf(s.crossClusterPct)} 没有共同星团）。`), ''],
    [T('Resource check', '资源检验'), String(imp.medianTauGlobalLocal), T('Kendall τ between global citation counts and citations inside the Atlas: the Atlas sees the same order, mostly.', '全局引用数与 Atlas 内引用数之间的 Kendall τ：两者的排序大体一致。'), ''],
    [T('Web', 'Web'), pctf(w.arxivPct), T(`of works have an arXiv record; ${pctf(w.unverifiedPct)} have no verified venue yet.`, `的工作有 arXiv 记录；${pctf(w.unverifiedPct)} 尚无核实的正式发表。`), ''],
    [T('Web', 'Web'), pctf(100 * hosts['github.com'] / tot), T(`of paper resources sit on GitHub, ${pctf(100 * (hosts['huggingface.co'] || 0) / tot)} on Hugging Face; ${num(w.paperReposArchived)} of ${num(w.paperRepos)} paper repositories are archived.`, `的论文配套资源位于 GitHub，${pctf(100 * (hosts['huggingface.co'] || 0) / tot)} 位于 Hugging Face；${num(w.paperRepos)} 个论文仓库中 ${num(w.paperReposArchived)} 个已归档。`), ''],
    ...(P.lenses.release ? [[T('Resources', '资源'), pctf(P.lenses.release.share[P.lenses.release.share.length - 1]), T('of recent abstracts promise released code or data.', '的近期论文摘要声明公开代码或数据。'), B.release()]] : []),
    [T('Web', 'Web'), `${it.medianDays} ${T('days', '天')}`, T(`median delay from arXiv submission to the Atlas for scheduled updates (${pctf(it.within14)} within 14 days).`, `定期更新中从 arXiv 提交到收录的中位延迟（${pctf(it.within14)} 在 14 天内）。`), ''],
  ];
};
export function renderNotes(ctx) {
  setup(ctx); lists.clear();
  return shell(`<section class="ln-lead"><span class="fd-kicker">${T('NOTES', '小发现')} · ${versionKicker()}</span><h2>${T('Smaller things the data shows', '数据里的小发现')}</h2><p class="fd-note">${T('Observations that are true and sometimes useful but too small for a lens of their own. Each is recomputed with every analysis version.', '真实、有时有用，但还不足以单独成为一个视角的观察。每个分析版本都会重算。')}</p></section>
  <div class="ln-notes">${NOTES().map(([tag, big, text, viz]) => `<article class="ln-note"><span class="fd-card-rq">${tag}</span><div class="fd-big">${esc(big)}</div><p>${esc(text)}</p>${viz || ''}</article>`).join('')}</div>`, 'ln-notes-page');
}
export function renderMethod(ctx) {
  setup(ctx); lists.clear();
  return shell(`${universe()}${fractures()}${hypotheses()}${web()}${method()}`);
}
