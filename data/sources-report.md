# Agent Safety Atlas 数据来源报告

整理日期：2026-09-12  
材料范围：2000-01-01 至 2026-10-13 已公开内容  
研究快照：正式发布版 R070；企业快照：EP001 首批企业试刊（截至 2026-09-09）、EP002 商业报告结构化增量（截至 2026-09-12）。

## 一、供汇报使用的来源说明

本平台以公开、可追溯的原始材料为依据。研究线从会议与期刊目录、arXiv 检索、论文参考文献及专题清单发现候选，再回到论文摘要、正式发表页、作者项目页和配套资源核对。企业线围绕科技公司报告、分析机构、攻击与失效案例、企业产品、VC 和资本事件，优先引用报告发布方、产品厂商、交易当事方、原始披露者及官方漏洞记录。

平台中的分类、中文概述、关联关系和商业问题是 AI 辅助整理形成的编辑层，并非来源原文，也不代表独立实验复现或第三方商业尽调。每类信息保留来源与边界：分析机构预测仍是预测，厂商产品说明仍是厂商陈述，融资金额不等于客户采购、安全预算或收入。

## 二、这份报告覆盖哪些数据

| 数据对象 | 当前数量 | 正确理解 |
|---|---:|---|
| 正式研究库已纳入研究 | 9,009 项 | 按 workId 去重的已纳入工作，不是候选条目总数 |
| 待复核展示记录 | 135 条 | 不计入上述 9,009 项 |
| 关联资源记录 | 3,269 条 | 代码、数据、模型等资源记录；不表示全部已验证开源许可 |
| 机构与团队实体 | 5,824 个 | 不等于 5,824 家商业公司，也不等于独立研究者人数 |
| 企业档案 | 16 家 | EP001 首批企业试刊 3 家（TrojAI、Lasso Security、Patronus AI）；EP002 商业报告结构化增量 13 家 |
| 资本事件 | 16 笔 | 8 笔融资、8 笔并购；EP001 首批企业试刊 4 笔；EP002 商业报告结构化增量 12 笔 |
| 科技公司／分析机构报告 | 14 份 | 7 份分析机构报告、6 份科技公司报告、1 份本站编辑分析 |
| 事件与案例 | 12 条 | EP001 首批企业试刊 3 条；EP002 商业报告结构化增量 9 条；按证据强度分别标注 |
| 企业样本来源 | 72 个去重链接 | 按精确 URL 去重；同一机构的多个页面不等于独立交叉验证 |

研究数据以已成功发布的 R070 为准。旧进度文件、早期周报和累计采集检查点可能使用较早口径，不应替代本表。企业数据是有目的的小样本，不能代表市场全貌。

## 三、研究线：数据从哪里来

### 1. 发现入口与事实证据分开

