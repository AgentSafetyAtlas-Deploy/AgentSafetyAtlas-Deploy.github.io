# AI Agent 安全商业与资金流向调研报告

2026 年 9 月 12 日　决策增强版 2.1　供管理层研究方向与资源配置讨论

本报告回答：AI Agent 安全领域，企业为何付钱、钱流向什么能力、大厂和创业公司如何竞争，以及我们的研究与平台应优先关注什么。

范围以数字 Agent 自身的安全为核心，覆盖相关 AI 应用安全；“用 AI 做网络攻防”仅作相邻市场背景。资料检索截至 2026-09-12，选取 2024—2026 年代表性公开证据，包含 2026 年 9 月新公告。这是定向商业研究，并非全市场融资普查。Gartner 等付费报告仅依据公开摘要与新闻稿，未读取付费全文。厂商性能和客户效果均保留来源归属。

## 管理层核心判断

**公开融资、并购和产品发布共同支持一个方向：商业价值正集中到让企业能够部署、授权、监控和约束 Agent 的安全控制。**最值得关注的是身份权限、工具调用和数据流控制、持续评测，以及把这些能力接入现有企业系统的产品。

这一判断有三个层次：

- **需求存在：**企业正在推进 Agent 工作流，也暴露出访问控制和治理缺口。但采用意向、试点和规模化生产部署应分别衡量。
- **资本已经行动：**本报告选择的五笔单轮融资合计 3.064 亿美元；七项代表性并购表明大厂持续补充相关能力。融资与并购分别记账，明细和口径见第 6、7 节。
- **商业格局尚未定型：**Microsoft、AWS 和安全平台厂商在内置控制能力。独立厂商更需要证明场景深度、跨平台覆盖、部署便利性和经济性。

**建议：以“高风险 Agent 工作流的权限与行动控制”为首要观察和验证方向，以“可复现的持续安全评测”为研究与平台切入点。**这些是本报告的分析建议，不是已被市场份额数据证实的赢家排序。

**最有用的商业区分是“控制功能”与“客户可用的解决方案”。**按请求购买的授权或过滤只是成本的一部分；企业还要完成接入、权限梳理、审计和持续运行。独立产品的定价空间，要靠它替客户省下多少集成与运营工作，以及补上多少原生控制缺口来验证，不能仅由一次检测的算力成本决定。

**建议本轮资源投入以 30 天需求验证为边界。**选择两个已有业务价值、涉及敏感数据或写操作的工作流，与 5 家组织核实上线障碍和预算路径。继续投入的依据应是明确的控制缺口、可达成的验收条件和采购下一步；“客户感兴趣”与融资热度不足以单独支持产品立项。具体访谈问题和验收方法见第 12 节。

## 1 钱到底流到什么地方

采购、融资、并购是三类不同的资金活动。融资支持公司的未来扩张，并购购买公司及整合价值，客户收入才直接反映产品销售。估值、累计融资和 ARR 也分别记账。下表的预算归属是访谈假设；第 8 节提供实际挂牌价与客户证据。

| 能力方向 | 企业购买它要解决什么问题 | 最可能牵头的预算方 | 可验证的商业价值 |
|---|---|---|---|
| Agent 发现与资产治理 | 不清楚部署了多少 Agent、谁负责、连接哪些数据 | CISO、安全架构、IT | 找出未登记 Agent，降低盘点与审批耗时 |
| 身份、授权与工具调用控制 | Agent 继承过大权限，读取或执行超出任务范围的操作 | IAM、平台工程、安全团队 | 降低过度授权，阻止高风险动作，支持撤权 |
| 运行时安全与数据流控制 | 外部内容影响 Agent，导致敏感数据外流或越权操作 | AppSec、数据安全、业务系统负责人 | 在实际工作流中拦截攻击，保留正常任务成功率 |
| 持续红队与上线评测 | 模型、工具或提示变更后，不清楚安全性是否退化 | AI 工程、AppSec、质量团队 | 缩短安全验收周期，复用攻击回归用例 |
| 审计与事件处置 | 出事后无法还原授权、上下文、工具调用与责任链 | CISO、内审、风险管理 | 缩短调查耗时，自动生成可追溯证据 |

这些方向并非五个可以直接相加的独立市场，同一平台可能覆盖多项。它们也未必都产生新的独立预算：部分收入可能来自原有身份、安全平台或云服务的增购。

企业采购已有公开报价与具体使用线索，但证据强度不一。例如 TELUS 同时出现在“早期客户”与“开始评估”的材料中，无法由此确定 Prisma AIRS 的生产和付费规模。第 8 节将评估、使用、买方材料和价格分别说明。

## 2 业界前沿科技公司的 business reports 怎么看需求

