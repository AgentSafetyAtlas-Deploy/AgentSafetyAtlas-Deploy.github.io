import {OPPORTUNITY_NOTES} from './opportunity-notes.js';
import {computeOpportunities} from './opportunities-model.js';
let priorModel, result;
export function opportunityData(db,m) {
  if (priorModel!==m) {result=computeOpportunities(db,m);priorModel=m;}
  return result;
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=x=>x===null||!Number.isFinite(x)?'—':Math.round(x*100)+'%';
const delta=x=>x===null||!Number.isFinite(x)?'—':(x>0?'+':'')+Math.round(x*100)+'%';
const number=x=>Number(x||0).toLocaleString('en-US');
const names={
  potential:['Sustained momentum','持续升温'],
  evidence:['Evidence priorities','优先补证'],
  intersections:['Research intersections','交叉方向']
};
const topicIdeas={
  'Non-adversarial safety failures':[
    'Can a benign retry or stale state turn a useful plan into an unsafe action?','没有攻击者时，重试和过期状态会不会把正常计划变成危险动作？',
    'Replay timeouts, partial tool success and stale observations. Compare idempotency, state checks and rollback; measure duplicated actions and recovery success.','回放超时、工具部分成功和过期观测，比较幂等执行、状态校验与回滚；测量重复动作、错误恢复及任务完成率。'],
  'Human autonomy and control':[
    'Does a human stop or correction arrive before an agent’s queued actions take effect?','人的叫停或纠正，能否赶在 Agent 排队中的动作生效前到达？',
    'Vary intervention timing and queued tool calls; compare cancellation, checkpointing and reversible execution, including retained user control.','改变介入时点与排队工具调用，比较取消、检查点和可撤销执行；测量叫停延迟、残留动作和用户实际控制权。'],
  'Privacy and data protection':[
    'Can data permissions survive retrieval, memory and cross-agent handoffs?','数据权限能否在检索、记忆与跨 Agent 交接中持续生效？',
    'Track synthetic sensitive records across users, sessions and tools; measure unauthorized disclosure, overblocking and deletion propagation.','让合成敏感记录跨用户、会话与工具流转，测量未授权披露、正常任务误拦及删除要求的传播。'],

  'Permissions and identity':[
    'Can delegated authority stay within its original scope across an agent chain?','权限经多层 Agent 委托后，能否仍被限制在原始授权范围内？',
    'Vary delegation depth, tool privilege and revocation timing; measure unauthorized actions, false blocks and task completion.','改变委托深度、工具权限与撤销时点，测量越权动作、误拦截和任务完成率。'],
  'Memory and retrieval safety':[
    'Can a memory item that was safe to store become unsafe to execute later?','写入时看似安全的记忆，会不会在后续任务中变成危险指令？',
    'Track tainted memory across sessions, users and retrieval steps; compare read-time validation with write-time filtering.','跟踪污染记忆跨会话、跨用户与检索步骤的传播，比较读取时校验与写入时过滤。'],
  'Tool and execution safety':[
    'Which tool actions need a check before an irreversible side effect?','哪些工具动作必须在不可逆副作用发生前被检查？',
    'Replay identical tasks with and without an action gate; report prevented side effects, bypasses, latency and lost task utility.','在同一组任务中对比有无动作检查，报告阻止的副作用、绕过次数、延迟及任务效用损失。'],
  'Runtime monitoring':[
    'Can a monitor catch a failure before the action takes effect?','监督者能否在动作生效前发现失败？',
    'Compare action, trajectory and state monitors under the same attack set and budget; measure detection delay and benign-task rejection.','在相同攻击集和预算下比较动作、轨迹与状态监督，测量发现延迟与正常任务拒绝率。'],
  'Oversight and assurance':[
    'When do the executor and monitor fail together?','执行者与监督者在什么情况下会共同失效？',
    'Match monitor budgets, vary training or information sources, and compare joint failure rates with single-monitor accuracy.','对齐监督预算，改变训练或信息来源，对比共同失效率与单独监督准确率。'],
  'Formal guarantees':[
    'Do a tool contract’s assumptions hold in the actual execution environment?','工具合约的安全假设，在真实执行环境中是否成立？',
    'Translate stated assumptions into runtime assertions; perturb tool responses and environment state to test guarantee violations.','把显式假设转成运行时断言，扰动工具响应和环境状态，检查保证何时失效。'],
  'Supply-chain security':[
    'What changes after an approved tool, dependency or instruction package is updated?','获准的工具、依赖或指令包更新后，安全结论是否还成立？',
    'Replay benign and malicious updates through a pinned workflow; measure provenance breaks, privilege changes and containment.','在固定工作流中回放正常与恶意更新，测量来源链断裂、权限变化和遏制效果。'],
  'Multi-agent safety':[
    'Can individually constrained agents create an unsafe joint outcome?','各自受到约束的 Agent，能否通过协作产生不安全的整体结果？',
    'Keep each agent’s permissions fixed while changing communication topology and shared resources; score system-level violations.','固定单个 Agent 权限，改变通信拓扑和共享资源，记录系统级违反约束的结果。'],
  'Deception and control':[
    'Does a monitor’s visible evaluation setting change the behavior it detects?','监督者可见的评测环境，会不会改变其检测到的行为？',
    'Separate development attacks from held-out adaptive attacks and vary monitoring visibility; measure undetected successful violations.','分离开发攻击与留出的自适应攻击，改变监督可见性，测量未被发现的成功违规。'],
  'Prompt injection':[
    'Which trust boundary actually fails when external text becomes an instruction?','外部文本变成指令时，究竟是哪一条信任边界失守？',
    'Label instruction sources and action permissions in a common replay suite; test attacks across tools, retrieved text and user tasks.','在统一回放集里标明指令来源和动作权限，跨工具、检索文本与用户任务测试攻击。'],
  'Embodied and physical-world safety':[
    'Does a language-level refusal prevent the physical action that matters?','语言层面的拒绝，能否阻止真正重要的物理动作？',
    'Use a safe simulator with explicit action constraints; measure forbidden transitions separately from refusal wording.','在有明确动作约束的安全仿真环境中，分别衡量禁用状态转移和语言拒绝。'],
  'Safety evaluation':[
    'Does success on a benchmark transfer to unfamiliar tools and longer tasks?','基准上的成功，能否迁移到未见工具与更长的任务？',
    'Hold out tool families, task horizons and attack sources; report safety and completion jointly rather than one aggregate score.','留出工具族、任务长度与攻击来源，同时报告安全性和完成率，避免只用一个总分。']
};
const pairIdeas={
  'permissions-multi-agent':{
    name:['Delegation without privilege creep','多 Agent 委托中的权限守恒'],
    question:['How should permissions compose when agents delegate to one another?','Agent 相互委托时，权限应该如何组合与衰减？'],
    experiment:['Build delegation chains with scoped credentials, revocation and shared tools. Compare inherited privileges with capability-based attenuation.','构造包含限定凭证、权限撤销和共享工具的委托链，比较权限继承与逐级缩小授权范围。'],
    measure:['Unauthorized action rate; revocation delay; task success at each delegation depth.','越权动作率、撤销生效延迟、各委托深度下的任务成功率。'],
    condition:['Prioritize for systems that let agents hand off credentials or authority.','适用于允许 Agent 传递凭证或权限的系统。']},
  'memory-monitoring':{
    name:['Supervision across memory lifetimes','跨记忆生命周期的运行时监督'],
    question:['Can a monitor see a harmful dependency created many sessions earlier?','监督者能否看见多个会话之前埋下的危险依赖？'],
    experiment:['Persist harmless-looking and adversarial memories, then replay later tasks with write-time checks, read-time checks and provenance-aware monitoring.','持久化看似无害与对抗性记忆，在后续任务中比较写入检查、读取检查和带来源追踪的监督。'],
    measure:['Delayed violation rate; contamination lifetime; benign-memory retention; monitor cost.','延迟违规率、污染存活时长、正常记忆保留率、监督成本。'],
    condition:['Prioritize when memory or retrieved content persists across users or sessions.','适用于记忆或检索内容跨用户、跨会话保留的系统。']},
  'formal-tool-execution':{
    name:['Contracts that survive tool execution','从形式合约到实际工具执行'],
    question:['Which proof assumptions fail at the boundary between a model and its tools?','模型与工具交界处，哪些证明假设容易失效？'],
    experiment:['Turn tool contracts into executable checks, inject schema drift and state races, and test whether verified plans still respect the contract.','把工具合约转成可执行检查，注入结构变化与状态竞争，验证已证明的计划是否仍满足合约。'],
    measure:['Assumption violations; blocked unsafe side effects; runtime overhead; completion rate.','假设失效次数、拦截的不安全副作用、运行开销、完成率。'],
    condition:['Prioritize when external tools can perform consequential state changes.','适用于外部工具可以改变重要系统状态的场景。']},
  'deception-oversight':{
    name:['Monitoring beyond shared blind spots','绕开共同盲点的互补监督'],
    question:['Which diversity actually reduces joint executor–monitor failure?','什么样的差异能够减少执行者与监督者的共同失效？'],
    experiment:['Hold monitor budget fixed; vary model family, evidence access and independently designed checks. Use held-out adaptive attacks to measure joint failure.','固定监督预算，改变模型系列、可见证据与独立检查设计；用留出的自适应攻击衡量共同失效。'],
    measure:['Joint failure rate; false positives; cost-matched benefit; transfer to unseen attacks.','共同失效率、误报率、同成本下的增益、对未见攻击的迁移表现。'],
    condition:['Prioritize when an LLM is itself responsible for supervising another LLM.','适用于由 LLM 监督另一个 LLM 的系统。']},
  'embodied-prompt-injection':{
    name:['From injected text to physical actions','从注入文本到物理动作的安全边界'],
    question:['Can environmental text bypass an otherwise safe action policy?','环境中的文本能否绕过本来安全的动作策略？'],
    experiment:['In a safe simulator, vary visual or retrieved instructions while keeping the physical task fixed. Compare text filtering with action-level constraints.','在安全仿真中固定物理任务，改变视觉或检索指令，对比文本过滤与动作层约束。'],
    measure:['Forbidden state transitions; recovery success; human intervention; useful task completion.','禁用状态转移、恢复成功率、人工介入次数、有用任务完成率。'],
    condition:['Prioritize for embodied agents that act on untrusted environmental language.','适用于根据不可信环境语言采取行动的具身 Agent。']},
  'supply-chain-monitoring':{
    name:['Continuous assurance after tool updates','工具更新后的持续安全核查'],
    question:['Can a previously approved tool silently change the agent’s authority?','曾获批准的工具，能否通过更新悄悄改变 Agent 的权限？'],
    experiment:['Change a dependency, tool schema or instruction package between identical task runs. Compare static approval with signed provenance and runtime permission checks.','在相同任务运行之间改变依赖、工具结构或指令包，对比静态批准、签名来源与运行时权限检查。'],
    measure:['Detected behavior changes; time to containment; false alarms on benign updates.','行为变化检出率、遏制所需时间、正常更新的误报率。'],
    condition:['Prioritize when agents install or update third-party tools and instruction packages.','适用于会安装或更新第三方工具与指令包的 Agent。']}
};
function idea(topic,t,topicName) {
  const a=topicIdeas[topic];
  return a?{question:t(a[0],a[1]),experiment:t(a[2],a[3])}:{
    question:t('Which safety claims in '+topicName(topic)+' survive a shared evaluation protocol?',topicName(topic)+'中的安全结论，能否在统一评测协议下成立？'),
    experiment:t('Reproduce a small set of representative works on common tasks, with explicit failure definitions and cost-matched baselines.','在共同任务上复现少量代表性工作，明确失败定义，并比较同成本基线。')};
}
function ev(kind,id,label,cls='in-text-button') {return '<button class="'+cls+'" data-insight-evidence="'+kind+'" data-insight-id="'+esc(id)+'">'+label+'</button>';}
function robustness(r,t) {
  return '<div class="op-robust" aria-label="'+t('Sensitivity to comparison window','比较窗口敏感性')+'">'+r.robustness.windows.map(w=>
    '<span class="'+(w.enoughData?(w.momentum>0&&w.rawShareChange>0?'op-positive':'op-negative'):'op-unknown')+'" title="'+t('Recent / previous works','近期 / 前期论文')+': '+w.recent+' / '+w.previous+'; '+t('raw share','原始占比')+': '+pct(w.previousRawShare)+' → '+pct(w.rawShare)+'"><b>'+w.months+t('m','月')+'</b> '+(w.enoughData?delta(w.momentum):t('low n','样本少'))+'</span>').join('')+'</div>';
}
function ordered(rows,lens) {
  return [...rows].sort((a,b)=>Number(b.status==='priority')-Number(a.status==='priority')||Number(b.eligible)-Number(a.eligible)||
    (lens==='potential'?b.components.momentum-a.components.momentum:b.priority-a.priority)||b.recent-a.recent);
}
function topicCard(ctx,r,lens) {
  const {t,topicName}=ctx, next=idea(r.id,t,topicName);
  const status=r.status==='priority'?t('Several signals agree','多项信号一致'):r.status==='candidate'?t('Worth investigating','值得调查'):t('Watchlist','观察名单');
  return '<article class="op-card"><div class="op-card-top"><span class="in-badge">'+status+'</span><span class="op-score">'+t('Exploration index','探索指数')+' <b>'+r.priority.toFixed(1)+'</b></span></div>'+
    '<h3>'+esc(topicName(r.id))+'</h3><p class="op-question">'+esc(next.question)+'</p><div class="op-stats"><span><b>'+r.previous+' → '+r.recent+'</b>'+t('previous → recent works','前期 → 近期论文')+
    '</span><span><b>'+pct(r.codeRate)+'</b>'+t('recent code links','近期代码链接率')+'</span><span><b>'+r.counts.benchmarks+'/'+r.recent+'</b>'+t('benchmark-form works','基准类论文')+'</span></div>'+
    robustness(r,t)+'<div class="op-action"><span>'+t('TRY NEXT','下一步实验')+'</span><p>'+esc(next.experiment)+'</p></div>'+
    '<div class="op-card-footer">'+ev('opportunity',r.id,t('Why this direction? ↗','为什么推荐这个方向？ ↗'))+
    ev('opportunity-missing',r.id,t('Inspect missing code','核查代码缺口'))+'</div></article>';
}
function pairs(ctx,rows) {
  const {t,topicName}=ctx;
  return '<p class="in-note">'+t('These six intersections are editorial research hypotheses. Counts measure topic-label co-occurrence in the selected corpus; low overlap alone does not establish an opportunity.','以下六个交叉方向是编辑提出的研究假设。数量衡量当前样本中的主题标签共现；共现少本身不能证明有研究机会。')+'</p><div class="op-pair-grid">'+rows.map(r=>{
    const a=pairIdeas[r.id];
    return '<article class="op-card"><div class="op-pair-status"><span class="in-badge">'+(r.smallSample?t('Small sample · watchlist','小样本 · 观察名单'):t('Established overlap in the collection','收录中已有交叉研究'))+'</span></div><span class="in-kicker">'+esc(topicName(r.topics[0]))+' × '+esc(topicName(r.topics[1]))+'</span><h3>'+t(...a.name)+'</h3><p class="op-question">'+t(...a.question)+'</p>'+
      '<div class="op-stats"><span><b>'+r.previous+' → '+r.recent+'</b>'+t('jointly tagged works','同时标注两主题的论文')+'</span><span><b>'+pct(r.overlapRate)+'</b>'+t('of either-topic works','占任一主题论文')+'</span><span><b>'+pct(r.codeRate)+'</b>'+t('recent code links','近期代码链接率')+'</span></div>'+
      '<p class="op-condition">'+t(...a.condition)+'</p><div class="op-action"><span>'+t('TESTABLE PROPOSAL','可检验的研究建议')+'</span><p>'+t(...a.experiment)+'</p></div>'+
      '<p class="in-note"><b>'+t('Measure: ','观测指标：')+'</b>'+t(...a.measure)+'</p>'+ev('opportunity-pair',r.id,t('Inspect overlap & source papers ↗','查看交叉统计与支撑论文 ↗'))+'</article>';
  }).join('')+'</div>';
}
function evidenceMatrix(ctx,rows) {
  const {t,topicName}=ctx;
  return '<div class="op-matrix"><h3>'+t('Which evidence trails the activity?','哪些证据值得优先补齐？')+'</h3><p class="in-note">'+
    t('All ratios use recent works as the denominator. Benchmark share describes paper forms, not benchmark availability or adoption.','比例均以近期论文为分母。基准占比描述论文形式，不代表基准是否存在或被采用。')+
    '</p><div class="in-table-scroll"><table class="in-ranking"><thead><tr><th>'+t('Topic','主题')+'</th><th>'+t('Recent works','近期论文')+'</th><th>'+t('Code links','代码链接')+
    '</th><th>'+t('Benchmark form','基准类')+'</th><th>'+t('ROR coverage','ROR 署名覆盖')+'</th><th>'+t('3 / 6 / 12 month stability','3 / 6 / 12 月稳定性')+'</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+ev('opportunity',r.id,esc(topicName(r.id)),'in-name')+'</td><td>'+r.recent+'</td><td>'+r.counts.codes+'/'+r.recent+' · '+pct(r.codeRate)+
      '</td><td>'+r.counts.benchmarks+'/'+r.recent+' · '+pct(r.benchmarkRate)+'</td><td>'+r.institutionCoverage+'/'+r.recent+' · '+pct(r.institutionCoverageRate)+
      '</td><td>'+robustness(r,t)+'</td></tr>').join('')+'</tbody></table></div></div>';
}
export function opportunityPreview(ctx,db,m) {
  const {t}=ctx, data=opportunityData(db,m),rows=ordered(data.topics,'evidence').filter(x=>x.status==='priority').slice(0,3);
  if(!rows.length)return '';
  return '<section class="op-preview"><div class="in-section-head"><div><span class="in-kicker">'+t('A RESEARCH AGENDA FROM THE EVIDENCE','从证据出发的研究议程')+
    '</span><h2>'+t('What could we work on next?','接下来，值得研究什么？')+'</h2><p>'+t('Growing attention, resource signals and a concrete experiment to try.','结合增长动向、资源记录与可执行的实验建议。')+
    '</p></div><button class="in-primary" data-insight-action="tab:opportunities">'+t('Explore research opportunities →','探索研究机会 →')+'</button></div><div class="op-grid">'+rows.map(r=>topicCard(ctx,r,'evidence')).join('')+'</div></section>';
}

