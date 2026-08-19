#!/usr/bin/env node
// 零依赖 GA4 Data API 客户端：服务账号 JWT → OAuth token → runReport。
// 凭据缺失时返回 null，让调用方降级为站内信号，而不是让整条流水线失败。
import { createSign } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

function credentials() {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const property = process.env.GA4_PROPERTY_ID;
  if (!raw || !property) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa.client_email || !sa.private_key) return null;
    return { sa, property: String(property).replace(/^properties\//, '') };
  } catch {
    console.warn('⚠ GA4_SERVICE_ACCOUNT_JSON 不是合法 JSON，跳过 GA4 取数');
    return null;
  }
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${signer.sign(sa.private_key, 'base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`OAuth 失败 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

async function runReport(token, property, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`runReport 失败 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// 把 GA4 的行列结构压成 [{dim1, dim2, metric1...}] 这种好用的形状
const rows = (r) => (r.rows || []).map((row) => {
  const o = {};
  (r.dimensionHeaders || []).forEach((h, i) => { o[h.name] = row.dimensionValues[i].value; });
  (r.metricHeaders || []).forEach((h, i) => { o[h.name] = Number(row.metricValues[i].value); });
  return o;
});

export async function fetchGa4({ days = 14 } = {}) {
  const cred = credentials();
  if (!cred) return null;
  const { sa, property } = cred;
  const range = [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }];
  const prev = [{ startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` }];

  try {
    const token = await accessToken(sa);
    const q = (body) => runReport(token, property, body).then(rows);

    const [daily, landing, channels, noResult, searches, toolClicks, plans, hustleClicks, editions, outcomes, stuckSteps] = await Promise.all([
      q({ dateRanges: range, dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }] }),
      q({ dateRanges: range, dimensions: [{ name: 'landingPagePlusQueryString' }], metrics: [{ name: 'sessions' }, { name: 'bounceRate' }], limit: 30 }),
      q({ dateRanges: range, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }] }),
      q({
        dateRanges: range,
        dimensions: [{ name: 'customEvent:search_term' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'search_no_result' } } },
        limit: 50,
      }),
      q({
        dateRanges: range,
        dimensions: [{ name: 'customEvent:search_term' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'search' } } },
        limit: 50,
      }),
      q({
        dateRanges: range,
        dimensions: [{ name: 'customEvent:tool_name' }, { name: 'customEvent:tool_category' }, { name: 'customEvent:placement' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'click_tool' } } },
        limit: 300,
      }),
      q({
        dateRanges: range,
        dimensions: [{ name: 'customEvent:plan' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'select_plan' } } },
        limit: 50,
      }),
      // 赚钱作业是四层阶梯的顶层入口，这里看它到底有没有把人往下带
      q({
        dateRanges: range,
        dimensions: [{ name: 'customEvent:hustle' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'select_hustle' } } },
        limit: 50,
      }),
      // 中英文版分别贡献多少流量，决定英文版要不要继续投入
      q({
        dateRanges: range,
        dimensions: [{ name: 'customEvent:site_edition' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        limit: 10,
      }),
      // 方案到底有没有被做成——点击只说明他走了，不说明他成了
      q({
        dateRanges: range,
        dimensions: [{ name: 'eventName' }, { name: 'customEvent:plan' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['plan_done', 'plan_stuck'] } } },
        limit: 100,
      }),
      // 卡在第几步——直接指出该重写哪一段
      q({
        dateRanges: range,
        dimensions: [{ name: 'customEvent:plan' }, { name: 'customEvent:step_no' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'plan_stuck_step' } } },
        limit: 100,
      }),
    ]);

    const prevSessions = await q({ dateRanges: prev, metrics: [{ name: 'sessions' }] });

    return {
      ok: true,
      days,
      daily,
      landing,
      channels,
      noResult,
      searches,
      toolClicks,
      plans,
      hustleClicks,
      editions,
      outcomes,
      stuckSteps,
      sessions: daily.reduce((n, d) => n + d.sessions, 0),
      prevSessions: prevSessions[0]?.sessions || 0,
    };
  } catch (err) {
    console.warn(`⚠ GA4 取数失败，降级为站内信号：${err.message}`);
    return null;
  }
}
