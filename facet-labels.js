// Facet labels for the explorer (intake/screening/label_facets.py, rules v2; written by build_findings.py to data/facets.json):
// per work the option indices in the order role, surface, setting, risk, mechanism, evaluation, adaptive, release.
// A paper-list filter is a comma-separated list of key:option pairs ("role:attack,surface:tool_output"); all must hold.
const NAMES = {
  role: {attack: ['Attack', '攻击'], defense: ['Defence', '防御'], benchmark: ['Benchmark', '基准'], measurement: ['Measurement', '测量'],
    analysis_theory: ['Analysis & theory', '分析与理论'], system_tool: ['System & tool', '系统与工具'], survey_position: ['Survey & position', '综述与立场']},
  surface: {direct_instruction: ['Direct instruction', '直接指令'], web_external_content: ['Web & external content', '网页与外部内容'], tool_output: ['Tool output', '工具返回'],
    tool_description_mcp_skills: ['Tool descriptions, MCP, skills', '工具描述·MCP·skills'], memory_retrieval: ['Memory & retrieval', '记忆与检索'],
    multi_agent_communication: ['Agent-to-agent messages', '多智能体通信'], code_system_execution: ['Code & system execution', '代码与系统执行'],
    permissions_credentials: ['Permissions & credentials', '权限与凭证'], training_data_weights: ['Training data & weights', '训练数据与权重'],
    physical_sensing_environment: ['Physical sensing', '物理感知与环境'], human_interface_oversight: ['Human interface & oversight', '人机界面与监督']},
  setting: {web_browser: ['Web / browser', '网页 / 浏览器'], computer_gui_mobile: ['Computer use / GUI / mobile', '电脑 / GUI / 手机'], coding: ['Coding', '编码'],
    general_tool_assistant: ['General tool assistant', '通用工具助手'], mcp_skills_ecosystem: ['MCP / skills ecosystem', 'MCP / skills 生态'],
    rag_memory_assistant: ['RAG / memory assistant', 'RAG / 记忆助手'], multi_agent: ['Multi-agent', '多智能体'], embodied_robot: ['Embodied / robots', '具身 / 机器人'],
    driving_drone: ['Driving / drones', '自动驾驶 / 无人机'], rl_simulator: ['RL in simulators', '模拟器中的 RL'], enterprise_workflow: ['Enterprise workflow', '企业工作流'],
    science_research: ['Science / research', '科研 agent']},
  risk: {external_attacker: ['External attacker', '外部攻击者'], malicious_user: ['Malicious user', '恶意用户'], agent_itself: ['The agent itself', 'agent 自身'],
    non_adversarial: ['Non-adversarial failure', '非对抗性失误']},
  mechanism: {detection_filtering: ['Detection & filtering', '检测与过滤'], prompt_architecture_design: ['Prompt & architecture design', '提示与架构设计'],
    training_alignment: ['Training & alignment', '训练与对齐'], isolation_least_privilege: ['Isolation & least privilege', '隔离与最小权限'],
    information_flow_formal: ['Information flow & formal', '信息流·形式化'], runtime_monitoring: ['Runtime monitoring', '运行时监控'], human_approval: ['Human approval', '人工审批']},
  evaluation: {static_dataset: ['Static dataset', '静态数据集'], simulated_environment: ['Simulated environment', '模拟环境'], real_system: ['Real system', '真实系统'],
    no_experiment: ['No experiment', '无实验']},
};
const TITLES = {role: ['Contribution role', '贡献角色'], surface: ['Attack entry point', '攻击入口'], setting: ['Agent setting', '智能体类型'], risk: ['Risk source', '风险来源'],
  mechanism: ['Defence mechanism', '防御机制'], evaluation: ['Evaluation setting', '评测方式']};
export const FACET_KEYS = Object.keys(TITLES);
let facets = null, loading = null;

export function loadFacets() {
  loading ??= fetch('./data/facets.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(d => { facets = d; return d; });
  return loading;
}
export const facetsReady = () => !!facets;
export const facetAudit = () => facets?.audit || null;  // the second-model check of the labelling rules
export const facetTitle = (t, key) => t(...TITLES[key]);
export const facetName = (t, key, opt) => (NAMES[key]?.[opt] ? t(...NAMES[key][opt]) : opt);
// options in the order of data/facets.json
export const facetOptions = key => facets?.fields?.[key] || [];
// the options a work carries for one key; null when the work has no labels
export function facetValues(id, key) {
  const row = facets?.works?.[id];
  if (!row) return null;
  const v = row[facets.order.indexOf(key)], opts = facets.fields[key];
  return (Array.isArray(v) ? v : v >= 0 ? [v] : []).map(j => opts[j]);
}
export function facetMatch(id, filter) {
  return String(filter).split(',').filter(Boolean).every(pair => { const [key, opt] = pair.split(':'); return (facetValues(id, key) || []).includes(opt); });
}
export function facetChip(t, filter) {
  return String(filter).split(',').filter(Boolean).map(pair => { const [key, opt] = pair.split(':'); return `${facetTitle(t, key)}: ${facetName(t, key, opt)}`; }).join(' · ');
}
