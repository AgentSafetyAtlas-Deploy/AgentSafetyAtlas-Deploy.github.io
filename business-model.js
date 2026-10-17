export const TYPE_LABELS = {
  funding:['Funding','融资'], acquisition:['M&A','并购'], grant:['Research grants','科研资助'],
  funding_history:['Cumulative disclosure','累计融资披露'], product:['Products & controls','产品与控制'],
  partnership:['Partnerships','合作与渠道'], deployment:['Deployment claims','部署叙述'],
  lifecycle:['Product lifecycle','产品生命周期'], buyer_material:['Buyer materials','买方材料'], evaluation:['Evaluations','评估阶段'],
  incident:['Reported incidents','事件报告'], research:['Controlled research','受控研究'],
  report:['Reports & analysis','报告与分析'], price:['Price observations','价格观察'], company:['Company identity','主体资料'],
  payment:['Reported payments','官方披露付款'], programme:['Public programmes','公共资助动态'], contract:['Procurement & contracts','采购与合同'], cost:['Operating costs','运营支出'], fund:['Fund formation','基金募集']
};
export const CAPABILITIES = {
  runtime:['Runtime protection','运行时保护'], identity:['Identity & permissions','身份与权限'],
  evaluation:['Evaluation & red teaming','评测与红队'], mcp:['MCP & tools','MCP 与工具'],
  governance:['Governance & audit','治理与审计'], oversight:['Agent oversight','Agent 监督'],
  isolation:['Isolation','隔离执行'], gateway:['Gateways','网关'], endpoint:['Endpoint protection','端点防护']
};
export const DEFAULT_FILTERS = {query:'',type:'all',company:'all',capability:'all',from:'',to:'',undated:false};
export function dateBounds(date) {
  if (!date) return null;
  if (/^\d{4}$/.test(date)) return [date+'-01-01',date+'-12-31'];
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [year,month]=date.split('-').map(Number);
    return [date+'-01',date+'-'+new Date(Date.UTC(year,month,0)).getUTCDate()];
  }
  return [date,date];
}
export function filterEvents(data, filters={}) {
  const f={...DEFAULT_FILTERS,...filters};
  const names=new Map(data.companies.map(c=>[c.id,c.name]));
  const money=new Map(data.money.map(m=>[m.id,m]));
  const query=f.query.trim().toLocaleLowerCase();
  if(f.from && f.to && f.from>f.to)return [];
  return data.events.filter(e=>{
    if(f.type!=='all' && e.type!==f.type)return false;
    if(f.company!=='all' && !e.companies.includes(f.company))return false;
    if(f.capability!=='all' && !e.capabilities.includes(f.capability))return false;
    if(f.from || f.to){
      const bounds=dateBounds(e.date);
      if(!bounds && !f.undated)return false;
      if(bounds && ((f.from && bounds[1]<f.from)||(f.to && bounds[0]>f.to)))return false;
    }
    return !query || JSON.stringify([e.title,e.summary,e.spendingPurpose,e.companies.map(id=>names.get(id)),money.get(e.id)?.participants])
      .toLocaleLowerCase().includes(query);
  });
}
export function moneyRows(data, events) {
  const ids=new Set(events.map(e=>e.id));
  return data.money.filter(m=>ids.has(m.id)).sort((a,b)=>b.date.localeCompare(a.date));
}
export function ledgerGroups(rows) {
  const groups=new Map();
  for(const row of rows){
    if(row.type==='funding_history' || row.amount==null)continue;
    const basis=['acquisition','contract'].includes(row.type)?row.amountBasis:row.type;
    const allocation=row.type==='contract'?row.allocation:null;
    const key=[row.type,row.currency,basis,allocation].join('|');
    if(!groups.has(key))groups.set(key,{type:row.type,currency:row.currency,basis,allocation,total:0,count:0,ids:[]});
    const g=groups.get(key);g.total+=row.amount;g.count++;g.ids.push(row.id);
  }
  return [...groups.values()];
}
export function paymentRows(data, events) {
  const ids=new Set(events.map(e=>e.id));
  return (data.payments||[]).filter(p=>ids.has(p.id)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
export function paymentPurposeGroups(rows) {
  const groups=new Map();
  for(const row of rows){
    const purpose=row.spendingPurpose||{id:'unspecified',label:{en:'Purpose unspecified',zh:'用途未细分'}};
    const key=row.currency+'|'+purpose.id;
    if(!groups.has(key))groups.set(key,{key,purposeId:purpose.id,label:purpose.label,currency:row.currency,totalMinor:0,ids:[]});
    const group=groups.get(key);group.totalMinor+=row.amountMinor;group.ids.push(row.id);
  }
  return [...groups.values()].sort((a,b)=>a.currency.localeCompare(b.currency)||b.totalMinor-a.totalMinor||a.key.localeCompare(b.key));
}
export function buyerRows(data, events) {
  const ids=new Set(events.map(e=>e.detailId));
  return data.buyers.filter(b=>ids.has(b.detailId)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}
export function investorRows(rows) {
  const investors=new Map();
  for(const m of rows.filter(r=>!['contract','payment'].includes(r.type)))for(const participant of m.participants||[]){
    if(/named |angels|other named|strategic angels/i.test(participant.name))continue;
    const key=participant.name.trim().toLowerCase();
    if(!investors.has(key))investors.set(key,{name:participant.name,transactions:[]});
    investors.get(key).transactions.push({id:m.id,companyId:m.companyId,role:participant.role,date:m.date});
  }
  return [...investors.values()].sort((a,b)=>b.transactions.length-a.transactions.length||a.name.localeCompare(b.name));
}
export function snapshot(data, filters) {
  const events=filterEvents(data,filters);
  const money=moneyRows(data,events);
  return {schemaVersion:data.meta.schemaVersion,exportedAt:new Date().toISOString(),
    sourceCutoff:data.meta.cutoff,interfaceUpdated:data.meta.interfaceUpdated,filters:{...filters},
    scope:'Collected public evidence; not a global market census',
    totals:ledgerGroups(money),events,money,payments:paymentRows(data,events),paymentPurposes:paymentPurposeGroups(paymentRows(data,events)),buyers:buyerRows(data,events),prices:priceRows(data,events),channels:channelRows(data,events)};
}
export function parseRoute(hash) {
  const [route,query='']=hash.replace(/^#/,'').split('?');
  const p=new URLSearchParams(query),filters={...DEFAULT_FILTERS};
  for(const key of Object.keys(filters))if(p.has(key))filters[key]=key==='undated'?p.get(key)==='1':p.get(key);
  return {view:route==='overview'||!route?'activity':route,filters};
}
export function routeHash(view, filters) {
  const p=new URLSearchParams();
  for(const [key,value] of Object.entries(filters))if(value!==DEFAULT_FILTERS[key]&&value!=='')p.set(key,key==='undated'?(value?'1':'0'):value);
  return '#'+view+(p.size?'?'+p.toString():'');
}

export const PRICE_MODELS = {
  metered:['Metered service','按服务用量'], user:['Per user','按用户'], agent:['Per agent','按 Agent'],
  annual_platform:['Annual contract dimension','年度合同维度'],
  undefined_usage:['Additional usage; unit unknown','额外用量 · 单位未知'], private_offer:['Private offer','私有报价']
};
export function priceRows(data,events){
  const ids=new Set(events.map(e=>e.id));
  return (data.prices||[]).filter(p=>ids.has(p.id));
}
export function pricingGroups(rows){
  return Object.keys(PRICE_MODELS).map(key=>({key,rows:rows.filter(p=>p.priceModel===key)})).filter(g=>g.rows.length);
}
export function estimatePrice(price,quantity){
  if(!price?.calculation || !price.unitDefined || price.amount==null || price.pricingStatus!=='public_rate')return null;
  if(typeof quantity!=='number'||!Number.isSafeInteger(quantity)||quantity<0||quantity>1e12)return null;
  const c=price.calculation,billedUnits=Math.max(quantity,c.minimumUnits||0);
  const total=billedUnits/c.divisor*price.amount*c.periodFactor;
  return {quantity,billedUnits,total,period:c.period,currency:price.currency,priceId:price.id,
    minimumApplies:quantity<(c.minimumUnits||0)};
}

export const DEMAND_NEEDS = {
 visibility:['Usage visibility','使用可见性'], data_protection:['Sensitive data protection','敏感数据保护'],
 access_governance:['Access and policy control','访问与策略控制'], operations_integration:['Fit existing security operations','接入现有安全运营'],
 auditability:['Audit and compliance evidence','审计与合规记录'], adoption_enablement:['Enable safer adoption','支持安全采用']
};
export function demandRows(data,events){return buyerRows(data,events).filter(b=>b.demandProfile)}
export function demandGroups(rows){
 return Object.keys(DEMAND_NEEDS).map(key=>({key,rows:rows.filter(b=>b.demandProfile.needs.includes(key))})).filter(g=>g.rows.length);
}
export function channelRows(data,events){
 const ids=new Set(events.map(e=>e.detailId));
 return (data.materials||[]).filter(m=>m.channelProfile&&ids.has(m.id));
}
export function demandSnapshot(data,events,need='all'){
 const rows=demandRows(data,events),selected=rows.filter(b=>need==='all'||b.demandProfile.needs.includes(need));
 return {scope:'Selected adoption accounts with explicit demand annotations; not an industry census',need,
  annotatedRecords:rows.length,unannotatedRecords:buyerRows(data,events).length-rows.length,
  visibleCaseIds:selected.map(r=>r.detailId),namedBuyers:[...new Set(rows.filter(r=>r.demandProfile.namedBuyer).map(r=>r.buyer))],
  groups:demandGroups(rows).map(g=>({key:g.key,count:g.rows.length,caseIds:g.rows.map(b=>b.detailId)})),
  stages:{plannedExpansion:rows.filter(b=>b.demandProfile.expansionStatus==='planned').map(b=>b.detailId),
   reportedScopeExpansion:rows.filter(b=>b.demandProfile.expansionStatus==='reported_scope_expansion').map(b=>b.detailId)},
  channelIds:channelRows(data,events).map(r=>r.id)};
}
