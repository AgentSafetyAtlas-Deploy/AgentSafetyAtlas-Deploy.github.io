// Home of the frozen release (owner, 2026-10-25): the 3-D sky of the frozen field map v2 and three findings, each with two
// numbers. Every number comes from data/page-home.json, written from the frozen results.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const n = x => Number(x).toLocaleString('en-US');

export function renderHero({t, counts, themes, galaxyName}) {
  return `<section class="hs" aria-label="${t('The field map as a sky of papers', '论文组成的星空')}">
  <canvas class="hs-canvas" role="img" aria-label="${t(`${n(counts.works)} stars, one per work in the frozen field map, placed in three dimensions by content similarity and coloured by theme`, `${n(counts.works)} 颗星，每颗是冻结领域地图中的一篇论文，按内容相似度放在三维空间中，按主题着色`)}"></canvas>
  <div class="hs-scrim" aria-hidden="true"></div><div class="hs-labels"></div><div class="hs-tip" role="tooltip" hidden></div>
  <div class="hs-copy">
    <span class="hs-kicker">AGENT SAFETY ATLAS · ${t('THE FIELD MAP', '领域地图')}</span>
    <h1>${t('Every star<br>is a paper.', '每一颗星，<br>都是一篇论文。')}</h1>
    <p>${t(`${n(counts.works)} works on the safety of AI agents first published through 30 September 2026: a frozen field map of ${counts.galaxies} galaxies (themes) and ${counts.clusters} consensus clusters.`, `截至 2026 年 9 月 30 日首次公开的 ${n(counts.works)} 篇 AI 智能体安全论文，组成冻结的领域地图：${counts.galaxies} 个星系（即主题）和 ${counts.clusters} 个共识星团。`)}</p>
    <div class="hs-cta"><button class="hs-btn is-primary" data-view="evolution">${t('Findings', '看发现')} →</button><button class="hs-btn" data-view="evidence">${t('Check the evidence', '核查证据')}</button><button class="hs-btn" data-view="papers">${t('Browse the papers', '浏览论文')}</button><button class="hs-btn" data-view="explore">${t('Star map in detail', '详细星图')}</button></div>
    <p class="hs-hint">${t('Drag to turn the sky · hover a star for its title · click a name to list its papers', '拖动旋转星空 · 悬停看论文标题 · 点击名称查看论文')}</p>
    <label class="hs-toggle"><input type="checkbox" data-hs-clusters> ${t(`Show the ${counts.clusters} cluster names instead of the ${counts.galaxies} galaxies`, `显示 ${counts.clusters} 个星团名（代替 ${counts.galaxies} 个星系名）`)}</label>
  </div>
  <div class="hs-legend" role="group" aria-label="${t('Galaxies (themes)', '星系（主题）')}">${themes.map((th, i) => `<button data-hs-theme="${i}" style="--c:${th.color}"><i></i>${esc(galaxyName(th))}</button>`).join('')}</div>
  <a class="hs-down" href="#home-lenses" aria-label="${t('Scroll to how to read the map', '向下了解怎样读这张地图')}">↓</a>
  </section>`;
}

export function renderHome({t, hero, H}) {
  const words = [
    ['★', t('Star', '星'), t('One work: its preprint and published versions joined, dated by first public appearance.', '一篇论文：预印本与正式版本合并，按首次公开日期计。')],
    ['◎', t('Galaxy = theme', '星系 = 主题'), t(`The first layer of the map: ${H.themes} galaxies, each one theme that groups several clusters, each with its own colour.`, `地图的第一层：${H.themes} 个星系，每个星系就是一个主题，由若干星团组成，各有自己的颜色。`)],
    ['✶', t('Cluster', '星团'), t(`The second layer: a consensus cluster inside a galaxy (${H.clusters} in all): 20 seeded Leiden partitions on joint text and reference similarity, combined by a constant-Potts partition.`, `第二层：星系里的共识星团（共 ${H.clusters} 个）：在文本与参考文献的联合相似度上运行 20 次带种子的 Leiden 划分，再用常数 Potts 模型合成。`)],
    ['⌖', t('Position', '位置'), t('Content similarity of titles and abstracts (SPECTER2, 3-D UMAP). Distance is not a citation relation and empty space is not a research gap.', '标题与摘要的内容相似度（SPECTER2，三维 UMAP）。距离不是引用关系，空白也不是研究空白。')],
    ['○', t('Outside the clusters', '星团之外'), t(`${n(H.unassigned)} works in the map stay unassigned and remain in every period denominator; ${n(H.after)} later works are listed under Papers but are not in the map.`, `地图中有 ${n(H.unassigned)} 篇论文未归类，但仍计入各时期分母；之后发表的 ${n(H.after)} 篇在“论文”中列出，但不在地图上。`)]
  ];
  const card = (view, icon, title, body, nums) => `<article class="hm-card"><span class="hm-q" aria-hidden="true">${icon}</span><h3>${title}</h3><p>${body}</p><ul class="hm-nums">${nums.map(([v, l]) => `<li><strong>${v}</strong><span>${l}</span></li>`).join('')}</ul><button class="hs-btn is-primary" data-view="${view}">${t('Open', '查看')} →</button></article>`;
  return `${hero}
  <section class="hm" id="home-lenses">
    <div class="hm-head"><span class="hm-kicker">${t('HOW TO READ THE MAP', '怎样读这张地图')}</span><h2>${t('Five words, each mapped to something you can count', '五个词，每个都对应可以计数的东西')}</h2></div>
    <div class="hm-words">${words.map(([i, w, d]) => `<div><span class="hm-icon" aria-hidden="true">${i}</span><h3>${w}</h3><p>${d}</p></div>`).join('')}</div>
    <div class="hm-head"><span class="hm-kicker">${t('THREE FINDINGS', '三项发现')}</span><h2>${t('Each finding opens on its charts and the records behind them', '每项发现都可以展开图表和背后的记录')}</h2></div>
    <div class="hm-cards">
      ${card('evolution', '↗', t('Research evolution', '研究演化'), t('Research is turning towards what agents do: external information, persistent state and authorised action.', '研究正转向 Agent 的实际行动：外部信息、持久状态与授权行动。'), H.rq1)}
      ${card('foundations', '◎', t('Foundations and protection', '基础与保护'), t('New hotspots stand on earlier evaluation tools; their protection rests on inputs that are rarely tested.', '新热点建立在早期的评测工具上；它们的保护依赖很少被检验的输入。'), H.rq2)}
      ${card('opportunities', '✦', t('Opportunities and tests', '机会与检验'), t('Memory authority across a hand-off is untested; retrieval protection carried over to the final record, at a cost in recovery prompts.', '跨转交的记忆权威尚未被检验；检索保护延续到了最终记录，代价是更多补救提示。'), H.rq3)}
    </div>
    <p class="hm-foot">${t(`Frozen release: data ${esc(H.release)}; field statistics through ${esc(H.cutoff)}; map v2 frozen ${esc(H.frozen)}.`, `冻结版本：数据 ${esc(H.release)}；领域统计截至 ${esc(H.cutoff)}；地图 v2 冻结于 ${esc(H.frozen)}。`)} <button class="linkish" data-view="method">${t('Method and data', '方法与数据')} →</button></p>
  </section>`;
}
