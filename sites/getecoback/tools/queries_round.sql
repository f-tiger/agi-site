-- eco 营收循环 · D1 测量查询电池(canonical,2026-08-29)
-- 库:75e45e05-44b5-4c56-9a3b-dd504b5c53f1 · 表 ev(name/page/ref/meta/country/ua_class/ts/day)
-- 口径约定(全部查询继承):真人 = (ua_class IS NULL OR ua_class='human');剔除 CI = page NOT LIKE '/__ci%'
-- 事件名:page_view(不是 pv!)、affiliate_click、md_serve、mcp_call、heat_now、btu_calc、site_search…
-- meta 是 JSON 文本;affiliate_click 的 source 在 meta 里(sticky/toppick/models/us-market/inline/cta…)

-- ① 钱线总览(28 天,按页):pv、联盟点击、点击率
SELECT page,
  SUM(CASE WHEN name='page_view' THEN 1 ELSE 0 END) pv,
  SUM(CASE WHEN name='affiliate_click' THEN 1 ELSE 0 END) aff
FROM ev WHERE (ua_class IS NULL OR ua_class='human') AND page NOT LIKE '/__ci%'
  AND ts >= datetime('now','-28 days')
GROUP BY page HAVING pv>0 OR aff>0 ORDER BY aff DESC, pv DESC LIMIT 30;

-- ② 新语言面(IT/EN qm)+ coolizi:上线后是否见首个信号
SELECT page, name, country, COUNT(*) c FROM ev
WHERE (ua_class IS NULL OR ua_class='human') AND page NOT LIKE '/__ci%'
  AND (page LIKE '/it/%' OR page LIKE '%-sqm.html' OR page LIKE '%coolizi%')
GROUP BY page, name, country ORDER BY MIN(ts);

-- ③ affiliate_click 按 source 拆分(28 天;US 切换看 meta 里 amazon.com)
-- ⚠️ 读数注意(2026-08-29 首跑实测):约 42/96 行 meta 无 source 键(08-28 归因
-- fallback 修复前的存量事件,占比会随窗口滚动衰减)——别把"无 source"读成新缺陷。
SELECT substr(meta, instr(meta,'"source"'), 30) src_raw,
  SUM(CASE WHEN meta LIKE '%amazon.com%' THEN 1 ELSE 0 END) us_com,
  COUNT(*) c
FROM ev WHERE name='affiliate_click' AND (ua_class IS NULL OR ua_class='human')
  AND page NOT LIKE '/__ci%' AND ts >= datetime('now','-28 days')
GROUP BY src_raw ORDER BY c DESC;

-- ④ 渠道面(28 天,ref 分组;AI 引荐被移动端剥 referrer 而低估,GA4 为准)
SELECT CASE
    WHEN ref LIKE '%bing%' THEN 'bing' WHEN ref LIKE '%google%' THEN 'google'
    WHEN ref LIKE '%duckduckgo%' THEN 'ddg' WHEN ref LIKE '%ecosia%' THEN 'ecosia'
    WHEN ref LIKE '%chatgpt%' OR ref LIKE '%openai%' THEN 'chatgpt'
    WHEN ref LIKE '%perplexity%' THEN 'perplexity'
    WHEN ref='' OR ref IS NULL THEN '(direct/stripped)' ELSE 'other' END ch,
  COUNT(*) pv
FROM ev WHERE name='page_view' AND (ua_class IS NULL OR ua_class='human')
  AND page NOT LIKE '/__ci%' AND ts >= datetime('now','-28 days')
GROUP BY ch ORDER BY pv DESC;

-- ⑤ 国家×语言面矩阵(28 天):IT 试点 / US 切换 的地理验证
SELECT country,
  SUM(CASE WHEN page LIKE '/it/%' THEN 1 ELSE 0 END) it_pv,
  SUM(CASE WHEN page LIKE '/en/%' THEN 1 ELSE 0 END) en_pv,
  SUM(CASE WHEN page LIKE '/guide/%' THEN 1 ELSE 0 END) de_pv
FROM ev WHERE name='page_view' AND (ua_class IS NULL OR ua_class='human')
  AND page NOT LIKE '/__ci%' AND ts >= datetime('now','-28 days')
GROUP BY country HAVING it_pv+en_pv+de_pv > 0 ORDER BY it_pv DESC, en_pv DESC LIMIT 15;

-- ⑥ 订阅信号(radar 名单;subs 表另查:SELECT COUNT(*) FROM subs WHERE status='stored')
SELECT name, COUNT(*) c FROM ev
WHERE name IN ('lead_intent','popup_view','popup_close','video_play','site_search')
  AND (ua_class IS NULL OR ua_class='human') AND page NOT LIKE '/__ci%'
  AND ts >= datetime('now','-28 days') GROUP BY name;
