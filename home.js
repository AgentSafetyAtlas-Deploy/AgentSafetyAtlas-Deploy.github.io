// Home of the review copy (owner, 2026-10-25): the 3-D sky of the paper's frozen map v2 and a short guide to the paper's
// three research questions. Every number comes from data/paper-home.json, written from the frozen results.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const n = x => Number(x).toLocaleString('en-US');

export function renderHero({t, counts, themes, galaxyName}) {
  return `<section class="hs" aria-label="${t('The field map as a sky of papers', '论文组成的星空')}">
  <canvas class="hs-canvas" role="img" aria-label="${t(`${n(counts.works)} stars, one per work in the frozen field map, placed in three dimensions by content similarity and coloured by theme`, `${n(counts.works)} 颗星，每颗是冻结领域地图中的一篇论文，按内容相似度放在三维空间中，按主题着色`)}"></canvas>
  <div class="hs-scrim" aria-hidden="true"></div><div class="hs-labels"></div><div class="hs-tip" role="tooltip" hidden></div>
  <div class="hs-copy">
    <span class="hs-kicker">AGENT SAFETY ATLAS · ${t('THE FIELD MAP', '领域地图')}</span>
    <h1>${t('Every star<br>is a paper.', '每一颗星，<br>都是一篇论文。')}</h1>
    <p>${t(`${n(counts.works)} works on the safety of AI agents first published through 30 September 2026, the paper's frozen field map: ${counts.galaxies} themes (galaxies) and ${counts.clusters} consensus clusters.`, `截至 2026 年 9 月 30 日首次公开的 ${n(counts.works)} 篇 AI 智能体安全论文，即论文中冻结的领域地图：${counts.galaxies} 个主题（星系）和 ${counts.clusters} 个共识星团。`)}</p>
    <div class="hs-cta"><button class="hs-btn is-primary" data-view="rq1">${t('The paper’s findings', '论文的发现')} →</button><button class="hs-btn" data-view="evidence">${t('Check the evidence', '核查证据')}</button><button class="hs-btn" data-view="papers">${t('Browse the papers', '浏览论文')}</button><button class="hs-btn" data-view="explore">${t('Star map in detail', '详细星图')}</button></div>
    <p class="hs-hint">${t('Drag to turn the sky · hover a star for its title · click a name to list its papers', '拖动旋转星空 · 悬停看论文标题 · 点击名称查看论文')}</p>
    <label class="hs-toggle"><input type="checkbox" data-hs-clusters> ${t(`Show the ${counts.clusters} cluster names instead of the ${counts.galaxies} themes`, `显示 ${counts.clusters} 个星团名（代替 ${counts.galaxies} 个主题名）`)}</label>
  </div>
  <div class="hs-legend" role="group" aria-label="${t('Themes', '主题')}">${themes.map((th, i) => `<button data-hs-theme="${i}" style="--c:${th.color}"><i></i>${esc(galaxyName(th))}</button>`).join('')}</div>
  <a class="hs-down" href="#home-lenses" aria-label="${t('Scroll to how to read the map', '向下了解怎样读这张地图')}">↓</a>
  </section>`;
}

export function renderHome({t, hero, H}) {
  const words = [
    ['★', t('Star', '星'), t('One work: its preprint and published versions joined, dated by first public appearance.', '一篇论文：预印本与正式版本合并，按首次公开日期计。')],
    ['◎', t('Galaxy = theme', '星系 = 主题'), t(`A coarser consensus grouping of the clusters: ${H.themes} themes, coloured as in the paper's Figure 2.`, `星团的上一级共识分组：${H.themes} 个主题，颜色与论文图 2 相同。`)],
    ['✶', t('Cluster', '星团'), t(`A consensus cluster of the field map (${H.clusters} in all): 20 seeded Leiden partitions on joint text and reference similarity, combined by a constant-Potts partition.`, `领域地图中的共识星团（共 ${H.clusters} 个）：在文本与参考文献的联合相似度上运行 20 次带种子的 Leiden 划分，再用常数 Potts 模型合成。`)],
    ['⌖', t('Position', '位置'), t('Content similarity of titles and abstracts (SPECTER2, 3-D UMAP). Distance is not a citation relation and empty space is not a research gap.', '标题与摘要的内容相似度（SPECTER2，三维 UMAP）。距离不是引用关系，空白也不是研究空白。')],
    ['○', t('Outside the clusters', '星团之外'), t(`${n(H.unassigned)} works in the map stay unassigned and remain in every period denominator; ${n(H.after)} later works are listed under Papers but are not in the map.`, `地图中有 ${n(H.unassigned)} 篇论文未归类，但仍计入各时期分母；之后发表的 ${n(H.after)} 篇在“论文”中列出，但不在地图上。`)]
  ];
  const card = (view, q, title, body, nums) => `<article class="hm-card"><span class="hm-q">${q}</span><h3>${title}</h3><p>${body}</p><ul class="hm-nums">${nums.map(([v, l]) => `<li><strong>${v}</strong><span>${l}</span></li>`).join('')}</ul><button class="hs-btn is-primary" data-view="${view}">${t('Open', '查看')} ${q} →</button></article>`;
  return `${hero}
  <section class="hm" id="home-lenses">
    <div class="hm-head"><span class="hm-kicker">${t('HOW TO READ THE MAP', '怎样读这张地图')}</span><h2>${t('Five words, each mapped to something you can count', '五个词，每个都对应可以计数的东西')}</h2></div>
    <div class="hm-words">${words.map(([i, w, d]) => `<div><span class="hm-icon" aria-hidden="true">${i}</span><h3>${w}</h3><p>${d}</p></div>`).join('')}</div>
    <div class="hm-head"><span class="hm-kicker">${t('THE PAPER’S THREE QUESTIONS', '论文的三个研究问题')}</span><h2>${t('Each page follows a section of the paper and keeps its records', '每一页对应论文的一节，并保留逐条记录')}</h2></div>
    <div class="hm-cards">
      ${card('rq1', 'RQ1', t('Research evolution', '研究演化'), t('Growth places external information, persistent state and authorised action within a common research focus; evaluations increasingly measure what agents do to their environments.', '增长把外部信息、持久状态与授权行动放进同一研究焦点；评测越来越多地测量 Agent 对环境做了什么。'), H.rq1)}
      ${card('rq2', 'RQ2', t('Foundations and protection', '基础与保护'), t('Earlier research shapes new hotspots through the methods and resources used to evaluate them; protection depends on task representations, trusted policies and implementation choices.', '早期研究通过评测所用的方法与资源影响新的热点；保护取决于任务表示、可信策略与实现选择。'), H.rq2)}
      ${card('rq3', 'RQ3', t('Opportunities and next tests', '机会与下一步检验'), t('Condition analysis turns broad gaps into testable questions: one is proposed for memory and delegation; one is tested, and retrieval protection carried over to the final record in that flow.', '条件分析把宽泛的空白变成可检验的问题：一条针对记忆与委托提出；另一条已检验，在该流程中检索保护延续到了最终记录。'), H.rq3)}
    </div>
    <p class="hm-foot">${t(`Data release ${esc(H.release)}; field statistics through ${esc(H.cutoff)}; map v2 frozen ${esc(H.frozen)}. This review copy does not update.`, `数据版本 ${esc(H.release)}；领域统计截至 ${esc(H.cutoff)}；地图 v2 冻结于 ${esc(H.frozen)}。本评审版不再更新。`)} <button class="linkish" data-view="versions">${t('Data and versions', '数据与版本')} →</button></p>
  </section>`;
}
