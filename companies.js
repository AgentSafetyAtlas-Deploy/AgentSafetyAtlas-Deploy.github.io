
const $=s=>document.querySelector(s);
let data;
const state={view:'overview',query:'',filter:'all',lang:'zh',companyMode:'profiles'};
const t=(en,zh)=>state.lang==='en'?en:zh;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr=v=>esc(v&&typeof v==='object'?(v[state.lang]||v.en||v.zh||''):v);
try{state.lang=localStorage.getItem('atlas-language')==='en'?'en':'zh'}catch{}
const views=()=>({overview:t('Business overview','商业总览'),companies:t('Companies & products','企业与产品'),money:t('Capital & VC','资本与 VC'),reports:t('Reports & analysts','报告与分析机构'),cases:t('Incidents & cases','事件与案例')});
const labels=()=>({funding:t('Funding','融资'),acquisition:t('M&A','并购'),company_report:t('Company report','科技公司报告'),analyst_report:t('Analyst report','分析机构报告'),editorial_report:t('Atlas editorial analysis','本站综合分析'),analysis:t('Analysis & recommendations','分析与建议'),observed:t('Observed data','观察数据'),mixed:t('Survey & signals','调查与趋势信号'),forecast:t('Forecast','预测'),incident:t('Incident · first-party report','真实事件 · 当事方报告'),controlled_research:t('Controlled research / PoC','受控研究／PoC'),deployment_case:t('Vendor deployment case','厂商部署案例'),buyer_material:t('Buyer-side material','买方材料'),evaluation_case:t('Evaluation-stage case','评估阶段案例'),lead:t('Lead','领投'),participant:t('Participant','参投'),acquirer:t('Acquirer','收购方')});
const label=k=>labels()[k]||esc(k);
const company=id=>data.companies.find(c=>c.id===id);
const amount=v=>v==null?t('Undisclosed','未披露'):'$'+(v/1e6).toLocaleString('en-US',{maximumFractionDigits:3})+'M';
const badge=(text,kind='')=>'<span class="ep-badge '+kind+'">'+text+'</span>';
const detailButton=id=>'<button class="ep-text-button" data-detail="'+esc(id)+'">'+t('Evidence & details','查看证据与详情')+' ↗</button>';
const sourceLink=s=>/^https?:\/\//.test(s.url)?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a>':esc(s.title);
const matches=r=>!state.query||JSON.stringify([r,company(r.companyId)?.name]).toLowerCase().includes(state.query.toLowerCase());
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
function sampleCounts(){
 return data.companies.length+' '+t('company / brand profiles','个企业／品牌档案')+' · '+data.money.length+' '+t('capital events','笔资本事件')+'<br>'+data.reports.filter(r=>r.kind!=='editorial_report').length+' '+t('external reports','份外部报告')+' + '+data.reports.filter(r=>r.kind==='editorial_report').length+' '+t('Atlas analysis','份本站分析')+' · '+data.cases.length+' '+t('cases','个案例');
}
function batchDates(){
 return (data.meta.batches||[{id:data.meta.id,cutoff:data.meta.cutoff}]).map(b=>esc(b.id)+' · '+esc(b.cutoff)).join('<br>');
}
function overview(){
 const rows=funding().sort((a,b)=>b.amount-a.amount),total=rows.reduce((s,r)=>s+r.amount,0),max=Math.max(...rows.map(r=>r.amount));
 const bars=rows.map(r=>'<button class="ep-bar-row" data-detail="'+esc(r.id)+'"><span class="ep-bar-label"><b>'+esc(company(r.companyId).name)+'</b><small>'+r.date+' · '+roundName(r.round)+'</small></span><span class="ep-bar-track"><span style="width:'+100*r.amount/max+'%"></span></span><strong>'+amount(r.amount)+'</strong></button>').join('');
 const facts=[[t('Company / brand profiles','企业／品牌档案'),data.companies.length],[t('Named deployment case','具名部署案例'),data.cases.filter(r=>r.kind==='deployment_case').length],[t('Customer procurement value','客户采购金额'),t('Not collected','尚未取得')],[t('Internal safety budgets','内部安全预算'),t('Not collected','尚未取得')]];
 return featuredReport()+'<div class="ep-brief"><section class="ep-capital"><div class="ep-capital-top"><div><p class="ep-eyebrow">'+t('FOLLOW THE MONEY','追踪资金去向')+'</p><h2>'+t('Capital entering the sample','样本企业获得的资本')+'</h2></div><span class="ep-total">'+amount(total)+'</span></div><p class="ep-capital-note">'+rows.length+' '+t('selected disclosed historical funding rounds · USD. Not cumulative company funding, market size or safety spending.','笔选定历史融资的披露金额合计 · 美元。不代表企业累计融资、市场规模或安全支出。')+'</p>'+fundingScopeNote(true)+'<div class="ep-bars">'+bars+'</div><div class="ep-capital-footer"><span>'+data.money.filter(r=>r.type==='acquisition').length+' '+t('M&A events · counted separately from funding','笔并购事件 · 与融资分别记账')+'</span><button data-view="money">'+t('Open capital ledger','打开资本账本')+' →</button></div></section><aside class="ep-demand"><p class="ep-eyebrow">'+t('COMMERCIAL EVIDENCE','商业落地证据')+'</p><h2>'+t('Where is demand visible?','需求在哪里显现？')+'</h2><dl>'+facts.map(([k,v])=>'<div><dt>'+k+'</dt><dd class="'+(typeof v==='string'?'ep-unknown':'')+'">'+v+'</dd></div>').join('')+'</dl><p>'+t('A named deployment supports a use case. Payment, scale and independently measured effectiveness remain separate questions.','具名部署能支持应用场景判断；是否付费、采购规模和独立测量的效果仍需分别核实。')+'</p><button class="ep-text-button" data-view="cases">'+t('Inspect the case evidence','查看案例证据')+' →</button></aside></div><div class="ep-reading"><strong>'+t('Reading the evidence','如何理解样本')+'</strong><p>'+t('The sample spans runtime controls, security testing and agent evaluation. Linking a capital event to a current product does not establish how that capital was spent.','样本覆盖运行时控制、安全测试和 Agent 评测。资本事件与当前产品可关联查看，但尚不能据此认定某轮融资被投入了这些产品。')+'</p></div>'+section(t('How the industry frames the opportunity','产业如何解释这个机会'),t('Company reports and analyst forecasts, with their scope kept visible.','科技公司报告与分析机构预测，各自保留口径和适用范围。'),'reports')+section(t('What creates a reason to buy?','什么问题形成采购动因？'),t('Reported failures, controlled research and vendor deployment claims.','区分当事方报告的失效、受控研究和厂商部署叙述。'),'cases');
}
function moneyView(){
 const rows=data.money.filter(matches).filter(r=>state.filter==='all'||r.type===state.filter).sort((a,b)=>b.date.localeCompare(a.date));
 const investors=new Map();
 for(const r of rows)for(const p of r.participants||[]){if(!investors.has(p.name))investors.set(p.name,[]);investors.get(p.name).push({r,role:p.role})}
 const stats=['funding','acquisition'].map(key=>'<button class="ep-ledger-stat '+(state.filter===key?'selected':'')+'" data-filter="'+key+'"><span>'+label(key)+'</span><strong>'+data.money.filter(r=>r.type===key).length+'<small> '+t('events','笔事件')+'</small></strong></button>').join('')+[t('Customer purchases','客户采购'),t('Internal budgets','内部预算')].map(k=>'<div class="ep-ledger-stat"><span>'+k+'</span><strong class="ep-unknown">'+t('Not collected','尚未取得')+'</strong></div>').join('');
 const head=[t('Date / event','日期／事件'),t('Recipient / target','收款方／标的'),t('Disclosed amount','披露金额'),t('Capital providers','出资方'),t('Evidence','证据')].map(v=>'<th scope="col">'+v+'</th>').join('');
 const body=rows.map(r=>'<tr><td><strong>'+r.date+'</strong><small>'+label(r.type)+' · '+roundName(r.round)+'</small><small>'+transactionStatus(r)+'</small></td><td>'+esc(company(r.companyId).name)+'</td><td class="ep-amount">'+amount(r.amount)+(r.currency?'<small>'+r.currency+'</small>':'')+'</td><td>'+r.participants.map(p=>'<span class="ep-investor-line">'+esc(p.name)+' <small>'+label(p.role)+'</small></span>').join('')+'</td><td>'+detailButton(r.id)+'</td></tr>').join('');
 const vcs=[...investors].map(([name,relations])=>'<article class="ep-investor"><h3>'+esc(name)+'</h3>'+relations.map(({r,role})=>'<button data-detail="'+esc(r.id)+'">'+esc(company(r.companyId).name)+'<small>'+label(role)+' · '+r.date.slice(0,4)+'</small></button>').join('')+'</article>').join('');
 return '<div class="ep-ledger-summary">'+stats+'</div>'+fundingScopeNote()+'<p class="ep-note">'+t('Amounts belong to transactions, not individual investors. The selected rounds are historical examples, not the latest or lifetime totals. M&A is excluded from the funding sum.','金额归属于交易，不分摊给各投资方。这里展示选定历史轮次，不代表最新轮次或累计融资。并购金额不计入融资合计。')+'</p><div class="ep-table-wrap"><table class="ep-table"><thead><tr>'+head+'</tr></thead><tbody>'+body+(rows.length?'':'<tr><td colspan="5">'+t('No matching records.','没有匹配记录。')+'</td></tr>')+'</tbody></table></div><section class="ep-section"><div class="ep-section-heading"><div><h2>'+t('VC & strategic capital','VC 与产业资本')+'</h2><p>'+t('Who backs whom. Individual check sizes are not disclosed in this sample.','谁支持了谁。样本未披露各出资方的独立投资金额。')+'</p></div></div><div class="ep-investor-grid">'+vcs+'</div></section>';
}