export function selectedResearchNotes(ctx,m) {
  return OPPORTUNITY_NOTES.cards.filter(c=>(!ctx.state.insightTopic||c.topics.includes(ctx.state.insightTopic))&&
    c.sources.every(s=>s.versionDate<=m.asOf));
}
function researchNotes(ctx,m) {
  const {t,external}=ctx,notes=selectedResearchNotes(ctx,m);
  if(!notes.length)return '';
  return '<section class="op-notes"><div class="in-section-head"><div><span class="in-kicker">'+t('READ THE EVIDENCE, THEN CHALLENGE THE CLAIM','阅读证据，再检验结论')+
    '</span><h2>'+t('Research judgments worth testing.','值得检验的研究判断。')+'</h2><p>'+t('Editorial source review: ','来源阅读核验：')+OPPORTUNITY_NOTES.reviewedAt+
    ' · '+t('Findings reported by authors; experiments not independently reproduced. These notes are reviewed separately from the automatic counts.','以下为作者报告的发现，实验未经独立复现；阅读笔记单独审核，统计数量自动更新。')+
    '</p></div></div><div class="op-note-grid">'+notes.map(c=>'<article class="op-research-note"><h3>'+esc(t(c.titleEn,c.titleZh))+'</h3>'+
      '<span class="op-note-label">'+t('WHAT THE PAPERS REPORT','论文报告了什么')+'</span><p>'+esc(t(c.observationEn,c.observationZh))+'</p>'+
      '<div class="op-note-sources">'+c.sources.map(s=>'<div>'+external(s.url,s.title+' · '+s.version,'in-text-button')+
      '<small>'+t('Source version','来源版本')+' '+s.versionDate+' · '+(s.relationship==='adjacent_evidence'?t('Adjacent evidence; excluded from intersection counts','相邻研究证据；不混入交叉计数'):t('Tagged with both topics','同时标注两主题'))+
      '</small><button class="in-text-button" data-insight-paper="'+esc(s.paperId)+'">'+t('Open Atlas record →','查看图谱记录 →')+'</button></div>').join('')+'</div>'+
      '<span class="op-note-label">'+t('HYPOTHESIS TO TEST','待检验的假设')+'</span><p>'+esc(t(c.hypothesisEn,c.hypothesisZh))+'</p>'+
      '<div class="op-action"><b>'+t('Smallest useful experiment','可开展的实验')+'</b><p>'+esc(t(c.experimentEn,c.experimentZh))+'</p></div>'+
      '<details><summary>'+t('What this evidence does not settle','证据尚未解决什么')+'</summary><p>'+esc(t(c.limitEn,c.limitZh))+'</p></details></article>').join('')+'</div></section>';
}

