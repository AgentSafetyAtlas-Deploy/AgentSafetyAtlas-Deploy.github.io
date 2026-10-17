// Release snapshot: the frozen package behind the paper (downloads/snapshot-<version>/, built by build_snapshot.py).
// The page only reads the package's own data card and manifest, so it always describes the files that are offered.
const VERSION = 'v1';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const num = n => n == null ? '—' : Number(n).toLocaleString('en-US');
const kb = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
let card, manifest, packageOpen = false; // the data files are published only once the source terms are confirmed (build_public.py)

export async function loadSnapshot() {
  if (!card) {
    const base = `./downloads/snapshot-${VERSION}/`;
    [card, manifest] = await Promise.all(['datacard.json', 'MANIFEST.json'].map(f => fetch(base + f).then(r => {
      if (!r.ok) throw Error('snapshot unavailable');
      return r.json();
    })));
    // a missing file falls back to the HTML page on Pages, so check the content type
    const first = manifest.files?.find(f => !f.path.startsWith('scripts/'));
    if (first) packageOpen = await fetch(base + first.path, {method: 'HEAD'}).then(r => r.ok && !/text\/html/.test(r.headers.get('content-type') || '')).catch(() => false);
  }
}

export function renderSnapshot({t}) {
  const base = `./downloads/snapshot-${VERSION}/`, c = card.counts, frozen = card.status === 'frozen';
  const fileNote = {
    'works.jsonl': t('one line per work: identifiers, dates with precision, clusters, form, publication, resources, institutions, countries', '每项工作一行：标识、带精度的日期、星团、类型、发表、资源、机构、国家'),
    'relations.jsonl': t('typed routes with their basis: citations (with citing sentences when available) and benchmark use (with the sentence)', '带出处的类型化航线：引用（可得时附施引原句）与基准采用（附原句）'),
    'clusters.json': t('galaxies, clusters and automatic candidate clusters with members', '星系、星团与自动候选星团及其成员'),
    'institutions.jsonl': t('ROR institutions with country and organisation type', 'ROR 机构及其国家与机构类型'),
    'findings.json': t('the observation report computed on this release', '基于本版本计算的观测报告'),
    'starmap-bands.json': t('per-work band signals used for star brightness', '星图亮度使用的每项工作的波段信号'),
    'datacard.json': t('this data card', '本数据卡'), 'MANIFEST.json': t('file list with SHA-256', '带 SHA-256 的文件清单')};
  const files = manifest.files.filter(f => !f.path.startsWith('scripts/') && !f.path.endsWith('.zip'));
  const scripts = manifest.files.filter(f => f.path.startsWith('scripts/'));
  const zip = manifest.files.find(f => f.path.endsWith('.zip'));
  return `<div class="sn">
  <section class="sn-head ${frozen ? 'is-frozen' : 'is-draft'}"><div>
   <span class="sn-kicker">${t('RELEASE SNAPSHOT', '冻结快照')} ${esc(card.version)} · ${esc(card.release)}</span>
   <h2>${frozen ? t('Frozen release package', '已冻结的发布资源包') : t('Draft release package', '发布资源包（草稿）')}</h2>
   <p>${frozen ? t(`Frozen on ${card.builtOn}. Numbers in the paper come from this package; the live site keeps updating and records each change.`, `${card.builtOn} 冻结。论文中的数字来自这个资源包；在线站点继续更新，并记录每次变化。`)
     : t(`Built on ${card.builtOn} from ${card.release} to check the package format. It becomes v1 when it is rebuilt with --status frozen from the release chosen for the paper.`, `${card.builtOn} 基于 ${card.release} 生成，用于检查资源包格式。用论文选定的版本以 --status frozen 重建后，才成为正式的 v1。`)}</p>
   <p class="sn-small">${t('Works dated through', '工作日期截至')} ${esc(card.worksDatedThrough)} · ${t('scope policy', '范围政策')} ${esc(card.scopePolicy)} · ${t('citation', '引用方式')}: ${esc(card.citation)}</p></div>
   ${zip && packageOpen ? `<a class="sn-download" href="${base + esc(zip.path)}" download>${t('Download the package', '下载资源包')}<small>${esc(zip.path)} · ${kb(zip.bytes)}</small></a>` : zip ? `<p class="sn-small">${t('The package is not published yet: downloads open once the source terms marked "check" below are confirmed. The files are listed so their contents and checksums are known in advance.', '资源包暂未公开：下面标“待确认”的来源条款确认后开放下载。这里先列出文件，内容与校验和可以提前核对。')}</p>` : ''}</section>
  <section class="sn-panel"><div class="sn-metrics">${[[c.works, t('works', '项工作')], [c.citationRoutes, t('citation routes', '条引用航线')], [c.citationWithSentence, t('with a citing sentence', '条带施引原句')],
    [c.benchmarkUseRoutes, t('benchmark-use routes', '条基准采用航线')], [c.institutions, t('ROR institutions', '个 ROR 机构')], [c.candidateClusters, t('candidate clusters', '个候选星团')]]
    .map(([v, l]) => `<div><b>${num(v)}</b><span>${l}</span></div>`).join('')}</div>
   <p class="sn-small">${esc(card.description)}</p></section>
  <section class="sn-panel"><h3>${t('Files', '文件')}</h3><table class="sn-table"><thead><tr><th>${t('File', '文件')}</th><th>${t('Contents', '内容')}</th><th>${t('Size', '大小')}</th><th>SHA-256</th></tr></thead><tbody>
   ${files.map(f => `<tr><td>${packageOpen ? `<a href="${base + esc(f.path)}" download>${esc(f.path)}</a>` : esc(f.path)}</td><td>${fileNote[f.path] || (/^relations-\d+\.jsonl$/.test(f.path) ? fileNote['relations.jsonl'] : '')}</td><td>${kb(f.bytes)}</td><td><code>${esc(f.sha256.slice(0, 16))}…</code></td></tr>`).join('')}
   <tr><td>scripts/</td><td>${scripts.map(f => packageOpen ? `<a href="${base + esc(f.path)}" download>${esc(f.path.slice(8))}</a>` : esc(f.path.slice(8))).join(' · ')}</td><td>${kb(scripts.reduce((a, f) => a + f.bytes, 0))}</td><td></td></tr></tbody></table></section>
  <section class="sn-panel sn-two"><div><h3>${t('Relation types', '关系类型')}</h3><dl>${Object.entries(card.relationTypes).map(([k, v]) => `<dt><code>${esc(k)}</code></dt><dd>${esc(v)}</dd>`).join('')}</dl>
   <h3>${t('Definitions', '定义')}</h3><dl>${Object.entries(card.definitions).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
   <div><h3>${t('Known limits', '已知局限')}</h3><ul>${card.knownLimits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
   <h3>${t('Recompute', '复算')}</h3><pre>${card.recompute.map(esc).join('\n')}</pre></div></section>
  <section class="sn-panel"><h3>${t('Sources and their terms', '数据来源及其条款')}</h3><p class="sn-small">${t('Terms as stated by each provider. Rows marked "check" must be confirmed before the package is released or deposited; until then this site does not publish it.', '条款按各提供方的说明列出。标“待确认”的行在资源包发布或存档前都必须确认；确认之前本站不发布资源包。')}</p>
   <table class="sn-table"><thead><tr><th>${t('Source', '来源')}</th><th>${t('Used for', '用途')}</th><th>${t('Terms', '条款')}</th><th></th></tr></thead><tbody>${card.sources.map(s => `<tr><td>${esc(s.source)}</td><td>${esc(s.used_for)}</td><td>${esc(s.terms)}</td><td>${s.check ? `<span class="sn-check">${t('check', '待确认')}</span>` : ''}</td></tr>`).join('')}</tbody></table></section>
  <section class="sn-panel"><h3>${t('Two forms in time', '两种时间形态')}</h3><div class="sn-two"><p><b>${t('Frozen release', '冻结的首发资源')}</b> — ${t('fixed cutoff, this package and its checksums, archived with a DOI; reviewers and others can recompute every published number from it.', '固定截止日、这个资源包及其校验和，以 DOI 存档；评审和其他人可以用它复算每个已发布的数字。')}</p>
   <p><b>${t('Maintained platform', '持续维护的观测平台')}</b> — ${t('Monday and Thursday updates; each release records additions, withdrawals, merged versions and scope changes, and the observation report is recomputed with the same procedure.', '每周一、四更新；每个版本记录新增、撤回、版本合并与口径变化，观测报告用同一流程重算。')}</p></div></section>
  </div>`;
}