function roundName(value){return ({'Not stated':t('Round not stated','未披露轮次'),'Acquisition':t('Acquisition','收购'),'Additional seed':t('Additional seed','新增种子融资'),'Seed':t('Seed','种子轮'),'Series A':t('Series A','A 轮'),'Series B':t('Series B','B 轮'),'Strategic funding':t('Strategic funding','战略融资')})[value]||esc(value||'')}
function transactionStatus(r){
 const status=r.status||r.transactionStatus||(r.type==='funding'?'company_announced_raised':'');
 return ({completed:t('Completed','已完成'),announced_as_acquired:t('Announced as acquired; closing date unverified','公告称已收购；交割日待核实'),company_announced_raised:t('Company-announced funding','公司公告融资')})[status]||t('Status not separately verified','状态未另行核实');
}
function basisName(key){
 const m={
 'completed':['Legal closing date','法律交割日'],'announced':['Announcement date','公告日期'],
 'single_funding_round':['Single funding round','单轮融资'],
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
 for(const [k,en,zh] of [['announcedOn','Announced','公告日期'],['completedOn','Completed','交割日期'],['pageDatedOn','Page date','网页署日'],['observedOn','Observed','观察日期']])if(r[k])facts.push([t(en,zh),esc(r[k])]);
 let text='<div class="ep-detail-note"><dl class="ep-facts">'+facts.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>').join('')+'</dl></div>';
 if(r.priorDisclosures?.length)text+='<h3>'+t('Earlier disclosures of the same transaction','同一交易的此前披露')+'</h3><p class="muted">'+t('Do not add these values to the current consideration. Different accounting bases do not establish a price reduction.','不能与当前对价相加；会计口径不同不能直接解释为降价。')+'</p>'+r.priorDisclosures.map(p=>'<p>'+(p.approximate?t('Approximately ','约 '):'')+amount(p.amount_usd_m*1e6)+' · '+basisName(p.amount_basis)+'</p>').join('');
 return text;
}
function priceAmount(value){return '$'+Number(value).toLocaleString('en-US',{maximumFractionDigits:6})}
function companySwitch(){
 return '<div class="ep-subnav"><button data-company-mode="profiles" class="'+(state.companyMode==='profiles'?'active':'')+'">'+t('Company / brand profiles','企业／品牌档案')+' · '+data.companies.length+'</button><button data-company-mode="prices" class="'+(state.companyMode==='prices'?'active':'')+'">'+t('Public price list','公开价目表')+' · '+(data.prices||[]).length+'</button></div>';
}
function priceTable(rows){
 return '<div class="ep-table-wrap"><table class="ep-table ep-price-table"><thead><tr>'+[t('Product','产品'),t('USD list price / unit','美元挂牌价／单位'),t('Minimum commitment & limits','最低承诺与限制'),t('Evidence','证据')].map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><td><strong>'+esc(r.product)+'</strong><small>'+esc(company(r.companyId)?.name)+' · '+esc(r.observedOn)+'</small></td><td><strong>'+priceAmount(r.amount)+'</strong><small>'+tr(r.unit)+'</small></td><td>'+(r.minimumAnnualAmount?'<strong>'+t('Listed minimum ','挂牌最低 ')+priceAmount(r.minimumAnnualAmount)+t('/year','／年')+'</strong><br>':'')+tr(r.limitations)+'</td><td>'+detailButton(r.id)+'</td></tr>').join('')+(rows.length?'':'<tr><td colspan="4">'+t('No matching prices.','没有匹配的价格记录。')+'</td></tr>')+'</tbody></table></div>';
}
function priceDetail(r){
 return '<p class="ep-meta">'+t('Public list price · observed ','公开挂牌价 · 观察日期 ')+esc(r.observedOn)+' · '+esc(r.batchId)+'</p><h2 id="ep-detail-title">'+esc(r.product)+'</h2><p><strong>'+priceAmount(r.amount)+' USD</strong> · '+tr(r.unit)+'</p>'+(r.minimumUnits?'<p>'+t('Minimum units: ','最低数量：')+r.minimumUnits+' · '+t('Listed annual minimum: ','挂牌年度最低：')+priceAmount(r.minimumAnnualAmount)+'</p>':'')+'<p class="ep-note">'+t('List price, not an invoice, observed contract value or revenue. Do not add different product dimensions into a mandatory bundle.','挂牌价，不是客户账单、已观察合同额或收入；不同产品维度不能默认相加为强制套餐。')+'</p><h3>'+t('Scope & limits','范围与限制')+'</h3><p>'+tr(r.limitations)+'</p><h3>'+t('Original sources','原始来源')+'</h3>'+r.sources.map(x=>'<div class="evidence">'+sourceLink(x)+'</div>').join('');
}
function priceView(){
 const rows=(data.prices||[]).filter(matches);
 return '<p class="ep-note">'+t('Public list prices have different units and scopes. They are not procurement, financing or ARR. Minimum commitments and excluded costs are retained.','公开挂牌价的单位与覆盖范围不同，不是采购金额、融资或 ARR。最低承诺与不包含的费用分别保留。')+'</p>'+priceTable(rows)+(data.scenarios||[]).map(r=>'<section class="ep-scenario"><span class="ep-badge amber">'+t('Hypothetical calculation · not a customer bill','假设计算 · 不是客户账单')+'</span><h2>'+tr(r.label)+'</h2><p>'+tr(r.assumptions)+'</p><div class="ep-scenario-values"><div><span>'+t('One checked input/output pair','检查一对输入／输出')+'</span><strong>'+priceAmount(r.monthlyUSD)+t('/month','／月')+'</strong></div><div><span>'+t('Ten checked pairs','检查十对输入／输出')+'</span><strong>'+priceAmount(r.repeatedTenPairsMonthlyUSD)+t('/month','／月')+'</strong></div></div><p><strong>'+t('Excludes: ','不包含：')+'</strong>'+tr(r.excludedCosts)+'</p><p>'+t('A component-level scenario cannot be compared directly with a full enterprise annual subscription.','该服务组件的成本示例不能与完整企业年约直接比较。')+'</p><p>'+r.sources.map(sourceLink).join(' · ')+'</p><a class="ep-text-button" href="./business-report-2026-09-12.html#section-9">'+t('See the report assumptions','查看报告中的计算前提')+' ↗</a></section>').join('');
}
function toolbar(){
 const opts=state.view==='money'?['funding','acquisition']:state.view==='reports'?['company_report','analyst_report','editorial_report']:state.view==='cases'?['incident','controlled_research','deployment_case','buyer_material','evaluation_case']:[];
 return '<div class="ep-toolbar"><label class="ep-search"><span>'+t('Search','搜索')+'</span><input id="ep-search" type="search" value="'+esc(state.query)+'" placeholder="'+t('Company, product, institution or topic','企业、产品、机构或主题')+'"></label>'+(opts.length?'<label class="ep-select"><span>'+t('Type','类型')+'</span><select id="ep-filter"><option value="all">'+t('All types','全部类型')+'</option>'+opts.map(k=>'<option value="'+k+'" '+(state.filter===k?'selected':'')+'>'+label(k)+'</option>').join('')+'</select></label>':'')+'<a class="ep-download" href="./data/enterprise.json" download>'+t('Download JSON','下载 JSON')+' ↓</a>'+(state.view==='money'?'<a class="ep-download" href="./data/enterprise-money.csv" download>CSV ↓</a>':'')+'</div>';
}
function content(){
 if(state.view==='overview')return overview();
 if(state.view==='money')return moneyView();
 if(state.view==='companies'&&state.companyMode==='prices')return companySwitch()+priceView();
 const rows=data[state.view].filter(matches).filter(r=>state.filter==='all'||r.kind===state.filter);
 return (state.view==='companies'?companySwitch():'')+'<p class="ep-result" role="status">'+rows.length+' '+t('records in this sample','条样本记录')+'</p><div class="ep-grid">'+rows.map(r=>card(r,state.view)).join('')+'</div>'+(rows.length?'':'<div class="empty">'+t('No matching records. Try another search.','没有匹配记录，请更换搜索条件。')+'</div>');
}
function renderContent(){$('#ep-content').innerHTML=content();if($('#ep-filter'))$('#ep-filter').value=state.filter}
function render(){
 document.documentElement.lang=state.lang==='zh'?'zh-CN':'en';
 const nav=Object.entries(views()).map(([key,title])=>'<button id="tab-'+key+'" role="tab" aria-controls="ep-panel" aria-selected="'+(state.view===key)+'" tabindex="'+(state.view===key?'0':'-1')+'" class="'+(state.view===key?'active':'')+'" data-view="'+key+'">'+title+'</button>').join('');
 $('#app').innerHTML='<header class="ep-header"><a class="brand" href="./"><span class="xmark" aria-hidden="true"><svg viewBox="0 0 40 40"><rect x="1" y="1" width="38" height="38" rx="11"/><g class="xstrokes"><path d="M11 27 18 14 28 20 26 30" style="stroke-width:2"/><circle cx="11" cy="27" r="2.6"/><circle cx="18" cy="14" r="2.6"/><circle cx="28" cy="20" r="3.4"/><circle cx="26" cy="30" r="2.2"/></g></svg></span><span>Agent Safety Atlas<small>'+t('BUSINESS & INDUSTRY','企业与产业研究')+'</small></span></a><div class="ep-header-actions"><a href="./#research">'+t('Research library','学术研究库')+' ↗</a><a href="./sources-report.html">'+t('Sources report','来源报告')+'</a><button id="ep-language" class="language-switch">'+t('中文','English')+'</button></div></header><main class="ep-main"><div class="ep-hero"><div><p class="ep-eyebrow">'+t('ENTERPRISE INTELLIGENCE','企业线 · 商业情报')+'</p><h1>'+t('Follow the money.<br>Examine the demand.','钱流到哪里，<br>需求从哪里来。')+'</h1><p class="ep-intro">'+t('Connect products, capital, industry signals and failure cases to their original evidence.','把产品、资本、行业判断和失效案例，连回可追溯的原始证据。')+'</p></div><aside class="ep-pilot"><span>'+t('ENTERPRISE RESEARCH','企业研究')+'</span><strong>'+t('Source-linked research batches','按来源与批次追踪')+'</strong><p>'+sampleCounts()+'</p><small>'+t('Source cutoffs by batch','各批次资料截止')+'<br>'+batchDates()+'<br>'+t('Updated','整理更新')+' '+esc(data.meta.updated)+'</small></aside></div><nav class="ep-tabs" aria-label="'+t('Business sections','企业研究栏目')+'" role="tablist">'+nav+'</nav><div id="ep-panel" role="tabpanel" aria-labelledby="tab-'+state.view+'">'+(state.view==='overview'?'':toolbar())+'<div id="ep-content">'+content()+'</div></div><footer class="ep-footer"><span>'+t('Curated sample, not a market census. Financing, purchasing and security effectiveness are separate evidence.','定向选样，非市场普查。融资、采购与安全效果分别取证。')+'</span><a href="./sources-report.html">'+t('Data sources report','数据来源报告')+' ↗</a><a href="./data/enterprise.json" download>'+t('Download source-linked data','下载含来源的数据')+' ↓</a></footer></main><dialog id="ep-dialog" aria-labelledby="ep-detail-title"><button class="close" id="ep-close" aria-label="'+t('Close','关闭')+'">×</button><div class="detail" id="ep-detail"></div></dialog>';
 $('#ep-language').onclick=()=>{state.lang=state.lang==='zh'?'en':'zh';try{localStorage.setItem('atlas-language',state.lang)}catch{}render()};
 $('#ep-search')?.addEventListener('input',ev=>{state.query=ev.target.value;renderContent()});
 $('#ep-filter')?.addEventListener('change',ev=>{state.filter=ev.target.value;renderContent()});
 $('#ep-close').onclick=()=>$('#ep-dialog').close();
 $('.ep-tabs').addEventListener('keydown',ev=>{const keys=Object.keys(views());let i=keys.indexOf(state.view);if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;ev.preventDefault();i=ev.key==='Home'?0:ev.key==='End'?keys.length-1:(i+(ev.key==='ArrowRight'?1:-1)+keys.length)%keys.length;setView(keys[i]);$('#tab-'+keys[i]).focus()});
}
function setView(view){if(!views()[view])return;state.view=view;state.filter='all';state.query='';history.replaceState(null,'','#'+view);render()}
function detailMarkup(r){
 if(r.evidenceType==='public_list_price')return priceDetail(r);
 const sources=[...r.sources,...(r.products||[]).flatMap(p=>p.sources||[])],unique=[...new Map(sources.map(s=>[s.url,s])).values()];
 const title=r.name||r.title||company(r.companyId)?.name+' · '+label(r.type);
 return '<p class="ep-meta">'+esc(r.date||t('Company profile','企业档案'))+' · '+esc(r.batchId||'EP001')+' · '+t('Cutoff','截止')+' '+esc(r.cutoff||'2026-09-09')+(r.eventDate?' · '+t('Event date','事件发生')+' '+esc(r.eventDate):'')+(r.updatedInBatches?.length?' · '+t('Updated','更新')+' '+r.updatedInBatches.map(esc).join(', ')+' / '+esc(r.observedOn):'')+'</p><h2 id="ep-detail-title">'+esc(title)+'</h2>'+(r.owner?'<p class="ep-owner">'+t('Owner','所属方')+' · '+esc(r.owner)+'</p>':'')+'<p>'+tr(r.summary)+'</p>'+reportActions(r)+(r.evidenceStatus?'<div class="ep-detail-note"><strong>'+t('Evidence status','证据状态')+'</strong><p>'+tr(r.evidenceStatus)+'</p></div>':'')+(r.products||[]).map(p=>'<h3>'+esc(p.name)+'</h3><p>'+tr(p.summary)+'</p><div class="ep-detail-note"><p><strong>'+t('Product stage','产品阶段')+'：</strong>'+tr(p.stage)+'</p><p><strong>'+t('Pricing','定价')+'：</strong>'+tr(p.pricing)+'</p></div>').join('')+(r.amount!==undefined?'<h3>'+t('Transaction','交易信息')+'</h3><p>'+label(r.type)+' · '+r.date+' · '+amount(r.amount)+' '+esc(r.currency||'')+'</p><p>'+(r.participants||[]).map(p=>esc(p.name)+' ('+label(p.role)+')').join(' · ')+'</p>':'')+(r.type?moneyFacts(r):'')+((r.products&&(data.prices||[]).some(p=>p.companyId===r.id))?'<h3>'+t('Public list prices','公开挂牌价')+'</h3>'+priceTable(data.prices.filter(p=>p.companyId===r.id)):'')+(r.businessQuestion?'<h3>'+t('Business question','回答的商业问题')+'</h3><p>'+tr(r.businessQuestion)+'</p>':'')+(r.fourthEventDate?'<p class="ep-note">'+t('Fourth incident only: occurred ','仅第四起事件：发生于 ')+esc(r.fourthEventDate)+' · '+t('discovered ','发现于 ')+esc(r.fourthEventDiscovered)+'</p>':'')+(r.limitations?'<h3>'+t('Evidence boundaries','证据边界')+'</h3><p>'+tr(r.limitations)+'</p>':'')+'<h3>'+t('Original sources','原始来源')+'</h3>'+unique.map(s=>'<div class="evidence">'+sourceLink(s)+(s.locator?'<small>'+tr(s.locator)+'</small>':'')+'</div>').join('');
}
document.addEventListener('click',ev=>{
 const target=ev.target.closest('button');if(!target)return;
 if(target.dataset.view)setView(target.dataset.view);
 if(target.dataset.companyMode){state.companyMode=target.dataset.companyMode;renderContent()}
 if(target.dataset.filter){state.filter=state.filter===target.dataset.filter?'all':target.dataset.filter;renderContent()}
 if(target.dataset.detail){const r=[...data.companies,...data.money,...data.reports,...data.cases,...(data.prices||[])].find(r=>r.id===target.dataset.detail);if(r){$('#ep-detail').innerHTML=detailMarkup(r);$('#ep-dialog').showModal()}}
});
window.addEventListener('hashchange',()=>{const view=location.hash.slice(1);if(views()[view]&&view!==state.view)setView(view)});
if(views()[location.hash.slice(1)])state.view=location.hash.slice(1);
try{
 const response=await fetch('./data/enterprise.json');
 if(!response.ok)throw Error('Data request failed');
 data=await response.json();render();
}catch{
 $('#app').innerHTML='<main class="error"><h1>企业样本暂时无法加载 / Data unavailable</h1><p>请刷新页面重试，或查看原始数据。</p><a href="./data/enterprise.json">原始数据 / Data</a> · <a href="./">返回研究库 / Research</a></main>';
}