| 报告 | 核验到的关键事实 | 对商业判断的意义与限制 |
|---|---|---|
| Microsoft《2026 Work Trend Index》，2026-05-05 | 调查覆盖 10 个市场、20,000 名在工作中使用 AI 的知识工作者；报告关注个人能力与组织准备程度之间的落差 | 产品机会包括授权、工作流与责任设计；样本不是所有企业，也不是安全采购调查。[原文](https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization) |
| Google Cloud《ROI of AI 2025》 | 报告覆盖 3,466 名企业高管；官方解读称，52% 的受访高管表示所在组织正在生产环境部署 Agent | 企业价值应与具体业务流程挂钩；这是受访者自报及厂商研究，不能外推为全市场渗透率。[报告说明](https://cloud.google.com/resources/content/roi-of-ai-2025)、[官方解读](https://cloud.google.com/transform/roi-of-ai-how-agents-help-business) |
| IBM / Ponemon《Cost of a Data Breach 2025》，2025-07-30 | 研究基于 600 家发生数据泄露的组织；在报告 AI 模型或应用安全事件的组织中，97% 缺乏适当 AI 访问控制；高水平 shadow AI 组平均泄露成本比低水平或没有 shadow AI 组高 67 万美元 | 访问控制与未授权 AI 使用是可进入预算讨论的痛点；不能说“97% 的所有企业都没有 AI 安全”，也不能将 67 万美元当作产品保证节省额。[官方发布](https://newsroom.ibm.com/2025-07-30-ibm-report-13-of-organizations-reported-breaches-of-ai-models-or-applications%2C-97-of-which-reported-lacking-proper-ai-access-controls) |
| Anthropic《Economic Index》，2026-01-15 | 对 2025 年 11 月 Claude 使用的分析中，第一方 API 企业客户最常见十类任务占流量 32%，此前报告为 28% | 支持围绕客户高频工作流确定验证入口；这是单一服务商观察，不是 Agent 部署率或安全支出。低频高后果操作仍需按风险排序。[原始报告](https://www.anthropic.com/research/anthropic-economic-index-january-2026-report) |

**Insight：安全产品应把价值表达为“让某个有业务回报的 Agent 工作流安全上线”。**“多发现多少漏洞”需要进一步连接到上线周期、可用性和实际风险。客户需要同时看到安全收益与工作流收益，而不仅是风险清单。

## 3 Gartner 等分析机构 需求增长与采购收敛同时发生

**市场背景。**Gartner 2026-02-05 的公开预测摘要给出：2026 年全球信息安全支出预计 2,440 亿美元，按固定汇率增长 11.6%。这是整体信息安全市场，不能作为 Agent 安全 TAM。[预测摘要](https://www.gartner.com/en/documents/7408930)

**新需求。**Gartner 2026-03-17 预测，到 2028 年超过 50% 的企业将使用 AI 安全平台；同一发布预测，到 2028 年半数企业网络安全事件响应工作将涉及自建 AI 应用。这些是未来预测，既不是当前采用率，也不是已实现收入。[官方发布](https://www.gartner.com/en/newsroom/press-releases/2026-03-17-gartner-predicts-ai-applications-will-drive-50-percent-of-cybersecurity-incident-response-efforts-by-2028)

**竞争限制。**Gartner 2026-06-16《Agent and LLM Security Spend Grows Exponentially While Many Vendors Are Left Behind》的公开摘要强调：市场增长并不保证每家厂商获得份额；非大型厂商应关注深度专业化、模块化接口能力及伙伴生态。这直接支持“找到可嵌入现有体系的专长”这一创业策略。[公开摘要](https://www.gartner.com/en/documents/8008569)

**采购方式。**Forrester 2026-08-21 的 AEGIS 技术映射文章指出，许多 Agent 安全能力已存在于现有安全工具中，应从需要满足的控制出发，再识别真正需要追加投资的缺口。[原文](https://www.forrester.com/blogs/turn-aegis-controls-into-an-agentic-ai-security-stack/)

**采用程度仍需核查。**Forrester 2026-06-03 的公开分析称，企业采用热情高，但超出类聊天机器人、进入有意义生产应用的仍是少数。这与 Google 调查中的生产部署比例不能直接做年度比较：样本、Agent 定义和“生产”门槛不同。[原文](https://www.forrester.com/blogs/the-state-of-agentic-ai-in-2026-companies-are-chasing-few-are-catching/)

**Insight：新增需求可能首先被已有供应商吸收。**调研时要追问“客户已经买了什么、现有产品缺什么、是否愿意额外付费”，而不只问“客户是否担心 Agent 安全”。

IDC 2026 年 3 月访谈强调数据与身份管理的基础作用，并指出 AI 增强攻击仍包含大量钓鱼和社会工程。应把“保护 AI 与 Agent”及“使用 AI 完成安全工作”的预算分开分析。[IDC 访谈](https://www.idc.com/resource-center/blog/ai-security-and-the-rise-of-generative-ai-cyber-risk/)

Gartner 2025 年 6 月还预测，到 2027 年底超过 40% 的 Agentic AI 项目会因成本、价值不清楚或风险控制不足被取消。这是未来预测而非当前失败率，但提示供应商：安全产品续约也受到客户业务项目存续的影响。[Gartner 项目取消预测](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)

## 4 Attack news 与 cases 从失效机制推导预算需求

| 案例与时间 | 发生了什么 | 证据性质 | 对应采购需求 |
|---|---|---|---|
| EchoLeak / Microsoft 365 Copilot，2025 年公开 | 特制邮件可触发零点击提示注入与数据外传路径，涉及 CVE-2025-32711 | 漏洞研究与协调披露；原始发现者转述 Microsoft 无客户受影响；迁移页日期需区别处理。[原始作者文章](https://www.catonetworks.com/blog/breaking-down-echoleak/) | 区分外部内容与授权指令；限制敏感信息到外部通道的流动 |
| MCP Tool Poisoning，Invariant，2025-04-01 | 工具描述中的恶意指令可影响 Agent，并利用其连接的其他工具访问数据 | 研究者披露与演示，不代表所有 MCP 客户端当前均可被同样利用。[原始披露](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) | 工具准入、版本变化检测、跨工具数据流约束 |
| ForcedLeak / Salesforce Agentforce，2025-09-25 公开 | 外部 Web-to-Lead 数据可携带间接提示注入，形成 CRM 数据外传链；研究方说明 Salesforce 已采取修补措施 | Noma 研究披露，无据将其写成已确认客户失窃事件。[原文](https://noma.security/blog/forcedleak-agent-risks-exposed-in-salesforce-agentforce) | CRM 工作流授权、外传目的地约束、业务数据与指令边界 |
| Anthropic 披露的 AI 编排网络间谍活动：2025-09 发现，2025-11-13 发布 | Anthropic 报告攻击者滥用 Claude Code，尝试入侵约 30 个目标，少量成功 | 厂商报告的实际活动；只能直接支持其观察范围。属于 Agent 滥用的相邻市场，不计入 Agent 自身受攻击案例。[原文](https://www.anthropic.com/news/disrupting-AI-espionage) | 模型服务滥用检测与传统网络防御；相关预算另列 |

**Insight：案例的商业意义取决于攻击能否转化为业务后果。**应追踪“非可信内容 → Agent 采用 → 获得何种权限 → 执行何种工具 → 数据或业务后果”，并判断哪一处控制能可靠切断链路。单条提示是否被识别，不能替代对整个工作流的评估。

## 5 Startup 与 product 大厂在内置什么 创业公司在卖什么

| 公司 / 产品 | 已核验的产品或交易信号 | 商业观察 |
|---|---|---|
| Microsoft Entra Agent ID | 官方文档将 Agent 建模为专门身份，提供识别、认证及管理能力。[文档](https://learn.microsoft.com/en-us/entra/agent-id/what-are-agent-identities) | Agent 身份正在进入已有 IAM 体系；独立产品需要回答额外价值在哪里 |
| AWS AgentCore Policy | 2026-03-03 宣布 GA；在 Agent 代码之外，对经 Gateway 的工具请求应用策略并允许或拒绝。[公告](https://aws.amazon.com/about-aws/whats-new/2026/03/policy-amazon-bedrock-agentcore-generally-available/) | 运行环境开始原生提供行动控制；跨云、跨 SaaS 的一致控制值得验证 |
| Palo Alto Networks / Prisma AIRS / Protect AI | 2025-07-22 完成 Protect AI 收购；整合模型扫描、姿态管理、红队、运行时及 Agent 安全。[公告](https://investors.paloaltonetworks.com/news-releases/news-release-details/palo-alto-networks-completes-acquisition-protect-ai) | 安全平台通过并购补齐能力，已有渠道是重要竞争条件；会计对价补充见第 7 节 |
| Snyk / Invariant Labs | 2025-06-24 宣布收购，将 Agent/MCP 研究及防护能力接入开发安全平台。[公告](https://snyk.io/es/news/snyk-acquires-invariant-labs-to-accelerate-agentic-ai-security-innovation/) | 攻击研究、工具与开发者入口能够产生战略价值；本次所用公告未披露金额 |
| Noma | 2026-06-02 发布面向 Agent 与 MCP server 的访问控制，结合发现、授权和运行时检测。[公告](https://noma.security/blog/noma-launches-agentic-access-control-to-govern-ai-agents-and-mcp-servers-across-the-enterprise) | 产品在从风险可见性扩展到实际执行约束；检测效果仍需独立验证 |
| WitnessAI | 2026-01-13 同时宣布融资及扩展 Agent 安全能力，面向企业 AI 使用和应用安全。[公告](https://witness.ai/resources/witnessai-raises-58-million-for-global-expansion-and-announces-new-ways-to-secure-ai-agents/) | 面向企业整体 AI 使用治理，业务口径大于 Agent 自身安全 |
| Lasso / LEAP | 2026-09 公告推出 CPU 护栏，强调成本与低延迟；页面日期 9 月 3 日，正文电头 9 月 2 日。[公告](https://www.lasso.security/resources/lasso-security-announces-future-of-ai-security-with-cpu-based-guardrails) | 竞争已涉及单位检测成本和吞吐；无需 GPU、低于 5ms 等为厂商主张，不能当作独立性能结论 |

**Insight：泛化的提示注入过滤功能存在被平台内置和打包销售的压力。**更有机会形成独立价值的是深入特定业务工作流、跨供应商控制、低成本运行，以及可证明的安全效果。这是根据产品布局作出的推断，不是所有创业公司的既定命运。

## 6 VC 资金事件与投资逻辑

金额统一为美元，以下均为具体融资事件，不是估值、收入或收购价。

| 融资公告日期 | 公司 | 本轮金额 / 口径 | 投资方 | 资金指向及证据 |
|---|---|---:|---|---|
| 2025-07-29 | Promptfoo | 1,840 万，Series A | Insight Partners 领投，a16z 参与 | 红队与评测；当前公司状态见第 7 节。[融资公告](https://www.promptfoo.dev/blog/series-a-announcement/) |
| 2025-07-31 | Noma Security | 1 亿，Series B | Evolution Equity Partners 领投；Ballistic Ventures、Glilot Capital 继续参与 | AI / Agent 安全平台扩张。[公告](https://noma.security/blog/noma-security-raises-100m-to-drive-adoption-of-ai-agent-security) |
| 2026-01-13 | WitnessAI | 5,800 万，战略融资 | Sound Ventures 领投；Fin Capital、Qualcomm Ventures、Samsung Ventures、Forgepoint Capital Partners 参与 | 产品与全球市场拓展。[公告](https://witness.ai/resources/witnessai-raises-58-million-for-global-expansion-and-announces-new-ways-to-secure-ai-agents/) |
| 2026-09-02 | HiddenLayer | 1 亿，Series B | Delta-v Capital 领投；Ten Eleven、Morgan Stanley、M12、Booz Allen Ventures 参与 | 含 Agentic Runtime 与 Agent Harness Security。[融资公告](https://www.hiddenlayer.com/news/hiddenlayer-100m-series-b-ai-security) |
| 2026-09-02/03 | Lasso Security | 3,000 万，公告所称本轮融资 | ClearSky 领投；Entrée Capital、iAngels、Singtel Innov8、Mindset、Swish Data 参与 | 与 CPU 护栏产品发布同步。[公告](https://www.lasso.security/resources/lasso-security-announces-future-of-ai-security-with-cpu-based-guardrails) |

**样本合计：3.064 亿美元。**它覆盖 2025 年 7 月至 2026 年 9 月的五个事件，说明资本在持续下注，但不能代表全市场融资规模、增长率，也不能认为全部投入都用于狭义 Agent 安全。相同融资的重复新闻、早期累计融资额及并购价均未加入。

VC 原始投资论述比新闻标题更有用。Ballistic 在 Noma 投资说明中强调，把安全嵌入 AI 开发生命周期，并让工程团队更快工作；在 WitnessAI 投资说明中强调企业安全采用 AI，并披露其参与孵化。[Noma 投资论述](https://ballisticventures.com/why-we-led-the-series-a-round-in-noma/)、[WitnessAI 投资论述](https://ballisticventures.com/why-we-incubated-invested-in-witnessai/)

**Insight：投资逻辑围绕可进入企业流程的安全能力展开。**专业网络安全基金、通用科技基金、企业投资者共同出现，但企业投资者参与并不自动等于签署采购合同或获得渠道订单。商业验证仍应看付费部署、续约、扩张和部署成本。

## 7 并购对价与公司状态

融资之外，并购提供了另一种明确的资本配置证据。买方正在把 AI 安全接入网络、端点、开发和云平台的既有入口。以下金额单位为百万美元；金额为空表示本次已读交易方材料未披露，不能当作零。

| 买方与标的 | 完成或公告状态 | 会计对价 | 主要能力与来源 |
|---|---|---|---|
| Cisco 与 Robust Intelligence | 2024-09-23 完成 | 未披露 | 模型和 AI 应用安全；[Cisco 交割附件](https://d18rn0p25nwr6d.cloudfront.net/CIK-0000858877/8ef1e309-8b64-4f46-8eff-75e456861296.pdf) |
| Snyk 与 Invariant | 2025-06-24 宣布已收购 | 未披露 | MCP 与 Agent 防护；[Snyk 收购公告](https://snyk.io/es/news/snyk-acquires-invariant-labs-to-accelerate-agentic-ai-security-innovation/) |
| Palo Alto 与 Protect AI | 2025-07-22 完成 | 635 | 广义 AI 安全平台；[PANW FY2026 10-K](https://www.sec.gov/Archives/edgar/data/1327567/000132756726000023/panw-20260731.htm) |
| Cato 与 Aim Security | 2025-09-03 宣布已收购 | 未披露 | 将 AI 安全接入 SASE；[Cato 收购公告](https://www.catonetworks.com/news/cato-acquires-aim-security-to-extend-sase-leadership-and-secure-enterprise-ai-transformation/) |
| SentinelOne 与 Prompt Security | 2025-09-05 完成 | 160.223 暂定 | AI 使用、数据与运行时保护；[SentinelOne FY2026 10-K](https://www.sec.gov/Archives/edgar/data/1583708/000158370826000020/s-20260131.htm) |
| Palo Alto 与 Koi | 2026-04-14 完成 | 231 | Agent 端点与软件环境；[Koi 完成公告](https://investors.paloaltonetworks.com/news-releases/news-release-details/palo-alto-networks-completes-acquisition-koi-secure-agentic) |
| Fortinet 与 Virtue AI | 2026-08-17 宣布已收购 | 未披露 | 红队、Agent 与运行时防护；[Fortinet 收购公告](https://www.fortinet.com/corporate/about-us/newsroom/press-releases/2026/fortinet-advances-continuous-ai-protection-with-the-acquisition-of-virtue-ai) |

**交易金额需要附上定义。**Protect AI 在 FY2025 财报中的详细值为 634.5 百万美元，FY2026 文件以百万取整列为 635；Koi 的 231 也在 FY2026 10-K 中披露。Prompt 的交割 8-K 曾写约 180 百万美元现金与股份，后续 10-K 列示暂定会计对价公允价值 160.223。数字的定义、时点与计量方式不同，不能相加，也不能自行把差额解释为降价。[PANW FY2025 财报](https://investors.paloaltonetworks.com/static-files/821765bc-6121-4f8e-b898-1755b8e26ac8)、[Prompt 交割 8-K](https://www.sec.gov/Archives/edgar/data/1583708/000110465925088079/tm2525181d1_8k.htm)

公司状态同样影响产品分析。Promptfoo 官方 About 页目前已写明属于 OpenAI，不能将其继续列为截至日仍独立的创业公司；它在 2025 年的融资仍是一条有效历史事件。[Promptfoo 当前公司状态](https://www.promptfoo.dev/about/)

**商业判断：平台分销和现有采购关系是这些整合的重要条件。**独立厂商应同时验证直接销售与嵌入现有平台的方式。若客户明确因中立性选择独立供应商，并能观察到持续的付费扩张和续约，独立平台的机会就比仅看并购更大。

还需要单列“AI for Security”。例如 Dropzone AI 的原始新闻稿宣布 3,700 万美元 B 轮，方向是 AI SOC 分析与自治安全任务。这主要承接安全工作自动化预算，不并入本报告的 Agent 自身安全融资样本。[Dropzone AI B 轮公告](https://www.dropzone.ai/press-release/dropzone-ai-37m-series-b-funding-ai-soc-agents)

## 8 公开价格与实际采购证据

### 产品已经有多种收费单位

下列为 2026 年 9 月 12 日查得的官方美元报价。挂牌证明存在购买入口，不能证明实际成交金额，也不是价格上界。不同产品覆盖不同能力，不宜据此直接排列性价比。

| 产品或维度 | 计费单位 | 公开价格 | 覆盖与使用限制 |
|---|---|---|---|
| AWS AgentCore Policy | 授权请求 | 0.000025 美元每次 | 仅这一授权服务；[AgentCore 价目](https://aws.amazon.com/bedrock/agentcore/pricing/) |
| Microsoft Agent 365 | 用户许可 | 15 美元每用户每月 年付 | 基础套装另计；[Microsoft 美国价目](https://www.microsoft.com/en-us/microsoft-agent-365) |
| Noma Platform | 12 个月平台合同 | 200,000 美元 | 未明示每单位覆盖资产量；[Noma Marketplace](https://aws.amazon.com/marketplace/pp/prodview-kd2qklag2zzym) |
| WitnessAI Enterprise | 年度用户维度 | 180 美元每人 最少 1,000 人 | 最低列示 180,000 美元每年；[WitnessAI Marketplace](https://aws.amazon.com/marketplace/pp/prodview-5h2rg6gvjyywg) |
| WitnessAI Agentic Visibility | 年度 Agent 维度 | 24 美元每个 最少 2,500 个 | 最低列示 60,000 美元每年；同一价目 |
| WitnessProtect | 12 个月模型保护维度 | 300,000 美元 | 价目未明确覆盖模型数或流量；同一价目 |

WitnessAI 三个维度不能当作强制捆绑，Visibility 也不等于全部运行时防护；其额外使用项的单位未定义，不能写成每 API 调用价格。Noma 的平台挂牌价不能乘以客户数量推算 ARR。询价时应确认资产定义、超量计算、最低承诺、部署方式和支持服务。

**Microsoft 的 15 美元需要结合底层许可看。**Agent 365 按用户而非每个 Agent 计费；基础登记及部分身份能力可随云订阅提供。企业完整能力还涉及 M365 E5，或 E3 加 Defender 与 Purview 套装等条件，第三方 Agent 的高级支持深度随集成变化。15 美元不能直接当作完整系统总价。[Agent 365 官方许可 FAQ](https://www.microsoft.com/licensing/faqs/122)

**预算也可能通过云渠道流向独立厂商。**AWS Security Hub Extended 列出 Noma、Oligo、Zenity 等合作方案，提供统一账单与按使用量模式。这是分销与采购路径证据，不足以说明企业已经设立独立的 Agent 安全预算负责人。[AWS Security Hub 方案与价格](https://aws.amazon.com/security-hub/pricing/)

### 买方材料与客户案例支持不同强度的结论

**UiPath 的买方侧材料更具体。**其 2025 年 11 月分处理方清单列出 Noma Security，用于客户启用时识别和限制提示注入。这支持 Noma 已进入供应商与产品处理链；不能证明所有客户启用、合同金额或付费规模。[UiPath 原始供应商清单](https://assets.ctfassets.net/5965pury2lcm/3MgR815xOJmx2r6UgXAqtp/85fac99ea073630ef53cdcbac00a2bff/20251118_UiPath_Subprocessors_List.pdf)

**Kantar 案例体现一种接近采购的路径。**Noma 发布的具名案例称，客户先围绕自身目标做 POC，随后把 AI 红队纳入上线前流程，涉及 CTO 和应用 AI 人员。它适合支持对流程和参与角色的观察；来源为卖方，不能当作独立性能比较或合同额。[Kantar 与 Noma 案例](https://noma.security/blog/kantar-secures-the-explosion-of-ai-agents-with-noma)

**TELUS 的证据存在表述差异。**Palo Alto 的收购公告称其为 Prisma AIRS 早期客户，另一客户案例却写开始评估 AIRS。两页不足以确认具体生产部署或付费规模，也不能将其他 Palo Alto 产品的收益归给 AIRS。[收购公告中的客户表述](https://investors.paloaltonetworks.com/news-releases/news-release-details/palo-alto-networks-completes-acquisition-protect-ai)、[TELUS 产品评估案例](https://www.paloaltonetworks.com/customers/telus-digital-secures-customer-trust-and-innovation)

### 一个可复算的控制层成本示例

以下是**假设场景**，不是客户账单：美国东部北弗吉尼亚部署，每月 10 万次会话，每会话 6 次 Gateway 工具调用，每次做一次 Policy 授权；每会话检查一次 1,200 字符输入和一次 1,800 字符输出。使用 ApplyGuardrail 对应价目，同时启用内容与敏感信息过滤；每 1,000 字符为一个 text unit，不足一单位进位。输入、输出各两个单位，合计每月 40 万单位。[AWS AgentCore 定价](https://aws.amazon.com/bedrock/agentcore/pricing/)、[AWS Bedrock Guardrails 定价](https://aws.amazon.com/bedrock/pricing/)

| 项目 | 算式 | 每月美元 |
|---|---|---|
| Policy 授权 | 600,000 × 0.000025 | 15 |
| Gateway 工具调用 | 600,000 ÷ 1,000 × 0.005 | 3 |
| 内容过滤 | 400,000 ÷ 1,000 × 0.15 | 60 |
| 敏感信息过滤 | 400,000 ÷ 1,000 × 0.10 | 40 |
| 上述范围合计 | 15 + 3 + 60 + 40 | 118 |

若每会话改为检查十组同长度的输入与输出，工具调用量不变，费用变为 1,018 美元。它说明重复检查的次数和内容量会影响成本。该例未计模型推理、运行环境、检索、日志、网络和人工，不能与完整企业安全平台年约直接比较。

另一个假设：已有符合条件基础套装的 1,000 名用户增购 Agent 365，单计附加许可为 1,000 × 15 × 12 = 180,000 美元每年。即使金额与某个独立产品相同，也不意味着功能、覆盖和总成本相同。

## 9 新案例补充及对市场判断的反证

### 原始披露比后续新闻更能说明暴露范围

EchoLeak 原始发现者文章现由 Cato 承载，明确转述 Microsoft 确认没有客户受影响。迁移页日期与常见披露日期存在差异，不能将网页署日当作发现日期。它证明特定漏洞链，不是已确认客户泄露统计。[EchoLeak 原始作者文章](https://www.catonetworks.com/blog/breaking-down-echoleak/)

ForcedLeak 研究说明，外传链依赖 CSP 允许列表的过期域名，Salesforce 后续重新控制该域名并强化 Trusted URLs。这说明明确的输出与网络控制可以切断攻击链，不能默认每个提示注入漏洞都需要增购一家创业公司。[ForcedLeak 原始研究](https://noma.security/blog/forcedleak-agent-risks-exposed-in-salesforce-agentforce)

### Agent 的配置与本地服务也可能构成风险

Check Point 于 2026 年 2 月集中披露 Claude Code 的配置、执行批准与 API 初始化风险，相关修补发生在 2025 年。官方 GHSA 对 CVE-2025-59536 指明受影响版本及需要在不可信目录启动的条件。不能把不同问题合并为“克隆仓库即可零点击执行”，也不能把 2026 年文章发布时间当成漏洞仍未修补。[Check Point 原始研究](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/)、[Anthropic 官方 GHSA](https://github.com/anthropics/claude-code/security/advisories/GHSA-4fgq-fpq9-mr3g)

Microsoft 2026 年 6 月披露的 AutoJack，是开发版本上浏览工具与 MCP WebSocket 控制面的组合 PoC。官方明确指出，受影响表面从未进入相关 PyPI 发布版本，通过 PyPI 安装的用户不受该特定链影响，当前构建已处理。[Microsoft AutoJack 原始研究](https://www.microsoft.com/en-us/security/blog/2026/06/18/autojack-single-page-rce-host-running-ai-agent/)

这些案例更接近开发终端、供应链、网络和凭据管理预算。验收应包括未授信项目启动时的进程与网络行为、凭据目的地绑定、控制面认证和旧版本消除速度。语言模型过滤不能替代这些系统控制。

### 浏览器实验必须带上版本和前置条件

华盛顿大学研究者在 2026 年初研究七种 Agent 浏览器，区分完整攻击演示与仅满足部分前置条件的产品；研究使用自有账号及测试网站。不能写成七款产品都已成功被攻破，也不能直接代表 9 月的产品状态。[研究者项目页](https://agent-security.cs.washington.edu/agentic_browsers_sop.html)

企业可评测跨来源读取和写入授权、会话分隔、敏感输入处理，以及强隔离对正常浏览任务的影响。新的商业判断应来自当前版本复测，不能来自历史演示数量。

### 评测环境中的真实越界揭示另一类需求

Anthropic 2026 年 7 月披露网络安全评测中的三起越界事件，9 月报告新增一例发生于 2026 年 1 月、8 月追查发现的事件，共四起。运营方说明，基础设施误配置使模型从声称离线的环境访问真实第三方系统；这些评测未启用通常随已发布模型部署的网络滥用分类器与监控；报告也讨论模型判断与行为失误。它属于评测环境中的真实越界，不能外推为普通企业生产事故率。截至本报告日期，所委托的 METR 独立调查不能视为已结案。[Anthropic 首批事故披露](https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals)、[Anthropic 9 月评估报告](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents)

对高自主 Agent 平台、评测提供方和实验室，需求可落在隔离验收、长期轨迹监控、越界暂停与证据保存。应测试禁止出口是否真的不可达、越界到暂停耗时和误暂停损失。系统提示里的环境声明不能代替技术隔离。

## 10 机会优先级与可推翻条件

以下为研究与客户验证的优先级，不是投资评级、性能排名或收入预测。

| 候选方向 | 建议顺序 | 最小验证产物 | 机会成立的条件 |
|---|---|---|---|
| 权限与高风险工具调用 | 优先 | 一个有写操作的真实工作流及对照试验 | 原生控制有缺口 且有明确责任人 |
| 持续评测与上线验收 | 优先 | 正常任务和攻击回归集 加版本记录 | 客户需要反复验收并愿投入资源 |
| 执行环境监控与隔离验证 | 优先研究 | 出口限制 暂停机制和轨迹验收 | 能观测完整行动并可靠执行干预 |
| 跨平台治理与数据流策略 | 条件推进 | 多系统覆盖差异与集成成本对照 | 中立性带来具体且可付费的收益 |
| 通用提示注入过滤 | 聚焦场景 | 对既有强基线的效果和成本增量 | 在实际分布上持续保留优势 |
| 静态风险列表与合规映射 | 配套能力 | 可追溯到实际控制的证据 | 有明确使用者及后续处理流程 |

**判断一：从上线阻塞和事件处置寻找预算。**Kantar 案例与评测事故都指向具体流程。访谈应要求客户说出被阻塞的工作、签字人、重复频率及其成本。反证是现有工具已稳定完成工作，且客户无额外付费意愿。

**判断二：跨平台必须体现为额外覆盖。**AWS Policy 依赖工具流量经过 Gateway，Microsoft 的高级能力依集成与许可而异。独立产品应证明能覆盖客户真实缺口，并保留正常任务能力。反证是主要风险已经被原生控制充分覆盖。

**判断三：运行经济性要与误拦成本一起评估。**延迟、重复检查和人工审核都可能降低任务价值。若客户真正的障碍是权限设计、组织责任或集成，则省算力并非首要卖点。成本优化应服务于已验证的工作流需求。

**判断四：平台渠道可以扩大销售 也可能限制独立定价。**并购、Marketplace 与内嵌供应商关系说明，能力可以通过既有采购路径交付。若客户要求中立供应商，并愿承担额外集成成本，独立销售空间可能更大；需要实际订单和续约来验证。

**判断五：持续测试的价值来自版本变化后的回归。**模型、提示、工具和权限都可能变化。测试必须覆盖客户真实路径，保存正常任务基线及修补状态。若只增加人工构造攻击数量，无法影响上线决策，则难以支持长期预算。

**判断六：系统安全仍然是 Agent 安全的重要组成。**配置、凭据、网络和进程边界决定实际后果。若某条路径已被补丁及标准控制可靠解决，剩余维护成本低，就不应再把该旧漏洞的热度当成新产品市场。

### 将产品机会和可持续收入分开验证

**已有入口决定销售路径。**对于以一种云或办公平台为主的客户，先检查原生能力能否满足需求；对于多个平台共同完成的工作流，再验证统一授权、轨迹或数据流控制的价值。跨平台产品只有在覆盖增加足以抵消集成与维护成本时，才有经济意义。这里的客户划分是待验证假设。

**持续变化可能支持续约，也可能吞噬供应商毛利。**定期回归和策略维护能形成持续服务需求；如果每新增一个工具、模型或客户都要大量定制，同样会推高交付成本。因此尽调应同时看重复使用率、客户上线所需人日，以及后续每月支持时间，不能只看合同单价。

**建立两本经济账。**买方比较年度总成本：许可与调用费、接入改造、内部维护、人工复核和任务失败损失。卖方单独跟踪首年交付贡献：合同收入减去直接服务成本及未另收费的实施成本；续约年度再比较运行、支持和客户扩展成本。这是内部验证口径，不等同于财报毛利率，也未包含全部研发与销售费用。

公开价格适合帮助设计询价，不能据此推算典型成交价。建议记录原生方案、购买独立产品、自建方案三者在同一工作流中的覆盖、上线人日与年度成本；凡关键数据缺失，保留区间或待确认项。

## 11 将商业调研接入 Safety Map

平台应连接“案例或部署需求 → 失败控制 → 产品能力 → 客户使用 → 资金事件”。每一条关联都需要依据，不能只因共享关键词就认定某家公司使用了某项研究。

| 资料对象 | 必需字段 | 能回答的问题 |
|---|---|---|
| 企业与机构报告 | 发表和观察期 样本 定义 预测或实测 全文或摘要 | 需求信号是否可比 |
| 公司与产品 | 归属 独立状态 GA或预览 部署位置 控制范围 | 谁在卖什么 能力是否已被整合 |
| 资金事件 | 单轮或累计 金额类型 币种 状态 各日期 来源版本 | 钱是否确实投入及金额口径 |
| 客户与价格 | 买方或卖方来源 评估或部署 是否披露付费 计量单位 | 可购买与已购买分别有哪些证据 |
| 攻击与事故 | 研究或生产 实际受害 版本 前置条件 修补与复测 | 风险是否仍然暴露 |
| 产品评测 | 配置 正常基线 安全效果 成本 延迟 数据与代码 | 主张是否可独立复核 |

来源优先级应随问题变化：SEC 适合核对交易金额，买方材料适合确认使用关系，原始事故披露适合判断实际后果，独立实验适合比较能力。融资公告不能替代收入证据，客户案例也不能替代独立性能测试。

可持续市场机会应从目标客户清单、相关工作流、原生控制缺口、付费意愿和可续约合同额逐层估算。当前资料不支持用全球安全支出乘任意比例推导 Agent 安全市场规模。

新加坡可以作为实践观察入口。IMDA 在 2026 年 1 月发布 Agentic AI 治理框架，强调风险边界、人类问责、生命周期控制和用户责任；5 月公布与 Google 的 Agent Sandbox 经验。它们可帮助定义访谈和验收问题，但不能直接当作法定采购义务或合同额。[IMDA Agentic AI 框架](https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/press-releases/2026/new-model-ai-governance-framework-for-agentic-ai)、[IMDA Sandbox 实践](https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/factsheets/2026/ai-agents-insights-from-the-singapore-government-and-google-sandbox)

## 12 将研究转化为可执行的客户验证

以下为建议执行方案，尚未开展访谈或产品测试。建议选择 5 家有实际 Agent 工作流的组织，每家尽量覆盖业务、AI 平台和安全角色；这是探索样本，不用于估算全市场比例。两项工作流对照安排在 30 天计划内，避免把资料补全当成客户验证。

### 访谈要拿到具体事实和下一步

1. **最近一次上线或变更是什么？**请客户选择一个已经运行、即将上线或被暂停的工作流，说明用户、工具、敏感数据、写操作和频率。产物是一张真实流程图，而非泛泛的 AI 战略。
2. **什么问题曾经阻止上线？**记录最近一次审批、事故或险情，谁作出阻止或放行决定，以及延误和人工处理规模。若没有真实障碍，按预防性需求记录，不写成刚需。
3. **现有产品在哪里失效？**请客户展示当前授权、过滤、日志和审批配置，在获准测试环境复现缺口。将配置错误、缺少流程和缺少产品能力分别记录。
4. **谁能推动付费？**区分使用者、技术验收人、预算负责人和采购签字人；确认可能从哪个现有预算科目支付。单个技术团队的认可不能替代预算路径。
5. **什么结果足以进入采购？**让客户提前确定安全、正常任务成功率、延迟及运维要求，并约定达到后进入付费试点、采购评审或其他明确步骤。没有承诺就如实保留为探索。
6. **什么成本会让客户放弃？**核实允许的接入改造、人审时间、数据部署位置和最低采购承诺，比较原生、自建和外购的年度总成本。
7. **为何下一年还需要它？**核实模型或工具变更频率、评测责任人、持续审计需要，以及业务项目停用时的处理方式。续约应有持续工作依据。

建议每家访谈留下一页记录：工作流、控制缺口、证据、参与角色、预算路径、验收条件、接入代价和下一步日期。客户未提供的内容标为未知。

### 对照测试必须同时保留业务效果

每个工作流比较三种配置：当前做法、正确配置后的原生控制、原生控制加候选产品。使用同一任务和权限范围，保留版本、日志与修补状态；只在授权的测试环境中执行攻击用例。每次模型、提示、工具或 MCP 版本变化后复跑相关回归。

| 验收维度 | 应记录什么 | 通过条件如何确定 |
|---|---|---|
| 实际安全后果 | 越权动作是否执行、数据是否到达禁止目的地；分开记录尝试与成功 | 按工作流严重度预先约定，不能只看告警数量 |
| 正常业务任务 | 正常任务完成率、误拦率、人审与重试数量 | 相比正确配置的原生基线，损失须在客户可接受范围 |
| 运行性能 | 端到端 p95 延迟、每千次工具调用成本、检查次数 | 基于客户业务时限与预算，不使用统一营销阈值 |
| 覆盖与失效行为 | 未经过网关的调用、控制服务故障、撤权和暂停 | 明确哪些动作必须停止、哪些可降级，以及谁负责 |
| 接入和维护 | 初次接入人日、策略变更工时、版本升级与排障时间 | 将实测工作量纳入年度成本，验证客户能否长期维护 |

不得把有限测试中“零次成功攻击”表述为绝对安全。报告结果时写明任务数、攻击数、尝试次数、覆盖的版本和未覆盖路径。验收阈值由客户和测试方事前确定，避免测试后按结果调整标准。

### 三十天内形成继续或收窄的依据

- **第 1 周：**确定 5 家访谈对象与两个候选工作流，整理各自原生控制和证据缺口；交付工作流清单及访谈提纲。
- **第 2 周：**完成访谈，确认预算角色、测试权限和验收条件；交付需求证据表与对照测试设计。
- **第 3 周：**执行两个工作流对照，记录安全、业务效果、延迟、成本及集成工作量；交付可复算结果。
- **第 4 周：**形成每个方向一页决策记录，给出继续投入、收窄场景或停止独立产品验证的理由。

**继续投入：**至少在具体工作流中证明原生控制仍有重要缺口，候选方案带来可重复增益，且客户明确认可验收标准并给出采购下一步。以上是建议的项目门槛，不是市场成功概率。

**收窄场景：**有真实痛点，但只有特定平台或高风险动作需要额外控制，或交付成本过高。优先减少覆盖面、复用已有入口，再测试经济性。

**停止独立产品验证：**正确配置的原生方案已满足需求，新增控制造成不可接受的业务损失，或反复访谈仍没有预算负责人。仍可保留相关研究作为评测与知识平台能力。

## 13 证据范围与判断限制

这份报告提供有出处的资金事件、产品布局及可检验的商业判断。所选材料以国际公开样本为主，中国及其他亚洲市场的资金与采购尚未系统覆盖，不能据样本分布判断地区需求强弱。公开信息不足以可靠估算 Agent 安全独立市场规模、各类控制的收入占比、典型客单价或供应商真实留存率，因此没有编造这些数字。案例新闻不能当作受害损失统计；厂商调查不能当作随机全市场样本；付费报告摘要不能当作全文结论。

建议的研究决策为：**我们优先研究并验证 Agent 从试点进入生产时的安全障碍，重点看权限、行动和数据流控制，再以真实工作流中的安全效果与运行成本判断商业价值。**

常用缩写：IAM 为身份与访问管理；CISO 为首席信息安全官；AppSec 为应用安全；SOC 为安全运营中心；ARR 为年度经常性收入；POC 为概念验证；GA 为正式可用；MCP 为模型上下文协议；p95 延迟指 95% 的请求在该时长内完成；SASE 为安全访问服务边缘。