export function renderOpportunities(ctx,db,m) {
  const {t,state:s}=ctx,data=opportunityData(db,m),lens=names[s.insightOpportunity]?s.insightOpportunity:'potential',rows=ordered(data.topics,lens);
  const priorities=rows.filter(r=>r.status==='priority').length;
  return '<section class="op-intro"><div><span class="in-kicker">'+t('FROM OBSERVATION TO A TESTABLE QUESTION','从数据观察，到可检验的问题')+'</span><h2>'+
    t('A living research agenda.','一份可以探索的研究议程。')+'</h2><p>'+t('Find directions where several signals agree, inspect the uncertainty, and choose a next experiment.','寻找多项信号一致的方向，检查不确定性，再决定下一步实验。')+
    '</p></div><div class="op-summary"><strong>'+priorities+'</strong><span>'+t('topics meet the priority rule','个主题符合优先调查规则')+'</span></div></section>'+
    '<div class="op-lens">'+Object.entries(names).map(([id,label])=>'<button data-insight-lens="'+id+'" aria-pressed="'+(id===lens)+'">'+t(...label)+'</button>').join('')+'</div>'+
    '<div class="op-scope"><b>'+t('How to read “priority”','如何理解“优先”')+'</b><p>'+t('This is a research-planning signal. Corpus growth and missing records cannot establish harm severity or real-world urgency. The intersection cards state the deployment conditions under which a question matters.','这是选题与证据核查的优先级。收录增长和缺失记录无法确定危害程度或现实紧迫性；交叉方向卡片会说明问题适用的部署条件。')+'</p></div>'+
    (lens==='intersections'?pairs(ctx,data.pairs):
      '<div class="in-section-head"><div><h2>'+(lens==='potential'?t('Is the signal consistent across time windows?','换一个时间窗口，信号还成立吗？'):t('What should we verify before making a strong claim?','形成强结论前，最值得补查什么？'))+
      '</h2><p>'+(lens==='potential'?t('3, 6 and 12 month checks expose short-lived spikes and changes in direction.','同时检查 3、6、12 个月窗口，识别短期波动与方向变化。'):t('Prioritize checking missing artifacts and the evaluation setup behind growing areas.','优先核查增长方向中的资源缺失记录与评测设置。'))+
      '</p></div></div><div class="op-grid">'+rows.slice(0,6).map(r=>topicCard(ctx,r,lens)).join('')+'</div>'+
      (!rows.length?'<div class="in-empty">'+t('No eligible topic records at this cutoff.','此截止日期下没有符合条件的主题记录。')+'</div>':'')+
      evidenceMatrix(ctx,rows))+
    researchNotes(ctx,m)+'<details class="op-method"><summary>'+t('Show the rule, thresholds and limitations','查看规则、门槛与局限')+'</summary><p>'+t(
      'Exploration index = 45% momentum + 30% recorded resource/evaluation gap + 15% within-window continuity + 10% institutional breadth. Momentum caps each supported 3/6/12-month log₂ share ratio at 1; it averages the supported windows. The gap term is 60% missing code-link share and 40% non-benchmark-form share. Continuity = min(1, 3 × smallest third-window count / recent count). Breadth = min(1, ROR institutions / 10) × ROR-covered paper share. A window with non-increasing raw prevalence contributes zero momentum. Each component is scaled to 0–100.',
      '探索指数 = 45% 动能 + 30% 资源与评测核查信号 + 15% 窗口内持续性 + 10% 机构广度。动能取达到样本门槛的 3/6/12 月份额比的 log₂，截断到 0–1 后平均。核查信号由 60% 未记录代码比例与 40% 非基准类论文比例组成。持续性 = min(1, 3 × 窗口内最少一段的论文数 / 近期数)。广度 = min(1, ROR 机构数 / 10) × ROR 署名覆盖率。原始占比未上升的窗口，其动能贡献为零。各分项均映射到 0–100。')+'</p><p>'+
      t('Priority requires ≥20 recent works, ≥5 previous works, ≥3 recorded ROR institutions, ≥50% ROR coverage, a positive current share change, all supported windows positive, with at least two supported windows, ≥2 works in each of three time bins, and index ≥55. Both raw prevalence and smoothed share must increase. Agreement across windows is a sensitivity check, not statistical significance. Lower-evidence cases stay on the watchlist.',
      '优先调查需要：近期 ≥20 篇、前期 ≥5 篇、ROR 机构 ≥3 个、ROR 署名覆盖 ≥50%、当前份额上升、所有达到样本门槛的窗口都上升，且至少有两个这样的窗口、窗口内三段各 ≥2 篇，以及指数 ≥55。原始占比与平滑份额都必须上升。跨窗口一致性是敏感性检查，不是统计显著性；证据较少的条目保留在观察名单。')+'</p><p>'+
      t('A low benchmark-form share may simply reflect the division of research labor. Verify reusable benchmarks before proposing a new one. Suggested experiments are editorial hypotheses; topic tags and resource records can be incomplete.',
      '基准类论文占比低，也可能只是研究分工的结果。在提出新基准前，应核查已有基准能否复用。实验建议属于编辑提出的假设；主题标签与资源记录可能不完整。')+'</p></details>';
}

