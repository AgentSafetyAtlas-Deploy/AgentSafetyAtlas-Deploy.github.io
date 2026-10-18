// Lenses (redesign 2026-10): the findings pages 演化 / 衔接 / 引领 / 攻防 / 对象 / 导航, the minor-findings page and the method
// page, all from data/findings.json (build_findings.py). A lens is a list of questions; each question has a one-line answer
// filled from the data and its evidence below. Every aggregate opens into the works or sentences behind it; nothing here is
// typed in by hand except the wording of the sentences.
import {flag, flagSrc, nameFlag} from './flags.js';
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
  ends.forEach(({s, y: yy}) => { const src = s.cc ? flagSrc(s.cc) : '', lx = w - right + 26 + (src ? 19 : 0); svg += `${src ? `<image href="${src}" x="${w - right + 26}" y="${yy - 5}" width="14" height="10.5"/>` : ''}<text x="${lx}" y="${yy + 4}" class="fd-axis fd-endlabel" fill="${s.color}">${esc(s.label)} ${pctf(s.values[s.values.length - 1], 0)}</text>`; });
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

export function bindLenses(ctx, root = document.querySelector('.fd')) {
  setup(ctx);
  if (!root) return;
  const tip = root.querySelector('.fd-tip');
  root.addEventListener('input', e => { if (e.target.matches('[data-ps-yearpos]')) { psStop(); const ys = ['early', ...P.position.years.slice(1)]; ps.year = ys[+e.target.value]; const f = document.querySelector('[data-ps-fig]'); if (f) f.innerHTML = psTable(); const b = e.target.closest('.ps-time')?.querySelector('b'); if (b) b.textContent = ps.year === 'early' ? `≤${P.position.years[0]}` : ps.year; return; } if (e.target.matches('[data-tj-month]')) { tjStop(); tj.m = +e.target.value; tjRedraw('month'); return; } if (e.target.matches('[data-cr-month]')) { const was = cr.timer; crStop(); cr.m = +e.target.value; crRedraw('month'); if (was) { const b = root.querySelector('[data-cr-play]'); if (b) b.textContent = '▶'; } } });
  crBind(root); psBind(root); tjBind(root); plBind(root);
  root.addEventListener('change', e => { if (e.target.matches('[data-ps-role]')) { psStop(); ps.role = +e.target.value; ps.hl = null; psRedraw(); } });
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-ps-yearmode],[data-ps-mode],[data-ps-sec],[data-pl-view],[data-pl-year],[data-pl-play],[data-pl-open],[data-pl-show],[data-pl-cc],[data-tj-play],[data-tj-open],[data-tj-show],[data-tj-line],[data-ps-y],[data-ps-year],[data-ps-play],[data-ps-open],[data-ps-show],[data-ps-cell],[data-cr-view],[data-cr-level],[data-cr-layer],[data-cr-win],[data-cr-play],[data-cr-open],[data-cr-show],[data-cr-pair],[data-cr-unit],[data-fd-ids],[data-fd-paper],[data-fd-list],[data-fd-jump],[data-fd-layer],[data-fd-pair],[data-fd-bench],[data-ln-lens],[data-ln-goto],[data-ln-q],[data-ln-ms-kind],[data-ln-insight],.fd-close');
    if (!el) return;
    if (el.matches('.fd-close')) { root.querySelector('.fd-drawer').hidden = true; return; }
    if (el.dataset.psSec) { psGoSection(+el.dataset.psSec, root); return; }
    if (el.dataset.plView) { plStop(); pl.view = el.dataset.plView; pl.hl = null; pl.arc = null; plRedraw(); return; }
    if (el.dataset.plYear) { plStop(); pl.year = +el.dataset.plYear; plRedraw(); return; }
    if ('plPlay' in el.dataset) { plPlay(); return; }
    if (el.dataset.plOpen) { const art = el.closest('.cr-card'), open = el.getAttribute('aria-expanded') === 'true'; el.setAttribute('aria-expanded', String(!open)); art.querySelector('.cr-body').hidden = open; plActivate(el.dataset.plOpen); return; }
    if (el.dataset.plShow) { plActivate(el.dataset.plShow); root.querySelector('[data-pl-stage]')?.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); return; }
    if (el.dataset.plCc) { plCountryDrawer(el.dataset.plCc); return; }
    if ('tjPlay' in el.dataset) { tjPlay(); return; }
    if (el.dataset.tjOpen) { const art = el.closest('.cr-card'), open = el.getAttribute('aria-expanded') === 'true'; el.setAttribute('aria-expanded', String(!open)); art.querySelector('.cr-body').hidden = open; tjActivate(el.dataset.tjOpen); return; }
    if (el.dataset.tjShow) { tjActivate(el.dataset.tjShow); root.querySelector('[data-tj-stage]')?.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); return; }
    if (el.dataset.tjLine) { tjDrawer(+el.dataset.tjLine); return; }
    if (el.dataset.psY) { psStop(); ps.y = el.dataset.psY; ps.hl = null; psRedraw(); return; }
    if (el.dataset.psMode) { psStop(); ps.mode = el.dataset.psMode; psRedraw(); return; }
    if (el.dataset.psYearmode) { psStop(); ps.year = el.dataset.psYearmode === 'all' ? 'all' : P.position.years[P.position.years.length - 1]; psRedraw(); return; }
    if (el.dataset.psYear) { psStop(); ps.year = el.dataset.psYear; psRedraw(); return; }
    if ('psPlay' in el.dataset) { psPlay(); return; }
    if (el.dataset.psOpen) { const art = el.closest('.cr-card'), open = el.getAttribute('aria-expanded') === 'true'; el.setAttribute('aria-expanded', String(!open)); art.querySelector('.cr-body').hidden = open; psActivate(el.dataset.psOpen); return; }
    if (el.dataset.psShow) { psActivate(el.dataset.psShow); root.querySelector('[data-ps-stage]')?.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); return; }
    if (el.dataset.psCell) { psDrawer(el.dataset.psCell); return; }
    if (el.dataset.crView) { crStop(); cr.view = el.dataset.crView; if (cr.view === 'topo' && !crFlow()) cr.layer = 'cite'; crRedraw(); return; }
    if (el.dataset.crLevel) { cr.level = el.dataset.crLevel; cr.focus = -1; crRedraw(); return; }
    if (el.dataset.crLayer) { cr.layer = el.dataset.crLayer; crRedraw(); return; }
    if (el.dataset.crWin) { cr.win = el.dataset.crWin === 'all' ? 'all' : +el.dataset.crWin; crRedraw(); return; }
    if ('crPlay' in el.dataset) { crPlay(); return; }
    if (el.dataset.crOpen) {
      const art = el.closest('.cr-card'), open = el.getAttribute('aria-expanded') === 'true';
      el.setAttribute('aria-expanded', String(!open)); art.querySelector('.cr-body').hidden = open;
      crActivate(el.dataset.crOpen); return;
    }
    if (el.dataset.crShow) { crActivate(el.dataset.crShow); root.querySelector('[data-cr-stage]')?.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); return; }
    if (el.dataset.crPair) { crDrawer(el.dataset.crPair); return; }
    if (el.dataset.crUnit) { const k = +el.dataset.crUnit; cr.focus = cr.focus === k ? -1 : k; crFocus(el.closest('svg'), cr.focus); return; }
    if (el.dataset.fdIds) { const l = lists.get(el.dataset.fdIds); if (l) openDrawer(l.heading, paperRows(l.ids)); return; }
    if (el.dataset.fdPaper) return ctx.openPaper(el.dataset.fdPaper);
    if (el.dataset.fdList) { const l = lists.get(el.dataset.fdList); if (l) openDrawer(l.heading, l.html || paperRows(l.ids)); return; }
    if (el.dataset.fdJump) { document.getElementById('fd-' + el.dataset.fdJump)?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); return; }
    if (el.dataset.fdLayer) { ctx.state.findingsLayer = el.dataset.fdLayer; ctx.writeHash(); rerender(ctx, '[data-ln-layers]'); return; }
    if (el.dataset.lnLens) { ctx.state.lens = el.dataset.lnLens === 'key' ? '' : el.dataset.lnLens; ctx.writeHash(); ctx.render(); window.scrollTo({top: 0, behavior: 'instant'}); return; }
    if (el.dataset.lnGoto) {
      const [lens, qid] = el.dataset.lnGoto.split(':');
      if (lens === 'structure') { ps.sec = Math.max(1, psSectionOf(qid)); }
      ctx.state.lens = lens; ctx.writeHash(); ctx.render();
      requestAnimationFrame(() => { const h = document.querySelector(`#q-${qid} [data-cr-open], #q-${qid} [data-ps-open], #q-${qid} [data-tj-open], #q-${qid} [data-pl-open]`); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); document.getElementById('q-' + qid)?.scrollIntoView({block: 'start'}); });
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
    const r = el.closest('.cr-ring,.tp-map') ? {left: e.clientX - 1, width: 2, bottom: e.clientY + 10} : el.getBoundingClientRect(), host = root.getBoundingClientRect();
    tip.style.left = Math.min(host.width - 300, Math.max(0, r.left - host.left + r.width / 2 - 140)) + 'px';
    tip.style.top = (r.bottom - host.top + 8) + 'px';
  });
  root.addEventListener('mousemove', e => {  // on the ring and the upstream map the tip follows the pointer
    if (tip.hidden || !e.target.closest('.cr-ring [data-tip],.tp-map [data-tip]')) return;
    const host = root.getBoundingClientRect();
    tip.style.left = Math.min(host.width - 300, Math.max(0, e.clientX - host.left - 140)) + 'px';
    tip.style.top = (e.clientY - host.top + 14) + 'px';
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
    const series = geo.countries.slice(0, 6).map((c, i) => ({cc: c, label: country(c), color: SERIES[i], values: geo.share[c]}));
    return `<p class="fd-note">${T(`Share of located works by year; a work with institutions in several countries splits its credit. Located works per year: ${geo.located.map((n, i) => `${geo.years[i]} ${num(n)}`).join(' · ')}. Institution addresses, not nationalities.${con.corrections?.teamsSplit ? ` ${con.corrections.teamsSplit} wrong registry matches were corrected (${con.corrections.papersMoved} papers).` : ''}`, `按年份计的已定位工作份额；一项工作的机构分布在多个国家时按比例分摊。各年已定位工作数：${geo.located.map((n, i) => `${geo.years[i]} ${num(n)}`).join(' · ')}。统计的是机构地址，不是国籍。${con.corrections?.teamsSplit ? `已修正 ${con.corrections.teamsSplit} 个错误的机构登记匹配（${con.corrections.papersMoved} 篇）。` : ''}`)}</p>
    <div class="fd-geo">${lineChart(geo.years, series)}<div class="fd-geo-side"><h4>${T('International collaboration', '国际合作')}</h4>${bars(geo.international, geo.years.map(String), INK, {fmt: pc, partialLast: true})}<small>${T(`Share of located works with institutions in two or more countries. With both ${country('US')} and ${country('CN')} institutions: ${geo.usCn.map((v, i) => `${geo.years[i]} ${pc(v)}`).slice(-3).join(' · ')}.`, `机构分布在两个以上国家的已定位工作比例。同时有${country('US')}与${country('CN')}机构：${geo.usCn.map((v, i) => `${geo.years[i]} ${pc(v)}`).slice(-3).join(' · ')}。`)}</small></div></div>`;
  },
  lean() {
    const geo = P.trends.geography, lean = [...geo.byCluster].sort((a, b) => ((b.CN || 0) - (b.US || 0)) - ((a.CN || 0) - (a.US || 0)));
    const LW = 560, LL = 220, lx = v => LL + (LW - LL - 30) * v / 50;
    return `<div class="fd-legend"><span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="${SERIES[0]}"/></svg>${flag('US')}${country('US')} · ${T('overall', '整体')} ${pctf(geo.overallSince2023.US)}</span><span><svg width="12" height="12"><rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="${SERIES[1]}"/></svg>${flag('CN')}${country('CN')} · ${T('overall', '整体')} ${pctf(geo.overallSince2023.CN)}</span></div>
    <svg viewBox="0 0 ${LW} ${lean.length * 22 + 30}" class="fd-dumbbell" role="img">${[0, 10, 20, 30, 40, 50].map(t => `<line x1="${lx(t)}" x2="${lx(t)}" y1="8" y2="${lean.length * 22 + 6}" class="fd-grid"/><text x="${lx(t)}" y="${lean.length * 22 + 22}" text-anchor="middle" class="fd-axis">${t}%</text>`).join('')}${lean.map((r, i) => {
      const y = 18 + i * 22;
      return `<text x="${LL - 10}" y="${y + 4}" text-anchor="end" class="fd-axis">${esc(cl(r.cluster))}</text><line x1="${lx(r.US || 0)}" x2="${lx(r.CN || 0)}" y1="${y}" y2="${y}" class="fd-span"/><circle cx="${lx(r.US || 0)}" cy="${y}" r="5" fill="${SERIES[0]}" data-tip="${esc(`${cl(r.cluster)} · ${country('US')}: ${pctf(r.US)}`)}"/><rect x="${lx(r.CN || 0) - 4.5}" y="${y - 4.5}" width="9" height="9" rx="2" fill="${SERIES[1]}" data-tip="${esc(`${cl(r.cluster)} · ${country('CN')}: ${pctf(r.CN)}`)}"/>`;
    }).join('')}</svg><p class="fd-note">${T('Works since 2023 with a located institution, fractional credit.', '2023 年以来有已定位机构的工作，按比例计。')}</p>`;
  },
  institutions() {
    const ins = P.rq3.institutions, row = Object.fromEntries(ins.rows.map(x => [x.id, x])), both = new Set(ins.top.works.filter(i => ins.top.supply.includes(i)));
    const instList = (key, label, val) => `<div class="fd-inst"><h4>${label}</h4><ol>${ins.top[key].map(id => `<li class="${both.has(id) ? 'is-both' : ''}"><span>${nameFlag(C.data?.teams, row[id].name)}${esc(row[id].name)}</span><b>${val(row[id])}</b></li>`).join('')}</ol></div>`;
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
    return `<div class="fd-legend"><span><svg width="12" height="12"><rect width="12" height="12" rx="2" fill="${SERIES[0]}"/></svg>${flag('US')}${country('US')} (${num(bc.US.papers)})</span><span><svg width="12" height="12"><rect width="12" height="12" rx="2" fill="${SERIES[1]}"/></svg>${flag('CN')}${country('CN')} (${num(bc.CN.papers)})</span></div>
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

// ------------------------------------------------------------------------------------------------ topic: models (findings.models2026)
// Which models 2026 papers work with: a generation counts when the paper body names it at least twice (models_analysis.py)
const M_OPEN = '#5e8c2e', M_CLOSED = '#336aab', M_BOTH = '#8aa39e';
const mMonth = m => T(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m.slice(5) - 1], `${+m.slice(5)} 月`);
const mNote = () => { const M = P.models2026; return T(`${num(M.papers)} of the ${num(M.worksInYear)} works of ${M.year} have a full text here; a model counts for a paper when one of its generations is named at least ${M.minMentions} times in the body (before the references). ${mMonth(M.months[M.months.length - 1])} is still incomplete.`, `${M.year} 年的 ${num(M.worksInYear)} 项工作中有 ${num(M.papers)} 项有全文；论文正文（参考文献之前）至少点名 ${M.minMentions} 次的模型才算这篇论文用了它。${mMonth(M.months[M.months.length - 1])}数据尚不完整。`); };
const M_ROLE = () => ({subject: T('Studied or driving', '被测或驱动'), attacker: T('Attacker', '攻击生成'), judge: T('Judge', '裁判'), guard_defense: T('Guard / defence', '护栏或防御'), trained: T('Trained', '被训练'), data_generation: T('Data generation', '生成数据'), other_use: T('Other use', '其他用途'), mention_only: T('Only mentioned', '只是提到')});
const BM = {
  muses() {
    const U0 = P.models2026.uses, R = M_ROLE(), cols = ['subject', 'judge', 'trained', 'data_generation', 'guard_defense', 'attacker', 'mention_only'], max = 60;
    return `<table class="fd-table ps-table"><thead><tr><th>${T('Family', '家族')}</th>${cols.map(c => `<th>${R[c]}</th>`).join('')}</tr></thead><tbody>${U0.byFamily.map(f => `<tr><th>${esc(f.family)} <small>(${num(f.papers)})</small></th>${cols.map(c => `<td style="background:${rgba(INK, (isDark() ? 0.7 : 0.5) * Math.min(1, f[c] / max))}">${pctf(f[c], 0)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="fd-note">${T(`Share of the papers naming a family in which it plays each role (a model can play several). Roles: Claude Opus 5.5 reading the sentences that name models in ${num(U0.papers)} papers (rules roles-v2); a second reader (DeepSeek) agrees on whether a model is used for ${pctf(U0.agreement?.usedAgree)} of model-paper pairs (role overlap ${U0.agreement?.roleJaccard}).`, `点名某家族的论文中，它承担各角色的比例（一个模型可以有多个角色）。角色由 Claude Opus 5.5 读取 ${num(U0.papers)} 篇论文中点名模型的句子判定（规则 roles-v2）；第二位标注者（DeepSeek）在“是否真的用了”上一致 ${pctf(U0.agreement?.usedAgree)}（角色重合度 ${U0.agreement?.roleJaccard}）。`)}</p>`;
  },
  mtopRole(role, color) {
    const xs = P.models2026.uses[role], max = Math.max(...xs.map(x => x.papers), 1);
    return `<div class="fd-hbars">${xs.slice(0, 10).map(x => `<div class="fd-hbar"><span>${esc(x.label)} <small>${x.open ? T('open', '开源') : T('API', '闭源')}</small></span>${barCell(x.papers, max, x.open ? M_OPEN : M_CLOSED)}<b>${num(x.papers)}</b></div>`).join('')}</div>`;
  },
  mtop() {
    const M = P.models2026, gs = M.generations.filter(g => g.kind === 'llm' || g.kind === 'vlm').slice(0, 20), max = gs[0]?.share || 1;
    const row = g => { const key = 'L' + Math.random().toString(36).slice(2, 9); lists.set(key, {ids: g.ids, heading: T(`${g.label}: latest works naming it`, `${g.label}：最近点名它的工作`)});
      return `<button class="ln-mrow" data-fd-list="${key}" data-tip="${esc(T(`${g.label} · ${g.family} · released ${g.release || '—'} · named twice or more in ${num(g.papers)} papers, at least once in ${num(g.anyMention)}`, `${g.label} · ${g.family} · 发布 ${g.release || '—'} · ${num(g.papers)} 篇点名两次以上，${num(g.anyMention)} 篇至少一次`))}"><span>${esc(g.label)}<small>${g.release || ''}</small></span>${barCell(g.share, max, g.open ? M_OPEN : M_CLOSED)}<b>${pctf(g.share)}</b></button>`; };
    return `<p class="fd-note"><span class="ln-key-sw" style="background:${M_OPEN}"></span>${T('open weights', '开源权重')} <span class="ln-key-sw" style="background:${M_CLOSED}"></span>${T('API only', '仅闭源 API')} · ${T('share of papers with a full text; click a row for the latest works', '占有全文论文的比例；点击一行查看最近的论文')}</p><div class="ln-mrows">${gs.map(row).join('')}</div><p class="fd-note">${mNote()} ${T(`A paper names a median of ${M.perPaper.median} language models; ${pctf(M.perPaper.fivePlus)} name five or more.`, `一篇论文中位点名 ${M.perPaper.median} 个语言模型；${pctf(M.perPaper.fivePlus)} 点名五个以上。`)}${M.uses ? T(` Checked against what each paper does with the model: of models named twice or more, ${pctf(M.uses.twiceButMentionOnly)} are only mentioned; of models named once, ${pctf(M.uses.onceButUsed)} are in fact used, so these counts are on the low side.`, ` 用论文对模型的实际用途核对：点名两次以上的模型中只有 ${pctf(M.uses.twiceButMentionOnly)} 只是提到；只点名一次的模型中 ${pctf(M.uses.onceButUsed)} 其实用了，所以这里的数字偏保守。`) : ''}</p>`;
  },
  mfamily() {
    const M = P.models2026, fams = M.families.filter(f => !['Guard', 'VLA', 'Other VLM'].includes(f.family)).slice(0, 6);
    return `${lineChart(M.months.map(mMonth), fams.map((f, i) => ({label: f.family, color: SERIES[i], values: f.byMonth})), {partialLast: true})}<p class="fd-note">${T('Share of the month\'s papers (with a full text) naming any generation of the family at least twice. A paper can name several families.', '当月有全文的论文中，至少两次点名该家族任一代模型的比例。一篇论文可以点名多个家族。')}</p>`;
  },
  mopen() {
    const M = P.models2026, rows = M.openClosed;
    const seg = (v, c, l) => v ? `<span style="width:${v}%;background:${c}" data-tip="${esc(`${l}: ${pctf(v)}`)}"></span>` : '';
    return `<p class="fd-note"><span class="ln-key-sw" style="background:${M_OPEN}"></span>${T('open weights only', '只用开源权重')} <span class="ln-key-sw" style="background:${M_BOTH}"></span>${T('both', '两类都用')} <span class="ln-key-sw" style="background:${M_CLOSED}"></span>${T('API only', '只用闭源 API')}</p>
    <div class="ln-stack">${rows.map((r, i) => `<div class="ln-stack-row${i === rows.length - 1 ? ' is-partial' : ''}"><span>${mMonth(r.month)}</span><i>${seg(r.openOnly, M_OPEN, T('open weights only', '只用开源权重'))}${seg(r.both, M_BOTH, T('both', '两类都用'))}${seg(r.closedOnly, M_CLOSED, T('API only', '只用闭源 API'))}</i><small>${num(r.papers)}</small></div>`).join('')}</div>
    <p class="fd-note">${T('Among papers naming a language or vision-language model twice; the number on the right is how many.', '在至少两次点名语言或视觉语言模型的论文中计算；右侧是论文数。')}</p>`;
  },
  mfrontier() {
    const F = P.models2026.frontier, labels = [T('0–2 mo', '0–2 月'), T('3–5', '3–5'), T('6–8', '6–8'), T('9–11', '9–11'), T('12–17', '12–17'), T('18–23', '18–23'), T('24+', '24+')];
    return `<div class="fd-tiles"><div class="fd-tile"><h4>${T('Months from the newest model to the paper', '论文点名的最新模型发布了几个月')}</h4>${bars(F.hist, labels, INK, {fmt: v => num(v)})}<small>${T('papers', '论文数')}</small></div>
      ${tile(T('Papers whose newest model is under 7 months old', '最新模型发布不足 7 个月的论文'), T('share by month', '各月比例'), F.byMonth.map(r => r.within6), P.models2026.months.map(mMonth), COLORS.attention, v => pctf(v, 0))}
      ${tile(T('Median distance to the frontier', '离前沿的中位距离'), T('months, by month', '个月，按月'), F.byMonth.map(r => r.median), P.models2026.months.map(mMonth), COLORS.supply, v => v == null ? '—' : v + T(' mo', ' 月'))}</div>
    <p class="fd-note">${T(`For each paper, the newest language model it names twice: its release month (first OpenRouter listing in the snapshot of 2026-10-07; vendor announcement for older models) against the paper's month. ${num(F.papers)} papers.`, `每篇论文取它点名两次以上的最新语言模型：发布月份（2026-10-07 OpenRouter 快照中的首次上架月份；更早的模型用厂商发布月份）与论文月份之差。共 ${num(F.papers)} 篇。`)}</p>`;
  },
  mkind() {
    const K = P.models2026.byKind, names = {digital: T('Digital agents', '数字智能体'), physical: T('Physical agents', '物理智能体'), rl: T('RL agents in simulators', '仿真中的强化学习智能体'), none: T('Foundational layer', '基础层')};
    return `<table class="fd-table"><thead><tr><th>${T('Agent kind', '智能体类型')}</th><th>${T('Papers', '论文')}</th><th>${T('Name a model', '点名模型')}</th><th>${T('Most named families', '点名最多的家族')}</th></tr></thead><tbody>${Object.entries(K).map(([k, r]) => `<tr><th>${names[k]}</th><td>${num(r.papers)}</td><td>${pctf(100 * r.named / Math.max(1, r.papers), 0)}</td><td>${Object.entries(r.families).slice(0, 5).map(([f, v]) => `${esc(f)} ${pctf(v, 0)}`).join(' · ')}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T('Agent kind from the current facet labels (agent settings); shares are of all papers of that kind with a full text.', '智能体类型来自当前的标注（agent 场景）；比例以该类型有全文的全部论文为分母。')}</p>`;
  },
  mcountry() {
    const C2 = P.models2026.byCountry, fams = [...new Set([...Object.keys(C2.US.families), ...Object.keys(C2.CN.families)])].filter(f => !['Guard', 'VLA', 'Other VLM'].includes(f)).slice(0, 9);
    return `<table class="fd-table"><thead><tr><th>${T('Family', '家族')}</th><th>${flag('US')}${esc(country('US'))} (${num(C2.US.papers)})</th><th>${flag('CN')}${esc(country('CN'))} (${num(C2.CN.papers)})</th></tr></thead><tbody>${fams.map(f => { const a = C2.US.families[f] || 0, b = C2.CN.families[f] || 0; return `<tr><th>${esc(f)}</th><td>${barCell(a, 50, M_CLOSED)}${pctf(a, 0)}</td><td>${barCell(b, 50, M_OPEN)}${pctf(b, 0)}</td></tr>`; }).join('')}</tbody></table>
    <p class="fd-note">${T('Papers whose located institutions are all in one country; share of that country\'s papers with a full text.', '只计所有已定位机构都在同一国家的论文；比例以该国有全文的论文为分母。')}</p>`;
  },
  mguard() {
    const M = P.models2026, gs = M.generations.filter(g => g.kind === 'vla' || g.kind === 'guard'), max = Math.max(...gs.map(g => g.share), 0.1);
    const row = g => { const key = 'L' + Math.random().toString(36).slice(2, 9); lists.set(key, {ids: g.ids, heading: g.label});
      return `<button class="ln-mrow" data-fd-list="${key}"><span>${esc(g.label)}<small>${g.kind === 'vla' ? T('robot policy', '机器人策略') : T('guard model', '护栏模型')}</small></span>${barCell(g.share, max, g.kind === 'vla' ? COLORS.supply : COLORS.connection)}<b>${num(g.papers)}</b></button>`; };
    return `<div class="ln-mrows">${gs.sort((a, b) => b.papers - a.papers).map(row).join('')}</div><p class="fd-note">${T('Number of papers naming each at least twice. Vision-language-action models (robot policies) and guard models are counted apart from the language models above.', '至少两次点名的论文数。视觉-语言-动作模型（机器人策略）和护栏模型与上面的语言模型分开统计。')}</p>`;
  },
};
// ------------------------------------------------------------------------------------------------ topic: open source (findings.oss)
// The open-source side of agent safety against the papers (oss_analysis.py): growth, research lines, paper code, attention
const O_TYPES = () => ({tool: T('Tools', '工具'), research_implementation: T('Paper implementations', '论文实现'), evaluation: T('Evaluation', '评测'), dataset: T('Datasets', '数据集'),
  execution_environment: T('Execution environments', '执行环境'), framework_module: T('Framework modules', '框架模块'), infrastructure: T('Infrastructure', '基础设施'), other: T('Other', '其他')});
const O_ROLES = () => ({attack: T('Attacks', '攻击'), defense: T('Defences', '防御'), benchmark: T('Benchmarks', '基准'), measurement: T('Measurements', '测量'), analysis_theory: T('Analysis & theory', '分析与理论'), system_tool: T('Systems & tools', '系统与工具'), survey_position: T('Surveys & positions', '综述与立场')});
const repoLink = r => `<a href="https://github.com/${esc(r)}" target="_blank" rel="noopener">${esc(r)}</a>`;
const BO = {
  ogrowth() {
    const g = P.oss.growth, k = Math.max(0, g.months.indexOf('2024-01')), ms = g.months.slice(k), lab = ms.map(m => m.slice(2).replace('-', '.'));
    return `<div class="fd-tiles">${tile(T('Repositories created', '新建仓库'), T('per month; the last month is incomplete', '每月；最后一个月不完整'), g.repos.slice(k), lab, COLORS.supply, v => num(v))}${tile(T('Works first posted', '首次公开的论文'), T('per month; the last month is incomplete', '每月；最后一个月不完整'), g.papers.slice(k), lab, INK, v => num(v))}</div>
    <p class="fd-note">${T(`Doubling time from a log-linear fit of monthly counts, ${g.window[0]} to ${g.window[1]}. Repositories in the agent-security group, forks and mirrors left out; metrics captured ${P.oss.capture}.`, `翻倍时间按 ${g.window[0]} 至 ${g.window[1]} 的月度数量做对数线性拟合。仓库为 agent 安全组，不含 fork 与镜像；数据采集于 ${P.oss.capture}。`)}</p>`;
  },
  otypes() {
    const d = P.oss.types, keys = ['tool', 'research_implementation', 'evaluation', 'dataset'], cols = {tool: COLORS.supply, research_implementation: M_CLOSED, evaluation: COLORS.attention, dataset: COLORS.connection}, names = O_TYPES();
    const rows = d.halves.map((h, i) => { const tot = d.total[i] || 1; return {h, tot: d.total[i], seg: keys.map(k => [k, 100 * d.counts[k][i] / tot])}; }).filter(r => r.tot);
    return `<p class="fd-note">${keys.map(k => `<span class="ln-key-sw" style="background:${cols[k]}"></span>${names[k]}`).join(' ')}</p><div class="ln-stack">${rows.map((r, i) => `<div class="ln-stack-row${i === rows.length - 1 ? ' is-partial' : ''}"><span>${r.h}</span><i>${r.seg.map(([k, v]) => v ? `<span style="width:${v}%;background:${cols[k]}" data-tip="${esc(`${names[k]} ${r.h}: ${pctf(v)}`)}"></span>` : '').join('')}</i><small>${num(r.tot)}</small></div>`).join('')}</div>
    <p class="fd-note">${T('Share of the repositories created in each half-year, by what they offer; the number on the right is how many were created.', '各半年新建仓库按类型的构成；右侧是新建数量。')}</p>`;
  },
  ogap() {
    const ls = [...P.oss.lines].filter(l => l.ratio != null).sort((a, b) => b.ratio - a.ratio), max = Math.max(...ls.flatMap(l => [l.repoShare, l.paperShare]));
    const row = l => { const key = 'L' + Math.random().toString(36).slice(2, 9); lists.set(key, {heading: T(`${cl(l.cluster)}: most-starred repositories`, `${cl(l.cluster)}：星数最多的仓库`), html: `<ol class="fd-drawer-list">${l.top.map(r => `<li>${repoLink(r)}</li>`).join('')}</ol>`});
      return `<button class="ln-orow" data-fd-list="${key}"><span>${esc(cl(l.cluster))}</span><i><em style="width:${(100 * l.paperShare / max).toFixed(1)}%;background:${INK}"></em><em style="width:${(100 * l.repoShare / max).toFixed(1)}%;background:${COLORS.supply}"></em></i><b class="${l.ratio >= 1 ? 'ln-up' : 'ln-down'}">×${l.ratio.toFixed(2)}</b></button>`; };
    return `<p class="fd-note"><span class="ln-key-sw" style="background:${INK}"></span>${T('share of papers', '论文份额')} <span class="ln-key-sw" style="background:${COLORS.supply}"></span>${T('share of repositories', '仓库份额')} · ${T('ratio = repositories ÷ papers; click a line for its most-starred repositories', '比值 = 仓库份额 ÷ 论文份额；点击一行看星数最多的仓库')}</p><div class="ln-orows">${ls.map(row).join('')}</div>
    <p class="fd-note">${T('Both shares are fractional: a work or repository in several clusters counts in part in each. Repository clusters come from the same 19-cluster taxonomy, read from the README and description.', '两种份额都按比例计：属于多个星团的论文或仓库在每个星团各计一部分。仓库的星团来自同一套 19 星团分类，依据 README 与描述判定。')}</p>`;
  },
  ocode() {
    const c = P.oss.code, names = O_ROLES(), rows = Object.entries(c.byRole).sort((a, b) => b[1].withCode - a[1].withCode), max = Math.max(...rows.map(r => r[1].withCode));
    return `<div class="fd-hbars">${rows.map(([k, r]) => `<div class="fd-hbar"><span>${names[k]} <small>(${num(r.papers)})</small></span>${barCell(r.withCode, max, COLORS.attention)}<b>${pctf(r.withCode)}</b></div>`).join('')}</div>
    <p class="fd-note">${T(`Share of works, by main contribution type, whose own code is a verified repository in the open-source set (${num(P.oss.papersWithCode)} works in all). By year: ${c.years.map((y, i) => `${y} ${pctf(c.byYear[i])}`).join(' · ')}; recent works are linked later.`, `按主要贡献类型，有已核实自有代码仓库的工作比例（共 ${num(P.oss.papersWithCode)} 项）。按年份：${c.years.map((y, i) => `${y} ${pctf(c.byYear[i])}`).join(' · ')}；近期工作的链接补得较晚。`)}</p>`;
  },
  ofate() {
    const f = P.oss.fate, cols = [['paperCode', T('Paper code', '论文代码')], ['paperCodeOverAYear', T('Paper code over a year old', '建立超过一年的论文代码')], ['tools', T('Tools (no paper)', '工具（无论文）')]];
    const rows = [['repos', T('Repositories', '仓库数'), v => num(v)], ['medianStars', T('Median stars', '星数中位数'), v => num(v)], ['under10', T('Under 10 stars', '不足 10 颗星'), v => pctf(v)],
      ['pushed180', T('Pushed in the last 180 days', '近 180 天有更新'), v => pctf(v)], ['noLicence', T('No licence (not open source)', '没有许可证（法律上不算开源）'), v => pctf(v)], ['medianAgeDays', T('Median age (days)', '中位年龄（天）'), v => num(v)]];
    return `<table class="fd-table"><thead><tr><th></th>${cols.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${rows.map(([k, l, fmt]) => `<tr><th>${l}</th>${cols.map(([c]) => `<td>${fmt(f[c][k])}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="fd-note">${T(`At the capture of ${P.oss.capture}. A repository without a licence file can be read but not legally reused.`, `采集于 ${P.oss.capture}。没有许可证文件的仓库可以看，但在法律上不能被复用。`)}</p>`;
  },
  owho() {
    const w = P.oss.who;
    return `<table class="fd-table"><thead><tr><th>${T('Organization', '组织')}</th><th>${T('Repositories', '仓库')}</th><th>${T('Stars', '星数')}</th></tr></thead><tbody>${w.topOrgsByStars.slice(0, 10).map(o => `<tr><th><a href="https://github.com/${esc(o.owner)}" target="_blank" rel="noopener">${esc(o.owner)}</a></th><td>${num(o.repos)}</td><td>${num(o.stars)}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T('GitHub organizations owning repositories in the set, by stars; individual developers are not listed (only institution-level aggregates are published).', '按星数排列的 GitHub 组织；不列个人开发者（只公布机构层面的汇总）。')}</p>`;
  },
  oconc() {
    const c = P.oss.concentration, names = O_TYPES();
    return `<table class="fd-table"><thead><tr><th>${T('Repository', '仓库')}</th><th>${T('Stars', '星数')}</th><th>${T('Type', '类型')}</th><th>${T('Created', '建立')}</th></tr></thead><tbody>${c.topRepos.slice(0, 10).map(r => `<tr><th>${repoLink(r.repo)}</th><td>${num(r.stars)}</td><td>${names[r.type] || esc(r.type || '')}</td><td>${esc(r.created)}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T(P.oss.disclaimer, '星数和 fork 数是 GitHub 上的关注度，不代表采用、有效或认可。')}</p>`;
  },
};
// ================================================================================================ lenses and questions
// three parts (owner decision 2026-10-18): Landscape (what papers are about: where they sit, and how the lines connect;
// attack, defence and evaluation are content and live here), Players (countries, then institutions), Trajectory (time,
// seen from the head and the long tail). The resource check moved to the universe page, beside the mechanisms it tests.
// Old links to former lenses open the chapter that now holds most of their questions.
const LENS_ALL = ['structure', 'connect', 'lead', 'evolve', 'models', 'oss'];
const LENS_LEGACY = {targets: 'structure', tail: 'evolve', attack: 'structure', navigate: 'key'};
const lensIds = () => LENS_ALL;
const PARTS = t => [['positioning', t('Landscape · Positioning', '版图 · 定位'), t('Where works sit: agents and safety', '论文落在哪里：智能体与安全'), ['structure']],
  ['connection', t('Landscape · Connection', '版图 · 衔接'), t('How research lines connect', '研究线之间怎样衔接'), ['connect']],
  ['players', t('Players', '力量'), t('Which countries and institutions drive it', '哪些国家与机构在推动'), ['lead']],
  ['trajectory', t('Trajectory', '走向'), t('How the head and the long tail change over time', '头部与长尾在时间中怎样变化'), ['evolve']]];
// topic boards beside the three parts (owner request 2026-10-18)
const TOPICS = t => [['models', t('Topic: models', '专题 · 模型'), t('Which models 2026 papers work with', '2026 年论文在用哪些模型'), ['models']],
  ['oss', t('Topic: open source', '专题 · 开源'), t('Repositories against the papers', '开源仓库与论文对照'), ['oss']]];
export function lensMeta(t) {
  return {structure: [t('Positioning', '定位'), t('Where works sit: agents, risks, attacks, defences and evaluation', '论文落在哪里：研究对象、风险、攻防与评测')],
    connect: [t('Connection', '衔接'), t('What connects research lines, and how knowledge flows between them', '研究线之间靠什么连接，知识怎样流动')],
    lead: [t('Players', '力量'), t('Which countries and institutions open, lead and shape the field', '哪些国家与机构开创、引领、塑造这个领域')],
    evolve: [t('Trajectory', '走向'), t('How the field moves over time, seen from the head and the long tail', '领域在时间中怎样变化：从头部看，也从长尾看')],
    models: [t('Topic: models', '专题 · 模型'), t('Which foundation models the latest papers work with, and how close to the frontier', '最新论文在用哪些基础模型，离前沿有多近')],
    oss: [t('Topic: open source', '专题 · 开源'), t('What the open-source side builds, where it meets the papers, and what becomes of paper code', '开源在做什么，与论文在哪里交汇，论文代码后来怎样')]};
}
// groups inside a chapter (the Connection chapter has its own, CR_GROUPS); a question not listed follows at the end
const LN_GROUPS = () => ({
  structure: [['object', T('What is studied', '研究对象与边界'), T('agents, venues and the edges of the field', '智能体、发表场所与领域边界'), ['scope', 'traditions', 'venues', 'settings']],
    ['risk', T('What is at stake', '安全问题'), T('the requirement protected, where the risk comes from, where it occurs, who is harmed', '守护哪条要求、风险从哪来、出在哪里、伤害什么'), ['psafety', 'risk', 'pcomponent', 'surfaces', 'gaps']],
    ['attackdef', T('Attack, defence and evaluation', '攻防与评测'), T('what is attacked, how it is defended, how well it is tested', '攻什么、怎么守、检验得怎样'), ['balance', 'imbalance', 'mechanisms', 'pstage', 'adaptive', 'realism']]],
  lead: [['countries', T('Countries', '国家'), T('where the work comes from, and how the map shifts', '研究来自哪里，格局怎样变化'), ['shares', 'rising', 'directions', 'pioneers', 'geoconc', 'punch', 'apart']],
    ['institutions', T('Institutions', '机构'), T('who produces, who supplies, who sets the pace', '谁产出、谁供给、谁定节奏'), ['concentration', 'influence', 'industry', 'bigteams', 'newcomers', 'people']]],
  evolve: [['pace', T('Pace', '节奏'), T('how fast the field grows, and where its weight moves', '长得多快，重心往哪移'), ['growth', 'shift', 'diversify', 'path']],
    ['head', T('The head', '头部'), T('the big lines: who stays, who arrives, how fast they grow', '大方向：谁留下、谁进来、长得多快'), ['hturnover', 'hpace', 'onset', 'timeline']],
    ['tail', T('The long tail', '长尾'), T("where next year's directions are now", '下一年的方向，现在在哪里'), ['shape', 'backtest', 'rising', 'terms', 'diffusion']],
    ['cold', T('Opportunities in the cold', '冷门里的机会'), T('lines few people work on: do they come back, can it be seen, where the gaps are', '做的人少的方向：会不会翻身、能否提前认出、空白在哪里'), ['cold1', 'cold2', 'cold3', 'cold4', 'open']],
    ['frontier', T('Open questions', '前沿与机会'), T('what is rising now and what to work on next', '现在在升温的、下一步可以做的'), ['radar', 'next']]],
  models: [['what', T('What is used', '用哪些模型'), T('generations, families, open or closed', '哪一代、哪一家、开源还是闭源'), ['mtop', 'mfamily', 'mopen']],
    ['uses', T('What they are used for', '拿来做什么'), T('studied, judging, trained, attacking', '被测、当裁判、被训练、当攻击方'), ['muses', 'mjudge', 'mtrained', 'mattack']],
    ['fresh', T('How fresh', '离前沿多远'), T('the distance from the newest model to the paper', '论文用的最新模型发布了多久'), ['mfrontier']],
    ['where', T('Who uses what', '谁在用、用在哪'), T('by agent kind and by country; robot policies and guard models', '按智能体类型、按国家；机器人策略与护栏模型'), ['mkind', 'mcountry', 'mguard']],
    ['long', T('Since 2023', '长期对照'), T('the families named in experiments, every year since 2023', '2023 年以来每年实验中点名的模型家族'), ['models', 'country']]],
  oss: [['growth', T('Growth', '生长'), T('how fast, and what kind of repositories', '长得多快，长出什么'), ['ogrowth', 'otypes']],
    ['papers', T('Against the papers', '与论文对照'), T('which lines have tools, which papers release code', '哪些方向有开源，哪些论文放代码'), ['ogap', 'ocode', 'ofate']],
    ['people', T('Who and where', '谁在做、关注在哪'), T('organizations and the concentration of attention', '组织与关注的集中'), ['owho', 'oconc']]]});
// ------------------------------------------------------------------------------------------------ second-round analyses (findings.deeper)
const B3 = {
  punch() {
    const inf = P.deeper.influence, ys = inf.cohorts;
    const cell = r => {
      const ratio = r.workShare ? r.top10Share / r.workShare : null;
      return `<td data-tip="${esc(T(`Works ${pctf(r.workShare)} · most-cited tenth ${pctf(r.top10Share)} · all citations ${pctf(r.citeShare)} · citations from Atlas works ${pctf(r.atlasCiteShare)} (${num(r.works)} works that year)`, `工作 ${pctf(r.workShare)} · 被引最多的前 10% ${pctf(r.top10Share)} · 全部引用 ${pctf(r.citeShare)} · 来自 Atlas 工作的引用 ${pctf(r.atlasCiteShare)}（当年 ${num(r.works)} 项）`))}">${pctf(r.workShare, 0)} → <b>${pctf(r.top10Share, 0)}</b> <small class="${ratio >= 1 ? 'ln-up' : 'ln-down'}">×${ratio == null ? '—' : ratio.toFixed(2)}</small></td>`;
    };
    return `<p class="fd-note">${T('Per publication year: the country’s share of that year’s works → its share of the most-cited tenth of that year’s works (Semantic Scholar citations), and the ratio of the two. Comparing within a year keeps young papers from being judged against old ones. Fractional credit; hover a cell for all-citation and Atlas-citation shares.', '按发表年份：该国在当年工作中的份额 → 在当年被引最多的前 10% 工作中的份额（Semantic Scholar 引用），以及两者之比。只在同一年内比较，避免拿新论文和老论文比被引。按比例计；悬停可看全部引用与 Atlas 内引用的份额。')}</p>
    <table class="fd-table ln-punch"><thead><tr><th>${T('Country / region', '国家/地区')}</th>${ys.map(y => `<th>${y}</th>`).join('')}</tr></thead><tbody>${inf.countries.map(c => `<tr><th>${flag(c)}${esc(country(c))}</th>${ys.map(y => { const r = inf.rows[c].find(x => x.year === y); return r ? cell(r) : '<td>—</td>'; }).join('')}</tr>`).join('')}</tbody></table>`;
  },
  pioneers() {
    const rows = [...P.deeper.pioneers].sort((a, b) => (a.first === a.now) - (b.first === b.now) || a.from.localeCompare(b.from));
    return `<p class="fd-note">${T('Leader among each cluster’s first 30 works with a located institution (the months they span), and leader in the last 12 months; fractional credit. Rows where the leader changed come first; the bracket gives the first leader’s share now.', '每个星团最早 30 项有已定位机构的工作（及其时间跨度）中的领先者，以及近 12 个月的领先者；按比例计。领先者发生变化的行排在前面；括号内是最初领先者现在的份额。')}</p>
    <table class="fd-table"><thead><tr><th>${T('Cluster', '星团')}</th><th>${T('First 30 works', '最早 30 项工作')}</th><th>${T('Led by', '领先者')}</th><th>${T('Last 12 months', '近 12 个月')}</th><th>${T('Led by', '领先者')}</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.first !== r.now ? 'ln-changed' : ''}"><th>${esc(cl(r.cluster))}</th><td>${r.from} – ${r.to} ${listButton(r.firstIds, T('read', '阅读'), `${cl(r.cluster)} · ${T('first 30 works', '最早 30 项工作')}`)}</td><td>${flag(r.first)}${esc(country(r.first))} ${pctf(r.firstShare, 0)}</td><td>${num(r.nowWorks)} ${T('works', '项')}</td><td><b>${flag(r.now)}${esc(country(r.now))}</b> ${pctf(r.nowShare, 0)}${r.first !== r.now ? ` <small>(${flag(r.first)}${esc(country(r.first))} ${pctf(r.firstNowShare, 0)})</small>` : ''}</td></tr>`).join('')}</tbody></table>`;
  },
  geoconc() {
    const rows = [...P.deeper.geoConcentration].sort((a, b) => b.topShare - a.topShare);
    return `<p class="fd-note">${T('Works since 2023 with a located institution, fractional credit. Leading country’s share, number of countries, and the share of works with institutions in two or more countries.', '2023 年以来有已定位机构的工作，按比例计。领先国家的份额、涉及的国家数，以及机构分布在两个及以上国家的工作比例。')}</p>
    <table class="fd-table"><thead><tr><th>${T('Cluster', '星团')}</th><th>${T('Works', '工作')}</th><th>${T('Leading country', '领先国家')}</th><th></th><th>${T('Countries', '国家数')}</th><th>${T('International', '国际合作')}</th></tr></thead><tbody>${rows.map(r => `<tr><th>${esc(cl(r.cluster))}</th><td>${num(r.works)}</td><td>${flag(r.top)}${esc(country(r.top))} ${pctf(r.topShare, 0)}</td><td>${barCell(r.topShare, 60, COLORS.connection)}</td><td>${r.countries}</td><td>${pctf(r.international, 0)}</td></tr>`).join('')}</tbody></table>`;
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
    const part = (key, title) => { const p = g.partners[key]; return `<div><h4>${title}</h4><small class="fd-note">${num(p.works)} ${T('international works', '项国际合作工作')}</small><div class="fd-hbars">${p.top.map(([c, v]) => `<div class="fd-hbar"><span>${flag(c)}${esc(country(c))}</span>${barCell(v, 60, c === 'US' || c === 'CN' ? COLORS.connection : COLORS.attention)}<b>${pctf(v, 0)}</b></div>`).join('')}</div></div>`; };
    return `<p class="fd-note">${T('Works with a located institution in China (or the US) that also have one in the other country, by year (current year partial). Below: which countries appear on the international works of each, 2020–23 against 2025 onward; a work counts once for every partner country.', '有已定位中国（或美国）机构、同时也有另一国机构的工作占比，按年（当年未完）。下方：各自的国际合作工作中出现的伙伴国家，2020–23 年与 2025 年以来对比；一项工作对每个伙伴国家各计一次。')}</p>
    ${lineChart(rows.map(r => r.year), series)}
    <div class="ln-partners">${part('CN_before', T(`Partners of ${country('CN')}, 2020–23`, `${country('CN')}的合作伙伴，2020–23`))}${part('CN_recent', T(`Partners of ${country('CN')}, 2025–`, `${country('CN')}的合作伙伴，2025 年以来`))}${part('US_before', T(`Partners of ${country('US')}, 2020–23`, `${country('US')}的合作伙伴，2020–23`))}${part('US_recent', T(`Partners of ${country('US')}, 2025–`, `${country('US')}的合作伙伴，2025 年以来`))}</div>
    <p class="fd-note">${listButton(last.bothIds, T(`US–China works in ${last.year}`, `${last.year} 年的中美合作工作`), T(`Works with institutions in both the US and China, ${last.year}`, `${last.year} 年同时有中美机构的工作`))}</p>`;
  },
  rising() {
    const g = P.deeper.global, [a, b] = g.growthYears, max = Math.max(...g.rising.map(r => r[3]));
    return `<div class="fd-two"><div><table class="fd-table"><thead><tr><th>${T('Country / region', '国家/地区')}</th><th>${a}</th><th>${b}</th><th>${T('Growth', '增长')}</th><th></th></tr></thead><tbody>${g.rising.map(r => `<tr><th>${flag(r[0])}${esc(country(r[0]))}</th><td>${num(Math.round(r[1]))}</td><td>${num(Math.round(r[2]))}</td><td><b>×${r[3]}</b></td><td>${barCell(r[3], max, r[3] > g.fieldGrowth ? COLORS.connection : COLORS.attention)}</td></tr>`).join('')}</tbody></table>
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
// ------------------------------------------------------------------------------------------------ Positioning chapter: the placement map (findings.position)
// A mosaic of where works sit: one column per agent kind (as wide as its works), split by a chosen dimension (the safety
// requirement by default; risk origin, system component, harm domain, contribution type or defence stage), for a year or
// all years, optionally for one contribution type. The findings scroll beside it and set it to what they describe.
const PS_COLORS = ['#336aab', '#c26541', '#905082', '#5e8c2e', '#6458aa', '#ab4440', '#b48b12', '#00897a'];
const PS_NAMES = () => ({
  agent: {digital_agent: T('Digital agents', '数字智能体'), physical_agent: T('Physical agents', '物理智能体'), rl_agent: T('RL agents in simulators', '仿真中的 RL 智能体'), no_concrete_agent: T('Foundational layer', '基础层')},
  safety: {goal_intent_alignment: T('Goal and intent', '目标与意图一致性'), information_state_integrity: T('Information and state integrity', '信息与状态完整性'), authorization_information_boundary: T('Authorisation and information boundary', '授权与信息边界'),
    action_consequence_safety: T('Action and consequence', '行动与后果安全性'), oversight_correctability: T('Oversight and correctability', '可监督与可纠正性'), collaboration_composition: T('Collaboration and composition', '协作与组合安全性'),
    safety_under_update: T('Safety under update', '更新后的安全保持'), comprehensive: T('Comprehensive', '综合')},
  origin: {human_adversarial: T('People attacking', '人为对抗'), human_non_adversarial: T('People, without intent', '人为非对抗'), agent_internal: T('The agent itself', 'Agent 内部失效'), human_agent_interaction: T('Human-agent interaction', '人机交互风险'), multi_agent_emergent: T('Several agents interacting', '多 Agent 交互与涌现')},
  components: {model: T('Model', '模型'), retrieval: T('Retrieval', '检索模块'), memory: T('Memory', '记忆'), tools_interfaces: T('Tools and interfaces', '工具与接口'), execution_environment: T('Execution environment', '执行环境'), communication_interface: T('Communication interfaces', '通信与交互接口')},
  harm: {discrimination_toxicity: T('Discrimination and toxicity', '歧视与毒性'), privacy_security: T('Privacy and security', '隐私与安全'), misinformation: T('Misinformation', '错误信息'), malicious_use: T('Malicious actors and misuse', '恶意行为者与滥用'), human_computer_interaction: T('Human-computer interaction', '人机交互'), socioeconomic_environmental: T('Socioeconomic and environmental', '社会经济与环境'), ai_system_safety: T('AI system safety and failures', 'AI 系统安全、失效与局限')},
  role: {attack: T('Attack', '攻击'), defense: T('Defence', '防御'), benchmark: T('Benchmark', '基准'), measurement: T('Measurement', '测量'), analysis_theory: T('Analysis and theory', '分析与理论'), system_tool: T('System or tool', '系统与工具'), survey_position: T('Survey or position', '综述与立场')},
  stage: {prevention: T('Prevention', '事前预防'), runtime_detection: T('Runtime detection', '运行时检测与拦截'), formal_guarantee: T('Formal guarantee', '形式保证'), after_the_fact: T('After the fact', '事后诊断与恢复')},
  surface: SURFACE_NAMES()});
const PS_DIMS = () => [['role', T('Contribution', '贡献类型')], ['safety', T('Safety requirement', '安全要求')], ['origin', T('Risk origin', '风险来源')], ['components', T('Component', '系统组件')], ['surface', T('Attack entry point', '攻击入口')], ['harm', T('Harm domain', '伤害领域')], ['stage', T('Defence stage', '防御环节')]];
const ps = {y: 'role', year: 'all', role: -1, hl: null, q: '', timer: 0, sec: 0, mode: 'count'};
// which column of the per-work codes holds a dimension, and whether it is a bit set (a work in several parts counts in each, fractionally)
const PS_COL = {safety: [1, false], origin: [2, false], components: [3, true], harm: [4, true], role: [5, false], stage: [6, true], surface: [11, true]};
function psRows() {
  const P0 = P.position, yr = ps.year, rows = [];
  for (let k = 0; k < P0.codes.length; k++) {
    const c = P0.codes[k], y = c[7];
    if (yr !== 'all' && (yr === 'early' ? !(y && y < P0.years[1]) : y !== +yr)) continue;
    if (ps.role >= 0 && c[5] !== ps.role) continue;
    if (ps.y === 'stage' && !c[6]) continue;  // defence stages exist only for defences
    rows.push(k);
  }
  return rows;
}
function psParts(c) {  // [[value index, weight]] of one work on the current dimension
  const [col, many] = PS_COL[ps.y], v = c[col];
  if (!many) return v >= 0 ? [[v, 1]] : [];
  const on = []; for (let b = 0; b < 8; b++) if (v >> b & 1) on.push(b);
  return on.map(b => [b, 1 / on.length]);
}
function psCube() {
  const P0 = P.position, A = P0.dims.agent.length, V = P0.dims[ps.y].length, cell = Array.from({length: A}, () => Array(V).fill(0)), ids = Array.from({length: A}, () => Array.from({length: V}, () => []));
  for (const k of psRows()) { const c = P0.codes[k]; for (const [v, w] of psParts(c)) { cell[c[0]][v] += w; ids[c[0]][v].push(k); } }
  return {cell, ids};
}
function psTable() {
  // agent kinds in columns (and all works), the chosen dimension in rows; a cell is works and the share of its column, or
  // in growth mode the last 12 months against the 12 before. A work with several values counts once in each of them.
  const P0 = P.position, names = PS_NAMES(), dims = P0.dims, A = dims.agent.length, vals = dims[ps.y], [col, many] = PS_COL[ps.y], grow = ps.mode === 'growth';
  const rows = grow ? P0.codes.map((_, k) => k).filter(k => P0.codes[k][12] < 24 && (ps.role < 0 || P0.codes[k][5] === ps.role) && (ps.y !== 'stage' || P0.codes[k][6])) : psRows();
  const has = (c, v) => many ? (c[col] >> v & 1) === 1 : c[col] === v;
  const cnt = Array.from({length: A + 1}, () => vals.map(() => [0, 0])), tot = Array.from({length: A + 1}, () => [0, 0]);
  for (const k of rows) { const c = P0.codes[k], w = grow ? (c[12] < 12 ? 1 : 0) : 1;
    for (const a of [c[0], A]) { tot[a][w]++; vals.forEach((_, v) => { if (has(c, v)) cnt[a][v][w]++; }); } }
  const hl = ps.hl, on = (a, v) => !hl ? null : (hl.cells || []).some(([p, q]) => p === a && q === v) || (hl.cols || []).includes(a) || (hl.rows || []).includes(v);
  const colName = a => a === A ? T('All works', '全部工作') : names.agent[dims.agent[a]];
  const cell = (a, v) => { const [p, r] = cnt[a][v], n = grow ? r : r + p, share = 100 * n / Math.max(1, grow ? tot[a][1] : tot[a][0] + tot[a][1]), g = (r + 1) / (p + 1), fieldG = (tot[a][1] + 1) / (tot[a][0] + 1), o = on(a, v);
    const shade = grow ? (p + r >= 10 ? rgba(g >= fieldG ? COLORS.connection : COLORS.attention, Math.min(0.75, Math.abs(Math.log2(g / fieldG)) / 2)) : 'transparent') : rgba(INK, (isDark() ? 0.7 : 0.5) * Math.min(1, share / 60));
    const tip = grow ? T(`${colName(a)} · ${names[ps.y][vals[v]]}: ${p} → ${r} (×${g.toFixed(1)}; column ×${fieldG.toFixed(1)})`, `${colName(a)} · ${names[ps.y][vals[v]]}：${p} → ${r}（×${g.toFixed(1)}；该列整体 ×${fieldG.toFixed(1)}）`)
      : T(`${colName(a)} · ${names[ps.y][vals[v]]}: ${num(n)} works, ${pctf(share)} of the column`, `${colName(a)} · ${names[ps.y][vals[v]]}：${num(n)} 项，占该列 ${pctf(share)}`);
    return `<td class="${o === true ? 'is-hl' : o === false ? 'is-dim' : ''}${a === A ? ' is-all' : ''}"><button data-ps-cell="${a}|${v}" style="background:${shade}" data-tip="${esc(tip)}">${grow ? (p + r >= 5 ? `<b>×${g.toFixed(1)}</b><small>${p}→${r}</small>` : `<small>${p}→${r}</small>`) : `<b>${num(n)}</b><small>${pctf(share, 0)}</small>`}</button></td>`; };
  const head = `<tr><th></th>${[...Array(A + 1).keys()].map(a => `<th class="${a === A ? 'is-all' : ''}${hl?.cols?.includes(a) ? ' is-hl' : ''}"><span>${esc(colName(a))}</span><small>${grow ? `${tot[a][0]} → ${tot[a][1]}` : num(tot[a][0] + tot[a][1])}</small></th>`).join('')}</tr>`;
  const body = vals.map((k, v) => `<tr class="${hl?.rows?.includes(v) ? 'is-hl' : ''}"><th><i style="background:${PS_COLORS[v % 8]}"></i>${esc(names[ps.y][k])}</th>${[...Array(A + 1).keys()].map(a => cell(a, v)).join('')}</tr>`).join('');
  return `<div class="pt-wrap"><table class="pt-table${hl ? ' has-hl' : ''}">${head}${body}</table></div>`;
}
function psNote() {
  const many = PS_COL[ps.y][1], P0 = P.position;
  return `${T(`Each cell: works and the share of its column${ps.mode === 'growth' ? ' — here, works in the last 12 months against the 12 before; orange grows faster than its column, green slower' : ''}. ${many ? 'A work with several values counts in each, so a column can add up to more than 100%. ' : ''}${ps.y === 'stage' ? 'Defences only. ' : ps.y === 'surface' ? 'Entry points come from the earlier facet labels. ' : ''}Click a cell for its works.`, `每格：工作数与在该列中的比例${ps.mode === 'growth' ? '；这里是近 12 个月相对前 12 个月的倍数，橙色比该列整体长得快，绿色更慢' : ''}。${many ? '一项工作有多个取值时在每个取值里都计一次，所以一列加起来可以超过 100%。' : ''}${ps.y === 'stage' ? '只统计防御。' : ps.y === 'surface' ? '攻击入口来自早先的标签。' : ''}点击格子查看其中的工作。`)} ${T(`Labels: Claude Opus 5.5 on title and abstract (rules ${P0.rules}), ${num(P0.labelled)} of ${num(P0.works)} works.`, `标签：Claude Opus 5.5 读取标题与摘要（规则 ${P0.rules}），${num(P0.works)} 项中已标注 ${num(P0.labelled)} 项。`)}${P0.agreement ? T(` A second reader (DeepSeek) agrees on the agent kind for ${pctf(P0.agreement.agent_kind)}, the safety requirement ${pctf(P0.agreement.safety_primary)} (${pctf(P0.agreement.safetyWithinOther)} within each other's secondary), the risk origin ${pctf(P0.agreement.risk_origin_primary)}.`, ` 第二位标注者（DeepSeek）在智能体类型上一致 ${pctf(P0.agreement.agent_kind)}，安全要求 ${pctf(P0.agreement.safety_primary)}（含次要求 ${pctf(P0.agreement.safetyWithinOther)}），风险来源 ${pctf(P0.agreement.risk_origin_primary)}。`) : ''}`;
}
function psControls() {
  const seg = (attr, items, cur) => `<span class="cx-seg">${items.map(([k, l]) => `<button data-${attr}="${k}" aria-pressed="${String(k) === String(cur)}">${l}</button>`).join('')}</span>`;
  const P0 = P.position, years = [['all', T('All years', '全部')], ['early', `≤${P0.years[0]}`], ...P0.years.slice(1).map(y => [y, String(y)])], names = PS_NAMES();
  return `<div class="cr-controls">${seg('ps-y', PS_DIMS(), ps.y)}</div>
    <div class="cr-controls">${seg('ps-mode', [['count', T('Works and share', '数量与比例')], ['growth', T('Growth', '增长')]], ps.mode)}${ps.mode === 'growth' ? `<span class="fd-note">${T('last 12 months against the 12 before', '近 12 个月对前 12 个月')}</span>` : `${psTimeline(years)}`}
      <label class="ps-role">${T('Contribution', '贡献类型')} <select data-ps-role><option value="-1">${T('all', '全部')}</option>${P0.dims.role.map((r, i) => `<option value="${i}"${i === ps.role ? ' selected' : ''}>${esc(names.role[r])}</option>`).join('')}</select></label></div>`;
}
function psTimeline(years) {  // time as a slider over the years, like the other parts; "all years" is the default
  const ys = years.slice(1), k = ys.findIndex(([y]) => String(y) === String(ps.year)), byYear = k >= 0;
  return `<span class="cx-seg">${[['all', T('All years', '全部年份')], ['year', T('By year', '按年份')]].map(([m, l]) => `<button data-ps-yearmode="${m}" aria-pressed="${(m === 'year') === byYear}">${l}</button>`).join('')}</span>
    ${byYear ? `<span class="ps-time"><button class="cr-play" data-ps-play aria-label="${T('Play the years', '逐年播放')}">${ps.timer ? '❚❚' : '▶'}</button><span class="ps-track"><input type="range" min="0" max="${ys.length - 1}" value="${k}" data-ps-yearpos aria-label="${T('Year', '年份')}"><span class="ps-ticks">${ys.map(([, l], i) => `<span style="left:${(100 * i / Math.max(1, ys.length - 1)).toFixed(1)}%">${l}</span>`).join('')}</span></span><b>${ys[k][1]}</b></span>` : ''}`;
}
function psStageInner() { return `${psControls()}<div class="cr-figure" data-ps-fig>${psTable()}</div><p class="fd-note">${psNote()}</p>`; }
function psStage() {
  return `<section class="cr-stage ps-stage" data-ps-stage><span class="fd-kicker">${T('THE PLACEMENT TABLE', '全局视图 · 落点表')}</span><h3>${T('Where works sit: agent kind × one dimension', '论文落在哪里：智能体类型 × 一个维度')}</h3>
    <p class="fd-note cr-intro">${T('Columns: the four kinds of agent and all works; rows: the dimension chosen above (contribution type first). Each cell gives works and the share of its column, or their growth. Each finding on the right sets the table to what it describes.', '列是四类智能体和全部工作；行是上方选中的维度（默认贡献类型）。每格给出工作数和在该列的比例，或者增长倍数。右边每条发现都会把表切到它说的那种情况。')}</p>
    <div data-ps-inner>${psStageInner()}</div></section>`;
}
function psConfig(qid) {
  const d = P.position?.dims, c = {y: 'role', year: 'all', role: -1, hl: null, mode: 'count', note: ''}, ri = r => d.role.indexOf(r), si = s => d.safety.indexOf(s), oi = o => d.origin.indexOf(o);
  const notes = {
    scope: T('Table: works by agent kind and contribution type.', '表格：各类智能体的工作，按贡献类型。'),
    traditions: T('Table: physical and RL agents (the control and robotics side) against digital agents, by safety requirement.', '表格：物理与 RL 智能体（控制与机器人一侧）对数字智能体，按安全要求。'),
    venues: T('Table: by contribution type.', '表格：按贡献类型。'),
    settings: T('Table: growth of each agent kind (column heads) and of each contribution type.', '表格：各类智能体（列头）与各贡献类型的增长。'),
    psafety: T('Table: safety requirements within each agent kind; action and consequence is lit for physical and RL agents.', '表格：各类智能体内的安全要求；亮出物理与 RL 智能体的“行动与后果”。'),
    risk: T('Table: risk origin by agent kind; "people attacking" is lit.', '表格：各类智能体的风险来源；亮出“人为对抗”。'),
    pcomponent: T('Table: where in the system the problem occurs.', '表格：问题出在系统的哪个部分。'),
    surfaces: T('Table: attack papers only, growth per entry point.', '表格：只看攻击论文，各入口的增长。'),
    gaps: T('Table: entry points by agent kind, to see the thin combinations.', '表格：各类智能体的攻击入口，看哪些组合很薄。'),
    balance: T('Table: attack papers per entry point; switch the contribution to Defence to compare.', '表格：各入口的攻击论文；把贡献类型切到“防御”即可对照。'),
    imbalance: T('Table: entry points by agent kind.', '表格：各类智能体的攻击入口。'),
    mechanisms: T('Table: defences by the stage at which they act.', '表格：防御按起作用的环节。'),
    pstage: T('Table: defences by the stage at which they act.', '表格：防御按起作用的环节。'),
    adaptive: T('Table: defences by stage; formal guarantees are lit.', '表格：防御按环节；亮出“形式保证”。'),
    realism: T('Table: by contribution type; benchmarks are lit.', '表格：按贡献类型；亮出“基准”。')};
  if (!d) return c;
  const cfg = {scope: {}, traditions: {y: 'safety', hl: {cols: [1, 2]}}, venues: {}, settings: {mode: 'growth'}, psafety: {y: 'safety', hl: {cells: [[1, si('action_consequence_safety')], [2, si('action_consequence_safety')]]}},
    risk: {y: 'origin', hl: {rows: [oi('human_adversarial')]}}, pcomponent: {y: 'components'}, surfaces: {y: 'surface', role: ri('attack'), mode: 'growth'}, gaps: {y: 'surface'},
    balance: {y: 'surface', role: ri('attack')}, imbalance: {y: 'surface'}, mechanisms: {y: 'stage'}, pstage: {y: 'stage'}, adaptive: {y: 'stage', hl: {rows: [2]}}, realism: {hl: {rows: [ri('benchmark')]}}}[qid] || {};
  return {...c, ...cfg, note: notes[qid] || ''};
}
function psRedraw() { const s = document.querySelector('[data-ps-inner]'); if (s) s.innerHTML = psStageInner(); }
function psStop() { if (ps.timer) { clearInterval(ps.timer); ps.timer = 0; } }
function psPlay() {
  if (ps.timer) { psStop(); psRedraw(); return; }
  const seq = ['early', ...P.position.years.slice(1)];
  let k = 0; ps.year = seq[0]; psRedraw();
  ps.timer = setInterval(() => { if (!document.querySelector('[data-ps-stage]')) return psStop(); k++; if (k >= seq.length) { psStop(); ps.year = seq[seq.length - 1]; } else ps.year = seq[k]; psRedraw(); }, 1300);
}
function psActivate(qid) {
  if (ps.q === qid) return;
  const c = psConfig(qid);
  psStop();
  Object.assign(ps, {q: qid, y: c.y, year: c.year, role: c.role, hl: c.hl, mode: c.mode});
  for (const el of document.querySelectorAll('.cr-card[data-ps-card]')) el.classList.toggle('is-active', el.dataset.psCard === qid);
  psRedraw();
}
function psDrawer(key) {
  const [a, v] = key.split('|').map(Number), P0 = P.position, names = PS_NAMES(), A = P0.dims.agent.length, [col, many] = PS_COL[ps.y];
  const rows = ps.mode === 'growth' ? P0.codes.map((_, k) => k).filter(k => P0.codes[k][12] < 12 && (ps.role < 0 || P0.codes[k][5] === ps.role)) : psRows();
  const ids = rows.filter(k => (a === A || P0.codes[k][0] === a) && (many ? (P0.codes[k][col] >> v & 1) === 1 : P0.codes[k][col] === v)).map(k => P0.ids[k]);
  const list = ids.sort((x, y) => (year(y) || '').localeCompare(year(x) || '')).slice(0, 80);
  openDrawer(`${a === A ? T('All works', '全部工作') : names.agent[P0.dims.agent[a]]} · ${names[ps.y][P0.dims[ps.y][v]]}`, `${list.length < ids.length ? `<p class="fd-note">${T(`The latest 80 of ${num(ids.length)}.`, `${num(ids.length)} 项中最新的 80 项。`)}</p>` : ''}${paperRows(list)}`);
}
function psCards(qs) {
  const byq = Object.fromEntries(qs.map(q => [q[0], q])), used = new Set(), gs = LN_GROUPS().structure;
  let n = 0;
  const card = id => { const [qid, q, a, body] = byq[id]; used.add(qid); n++;
    return `<article class="cr-card" id="q-${qid}" data-ps-card="${qid}"><button class="cr-card-head" data-ps-open="${qid}" aria-expanded="false"><span class="ln-qn">${String(n).padStart(2, '0')}</span><span class="cr-card-text"><b>${q}${impBadge(qid)}</b><em>${esc(a)}</em></span><i class="cx-chev" aria-hidden="true"></i></button>
      <p class="fd-note cr-config"><span>${psConfig(qid).note}</span><button class="cr-show" data-ps-show="${qid}">${T('Show in the table ↑', '在落点表上看 ↑')}</button></p><div class="cr-body" hidden>${body}</div></article>`; };
  const groups = gs.map(([key, name, sub, ids]) => { const got = ids.filter(id => byq[id]); return got.length ? `<section class="cr-group"><h3>${name}<small>${sub}</small></h3>${got.map(card).join('')}</section>` : ''; }).join('');
  const rest = qs.filter(q => !used.has(q[0]));
  return groups + (rest.length ? `<section class="cr-group"><h3>${T('More', '其他')}</h3>${rest.map(q => card(q[0])).join('')}</section>` : '');
}
const psLens = qs => `<div class="cr-wrap">${psStage()}<div class="cr-cards">${psCards(qs)}</div></div>`;
let psObserver = null;
function psBind(root) {
  psObserver?.disconnect(); psObserver = null;
  if (!root.querySelector('[data-ps-stage]')) return;
  if ('IntersectionObserver' in window && matchMedia('(min-width: 1100px)').matches) {  // within a section, the card crossing mid-screen sets the map
    psObserver = new IntersectionObserver(ens => { for (const en of ens) if (en.isIntersecting) psActivate(en.target.dataset.psCard); }, {rootMargin: '-40% 0px -55% 0px'});
    root.querySelectorAll('.cr-card[data-ps-card]').forEach(el => psObserver.observe(el));
  }
}
// charts for the new Positioning questions (bodies of the cards)
const BP = {
  table(rowsKey, colsKey, data, fmt = v => pctf(v, 0)) {  // agent kinds × values as a shaded table
    const names = PS_NAMES(), d = P.position.dims, max = Math.max(...Object.values(data).flatMap(r => Object.values(r)), 1);
    return `<table class="fd-table ps-table"><thead><tr><th></th>${d[colsKey].map(k => `<th>${esc(names[colsKey][k])}</th>`).join('')}</tr></thead><tbody>${d[rowsKey].map(r => `<tr><th>${esc(names[rowsKey][r])}</th>${d[colsKey].map(k => { const v = data[r]?.[k] || 0; return `<td style="background:${rgba(INK, (isDark() ? 0.75 : 0.55) * v / max)}">${fmt(v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  },
  hbars(key, data, color = COLORS.attention) {
    const names = PS_NAMES(), rows = Object.entries(data).sort((a, b) => b[1] - a[1]), max = Math.max(...rows.map(r => r[1]), 1);
    return `<div class="fd-hbars">${rows.map(([k, v]) => `<div class="fd-hbar"><span>${esc(names[key][k] || k)}</span>${barCell(v, max, color)}<b>${pctf(v)}</b></div>`).join('')}</div>`;
  },
  years(key, data) {
    const names = PS_NAMES(), ks = Object.keys(data).sort((a, b) => data[b][data[b].length - 1] - data[a][data[a].length - 1]).slice(0, 6);
    return lineChart(P.position.years.map((y, i) => i ? String(y) : `≤${y}`), ks.map((k, i) => ({label: names[key][k], color: PS_COLORS[P.position.dims[key].indexOf(k) % 8], values: data[k]})), {partialLast: true});
  },
};
// ------------------------------------------------------------------------------------------------ Positioning chapter as a book: a guide, then one section per group
// Section 1 explains the two axes before any number (owner review 2026-10-18: introduction and analysis were mixed); each
// later section is one group of findings under the placement map, full width, with a link to the next section.
const PS_INTRO = () => ({
  agent: [['digital_agent', T('Agents that act in software: they browse, operate computers and phones, write and run code, call tools and APIs, use MCP servers and skills, keep memory, run enterprise workflows, or work with other software agents.', '在软件世界里行动：浏览网页、操作电脑和手机、写代码并执行、调用工具与 API、使用 MCP 与 skills、带记忆的助手、企业工作流，或与其他软件智能体协作。'), T('A web agent hijacked by instructions hidden in a page; a coding agent that runs a destructive command.', '网页智能体被页面里藏的指令劫持；编码智能体执行了破坏性命令。')],
    ['physical_agent', T('Agents that act in the physical world: robots and embodied agents, autonomous vehicles, drones, including their simulators. The decisions must come from a learned policy or a foundation model.', '在物理世界里行动：机器人与具身智能体、自动驾驶、无人机（包括它们的仿真器）。决策须来自学习到的策略或基础模型。'), T('A manipulator that must not hit people; a driving model fooled by a patch on a sign.', '机械臂不能伤到人；驾驶模型被路牌上的贴纸骗过。')],
    ['rl_agent', T('Reinforcement-learning agents trained and tested in simulated environments: games, grid worlds, MuJoCo, Safety-Gym.', '在仿真环境里训练和测试的强化学习智能体：游戏、网格世界、MuJoCo、Safety-Gym。'), T('Reward hacking; exploring without breaking constraints.', '奖励投机；在不违反约束的前提下探索。')],
    ['no_concrete_agent', T('The foundational layer: work that studies no single agent but what every agent rests on. Five kinds: F1 aligning goals and behaviour (reward modelling, preference learning, specification gaming); F2 oversight and control (scalable oversight, corrigibility, detecting deception); F3 the trust boundary between instructions and data (instruction hierarchy, prompt injection at the model level); F4 evaluations of dangerous capabilities for autonomous action; F5 surveys and agendas on agent safety.', '基础层：不研究某一个具体的智能体，而是研究所有智能体都依赖的基础，分五类：F1 目标与行为的对齐机制（奖励建模、偏好学习、规格博弈）；F2 监督与控制（可扩展监督、可纠正性、识别欺骗）；F3 指令与数据的信任边界（指令层级、模型层面的提示注入）；F4 与自主行动相关的危险能力评测；F5 关于智能体安全的综述与议程。'), T('Detecting a model that fakes alignment; a survey of agent risks.', '识别伪装对齐的模型；一篇智能体风险综述。')]],
  safety: [['goal_intent_alignment', T('The agent pursues what its principals intend.', '智能体追求的是委托人真正想要的。'), T('reward hacking, specification gaming, deception, power-seeking', '奖励投机、规格博弈、欺骗、权力寻求')],
    ['information_state_integrity', T('Untrusted or manipulated input cannot corrupt what the agent perceives, believes, remembers or is told to do.', '不可信或被篡改的输入，不能污染智能体的感知、信念、记忆和指令。'), T('prompt injection, memory poisoning, manipulated tool output, sensor spoofing', '提示注入、记忆投毒、被篡改的工具返回、传感器欺骗')],
    ['authorization_information_boundary', T('The agent acts and shares information only within what it is allowed.', '智能体只在被允许的范围内行动和共享信息。'), T('permissions, least privilege, data exfiltration, privacy leakage, sandbox escape', '权限、最小权限、数据外泄、隐私泄露、沙箱逃逸')],
    ['action_consequence_safety', T('With the right goal, the actions and their effects in the world stay safe.', '目标正确时，动作及其在世界上的后果仍然安全。'), T('collisions, safe exploration, constrained RL, irreversible tool actions', '碰撞、安全探索、约束强化学习、不可逆的工具操作')],
    ['oversight_correctability', T('People can see, understand, intervene in and correct the agent.', '人能看见、理解、介入并纠正智能体。'), T('human approval, behaviour monitoring, interpretability for oversight, shutdown', '人工审批、行为监控、面向监督的可解释性、可关停')],
    ['collaboration_composition', T('Safety holds when agents interact or are composed into systems.', '多个智能体交互或组合成系统时，安全依然成立。'), T('collusion, miscoordination, emergent risk, protocols and plugin ecosystems', '共谋、协调失败、涌现风险、协议与插件生态')],
    ['safety_under_update', T('Safety is kept when the agent or its model changes.', '智能体或模型变化后，安全不退化。'), T('fine-tuning that erodes safety, continual learning, self-improvement', '微调侵蚀安全、持续学习、自我改进')],
    ['comprehensive', T('Broad surveys and frameworks that span three or more requirements without a main one.', '横跨三条以上要求、没有主次的综述与总体框架。'), '']],
  lenses: [['origin', T('where the risk comes from: people attacking, people without intent, the agent itself, the human-agent interaction, several agents interacting — tells being attacked apart from going wrong', '风险从哪来：人为对抗、人为非对抗、智能体内部失效、人机交互、多智能体交互——区分“被攻击”和“自己出错”')],
    ['components', T('where in the system the problem occurs: model, retrieval, memory, tools and interfaces, execution environment, communication interfaces', '问题出在系统的哪个部分：模型、检索、记忆、工具与接口、执行环境、通信与交互接口')],
    ['harm', T('who or what is harmed, in the seven domains of the MIT AI Risk Repository, so the field can be set against AI risk research at large', '伤害的是什么：采用 MIT AI 风险库的七个领域，便于和更大范围的 AI 风险研究对照')],
    ['role', T('what the research does: attack, defence, benchmark, measurement, analysis and theory, systems and tools, surveys', '研究做了什么：攻击、防御、基准、测量、分析与理论、系统与工具、综述与立场')],
    ['stage', T('for defences, where they act: prevention, runtime detection and blocking, formal guarantee, after-the-fact diagnosis and recovery', '对防御而言，在哪个环节起作用：事前预防、运行时检测与拦截、形式保证、事后诊断与恢复')]]});
function psIntro() {
  const I = PS_INTRO(), N = PS_NAMES(), P0 = P.position, dimName = Object.fromEntries(PS_DIMS());
  return `<section class="pb-intro">
    <div class="pb-block"><span class="fd-kicker">${T('WHY TWO AXES', '为什么拆成两条轴')}</span><h3>${T('Agent safety is two questions', 'Agent 安全是两个问题')}</h3>
      <p>${T('"Agent safety" joins two words. The agent: who acts, and where. The safety: what must not go wrong. The same prompt injection means one thing for a web agent and another for a robot; for the same robot, crashing into a person and being fooled by a sticker are different problems. So every work is placed on two axes: which kind of agent it studies, and which safety requirement it protects. Where the two cross is the placement map of this chapter.', '“Agent 安全”由两个词组成。Agent：谁在行动、在哪里行动。Safety：什么不能出错。同样是提示注入，对网页智能体和对机器人意义完全不同；同一个机器人，撞到人和被一张贴纸骗过，又是两类问题。所以我们把每篇论文放在两条轴上：它研究的是哪一类智能体，它守护的是哪一条安全要求。两条轴的交叉，就是这一章的落点图。')}</p></div>
    <div class="pb-block"><span class="fd-kicker">${T('AXIS 1 · THE AGENT', '第一条轴 · 智能体')}</span><h3>${T('Four kinds', '四类')}</h3>
      <div class="pb-cards">${I.agent.map(([k, what, eg], i) => `<article class="pb-card" style="--c:${PS_COLORS[i]}"><h4>${esc(N.agent[k])}</h4><p>${what}</p><p class="pb-eg"><b>${T('For example', '例如')}</b> ${eg}</p></article>`).join('')}</div></div>
    <div class="pb-block"><span class="fd-kicker">${T('AXIS 2 · THE SAFETY', '第二条轴 · 安全')}</span><h3>${T('Seven requirements of acting safely, and a column for broad work', '自主行动的七条安全要求，加一列“综合”')}</h3>
      <p class="fd-note">${T('Each work gets the requirement it protects, tests or shows violated as its main one, and up to two more.', '每项工作标一条主要的安全要求（它守护、检验或揭示被违反的那一条），最多再加两条次要的。')}</p>
      <div class="pb-req">${I.safety.map(([k, what, eg], i) => `<article style="--c:${PS_COLORS[i]}"><h4>${esc(N.safety[k])}</h4><p>${what}</p>${eg ? `<small>${eg}</small>` : ''}</article>`).join('')}</div>
      <h4 class="pb-sub">${T('Other ways to look at the same works', '同一批工作的其他观察角度')}</h4>
      <ul class="pb-lenses">${I.lenses.map(([k, what]) => `<li><b>${esc(dimName[k])}</b> ${what}</li>`).join('')}</ul></div>
    <p class="fd-note">${T(`How the labels were made: Claude Opus 5.5 read the title and abstract of each work (rules ${P0.rules}); DeepSeek labelled the same works as a second reader${P0.agreement ? `, agreeing on the agent kind for ${pctf(P0.agreement.agent_kind)} and on the main safety requirement for ${pctf(P0.agreement.safety_primary)} (${pctf(P0.agreement.safetyWithinOther)} within each other's secondary)` : ''}. The contribution type comes from the earlier facet labels.`, `标签怎么来的：Claude Opus 5.5 逐篇读取标题与摘要（规则 ${P0.rules}）；DeepSeek 作为第二位标注者标了同一批工作${P0.agreement ? `，在智能体类型上一致 ${pctf(P0.agreement.agent_kind)}，主要安全要求一致 ${pctf(P0.agreement.safety_primary)}（含次要求 ${pctf(P0.agreement.safetyWithinOther)}）` : ''}。贡献类型来自早先的标签。`)}</p>
  </section>`;
}
const PS_SEC_DEFAULT = {object: {y: 'role'}, risk: {y: 'safety'}, attackdef: {y: 'role'}};
function psSections() { return [['intro', T('Guide', '导读'), T('why two axes, and what each means', '为什么拆成两条轴，各是什么意思'), []], ...LN_GROUPS().structure]; }
function psBook(qs) {
  const secs = psSections(), k = Math.max(0, Math.min(secs.length - 1, ps.sec || 0)), [key, name, sub, ids] = secs[k], byq = Object.fromEntries(qs.map(q => [q[0], q]));
  const nav = `<nav class="pb-nav" aria-label="${T('Sections', '节')}">${secs.map(([kk, nm, sb], i) => `<button data-ps-sec="${i}" aria-current="${i === k ? 'page' : 'false'}"><span>${i + 1}</span><b>${nm}</b><small>${sb}</small></button>`).join('')}</nav>`;
  const next = k < secs.length - 1 ? `<button class="pb-next" data-ps-sec="${k + 1}">${T('Next section', '下一节')}：${secs[k + 1][1]} →</button>` : '';
  const prev = k > 0 ? `<button class="pb-prev" data-ps-sec="${k - 1}">← ${secs[k - 1][1]}</button>` : '<span></span>';
  if (key === 'intro') return `${nav}${psIntro()}<div class="pb-foot">${prev}${next}</div>`;
  let n = qs.findIndex(q => q[0] === ids.find(id => byq[id])) ;
  const cards = ids.filter(id => byq[id]).map(id => { const [qid, q, a, body] = byq[id]; n = qs.indexOf(byq[id]) + 1;
    return `<article class="cr-card pb-card-q" id="q-${qid}" data-ps-card="${qid}"><button class="cr-card-head" data-ps-open="${qid}" aria-expanded="false"><span class="ln-qn">${String(n).padStart(2, '0')}</span><span class="cr-card-text"><b>${q}${impBadge(qid)}</b><em>${esc(a)}</em></span><i class="cx-chev" aria-hidden="true"></i></button>
      <p class="fd-note cr-config"><span>${psConfig(qid).note}</span><button class="cr-show pb-show" data-ps-show="${qid}">${T('Show in the table ↑', '在落点表上看 ↑')}</button></p><div class="cr-body" hidden>${body}</div></article>`; }).join('');
  // the global map on the left, this section's findings on the right (each opens its own small chart)
  return `${nav}<div class="pb-head"><span class="fd-kicker">${T(`SECTION ${k + 1}`, `第 ${k + 1} 节`)}</span><h3>${name}</h3><p class="fd-note">${sub}</p></div><div class="cr-wrap">${psStage()}<div class="cr-cards pb-cards-col">${cards}<div class="pb-foot">${prev}${next}</div></div></div>`;
}
function psGoSection(k, root) {
  const secs = psSections(); ps.sec = Math.max(0, Math.min(secs.length - 1, k));
  const d = PS_SEC_DEFAULT[secs[ps.sec][0]] || {};
  psStop(); Object.assign(ps, {q: '', y: d.y || 'role', year: 'all', role: -1, hl: null, mode: 'count'});
  const box = root.querySelector('[data-ps-book]'); if (!box) return;
  box.innerHTML = psBook(lensQuestions('structure'));
  psBind(root);
  root.querySelector('.ln-chapters')?.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
const psSectionOf = qid => psSections().findIndex(s => s[3].includes(qid));
// ------------------------------------------------------------------------------------------------ Trajectory part: head and tail over time (findings.trajectory)
// Each candidate cluster (a research line found from paper content) is a dot: size (works in the 12 months up to the month
// shown, log scale) against growth (those 12 months against the 12 before). The dashed line is the head/tail cut: the
// largest lines left of nothing hold half of all works. Play the months to see lines cross from the tail into the head.
const tj = {m: null, q: '', hl: null, timer: 0, focus: -1};
const tjLast = () => P.trajectory.months.length - 1;
const tjTrail = (l, m) => { let s = 0; for (let k = Math.max(0, m - 11); k <= m; k++) s += l.counts[k]; return s; };
function tjHead(m) {  // the smallest set of the largest lines holding half the works (as in trajectory_analysis.head_set)
  const L = P.trajectory.lines, sizes = L.map(l => tjTrail(l, m)), order = sizes.map((_, k) => k).sort((a, b) => sizes[b] - sizes[a] || a - b), tot = sizes.reduce((s, x) => s + x, 0) || 1;
  const set = new Set(); let acc = 0;
  for (const k of order) { if (acc >= tot / 2 || !sizes[k]) break; set.add(k); acc += sizes[k]; }
  const cut = Math.min(...[...set].map(k => sizes[k]));
  return {set, cut, sizes};
}
const tjMonth = m => P.trajectory.months[m];
function tjSvg() {
  const T0 = P.trajectory, L = T0.lines, m = tj.m, {set, cut, sizes} = tjHead(m), W = 640, H = 430, left = 44, right = 14, top = 14, bottom = 34;
  const maxS = Math.max(...L.map(l => tjTrail(l, tjLast()))), lx = v => Math.log10(v + 1), x = v => left + (W - left - right) * lx(v) / lx(maxS);
  const g = (l, mm) => Math.log2((tjTrail(l, mm) + 1) / (tjTrail(l, mm - 12) + 1)), gy = v => top + (H - top - bottom) * (1 - (Math.max(-3, Math.min(6, v)) + 3) / 9);
  const hl = tj.hl ? new Set(tj.hl) : null, narrow = matchMedia('(max-width: 640px)').matches;
  const grid = [-2, -1, 0, 1, 2, 3, 4, 5].map(v => `<line x1="${left}" x2="${W - right}" y1="${gy(v)}" y2="${gy(v)}" class="${v === 0 ? 'tj-zero' : 'fd-grid'}"/><text x="${left - 6}" y="${gy(v) + 4}" text-anchor="end" class="fd-axis">${v >= 0 ? '×' + 2 ** v : '×1/' + 2 ** -v}</text>`).join('')
    + [1, 3, 10, 30, 100, 300].filter(v => v <= maxS).map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${H - bottom}" class="fd-grid"/><text x="${x(v)}" y="${H - bottom + 14}" text-anchor="middle" class="fd-axis">${v}</text>`).join('');
  const cutX = x(cut);
  const trailPath = k => { const pts = []; for (let mm = Math.max(T0.first, m - 12); mm <= m; mm++) { const s = tjTrail(L[k], mm); if (s) pts.push(`${x(s).toFixed(1)},${gy(g(L[k], mm)).toFixed(1)}`); } return pts.length > 1 ? `<polyline points="${pts.join(' ')}" class="tj-trail" stroke="${P.meta.galaxies[L[k].galaxy]?.color || INK}"/>` : ''; };
  const order = L.map((_, k) => k).filter(k => sizes[k] > 0).sort((a, b) => sizes[a] - sizes[b]);
  const dots = order.map(k => { const l = L[k], s = sizes[k], on = hl ? hl.has(k) : null, head = set.has(k);
    const tip = T(`${l.label} · ${l.cluster != null ? cl(l.cluster) : ''}: ${s} works in the 12 months to ${tjMonth(m)}, ×${((s + 1) / (tjTrail(l, m - 12) + 1)).toFixed(1)} on the year before · ${head ? 'head' : 'long tail'}`, `${l.label} · ${l.cluster != null ? cl(l.cluster) : ''}：截至 ${tjMonth(m)} 的 12 个月 ${s} 项工作，是前一年的 ${((s + 1) / (tjTrail(l, m - 12) + 1)).toFixed(1)} 倍 · ${head ? '头部' : '长尾'}`);
    return `<circle class="tj-dot${head ? ' is-head' : ''}${on === true ? ' is-hl' : on === false ? ' is-dim' : ''}" cx="${x(s).toFixed(1)}" cy="${gy(g(l, m)).toFixed(1)}" r="${(2.5 + 2.2 * Math.sqrt(s / 10)).toFixed(1)}" fill="${P.meta.galaxies[l.galaxy]?.color || INK}" data-tj-line="${k}" data-tip="${esc(tip)}"/>`; }).join('');
  // a few labels, largest first, skipped where they would sit on one already placed
  const placed = [], labels = (hl ? [...hl].sort((a, b) => sizes[b] - sizes[a]) : order.slice(-6).reverse()).filter(k => sizes[k] > 0).map(k => {
    const lx0 = x(sizes[k]) + 6, ly0 = gy(g(L[k], m)) - 6, text = L[k].label.split(' · ').slice(0, 2).join(' · '), w = text.length * (narrow ? 8 : 5.6);
    if (lx0 + w > W - right + 40 || placed.some(([a, b, c]) => Math.abs(b - ly0) < 13 && lx0 < a + c && a < lx0 + w) || placed.length >= (narrow ? 3 : 6)) return '';
    placed.push([lx0, ly0, w]);
    return `<text x="${lx0.toFixed(1)}" y="${ly0.toFixed(1)}" class="tj-label">${esc(text)}</text>`; }).join('');
  const trails = (hl && hl.size <= 15 ? [...hl] : []).map(trailPath).join('') + (tj.focus >= 0 ? trailPath(tj.focus) : '');
  return `<svg class="tj-map${hl ? ' has-hl' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${T('Research lines by size and growth', '研究线的规模与增长')}">${grid}
    <rect x="${cutX}" y="${top}" width="${W - right - cutX}" height="${H - top - bottom}" class="tj-headzone"/><line x1="${cutX}" x2="${cutX}" y1="${top}" y2="${H - bottom}" class="tj-cut"/>
    <text x="${cutX + 6}" y="${H - bottom - 8}" class="tj-zone">${T(`head · ${set.size} lines`, `头部 · ${set.size} 条线`)}</text><text x="${cutX - 6}" y="${H - bottom - 8}" text-anchor="end" class="tj-zone">${T('long tail', '长尾')}</text>
    ${trails}${dots}${labels}
    <text x="${W - right}" y="${H - 4}" text-anchor="end" class="fd-axis">${T('works in the last 12 months (log) →', '近 12 个月工作数（对数）→')}</text><text x="4" y="${top - 2}" class="fd-axis">${T('↑ growth on the year before', '↑ 比前一年增长')}</text></svg>`;
}
function tjTimeline() {
  const T0 = P.trajectory, M = T0.months.length, first = T0.first, ticks = T0.months.map((mm, k) => k >= first && mm.endsWith('-01') ? `<span style="left:${(100 * (k - first) / (M - 1 - first)).toFixed(2)}%">${mm.slice(0, 4)}</span>` : '').join('');
  return `<div class="cr-time"><button class="cr-play" data-tj-play aria-label="${tj.timer ? T('Pause', '暂停') : T('Play month by month', '逐月播放')}">${tj.timer ? '❚❚' : '▶'}</button>
    <div class="cr-track tj-track"><input type="range" class="tj-range" min="${first}" max="${M - 1}" value="${tj.m}" data-tj-month aria-label="${T('Month', '月份')}"><div class="cr-ticks">${ticks}</div></div>
    <div class="cr-time-side"><b data-tj-when>${tjMonth(tj.m)}</b></div></div>`;
}
const tjNote = () => T(`Dots: the ${P.trajectory.lines.length} candidate clusters (research lines found from paper content), coloured by galaxy, as large as their works in the last 12 months; growth above ×32 is drawn at the top. Right of the dashed line: the head, the largest lines that together hold half of all works; left: the long tail. Hover a line for its trail; click it for its latest works.`, `每个点是一条候选研究线（共 ${P.trajectory.lines.length} 条，按论文内容自动发现），颜色是所属星系，大小是近 12 个月的工作数；增长超过 32 倍的画在顶端。虚线右边是头部：合起来占全部工作一半的最大几条线；左边是长尾。把鼠标放在一条线上看它的轨迹，点击看它最新的工作。`);
function tjStageInner() { return `<div class="cr-figure" data-tj-fig>${tjSvg()}</div>${tjTimeline()}<p class="fd-note">${tjNote()}</p>`; }
function tjStage() {
  if (tj.m == null) tj.m = tjLast();
  return `<section class="cr-stage tj-stage" data-tj-stage><span class="fd-kicker">${T('THE HEAD AND THE TAIL', '全局视图 · 头部与长尾')}</span><h3>${T('Research lines month by month: size against growth', '研究线逐月变化：规模 × 增长')}</h3>
    <p class="fd-note cr-intro">${T('Press play to watch lines move: those crossing the dashed line enter the head. Each finding on the right sets the view to what it describes.', '按播放看研究线怎样移动：越过虚线的线进入头部。右边每条发现都会把这里切到它说的那种情况。')}</p>
    <div data-tj-inner>${tjStageInner()}</div></section>`;
}
function tjConfig(qid) {
  const T0 = P.trajectory, c = {m: tjLast(), hl: null, note: ''};
  if (!T0) return c;
  const notes = {growth: T('View: all lines now; press play to watch the field grow from 2023.', '视图：现在的全部研究线；按播放看领域从 2023 年起怎样长大。'),
    shift: T('View: the lines of the clusters gaining share are lit.', '视图：亮出份额上升的星团里的研究线。'),
    diversify: T('View: the head and the tail now; more lines in the head means a less concentrated field.', '视图：现在的头部与长尾；头部的线越多，领域越分散。'),
    path: T('View: all lines now.', '视图：现在的全部研究线。'),
    hturnover: T('View: the lines that entered the head in the last 12 months, with their trails.', '视图：近 12 个月新进入头部的研究线，带轨迹。'),
    hpace: T('View: the head as it stood a year ago, lit; compare its growth with the rest.', '视图：亮出一年前的头部；对照它和其他线的增长。'),
    onset: T('View: all lines; the timeline below shows when attacks, defences and benchmarks took shape per cluster.', '视图：全部研究线；下面的时间线是各星团攻击、防御、基准成形的时间。'),
    timeline: T('View: all lines now.', '视图：现在的全部研究线。'),
    shape: T('View: the cut between head and tail now.', '视图：现在头部与长尾的分界。'),
    backtest: T('View: last year\'s entrants into the head, with the path they took from the tail.', '视图：去年进入头部的研究线，以及它们从长尾走上来的路径。'),
    rising: T('View: tail lines growing fastest now.', '视图：现在长尾里增长最快的研究线。'),
    terms: T('View: all lines now; title terms are listed in the evidence.', '视图：现在的全部研究线；标题术语见证据。'),
    diffusion: T('View: all lines now.', '视图：现在的全部研究线。'),
    cold1: T('View: the lines that came from the cold into the head, with their paths.', '视图：从冷门进入头部的研究线及其路径。'),
    cold2: T('View: the same lines; few of them looked promising a year before.', '视图：同一批研究线；一年前它们大多看不出苗头。'),
    cold3: T('View: today\'s cold lines that reach the most clusters.', '视图：现在横跨星团最多的冷门线。'),
    cold4: T('View: all lines now; the gaps are in the table of the evidence.', '视图：现在的全部研究线；空白组合见证据中的表。'),
    radar: T('View: all lines now.', '视图：现在的全部研究线。'), open: T('View: all lines now.', '视图：现在的全部研究线。'), next: T('View: tail lines growing fastest now.', '视图：现在长尾里增长最快的研究线。')};
  const cfg = {cold1: {hl: T0.cold?.revived || null}, cold2: {hl: T0.cold?.revived || null}, cold3: {hl: (T0.cold?.watch || []).map(w => w.line)}, hturnover: {hl: T0.entered.slice(0, 12)}, backtest: {hl: T0.entered.slice(0, 12)}, hpace: {hl: T0.headYearAgo}, rising: {hl: T0.tailRising}, next: {hl: T0.tailRising},
    shift: {hl: (P.trajectory.shiftClusters || []).length ? T0.lines.map((l, k) => P.trajectory.shiftClusters.includes(l.cluster) ? k : -1).filter(k => k >= 0) : null}, growth: {m: T0.first}}[qid] || {};
  return {...c, ...cfg, note: notes[qid] || ''};
}
function tjRedraw(part) {
  const s = document.querySelector('[data-tj-inner]'); if (!s) return;
  if (part !== 'month') { s.innerHTML = tjStageInner(); return; }
  s.querySelector('[data-tj-fig]').innerHTML = tjSvg(); s.querySelector('[data-tj-when]').textContent = tjMonth(tj.m);
}
function tjStop() { if (tj.timer) { clearInterval(tj.timer); tj.timer = 0; } }
function tjPlay() {
  if (tj.timer) { tjStop(); tjRedraw(); return; }
  if (tj.m >= tjLast()) tj.m = P.trajectory.first;
  tj.timer = setInterval(() => { if (!document.querySelector('[data-tj-stage]')) return tjStop(); tj.m = Math.min(tjLast(), tj.m + 1); const r = document.querySelector('[data-tj-month]'); if (r) r.value = tj.m; tjRedraw('month'); if (tj.m >= tjLast()) { tjStop(); tjRedraw(); } }, 220);
  tjRedraw();
}
function tjActivate(qid) {
  if (tj.q === qid) return;
  const c = tjConfig(qid); tjStop();
  Object.assign(tj, {q: qid, m: c.m, hl: c.hl, focus: -1});
  for (const el of document.querySelectorAll('.cr-card[data-tj-card]')) el.classList.toggle('is-active', el.dataset.tjCard === qid);
  tjRedraw();
}
function tjDrawer(k) {
  const l = P.trajectory.lines[k];
  openDrawer(`${l.label}${l.cluster != null ? ' · ' + cl(l.cluster) : ''}`, `<p class="fd-note">${T(`${num(l.works)} works in this candidate cluster; the latest ${l.recent.length}:`, `这条候选研究线共 ${num(l.works)} 项工作；最新的 ${l.recent.length} 项：`)}</p>${paperRows(l.recent)}`);
}
function tjCards(qs) {
  const byq = Object.fromEntries(qs.map(q => [q[0], q])), used = new Set(), gs = LN_GROUPS().evolve;
  let n = 0;
  const card = id => { const [qid, q, a, body] = byq[id]; used.add(qid); n++;
    return `<article class="cr-card" id="q-${qid}" data-tj-card="${qid}"><button class="cr-card-head" data-tj-open="${qid}" aria-expanded="false"><span class="ln-qn">${String(n).padStart(2, '0')}</span><span class="cr-card-text"><b>${q}${impBadge(qid)}</b><em>${esc(a)}</em></span><i class="cx-chev" aria-hidden="true"></i></button>
      <p class="fd-note cr-config"><span>${tjConfig(qid).note}</span><button class="cr-show" data-tj-show="${qid}">${T('Show on the view ↑', '在全局视图上看 ↑')}</button></p><div class="cr-body" hidden>${body}</div></article>`; };
  const groups = gs.map(([key, name, sub, ids]) => { const got = ids.filter(id => byq[id]); return got.length ? `<section class="cr-group"><h3>${name}<small>${sub}</small></h3>${got.map(card).join('')}</section>` : ''; }).join('');
  const rest = qs.filter(q => !used.has(q[0]));
  return groups + (rest.length ? `<section class="cr-group"><h3>${T('More', '其他')}</h3>${rest.map(q => card(q[0])).join('')}</section>` : '');
}
const tjLens = qs => `<div class="cr-wrap">${tjStage()}<div class="cr-cards">${tjCards(qs)}</div></div>`;
let tjObserver = null;
function tjBind(root) {
  tjObserver?.disconnect(); tjObserver = null;
  const st = root.querySelector('[data-tj-stage]'); if (!st) return;
  st.addEventListener('mouseover', e => { const d = e.target.closest('[data-tj-line]'); const k = d ? +d.dataset.tjLine : -1; if (k !== tj.focus && !tj.timer) { tj.focus = k; tjRedraw('month'); } });
  st.addEventListener('mouseleave', () => { if (tj.focus >= 0) { tj.focus = -1; tjRedraw('month'); } });
  if ('IntersectionObserver' in window && matchMedia('(min-width: 1100px)').matches) {
    tjObserver = new IntersectionObserver(ens => { for (const en of ens) if (en.isIntersecting) tjActivate(en.target.dataset.tjCard); }, {rootMargin: '-40% 0px -55% 0px'});
    root.querySelectorAll('.cr-card[data-tj-card]').forEach(el => tjObserver.observe(el));
  }
}
const BT = {
  turnover() {
    const t = P.trajectory.turnover;
    return `<table class="fd-table"><thead><tr><th>${T('Year', '年份')}</th><th>${T('Lines in the head', '头部研究线')}</th><th>${T('Entered from the tail', '从长尾进入')}</th><th>${T('Left for the tail', '退回长尾')}</th></tr></thead><tbody>${t.map(r => `<tr><th>${r.year}${r.partial ? '*' : ''}</th><td>${r.head}</td><td>${r.entered} (${pctf(r.enteredShare, 0)})</td><td>${r.left}</td></tr>`).join('')}</tbody></table>
    <p class="fd-note">${T('Head at the end of each year against the head twelve months earlier (* to the latest month). The head is the smallest set of the largest candidate clusters holding half the works of the last 12 months.', '每年年底的头部与 12 个月前的头部对比（* 为截至最新月份）。头部是近 12 个月合起来占一半工作的最大几条候选研究线。')}</p>
    <h4>${T('Entered the head in the last 12 months', '近 12 个月进入头部的研究线')}</h4><ol class="fd-drawer-list">${P.trajectory.entered.slice(0, 12).map(k => `<li><button class="fd-link" data-tj-line="${k}">${esc(P.trajectory.lines[k].label)}</button><small>${P.trajectory.lines[k].cluster != null ? esc(cl(P.trajectory.lines[k].cluster)) : ''}</small></li>`).join('')}</ol>`;
  },
  pace() {
    const p = P.trajectory.pace;
    return lineChart(p.map(r => r.month.replace('-', '.')), [{label: T('Last year\'s head', '一年前的头部'), color: SERIES[0], values: p.map(r => 100 * (r.head - 1))}, {label: T('All other lines', '其余研究线'), color: SERIES[1], values: p.map(r => 100 * (r.tail - 1))}], {partialLast: false})
      + `<p class="fd-note">${T('Growth of works in the last 12 months against the 12 months before, in percent, for the lines that were in the head a year earlier and for all others (so promotion into the head does not flatter it).', '近 12 个月工作数相对前 12 个月的增长（%），分别对一年前在头部的研究线和其余全部研究线计算（这样进入头部的线不会把头部的增长抬高）。')}</p>`;
  },
};
// ------------------------------------------------------------------------------------------------ Players part: the power map (findings.players)
// Countries on a world map (bubble = works that year or in one cluster; colour = share of the year's most-cited tenth ÷
// share of works; arcs = works shared by two countries) and institutions on an output × influence plane (size =
// benchmarks others use, colour = sector). The findings scroll beside it and set it to what they describe.
const pl = {view: 'map', year: null, cluster: -1, hl: null, arc: null, q: '', timer: 0};
let plGeo = null, plGeoLoading = null;
function plLoadGeo() {
  if (plGeo || plGeoLoading) return plGeoLoading;
  plGeoLoading = fetch('./data/countries.json').then(r => r.json()).then(j => { plGeo = Object.fromEntries((j.countries || []).map(c => [c.cc, c])); plRedraw(); }).catch(() => {});
  return plGeoLoading;
}
const PL_SECTOR = () => ({academia: [T('Universities', '高校'), '#336aab'], industry: [T('Companies', '企业'), '#c26541'], public: [T('Public research', '公共研究机构'), '#5e8c2e'], other: [T('Other', '其他'), '#8a9a97']});
const plRatioColor = r => r == null ? '#8a9a97' : r >= 1.25 ? '#c26541' : r >= 1.05 ? '#d9946f' : r > 0.95 ? '#9aa8a5' : r > 0.75 ? '#7d9cc4' : '#336aab';
function plMapSvg() {
  const D = P.players, yi = D.years.indexOf(pl.year ?? D.years[D.years.length - 1]), byC = pl.cluster >= 0 ? D.byCluster[pl.cluster] : null;
  const land = plGeo ? Object.values(plGeo).map(c => `<path d="${c.d}" class="pl-land${pl.hl?.countries?.includes(c.cc) ? ' is-hl' : ''}" data-pl-cc="${c.cc}"/>`).join('') : `<text x="480" y="200" text-anchor="middle" class="fd-axis">${T('Loading the map…', '正在加载地图…')}</text>`;
  const val = cc => byC ? byC[cc] || 0 : D.countries[cc]?.works[yi] || 0, max = Math.max(...D.order.map(val), 1), maxR = byC ? 52 : 48;
  const hlc = pl.hl?.countries ? new Set(pl.hl.countries) : null;
  const bubbles = plGeo ? D.order.filter(cc => plGeo[cc] && val(cc) > 0).sort((a, b) => val(b) - val(a)).map(cc => {
    const c = D.countries[cc], g = plGeo[cc], v = val(cc), r = Math.max(3.5, maxR * Math.sqrt(v / max)), ratio = !byC && c.topShare[yi] != null && c.share[yi] ? c.topShare[yi] / c.share[yi] : null, on = hlc ? hlc.has(cc) : null;
    const tip = byC ? T(`${country(cc)}: ${pctf(v)} of ${cl(pl.cluster)} works since ${D.instSince}`, `${country(cc)}：${D.instSince} 年以来“${cl(pl.cluster)}”工作的 ${pctf(v)}`)
      : T(`${country(cc)} ${D.years[yi]}: ${num(Math.round(v))} works (${pctf(c.share[yi])} of located works); most-cited tenth ${pctf(c.topShare[yi])}${ratio ? ` (×${ratio.toFixed(2)})` : ''}`, `${country(cc)} ${D.years[yi]}：${num(Math.round(v))} 项工作（占已定位工作 ${pctf(c.share[yi])}）；被引前 10% 中占 ${pctf(c.topShare[yi])}${ratio ? `（${ratio.toFixed(2)} 倍）` : ''}`);
    return `<circle class="pl-bub${on === true ? ' is-hl' : on === false ? ' is-dim' : ''}" cx="${g.lx}" cy="${g.ly}" r="${r.toFixed(1)}" fill="${byC ? COLORS.attention : plRatioColor(ratio)}" data-pl-cc="${cc}" data-tip="${esc(tip)}"/>${r > 11 ? `<text x="${g.lx}" y="${g.ly + 4}" text-anchor="middle" class="pl-cc">${cc}</text>` : ''}`; }).join('') : '';
  const pairs = !byC && plGeo ? Object.entries(D.pairs[D.years[yi]] || {}).slice(0, 18) : [], pmax = Math.max(...pairs.map(p => p[1]), 1);
  const arcs = pairs.map(([k, n]) => { const [a, b] = k.split('|'), A = plGeo[a], B = plGeo[b]; if (!A || !B) return ''; const mx = (A.lx + B.lx) / 2, my = (A.ly + B.ly) / 2 - Math.hypot(B.lx - A.lx, B.ly - A.ly) * 0.28, on = pl.arc ? pl.arc === k : null;
    return `<path class="pl-arc${on === true ? ' is-hl' : on === false ? ' is-dim' : ''}" d="M${A.lx},${A.ly} Q${mx.toFixed(1)},${my.toFixed(1)} ${B.lx},${B.ly}" stroke-width="${(1.2 + 7 * n / pmax).toFixed(1)}" data-tip="${esc(T(`${country(a)} – ${country(b)} ${D.years[yi]}: ${n} works with institutions in both`, `${country(a)} – ${country(b)} ${D.years[yi]}：${n} 项两国机构合作的工作`))}"/>`; }).join('');
  return `<svg class="pl-map${hlc || pl.arc ? ' has-hl' : ''}" viewBox="0 40 960 340" role="img" aria-label="${T('Countries in agent safety', 'Agent 安全中的国家')}">${land}${arcs}${bubbles}</svg>`;
}
function plInstSvg() {
  const D = P.players, I = D.institutions, W = 640, H = 430, left = 46, right = 16, top = 30, bottom = 36, sec = PL_SECTOR(), narrow = matchMedia('(max-width: 640px)').matches;
  const xMax = Math.max(...I.map(r => r.works)), xMin = D.minWorks, yMax = Math.min(60, Math.ceil(Math.max(...I.map(r => r.topShare)) / 10) * 10);
  const x = v => left + (W - left - right) * Math.log(v / xMin) / Math.log(xMax / xMin), y = v => top + (H - top - bottom) * (1 - Math.min(v, yMax) / yMax), sMax = Math.max(...I.map(r => r.supply), 1);
  const hl = pl.hl?.inst ? new Set(pl.hl.inst) : null;
  const grid = [0, 10, 20, 30, 40, 50, 60].filter(v => v <= yMax).map(v => `<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" class="fd-grid"/><text x="${left - 6}" y="${y(v) + 4}" text-anchor="end" class="fd-axis">${v}%</text>`).join('')
    + [15, 30, 60, 120].filter(v => v <= xMax && v >= xMin).map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${H - bottom}" class="fd-grid"/><text x="${x(v)}" y="${H - bottom + 14}" text-anchor="middle" class="fd-axis">${v}</text>`).join('')
    + `<line x1="${left}" x2="${W - right}" y1="${y(D.fieldTopShare)}" y2="${y(D.fieldTopShare)}" class="pl-avg"/><text x="${W - right}" y="${y(D.fieldTopShare) - 5}" text-anchor="end" class="fd-axis">${T(`field ${pctf(D.fieldTopShare)}`, `全领域 ${pctf(D.fieldTopShare)}`)}</text>`;
  const order = [...I].sort((a, b) => b.supply - a.supply);
  const dots = order.map(r => { const on = hl ? hl.has(r.id) : null, rad = 3 + 13 * Math.sqrt(r.supply / sMax);
    return `<circle class="pl-inst${on === true ? ' is-hl' : on === false ? ' is-dim' : ''}" cx="${x(r.works).toFixed(1)}" cy="${y(r.topShare).toFixed(1)}" r="${rad.toFixed(1)}" fill="${sec[r.sector][1]}" data-pl-inst="${esc(r.id)}" data-tip="${esc(T(`${r.name} (${r.country ? country(r.country) : '—'}, ${sec[r.sector][0]}): ${num(Math.round(r.works))} works since ${D.instSince}, ${pctf(r.topShare)} among the most-cited tenth, benchmarks used ${num(Math.round(r.supply))} times by others; first work ${r.first}`, `${r.name}（${r.country ? country(r.country) : '—'}，${sec[r.sector][0]}）：${D.instSince} 年以来 ${num(Math.round(r.works))} 项工作，${pctf(r.topShare)} 进入被引前 10%，基准被他人使用 ${num(Math.round(r.supply))} 次；首项工作 ${r.first} 年`))}"/>`; }).join('');
  const want = hl ? I.filter(r => hl.has(r.id)) : [...I.slice(0, 5), ...[...I].sort((a, b) => b.topShare - a.topShare).slice(0, 4)];
  const short = s => s.replace(/^University of /, 'U. ').replace(/ University$/, ' U.').replace(/University of California, /, 'UC ').slice(0, 26);
  const placed = [], labels = want.map(r => { const nm = short(r.name), w = nm.length * (narrow ? 8 : 5.8), lx0 = Math.min(x(r.works) + 7, W - right - w), ly0 = y(r.topShare) - 7;
    if (placed.some(([a, b, c]) => Math.abs(b - ly0) < 13 && lx0 < a + c + 4 && a < lx0 + w + 4) || placed.length >= (narrow ? 4 : 9)) return '';
    placed.push([lx0, ly0, w]); return `<text x="${lx0.toFixed(1)}" y="${ly0.toFixed(1)}" class="tj-label">${esc(nm)}</text>`; }).join('');
  return `<svg class="pl-plane${hl ? ' has-hl' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${T('Institutions: output against influence', '机构：产出 × 影响')}">${grid}${dots}${labels}
    <text x="${W - right}" y="${H - 4}" text-anchor="end" class="fd-axis">${T(`works since ${D.instSince} (log) →`, `${D.instSince} 年以来工作数（对数）→`)}</text><text x="4" y="12" class="fd-axis">${T('↑ share of works among the year\'s most-cited tenth', '↑ 进入当年被引前 10% 的比例')}</text></svg>`;
}
function plControls() {
  const D = P.players, seg = (attr, items, cur) => `<span class="cx-seg">${items.map(([k, l]) => `<button data-${attr}="${k}" aria-pressed="${String(k) === String(cur)}">${l}</button>`).join('')}</span>`;
  const map = pl.view === 'map';
  return `<div class="cr-controls">${seg('pl-view', [['map', T('Countries', '国家地图')], ['inst', T('Institutions', '机构')]], pl.view)}${map ? `<label class="ps-role">${T('Cluster', '星团')} <select data-pl-cluster><option value="-1">${T('all works, by year', '全部工作，按年')}</option>${P.meta.clusters.map((_, k) => `<option value="${k}"${k === pl.cluster ? ' selected' : ''}>${esc(cl(k))}</option>`).join('')}</select></label>` : ''}</div>
    ${map && pl.cluster < 0 ? `<div class="cr-controls">${seg('pl-year', D.years.map(y => [y, String(y)]), pl.year)}<button class="cr-play" data-pl-play aria-label="${T('Play the years', '逐年播放')}">${pl.timer ? '❚❚' : '▶'}</button></div>` : ''}`;
}
function plLegend() {
  if (pl.view === 'inst') return `<div class="ps-legend">${Object.values(PL_SECTOR()).map(([l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}<span>${T('size: benchmarks used by others', '大小：基准被他人使用的次数')}</span></div>`;
  if (pl.cluster >= 0) return `<p class="fd-note">${T(`Bubble: the country's share of ${cl(pl.cluster)} works since ${P.players.instSince}.`, `气泡：该国在 ${P.players.instSince} 年以来“${cl(pl.cluster)}”工作中的份额。`)}</p>`;
  return `<div class="ps-legend">${[[1.3, T('cited above its share', '被引高于份额')], [1, T('about even', '大致相当')], [0.7, T('below', '低于份额')]].map(([r, l]) => `<span><i style="background:${plRatioColor(r)}"></i>${l}</span>`).join('')}<span>${T('size: works; arcs: works shared by two countries', '大小：工作数；弧线：两国机构合作的工作')}</span></div>`;
}
function plStageInner() { return `${plControls()}<div class="cr-figure" data-pl-fig>${pl.view === 'map' ? plMapSvg() : plInstSvg()}</div>${plLegend()}<p class="fd-note">${pl.view === 'map' ? T('Located works only; a work with institutions in several countries counts in part for each. The most-cited tenth is computed within each publication year; recent years are still collecting citations.', '只计已定位的工作；一项工作有多国机构时各计一部分。被引前 10% 在每个发表年份内计算；近年的论文引用仍在累积。') : T(`Institutions with at least ${P.players.minWorks} works since ${P.players.instSince} (fractional over a work's institutions). Hover for details.`, `${P.players.instSince} 年以来至少 ${P.players.minWorks} 项工作的机构（一项工作的多个机构各计一部分）。悬停查看详情。`)}</p>`; }
function plStage() {
  if (pl.year == null) pl.year = P.players.years[P.players.years.length - 1];
  return `<section class="cr-stage pl-stage" data-pl-stage><span class="fd-kicker">${T('THE POWER MAP', '全局视图 · 力量地图')}</span><h3>${T('Who does agent safety: countries and institutions', '谁在做 agent 安全：国家与机构')}</h3>
    <p class="fd-note cr-intro">${T('Countries on the map, institutions on an output × influence plane. Each finding on the right sets the view to what it describes.', '国家看地图，机构看“产出 × 影响”平面。右边每条发现都会把这里切到它说的那种情况。')}</p>
    <div data-pl-inner>${plStageInner()}</div></section>`;
}
function plConfig(qid) {
  const D = P.players, c = {view: 'map', year: D?.years[D.years.length - 1], cluster: -1, hl: null, arc: null, note: ''};
  if (!D) return c;
  const idx = n => P.meta.clusters.indexOf(n), I = D.institutions, last = D.years[D.years.length - 1];
  const notes = {shares: T('Map: works by country in the latest year; press play from 2020.', '地图：最近一年各国的工作数；按播放从 2020 年看起。'),
    rising: T('Map: the fastest-growing countries are lit.', '地图：亮出增长最快的国家。'), directions: T('Map: one cluster where the lead differs.', '地图：一个主导国家不同的星团。'),
    pioneers: T('Map: a cluster whose lead moved after its first works.', '地图：一个起步之后领先者换了的星团。'), geoconc: T('Map: the cluster most dependent on one country.', '地图：最依赖单一国家的星团。'),
    punch: T('Map: colour is citation share against output share.', '地图：颜色是被引份额与产出份额之比。'), apart: T('Map: the China–US arc against the other partners.', '地图：中美之间的弧线与其他合作伙伴对照。'),
    concentration: T('Institutions: the ten largest are lit.', '机构：亮出产出最多的十家。'), influence: T('Institutions: size is benchmark supply; the top suppliers are lit.', '机构：大小是基准供给；亮出供给最多的几家。'),
    industry: T('Institutions: companies are lit.', '机构：亮出企业。'), bigteams: T('Institutions: all, by output and influence.', '机构：全部，按产出与影响。'),
    newcomers: T(`Institutions: those whose first work is ${last - 1} or later are lit.`, `机构：亮出首项工作在 ${last - 1} 年或之后的机构。`), people: T('Institutions: all, by output and influence.', '机构：全部，按产出与影响。')};
  const grow = D.order.slice(0, 25).map(cc => [cc, (D.countries[cc].works.at(-2) + 1) / (D.countries[cc].works.at(-3) + 1)]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
  const cfg = {shares: {}, rising: {hl: {countries: grow}}, directions: {cluster: idx('Supply-chain security')}, pioneers: {cluster: idx('Memory and retrieval safety')},
    geoconc: {cluster: idx('Formal guarantees')}, punch: {year: last - 1}, apart: {arc: 'CN|US', hl: {countries: ['CN', 'US']}},
    concentration: {view: 'inst', hl: {inst: I.slice(0, 10).map(r => r.id)}}, influence: {view: 'inst', hl: {inst: [...I].sort((a, b) => b.supply - a.supply).slice(0, 8).map(r => r.id)}},
    industry: {view: 'inst', hl: {inst: I.filter(r => r.sector === 'industry').map(r => r.id)}}, bigteams: {view: 'inst'}, newcomers: {view: 'inst', hl: {inst: I.filter(r => r.first >= last - 1).map(r => r.id)}}, people: {view: 'inst'}}[qid] || {};
  return {...c, ...cfg, note: notes[qid] || ''};
}
function plRedraw() { const s = document.querySelector('[data-pl-inner]'); if (s) s.innerHTML = plStageInner(); }
function plStop() { if (pl.timer) { clearInterval(pl.timer); pl.timer = 0; } }
function plPlay() {
  if (pl.timer) { plStop(); plRedraw(); return; }
  const ys = P.players.years; let k = 0; pl.year = ys[0]; pl.cluster = -1; plRedraw();
  pl.timer = setInterval(() => { if (!document.querySelector('[data-pl-stage]')) return plStop(); k++; if (k >= ys.length) { plStop(); pl.year = ys.at(-1); } else pl.year = ys[k]; plRedraw(); }, 1100);
}
function plActivate(qid) {
  if (pl.q === qid) return;
  const c = plConfig(qid); plStop();
  Object.assign(pl, {q: qid, view: c.view, year: c.year, cluster: c.cluster, hl: c.hl, arc: c.arc});
  for (const el of document.querySelectorAll('.cr-card[data-pl-card]')) el.classList.toggle('is-active', el.dataset.plCard === qid);
  plRedraw();
}
function plCountryDrawer(cc) {
  const D = P.players, c = D.countries[cc]; if (!c) return;
  const partners = D.years.flatMap(y => Object.entries(D.pairs[y] || {}).filter(([k]) => k.split('|').includes(cc)).map(([k, n]) => [y, k.split('|').find(x => x !== cc), n]));
  const lastY = D.years.at(-1), top = partners.filter(p => p[0] === lastY).sort((a, b) => b[2] - a[2]).slice(0, 6);
  openDrawer(`${flag(cc)}${country(cc)}`, `<table class="fd-table"><thead><tr><th>${T('Year', '年份')}</th><th>${T('Works', '工作')}</th><th>${T('Share', '份额')}</th><th>${T('Most-cited tenth', '被引前 10%')}</th></tr></thead><tbody>${D.years.map((y, i) => `<tr><th>${y}</th><td>${num(Math.round(c.works[i]))}</td><td>${pctf(c.share[i])}</td><td>${pctf(c.topShare[i])}</td></tr>`).join('')}</tbody></table>
    ${top.length ? `<h5>${T(`Most frequent partners in ${lastY}`, `${lastY} 年最常合作的国家`)}</h5><ol class="fd-drawer-list">${top.map(([, o, n]) => `<li>${flag(o)}${esc(country(o))}<small>${n} ${T('works', '项')}</small></li>`).join('')}</ol>` : ''}`);
}
function plCards(qs) {
  const byq = Object.fromEntries(qs.map(q => [q[0], q])), used = new Set(), gs = LN_GROUPS().lead;
  let n = 0;
  const card = id => { const [qid, q, a, body] = byq[id]; used.add(qid); n++;
    return `<article class="cr-card" id="q-${qid}" data-pl-card="${qid}"><button class="cr-card-head" data-pl-open="${qid}" aria-expanded="false"><span class="ln-qn">${String(n).padStart(2, '0')}</span><span class="cr-card-text"><b>${q}${impBadge(qid)}</b><em>${esc(a)}</em></span><i class="cx-chev" aria-hidden="true"></i></button>
      <p class="fd-note cr-config"><span>${plConfig(qid).note}</span><button class="cr-show" data-pl-show="${qid}">${T('Show on the map ↑', '在力量地图上看 ↑')}</button></p><div class="cr-body" hidden>${body}</div></article>`; };
  const groups = gs.map(([key, name, sub, ids]) => { const got = ids.filter(id => byq[id]); return got.length ? `<section class="cr-group"><h3>${name}<small>${sub}</small></h3>${got.map(card).join('')}</section>` : ''; }).join('');
  const rest = qs.filter(q => !used.has(q[0]));
  return groups + (rest.length ? `<section class="cr-group"><h3>${T('More', '其他')}</h3>${rest.map(q => card(q[0])).join('')}</section>` : '');
}
const plLens = qs => `<div class="cr-wrap">${plStage()}<div class="cr-cards">${plCards(qs)}</div></div>`;
let plObserver = null;
function plBind(root) {
  plObserver?.disconnect(); plObserver = null;
  if (!root.querySelector('[data-pl-stage]')) return;
  plLoadGeo();
  root.querySelector('[data-pl-inner]').addEventListener('change', e => { if (e.target.matches('[data-pl-cluster]')) { plStop(); pl.cluster = +e.target.value; pl.hl = null; pl.arc = null; plRedraw(); } });
  if ('IntersectionObserver' in window && matchMedia('(min-width: 1100px)').matches) {
    plObserver = new IntersectionObserver(ens => { for (const en of ens) if (en.isIntersecting) plActivate(en.target.dataset.plCard); }, {rootMargin: '-40% 0px -55% 0px'});
    root.querySelectorAll('.cr-card[data-pl-card]').forEach(el => plObserver.observe(el));
  }
}
// ------------------------------------------------------------------------------------------------ Connection lens: the stage (findings.connect)
// One stage shows how research areas connect, month by month: a ring of areas (the 8 galaxies, or the 19 clusters inside
// their galaxy bands) with ribbons between them, or a topology of who builds on whom. The findings scroll beside it; each
// sets the stage to what it talks about and keeps its own chart (owner redesign, review step A3.2).
const CR_GROUPS = () => [
  ['read', T('Do research lines read each other?', '研究线之间读不读彼此'), T('knowledge flowing through citations', '知识通过引用流动'), ['layers', 'reading', 'notreading', 'bridges']],
  ['upstream', T('Who is upstream?', '谁在上游'), T('the direction of citations', '引用的方向'), ['buildson']],
  ['bench', T('Shared experimental resources: benchmarks', '共享的实验资源：基准'), T('who uses whose benchmarks, and for how long', '谁在用谁的基准，用多久'), ['hubs', 'supply', 'comparable', 'lifecycle', 'inflation']],
  ['people', T('Shared people and institutions', '共享的人与机构'), T('the same institutions on different lines', '同一批机构在做不同的研究线'), ['collab']]];
const CR_LAYERS = () => [['cite', T('Citations', '引用')], ['bench', T('Benchmark use', '共用基准')], ['collab', T('Institutions', '合作机构')], ['content', T('Content', '内容相近')]];
const cr = {view: 'ring', level: 'galaxy', layer: 'cite', m: null, win: 12, q: '', hl: null, focus: -1, timer: 0};
const crFlow = () => cr.layer === 'cite' || cr.layer === 'bench';
const crMonths = () => P.connect.months;
const crName = k => cr.level === 'galaxy' ? galaxy(k) : cl(k);
let crPre = {}, crSeriesCache = {};
function crPrefix(layer) {  // running sums per month of the cluster x cluster flows, so any window is one subtraction
  if (crPre[layer]) return crPre[layer];
  const C = P.connect, K = C.works.length, M = C.months.length, KK = K * K, pre = new Float64Array((M + 1) * KK);
  for (let m = 0; m < M; m++) {
    pre.copyWithin((m + 1) * KK, m * KK, (m + 1) * KK);
    const row = C[layer][m];
    for (let i = 0; i < row.length; i += 3) pre[(m + 1) * KK + row[i] * K + row[i + 1]] += row[i + 2];
  }
  return (crPre[layer] = pre);
}
const crWindow = () => { const hi = cr.m + 1; return [cr.win === 'all' ? 0 : Math.max(0, hi - cr.win), hi]; };
function crFlowMatrix(layer) {  // the window's flows at the current level (rows send: cite, or use a benchmark of the column)
  const C = P.connect, K = C.works.length, KK = K * K, pre = crPrefix(layer), [lo, hi] = crWindow();
  const Mc = Array.from({length: K}, (_, a) => Array.from({length: K}, (_, b) => pre[hi * KK + a * K + b] - pre[lo * KK + a * K + b]));
  if (cr.level === 'cluster') return Mc;
  const G = P.meta.galaxies.length, g = C.clusterGalaxy, Mg = Array.from({length: G}, () => Array(G).fill(0));
  Mc.forEach((row, a) => row.forEach((v, b) => { Mg[g[a]][g[b]] += v; }));
  return Mg;
}
function crMatrix() {
  const C = P.connect;
  if (crFlow()) return crFlowMatrix(cr.layer);
  if (cr.layer === 'collab') return C[cr.level].collabCum[Math.min(C.years.length - 1, Math.max(0, +crMonths()[cr.m].slice(0, 4) - C.years[0]))];
  return C[cr.level].content;
}
function crUnits() {
  const C = P.connect;
  if (cr.level === 'galaxy') return P.meta.galaxies.map((g, k) => ({k, label: galaxy(k), color: g.color, g: k,
    works: C.works.reduce((s, w, c) => s + (C.clusterGalaxy[c] === k ? w : 0), 0)}));
  return C.works.map((_, k) => k).sort((a, b) => C.clusterGalaxy[a] - C.clusterGalaxy[b] || C.works[b] - C.works[a])
    .map(k => ({k, label: cl(k), color: clusterColor(k), g: C.clusterGalaxy[k], works: C.works[k]}));
}
function crSeries() {  // per month: connections between different areas at the current level (citations, or benchmark uses)
  const layer = cr.layer === 'bench' ? 'bench' : 'cite', key = layer + cr.level;
  if (crSeriesCache[key]) return crSeriesCache[key];
  const g = P.connect.clusterGalaxy, gal = cr.level === 'galaxy';
  return (crSeriesCache[key] = P.connect[layer].map(row => { let s = 0; for (let i = 0; i < row.length; i += 3) if (gal ? g[row[i]] !== g[row[i + 1]] : row[i] !== row[i + 1]) s += row[i + 2]; return s; }));
}
const crHlPairs = () => cr.level === 'cluster' && cr.hl?.pairs ? cr.hl.pairs : [];
const crHlUnits = () => cr.level !== 'cluster' || !cr.hl ? [] : cr.hl.units || crHlPairs().flat();
const crIsHl = (a, b) => crHlPairs().some(([x, y]) => (x === a && y === b) || (x === b && y === a)) || (cr.hl?.units && cr.level === 'cluster' && (cr.hl.units.includes(a) || cr.hl.units.includes(b)));
const crFmt = v => v >= 100 ? num(Math.round(v)) : v >= 10 ? v.toFixed(0) : v.toFixed(1);
const crShort = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const crPt = (a, r) => [r * Math.sin(a), -r * Math.cos(a)];
const crP = (a, r) => crPt(a, r).map(v => v.toFixed(1)).join(',');
const crArc = (a0, a1, r0, r1) => { const lg = a1 - a0 > Math.PI ? 1 : 0;
  return `M${crP(a0, r1)}A${r1},${r1} 0 ${lg} 1 ${crP(a1, r1)}L${crP(a1, r0)}A${r0},${r0} 0 ${lg} 0 ${crP(a0, r0)}Z`; };
const crRibbon = (s0, s1, t0, t1, r) => `M${crP(s0, r)}A${r},${r} 0 0 1 ${crP(s1, r)}Q0,0 ${crP(t0, r)}A${r},${r} 0 0 1 ${crP(t1, r)}Q0,0 ${crP(s0, r)}Z`;
function crLayout() {
  // flow layers: an area's arc is what it sends to the other areas in the window; a ribbon's end at an area is as wide as
  // what that area sends to the other (d3-chord style), so an uneven ribbon shows the direction. Similarity layers: arcs
  // by number of works, ribbons for the closest pairs. Connections inside an area are left out.
  const units = crUnits(), M = crMatrix(), K = units.length, flow = crFlow(), at = (a, b) => M[a]?.[b] || 0, pos = new Map(units.map((u, i) => [u.k, i]));
  let pairs = [];
  for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) {
    const a = units[i].k, b = units[j].k, ab = at(a, b), ba = flow ? at(b, a) : ab;
    if (ab + ba > 0) pairs.push({a, b, ab, ba});
  }
  if (!flow) { const top = new Set([...pairs].sort((x, y) => y.ab - x.ab).slice(0, cr.level === 'galaxy' ? 10 : 24)); pairs = pairs.filter(p => top.has(p) || crIsHl(p.a, p.b)); }
  const w = units.map(u => flow ? units.reduce((s, v) => s + (v.k === u.k ? 0 : at(u.k, v.k)), 0) : u.works), total = w.reduce((s, x) => s + x, 0);
  const gaps = units.map((u, i) => cr.level === 'galaxy' ? 0.035 : i === 0 || units[i - 1].g !== u.g ? 0.05 : 0.012), minA = 0.02;
  const span = 2 * Math.PI - gaps.reduce((s, x) => s + x, 0), scale = total ? (span - minA * K) / total : 0;
  let a = 0;
  const arcs = units.map((u, i) => { a += gaps[i]; const a0 = a; a += total ? minA + w[i] * scale : span / K; return {...u, a0, a1: a, w: w[i]}; });
  const ends = {}, vmax = Math.max(...pairs.map(p => p.ab), 1e-9);
  for (const x of arcs) {
    const mine = pairs.filter(p => p.a === x.k || p.b === x.k).map(p => ({other: p.a === x.k ? p.b : p.a, out: p.a === x.k ? p.ab : p.ba}))
      .sort((s, t) => ((pos.get(t.other) - pos.get(x.k) + K) % K) - ((pos.get(s.other) - pos.get(x.k) + K) % K));  // no crossings near the arc
    const pad = Math.min(0.004, (x.a1 - x.a0) / 6), inner = x.a1 - x.a0 - 2 * pad, sum = mine.reduce((s, e) => s + e.out, 0);
    let c = x.a0 + pad;
    mine.forEach(e => {
      if (flow) { const len = sum ? inner * e.out / sum : 0; ends[`${x.k}>${e.other}`] = [c, c + len]; c += len; return; }
      const slot = inner / mine.length, wd = slot * (0.3 + 0.6 * e.out / vmax);
      ends[`${x.k}>${e.other}`] = [c + (slot - wd) / 2, c + (slot + wd) / 2]; c += slot;
    });
  }
  return {arcs, pairs, ends, flow, total};
}
function crRingSvg() {
  const {arcs, pairs, ends, flow, total} = crLayout(), big = cr.level === 'galaxy', R0 = 186, RW = 14, narrow = matchMedia('(max-width: 640px)').matches;
  const hasHl = !!(cr.hl && cr.level === 'cluster'), hlU = new Set(crHlUnits()), what = cr.layer === 'cite' ? T('citations', '次引用') : T('benchmark uses', '次基准使用');
  const cut = flow ? 0.002 * pairs.reduce((s, p) => s + p.ab + p.ba, 0) : 0;
  const ribbon = p => {
    const s = ends[`${p.a}>${p.b}`], t = ends[`${p.b}>${p.a}`], hl = hasHl && crIsHl(p.a, p.b);
    if (!s || !t || (flow && p.ab + p.ba < cut && !hl)) return '';
    const lead = !flow || p.ab >= p.ba ? p.a : p.b, col = big ? P.meta.galaxies[lead].color : clusterColor(lead);
    const tip = flow ? T(`${crName(p.a)} → ${crName(p.b)}: ${crFmt(p.ab)} ${what}; ${crName(p.b)} → ${crName(p.a)}: ${crFmt(p.ba)}`, `${crName(p.a)} → ${crName(p.b)}：${crFmt(p.ab)} ${what}；${crName(p.b)} → ${crName(p.a)}：${crFmt(p.ba)} ${what}`)
      : T(`${crName(p.a)} · ${crName(p.b)}: ${cr.layer === 'collab' ? 'institution similarity' : 'content closeness'} ${p.ab.toFixed(2)}`, `${crName(p.a)} · ${crName(p.b)}：${cr.layer === 'collab' ? '机构相似度' : '内容相近度'} ${p.ab.toFixed(2)}`);
    return `<path class="cr-rib${hl ? ' is-hl' : ''}" d="${crRibbon(s[0], s[1], t[0], t[1], R0 - 2)}" fill="${col}" data-cr-a="${p.a}" data-cr-b="${p.b}"${cr.layer === 'content' ? '' : ` data-cr-pair="${p.a}|${p.b}"`} data-tip="${esc(tip)}"/>`;
  };
  const bands = big ? '' : P.meta.galaxies.map((g, gi) => { const ins = arcs.filter(x => x.g === gi); return ins.length ? `<path class="cr-gal" d="${crArc(ins[0].a0, ins[ins.length - 1].a1, R0 + RW + 3, R0 + RW + 8)}" fill="${g.color}" data-tip="${esc(galaxy(gi))}"/>` : ''; }).join('');
  const arcEls = arcs.map(x => `<path class="cr-arc${hlU.has(x.k) ? ' is-hl' : ''}" d="${crArc(x.a0, x.a1, R0, R0 + RW)}" fill="${x.color}" data-cr-unit="${x.k}" data-tip="${esc(flow ? T(`${x.label}: ${crFmt(x.w)} ${what} to the other areas in this window`, `${x.label}：本时间窗内对其他领域 ${crFmt(x.w)} ${what}`) : T(`${x.label}: ${num(x.works)} works`, `${x.label}：${num(x.works)} 项工作`))}"/>`).join('');
  // labels: horizontal, the left and right halves each pushed apart vertically where small arcs crowd them, with a
  // leader line from the arc; galaxies may take two lines
  const maxChars = T(narrow ? 12 : 21, narrow ? 6 : 10), rl = R0 + RW + (big ? 14 : 18), fs = narrow ? 20 : big ? 13 : 12;
  const lines = s => { if (s.length <= maxChars) return [s]; const sp = [...s.matchAll(/ /g)].map(m => m.index).sort((a, b) => Math.abs(a - s.length / 2) - Math.abs(b - s.length / 2));
    return sp.length ? [crShort(s.slice(0, sp[0]), maxChars), crShort(s.slice(sp[0] + 1), maxChars)] : [crShort(s, maxChars)]; };
  const lab = arcs.map(x => { const mid = (x.a0 + x.a1) / 2, [, yy] = crPt(mid, rl), ls = lines(x.label); return {x, mid, y: yy, side: Math.sin(mid) >= 0 ? 1 : -1, ls, h: fs * 1.2 * ls.length + 2}; });
  for (const side of [1, -1]) {
    const L = lab.filter(l => l.side === side).sort((p, q) => p.y - q.y);
    for (let i = 1; i < L.length; i++) L[i].y = Math.max(L[i].y, L[i - 1].y + (L[i - 1].h + L[i].h) / 2);
    const over = L.length ? L[L.length - 1].y + L[L.length - 1].h / 2 - 254 : 0;
    if (over > 0) { L[L.length - 1].y -= over; for (let i = L.length - 2; i >= 0; i--) L[i].y = Math.min(L[i].y, L[i + 1].y - (L[i].h + L[i + 1].h) / 2); }
  }
  const labels = lab.map(l => { const [ax, ay] = crPt(l.mid, R0 + RW + 2), lx = l.side * Math.max(Math.sqrt(Math.max(0, rl * rl - l.y * l.y)), 26) ;
    const lead = `<path class="cr-lead" d="M${ax.toFixed(1)},${ay.toFixed(1)}L${(lx - l.side * 3).toFixed(1)},${l.y.toFixed(1)}"/>`;
    const body = l.ls.length === 1 ? esc(l.ls[0]) : `<tspan x="${(lx + l.side * 2).toFixed(1)}" dy="-0.25em">${esc(l.ls[0])}</tspan><tspan x="${(lx + l.side * 2).toFixed(1)}" dy="1.2em">${esc(l.ls[1])}</tspan>`;
    return `${lead}<text class="cr-label${big ? ' is-big' : ''}${hlU.has(l.x.k) ? ' is-hl' : ''}" x="${(lx + l.side * 2).toFixed(1)}" y="${l.y.toFixed(1)}" text-anchor="${l.side > 0 ? 'start' : 'end'}"${l.ls.length === 1 ? ' dy="0.35em"' : ''} data-cr-unit="${l.x.k}" data-tip="${esc(l.x.label)}">${body}</text>`; }).join('');
  const empty = flow && !total ? `<text class="cr-empty" text-anchor="middle" dy="0.35em">${T('No connections between areas in this window yet', '这个时间窗内，领域之间还没有连接')}</text>` : '';
  const shown = [...pairs].sort((x, y) => (x.ab + x.ba) - (y.ab + y.ba));
  return `<svg class="cr-ring${hasHl ? ' has-hl' : ''}${cr.focus >= 0 ? ' has-focus' : ''}" viewBox="-365 -258 730 516" role="img" aria-label="${T('Connections between research areas', '研究领域之间的连接')}">${shown.map(ribbon).join('')}${arcEls}${bands}${labels}${empty}</svg>`;
}
function crTopoSvg() {
  // areas in rows from foundations (the others cite them more than they cite the others) at the top to builders at the
  // bottom, with the upstream score as a bar; arcs on the right join a builder to what it builds on, as thick as the
  // difference between the two directions in the window (an arc diagram, so no label ever sits on another)
  const units = crUnits(), M = crFlowMatrix(cr.layer === 'bench' ? 'bench' : 'cite'), at = (a, b) => M[a]?.[b] || 0, ks = units.map(u => u.k);
  const inn = {}, out = {};
  for (const a of ks) { inn[a] = 0; out[a] = 0; }
  for (const a of ks) for (const b of ks) if (a !== b) { out[a] += at(a, b); inn[b] += at(a, b); }
  const score = Object.fromEntries(ks.map(k => [k, inn[k] + out[k] ? (inn[k] - out[k]) / (inn[k] + out[k]) : 0]));
  const net = [];
  for (const a of ks) for (const b of ks) if (a < b) { const d = at(a, b) - at(b, a); if (Math.abs(d) > 1e-9) net.push(d > 0 ? {from: a, to: b, v: d} : {from: b, to: a, v: -d}); }
  const big = cr.level === 'galaxy', bench = cr.layer === 'bench', narrow = matchMedia('(max-width: 640px)').matches, isHl = e => cr.level === 'cluster' && !!cr.hl && crIsHl(e.from, e.to);
  const edges = net.sort((x, y) => y.v - x.v).filter((e, i) => i < (big ? 12 : 22) || (cr.hl?.pairs && isHl(e))), vmax = edges[0]?.v || 1;
  // phones get a narrower drawing at the same text size: shorter bars, no value column, arcs squeezed sideways
  const order = [...ks].sort((a, b) => score[b] - score[a]), rowH = big ? 48 : 27, top = 44, W = narrow ? 360 : 640, H = top + rowH * order.length + 30;
  const yy = Object.fromEntries(order.map((k, i) => [k, top + rowH * (i + 0.5)])), xl = narrow ? 150 : 214, xb = narrow ? 178 : 262, bw = narrow ? 20 : 40, xv = xb + bw + 6, xn = narrow ? 214 : 352, rxF = narrow ? 0.5 : 1;
  const smax = Math.max(0.1, ...ks.map(k => Math.abs(score[k]))), wmax = Math.max(...units.map(u => u.works));
  const U = Object.fromEntries(units.map(u => [u.k, u])), maxChars = T(narrow ? 17 : 30, narrow ? 9 : 12);
  const nodeTip = k => bench ? T(`${U[k].label}: its benchmarks used ${crFmt(inn[k])} times by the other areas; uses theirs ${crFmt(out[k])} times`, `${U[k].label}：基准被其他领域使用 ${crFmt(inn[k])} 次，使用其他领域的基准 ${crFmt(out[k])} 次`)
    : T(`${U[k].label}: cited ${crFmt(inn[k])} times by the other areas, cites them ${crFmt(out[k])} times`, `${U[k].label}：被其他领域引用 ${crFmt(inn[k])} 次，引用其他领域 ${crFmt(out[k])} 次`);
  const hlU = crHlUnits();
  const row = k => { const y = yy[k], s = score[k], w = bw * Math.abs(s) / smax, r = (big ? 5 : 3.5) + 4 * Math.sqrt(U[k].works / wmax);
    return `<g class="tp-node${hlU.includes(k) ? ' is-hl' : ''}" data-cr-unit="${k}" data-tip="${esc(nodeTip(k))}"><rect class="tp-hit" x="0" y="${(y - rowH / 2).toFixed(1)}" width="${xn + 10}" height="${rowH}"/>
      <text x="${xl}" y="${y.toFixed(1)}" dy="0.35em" text-anchor="end">${esc(crShort(U[k].label, maxChars))}</text>
      <rect x="${(s >= 0 ? xb : xb - w).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="${Math.max(1, w).toFixed(1)}" height="8" rx="2" fill="${U[k].color}"/>
      ${narrow ? '' : `<text class="tp-val" x="${xv}" y="${y.toFixed(1)}" dy="0.35em">${Math.abs(s) < 0.005 ? '0.00' : (s > 0 ? '+' : '−') + Math.abs(s).toFixed(2)}</text>`}
      <circle cx="${xn}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${U[k].color}"/></g>`; };
  const x0 = xn + 9;
  const edge = e => { const y1 = yy[e.from], y2 = yy[e.to], r = Math.abs(y2 - y1) / 2, f = crFmt(at(e.from, e.to)), b = crFmt(at(e.to, e.from));
    const tip = bench ? T(`${U[e.from].label} uses benchmarks of ${U[e.to].label} ${f} times; the reverse ${b}`, `${U[e.from].label} 使用 ${U[e.to].label} 的基准 ${f} 次，反向 ${b} 次`)
      : T(`${U[e.from].label} builds on ${U[e.to].label}: ${f} citations, ${b} back`, `${U[e.from].label} 建立在 ${U[e.to].label} 之上：引用 ${f} 次，反向 ${b} 次`);
    return `<path class="tp-edge${isHl(e) ? ' is-hl' : ''}" data-cr-a="${e.from}" data-cr-b="${e.to}" data-cr-pair="${e.from}|${e.to}" d="M${x0},${y1.toFixed(1)}A${(r * rxF).toFixed(1)},${r.toFixed(1)} 0 0 ${y2 > y1 ? 1 : 0} ${x0},${y2.toFixed(1)}" stroke="${U[e.from].color}" stroke-width="${(1.2 + 5 * e.v / vmax).toFixed(1)}" marker-end="url(#tp-arrow)" data-tip="${esc(tip)}"/>`; };
  const W2 = Math.max(W, x0 + rxF * Math.max(0, ...edges.map(e => Math.abs(yy[e.to] - yy[e.from]) / 2)) + 12);
  return `<svg class="tp-map${cr.hl && cr.level === 'cluster' ? ' has-hl' : ''}" viewBox="0 0 ${W2.toFixed(0)} ${H}" role="img" aria-label="${T('Who builds on whom', '谁建立在谁之上')}">
    <defs><marker id="tp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0L10,5L0,10z" class="tp-arrowhead"/></marker></defs>
    <text x="${xl}" y="16" text-anchor="end" class="fd-axis tp-axis">↑ ${bench ? T('suppliers', '供给方') : T('foundations', '基础')}</text><text x="${xl}" y="${H - 8}" text-anchor="end" class="fd-axis tp-axis">↓ ${bench ? T('users', '使用方') : T('builders', '上层')}</text>
    ${narrow ? '' : `<text x="${xb}" y="16" text-anchor="middle" class="fd-axis tp-axis">${T('upstream score', '上游分')}</text><text x="${xb}" y="30" text-anchor="middle" class="fd-axis">${bench ? T('(used − using) ÷ both', '（被用 − 用别人）÷ 两者') : T('(cited − citing) ÷ both', '（被引 − 引出）÷ 两者')}</text>`}
    <text x="${x0 + 4}" y="16" class="fd-axis tp-axis">${narrow ? T(`${edges.length} pairs →`, `${edges.length} 对 →`) : T(`the ${edges.length} most one-sided pairs →`, `最不对称的 ${edges.length} 对 →`)}</text>
    <line x1="${xb}" x2="${xb}" y1="${top - 4}" y2="${H - 26}" class="tp-zero"/>
    ${order.map(row).join('')}${edges.map(edge).join('')}</svg>`;
}
function crTopoTable() {
  const units = crUnits(), M = crFlowMatrix(cr.layer === 'bench' ? 'bench' : 'cite'), at = (a, b) => M[a]?.[b] || 0, ks = units.map(u => u.k);
  const rows = units.map(u => { let i = 0, o = 0; for (const b of ks) if (b !== u.k) { i += at(b, u.k); o += at(u.k, b); }
    const on = ks.filter(b => b !== u.k && at(u.k, b) > at(b, u.k)).sort((a, b) => (at(u.k, b) - at(b, u.k)) - (at(u.k, a) - at(a, u.k))).slice(0, 2);
    return {u, i, o, s: i + o ? (i - o) / (i + o) : 0, on}; }).sort((a, b) => b.s - a.s);
  return `<details class="cr-table"><summary>${T('As a table', '以表格查看')}</summary><table class="fd-table"><thead><tr><th>${T('Area', '领域')}</th><th>${T('Received', '被引 / 被用')}</th><th>${T('Sent', '引出 / 使用')}</th><th>${T('Score', '上游分')}</th><th>${T('Builds most on', '最依赖')}</th></tr></thead><tbody>
    ${rows.map(r => `<tr><th>${esc(r.u.label)}</th><td>${crFmt(r.i)}</td><td>${crFmt(r.o)}</td><td>${r.s >= 0 ? '+' : ''}${r.s.toFixed(2)}</td><td>${r.on.map(crName).map(esc).join('、') || '—'}</td></tr>`).join('')}</tbody></table></details>`;
}
function crSpark() {
  const s = crSeries(), M = s.length, mx = Math.max(...s.slice(1), 1), [lo, hi] = crWindow(), off = cr.layer === 'content';
  return `<svg class="cr-spark" viewBox="0 0 ${M} 40" preserveAspectRatio="none" aria-hidden="true">${s.map((v, m) => { const h = 38 * Math.min(1, v / mx); return h ? `<rect x="${m + 0.1}" y="${(40 - h).toFixed(2)}" width="0.8" height="${h.toFixed(2)}" class="${!off && m >= lo && m < hi ? 'is-in' : ''}"/>` : ''; }).join('')}</svg>`;
}
function crWhen() {
  if (cr.layer === 'content') return T('content does not change over time', '内容相近度不随时间变化');
  if (cr.layer === 'collab') return T(`institutions up to ${crMonths()[cr.m].slice(0, 4)}`, `截至 ${crMonths()[cr.m].slice(0, 4)} 年的机构`);
  const [lo, hi] = crWindow(), lab = m => m === 0 ? `≤${crMonths()[0]}` : crMonths()[m];
  return cr.win === 'all' ? T(`up to ${lab(hi - 1)}`, `截至 ${lab(hi - 1)}`) : `${lab(lo)} – ${lab(hi - 1)}`;
}
function crTimeline() {
  const C = P.connect, M = C.months.length, off = cr.layer === 'content';
  const ticks = C.years.filter((y, i) => i % 2 === 0 || i === C.years.length - 1).map(y => { const m = (y - C.years[0]) * 12; return `<span style="left:${(100 * m / M).toFixed(2)}%">${y}</span>`; }).join('');
  const seg = cr.layer === 'cite' || cr.layer === 'bench' ? `<span class="cx-seg">${[[12, T('12 months', '近 12 个月')], ['all', T('All up to then', '累计')]].map(([k, l]) => `<button data-cr-win="${k}" aria-pressed="${String(cr.win) === String(k)}">${l}</button>`).join('')}</span>` : '';
  return `<div class="cr-time${off ? ' is-off' : ''}"><button class="cr-play" data-cr-play aria-label="${cr.timer ? T('Pause', '暂停') : T('Play month by month', '逐月播放')}"${off ? ' disabled' : ''}>${cr.timer ? '❚❚' : '▶'}</button>
    <div class="cr-track"><div data-cr-spark>${crSpark()}</div><input type="range" class="cr-range" min="0" max="${M - 1}" value="${cr.m}" data-cr-month aria-label="${T('Month', '月份')}"${off ? ' disabled' : ''}><div class="cr-ticks">${ticks}</div></div>
    <div class="cr-time-side"><b data-cr-when>${crWhen()}</b>${seg}</div></div>
    <p class="fd-note cr-spark-note">${T(`Bars: ${cr.layer === 'bench' ? 'benchmark uses' : 'citations'} between different ${cr.level === 'galaxy' ? 'galaxies' : 'clusters'} each month (by the month of the citing work). The ring is always a full circle: it shows how the connections are shared, the bars show how many there are.`, `柱：每月不同${cr.level === 'galaxy' ? '星系' : '星团'}之间的${cr.layer === 'bench' ? '基准使用' : '引用'}（按施引工作的月份）。环总是画满一圈，看的是连接怎样分布；连接有多少，看柱。`)}</p>`;
}
function crNote() {
  if (cr.view === 'topo') return T('Rows: areas from foundations (top) to builders (bottom) by the upstream score in the window. Arcs: the most one-sided pairs, with the arrow at the area that is built on; thickness is the difference between the two directions. Hover an area to see only its arcs.', '每行一个领域，按时间窗内的上游分从“基础”（上）排到“上层”（下）。弧线：最不对称的几对，箭头指向被依赖的一方，粗细是两个方向的差额。把鼠标放在一个领域上，只看它的弧线。');
  return cr.layer === 'cite' ? T('Ribbons: citations between two areas in the window. Each end is as wide as what that area cites in the other, so an uneven ribbon shows who builds on whom; colour: the area that cites more. Citations inside an area are left out.', '彩带：时间窗内两个领域之间的引用。彩带一端的宽度是这一端引用另一端的次数，两端不一样宽，就看得出谁建立在谁之上；颜色取引用更多的一方。领域内部的引用不画。')
    : cr.layer === 'bench' ? T('Ribbons: works of one area using benchmarks of the other. Each end is as wide as that area\'s uses of the other\'s benchmarks.', '彩带：一个领域的工作使用另一个领域的基准。每一端的宽度是这一端使用对方基准的次数。')
    : cr.layer === 'collab' ? T('Ribbons: the pairs of areas whose institution profiles are most alike up to the year shown (wider is more alike). Arcs: number of works. Click a ribbon for the institutions on both.', '彩带：截至所示年份，机构分布最相似的几对领域（越宽越相似）。弧长：工作数。点击彩带看两边都在做的机构。')
    : T('Ribbons: the pairs of areas closest in content (wider is closer). Arcs: number of works.', '彩带：内容最相近的几对领域（越宽越近）。弧长：工作数。');
}
function crStageInner() {
  const seg = (attr, items, cur, off = []) => `<span class="cx-seg">${items.map(([k, l]) => `<button data-${attr}="${k}" aria-pressed="${k === cur}"${off.includes(k) ? ' disabled' : ''}>${l}</button>`).join('')}</span>`;
  const topo = cr.view === 'topo';
  return `<div class="cr-controls">${seg('cr-view', [['ring', T('Connection ring', '连接环')], ['topo', T('Upstream map', '上下游')]], cr.view)}${seg('cr-level', [['galaxy', T('Galaxies', '星系')], ['cluster', T('Clusters', '星团')]], cr.level)}${seg('cr-layer', CR_LAYERS(), cr.layer, topo ? ['collab', 'content'] : [])}</div>
    <div class="cr-figure" data-cr-fig>${topo ? crTopoSvg() : crRingSvg()}</div><p class="fd-note cr-note">${crNote()}</p>${crTimeline()}${topo ? crTopoTable() : ''}`;
}
function crStage() {
  if (cr.m == null) cr.m = crMonths().length - 1;
  return `<section class="cr-stage" data-cr-stage><span class="fd-kicker">${T('THE STAGE', '全局视图')}</span><h3>${T('How research areas connect, month by month', '研究领域之间怎样连接，逐月变化')}</h3>
    <p class="fd-note cr-intro">${T('Ring: the 8 galaxies, or the 19 clusters inside their galaxy bands. Hover an area to see only its connections; click a ribbon for the works behind it. Upstream map: who builds on whom. Each finding sets the stage to what it describes.', '连接环：8 个星系，或者分在各星系色带里的 19 个星团。把鼠标放在一个领域上，只看它的连接；点击彩带，看背后的论文。上下游：谁建立在谁之上。每条发现都会把这里切换到它说的那种情况。')}</p>
    <div data-cr-inner>${crStageInner()}</div></section>`;
}
function crConfig(qid) {
  const idx = name => P.meta.clusters.indexOf(name), c = {view: 'ring', level: 'cluster', layer: 'cite', win: 12, hl: null, note: ''};
  if (qid === 'layers') return {...c, level: 'galaxy', note: T('Stage: citations between galaxies in the last 12 months. Switch the layer to compare benchmarks, institutions and content.', '全局视图：近 12 个月星系之间的引用。切换上方的层，比较基准、机构和内容。')};
  if (qid === 'reading') return {...c, level: 'galaxy', note: T('Stage: citations between galaxies, 12 months at a time. Press play: the ribbons between galaxies grow as lines read each other more.', '全局视图：星系之间的引用，每次看 12 个月。按播放：随时间推移，星系之间的彩带越来越粗，研究线越读越多。')};
  if (qid === 'notreading') return {...c, win: 'all', hl: {pairs: (P.rq2.h2a || []).map(([a, b]) => [a, b])}, note: T('Stage: all citations up to now; the highlighted pairs are close in content but cite each other far less than expected.', '全局视图：截至目前的全部引用；亮出的几对星团内容相近，互相引用却远少于期望。')};
  if (qid === 'bridges') return {...c, layer: 'content', hl: {pairs: (P.tail?.bridges || []).slice(0, 4).map(b => [idx(b.a.cluster), idx(b.b.cluster)]).filter(([a, b]) => a >= 0 && b >= 0 && a !== b)}, note: T('Stage: the pairs closest in content; the highlighted clusters hold candidate clusters that are close but never cite each other.', '全局视图：内容最相近的几对；亮出的星团里，有内容相近、却从不互相引用的候选星团。')};
  if (qid === 'buildson') return {...c, view: 'topo', win: 'all', hl: {pairs: (P.deeper?.buildsOn?.pairs || []).slice(0, 4).map(p => [p.from, p.to])}, note: T('Stage: the upstream map of all citations up to now: foundations at the top, builders at the bottom; the highlighted arrows are the most one-sided pairs.', '全局视图：截至目前全部引用的上下游图，基础在上，上层在下；亮出的箭头是最不对称的几对。')};
  if (qid === 'hubs') return {...c, layer: 'bench', win: 'all', hl: {pairs: (P.rq2.h2b || []).slice(0, 6).map(([a, b]) => [a, b])}, note: T('Stage: benchmark use up to now; highlighted: pairs that share benchmarks although they rarely cite each other.', '全局视图：截至目前的基准使用；亮出的是很少互相引用、却共用基准的几对。')};
  if (qid === 'supply') return {...c, view: 'topo', layer: 'bench', win: 'all', hl: {units: [...P.rq3.clusters].sort((a, b) => b.suppliedOutside - a.suppliedOutside).slice(0, 3).map(r => r.cluster)}, note: T('Stage: the upstream map of benchmark use: suppliers at the top; highlighted: the clusters whose benchmarks others use most.', '全局视图：基准使用的上下游图，供给方在上；亮出的是基准被别人用得最多的星团。')};
  if (qid === 'lifecycle') return {...c, level: 'galaxy', layer: 'bench', note: T('Stage: benchmark use between galaxies, 12 months at a time. Press play to watch benchmarks spread.', '全局视图：星系之间的基准使用，每次看 12 个月。按播放，看基准怎样扩散。')};
  if (qid === 'inflation') return {...c, layer: 'bench', win: 'all', note: T('Stage: where the benchmarks that are used come from; most named benchmarks never appear here.', '全局视图：被使用的基准来自哪里；多数具名基准从未出现在这里。')};
  if (qid === 'collab') { const k = P.connect.collab; return {...c, layer: 'collab', hl: {pairs: [...k.top, ...k.apart].map(p => [p.a, p.b])}, note: T('Stage: the most similar institution profiles; highlighted: the closest pairs, and pairs that share institutions but rarely cite each other.', '全局视图：机构分布最相似的几对；亮出的是最相似的几对，以及用同一批机构、却很少互相引用的几对。')}; }
  return c;
}
function crCards(qs) {
  const byq = Object.fromEntries(qs.map(q => [q[0], q])), used = new Set();
  let n = 0;
  const card = id => { const [qid, q, a, body] = byq[id]; used.add(qid); n++;
    return `<article class="cr-card" id="q-${qid}" data-cr-card="${qid}"><button class="cr-card-head" data-cr-open="${qid}" aria-expanded="false"><span class="ln-qn">${String(n).padStart(2, '0')}</span><span class="cr-card-text"><b>${q}${impBadge(qid)}</b><em>${esc(a)}</em></span><i class="cx-chev" aria-hidden="true"></i></button>
      <p class="fd-note cr-config"><span>${crConfig(qid).note}</span><button class="cr-show" data-cr-show="${qid}">${T('Show on the stage ↑', '在全局视图上看 ↑')}</button></p><div class="cr-body" hidden>${body}</div></article>`; };
  const groups = CR_GROUPS().map(([key, name, sub, ids]) => { const got = ids.filter(id => byq[id]); return got.length ? `<section class="cr-group" data-cr-group="${key}"><h3>${name}<small>${sub}</small></h3>${got.map(card).join('')}</section>` : ''; }).join('');
  const rest = qs.filter(q => !used.has(q[0]));  // nothing is dropped: findings not placed in a group follow at the end
  return groups + (rest.length ? `<section class="cr-group"><h3>${T('More', '其他')}</h3>${rest.map(q => card(q[0])).join('')}</section>` : '');
}
function crLens(qs) {
  return `<div class="cr-wrap">${crStage()}<div class="cr-cards">${crCards(qs)}</div></div>`;
}
function crRedraw(part) {
  const s = document.querySelector('[data-cr-inner]'); if (!s) return;
  if (part !== 'month') { s.innerHTML = crStageInner(); return; }
  // while the month slider moves, keep the slider itself and redraw the rest
  s.querySelector('[data-cr-fig]').innerHTML = cr.view === 'topo' ? crTopoSvg() : crRingSvg();
  s.querySelector('[data-cr-spark]').innerHTML = crSpark();
  s.querySelector('[data-cr-when]').textContent = crWhen();
  const t = s.querySelector('.cr-table'); if (t) t.outerHTML = crTopoTable();
}
function crStop() { if (cr.timer) { clearInterval(cr.timer); cr.timer = 0; } }
function crPlay() {
  if (cr.timer) { crStop(); crRedraw(); return; }
  const last = crMonths().length - 1, s = crSeries();
  if (cr.m >= last) { let m = 0, run = 0; while (m < last && run < 20) run += s[m++]; cr.m = Math.max(0, m - 1); }  // start where there is something to see
  const step = matchMedia('(prefers-reduced-motion: reduce)').matches ? 6 : 1;
  cr.timer = setInterval(() => {
    if (!document.querySelector('[data-cr-stage]')) return crStop();
    cr.m = Math.min(last, cr.m + step);
    const r = document.querySelector('[data-cr-month]'); if (r) r.value = cr.m;
    crRedraw('month');
    if (cr.m >= last) { crStop(); crRedraw(); }
  }, 120);
  crRedraw();
}
function crActivate(qid) {
  if (cr.q === qid) return;
  const c = crConfig(qid);
  crStop();
  Object.assign(cr, {q: qid, view: c.view, level: c.level, layer: c.layer, win: c.win, hl: c.hl, focus: -1, m: crMonths().length - 1});
  for (const el of document.querySelectorAll('.cr-card')) el.classList.toggle('is-active', el.dataset.crCard === qid);
  crRedraw();
}
function crFocus(svg, k) {  // hover: only the connections of one area
  if (!svg) return;
  svg.classList.toggle('has-focus', k >= 0);
  for (const el of svg.querySelectorAll('[data-cr-a]')) el.classList.toggle('is-focus', k >= 0 && (+el.dataset.crA === k || +el.dataset.crB === k));
  const near = new Set([k]);
  for (const el of svg.querySelectorAll('.tp-edge.is-focus')) { near.add(+el.dataset.crA); near.add(+el.dataset.crB); }
  for (const el of svg.querySelectorAll('[data-cr-unit]')) el.classList.toggle('is-focus', k >= 0 && near.has(+el.dataset.crUnit));
}
function crDrawer(key) {
  const [a, b] = key.split('|').map(Number), C = P.connect, members = k => cr.level === 'galaxy' ? C.works.map((_, c) => c).filter(c => C.clusterGalaxy[c] === k) : [k];
  if (cr.layer === 'collab' && cr.view === 'ring') { const names = C[cr.level].sharedInst[`${Math.min(a, b)}|${Math.max(a, b)}`] || [];
    openDrawer(`${crName(a)} · ${crName(b)} · ${T('institutions working on both', '两边都在做的机构')}`, names.length ? `<ol class="fd-drawer-list">${names.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : `<p class="fd-note">${T('No shared institution.', '没有共同的机构。')}</p>`);
    return; }
  const bench = cr.layer === 'bench', src = bench ? C.benchItems : C.citeWorks;
  const ids = (x, y) => [...new Set(members(x).flatMap(p => members(y).flatMap(q => src[`${p}|${q}`] || [])))].slice(0, 30);
  const part = (x, y) => { const l = ids(x, y); return `<h5>${bench ? T(`${crName(x)} uses benchmarks of ${crName(y)}`, `${crName(x)} 使用的 ${crName(y)} 的基准`) : T(`${crName(x)} citing ${crName(y)}: the works that cite most`, `${crName(x)} 引用 ${crName(y)}：引用最多的工作`)}</h5>${l.length ? paperRows(l) : `<p class="fd-note">${T('None in the data.', '数据里没有。')}</p>`}`; };
  openDrawer(`${crName(a)} ↔ ${crName(b)}`, `<p class="fd-note">${T('All months; lists are capped at 30 and ranked by weight.', '按全部月份；每个列表最多 30 项，按权重排序。')}</p>${part(a, b)}${part(b, a)}`);
}
let crObserver = null;
function crBind(root) {
  crObserver?.disconnect(); crObserver = null;
  const fig = root.querySelector('[data-cr-stage]');
  if (!fig) return;
  root.addEventListener('mouseover', e => { const u = e.target.closest('[data-cr-unit]'); const svg = e.target.closest('.cr-ring,.tp-map'); if (svg) crFocus(svg, u ? +u.dataset.crUnit : cr.focus); });
  fig.addEventListener('mouseleave', () => crFocus(fig.querySelector('.cr-ring,.tp-map'), cr.focus));
  // on wide screens the card crossing the middle of the window sets the stage, as the reader scrolls the findings
  if ('IntersectionObserver' in window && matchMedia('(min-width: 1100px)').matches) {
    crObserver = new IntersectionObserver(ens => { for (const en of ens) if (en.isIntersecting) crActivate(en.target.dataset.crCard); }, {rootMargin: '-40% 0px -55% 0px'});
    root.querySelectorAll('.cr-card').forEach(el => crObserver.observe(el));
  }
}

// ------------------------------------------------------------------------------------------------ scope: the two axes (findings.scope)
const SCOPE_AGENT = () => ({
  A: [T('Digital agents', '数字智能体'), T('AI agents that act in browsers, computers, code, tools, assistants and workflows; almost all are driven by language models.', '在网页、电脑、代码、工具、助手和工作流里行动的 AI 智能体，几乎都由大语言模型驱动。')],
  B: [T('Physical agents', '物理智能体'), T('Robots, embodied agents, driving and drones. In scope only when the decisions come from a learned policy or a foundation model.', '机器人、具身智能体、自动驾驶与无人机。只有决策由学习到的策略或基础模型做出时才收。')],
  C: [T('RL agents in simulators', '仿真中的强化学习智能体'), T('Reinforcement-learning agents trained and tested in simulated environments: reward hacking, safe exploration, constraints.', '在仿真环境里训练和测试的强化学习智能体：奖励投机、安全探索、约束。')],
  D: [T('No concrete agent', '没有具体的智能体'), T('The model itself, alignment and interpretability theory and methods, or surveys and positions. In scope as foundational work for agent safety.', '研究模型本身、对齐与可解释的理论和方法，或综述与立场。作为智能体安全的基础工作收录。')]});
const SCOPE_SAFETY = () => ({attacked: T('Attacked or misused', '被攻击或滥用'), itself: T('The agent itself (goals, deception)', '智能体自身（目标、欺骗）'),
  failure: T('Non-adversarial failure (accidents, violated constraints)', '非对抗失误（事故、违反约束）'), several: T('Several sources', '多种来源'), none: T('None labelled', '未标出')});
const SCOPE_SUB = () => ({model: [T('Model-level safety', '模型层安全'), T('a foundation model itself attacked, defended or measured (jailbreak benchmarks, moderation models)', '对模型本身的攻击、防护与评测（如越狱基准、内容审核模型）')],
  theory: [T('Theory and methods', '理论与方法'), T('reward modelling and RLHF, interpretability, alignment theory', '奖励建模与 RLHF、可解释性、对齐理论')],
  survey: [T('Surveys and positions', '综述与立场'), T('surveys, agendas and position papers', '综述、研究议程与立场文章')]});
const rgba = (hex, a) => { const v = parseInt(hex.slice(1), 16); return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a.toFixed(3)})`; };
function listCell(ids, label, heading, style = '') {
  if (!ids || !ids.length) return `<span class="ln-scope-cell is-empty"${style}>0</span>`;
  const key = 'L' + Math.random().toString(36).slice(2, 9);
  lists.set(key, {ids, heading});
  return `<button class="ln-scope-cell" data-fd-list="${key}"${style}>${label}</button>`;
}
const B5 = {
  scope() {
    const S = P.scope, AG = SCOPE_AGENT(), SF = SCOPE_SAFETY(), SB = SCOPE_SUB(), keys = Object.keys(SF);
    const max = Math.max(...Object.values(S.matrix).map(v => v.length)), dark = isDark();
    const axes = `<div class="fd-two ln-scope-axes"><div><h4>${T('Question 1 · the agent', '问题一 · 和智能体的关系')}</h4><p class="fd-note">${T('Is the object an AI system that decides and acts on its own, and which kind?', '研究对象是不是会自己做决定并采取行动的 AI 系统？是哪一种？')}</p>
      <ul class="ln-scope-defs">${S.agent.map(r => `<li><b>${r.key} · ${AG[r.key][0]}</b> ${AG[r.key][1]}</li>`).join('')}</ul>
      <p class="fd-note">${T('Out: classical control without a learned decision maker (control barrier functions, MPC, reachability), perception-only robustness, capability-only robotics and driving, ordinary software bots.', '不收：没有学习型决策者的经典控制（控制屏障函数、MPC、可达性分析）、只研究感知的工作、只讲能力的机器人与驾驶、普通软件机器人。')}</p></div>
      <div><h4>${T('Question 2 · the safety', '问题二 · 和安全的关系')}</h4><p class="fd-note">${T('Is the contribution about harm from what the agent decides or does? Three sources:', '贡献是不是这个系统的决定或行动带来的危害？危害有三种来源：')}</p>
      <ul class="ln-scope-defs"><li><b>${SF.attacked}</b> ${T('an attacker or a malicious user turns the agent against its user (prompt injection, poisoning, jailbreaks, backdoors)', '攻击者或恶意用户让智能体做坏事（提示注入、投毒、越狱、后门）')}</li>
      <li><b>${SF.itself}</b> ${T('the agent pursues the wrong goal or hides what it does (reward hacking, deception, power seeking)', '智能体自己的目标或行为跑偏（奖励投机、欺骗、权力寻求）')}</li>
      <li><b>${SF.failure}</b> ${T('nobody attacks, yet the agent causes harm (collisions, unsafe actions, violated constraints)', '没人作恶也出事（碰撞、不安全动作、违反约束）')}</li></ul>
      <p class="fd-note">${T('Out: task performance and accuracy, ordinary noise robustness, general software security, flaws of a base model with no safety consequence.', '不收：一般任务性能与精度、普通噪声鲁棒性、一般软件安全、没有安全后果的基座模型缺陷。')}</p></div></div>`;
    const head = `<tr><th>${T('Agent axis', '智能体轴')} \\ ${T('safety axis', '安全轴')}</th>${keys.map(k => `<th>${SF[k]}</th>`).join('')}<th>${T('All', '合计')}</th></tr>`;
    const body = S.agent.map(r => `<tr><th><b>${r.key} · ${AG[r.key][0]}</b><small>${num(r.n)} · ${pctf(r.share)}</small></th>${keys.map(k => {
      const ids = S.matrix[`${r.key}|${k}`], a = (dark ? 0.62 : 0.42) * Math.sqrt(ids.length / max);
      return `<td>${listCell(ids, num(ids.length), `${AG[r.key][0]} × ${SF[k]}`, ` style="background:${rgba(INK, a)}"`)}</td>`; }).join('')}<td><b>${num(r.n)}</b></td></tr>`).join('');
    const foot = `<tr><th>${T('All', '合计')}</th>${keys.map(k => `<td><b>${num(S.safety[k])}</b></td>`).join('')}<td><b>${num(S.n)}</b></td></tr>`;
    const matrix = `<h4>${T('Every work on both axes', '每项工作在两条轴上的位置')}</h4><div class="ln-scope-scroll"><table class="fd-table ln-scope-matrix"><thead>${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>
      <p class="fd-note">${T('Click a number for the works behind it. Shading follows the count.', '点击数字查看背后的论文；底色深浅表示数量。')}</p>`;
    // composition by year: share of each agent kind among the works of that year
    const ys = S.years, W = 640, H = 170, L = 34, bw = (W - L - 8) / ys.length;
    let bars = '';
    ys.forEach((y, k) => {
      let acc = 0; const tot = S.yearTotals[k] || 1;
      S.agent.forEach((r, j) => { const v = r.byYear[k] / tot, h = (H - 22) * v, x = L + k * bw + 3;
        bars += `<rect x="${x.toFixed(1)}" y="${(H - 22 - acc - h).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="${SERIES[j]}" data-tip="${esc(`${y} · ${AG[r.key][0]}: ${num(r.byYear[k])} (${pctf(100 * v)})`)}"/>`; acc += h; });
      bars += `<text x="${(L + k * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="fd-axis">${y}${k === ys.length - 1 ? '*' : ''}</text>`;
    });
    [0, 50, 100].forEach(p => { const y = (H - 22) * (1 - p / 100); bars += `<text x="${L - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="fd-axis">${p}%</text>`; });
    const legend = `<div class="fd-legend">${S.agent.map((r, j) => `<span><svg width="12" height="12"><rect width="12" height="12" rx="2" fill="${SERIES[j]}"/></svg>${r.key} · ${AG[r.key][0]}</span>`).join('')}</div>`;
    const c22 = S.controlByYear[ys.indexOf(2022)], c24 = S.controlByYear[ys.indexOf(2024)], cl_ = S.controlByYear[ys.length - 1];
    const years = `<h4>${T('Which kind of agent, year by year', '各年研究的是哪种智能体')}</h4>${legend}<svg viewBox="0 0 ${W} ${H}" class="ln-scope-years" role="img" aria-label="${T('Share of each agent kind by year', '各年各类智能体的占比')}">${bars}</svg>
      <p class="fd-note">${T(`Works per year: ${ys.map((y, k) => `${y} ${num(S.yearTotals[k])}`).join(' · ')} (* partial year). Before LLM agents existed, the collection was mostly physical and simulated agents: the control-and-robotics tradition held ${pctf(c22, 0)} of the 2022 works, ${pctf(c24, 0)} in 2024 and ${pctf(cl_, 0)} in ${ys[ys.length - 1]}.`, `各年工作数：${ys.map((y, k) => `${y} ${num(S.yearTotals[k])}`).join(' · ')}（* 年份未完）。LLM 智能体出现之前，语料主要是物理和仿真智能体：控制与机器人传统在 2022 年占 ${pctf(c22, 0)}，2024 年 ${pctf(c24, 0)}，${ys[ys.length - 1]} 年 ${pctf(cl_, 0)}。`)}</p>`;
    const maker = r => { const m = r.maker; return `${T('Decision maker named in title or abstract', '题目或摘要写明的决策者')}: ${T('foundation model', '基础模型')} ${num(m.fm || 0)} · ${T('RL policy', '强化学习策略')} ${num(m.rl || 0)} · ${T('not stated', '未写明')} ${num(m.unstated || 0)}`; };
    const card = r => {
      const extra = r.key === 'B' ? `<p class="fd-note">${T(`Works naming a foundation model: ${num(r.fmByPeriod.to2022)} up to 2022, ${num(r.fmByPeriod['2023-24'])} in 2023–24, ${num(r.fmByPeriod.since2025)} since 2025. ${num(r.unstated.n)} works do not say in title or abstract whether the decision maker is learned; they are the first place to audit the scope rule.`, `写明基础模型的工作：2022 年以前 ${num(r.fmByPeriod.to2022)} 项，2023–24 年 ${num(r.fmByPeriod['2023-24'])} 项，2025 年以来 ${num(r.fmByPeriod.since2025)} 项。另有 ${num(r.unstated.n)} 项在题目和摘要里看不出决策者是不是学习型的，是核查收录规则时最该先看的一批。`)} ${listButton(r.unstated.ids, T('Works with an unstated decision maker', '决策者未写明的工作'), T('Physical agents, decision maker not stated', '物理智能体 · 决策者未写明'))}</p>`
        : r.key === 'D' ? `<p class="fd-note">${T('Some works here do study an agent but carry no agent-setting label (several of the latest above are examples): for them the label is missing, not the agent. The share of such works has not been checked by hand yet.', '这里也混有一部分其实研究智能体、只是没有被标出智能体设定的工作（上面“最新”里就有几篇）：缺的是标签，不是智能体。这类工作占多少，还没有人工核查。')}</p><div class="ln-scope-sub">${r.sub.map(x => `<div><b>${SB[x.key][0]}</b> <span class="fd-note">${num(x.n)} · ${SB[x.key][1]}</span><ul>${x.examples.slice(0, 3).map(id => `<li>${paperLink(id)} <small>${year(id)}</small></li>`).join('')}</ul>${listButton(x.ids, T('All', '全部'), `${AG.D[0]} · ${SB[x.key][0]}`)}</div>`).join('')}</div>` : '';
      return `<article class="ln-scope-card"><h4><span>${r.key}</span>${AG[r.key][0]} <small>${num(r.n)} · ${pctf(r.share)}</small></h4><p>${AG[r.key][1]}</p>
        <p class="fd-note">${T(`${pctf(r.since2025, 0)} since 2025 · median year ${r.medianYear} · ${pctf(r.controlTradition, 0)} in the control-and-robotics tradition · core ${num(r.core)}, foundational ${num(r.foundational)}`, `${pctf(r.since2025, 0)} 发表于 2025 年以来 · 中位年份 ${r.medianYear} · ${pctf(r.controlTradition, 0)} 属于控制与机器人传统 · 核心 ${num(r.core)}，基础 ${num(r.foundational)}`)}</p>
        <p class="fd-note">${maker(r)}</p>
        <h5>${T('Most cited', '被引最多')}</h5><ul>${r.examples.map(id => `<li>${paperLink(id)} <small>${year(id)}</small></li>`).join('')}</ul>
        <h5>${T('Latest', '最新')}</h5><ul>${r.recent.map(id => `<li>${paperLink(id)} <small>${year(id)}</small></li>`).join('')}</ul>${extra}</article>`;
    };
    const cards = `<h4>${T('The four kinds, with examples', '四类智能体与例子')}</h4><div class="ln-scope-cards">${S.agent.map(card).join('')}</div>`;
    const note = `<p class="fd-note">${T('How the axes are read: the agent axis from the facet label "agent setting" (precedence physical > simulator > digital > none), the safety axis from the label "risk source", both given by a language model from title and abstract (agreement with a human check is reported under Method); the decision maker from title and abstract keywords. They describe the collection, they do not decide what is in it: inclusion follows the scope rules (agent-safety-v4).', '两条轴怎么来：智能体轴取分面标签“智能体设定”（同时有几种时按 物理 > 仿真 > 数字 > 无 取一种），安全轴取分面标签“风险来源”，都由语言模型根据题目和摘要标注（与人工核对的一致率见“方法”）；决策者按题目和摘要里的关键词判断。它们描述语料，不决定收录：收录按范围政策（agent-safety-v4）。')}</p>`;
    return axes + matrix + years + cards + note;
  },
};
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
    people: !P.connect?.collab ? [] : (() => { const k = P.connect.collab, t0 = k.top[0], pairName = p => `${cl(p.a)} × ${cl(p.b)}`;
      const row = p => `<tr><th>${esc(pairName(p))}</th><td>${p.collab.toFixed(2)}</td><td>${num(p.sharedInst)}</td><td>${p.citeRatio == null ? '—' : '×' + p.citeRatio.toFixed(2)}</td><td>${p.semantic.toFixed(2)}</td></tr>`;
      const tbl = (rows, title) => `<h4>${title}</h4><table class="fd-table"><thead><tr><th>${T('Pair', '星团对')}</th><th>${T('Institution similarity', '机构相似度')}</th><th>${T('Shared institutions', '共同机构')}</th><th>${T('Citations vs expected', '引用 / 期望')}</th><th>${T('Content', '内容')}</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table>`;
      return [['collab', T('Which research lines share institutions?', '哪些研究线共享机构？'),
        T(`Shared institutions follow content only weakly (ρ = ${k.rhoSemantic}, against 0.78 for citations): the most similar institution profiles are ${pairName(t0)}; ${k.apart.length} pairs share institutions but rarely cite each other.`,
          `机构重合和内容的关系很弱（ρ = ${k.rhoSemantic}，引用和内容是 0.78）：机构分布最相似的是 ${pairName(t0)}；另有 ${k.apart.length} 对星团用的是同一批机构，却很少互相引用。`),
        `<p class="fd-note">${T(`Each pair is compared on works that belong to one of the two clusters only, ${num(k.pairs)} pairs with at least 20 such works each; institution similarity is the cosine of their works-per-ROR-institution profiles.`, `每对星团只用分别独有的工作比较（两边各至少 20 项，共 ${num(k.pairs)} 对）；机构相似度是两边“各机构的工作数”分布的余弦。`)}</p>
        <div class="fd-two"><div>${tbl(k.top, T('Most similar institution profiles', '机构分布最相似'))}</div><div>${tbl(k.apart, T('Same institutions, little citing', '同一批机构，却很少互相引用'))}</div></div>`]]; })(),
    scope: P.position ? (() => { const S = P.position.summary, N = PS_NAMES(), a = S.agent, f = S.foundational, mk = S.physicalMaker, old = P.scope ? Object.fromEntries(P.scope.agent.map(r => [r.key, r])) : null;
      const fl = k => ({F1: T('goal and behaviour alignment', '目标与行为对齐机制'), F2: T('oversight and control', '监督与控制'), F3: T('the instruction-data trust boundary', '指令与数据的信任边界'), F4: T('dangerous-capability evaluations', '危险能力评测'), F5: T('surveys and agendas', '综述与研究议程'), out: T('outside F1–F5', '不符合 F1–F5')}[k]);
      const body = `<div class="fd-hbars">${['digital_agent', 'physical_agent', 'rl_agent', 'no_concrete_agent'].map(k => `<div class="fd-hbar"><span>${N.agent[k]} <small>(${num(S.agentN[k])})</small></span>${barCell(a[k], 50, PS_COLORS[['digital_agent', 'physical_agent', 'rl_agent', 'no_concrete_agent'].indexOf(k)])}<b>${pctf(a[k])}</b></div>`).join('')}</div>
        <h4>${T('The foundational layer: five kinds of work every agent rests on', '基础层：所有智能体都依赖的五类基础工作')}</h4><div class="fd-hbars">${['F1', 'F2', 'F3', 'F4', 'F5'].map(k => `<div class="fd-hbar"><span>${k} · ${fl(k)}</span>${barCell(f[k] || 0, Math.max(...['F1', 'F2', 'F3', 'F4', 'F5'].map(x => f[x] || 0)), COLORS.attention)}<b>${num(f[k] || 0)}</b></div>`).join('')}</div>
        <p class="fd-note">${T(`Physical agents by what makes their decisions: learned policy ${num(mk.learned_policy)}, foundation model ${num(mk.foundation_model)}, not stated ${num(mk.not_stated)}.`, `物理智能体按决策器：学习到的策略 ${num(mk.learned_policy)}，基础模型 ${num(mk.foundation_model)}，未说明 ${num(mk.not_stated)}。`)}</p>
`;  // the A3 matrix (setting labels, with a 'none labelled' risk column) is superseded by these labels and no longer shown
      return [['scope', T('What does agent safety study? Two questions: the agent, and the safety', 'Agent 安全研究的是什么？两个问题：和智能体的关系，和安全的关系'),
        T(`${pctf(a.digital_agent, 0)} of the works study digital agents, ${pctf(a.physical_agent, 0)} physical agents (robots, vehicles, drones), ${pctf(a.rl_agent, 0)} reinforcement-learning agents in simulators; ${pctf(a.no_concrete_agent, 0)} are the foundational layer: no single agent, but what every agent rests on (alignment, oversight, the instruction-data boundary, dangerous capabilities, surveys).`,
          `${pctf(a.digital_agent, 0)} 研究数字智能体，${pctf(a.physical_agent, 0)} 研究机器人、车、无人机等物理智能体，${pctf(a.rl_agent, 0)} 研究仿真中的强化学习智能体；${pctf(a.no_concrete_agent, 0)} 属于基础层：不研究某一个智能体，而是研究所有智能体都依赖的基础（对齐、监督、指令与数据边界、危险能力、综述）。`), body]]; })() :
!P.scope ? [] : (() => { const a = Object.fromEntries(P.scope.agent.map(r => [r.key, r])); return [
      ['scope', T('What does agent safety study? Two questions: the agent, and the safety', 'Agent 安全研究的是什么？两个问题：和智能体的关系，和安全的关系'),
        T(`On the agent axis, ${pctf(a.A.share, 0)} of the works study digital agents, ${pctf(a.B.share, 0)} physical agents (robots, vehicles, drones) and ${pctf(a.C.share, 0)} reinforcement-learning agents in simulators; ${pctf(a.D.share, 0)} have no concrete agent: they study the model itself or alignment theory, or survey the field, and are in as foundational work.`,
          `按智能体轴：${pctf(a.A.share, 0)} 研究数字智能体，${pctf(a.B.share, 0)} 研究机器人、车、无人机等物理智能体，${pctf(a.C.share, 0)} 研究仿真中的强化学习智能体；另有 ${pctf(a.D.share, 0)} 没有具体的智能体，研究的是模型本身、对齐理论或综述，作为基础工作收录。`), B5.scope()]]; })(),
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
    position: !P.position ? [] : (() => { const S = P.position.summary, N = PS_NAMES(), d = P.position.dims, ys = P.position.years, top = (o, k = 3) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k);
      const sy = S.safetyYears, ch = k => `${N.safety[k]} ${pctf(sy[k][0])} → ${pctf(sy[k][sy[k].length - 1])}`, f = S.foundational, ag = P.position.agreement;
      const up = Object.keys(sy).sort((a, b) => (sy[b].at(-1) - sy[b][0]) - (sy[a].at(-1) - sy[a][0]));
      return [
        ['psafety', T('Which safety requirement does the work protect?', '这些工作守护的是哪条安全要求？'), T(`It depends on the agent: digital agents ${top(S.byAgent.digital_agent, 2).map(([k, v]) => `${N.safety[k]} ${pctf(v, 0)}`).join(', ')}; physical agents ${N.safety.action_consequence_safety} ${pctf(S.byAgent.physical_agent.action_consequence_safety, 0)}; the foundational layer ${top(S.byAgent.no_concrete_agent, 2).map(([k, v]) => `${N.safety[k]} ${pctf(v, 0)}`).join(', ')}. Over time: ${ch(up[0])}, ${ch(up[1])}; ${ch(up[up.length - 1])} (≤${ys[0]} → ${ys[ys.length - 1]}).`,
          `取决于智能体：数字智能体以${top(S.byAgent.digital_agent, 2).map(([k, v]) => `“${N.safety[k]}”${pctf(v, 0)}`).join('、')}为主；物理智能体“${N.safety.action_consequence_safety}”占 ${pctf(S.byAgent.physical_agent.action_consequence_safety, 0)}；基础层以${top(S.byAgent.no_concrete_agent, 2).map(([k, v]) => `“${N.safety[k]}”${pctf(v, 0)}`).join('、')}为主。随时间：${ch(up[0])}，${ch(up[1])}；${ch(up[up.length - 1])}（≤${ys[0]} → ${ys[ys.length - 1]}）。`),
          `${BP.table('agent', 'safety', S.byAgent)}<p class="fd-note">${T('Share of each agent kind\'s works by their main safety requirement.', '各类智能体的工作按主要安全要求的分布。')}</p>${BP.years('safety', sy)}<p class="fd-note">${T(`Share of each year's works; works before ${ys[0]} are counted with ${ys[0]}; the last year is incomplete.`, `各年工作中的比例；${ys[0]} 年以前的工作并入 ${ys[0]}；最后一年不完整。`)}</p>`],
        ['pcomponent', T('Where in the system does the problem occur?', '问题出在系统的哪个部分？'), T(`Mostly the model (${pctf(S.components.model, 0)} of works) and the execution environment (${pctf(S.components.execution_environment, 0)}); for digital agents tools and interfaces (${pctf(S.componentsByAgent.digital_agent.tools_interfaces, 0)}) and communication (${pctf(S.componentsByAgent.digital_agent.communication_interface, 0)}) follow; memory ${pctf(S.components.memory, 0)} and retrieval ${pctf(S.components.retrieval, 0)} are thin.`,
          `多数在模型（${pctf(S.components.model, 0)} 的工作）和执行环境（${pctf(S.components.execution_environment, 0)}）；数字智能体其次是工具与接口（${pctf(S.componentsByAgent.digital_agent.tools_interfaces, 0)}）和通信与交互接口（${pctf(S.componentsByAgent.digital_agent.communication_interface, 0)}）；记忆 ${pctf(S.components.memory, 0)}、检索 ${pctf(S.components.retrieval, 0)} 都很薄。`),
          `${BP.table('agent', 'components', S.componentsByAgent)}<p class="fd-note">${T('Share of each agent kind\'s works naming each component; a work can name several.', '各类智能体的工作中涉及各组件的比例；一项工作可以涉及多个组件。')}</p>`],
        ['pharm', T('Who or what is harmed?', '伤害的是什么？'), T(`Measured on the MIT AI Risk Repository's domains: ${top(S.harm, 2).map(([k, v]) => `${N.harm[k]} ${pctf(v, 0)}`).join(' and ')}; ${N.harm.malicious_use} ${pctf(S.harm.malicious_use, 0)}, ${N.harm.human_computer_interaction} ${pctf(S.harm.human_computer_interaction, 0)}, ${N.harm.discrimination_toxicity} ${pctf(S.harm.discrimination_toxicity, 0)}.`,
          `按 MIT AI 风险库的领域：${top(S.harm, 2).map(([k, v]) => `${N.harm[k]} ${pctf(v, 0)}`).join('、')}；${N.harm.malicious_use} ${pctf(S.harm.malicious_use, 0)}、${N.harm.human_computer_interaction} ${pctf(S.harm.human_computer_interaction, 0)}、${N.harm.discrimination_toxicity} ${pctf(S.harm.discrimination_toxicity, 0)}。`),
          `${BP.hbars('harm', S.harm)}<p class="fd-note">${T('Share of works; a work can touch several domains. Domains from Slattery et al., the MIT AI Risk Repository; agent safety sits mostly in two of its seven domains, so content harms (toxicity, misinformation) stay small here by design of the scope.', '工作中的比例；一项工作可以涉及多个领域。领域来自 MIT AI 风险库（Slattery 等）；agent 安全主要落在七个领域中的两个，毒性、错误信息等内容伤害按收录范围本来就少。')}</p>`],
        ['pstage', T('Where in the agent\'s life do defences act?', '防御在哪个环节起作用？'), T(`Before acting most (${pctf(S.stage.prevention, 0)} of ${num(S.defences)} defences prevent), then at run time (${pctf(S.stage.runtime_detection, 0)}); ${pctf(S.stage.formal_guarantee, 0)} come with a formal guarantee and ${pctf(S.stage.after_the_fact, 0)} act after the fact.`, `事前最多（${num(S.defences)} 项防御中 ${pctf(S.stage.prevention, 0)} 是预防），其次是运行时（${pctf(S.stage.runtime_detection, 0)}）；${pctf(S.stage.formal_guarantee, 0)} 给出形式保证，${pctf(S.stage.after_the_fact, 0)} 在事后起作用。`),
          `${BP.hbars('stage', S.stage, COLORS.supply)}${BP.table('safety', 'stage', S.stageBySafety)}<p class="fd-note">${T('Defences (main contribution type) by the stage at which they act, overall and per safety requirement; a defence can act at several stages.', '防御（主要贡献类型）按起作用的环节，整体与按安全要求；一项防御可以在多个环节起作用。')}</p>`],
      ]; })(),
    cold: !P.trajectory?.cold ? [] : (() => { const C0 = P.trajectory.cold, Lx = P.trajectory.lines, g = C0.groups, h = C0.combined.holdout, sg = C0.signals, lab = k => Lx[k].label.split(' · ').slice(0, 2).join(' · ');
      const cc = P.position?.coldCells, N = PS_NAMES(), S0 = SURFACE_NAMES(), cellName = (kind, r) => `${N.agent[r.agent]} × ${kind === 'surface' ? S0[r.value] : N[kind === 'safety' ? 'safety' : 'components'][r.value]}`;
      const sigName = {headCites: T('cited by head lines', '已被头部研究线引用'), inCites: T('cited by other lines, per work', '被其他研究线引用（每篇）'), institutions: T('institutions per work', '每篇的机构数'), clusters: T('clusters reached', '横跨的星团数'), code: T('works with code', '有代码的工作比例'), momentum: T('last six months on the six before', '近 6 个月对前 6 个月'), growth: T('growth on the year before', '比前一年的增长'), youth: T('a young line', '出现不久')};
      const all = cc ? [...cc.safety.map(r => ['safety', r]), ...cc.surface.map(r => ['surface', r]), ...cc.components.map(r => ['components', r])].sort((a, b) => a[1].ratio - b[1].ratio) : [];
      const phys = all.filter(([kind, r]) => r.agent === 'physical_agent' && kind !== 'surface').slice(0, 4);
      return [
        ['cold1', T('Do cold lines come back?', '冷门方向会翻身吗？'), T(`Sometimes, and they matter in number: of research lines that few people worked on a year earlier (the smaller half of the tail), ${pctf(g.cold.toHead)} reached the head within a year (the rest of the tail: ${pctf(g.rest.toHead)}); yet ${g.cold.entrants} of the ${g.cold.entrants + g.rest.entrants} entries into the head came from them.`, `会，但不常；数量上却不可忽视：一年前做的人少的研究线（长尾里较小的一半），一年内进入头部的有 ${pctf(g.cold.toHead)}（长尾里其余的线为 ${pctf(g.rest.toHead)}）；而所有进入头部的 ${g.cold.entrants + g.rest.entrants} 次中，有 ${g.cold.entrants} 次来自当时的冷门线——冷门是机会的蓄水池。`),
          `<table class="fd-table"><thead><tr><th></th><th>${T('Line-quarters', '研究线 × 起点')}</th><th>${T('In the head a year later', '一年后进入头部')}</th><th>${T('Grew faster than the field', '增长快于全领域')}</th></tr></thead><tbody>${[['cold', T('Cold (few works)', '冷门（做的人少）')], ['rest', T('Rest of the tail', '长尾其余')]].map(([k, l]) => `<tr><th>${l}</th><td>${num(g[k].lines)}</td><td>${pctf(g[k].toHead)} (${g[k].entrants})</td><td>${pctf(g[k].faster)}</td></tr>`).join('')}</tbody></table>
          <p class="fd-note">${T(`Back test from each quarter ${C0.origins[0]}–${C0.origins[C0.origins.length - 1]}: a tail line is cold when its works in the 12 months up to then are in the smaller half of the tail (few people work on it); the outcome is being in the head 12 months later. Small lines grow fast in ratio terms, so "faster than the field" says little on its own.`, `从 ${C0.origins[0]} 到 ${C0.origins[C0.origins.length - 1]} 每个季度回测：近 12 个月工作数在长尾较小一半的线算冷门（做的人少）；结果看 12 个月后是否进入头部。小线的增长倍数天然偏大，“快于全领域”单独看说明不了太多。`)} ${T(`Lines that came from the cold into the head after ${C0.revivedFrom}:`, `${C0.revivedFrom} 之后从冷门进入头部的线：`)}</p><ol class="fd-drawer-list">${C0.revived.slice(0, 8).map(k => `<li><button class="fd-link" data-tj-line="${k}">${esc(Lx[k].label)}</button><small>${Lx[k].cluster != null ? esc(cl(Lx[k].cluster)) : ''}</small></li>`).join('')}</ol>`],
        ['cold2', T('Can the ones that come back be spotted early?', '能提前认出会翻身的冷门吗？'), T(`Hardly by citations or institutions: cold lines already cited by head lines came back less often (×${sg.headCites.lift}); reaching many clusters (×${sg.clusters.lift}) and being young (×${sg.youth.lift}) helped a little, but signals picked on ${h.train[0].slice(0, 4)} raised the rate only ×${h.lift} on ${h.test[0].slice(0, 4)}. Lines that came back mostly followed new agent infrastructure (approval and authorisation, MCP servers, skills).`, `靠引用和机构信号很难：已被头部研究线引用的冷门线反而更少翻身（${sg.headCites.lift} 倍）；横跨星团多（${sg.clusters.lift} 倍）、出现不久（${sg.youth.lift} 倍）略有帮助，但用 ${h.train[0].slice(0, 4)} 年挑出的信号去检验 ${h.test[0].slice(0, 4)} 年，只提高到 ${h.lift} 倍。翻身的线多半跟着新出现的智能体基础设施走（授权审批、MCP 服务器、skills）。`),
          `<table class="fd-table"><thead><tr><th>${T('Signal at the time (top quarter of cold lines)', '当时可见的信号（冷门线里的前四分之一）')}</th><th>${T('In the head a year later', '一年后进入头部')}</th><th>${T('Against all cold lines', '相对冷门整体')}</th></tr></thead><tbody>${Object.entries(sg).sort((a, b) => (b[1].lift || 0) - (a[1].lift || 0)).map(([k, v]) => `<tr><th>${sigName[k] || k}</th><td>${pctf(v.rate)}</td><td class="${(v.lift || 0) >= 1 ? 'ln-up' : 'ln-down'}">×${v.lift}</td></tr>`).join('')}<tr><th>${T('Combined', '合并')} (${C0.combined.signals.map(k => sigName[k]).join(' + ')})</th><td>${pctf(C0.combined.rate)}</td><td>×${C0.combined.lift}</td></tr><tr><th>${T(`Picked on ${h.train[0].slice(0, 4)}, tested on ${h.test[0].slice(0, 4)}`, `${h.train[0].slice(0, 4)} 年挑、${h.test[0].slice(0, 4)} 年测`)}</th><td>${pctf(h.rate)}</td><td>×${h.lift}</td></tr></tbody></table>
          <p class="fd-note">${T(`All cold lines: ${pctf(C0.baseRate)}. Citations count only if made by the time of the quarter, so nothing from the future leaks in. The combined row reuses the data it was picked on and flatters; the last row does not.`, `冷门整体：${pctf(C0.baseRate)}。引用只计当时已经发生的，避免用到“未来信息”。“合并”一行在挑信号的同一批数据上计算，偏乐观；最后一行不是。`)}</p>`],
        ['cold3', T('Which cold lines are there now?', '现在有哪些冷门线？'), T(`${C0.coldNow} lines have few works in the last 12 months; those reaching the most clusters and youngest include ${C0.watch.slice(0, 3).map(w => lab(w.line)).join('; ')}.`, `近 12 个月做的人少的研究线有 ${C0.coldNow} 条；其中横跨星团最多、出现最晚的包括 ${C0.watch.slice(0, 3).map(w => lab(w.line)).join('；')}。`),
          `<table class="fd-table"><thead><tr><th>${T('Research line', '研究线')}</th><th>${T('Works, 12 months', '近 12 个月工作')}</th><th>${T('Clusters reached', '横跨星团')}</th><th>${T('Growth', '增长')}</th></tr></thead><tbody>${C0.watch.map(w => `<tr><th><button class="fd-link" data-tj-line="${w.line}">${esc(Lx[w.line].label)}</button></th><td>${w.works}</td><td>${w.clusters}</td><td>×${w.growth.toFixed(1)}</td></tr>`).join('')}</tbody></table>
          <p class="fd-note">${T('A list to look at, not a forecast: the back test above shows these signals only weakly pick the lines that come back. Click a line for its latest works.', '这是一份值得看看的名单，不是预测：上面的回测表明这些信号挑得并不准。点击研究线看它最新的工作。')}</p>`],
        ...(all.length ? [['cold4', T('Which combinations does almost no one study?', '哪些组合几乎没人做？'), T(`Mostly around physical agents now that robots take up language models, tools and memory: ${phys.map(([kind, r]) => `${cellName(kind, r)} ${r.observed} (${T('about', '约应有')} ${Math.round(r.expected)})`).join('; ')}.`, `集中在物理智能体——机器人开始接入大模型、工具和记忆，这些方面却几乎没人研究：${phys.map(([kind, r]) => `${cellName(kind, r)} ${r.observed} 篇（按规模约应有 ${Math.round(r.expected)} 篇）`).join('；')}。`),
          `<table class="fd-table"><thead><tr><th>${T('Combination', '组合')}</th><th>${T('Works', '工作')}</th><th>${T('Expected from the totals', '按行列规模推算')}</th><th>${T('Ratio', '比值')}</th></tr></thead><tbody>${all.slice(0, 14).map(([kind, r]) => { const key = 'L' + Math.random().toString(36).slice(2, 9); lists.set(key, {ids: r.ids, heading: cellName(kind, r)}); return `<tr><th><button class="fd-link" data-fd-list="${key}">${esc(cellName(kind, r))}</button></th><td>${r.observed}</td><td>${Math.round(r.expected)}</td><td>${r.ratio.toFixed(2)}</td></tr>`; }).join('')}</tbody></table>
          <p class="fd-note">${T('Digital and physical agents against safety requirements, entry points and components (axis labels; entry points from the earlier facet labels). Expected = row total × column total ÷ all works; only combinations expected to hold at least 20 works. RL agents in simulators and the foundational layer are left out: most of their empty cells are empty by construction.', '数字与物理智能体 × 安全要求、攻击入口、系统组件（轴标签；攻击入口来自早先的标签）。推算值 = 行合计 × 列合计 ÷ 全部工作；只列推算至少 20 项的组合。仿真 RL 智能体和基础层不列：它们的空格大多是结构上本来就空的。')}</p>`]] : []),
      ]; })(),
    trajectory: !P.trajectory ? [] : (() => { const T0 = P.trajectory, tv = T0.turnover.filter(r => !r.partial), lastY = tv[tv.length - 1] || T0.turnover[0], pc = T0.pace[T0.pace.length - 1];
      const ent = T0.entered.slice(0, 3).map(k => T0.lines[k].label.split(' · ').slice(0, 2).join(' · '));
      return [
        ['hturnover', T('How fast does the head turn over?', '头部换血有多快？'), T(`Fast: of the ${lastY.head} lines in the head at the end of ${lastY.year}, ${lastY.entered} (${pctf(lastY.enteredShare, 0)}) were in the long tail a year before; in the last 12 months ${T0.entered.length} lines entered, among them ${ent.join('; ')}.`, `很快：${lastY.year} 年底头部的 ${lastY.head} 条研究线中，有 ${lastY.entered} 条（${pctf(lastY.enteredShare, 0)}）一年前还在长尾；近 12 个月有 ${T0.entered.length} 条线进入头部，包括 ${ent.join('；')}。`), BT.turnover()],
        ['hpace', T('Is the head growing as fast as the rest?', '头部和其余研究线，谁长得快？'), T(`The rest: the lines that were in the head a year ago grew ×${pc.head.toFixed(1)} in works over the last 12 months, all other lines ×${pc.tail.toFixed(1)} (${pc.month}).`, `其余研究线：一年前在头部的线，近 12 个月工作数是前一年的 ${pc.head.toFixed(1)} 倍，其余全部研究线是 ${pc.tail.toFixed(1)} 倍（${pc.month}）。`), BT.pace()],
      ]; })(),
    models2026: !P.models2026 ? [] : (() => { const M = P.models2026, g = M.generations.filter(x => x.kind === 'llm' || x.kind === 'vlm'), F = M.frontier, fam = M.families, oc = M.openClosed.slice(-4, -1),
        avg = k => oc.reduce((s, r) => s + r[k], 0) / Math.max(1, oc.length), C2 = M.byCountry, fb = F.byMonth, early = fb.slice(0, 2), late = fb.slice(-5, -1), mid = v => v.map(r => r.median).sort((a, b) => a - b)[v.length >> 1];
      const gl = x => `${x.label} ${pctf(x.share)}`, vla = M.generations.filter(x => x.kind === 'vla').reduce((s, x) => s + x.papers, 0), guard = M.generations.filter(x => x.kind === 'guard').sort((a, b) => b.papers - a.papers);
      return [
        ['mtop', T(`Which models do ${M.year} papers work with?`, `${M.year} 年的论文在用哪些模型？`), T(`Most named: ${g.slice(0, 3).map(gl).join(', ')}; by family, ${fam.slice(0, 3).map(f => `${f.family} ${pctf(f.share)}`).join(', ')}.`, `点名最多的是 ${g.slice(0, 3).map(gl).join('、')}；按家族，${fam.slice(0, 3).map(f => `${f.family} ${pctf(f.share)}`).join('、')}。`), BM.mtop()],
        ['mfamily', T('How do the families move month by month?', '各家族逐月怎样变化？'), (() => { const q = fam.find(f => f.family === 'Qwen'), gp = fam.find(f => f.family === 'GPT'), l = v => v.byMonth[v.byMonth.length - 2], f0 = v => v.byMonth[0];
          return T(`GPT ${pctf(f0(gp))} → ${pctf(l(gp))} and Qwen ${pctf(f0(q))} → ${pctf(l(q))} of papers (${mMonth(M.months[0])} → ${mMonth(M.months[M.months.length - 2])}).`, `GPT ${pctf(f0(gp))} → ${pctf(l(gp))}，Qwen ${pctf(f0(q))} → ${pctf(l(q))}（${mMonth(M.months[0])} → ${mMonth(M.months[M.months.length - 2])}）。`); })(), BM.mfamily()],
        ['mopen', T('Open weights or a closed API?', '开源权重还是闭源 API？'), T(`Mostly both: in the last full months ${pctf(avg('both'), 0)} of papers use both, ${pctf(avg('openOnly'), 0)} open weights only, ${pctf(avg('closedOnly'), 0)} an API only.`, `多数两类都用：最近几个完整月份，${pctf(avg('both'), 0)} 的论文两类都用，${pctf(avg('openOnly'), 0)} 只用开源权重，${pctf(avg('closedOnly'), 0)} 只用闭源 API。`), BM.mopen()],
        ['mfrontier', T('How far behind the frontier are the models tested?', '论文用的模型离前沿有多远？'), T(`A median of ${F.median} months: ${pctf(F.within6)} of papers name a model released within the previous six months, ${pctf(F.over12)} none newer than a year; the median fell from ${mid(early)} months (${mMonth(fb[0].month)}–${mMonth(fb[1].month)}) to ${mid(late)} (${mMonth(late[0].month)}–${mMonth(late[late.length - 1].month)}).`, `中位 ${F.median} 个月：${pctf(F.within6)} 的论文用到发布不足半年的模型，${pctf(F.over12)} 用到的最新模型也已超过一年；中位距离从 ${mid(early)} 个月（${mMonth(fb[0].month)}–${mMonth(fb[1].month)}）降到 ${mid(late)} 个月（${mMonth(late[0].month)}–${mMonth(late[late.length - 1].month)}）。`), BM.mfrontier()],
        ['mkind', T('Do different agents run on different models?', '不同智能体用的模型一样吗？'), T(`Digital-agent papers name GPT ${pctf(M.byKind.digital.families.GPT, 0)} and Qwen ${pctf(M.byKind.digital.families.Qwen, 0)}; physical-agent papers name models far less often and ${pctf(M.byKind.physical.vla, 0)} use a robot policy model (VLA).`, `数字智能体论文点名 GPT ${pctf(M.byKind.digital.families.GPT, 0)}、Qwen ${pctf(M.byKind.digital.families.Qwen, 0)}；物理智能体论文点名模型少得多，${pctf(M.byKind.physical.vla, 0)} 用到机器人策略模型（VLA）。`), BM.mkind()],
        ['mcountry', T(`Do US and Chinese papers use different models in ${M.year}?`, `${M.year} 年中美论文用的模型不同吗？`), T(`GPT about equally (${pctf(C2.US.families.GPT, 0)} vs ${pctf(C2.CN.families.GPT, 0)}); Chinese papers name Qwen ${pctf(C2.CN.families.Qwen, 0)}, DeepSeek ${pctf(C2.CN.families.DeepSeek, 0)} and GLM ${pctf(C2.CN.families.GLM, 0)}, against ${pctf(C2.US.families.Qwen, 0)}, ${pctf(C2.US.families.DeepSeek, 0)} and ${pctf(C2.US.families.GLM, 0)} in US papers.`, `GPT 相近（${pctf(C2.US.families.GPT, 0)} 对 ${pctf(C2.CN.families.GPT, 0)}）；中国论文点名 Qwen ${pctf(C2.CN.families.Qwen, 0)}、DeepSeek ${pctf(C2.CN.families.DeepSeek, 0)}、GLM ${pctf(C2.CN.families.GLM, 0)}，美国论文分别为 ${pctf(C2.US.families.Qwen, 0)}、${pctf(C2.US.families.DeepSeek, 0)}、${pctf(C2.US.families.GLM, 0)}。`), BM.mcountry()],
        ...(M.uses ? (() => { const U0 = M.uses, f = Object.fromEntries(U0.byFamily.map(x => [x.family, x])), j = U0.judges, tr = U0.trained, at = U0.attackers;
          return [
          ['muses', T('What are the models used for?', '各家模型在论文里被当成什么？'), T(`Mostly as the model studied or driving the agent; GPT is also the judge in ${pctf(f.GPT?.judge, 0)} of the papers naming it and Claude in ${pctf(f.Claude?.judge, 0)}, while Qwen is trained or fine-tuned in ${pctf(f.Qwen?.trained, 0)}, Llama in ${pctf(f.Llama?.trained, 0)}.`, `大多是被测或驱动智能体的模型；GPT 在点名它的论文里有 ${pctf(f.GPT?.judge, 0)} 被当作裁判，Claude 为 ${pctf(f.Claude?.judge, 0)}；Qwen 有 ${pctf(f.Qwen?.trained, 0)} 被拿来训练或微调，Llama 为 ${pctf(f.Llama?.trained, 0)}。`), BM.muses()],
          ['mjudge', T('Who judges, and do models judge themselves?', '谁来当裁判？会不会自己评自己？'), T(`The judges are mostly closed models (${j.slice(0, 3).map(x => x.label).join(', ')}); in ${pctf(U0.selfJudge.share, 0)} of the ${num(U0.selfJudge.papers)} papers with both a judge and a studied model, the judge comes from the same family as a model it judges.`, `裁判多是闭源模型（${j.slice(0, 3).map(x => x.label).join('、')}）；同时有裁判和被测模型的 ${num(U0.selfJudge.papers)} 篇论文中，${pctf(U0.selfJudge.share, 0)} 的裁判与它评判的某个模型来自同一家族。`),
            `${BM.mtopRole('judges')}<p class="fd-note">${T('Papers using each generation as a judge. A judge from the same family as the judged model can favour it (self-preference); such papers are worth a second look.', '把各代模型当裁判的论文数。裁判和被评模型同一家族时，可能偏向自家模型（自我偏好），这类论文值得多看一眼。')}</p>`],
          ['mtrained', T('Which models are trained or fine-tuned?', '大家拿什么模型来训练或微调？'), T(`Open weights only: ${tr.slice(0, 4).map(x => `${x.label} ${num(x.papers)}`).join(', ')} papers.`, `只有开源权重：${tr.slice(0, 4).map(x => `${x.label} ${num(x.papers)} 篇`).join('、')}。`), `${BM.mtopRole('trained')}<p class="fd-note">${T('Papers in which the authors train, fine-tune or distil each generation.', '作者训练、微调或蒸馏各代模型的论文数。')}</p>`],
          ['mattack', T('Which models play the attacker?', '攻击方用什么模型？'), T(`${at.slice(0, 3).map(x => `${x.label} ${num(x.papers)}`).join(', ')} papers; attackers mix closed and open models.`, `${at.slice(0, 3).map(x => `${x.label} ${num(x.papers)} 篇`).join('、')}；攻击方开源与闭源模型都用。`), `${BM.mtopRole('attackers')}<p class="fd-note">${T('Papers using each generation to generate attacks or red-team inputs.', '用各代模型生成攻击或红队输入的论文数。')}</p>`]]; })() : []),
        ['mguard', T('Which robot policies and guard models appear?', '用到哪些机器人策略模型和护栏模型？'), T(`${num(vla)} papers name a robot policy model (VLA); among guard models ${guard[0].label} leads with ${num(guard[0].papers)} papers.`, `${num(vla)} 篇论文点名机器人策略模型（VLA）；护栏模型中 ${guard[0].label} 最多，${num(guard[0].papers)} 篇。`), BM.mguard()],
      ]; })(),
    oss: !P.oss ? [] : (() => { const O = P.oss, g = O.growth, ls = [...O.lines].filter(l => l.ratio != null).sort((a, b) => b.ratio - a.ratio), cr = O.code.byRole, f = O.fate, ty = O.types, w = O.who, c = O.concentration;
      const hi = ls.slice(0, 3), lo = ls.slice(-3).reverse(), li = l => `${cl(l.cluster)} ×${l.ratio.toFixed(2)}`, hk = ty.halves.length - 1, h0 = Math.max(0, ty.halves.indexOf('2025H2'));
      return [
        ['ogrowth', T('Is open source growing faster than the papers?', '开源比论文长得快吗？'), T(`Yes: new repositories double about every ${g.doublingRepos} months, new works every ${g.doublingPapers}; ${pctf(g.since2026)} of the ${num(O.repos)} repositories were created in ${new Date(O.capture).getFullYear()}.`, `是的：新建仓库约每 ${g.doublingRepos} 个月翻一番，新论文约每 ${g.doublingPapers} 个月；${num(O.repos)} 个仓库中有 ${pctf(g.since2026)} 建于 ${new Date(O.capture).getFullYear()} 年。`), BO.ogrowth()],
        ['otypes', T('What does the open-source side build?', '开源在做什么？'), T(`More and more tools: ${num(ty.counts.tool[h0])} tools were created in ${ty.halves[h0]}, ${num(ty.counts.tool[hk - 1])} in ${ty.halves[hk - 1]}, against ${num(ty.counts.research_implementation[hk - 1])} paper implementations.`, `工具越来越多：${ty.halves[h0]} 新建工具 ${num(ty.counts.tool[h0])} 个，${ty.halves[hk - 1]} 达到 ${num(ty.counts.tool[hk - 1])} 个，同期论文实现 ${num(ty.counts.research_implementation[hk - 1])} 个。`), BO.otypes()],
        ['ogap', T('Which lines have tools, and which only papers?', '哪些研究线有开源，哪些只有论文？'), T(`Open source crowds into ${hi.map(li).join(', ')} (share of repositories against share of papers); ${lo.map(li).join(', ')} are mostly papers.`, `开源扎堆在 ${hi.map(li).join('、')}（仓库份额 ÷ 论文份额）；${lo.map(li).join('、')} 基本只有论文。`), BO.ogap()],
        ['ocode', T('Which papers release their code?', '哪些论文公开了代码？'), T(`Benchmarks most (${pctf(cr.benchmark.withCode)}), then measurements ${pctf(cr.measurement.withCode)}, attacks ${pctf(cr.attack.withCode)} and defences ${pctf(cr.defense.withCode)}; surveys ${pctf(cr.survey_position.withCode)}.`, `基准论文最多（${pctf(cr.benchmark.withCode)}），其次是测量 ${pctf(cr.measurement.withCode)}、攻击 ${pctf(cr.attack.withCode)}、防御 ${pctf(cr.defense.withCode)}；综述 ${pctf(cr.survey_position.withCode)}。`), BO.ocode()],
        ['ofate', T('What happens to paper code?', '论文代码后来怎样了？'), T(`Little attention and little upkeep: a median of ${num(f.paperCode.medianStars)} stars; of the code over a year old, ${pctf(f.paperCodeOverAYear.pushed180)} was pushed in the last six months (tools: ${pctf(f.tools.pushed180)}), and ${pctf(f.paperCode.noLicence)} of paper code has no licence.`, `关注少、维护少：中位 ${num(f.paperCode.medianStars)} 颗星；建立超过一年的论文代码只有 ${pctf(f.paperCodeOverAYear.pushed180)} 在近半年有更新（工具为 ${pctf(f.tools.pushed180)}）；${pctf(f.paperCode.noLicence)} 的论文代码没有许可证。`), BO.ofate()],
        ['owho', T('Who builds it?', '谁在做开源？'), T(`Mostly individuals: organizations own ${pctf(w.organizations)} of the repositories but hold ${pctf(w.orgStarShare)} of the stars; the most-starred organizations are ${w.topOrgsByStars.slice(0, 3).map(o => o.owner).join(', ')}.`, `大多是个人：组织拥有 ${pctf(w.organizations)} 的仓库，却占 ${pctf(w.orgStarShare)} 的星；星数最多的组织是 ${w.topOrgsByStars.slice(0, 3).map(o => o.owner).join('、')}。`), BO.owho()],
        ['oconc', T('Where does attention go?', '关注集中在哪里？'), T(`To very few: the top 1% of repositories hold ${pctf(c.top1pct)} of all stars and the top 10 ${pctf(c.top10)}; ${pctf(c.under10)} have fewer than 10 stars.`, `集中在极少数：前 1% 的仓库占全部星数的 ${pctf(c.top1pct)}，前 10 个占 ${pctf(c.top10)}；${pctf(c.under10)} 的仓库不足 10 颗星。`), BO.oconc()],
      ]; })(),
    targets: [
      ['models', T('Which models are put to the test?', '大家在测哪些模型？'), T(`GPT went from ${pctf(md.share.GPT[0])} to ${pctf(md.share.GPT[mi])} of works naming a model (${md.years[0]}→${md.years[mi]}); Claude rose to ${pctf(md.share.Claude[mi])}, Qwen from ${pctf(md.share.Qwen[0])} to ${pctf(md.share.Qwen[mi])}.`, `点名模型的工作中，GPT 从 ${pctf(md.share.GPT[0])} 降到 ${pctf(md.share.GPT[mi])}（${md.years[0]}→${md.years[mi]}）；Claude 升到 ${pctf(md.share.Claude[mi])}，Qwen 从 ${pctf(md.share.Qwen[0])} 升到 ${pctf(md.share.Qwen[mi])}。`), B.models()],
      ['country', T('Do US and Chinese papers test different models?', '中美论文测的模型不同吗？'), T(`Yes: works from ${country('CN')} name Qwen ${pctf(bc.CN.share.Qwen, 0)} and DeepSeek ${pctf(bc.CN.share.DeepSeek, 0)} of the time, works from ${country('US')} ${pctf(bc.US.share.Qwen, 0)} and ${pctf(bc.US.share.DeepSeek, 0)}.`, `是的：${country('CN')}的工作点名 Qwen 的比例为 ${pctf(bc.CN.share.Qwen, 0)}、DeepSeek ${pctf(bc.CN.share.DeepSeek, 0)}；${country('US')}的工作分别为 ${pctf(bc.US.share.Qwen, 0)} 和 ${pctf(bc.US.share.DeepSeek, 0)}。`), B.modelsByCountry()],
      ['settings', T('Which kinds of agents are studied?', '研究的是哪些 agent？'), settingsAnswer(st), B.settings()],
    
      ...(P.position ? [['risk', T('Where does the risk come from?', '风险来自哪里？'), (() => { const S = P.position.summary, N = PS_NAMES(), oy = S.originYears, ys = P.position.years, o = Object.entries(S.origin).sort((a, b) => b[1] - a[1]);
        return T(`${o.slice(0, 2).map(([k, v]) => `${N.origin[k]} ${pctf(v, 0)}`).join(', ')}; ${o.slice(2).map(([k, v]) => `${N.origin[k]} ${pctf(v, 0)}`).join(', ')}. People attacking went from ${pctf(oy.human_adversarial[0])} (≤${ys[0]}) to ${pctf(oy.human_adversarial.at(-1))} (${ys.at(-1)}).`, `${o.slice(0, 2).map(([k, v]) => `${N.origin[k]} ${pctf(v, 0)}`).join('，')}；${o.slice(2).map(([k, v]) => `${N.origin[k]} ${pctf(v, 0)}`).join('，')}。人为对抗从 ${pctf(oy.human_adversarial[0])}（≤${ys[0]}）升到 ${pctf(oy.human_adversarial.at(-1))}（${ys.at(-1)}）。`); })(),
        `${BP.hbars('origin', P.position.summary.origin, COLORS.connection)}${BP.years('origin', P.position.summary.originYears)}<p class="fd-note">${T('Main risk origin of each work (the owner\'s scheme 2), share of all works and of each year\'s works. The earlier facet labels split the recent works into external attackers, the agent itself and non-adversarial failures at about a third each; the new labels separate people acting without intent, the human-agent interaction and several agents interacting.', '每项工作的主要风险来源（方案 2），占全部工作与各年工作的比例。早先的标签把近期工作分成外部攻击者、agent 自身、非对抗性失误，各约三分之一；新标签把无意的人为因素、人机交互、多智能体交互单独分出来。')}</p>`]]
        : fx.risk ? [['risk', T('Where does the risk come from?', '风险来自哪里？'), T(`External attackers ${pctf(lastOf(fx.risk.share.external_attacker))}, the agent itself ${pctf(lastOf(fx.risk.share.agent_itself))}, non-adversarial failures ${pctf(lastOf(fx.risk.share.non_adversarial))} of recent labelled works.`, `近期已标注工作中，外部攻击者 ${pctf(lastOf(fx.risk.share.external_attacker))}，agent 自身 ${pctf(lastOf(fx.risk.share.agent_itself))}，非对抗性失误 ${pctf(lastOf(fx.risk.share.non_adversarial))}。`), B.facetMultiples('risk', RISK_NAMES(), T('Share of labelled works per half-year by where the risk comes from (a work can name several).', '每半年已标注工作按风险来源的比例（一项可涉及多类）。'))]] : []),
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
  if (P.position) {  // answers that read the axis labels and growth (owner review 2026-10-18), applied wherever the question sits
    const ov = positionOverrides();
    for (const qs of Object.values(Q)) (qs || []).forEach((q, i) => { if (q && ov[q[0]]) qs[i] = [q[0], ...ov[q[0]](q)]; });
    if (Q.position) Q.position = Q.position.filter(q => q && q[0] !== 'pharm');  // harm domains: a note, not a finding
  }
  return Q;
}
const IMPORTANT = () => new Set(KEY_FINDINGS.map(([, q]) => q));
const impBadge = qid => IMPORTANT().has(qid) ? `<span class="ln-imp" title="${T('One of the key findings', '重要发现之一')}">${T('Key', '重要')}</span>` : '';
const growthX = ([p, r]) => (r + 1) / (p + 1);
function growthBars(rows, field, names, color) {  // rows: [key, [prev, recent]]
  const rs = rows.filter(([, v]) => v[0] + v[1] >= 10).map(([k, v]) => [k, v, growthX(v)]).sort((a, b) => b[2] - a[2]), max = Math.max(...rs.map(r => r[2]), field * 1.2), W = 600, L = 200, x = v => L + (W - L - 70) * v / max;
  return `<svg viewBox="0 0 ${W} ${rs.length * 24 + 34}" class="fd-dumbbell" role="img">
    <line x1="${x(field)}" x2="${x(field)}" y1="6" y2="${rs.length * 24 + 10}" class="pb-field"/><text x="${x(field)}" y="${rs.length * 24 + 26}" text-anchor="middle" class="fd-axis">${T(`field ×${field.toFixed(1)}`, `全领域 ×${field.toFixed(1)}`)}</text>
    ${rs.map(([k, v, g], i) => { const y = 18 + i * 24; return `<text x="${L - 10}" y="${y + 4}" text-anchor="end" class="fd-axis">${esc(names[k] || k)}</text><rect x="${L}" y="${y - 7}" width="${Math.max(2, x(g) - L)}" height="14" rx="3" fill="${g >= field ? color : rgba(color, 0.45)}" data-tip="${esc(`${names[k] || k}: ${v[0]} → ${v[1]} (×${g.toFixed(1)})`)}"/><text x="${x(g) + 6}" y="${y + 4}" class="fd-axis">×${g.toFixed(1)} <tspan class="pb-dim">${v[0]}→${v[1]}</tspan></text>`; }).join('')}</svg>`;
}
function positionOverrides() {
  const P0 = P.position, S = P0.summary, G = P0.growth, N = PS_NAMES(), field = growthX(G.field), sn = SETTING_NAMES(), surf = SURFACE_NAMES();
  const gl = (k, v, names) => `${names[k] || k} ×${growthX(v).toFixed(1)}`;
  const sets = Object.entries(G.settings).filter(([, v]) => v[0] + v[1] >= 30).sort((a, b) => growthX(b[1]) - growthX(a[1]));
  const fast = sets.filter(([, v]) => growthX(v) > field).slice(0, 4), slow = sets.filter(([, v]) => growthX(v) < field).slice(-4).reverse();
  const sf = P0.surfaces, att = Object.entries(sf).map(([k, v]) => [k, [v.attackPrev, v.attack]]), attAll = P0.rolesGrowth.attack, attField = growthX(attAll);
  const attFast = att.filter(([, v]) => v[0] + v[1] >= 20).sort((a, b) => growthX(b[1]) - growthX(a[1]));
  const adv = P0.adversarial, a0 = adv[0], aL = adv[adv.length - 1], aPeak = adv.reduce((m, r) => r.withinDigital > m.withinDigital ? r : m, adv[0]);
  const ad = Object.entries(sf).map(([k, v]) => ({k, a: v.attack, d: v.defense})).filter(r => r.a + r.d >= 20).sort((x, y) => (y.a + 0.5) / (y.d + 0.5) - (x.a + 0.5) / (x.d + 0.5));
  const A = P0.adaptive, ba = S.byAgent;
  return {
    settings: q => [q[1], T(`Measured by growth, not share: the field grew ×${field.toFixed(1)} (last 12 months on the 12 before); ${fast.map(([k, v]) => gl(k, v, sn)).join(', ')} grew faster; ${slow.map(([k, v]) => gl(k, v, sn)).join(', ')} grew more slowly. A falling share means slower growth, not less work.`,
        `看增长而不只看份额：全领域近 12 个月是前 12 个月的 ${field.toFixed(1)} 倍；${fast.map(([k, v]) => gl(k, v, sn)).join('、')} 快于全领域；${slow.map(([k, v]) => gl(k, v, sn)).join('、')} 慢于全领域。份额下降说明长得慢，不代表做的人少了。`),
      `${growthBars(Object.entries(G.settings), field, sn, COLORS.attention)}<p class="fd-note">${T('Works per agent setting in the last 12 months against the 12 months before (a work can name several settings); dark bars grow faster than the field. Below: the earlier view by share.', '各 agent 场景近 12 个月的工作数相对前 12 个月的倍数（一项工作可以有多个场景）；深色条长得比全领域快。下面是原来按份额看的视图。')}</p>${q[3]}`],
    psafety: q => [q[1], T(`Physical agents and RL agents in simulators lean clearly to action and consequence safety (${pctf(ba.physical_agent.action_consequence_safety, 0)} and ${pctf(ba.rl_agent.action_consequence_safety, 0)} of their works); for digital agents and the foundational layer no requirement holds half: digital agents spread over integrity ${pctf(ba.digital_agent.information_state_integrity, 0)}, authorisation ${pctf(ba.digital_agent.authorization_information_boundary, 0)} and collaboration ${pctf(ba.digital_agent.collaboration_composition, 0)}.`,
        `物理智能体和仿真中的 RL 智能体明显偏向“行动与后果安全性”（分别占其工作的 ${pctf(ba.physical_agent.action_consequence_safety, 0)} 和 ${pctf(ba.rl_agent.action_consequence_safety, 0)}）；数字智能体和基础层没有哪一条要求过半，数字智能体分散在完整性 ${pctf(ba.digital_agent.information_state_integrity, 0)}、授权边界 ${pctf(ba.digital_agent.authorization_information_boundary, 0)}、协作 ${pctf(ba.digital_agent.collaboration_composition, 0)}。`), q[3]],
    risk: q => [q[1], T(`"People attacking" (attackers and malicious users causing harm on purpose) went from ${pctf(a0.share, 0)} of works (≤${a0.year}) to ${pctf(aL.share, 0)} (${aL.year}), mostly because digital agents, about half of whose works face attackers, grew from ${pctf(a0.digitalShare, 0)} to ${pctf(aL.digitalShare, 0)} of the field; within digital agents the share fell from ${pctf(aPeak.withinDigital, 0)} (${aPeak.year}) to ${pctf(aL.withinDigital, 0)}, and in ${aL.year} defences against attackers (${aL.roles.defense}) outnumber attacks (${aL.roles.attack}).`,
        `“人为对抗”（攻击者、恶意用户有意造成伤害）从 ${pctf(a0.share, 0)}（≤${a0.year}）升到 ${pctf(aL.share, 0)}（${aL.year}），主要因为数字智能体（其工作约一半针对攻击者）从全领域的 ${pctf(a0.digitalShare, 0)} 涨到 ${pctf(aL.digitalShare, 0)}；在数字智能体内部，这一比例反而从 ${pctf(aPeak.withinDigital, 0)}（${aPeak.year}）降到 ${pctf(aL.withinDigital, 0)}；${aL.year} 年针对攻击者的工作里，防御（${aL.roles.defense}）已多于攻击（${aL.roles.attack}）。`),
      `<table class="fd-table"><thead><tr><th>${T('Year', '年份')}</th><th>${T('People attacking', '人为对抗')}</th><th>${T('Digital agents in the field', '数字智能体占全领域')}</th><th>${T('People attacking, within digital agents', '数字智能体内的人为对抗')}</th><th>${T('Attacks : defences : benchmarks', '攻击 : 防御 : 基准')}</th></tr></thead><tbody>${adv.map((r, i) => `<tr><th>${i ? r.year : '≤' + r.year}</th><td>${pctf(r.share)}</td><td>${pctf(r.digitalShare)}</td><td>${pctf(r.withinDigital)}</td><td>${r.roles.attack} : ${r.roles.defense} : ${r.roles.benchmark}</td></tr>`).join('')}</tbody></table>
      <p class="fd-note">${T('Risk origin is the main one per work (owner\'s scheme 2): people attacking, people without intent, the agent itself, the human-agent interaction, several agents interacting. Most works study the agent itself failing; that is expected and not the finding here.', '风险来源取每项工作的主要来源（方案 2）：人为对抗、人为非对抗、智能体内部失效、人机交互、多智能体交互。多数工作研究的是智能体自己出错，这在意料之中，不是这里要说的发现。')}</p>${BP.hbars('origin', S.origin, COLORS.connection)}`],
    surfaces: q => [q[1], T(`By growth of attack papers (×${attField.toFixed(1)} in all): ${attFast.slice(0, 3).map(([k, v]) => gl(k, v, surf)).join(', ')} grew fastest; ${attFast.slice(-2).map(([k, v]) => gl(k, v, surf)).join(', ')} least.`, `按攻击论文的增长（整体 ×${attField.toFixed(1)}）：${attFast.slice(0, 3).map(([k, v]) => gl(k, v, surf)).join('、')} 增长最快；${attFast.slice(-2).map(([k, v]) => gl(k, v, surf)).join('、')} 最慢。`),
      `${growthBars(att, attField, surf, COLORS.connection)}<p class="fd-note">${T('Attack papers per entry point, last 12 months against the 12 before (facet labels; a paper can name several). Below: the earlier view by share.', '各入口的攻击论文，近 12 个月相对前 12 个月的倍数（来自标签；一篇论文可以有多个入口）。下面是原来按份额看的视图。')}</p>${q[3]}`],
    balance: q => [q[1], T(`By entry point, only ${surf[ad[0].k]} draws more attacks than defences in the last 12 months (${ad[0].a}:${ad[0].d}); ${surf[ad[1].k]} is close (${ad[1].a}:${ad[1].d}); ${surf[ad[ad.length - 1].k]} is now defended far more than attacked (${ad[ad.length - 1].a}:${ad[ad.length - 1].d}).`,
        `按攻击入口看，近 12 个月只有“${surf[ad[0].k]}”攻多于守（${ad[0].a}:${ad[0].d}）；“${surf[ad[1].k]}”接近持平（${ad[1].a}:${ad[1].d}）；“${surf[ad[ad.length - 1].k]}”已经守远多于攻（${ad[ad.length - 1].a}:${ad[ad.length - 1].d}）。`),
      `<table class="fd-table"><thead><tr><th>${T('Entry point', '入口')}</th><th>${T('Attacks', '攻击')}</th><th>${T('Defences', '防御')}</th><th>${T('Attacks per defence', '攻 / 守')}</th></tr></thead><tbody>${ad.map(r => { const sp = sf[r.k]; return `<tr><th>${esc(surf[r.k])}</th><td>${sp.attackPrev} → ${r.a}</td><td>${sp.defensePrev} → ${r.d}</td><td class="${r.a > r.d ? 'ln-up' : ''}">${((r.a + 0.5) / (r.d + 0.5)).toFixed(2)}</td></tr>`; }).join('')}</tbody></table>
      <p class="fd-note">${T('Papers whose main contribution is an attack or a defence, per entry point; the 12 months before → the last 12 months. Entry points are a better unit than clusters here: some clusters are attack or defence work by definition (red teaming, formal guarantees). The cluster view stays below for reference.', '主要贡献为攻击或防御的论文，按入口；前 12 个月 → 近 12 个月。这里按入口比按星团更合适：有些星团按定义就是攻击或防御（红队测试、形式化保证）。星团视图留在下面作参考。')}</p>${q[3]}`],
    adaptive: q => [q[1], T(`Rarely: ${pctf(100 * A.abstractYes / A.defences)} of ${num(A.defences)} defences report it in the abstract; ${pctf(100 * A.fullTextMentions / A.withFullText)} of those with a full text mention adaptive attacks at all. The true share lies between the two.`, `很少：${num(A.defences)} 项防御中，摘要里报告做过的占 ${pctf(100 * A.abstractYes / A.defences)}；有全文的防御中，正文里提到自适应攻击的也只有 ${pctf(100 * A.fullTextMentions / A.withFullText)}。真实比例在两者之间。`),
      `<p class="fd-note pb-def">${T('An adaptive attack is designed with knowledge of the defence, to get around it. Testing a defence only against attacks made before it existed makes it look stronger than it is, so adaptive evaluation is the standard check for defences (Carlini et al. 2019; Tramèr et al. 2020; for prompt injection, Zhan et al. 2025). Two measures: the abstract says the defence was tested this way (DeepSeek labels, a lower bound), and the paper body names adaptive attacks at all (text search, an upper bound: naming is not testing).', '自适应攻击是知道防御怎么工作、专门设计来绕过它的攻击。只用防御出现之前就有的攻击去测，防御会显得比实际更强，所以自适应检验是评估防御的标准要求（Carlini 等 2019；Tramèr 等 2020；提示注入方面见 Zhan 等 2025）。这里用两个口径：摘要说明做过这种检验（DeepSeek 标签，是下限）；正文里提到自适应攻击（文本检索，是上限，提到不等于做了）。')}</p>${q[3]}`],
    realism: q => { const e = P.lenses.evaluation, h = e.halves, sh = e.share, lst = h.length - 2, keys = ['simulated_environment', 'static_dataset', 'real_system', 'no_experiment'], cols = {simulated_environment: COLORS.supply, static_dataset: M_CLOSED, real_system: COLORS.connection, no_experiment: '#8a9a97'}, nm = EVAL_NAMES();
      const realMax = Math.max(...sh.real_system.filter(v => v != null));
      return [q[1], T(`Mostly in simulation: simulated environments carry ${pctf(sh.simulated_environment[lst], 0)} of attack, defence and benchmark papers and static datasets ${pctf(sh.static_dataset[lst], 0)}; experiments on real deployed systems never went above ${pctf(realMax, 0)} (${pctf(sh.real_system[lst], 0)} in ${h[lst]}).`, `多在模拟中进行：攻击、防御与基准论文里，模拟环境占 ${pctf(sh.simulated_environment[lst], 0)}，静态数据集占 ${pctf(sh.static_dataset[lst], 0)}；在真实部署的系统上做实验的从未超过 ${pctf(realMax, 0)}（${h[lst]} 为 ${pctf(sh.real_system[lst], 0)}）。`),
        `<p class="fd-note">${keys.map(k => `<span class="ln-key-sw" style="background:${cols[k]}"></span>${nm[k]}`).join(' ')}</p><div class="ln-stack">${h.map((hh, i) => `<div class="ln-stack-row${i === h.length - 1 ? ' is-partial' : ''}"><span>${hh}</span><i>${keys.map(k => sh[k][i] ? `<span style="width:${sh[k][i]}%;background:${cols[k]}" data-tip="${esc(`${nm[k]} ${hh}: ${pctf(sh[k][i])}`)}"></span>` : '').join('')}</i><small>${pctf(sh.real_system[i], 0)}</small></div>`).join('')}</div>
        <p class="fd-note">${T('Share of the half-year\'s attack, defence and benchmark papers by how results are obtained; the number on the right is the share run on real systems (deployed products, real websites, real users or robots). The last half-year is incomplete.', '每半年攻击、防御与基准论文按结果获取方式的比例；右侧数字是在真实系统（已部署产品、真实网站、真实用户或机器人）上做实验的比例。最后半年不完整。')}</p>`]; },
  };
}
// where each question sits: by default the lens of its group; the questions below move to the research question they answer
const PLACE = {'connect:traditions': 'structure', 'connect:venues': 'structure', 'tail:gaps': 'structure', 'tail:imbalance': 'structure', 'targets:models': 'models',
  'evolve:reading': 'connect', 'tail:bridges': 'connect', 'attack:comparable': 'connect', 'navigate:newcomers': 'lead', 'targets:country': 'models',
  'attack:timeline': 'evolve', 'tail:shape': 'evolve', 'navigate:next': 'evolve'};
// navigate: the resource check (pilot, bands, nova) is shown on the universe page through renderEvidence, not in a chapter
const HOME_LENS = {people: 'connect', scope: 'structure', evolve: 'evolve', connect: 'connect', lead: 'lead', attack: 'structure', targets: 'structure', tail: 'evolve', navigate: 'universe', models2026: 'models', oss: 'oss', position: 'structure', trajectory: 'evolve', cold: 'evolve'};
const RENAME = {'evolve:timeline': 'onset'};  // two questions named "timeline" share the Trajectory chapter
const ORDER = () => ({...Object.fromEntries(Object.entries(LN_GROUPS()).map(([k, gs]) => [k, gs.flatMap(g => g[3])])),
  connect: ['layers', 'reading', 'notreading', 'bridges', 'buildson', 'hubs', 'supply', 'comparable', 'lifecycle', 'inflation', 'collab'],
  universe: ['pilot', 'bands', 'nova']});
function lensQuestions(id) {
  const out = [];
  for (const [group, qs] of Object.entries(questionPool())) for (const q of qs || []) {
    if (!q) continue;
    const key = `${group}:${q[0]}`;
    if ((PLACE[key] || HOME_LENS[group]) === id) out.push(RENAME[key] ? [RENAME[key], ...q.slice(1)] : q);
  }
  const ord = ORDER()[id] || [], rank = qid => { const i = ord.indexOf(qid); return i < 0 ? ord.length : i; };
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
const KEY_FINDINGS = [['structure', 'traditions'], ['structure', 'settings'], ['structure', 'psafety'], ['structure', 'surfaces'], ['structure', 'balance'],
  ['structure', 'adaptive'], ['structure', 'realism'], ['models', 'mtop'], ['models', 'mfrontier'], ['models', 'mjudge'], ['oss', 'ogap'], ['oss', 'ofate'], ['connect', 'hubs'], ['connect', 'inflation'], ['connect', 'buildson'], ['lead', 'apart'], ['lead', 'punch'],
  ['lead', 'pioneers'], ['lead', 'bigteams'], ['lead', 'newcomers'], ['evolve', 'growth'], ['evolve', 'cold1'], ['evolve', 'cold4'], ['evolve', 'hturnover'], ['evolve', 'hpace'], ['evolve', 'shift'], ['evolve', 'diffusion'], ['evolve', 'backtest']];
function keyFindings(meta) {
  const cache = {}, cards = KEY_FINDINGS.map(([lens, qid]) => { const q = (cache[lens] ??= lensQuestions(lens)).find(x => x[0] === qid); return q && q[2] ? [lens, q] : null; }).filter(Boolean);
  return `<section class="ln-lead"><span class="fd-kicker">${T('KEY FINDINGS', '重要发现')} · ${versionKicker()}</span><h2>${T('What the data says, in one page', '一页看懂数据在说什么')}</h2>${versionNote()}
  <p class="fd-note">${T('The strongest results across the three parts. Every number belongs to the analysis version named above; open a card for the evidence, method notes and the papers behind it. Smaller observations are under Notes.', '版图、力量、走向三部分中最重要的结论。所有数字都属于上方注明的分析版本；点开卡片可看到证据、方法说明和背后的论文。较小的观察放在“小发现”。')}</p></section>
  <div class="ln-keys">${cards.map(([lens, [qid, q, a]]) => `<button class="ln-key" data-ln-goto="${lens}:${qid}"><span class="ln-key-lens">${chapterName(meta, lens)}</span><b>${q}</b><em>${esc(a)}</em><span class="ln-key-go">${T('Evidence', '看证据')} →</span></button>`).join('')}</div>`;
}
const partOf = id => [...PARTS(T), ...TOPICS(T)].find(p => p[3].includes(id));
const chapterName = (meta, id) => { const p = partOf(id); return p && p[3].length > 1 ? `${p[1]} · ${meta[id][0]}` : meta[id][0]; };
function grouped(id, qs) {  // [[group head or null, questions]] in reading order; nothing is dropped
  const gs = LN_GROUPS()[id], byq = new Map(qs.map(q => [q[0], q])), used = new Set();
  if (!gs) return [[null, qs]];
  const out = gs.map(g => [g, g[3].filter(k => byq.has(k)).map(k => (used.add(k), byq.get(k)))]).filter(x => x[1].length);
  const rest = qs.filter(q => !used.has(q[0]));
  return rest.length ? [...out, [['more', T('More', '其他'), '', []], rest]] : out;
}
export function renderLens(ctx) {
  setup(ctx); lists.clear();
  const meta = {key: [T('Key findings', '重要发现'), T('The strongest results of the three parts', '三部分中最重要的结论')], ...lensMeta(T)};
  const want = LENS_LEGACY[C.state.lens] || C.state.lens, id = lensIds().includes(want) ? want : 'key', qs = id === 'key' ? [] : lensQuestions(id), part = partOf(id);
  const tabs = `<nav class="ln-tabs" aria-label="${T('Parts', '部分')}">${[['key', meta.key[0], meta.key[1], ['key']], ...PARTS(T), ...TOPICS(T)].map(([k, name, sub, chapters]) => { const on = k === 'key' ? id === 'key' : part?.[0] === k;
    return `<button data-ln-lens="${chapters[0]}" class="${on ? 'active' : ''}${TOPICS(T).some(x => x[0] === k) ? ' is-topic' : ''}" aria-current="${on ? 'page' : 'false'}"><b>${name}</b><small>${sub}</small></button>`; }).join('')}</nav>`
    + (part && part[3].length > 1 ? `<nav class="ln-chapters" aria-label="${T('Chapters', '章节')}">${part[3].map((k, i) => `<button data-ln-lens="${k}" aria-current="${k === id ? 'page' : 'false'}"><span>${i + 1}</span><b>${meta[k][0]}</b><small>${meta[k][1]}</small></button>`).join('')}</nav>` : '');
  const lead = `<section class="ln-lead"><span class="fd-kicker">${part ? part[1] : ''}${part && part[3].length > 1 ? ' · ' + meta[id][0] : ''} · ${versionKicker()}</span><h2>${meta[id]?.[1] || ''}</h2>${versionNote()}`;
  if (id === 'key') return shell(`${tabs}${keyFindings(meta)}`);
  if (id === 'connect' && P.connect) { crStop(); cr.q = ''; cr.focus = -1; return shell(`${tabs}${lead}</section>${crLens(qs)}`, 'cr-lens'); }
  if (id === 'lead' && P.players) { plStop(); pl.q = ''; return shell(`${tabs}${lead}</section>${plLens(qs)}`, 'cr-lens pl-lens'); }
  if (id === 'evolve' && P.trajectory) { tjStop(); tj.q = ''; tj.hl = null; return shell(`${tabs}${lead}</section>${tjLens(qs)}`, 'cr-lens tj-lens'); }
  if (id === 'structure' && P.position) { psStop(); ps.q = ''; return shell(`${tabs}${lead}</section><div data-ps-book>${psBook(qs)}</div>`, 'ps-lens pb-lens'); }
  const groups = grouped(id, qs);
  const extra = id === 'models' && P.models2026 ? `<p class="fd-note">${mNote()} ${T(`Release months: ${P.models2026.releaseSource}.`, '发布月份：2026-10-07 AI Model Observatory 快照中的 OpenRouter 首次上架月份；更早的模型用厂商发布月份。')}</p>`
    : id === 'oss' && P.oss ? `<p class="fd-note">${T(`${num(P.oss.repos)} repositories in the agent-security group of the open-source set (forks and mirrors left out), metrics captured ${P.oss.capture}. ${P.oss.disclaimer}`, `开源集中 agent 安全组的 ${num(P.oss.repos)} 个仓库（不含 fork 与镜像），数据采集于 ${P.oss.capture}。星数和 fork 数是 GitHub 上的关注度，不代表采用、有效或认可。`)} <a href="#oss">${T('Open the repository table', '打开开源仓库表')} →</a></p>` : '';
  let n = 0;
  const list = `<ol class="ln-qlist">${groups.map(([g, gq]) => `${g ? `<li class="ln-qgroup">${g[1]}</li>` : ''}${gq.map(([qid, q, a]) => `<li><button data-ln-q="${qid}"><span class="ln-qn">${String(++n).padStart(2, '0')}</span><span><b>${q}</b><em>${esc(a)}</em></span></button></li>`).join('')}`).join('')}</ol>`;
  n = 0;
  const blocks = groups.map(([g, gq]) => `${g ? `<div class="ln-group-head" id="g-${g[0]}"><h2>${g[1]}</h2>${g[2] ? `<p>${g[2]}</p>` : ''}</div>` : ''}${gq.map(([qid, q, a, body]) => `<section class="fd-section ln-q" id="q-${qid}"><div class="ln-qhead"><span class="ln-qn">${String(++n).padStart(2, '0')}</span><div><h2>${q}${impBadge(qid)}</h2><p class="ln-answer">${esc(a)}</p></div></div>${body}</section>`).join('')}`).join('');
  return shell(`${tabs}${lead}${extra}${list}</section>${blocks}`);
}
// the resource check, shown on the universe page beside the mechanisms it tests: one question's answer and evidence
export function evidenceAnswer(ctx, qid) { setup(ctx); return lensQuestions('universe').find(q => q[0] === qid) || null; }
export function renderEvidence(ctx, qid) {
  setup(ctx);
  const q = lensQuestions('universe').find(x => x[0] === qid);
  return q ? shell(`<section class="fd-section ln-q home-ev" id="q-${qid}"><div class="ln-qhead"><div><h2>${q[1]}</h2><p class="ln-answer">${esc(q[2])}</p></div></div>${q[3]}</section>`, 'home-ev-shell') : '';
}
export const findingsData = () => dataset;
export const routeCount = () => dataset.universe.citationRoutes + dataset.universe.benchmarkUseRoutes;
export function lensCards(ctx) {
  // one card per lens with its first answer: used on the home page
  setup(ctx);
  const lead = {structure: 'traditions', connect: 'hubs', lead: 'shares', evolve: 'growth'};  // the question each home card shows
  return PARTS(T).map(([, name, sub, chapters]) => { const id = chapters[0], qs = lensQuestions(id), q = qs.find(x => x[0] === lead[id]) || qs[0]; return {id, name, lead: sub, question: q[1], answer: q[2]}; });
}
const NOTES = () => {
  const con = P.trends.concentration, yl = con.years.map(String), w = P.web, hosts = w.resourceHosts, tot = Object.values(hosts).reduce((a, b) => a + b, 0), s = P.fractures.scale, cs = P.trends.clusterShares, pc = v => v == null ? '—' : Number(v).toFixed(1) + '%', it = P.fractures.timeliness.intake, imp = P.fractures.importance;
  return [
    [T('Trajectory', '走向'), `${cs.labelsBefore} → ${cs.labelsRecent}`, T('Recent works carry more cluster labels per work than a year earlier, so raw cluster shares overstate growth everywhere (the shares on this site are fractional).', '近期论文平均带的星团标签比一年前多，直接按标签计的份额会让所有方向都显得在涨（本站的份额按比例计）。'), ''],
    [T('Trajectory', '走向'), pctf(con.code[con.code.length - 3].share), T('Works linking code or data; recent works are linked later, so the last years read low.', '链接代码或数据的工作；近期工作的链接补得较晚，最近一两年偏低。'), tile(T('Works linking code or data', '链接代码或数据的工作'), T('share by year', '各年比例'), con.code.map(x => x.share), yl, INK, pc)],
    [T('Players', '力量'), pctf(con.citations.zeroShare), T('of works have no citation yet.', '的工作尚无引用。'), ''],
    [T('Landscape', '版图'), pctf(s.multiClusterPct), T('of works carry two or more cluster labels, so a "cross-cluster star" is defined by observed routes, not by labels.', '的工作带两个以上星团标签，因此“跨团星”按观测到的航线定义，而不是按标签。'), ''],
    [T('Landscape', '版图'), pctf(s.crossGalaxyPct), T(`of citation routes join works that share no galaxy (${pctf(s.crossClusterPct)} share no cluster).`, `的引用航线连接两个没有共同星系的工作（${pctf(s.crossClusterPct)} 没有共同星团）。`), ''],
    [T('Platform check', '平台检验'), String(imp.medianTauGlobalLocal), T('Kendall τ between global citation counts and citations inside the Atlas: the Atlas sees the same order, mostly.', '全局引用数与 Atlas 内引用数之间的 Kendall τ：两者的排序大体一致。'), ''],
    [T('Web', 'Web'), pctf(w.arxivPct), T(`of works have an arXiv record; ${pctf(w.unverifiedPct)} have no verified venue yet.`, `的工作有 arXiv 记录；${pctf(w.unverifiedPct)} 尚无核实的正式发表。`), ''],
    [T('Web', 'Web'), pctf(100 * hosts['github.com'] / tot), T(`of paper resources sit on GitHub, ${pctf(100 * (hosts['huggingface.co'] || 0) / tot)} on Hugging Face; ${num(w.paperReposArchived)} of ${num(w.paperRepos)} paper repositories are archived.`, `的论文配套资源位于 GitHub，${pctf(100 * (hosts['huggingface.co'] || 0) / tot)} 位于 Hugging Face；${num(w.paperRepos)} 个论文仓库中 ${num(w.paperReposArchived)} 个已归档。`), ''],
    ...(P.lenses.release ? [[T('Resources', '资源'), pctf(P.lenses.release.share[P.lenses.release.share.length - 1]), T('of recent abstracts promise released code or data.', '的近期论文摘要声明公开代码或数据。'), B.release()]] : []),
    ...(P.position ? [[T('Landscape', '版图'), pctf(P.position.summary.harm.ai_system_safety, 0), T(`of works fall in the MIT AI Risk Repository's domain "AI system safety, failures and limitations", ${pctf(P.position.summary.harm.privacy_security, 0)} in "privacy and security"; the other five domains (misuse, human-computer interaction, socioeconomic, misinformation, discrimination) are small, as the scope expects.`, `的工作落在 MIT AI 风险库的“AI 系统安全、失效与局限”领域，${pctf(P.position.summary.harm.privacy_security, 0)} 落在“隐私与安全”；其余五个领域（滥用、人机交互、社会经济、错误信息、歧视）都很小，与收录范围一致。`), BP.hbars('harm', P.position.summary.harm)]] : []),
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
