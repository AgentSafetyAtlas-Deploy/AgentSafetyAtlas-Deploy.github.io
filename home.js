// Home (宇宙): the star map, a short primer on what the universe's terms mean and what each is for, the two principles,
// and one card per lens with its current answer. Answers come from data/findings.json through lenses.js; the star map is
// mounted into #sky-root by app.js.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// the hero: the 3-D sky (home-sky.js draws into it) with the page's words floating over it
export function renderHero({t, counts, themes, galaxyName}) {
  return `<section class="hs" aria-label="${t('The Atlas as a sky of papers', '论文组成的星空')}">
  <canvas class="hs-canvas" role="img" aria-label="${t(`${counts.works.toLocaleString()} stars, one per paper, placed in three dimensions by content similarity and coloured by galaxy`, `${counts.works.toLocaleString()} 颗星，每颗是一篇论文，按内容相似度放在三维空间中，按星系着色`)}"></canvas>
  <div class="hs-scrim" aria-hidden="true"></div><div class="hs-labels"></div><div class="hs-tip" role="tooltip" hidden></div>
  <div class="hs-copy">
    <span class="hs-kicker">AGENT SAFETY ATLAS · ${t('THE UNIVERSE', '宇宙')}</span>
    <h1>${t('Every star<br>is a paper.', '每一颗星，<br>都是一篇论文。')}</h1>
    <p>${t(`${counts.works.toLocaleString()} papers on the safety and security of AI agents, placed in three dimensions by what they say: ${counts.galaxies} galaxies, ${counts.clusters} clusters and ${counts.routes.toLocaleString()} observed routes between them.`, `${counts.works.toLocaleString()} 篇关于 AI 智能体安全的论文，按内容放进三维空间：${counts.galaxies} 个星系、${counts.clusters} 个星团，以及它们之间 ${counts.routes.toLocaleString()} 条观测到的航线。`)}</p>
    <div class="hs-cta"><button class="hs-btn is-primary" data-view="synthesis">${t('Key findings', '看核心发现')} →</button><button class="hs-btn" data-view="discover">${t('Observations', '看观察')}</button><button class="hs-btn" data-view="papers">${t('Browse the papers', '浏览论文')}</button><button class="hs-btn" data-view="explore">${t('Star map in detail', '详细星图')}</button></div>
    <p class="hs-hint">${t('Drag to turn the sky · hover a star for its title · click a cluster name to open it', '拖动旋转星空 · 悬停看论文标题 · 点击星团名进入')}</p>
  </div>
  <div class="hs-legend" role="group" aria-label="${t('Galaxies', '星系')}">${themes.map((th, i) => `<button data-hs-theme="${i}" style="--c:${th.color}"><i></i>${esc(galaxyName(th))}</button>`).join('')}</div>
  <a class="hs-down" href="#home-lenses" aria-label="${t('Scroll to how to read the universe', '向下了解怎样读这片宇宙')}">↓</a>
  </section>`;
}