function windowEvidence(r,t) {
  return '<div class="in-table-scroll"><table class="in-ranking"><thead><tr><th>'+t('Window','窗口')+'</th><th>'+t('Previous topic / corpus','前期主题 / 全样本')+
    '</th><th>'+t('Recent topic / corpus','近期主题 / 全样本')+'</th><th>'+t('Raw share change','原始占比变化')+'</th><th>'+t('Smoothed share change','平滑份额变化')+'</th></tr></thead><tbody>'+
    r.robustness.windows.map(w=>'<tr><td>'+w.months+t(' months','个月')+'</td><td>'+w.previous+'/'+w.corpusPrevious+'</td><td>'+w.recent+'/'+w.corpusRecent+'</td><td>'+
      (w.rawShareChange===null?'—':(w.rawShareChange>0?'+':'')+(w.rawShareChange*100).toFixed(1)+t(' pp','个百分点'))+'</td><td>'+delta(w.momentum)+
      (w.enoughData?'':' · '+t('small sample','小样本'))+'</td></tr>').join('')+'</tbody></table></div>';
}

export function opportunityEvidence(ctx,db,m,kind,id) {
  const {t,topicName}=ctx,data=opportunityData(db,m),isPair=kind==='opportunity-pair';
  const r=(isPair?data.pairs:data.topics).find(r=>r.id===id);if(!r)return null;
  let ids,extra,name,note;
  if(isPair) {
    const a=pairIdeas[id];name=t(...a.name);ids=[...r.evidence.recentIds,...r.evidence.previousIds];
    extra='<p class="op-question">'+t(...a.question)+'</p><div class="in-evidence-stats"><span><b>'+r.previous+' → '+r.recent+'</b>'+t('jointly tagged works','同时标注两主题的论文')+
      '</span><span><b>'+r.recent+'/'+r.unionRecent+'</b>'+t('recent overlap / union','近期交集 / 并集')+'</span><span><b>'+r.evidence.codeIds.length+'/'+r.recent+'</b>'+t('recent code links','近期有代码链接')+
      '</span></div><div class="op-action"><b>'+t('Suggested experiment','建议实验')+'</b><p>'+t(...a.experiment)+'</p><b>'+t('Measure','观测指标')+'</b><p>'+t(...a.measure)+'</p></div><p class="in-note">'+
      t('These papers share taxonomy labels. Inspect their actual methods before treating them as solutions to the suggested question.','以下论文共享主题标签；需阅读具体方法，才能判断是否已解决上述建议问题。')+'</p>';
    note=t('Jointly tagged papers in the recent and previous windows.','近期与前期窗口内，同时标注这两个主题的论文。');
  } else {
    name=topicName(id);const next=idea(id,t,topicName);
    ids=kind==='opportunity-missing'?r.evidence.recentIds.filter(id=>!r.evidence.codeIds.includes(id)):[...new Set(r.robustness.windows.flatMap(w=>[...w.recentIds,...w.previousIds]))];
    const componentNames=[t('Momentum · 45%','动能 · 45%'),t('Resource / evaluation check · 30%','资源与评测核查 · 30%'),t('Continuity · 15%','持续性 · 15%'),t('Institutional breadth · 10%','机构广度 · 10%')];
    extra='<p class="op-question">'+esc(next.question)+'</p><div class="in-evidence-stats"><span><b>'+r.priority.toFixed(1)+'</b>'+t('exploration index','探索指数')+'</span><span><b>'+r.previous+' → '+r.recent+'</b>'+
      t('previous → recent works','前期 → 近期论文')+'</span><span><b>'+r.counts.codes+'/'+r.recent+'</b>'+t('recent code links','近期有代码链接')+'</span></div>'+
      '<div class="in-breakdown">'+['momentum','gap','sustained','breadth'].map((key,i)=>'<div><span>'+componentNames[i]+'</span><div><i style="width:'+r.components[key]+'%;background:#3c7557"></i></div><b>'+r.components[key].toFixed(1)+'</b></div>').join('')+'</div>'+
      robustness(r,t)+'<p class="in-note">'+t('Displayed percentages are smoothed share changes; green also requires an increase in raw prevalence.','色块百分比展示平滑后的份额变化；绿色还要求原始占比上升。')+'</p>'+windowEvidence(r,t)+'<p class="in-note">'+t('Recent benchmark-form works','近期基准类论文')+': '+r.counts.benchmarks+'/'+r.recent+'; '+t('previous','前期')+': '+r.counts.previousBenchmarks+'/'+r.previous+
      '. '+t('Code-link coverage','代码链接覆盖率')+': '+pct(r.previousCodeRate)+' → '+pct(r.codeRate)+'. '+t('ROR institutions','ROR 机构')+': '+r.institutions+
      ', '+t('paper coverage','论文覆盖率')+' '+pct(r.institutionCoverageRate)+'.</p><div class="op-bins">'+r.bins.map((b,i)=>'<div><span>'+b.start+' — '+b.end+'</span><strong>'+b.count+'</strong></div>').join('')+'</div>'+
      '<p class="in-note">'+t('The bins split the selected window into three consecutive periods. Dates above are start-inclusive, end-exclusive.','将所选窗口分为连续三段；上述日期区间均含起点、不含终点。')+
      '</p><div class="op-action"><b>'+t('Suggested experiment','建议实验')+'</b><p>'+esc(next.experiment)+'</p></div><p class="in-note">'+
      t('The score prioritizes investigation; it does not measure risk severity. Missing code and low benchmark-form share require source verification.','该分数用于安排调查，不衡量风险严重性。代码缺失和基准类占比低都需要回到来源核查。')+'</p>';
    note=kind==='opportunity-missing'?t('Recent papers with no recorded code link.','近期未记录代码链接的论文。'):t('Union of topic papers used by the 3, 6 and 12 month checks; duplicates appear once.','3、6、12 个月检查所用的该主题论文并集，重复论文只展示一次。');
  }
  const wanted=new Set(ids);
  return {row:{name},papers:db.papers.filter(p=>wanted.has(p.id)),extra,note};
}
