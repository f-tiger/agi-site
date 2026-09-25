// MCP census page (2026-09-25). Renders data/mcp-census.jsonl + data/mcp-census-summary.json (written by scripts/mcp-census.mjs on
// the daily schedule) through build.mjs's own layout(). Every number on the page comes from censusView(), the same function
// /mcp-census.json and `mcp-census.mjs --dist` use, so the page, the JSON and the gate cannot disagree.
// Third-party tool descriptions are never stored, so they cannot appear here: the page shows states, counts, hashes' effects
// (a change date) and registry names only.
import fs from 'node:fs';
import { readCensus, censusView, SUMMARY } from './mcp-census.mjs';

export function buildCensusPage(ctx) {
  const { layout, railOf, esc, crumbLd, faqLd, BASE, site, NAME, LOCALE, write, pushPage } = ctx;
  if (!fs.existsSync(SUMMARY)) return null;
  const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));
  const records = readCensus();
  const day = summary.checked;
  const v = censusView(records, day);
  const zh = LOCALE.code === 'zh';
  const T = (en, z) => (zh ? z : en);
  const url = (p) => `${BASE}${p}`;
  const path = '/agents/mcp-census.html';
  const n = (x) => Number(x || 0).toLocaleString(zh ? 'zh-CN' : 'en-US');
  const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');
  const reg = summary.registry;
  const answered = v.states.ok, auth = v.states.auth, broken = v.states.dead + v.states.error, seen = v.probed_recent;
  const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };
  const topShare = reg.top_hosts.slice(0, 3).reduce((s, h) => s + h.entries, 0);
  const months = Object.entries(reg.by_month).slice(-8);

  const h1 = T('MCP census: how many servers in the official MCP registry actually answer', 'MCP 普查：官方注册表里的 MCP 服务器，有多少真的能连上');
  const answer = seen
    ? T(`On ${day} the official MCP registry listed ${n(reg.servers)} latest-version servers; ${n(reg.with_remote)} advertise a remote endpoint. This site checks the probe-able ones read-only every day (initialize and tools/list only — never a tool call). Of the ${n(seen)} endpoints checked in the last ${v.window_days} days, ${n(answered)} listed their tools without credentials (${pct(answered, seen)}), ${n(auth)} require authentication and ${n(broken)} did not answer or did not speak MCP. When a server's tool list changes — including a change to descriptions alone — it is recorded here.`,
      `官方 MCP 注册表截至 ${day} 有 ${n(reg.servers)} 条最新版登记，其中 ${n(reg.with_remote)} 条带远程端点。本站每天以只读方式抽查能探测的远程端点（只发 initialize 与 tools/list，从不调用工具）：近 ${v.window_days} 天查过的 ${n(seen)} 个里，${n(answered)} 个不带凭据就列出了工具（${pct(answered, seen)}），${n(auth)} 个需要鉴权，${n(broken)} 个连不上或不按 MCP 协议应答。服务器的工具列表一变（哪怕只改了描述），这里就记一次。`)
    : T('The census has not produced a reading yet.', '普查还没有产出读数。');

  const FAQ = [
    { q: T('What does “answers” mean here?', '这里的「能连上」是什么意思？'),
      a: T('The endpoint completed an MCP initialize handshake and returned a tools/list result without any credentials. It says nothing about whether the tools are useful, fast or safe.', '端点完成了 MCP initialize 握手，并在不带任何凭据的情况下返回了 tools/list 结果。它不说明这些工具好不好用、快不快、安不安全。') },
    { q: T('Why do you store a hash instead of the tool descriptions?', '为什么只存哈希，不存工具描述？'),
      a: T('Tool descriptions are text written for models to read. A poisoned description is exactly how tool-poisoning and “rug pull” attacks work, so republishing them would pass the attack on to every AI system that reads this page. A hash over names, descriptions and input schemas is enough to tell that something changed.', '工具描述是写给模型读的文本，被投毒的描述正是「工具投毒」与「rug pull」攻击的载体；把它们转载出来，等于把攻击转给每一个读这页的 AI 系统。对名称、描述与参数结构算一个哈希，就足以知道「变了没有」。') },
    { q: T('How often is each server re-checked?', '每个服务器多久重查一次？'),
      a: T(`About ${n(summary.eligible_endpoints)} endpoints are probe-able; a run checks at most 1,500 of them and at most 3 per host, never-checked ones first, then the ones that answered last time. At that pace one full pass takes roughly ${Math.max(1, Math.ceil(summary.eligible_endpoints / 1500))} days.`, `能探测的端点约 ${n(summary.eligible_endpoints)} 个；每次最多查 1 500 个、同一主机最多 3 个，先查从没查过的，再查上次能连上的。按这个节奏，完整查一轮大约 ${Math.max(1, Math.ceil(summary.eligible_endpoints / 1500))} 天。`) },
    { q: T('Does “requires authentication” mean the server is broken?', '「需要鉴权」是不是说明服务器坏了？'),
      a: T('No. Many production servers require an API key or OAuth before they list tools; that is a design choice. Those are counted separately and never as failures.', '不是。很多正式服务器要先给 API key 或走 OAuth 才列出工具，这是设计选择。它们单独计数，从不算作失败。') },
    { q: T('How can I use this before connecting a server?', '接入一个服务器之前，怎么用这份数据？'),
      a: T('Look the server up in /mcp-census.json: its last state, tool count and the date its tool list last changed. A change you did not expect is the moment to re-read the tools your client already approved.', '在 /mcp-census.json 里查这个服务器：最近状态、工具数量，以及工具列表最近一次变化的日期。一次你没预期到的变化，就是该回头重读客户端已批准工具的时候。') },
  ];
  const stateRows = [
    ['ok', T('Listed tools without credentials', '不带凭据即列出工具'), v.states.ok],
    ['auth', T('Requires authentication (401/403)', '需要鉴权（401/403）'), v.states.auth],
    ['dead', T('No answer (timeout, DNS, connection)', '无应答（超时、DNS、连接失败）'), v.states.dead],
    ['error', T('Answered, but not a valid MCP handshake / tools list', '有应答，但不是有效的 MCP 握手或工具列表'), v.states.error],
  ];
  const changes = v.changes_30d.slice(0, 50);
  const body = `${railOf()}
<main class="stage aw">
  <nav class="crumb"><a href="${BASE}/">${esc(NAME)}</a><i>/</i><a href="${url('/agents/')}">${T('Agents & MCP', 'Agent 与 MCP')}</a><i>/</i><span>${T('MCP census', 'MCP 普查')}</span></nav>
  <header class="hero"><div class="hero-inner">
    <h1>${esc(h1)}</h1>
    <p class="answer">${esc(answer)}</p>
    <p class="aw-asof">${T(`Data as of ${day} (${summary.env === 'runner' ? 'daily scheduled run' : 'first seed run'}). Read-only; a server that answers is not thereby safe.`, `数据截至 ${day}（${summary.env === 'runner' ? '每日定时运行' : '首次播种运行'}）。只读抽查；能连上不等于安全。`)}</p>
    <dl class="stats" data-census-endpoints="${v.endpoints}">
      <div><dt>${T('Registry entries', '注册表登记')}</dt><dd class="num">${n(reg.servers)}</dd></div>
      <div><dt>${T('With a remote endpoint', '带远程端点')}</dt><dd class="num">${n(reg.with_remote)}</dd></div>
      <div><dt>${T('Probe-able endpoints', '可探测端点')}</dt><dd class="num">${n(v.endpoints)}</dd></div>
      <div><dt>${T(`Checked, last ${v.window_days} days`, `近 ${v.window_days} 天已查`)}</dt><dd class="num">${n(seen)}</dd></div>
      <div><dt>${T('Answered', '能连上')}</dt><dd class="num">${pct(answered, seen)}</dd></div>
      <div><dt>${T('Tool lists changed, 30 days', '近 30 天工具列表变化')}</dt><dd class="num">${n(v.changes_30d.length)}</dd></div>
    </dl>
  </div></header>
  <section id="states">
    <h2 class="group-title">${T('What the endpoints did', '端点的应答情况')}<span>${n(seen)}</span></h2>
    <table class="aw-table"><thead><tr><th>${T('State', '状态')}</th><th>${T('Endpoints', '端点数')}</th><th>${T('Share', '占比')}</th></tr></thead><tbody>
      ${stateRows.map(([k, label, c]) => `<tr data-state="${k}"><td>${esc(label)}</td><td class="num">${n(c)}</td><td class="num">${pct(c, seen)}</td></tr>`).join('')}
    </tbody></table>
    <p class="aw-lede">${T(`Among endpoints that answered, the median server exposes ${v.median_tools ?? '—'} tools.`, `能连上的端点里，工具数量的中位数是 ${v.median_tools ?? '—'} 个。`)}</p>
  </section>
  <section id="changes">
    <h2 class="group-title">${T('Tool lists that changed in the last 30 days', '近 30 天工具列表有变化的服务器')}<span>${n(v.changes_30d.length)}</span></h2>
    <p class="aw-lede">${T('A change is a different hash over tool names, descriptions and input schemas between two answers from the same endpoint. It can be a normal release or a silent edit to what a client already approved; this list does not say which.', '「变化」指同一个端点前后两次应答里，工具名称、描述与参数结构算出的哈希不同。它可能是正常发版，也可能是对客户端已批准内容的静默修改；这份清单不替你判断是哪一种。')}</p>
    ${changes.length ? `<table class="aw-table"><thead><tr><th>${T('Registry name', '注册表登记名')}</th><th>${T('Host', '主机')}</th><th>${T('Changed', '变化日')}</th><th>${T('Tools before → now', '工具数 前 → 后')}</th><th>${T('Changes seen', '累计变化')}</th></tr></thead><tbody>
      ${changes.map((c) => `<tr data-census-change><td><code>${esc(c.name)}</code></td><td>${esc(hostOf(c.url))}</td><td class="num">${esc(c.changed)}</td><td class="num">${c.tools_before ?? '—'} → ${c.tools_now ?? '—'}</td><td class="num">${c.changes_total}</td></tr>`).join('')}
    </tbody></table>` : `<p class="coverage">${T(`None yet. A change needs two answers from the same endpoint on different days; the first re-check wave completes about ${Math.max(1, Math.ceil(summary.eligible_endpoints / 1500))} days after the census started.`, `目前还没有。一次「变化」需要同一端点在不同日期的两次应答；首轮复查大约在普查开始后 ${Math.max(1, Math.ceil(summary.eligible_endpoints / 1500))} 天完成。`)}</p>`}
  </section>
  <section id="growth">
    <h2 class="group-title">${T('New registry entries per month', '注册表每月新增登记')}<span>${n(reg.servers)}</span></h2>
    <table class="aw-table"><thead><tr><th>${T('Month (first published)', '月份（首次发布）')}</th><th>${T('Entries', '条数')}</th></tr></thead><tbody>
      ${months.map(([m, c]) => `<tr><td class="num">${esc(m)}</td><td class="num">${n(c)}</td></tr>`).join('')}
    </tbody></table>
    <p class="aw-lede">${T('Counted from the latest version of each entry; entries that were later deprecated are included.', '按每条登记的最新版本统计，后来被标为 deprecated 的也计入。')}</p>
  </section>
  <section id="hosts">
    <h2 class="group-title">${T('Where the remote endpoints live', '远程端点集中在哪里')}<span>${n(reg.remote_hosts)}</span></h2>
    <p class="aw-lede">${T(`${n(reg.with_remote)} entries with a remote endpoint point at ${n(reg.remote_hosts)} distinct hosts; the three largest hosts account for ${pct(topShare, reg.with_remote)} of those entries.`, `${n(reg.with_remote)} 条带远程端点的登记指向 ${n(reg.remote_hosts)} 个不同主机；最大的三个主机占了其中 ${pct(topShare, reg.with_remote)}。`)}</p>
    <table class="aw-table"><thead><tr><th>${T('Host', '主机')}</th><th>${T('Registry entries', '登记条数')}</th></tr></thead><tbody>
      ${reg.top_hosts.map((h) => `<tr><td>${esc(h.host)}</td><td class="num">${n(h.entries)}</td></tr>`).join('')}
    </tbody></table>
  </section>
  <section id="method">
    <h2 class="group-title">${T('How the census works', '普查怎么做')}</h2>
    <ul class="aw-lede">
      <li>${T('Source: the official MCP registry API, latest version of every entry, pulled on each run.', '来源：官方 MCP 注册表 API，每次运行拉取每条登记的最新版本。')}</li>
      <li>${T('Probed: remote endpoints over streamable HTTP with no URL template and no required header; legacy SSE endpoints and endpoints that need a configured header are counted in the registry figures but not probed.', '探测范围：streamable HTTP 远程端点，且 URL 不含模板、没有必填请求头；旧式 SSE 端点与需要配置请求头的端点计入注册表数字，但不探测。')}</li>
      <li>${T('Sent: initialize, notifications/initialized, tools/list — nothing else. No credentials, no tool calls, 8-second timeouts, at most 3 endpoints per host per run, a user agent that names this site.', '发送的只有：initialize、notifications/initialized、tools/list。不带凭据、不调用工具、8 秒超时、每次运行同一主机最多 3 个端点，User-Agent 写明本站。')}</li>
      <li>${T('Kept: state, tool count, a 16-character hash of the tool list, and dates. Never the descriptions (see the FAQ).', '保存的只有：状态、工具数量、工具列表的 16 位哈希与日期。从不保存描述（原因见下方问答）。')}</li>
      <li>${T('Not claimed: that a server is safe, maintained, popular or fit for any purpose.', '不声称：任何服务器安全、有人维护、受欢迎或适合某种用途。')}</li>
    </ul>
  </section>
  <section id="operators">
    <h2 class="group-title">${T('If you run one of these servers', '如果你运营其中某个服务器')}</h2>
    <p class="aw-lede">${T('Your endpoint is counted from its official registry entry; nothing needs to be submitted. If a reading looks wrong (for example, you block unknown user agents), tell us through the submission form and it will be re-checked.', '你的端点按它在官方注册表里的登记被计入，不需要提交任何东西。如果读数看起来不对（比如你拦截了陌生 User-Agent），通过投稿表单告诉我们，会重新检查。')} <a href="${url('/submit.html')}">${T('Submission form →', '投稿表单 →')}</a></p>
  </section>
  <section class="faq" id="faq"><h2 class="group-title">${T('Questions', '常见问题')}</h2>${FAQ.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>
  <section class="aw-machine" id="machine"><h2 class="group-title">${T('Machine-readable', '机器可读')}</h2><p>${T('Aggregates, the 30-day change list and the run history, CC BY 4.0 — cite with the date:', '汇总数字、近 30 天变化清单与运行历史，CC BY 4.0，引用请带日期：')}</p><pre>${esc(site.base_url)}/mcp-census.json</pre></section>
</main>`;
  const title = T('MCP census — which registry servers actually answer | Baipiaoji', 'MCP 普查：官方注册表里哪些服务器真的能连上 | 白嫖计');
  const dataset = { '@context': 'https://schema.org', '@type': 'Dataset', name: T('MCP census (Baipiaoji)', 'MCP 普查（白嫖计）'), description: answer, url: url(path), dateModified: day, license: 'https://creativecommons.org/licenses/by/4.0/', creator: { '@type': 'Organization', name: NAME, url: site.base_url }, distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${site.base_url}/mcp-census.json` }] };
  write('agents/mcp-census.html', layout({ title, description: answer, path, body, wide: true, schema: [crumbLd([{ name: NAME, url: `${BASE}/` }, { name: T('Agents & MCP', 'Agent 与 MCP'), url: url('/agents/') }, { name: T('MCP census', 'MCP 普查'), url: url(path) }]), dataset, faqLd(FAQ)] }));
  pushPage(url(path), '0.7');
  if (zh) {
    const json = { title: 'Baipiaoji MCP census', about: 'Daily read-only census of remote endpoints in the official MCP registry: initialize + tools/list only, never a tool call; tool descriptions are hashed, never stored.', generated: day, env: summary.env, license: 'CC BY 4.0', page: `${site.base_url}/agents/mcp-census`, registry: reg, eligible_endpoints: summary.eligible_endpoints, eligible_hosts: summary.eligible_hosts, ...v, history: summary.history.slice(-90) };
    write('mcp-census.json', JSON.stringify(json));
  }
  return v;
}
