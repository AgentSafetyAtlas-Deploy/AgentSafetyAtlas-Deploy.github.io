import {demandFacts} from './business-demand.js';
export function evidenceUI(data, state) {
const t=(en,zh)=>state.lang==='en'?en:zh;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr=v=>esc(v&&typeof v==='object'?(v[state.lang]||v.en||v.zh||''):v);
const company=id=>data.companies.find(c=>c.id===id);
const labels=()=>({contract:t('Procurement / contract','采购／合同'),buyer:t('Buyer','采购方'),funding:t('Funding','融资'),acquisition:t('M&A','并购'),grant:t('Research grant','科研资助'),funding_history:t('Cumulative disclosure','累计融资披露'),company_report:t('Company report','公司报告'),analyst_report:t('Analyst report','机构报告'),editorial_report:t('Atlas analysis','本站分析'),analysis:t('Analysis','分析'),observed:t('Observed data','观察数据'),mixed:t('Survey & signals','调查与信号'),forecast:t('Forecast','预测'),incident:t('Reported incident','事件报告'),controlled_research:t('Controlled research','受控研究'),deployment_case:t('Vendor deployment claim','厂商部署叙述'),buyer_material:t('Buyer material','买方材料'),evaluation_case:t('Evaluation','评估阶段'),lead:t('Lead','领投'),participant:t('Participant','参投'),acquirer:t('Acquirer','收购方'),funder:t('Funder','资助方')});
const label=k=>labels()[k]||esc(k);
const amount=(v,currency='USD')=>v==null?t('Undisclosed','未披露'):new Intl.NumberFormat(state.lang==='zh'?'zh-CN':'en-US',{style:'currency',currency:currency||'USD',maximumFractionDigits:0}).format(v);
const badge=(text,kind='')=>'<span class="ep-badge '+kind+'">'+text+'</span>';
const detailButton=id=>'<button class="ep-text-button" data-detail="'+esc(id)+'">'+t('Evidence & details','查看证据与详情')+' ↗</button>';
const sourceLink=s=>/^https?:\/\//.test(s.url)?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title||s.url)+' ↗</a>':esc(s.title);
const matches=()=>true;
const funding=()=>data.money.filter(r=>r.type==='funding'&&r.currency==='USD'&&r.amount!=null);
function card(r,kind){
 const badges=kind==='reports'?badge(label(r.kind))+badge(label(r.claimType),r.claimType==='forecast'?'amber':''):kind==='cases'?badge(label(r.kind),r.kind==='incident'?'amber':''):badge(t('Company / brand profile','企业／品牌档案'))+(r.entityKind==='acquired_company'?badge(t('Acquired brand','已收购品牌'),'amber'):'');
 const meta=kind==='companies'?t('Product capabilities · vendor source','产品能力 · 厂商来源'):[r.publisher||r.organization||'',r.date].filter(Boolean).join(' · ');
 const tail=kind==='companies'?'<div class="ep-product">'+r.products.map(p=>'<strong>'+esc(p.name)+'</strong><p>'+tr(p.summary)+'</p>').join('')+'</div>':'<div class="ep-question"><span>'+t('Business question','商业问题')+'</span><p>'+tr(r.businessQuestion)+'</p></div>';
 return '<article class="ep-card"><div class="ep-badges">'+badges+'</div><p class="ep-meta">'+esc(meta)+'</p><h3>'+esc(r.name||r.title)+'</h3>'+(r.owner?'<p class="ep-owner">'+t('Owner','所属方')+' · '+esc(r.owner)+'</p>':'')+'<p>'+tr(r.summary)+'</p>'+tail+reportActions(r)+'<div class="ep-card-foot"><span>'+r.sources.length+' '+t('sources','个来源')+'</span>'+detailButton(r.id)+'</div></article>';
}
function section(title,copy,group){
 const available=group==='reports'?data.reports.filter(r=>r.kind!=='editorial_report'):data[group];
 let preview=[...available].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,3);
 if(group==='cases')preview=['incident','controlled_research','deployment_case'].map(kind=>available.filter(r=>r.kind===kind).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]).filter(Boolean);
 return '<section class="ep-section"><div class="ep-section-heading"><div><h2>'+title+'</h2><p>'+copy+'</p></div><button class="ep-text-button" data-view="'+group+'">'+t('View all','查看全部')+' ('+data[group].length+') →</button></div><div class="ep-grid">'+preview.map(r=>card(r,group)).join('')+'</div></section>';
}
function reportActions(r){
 if(r.kind!=='editorial_report'||!r.url?.startsWith('./'))return '';
 return '<div class="ep-report-actions"><a class="btn" href="'+esc(r.url)+'">'+t('Read full report','阅读全文')+' ↗</a><a href="'+esc(r.downloads.word)+'" download>Word ↓</a><a href="'+esc(r.downloads.markdown)+'" download>Markdown ↓</a></div>';
}
function featuredReport(){
 const r=data.reports.find(r=>r.kind==='editorial_report');
 if(!r)return '';
 return '<section class="ep-featured-report"><div><p class="ep-eyebrow">'+t('ATLAS EDITORIAL ANALYSIS','本站综合分析')+'</p><h2>'+esc(r.title)+'</h2>'+(r.owner?'<p class="ep-owner">'+t('Owner','所属方')+' · '+esc(r.owner)+'</p>':'')+'<p>'+tr(r.summary)+'</p><small>'+r.date+' · '+t('Chinese full text · views and recommendations belong to Atlas','中文全文 · 分析建议由本站整理')+'</small></div>'+reportActions(r)+'</section>';
}
function roundName(value){return ({'Not stated':t('Round not stated','未披露轮次'),'Acquisition':t('Acquisition','收购'),'Additional seed':t('Additional seed','新增种子融资'),'Seed':t('Seed','种子轮'),'Series A':t('Series A','A 轮'),'Series B':t('Series B','B 轮'),'Strategic funding':t('Strategic funding','战略融资')})[value]||esc(value||'')}
function transactionStatus(r){
 const status=r.status||r.transactionStatus||(r.type==='funding'?'company_announced_raised':'');
 return ({award_announced:t('Award announced','已公告中标／成交'),contract_signed:t('Contract signed per notice','公告载明已签约'),announced:t('Announced','已公告'),grant_agreement_signed:t('Grant agreement signed','资助协议签署'),completed:t('Completed','已完成'),announced_as_acquired:t('Announced as acquired; closing date unverified','公告称已收购；交割日待核实'),company_announced_raised:t('Company-announced funding','公司公告融资')})[status]||t('Status not separately verified','状态未另行核实');
}
function basisName(key){
 const m={
 'completed_month':['Completion month; day unknown','交割月份；具体日期未知'],
 'award_date':['Award date in notice','公告载明授标日期'],
 'approximate_purchase_consideration_FY2025_20F':['FY2025 20-F approximate total consideration','FY2025 20-F 总对价约数'],
 'approximate_net_cash_consideration':['Approximate net cash consideration','约数 · 净现金对价'],
 'cash_consideration_FY2026_Q3_10Q_rounded':['FY2026 Q3 10-Q cash consideration, rounded','FY2026 Q3 10-Q 现金对价约数'],
 'purchase_consideration_FY2026_Q3_10Q_rounded':['FY2026 Q3 10-Q purchase consideration, rounded','FY2026 Q3 10-Q 收购对价约数'],
 'announced_purchase_consideration':['Announced purchase consideration','最初公告收购对价'],
 'award_announcement':['Award announcement date','中标／成交公告日期'], 'contract_signature':['Contract signature date','合同签署日期'],
 'award_line_item':['Award line item; payment unknown','中标分项；付款未知'], 'award_mixed_project':['Mixed-scope project award','混合项目成交额'], 'signed_mixed_contract':['Mixed-scope signed contract','混合服务合同额'],
 'completed':['Legal closing date','法律交割日'],'announced':['Announcement date','公告日期'],'announcement':['Announcement date','公告日期'],'grant_signature':['Grant signature date','资助协议签署日'],
 'single_funding_round':['Single funding round','单轮融资'],'cumulative_funding_excluded_from_round_totals':['Cumulative disclosure; excluded from single-round totals','累计融资披露；不计入单轮合计'],'eu_grant_contribution_not_disbursement':['EU grant contribution; disbursement not established','欧盟资助额；拨付情况未知'],'separate_consideration_components':['Consideration components disclosed separately','对价分项单独披露'],'cash_consideration_excluding_future_service_awards':['Cash consideration excluding future-service awards','现金对价，不含未来服务奖励'],'agreement_consideration_subject_to_adjustments':['Agreement consideration subject to adjustment','协议对价，可能调整'],
 'undisclosed_or_not_verified':['Not disclosed / verified','未披露或未核实'],
 'not_disclosed_in_reviewed_material':['Not disclosed in reviewed material','已读材料未披露'],
 'purchase_consideration_FY2026_10K_rounded_to_millions':['FY2026 10-K purchase consideration, rounded to millions','FY2026 10-K 收购对价，按百万美元取整'],
 'fair_value_of_total_consideration_transferred_FY2026_10K_preliminary_PPA':['FY2026 10-K fair value of transferred consideration; preliminary allocation','FY2026 10-K 已转移对价公允价值；购买价分配暂定'],
 'total_purchase_consideration_FY2026_10K_substantially_all_cash':['FY2026 10-K total purchase consideration; substantially all cash','FY2026 10-K 总收购对价；基本为现金'],
 'undisclosed_buyer_says_immaterial':['Undisclosed; buyer says immaterial, not zero','未披露；买方称不重大，不等于零'],
 'FY2025_10K_purchase_consideration':['FY2025 10-K purchase consideration','FY2025 10-K 收购对价'],
 'FY2026_Q3_10Q_preliminary_fair_value_of_consideration':['FY2026 Q3 10-Q preliminary fair value','FY2026 Q3 10-Q 暂定公允价值'],
 'closing_8K_cash_and_shares_description':['Closing 8-K cash and shares description','交割 8-K 现金及股份描述']};
 return m[key]?t(...m[key]):esc((key||'').replaceAll('_',' '));
}
function fundingScopeNote(dark=false){
 const x=data.meta.reportFundingSample;if(!x)return '';
 return '<p class="'+(dark?'ep-capital-note ep-sample-note':'ep-note')+'">'+t('The full atlas sample contains ','全企业样本包含 ')+funding().length+' '+t('funding rounds totaling ','笔融资，合计 ')+amount(funding().reduce((a,r)=>a+r.amount,0))+'; '+t('the linked report selects ','关联报告单独选择 ')+x.count+' '+t('rounds totaling ','笔，合计 ')+amount(x.amount)+t('. These are different samples, including broader AI security. Neither is Agent-only spending or market size.','。两者样本范围不同，包含广义 AI 安全；均非 Agent 专属投入或市场规模。')+'</p>';
}
function moneyFacts(r){
 let facts=[ [t('Transaction status','交易状态'),transactionStatus(r)] ];
 if(r.dateBasis)facts.push([t('Date basis','日期口径'),basisName(r.dateBasis)]);
 if(r.amountBasis)facts.push([t('Amount basis','金额口径'),basisName(r.amountBasis)]);
 for(const [k,en,zh] of [['announcedOn','Announced','公告日期'],['completedOn','Completed','交割日期'],['pageDatedOn','Page date','网页署日'],['observedOn','Observed','观察日期'],['amountDisclosedOn','Amount disclosed','金额披露日期']])if(r[k])facts.push([t(en,zh),esc(r[k])]);
 let text='<div class="ep-detail-note"><dl class="ep-facts">'+facts.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>').join('')+'</dl></div>';
 if(r.priorDisclosures?.length)text+='<h3>'+t('Earlier disclosures of the same transaction','同一交易的此前披露')+'</h3><p class="muted">'+t('Do not add these values to the current consideration. Different accounting bases do not establish a price reduction.','不能与当前对价相加；会计口径不同不能直接解释为降价。')+'</p>'+r.priorDisclosures.map(p=>'<p>'+(p.approximate?t('Approximately ','约 '):'')+amount(p.amount_usd_m*1e6)+' · '+basisName(p.amount_basis)+'</p>').join('');
 return text;
}
function priceAmount(value){return value==null?t('Price to be quoted','价格待报价'):'$'+Number(value).toLocaleString('en-US',{maximumFractionDigits:6})}
function companySwitch(){
 return '<div class="ep-subnav"><button data-company-mode="profiles" class="'+(state.companyMode==='profiles'?'active':'')+'">'+t('Company / brand profiles','企业／品牌档案')+' · '+data.companies.length+'</button><button data-company-mode="prices" class="'+(state.companyMode==='prices'?'active':'')+'">'+t('Public price list','公开价目表')+' · '+(data.prices||[]).length+'</button></div>';
}
function priceTable(rows){
 return '<div class="ep-table-wrap"><table class="ep-table ep-price-table"><thead><tr>'+[t('Product','产品'),t('USD list price / unit','美元挂牌价／单位'),t('Minimum commitment & limits','最低承诺与限制'),t('Evidence','证据')].map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><td><strong>'+esc(r.product)+'</strong><small>'+esc(company(r.companyId)?.name)+' · '+esc(r.observedOn)+'</small></td><td><strong>'+priceAmount(r.amount)+'</strong><small>'+tr(r.unit)+'</small></td><td>'+(r.minimumAnnualAmount?'<strong>'+t('Listed minimum ','挂牌最低 ')+priceAmount(r.minimumAnnualAmount)+t('/year','／年')+'</strong><br>':'')+tr(r.limitations)+'</td><td>'+detailButton(r.id)+'</td></tr>').join('')+(rows.length?'':'<tr><td colspan="4">'+t('No matching prices.','没有匹配的价格记录。')+'</td></tr>')+'</tbody></table></div>';
}
function priceDetail(r){
 return '<p class="ep-meta">'+t('Public price observation · ','公开价格观察 · ')+esc(r.observedOn)+' · '+esc(r.batchId)+'</p><h2 id="ep-detail-title">'+esc(r.product)+'</h2><p><strong>'+priceAmount(r.amount)+(r.amount==null?'':' USD')+'</strong> · '+tr(r.unit)+'</p>'+(r.minimumUnits?'<p>'+t('Minimum units: ','最低数量：')+r.minimumUnits+' · '+t('Listed annual minimum: ','挂牌年度最低：')+priceAmount(r.minimumAnnualAmount)+'</p>':'')+'<p class="ep-note">'+t('List prices do not establish invoices or revenue. Each product dimension has its own scope.','挂牌价不能确定实际账单或收入；各产品维度有独立的适用范围。')+'</p><h3>'+t('Scope & limits','范围与限制')+'</h3><p>'+tr(r.limitations)+'</p>'+priceHistory(r)+'<h3>'+t('Original sources','原始来源')+'</h3>'+r.sources.map(x=>'<div class="evidence">'+sourceLink(x)+'</div>').join('');
}
function priceHistory(r){
 let h=r.displayedAmount!=null?'<p class="ep-note">'+t('Original displayed value: ','页面显示值：')+priceAmount(r.displayedAmount)+t('. Classified as a private-offer placeholder; excluded from calculations.','。归类为私有报价入口占位值，不进入计算。')+'</p>':'';
 if(r.priorObservations?.length)h+='<h3>'+t('Earlier observations','此前观察')+'</h3><p>'+t('Same numeric rate rechecked. Observation dates do not establish when a price changed.','本次复核金额相同；观察日期不能确定价格变动时间。')+'</p>'+r.priorObservations.map(p=>'<p>'+esc(p.observedOn)+' · '+priceAmount(p.amount)+' · '+tr(p.unit)+'</p>').join('');
 if(r.observationStatus==='same_rate_unit_description_corrected')h+='<p>'+t('The Gateway unit description was corrected to API invocations, including ListTools, InvokeTool and Ping.','Gateway 单位说明已修正为 API 调用，包含 ListTools、InvokeTool 和 Ping。')+'</p>';
 return h;
}
function priceView(){
 const rows=(data.prices||[]).filter(matches);
 return '<p class="ep-note">'+t('Public list prices have different units and scopes. They are not procurement, financing or ARR. Minimum commitments and excluded costs are retained.','公开挂牌价的单位与覆盖范围不同，不是采购金额、融资或 ARR。最低承诺与不包含的费用分别保留。')+'</p>'+priceTable(rows)+(data.scenarios||[]).map(r=>'<section class="ep-scenario"><span class="ep-badge amber">'+t('Hypothetical calculation · not a customer bill','假设计算 · 不是客户账单')+'</span><h2>'+tr(r.label)+'</h2><p>'+tr(r.assumptions)+'</p><div class="ep-scenario-values"><div><span>'+t('One checked input/output pair','检查一对输入／输出')+'</span><strong>'+priceAmount(r.monthlyUSD)+t('/month','／月')+'</strong></div><div><span>'+t('Ten checked pairs','检查十对输入／输出')+'</span><strong>'+priceAmount(r.repeatedTenPairsMonthlyUSD)+t('/month','／月')+'</strong></div></div><p><strong>'+t('Excludes: ','不包含：')+'</strong>'+tr(r.excludedCosts)+'</p><p>'+t('A component-level scenario cannot be compared directly with a full enterprise annual subscription.','该服务组件的成本示例不能与完整企业年约直接比较。')+'</p><p>'+r.sources.map(sourceLink).join(' · ')+'</p><a class="ep-text-button" href="./business-report-2026-09-12.html#section-9">'+t('See the report assumptions','查看报告中的计算前提')+' ↗</a></section>').join('');
}
function buyerScopeFacts(r){
 if(!r.productScope)return '';
 const facts=[[t('Product scope','适用产品'),tr(r.productScope)]];
 if(r.processingLocation)facts.push([t('Processing location in source','原文数据处理地点'),tr(r.processingLocation)]);
 if(r.dateBasis==='source_updated_month')facts.push([t('Date basis','日期口径'),t('Source revision month; relationship start unknown','材料修订月份；关系开始时间未知')]);
 if(r.assessmentOn)facts.push([t('Assessment month','评测月份'),esc(r.assessmentOn)]);
 if(r.observedOn)facts.push([t('Observed','观察日期'),esc(r.observedOn)]);
 return '<dl class="ep-facts">'+facts.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>').join('')+'</dl>';
}
function detailMarkup(r){
 if(r.evidenceType==='public_list_price')return priceDetail(r);
 const sources=[...r.sources,...(r.products||[]).flatMap(p=>p.sources||[])],unique=[...new Map(sources.map(s=>[s.url,s])).values()];
 const title=r.name||r.title||company(r.companyId)?.name+' · '+label(r.type);
 return '<p class="ep-meta">'+esc(r.date||(r.kind?t('Publication date unknown','发布日期未知'):t('Company profile','企业档案')))+' · '+esc(r.batchId||'EP001')+' · '+t('Cutoff','截止')+' '+esc(r.cutoff||'2026-09-09')+(!r.date&&r.observedOn?' · '+t('Observed','观察日期')+' '+esc(r.observedOn):'')+(r.eventDate?' · '+t('Event date','事件发生')+' '+esc(r.eventDate):'')+(r.updatedInBatches?.length?' · '+t('Updated','更新')+' '+r.updatedInBatches.map(esc).join(', ')+' / '+esc(r.observedOn):'')+'</p><h2 id="ep-detail-title">'+esc(title)+'</h2>'+(r.owner?'<p class="ep-owner">'+t('Owner','所属方')+' · '+esc(r.owner)+'</p>':'')+'<p>'+tr(r.summary)+'</p>'+buyerScopeFacts(r)+demandFacts(r,state.lang)+reportActions(r)+(r.evidenceStatus?'<div class="ep-detail-note"><strong>'+t('Evidence status','证据状态')+'</strong><p>'+tr(r.evidenceStatus)+'</p></div>':'')+(r.products||[]).map(p=>'<h3>'+esc(p.name)+'</h3><p>'+tr(p.summary)+'</p><div class="ep-detail-note"><p><strong>'+t('Product stage','产品阶段')+'：</strong>'+tr(p.stage)+'</p><p><strong>'+t('Pricing','定价')+'：</strong>'+tr(p.pricing)+'</p></div>').join('')+(r.amount!==undefined?'<h3>'+t('Transaction','交易信息')+'</h3><p>'+label(r.type)+' · '+r.date+' · '+(r.amountStatus==='components_only'?t('Components disclosed; no total recorded','已披露分项，未记录单一总额'):amount(r.amount,r.currency))+' '+esc(r.currency||'')+'</p><p>'+(r.participants||[]).map(p=>esc(p.name)+' ('+label(p.role)+')').join(' · ')+'</p>':'')+(r.type?moneyFacts(r):'')+((r.products&&(data.prices||[]).some(p=>p.companyId===r.id))?'<h3>'+t('Public list prices','公开挂牌价')+'</h3>'+priceTable(data.prices.filter(p=>p.companyId===r.id)):'')+(r.businessQuestion?'<h3>'+t('Business question','回答的商业问题')+'</h3><p>'+tr(r.businessQuestion)+'</p>':'')+(r.fourthEventDate?'<p class="ep-note">'+t('Fourth incident only: occurred ','仅第四起事件：发生于 ')+esc(r.fourthEventDate)+' · '+t('discovered ','发现于 ')+esc(r.fourthEventDiscovered)+'</p>':'')+(r.limitations?'<h3>'+t('Evidence boundaries','证据边界')+'</h3><p>'+tr(r.limitations)+'</p>':'')+'<h3>'+t('Original sources','原始来源')+'</h3>'+unique.map(s=>'<div class="evidence">'+sourceLink(s)+(s.locator?'<small>'+tr(s.locator)+'</small>':'')+'</div>').join('');
}

return {detailMarkup,priceView,card,reportActions,sourceLink};
}