export function renderHome({t, latest, counts, hero = '', findings = null, dataRelease = null, records = '', checks = []}) {
  const primer = [
    ['★', t('Star', '星'), t('One research work, its preprint and published versions joined.', '一项研究工作，预印本与正式发表版本合并为一颗星。'), t('Open it to see its routes and the sentences behind them.', '点开它，查看它的航线和背后的原句。')],
    ['◎', t('Cluster and galaxy', '星团与星系'), t(`A cluster is a research line, one of ${counts.clusters}; clusters group into ${counts.galaxies} galaxies, the big directions. A work can belong to several clusters.`, `星团是一条研究线，共 ${counts.clusters} 条；星团归入 ${counts.galaxies} 个星系，也就是大方向。一项工作可以属于多个星团。`), t('Find where a question lives, who works on it, and how directions grow.', '找到一个问题在哪里、谁在做，以及各个方向怎样增长。')],
    ['→', t('Route', '航线'), t('An observed relation with its source: a citation, or a benchmark used in an experiment.', '有出处的观测关系：一次引用，或一次在实验中使用的基准。'), t('Trace why two works are linked, down to the sentence.', '追溯两项工作为何相连，直到原文那一句。')],
    ['✦', t('Brightness', '亮度'), t('How salient a work is for a question, in one band: influence, bridge, resource or latest.', '一项工作对某个问题、在某个波段下的显著程度：影响、桥梁、资源或最新。'), t('Choose starting points for a purpose instead of reading one leaderboard.', '按目的挑选起点，而不是看一个总排行榜。')],
    ['✧', t('New star', '新星'), t('A work less than six months old. Its light is still on its way: few citations does not mean dim.', '不足 6 个月的工作。它的光还在路上：引用少不等于暗。'), t('Recent work is compared only with its own cohort, so it is not buried.', '新作只与同期比较，所以不会被埋没。')],
  ];
  return `${hero}<div class="home">
  <section class="home-primer" id="home-lenses" aria-labelledby="home-primer-title">
    <div class="home-head"><span class="home-kicker">${t('HOW TO READ THE UNIVERSE', '怎样读这片宇宙')}</span><h2 id="home-primer-title">${t('Seven words, and what each is for', '七个词，各有什么用')}</h2>
    <p>${t(`${counts.works.toLocaleString()} works on the safety and security of AI agents, linked by ${counts.routes.toLocaleString()} observed routes. The words below come from astronomy; each maps to something you can count and check.`, `${counts.works.toLocaleString()} 项关于 AI agent 安全的研究工作，由 ${counts.routes.toLocaleString()} 条观测到的航线相连。下面这些词借自天文学，每个都对应一个可以计数、可以核查的东西。`)}</p></div>
    <div class="home-terms">${primer.map(([g, name, what, use]) => `<article class="home-term"><span class="home-glyph" aria-hidden="true">${g}</span><h3>${name}</h3><p>${what}</p><p class="home-use"><b>${t('Use it to', '用来')}</b> ${use}</p></article>`).join('')}</div>
    <div class="home-principles"><article><h3>${t('Gravity only from observed routes', '引力只来自观测到的航线')}</h3><p>${t('A bright star does not mean others follow it, and closeness on the map does not mean one line of work descends from another. Only citations and recorded uses connect works.', '一颗星再亮，也推不出别的星在围着它转；星图上靠得近，也不等于思想上一脉相承。只有引用和有记录的采用才连接工作。')}</p></article>
    <article><h3>${t('Brightness depends on the observer', '亮度取决于观测者')}</h3><p>${t('The same work is a first-magnitude star in its own cluster and background in the next; switch the band and a different set of stars lights up. Every snapshot is dated, so you can compare it with the last one.', '同一项工作，在它所在的星团里是一等亮星，换一个星团看可能只是背景；换一个波段，亮起来的是另一批星。每张星图都注明日期，可以与上一期对照。')}</p></article></div>
    ${findings ? mechanisms(t, findings, dataRelease, checks) : ''}
  </section>
  ${records || ''}
  ${latest || ''}
  </div>`;
}