- **论文目录与预印本检索**：从会议、期刊和 arXiv 的检索结果形成候选。检索词用于提高发现效率，不直接决定是否纳入。
- **专题清单与综述**：使用 [LLM-Agent-Security-Survey](https://github.com/sunyinggang/LLM-Agent-Security-Survey)、[Awesome-Agent-Security-Papers](https://github.com/MurrayTom/Awesome-Agent-Security-Papers)、[awesome-llm-agent-privacy](https://github.com/yagobski/awesome-llm-agent-privacy) 等收集线索。清单出现某篇论文，不足以证明其研究相关性、正式发表状态或资源可用性。
- **原始论文与官方发表页**：据摘要判断研究对象、安全问题和直接联系；历史批次在需要时定点补读正文。当前快速筛选将范围不确定项送入单独复核队列，不以猜测补齐。根据正式出版页、官方会议条目、标题和作者信息核对发表关系。作者自述录用与已匹配的正式发表证据分开记录。
- **代码、数据与机构资料**：沿论文及作者项目页核对 GitHub、Hugging Face、Zenodo 等资源；机构署名优先依据论文发表时信息，地理信息还会使用官方机构主页或 ROR 注册信息。当前注册地点不能直接当作历史研究地点。

### 2. 正式研究卡片当前链接到哪些来源

以下统计针对 9,009 项已纳入工作，每项只统计当前卡片的主要链接域名。它不是所有证据链接的总数，也不是各数据库的完整覆盖率。

| 来源入口 | 当前主要链接数 | 主要作用 |
|---|---:|---|
| [arXiv](https://arxiv.org/) | 5,348 | 预印本元数据、摘要和版本记录 |
| [DOI](https://doi.org/) | 1,863 | 出版方 DOI 解析链接：期刊、会议论文集与书籍章节 |
| [PMLR](https://proceedings.mlr.press/) | 298 | ICML 等会议及其他 PMLR 论文 |
| [ACL Anthology](https://aclanthology.org/) | 257 | ACL 系列论文、Findings 与轨道 |
| [NeurIPS Proceedings](https://proceedings.neurips.cc/) | 233 | 正式论文与轨道信息 |
| [ICLR Proceedings](https://proceedings.iclr.cc/) | 150 | ICLR 官方论文信息 |
| [ICML 官方目录](https://icml.cc/) | 119 | 官方论文／会议信息 |
| [USENIX](https://www.usenix.org/) | 78 | 安全会议论文与材料 |
| [AAAI OJS](https://ojs.aaai.org/) | 56 | AAAI 系列正式论文 |
| 其他正式出版、会议与预印本入口 | 607 | OpenReview、IEEE、Springer、ACM、NDSS、AAMAS、IJCAI、CEUR-WS 等 |
| **合计** | **9,009** | 每项已纳入工作恰计一次 |

正式库中，3,194 项标记已发表，465 项标记已录用，5,350 项的正式发表状态尚未核实。纳入 Agent Safety 研究范围与正式发表状态是两件事；尚未核实不表示未发表。

3,269 条资源记录中，2,475 条链接到 GitHub，301 条链接到 Hugging Face，53 条链接到 Zenodo，其余 440 条来自项目网站等入口。以上是资源链接数，不是独立仓库维护者数，也不证明资源均完整可复用。

### 3. 从候选到平台的处理过程

候选发现 → 标识与精确链接去重 → 摘要范围筛选 → 版本与发表信息关联 → 资源、署名和时间信息补充 → 范围复核与发布检查 → 平台展示。

预印本版、会议版、期刊版在证据明确时关联至同一研究工作。候选去重不能保证所有版本关系都已识别。全领域覆盖率尚未知；查询翻页或某个目录处理完成，不等于整个研究领域已收集完整。平台保留待复核项，不通过缺少证据推断“没有代码”“没有机构”或“没有发表”。

研究范围以数字 Agent 及相关安全理论为主，包括目标与行为对齐、监督控制、提示注入、越权与泄露、工具执行、长期运行失效、多智能体风险、安全评测等。一般性能提升、泛用模型安全或仅仅“用 Agent 做安全工具”不自动纳入。

## 四、企业线：五类调研目标各用什么来源

本节至第六节的逐条来源说明写于 EP001 首批（3 家公司、4 笔资本事件、3 份报告、3 条案例）。之后批次的来源与口径见[AI Agent 安全商业与资金流向调研报告](./business-report-2026-09-12.html)及企业数据下载；第二节的企业数量已包含全部批次。

| 老板关心的方向 | 已采用的来源 | 能回答什么 | 仍不能据此回答什么 |
|---|---|---|---|
| Business report | Microsoft Work Trend Index、Anthropic Economic Index 的发布页和方法说明 | 企业采用意向、任务使用特征和厂商对行业的判断 | Agent Safety 的真实采购额、行业收入或投资回报 |
| Gartner 等分析机构 | Gartner 官方公开新闻稿 | 分析机构的预测方向及公开论据 | 未公开付费报告的完整方法、全部样本和验证结果 |
| Attack news / Cases | 当事方复盘、原始研究披露、Microsoft CNA 漏洞记录、具名厂商案例 | 风险触发过程、受影响边界、可能需要的控制 | 所有事件的独立归因、损失金额、发生率 |
| Startup / Product | 产品官网、发布公告、技术说明、部署案例 | 厂商声称提供什么、何时发布、面向什么场景 | 所有能力均已独立验证、实际部署规模、成交价格 |
| VC / 资本 | 公司融资公告、领投方说明、收购方公告 | 谁投了谁、哪笔交易、公开金额与角色 | 各投资方出资份额、资金实际用途、安全专项预算 |

### 1. 报告的口径

- **Microsoft Work Trend Index 2025**：使用官方报告、方法说明及发布公告。其调查与使用信号支持采用趋势判断；不能把受访者的未来计划当成已完成采购。
- **Anthropic Economic Index 首次发布**：基于特定 Claude.ai 使用样本的任务分析，保留产品和用户样本限制；不能推广成全部企业、全经济或采购市场统计。
- **Gartner 2025-06-25 新闻稿**：涉及“到 2027 年底超过 40% 的 Agentic AI 项目将被取消”的预测。平台按预测收录，不作为已发生的取消率；本批未读取付费报告全文。

### 2. 资本数字的口径

| 事件 | 资料日期 | 披露金额 | 来源性质 |
|---|---|---:|---|
| TrojAI 新增种子融资 | 2024-04-03 | 575 万美元 | 公司通过 PR Newswire 发布的公告 |
| Lasso Security 种子融资 | 2023-11-20 | 600 万美元 | 公司官方融资公告 |
| Patronus AI A 轮融资 | 2024-05-22 | 1,700 万美元 | 公司公告与领投机构 Notable Capital 说明 |
| A10 收购 TrojAI | 2026-06-15 | 未披露 | 收购方官方公告，表述为已收购 |

三笔样本融资合计为 **2,875 万美元**。这只是选定历史轮次的算术合计，不是三家公司累计融资，不是最新融资全表，更不是 Agent Safety 的市场规模。每轮金额仅计算一次，不按参投机构重复累计。并购对价未知，不计入融资合计。PR Newswire 在这里是公告分发渠道，不是独立第三方核验机构。

### 3. 三类案例的证据强度

- **DataTalks.Club 生产基础设施删除**：来源是操作者本人复盘，事件日期为 2026-02-26，文章日期为 2026-03-06。按真实事件的当事方报告收录；未将其标记为已经 AWS 或 Anthropic 独立确认的结论。
- **EchoLeak**：来源为原研究团队披露与 Microsoft CNA 的 CVE-2025-32711 记录。按受控研究／PoC 收录，不将演示风险改写为已确认的大规模在野攻击。
- **Glide Identity 使用 Lasso**：来源为厂商托管的具名客户案例。它可支持存在某种部署叙述，但没有单独证明采购金额、独立效果或可归因于安全产品的全部效率提升。

## 五、如何追溯与理解可信度

一条平台信息应能沿“记录 → 具体结论 → 来源 URL → 定位说明／日期”回溯。平台保存来源角色、记录关联和未知项；部分研究采集与发布批次还保存抓取时间、快照和哈希，帮助区分版本。不是每个历史页面都有完整存档，外部页面也可能被更改。

本批企业样本保存来源 URL、引用定位和结构化整理结果；这不等于对 18 个网站页面做了全文长期归档。公司官网、客户案例和 VC 文章可能有商业利益，应结合其发布主体理解。多个转载链接如果来自同一公告，只是同一证据的不同载体。

当前工作包括 AI 辅助筛选、字段核对和有限复核，不能称为“每篇论文均由人类专家全文审阅”。平台也没有为这些论文统一复现实验，或为企业产品完成独立效果测试。因此，适合据此定位材料、建立研究与商业假设、安排后续验证；采购、投资或风险定价结论仍需补充直接证据。

当前明确缺口包括：客户付费及合同金额、公司收入、安全专项预算、投资方独立出资金额、产品成交价格，以及可比较的独立防护效果。未取得的字段保留未知，不填作零。

## 六、企业首批来源清单

下表列出 EP001 实际引用的 18 个不同 URL。同一来源可能同时支持公司、产品和资本记录，表内只列一次。

| 编号 | 原始来源 | 关联记录 |
|---|---|---|
| E01 | [TrojAI Defend for MCP launch](https://troj.ai/blog/agentic-ai-defend-for-mcp-model-context-protocol/) | co-trojai |
| E02 | [A10 acquisition announcement](https://www.a10networks.com/news/press-releases/a10-networks-acquires-trojai-inc-expanding-ai-roadmap/) | co-trojai, money-trojai-acquisition-2026 |
| E03 | [Lasso Security Introduces Intent Deputy](https://www.lasso.security/resources/intent-deputy-ai-agent-security) | lasso-security |
| E04 | [Securing AI Agents at Glide Identity](https://www.lasso.security/case-study/glide-identity) | case-glide-lasso-2026, lasso-security |
| E05 | [Patronus AI — Percival](https://www.patronus.ai/percival) | patronus-ai |
| E06 | [Patronus AI Unveils First Scalable Supervision Solution for Agentic Systems](https://www.prnewswire.com/news-releases/patronus-ai-unveils-first-scalable-supervision-solution-for-agentic-systems-302455117.html) | patronus-ai |
| E07 | [TrojAI seed financing announcement](https://www.prnewswire.com/news-releases/trojai-raises-5-75m-in-seed-funding-to-secure-ai-in-the-enterprise-302106426.html) | money-trojai-seed-2024 |
| E08 | [Lasso Security Emerges from Stealth With $6 Million Seed Funding](https://www.lasso.security/resources/lasso-security-funding-announcement-2023) | money-lasso-seed-2023 |
| E09 | [Patronus AI Raises $17 million To Detect LLM Mistakes at Scale](https://www.patronus.ai/announcements/patronus-ai-raises-17-million-to-detect-llm-mistakes-at-scale) | money-patronus-series-a-2024 |
| E10 | [Why Notable Capital is Excited about Patronus AI](https://www.notablecap.com/blog/why-notable-capital-is-excited-about-patronus-ai) | money-patronus-series-a-2024 |
| E11 | [Microsoft WorkLab report and methodology](https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born) | report-microsoft-work-trend-index-2025 |
| E12 | [Microsoft launch announcement](https://blogs.microsoft.com/blog/2025/04/23/the-2025-annual-work-trend-index-the-frontier-firm-is-born/) | report-microsoft-work-trend-index-2025 |
| E13 | [Anthropic initial release and caveats](https://www.anthropic.com/news/the-anthropic-economic-index) | report-anthropic-economic-index-2025-initial |
| E14 | [Gartner public press release](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027) | report-gartner-agentic-ai-cancellation-2025 |
| E15 | [Alexey Grigorev: How I Dropped Our Production Database and Now Pay 10% More for AWS](https://aishippingblog.com/p/how-i-dropped-our-production-database) | EP001-CASE-DATATALKS |
| E16 | [Aim Labs / Cato Networks: Breaking down EchoLeak](https://www.catonetworks.com/blog/breaking-down-echoleak/) | EP001-CASE-ECHOLEAK |
| E17 | [Microsoft CNA record: CVE-2025-32711](https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2025/32xxx/CVE-2025-32711.json) | EP001-CASE-ECHOLEAK |
| E18 | [Lasso Security — Case Studies](https://www.lasso.security/case-studies) | case-glide-lasso-2026 |

## 七、数据下载

第二、三节的研究数字按当前发布版 R070 的平台数据生成，企业数量按当前企业数据生成，每次重建页面时同步更新；第四至六节的逐条来源说明对应 EP001 首批。

- [下载企业数据与来源](./data/enterprise.json)
- [下载研究数据与来源](./data/atlas.json)
- [下载本报告 Markdown](./data/sources-report.md)