// Two mechanisms that make the sky more than a picture: the explorer's view (brightness = question × band × release) and
// new stars. Every number comes from data/findings.json (rq1); the small demo reads the per-cluster band lists.
const BANDS = ['foundation', 'influence', 'bridge', 'resource', 'latest'];
const bandLabel = (t, b) => ({foundation: t('Foundation', '奠基'), influence: t('Influence', '影响'), bridge: t('Bridge', '桥梁'), resource: t('Resource', '资源'), latest: t('Latest', '最新')}[b]);
const pct = (v, d = 1) => v == null ? '—' : Number(v).toFixed(d) + '%';
function mechanisms(t, F, dataRelease, checks = []) {
  const s = F.rq1.bands.summary, m = F.meta, pilot = Object.fromEntries(F.rq1.pilot.table.map(r => [r.ranker, r]));
  const sal = pilot.salience || {}, cit = pilot.citations || {};
  const bars = [[t('All works', '全部工作'), s.novaShareCorpus, ''],
    [t('Top 20 of each cluster by citation count', '各星团按引用数排的前 20'), 100 * s.novaGlobalTop20 / s.top20Slots, t(`${s.novaGlobalTop20} of ${s.top20Slots} places`, `${s.top20Slots} 个位置中 ${s.novaGlobalTop20} 个`)],
    [t('Top 20 when compared only with their own group', '只与同组比较时的前 20'), 100 * s.novaGroupTop20 / s.top20Slots, t(`${s.novaGroupTop20} of ${s.top20Slots} places`, `${s.top20Slots} 个位置中 ${s.novaGroupTop20} 个`)]];
  const maxBar = Math.max(...bars.map(b => b[1]));
  const big = F.rq1.bands.perCluster.reduce((a, c) => c.works > a.works ? c : a, F.rq1.bands.perCluster[0]);
  return `<div class="home-mechs">
   <article class="home-mech" aria-labelledby="home-explorer-title">
    <span class="home-mech-kicker">${t("THE EXPLORER'S VIEW", '探索者视角')}</span>
    <h3 id="home-explorer-title">${t('Same sky, a different telescope', '同一片星空，望远镜的倍数不同')}</h3>
    <p>${t('A research organizer reads the sky at the scale of directions. An explorer comes in with one research question, and the sky lights up again around it. Three things decide which stars shine:', '研究组织者在方向的尺度上读星空；探索者带着一个研究问题进来，星空会围绕这个问题重新点亮。哪颗星亮，由三件事决定：')}</p>
    <ol class="home-dials">
     <li><b>${t('Where you stand', '站在哪')}</b><span>${t('Your question. Only the 300 works closest to it in content are ranked, so a famous but unrelated paper never becomes your default start.', '你的问题。只有内容上离问题最近的 300 项工作参与排序，全领域很有名但不相关的论文不会成为你的默认起点。')}</span></li>
     <li><b>${t('What you look for', '找什么')}</b><span>${t('The band. Foundation = read first; influence = most cited within its own group; bridge = routes reach many clusters; resource = benchmarks others evaluate on; latest = date only.', '波段。奠基＝先读什么；影响＝在同组里被引最高；桥梁＝航线连到很多星团；资源＝被别人拿来评测的基准；最新＝只看日期。')}</span></li>
     <li><b>${t('When you look', '什么时候看')}</b><span>${t(`The release. This sky is ${esc(m.release)}, data through ${esc(m.cutoff)}; every release is dated and can be compared with the last.`, `发布版本。现在这片星空是 ${esc(m.release)}，数据截至 ${esc(m.cutoff)}；每一期都注明日期，可以与上一期对照。`)}</span></li>
    </ol>
    <div class="home-demo" data-home-demo>
     <div class="home-demo-bar"><label>${t('Cluster', '星团')} <select data-home-demo-cluster>${m.clusters.map((c, i) => `<option value="${i}"${i === big.cluster ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <div class="home-demo-bands" role="group" aria-label="${t('Band', '波段')}">${BANDS.map((b, i) => `<button data-home-demo-band="${b}" aria-pressed="${i === 0}">${bandLabel(t, b)}</button>`).join('')}</div></div>
     <ol class="home-demo-list" data-home-demo-list aria-live="polite"></ol>
     <p class="home-demo-note">${t('Same cluster, different band: a different set of stars lights up. Each reason is a count you can open.', '同一个星团，换一个波段，亮起来的是另一批星。每条理由都是一个可以点开核对的计数。')}</p>
    </div>
    <p class="home-mech-stat">${t(`Across the ${m.clusters.length} clusters, the top 10 of the foundation, influence, bridge and resource bands overlap by only ${pct(100 * s.meanBandOverlap)} on average: there are at least four kinds of "important".`, `在全部 ${m.clusters.length} 个星团里，奠基、影响、桥梁、资源四个波段的前 10 名平均只重合 ${pct(100 * s.meanBandOverlap)}：“重要”至少有四种。`)}</p>
    <div class="home-mech-go"><button class="hs-btn is-primary" data-view="explore">${t('Try it with your question on Paths', '带着问题去路径页试试')} →</button><button class="hs-btn" data-home-ev="bands" aria-expanded="false">${t('Evidence', '看证据')} ↓</button></div>
   </article>
   <article class="home-mech" aria-labelledby="home-nova-title">
    <span class="home-mech-kicker">${t('NEW STARS', '新星机制')}</span>
    <h3 id="home-nova-title">${t('Its light is still on its way', '它的光还在路上')}</h3>
    <p>${t(`Citations take time to arrive. A work first posted less than ${m.novaMonths} months ago is a new star: ${pct(s.novaShareCorpus)} of all works today. Ranked by citations, new stars all but vanish from the top of every cluster:`, `引用需要时间累积。首次公开不足 ${m.novaMonths} 个月的工作是新星，目前占全部工作的 ${pct(s.novaShareCorpus)}。如果按引用数排，它们几乎从每个星团的前列消失：`)}</p>
    <div class="home-nova-bars">${bars.map(([label, v, note], i) => `<div class="home-nova-bar"><span>${label}</span><i><em style="width:${(100 * v / maxBar).toFixed(1)}%"${i === 1 ? ' class="is-low"' : ''}></em></i><b>${pct(v)}</b>${note ? `<small>${note}</small>` : ''}</div>`).join('')}</div>
    <p>${t('So new stars follow their own rules:', '所以新星有自己的规则：')}</p>
    <ol class="home-dials">
     <li><b>${t('Own cohort', '只和同期比')}</b><span>${t(`Its influence is a citation percentile among works of the same cluster, year and form (a coarser group when fewer than ${m.minGroup}), never against works with years of head start.`, `它的“影响”是在同星团、同年份、同类型工作中的引用分位（组内不足 ${m.minGroup} 项时退到更粗的参照组），不和早发表几年的工作比总数。`)}</span></li>
     <li><b>${t('Ringed, not dim', '带圈，不是暗')}</b><span>${t('On the star map a new star carries a ring and is never drawn smaller than an ordinary star for lack of citations.', '在星图上新星带一圈光环，不会因为引用少被画成小点。')}</span></li>
     <li><b>${t('Evidence, not a score', '给证据，不打分')}</b><span>${t('In the latest band it carries checkable early signs instead of a number: code released, used as a benchmark by n works, links n clusters.', '在“最新”波段里，它带的是可核查的早期迹象而不是分数：有代码、被 n 项工作用作基准、连接 n 个星团。')}</span></li>
     <li><b>${t('It grows up', '会长大')}</b><span>${t(`After ${m.novaMonths} months the ring goes and it is compared like every other work.`, `满 ${m.novaMonths} 个月后光环消失，和其他工作一样比较。`)}</span></li>
    </ol>
    <p class="home-mech-stat">${t(`Tested on ${F.rq1.pilot.surveys} held-out surveys: in the top 20 of navigation salience, recent works make up ${pct(100 * sal.nova20)}, against ${pct(100 * cit.nova20)} when ranked by citations, while salience still finds ${pct(100 * sal.recall50)} of each survey's references in its top 50 (citations: ${pct(100 * cit.recall50)}).`, `在 ${F.rq1.pilot.surveys} 篇留出综述上检验：按导航显著度排的前 20 中，近期工作占 ${pct(100 * sal.nova20)}，按引用数排只有 ${pct(100 * cit.nova20)}；同时显著度在前 50 中找回了每篇综述 ${pct(100 * sal.recall50)} 的参考文献（按引用数：${pct(100 * cit.recall50)}）。`)}</p>
    <div class="home-mech-go"><button class="hs-btn" data-home-ev="nova" aria-expanded="false">${t('Evidence', '看证据')} ↓</button><button class="hs-btn" data-home-ev="pilot" aria-expanded="false">${t('How it was tested', '怎么检验的')} ↓</button></div>
   </article>
   ${checks.map(([qid, q, a]) => `<article class="home-mech is-wide" aria-labelledby="home-check-${qid}">
    <span class="home-mech-kicker">${t('PLATFORM CHECK', '平台检验')}</span>
    <h3 id="home-check-${qid}">${q}</h3><p>${esc(a)}</p>
    <div class="home-mech-go"><button class="hs-btn is-primary" data-home-ev="${qid}" aria-expanded="false">${t('Evidence', '看证据')} ↓</button></div>
   </article>`).join('')}
  </div>
  <div class="home-ev-box" data-home-ev-box hidden></div>
  <p class="home-mech-version">${t(`Numbers in these two cards: analysis version ${esc(m.analysisVersion || '')}, computed on data release ${esc(m.release)} (works through ${esc(m.cutoff)}).`, `这两张卡片里的数字来自分析版本 ${esc(m.analysisVersion || '')}，基于数据版本 ${esc(m.release)}（工作截至 ${esc(m.cutoff)}）。`)}${dataRelease && dataRelease.release !== m.release ? t(` Papers, the sky and the counts above are already on data release ${esc(dataRelease.release)}; analysis versions follow monthly after review.`, `论文、星空和上方的计数已更新到数据版本 ${esc(dataRelease.release)}；分析版本每月复核后更新。`) : ''} <a href="#updates">${t('About the two versions', '关于两种版本')} →</a></p>`;
}

// the band demo: one cluster, five bands, the top three of each with their reasons (from findings.json)
export function bindMechanisms(root, {t, findings: F, paperInfo, topicName, openPaper}) {
  const box = root.querySelector('[data-home-demo]'); if (!box || !F) return;
  const sel = box.querySelector('[data-home-demo-cluster]'), list = box.querySelector('[data-home-demo-list]');
  for (const o of sel.options) o.textContent = topicName(F.meta.clusters[+o.value]);
  let band = 'foundation';
  const reasonText = ([k, v]) => ({citedInCluster: t(`cited by ${v} in this cluster`, `被本星团 ${v} 项引用`), citations: t(`${Number(v).toLocaleString()} citations`, `${Number(v).toLocaleString()} 次引用`),
    groupPercentile: t(`${v}th percentile in its group`, `同组第 ${v} 百分位`), clustersLinked: t(`links ${v} clusters`, `连接 ${v} 个星团`), usedBy: t(`benchmark for ${v} works`, `被 ${v} 项工作用作基准`), code: t('code released', '有代码'), nova: t('new star', '新星')}[k] || k);
  const pick = {foundation: ['citedInCluster', 'citations'], influence: ['groupPercentile', 'citations', 'nova'], bridge: ['clustersLinked', 'nova'], resource: ['usedBy', 'code'], latest: ['nova', 'code', 'usedBy', 'clustersLinked']};
  const draw = () => {
    const c = F.rq1.bands.perCluster.find(x => x.cluster === +sel.value), ids = (c?.bands[band] || []).slice(0, 3);
    list.innerHTML = ids.map(id => {const p = paperInfo(id), rs = (c.reasons[id] || []).filter(r => pick[band].includes(r[0])).sort((a, b) => pick[band].indexOf(a[0]) - pick[band].indexOf(b[0])).slice(0, 3);
      return `<li><button data-home-paper="${esc(id)}">${esc(p?.title || id)}</button><span>${p?.year ? esc(p.year) + ' · ' : ''}${rs.map(reasonText).map(esc).join(' · ')}</span></li>`;}).join('') || `<li class="home-demo-empty">${t('No work in this cluster has this signal yet.', '这个星团里还没有工作具备这个信号。')}</li>`;
  };
  sel.addEventListener('change', draw);
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-home-demo-band]'); if (b) {band = b.dataset.homeDemoBand; for (const x of box.querySelectorAll('[data-home-demo-band]')) x.setAttribute('aria-pressed', x === b); draw(); return;}
    const p = e.target.closest('[data-home-paper]'); if (p) openPaper(p.dataset.homePaper);
  });
  draw();
}
