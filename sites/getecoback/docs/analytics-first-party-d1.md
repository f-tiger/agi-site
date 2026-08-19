# Eigene Reichweitenmessung: Cloudflare D1 (`ecoback-events`)

Ersetzt die Abhängigkeit von GA4/Supermetrics (Trial 2026-08-02 abgelaufen).
Keine Cookies, keine IP, keine Nutzer-ID — nur Ereignisname, Pfad, Referrer-Host,
Land und Tag. Deshalb ohne Einwilligung zulässig (Art. 6 Abs. 1 lit. f DSGVO),
dokumentiert in `site/datenschutz.html`.

## Aufbau

| Teil | Ort |
|---|---|
| Datenbank | Cloudflare D1 `ecoback-events`, `75e45e05-44b5-4c56-9a3b-dd504b5c53f1` (WEUR) |
| Schreib-Endpunkt | `src/worker.js` → `POST /api/ev` (Whitelist `EV_NAMES`, CORS `*` für Widget-Embeds) |
| Client | `TRACK`-Komponente in `tools/build_structure.py`, spiegelt jedes `gtag('event', …)` |
| Widgets | eigener `widget_view`-Beacon in `site/widgets/*.html` |
| Absicherung | `deploy.yml` prüft bei jedem Deploy, dass `/api/ev` `{"ok":true}` liefert |

Der Beacon sendet `text/plain` — damit ist er CORS-safelisted und löst auch von
fremden Domains (eingebettete Widgets) keinen Preflight aus.

## Abfragen (über den Cloudflare-MCP, `d1_database_query`)

Tagesüberblick:
```sql
SELECT day, name, COUNT(*) AS n FROM ev
GROUP BY day, name ORDER BY day DESC, n DESC LIMIT 60;
```

Trichter der letzten 28 Tage (die Kennzahl für den Tagesloop):
```sql
SELECT name, COUNT(*) AS n FROM ev
WHERE day >= date('now','-28 day') AND page NOT LIKE '/__ci%'
GROUP BY name ORDER BY n DESC;
```

Welche Seiten Affiliate-Klicks erzeugen:
```sql
SELECT page, COUNT(*) AS n FROM ev
WHERE name='affiliate_click' AND day >= date('now','-28 day')
GROUP BY page ORDER BY n DESC LIMIT 20;
```

Experiment 1 (Kanalpräferenz, Amazon vs. Fachhändler):
```sql
SELECT meta, COUNT(*) FROM ev WHERE name='outbound_choice' GROUP BY meta;
```

Experiment 3 (Widget-Verbreitung — fremde Domains, die das Widget einbetten):
```sql
SELECT ref, COUNT(*) AS n FROM ev
WHERE name='widget_view' AND ref NOT IN ('', 'getecoback.com')
GROUP BY ref ORDER BY n DESC;
```

KI-Assistenten als Traffic-Quelle (der Referrer wird als Host gespeichert, also
sichtbar ohne Cookies) — welche Seiten von KI-Antworten aus besucht werden:
```sql
SELECT ref, page, COUNT(*) AS n FROM ev
WHERE name='page_view' AND day >= date('now','-28 day')
  AND (ref LIKE '%chatgpt%' OR ref LIKE '%openai%' OR ref LIKE '%perplexity%'
       OR ref LIKE '%claude%' OR ref LIKE '%copilot%' OR ref LIKE '%gemini%')
GROUP BY ref, page ORDER BY n DESC LIMIT 30;
```
Anteil der KI-Referrer am gesamten Traffic (die eigentliche Kennzahl):
```sql
SELECT CASE WHEN ref LIKE '%chatgpt%' OR ref LIKE '%openai%' OR ref LIKE '%perplexity%'
             OR ref LIKE '%claude%' OR ref LIKE '%copilot%' OR ref LIKE '%gemini%'
            THEN 'ki' WHEN ref='' THEN 'direkt/bot' ELSE 'sonstige' END AS quelle,
       COUNT(*) AS n
FROM ev WHERE name='page_view' AND day >= date('now','-28 day') AND page NOT LIKE '/__ci%'
GROUP BY quelle ORDER BY n DESC;
```
Die von KI am häufigsten angesteuerten Seiten sind die Kandidaten für weitere
GEO-Arbeit (zitierfähige Datenblöcke, Frage-Überschriften) — dort ist belegt,
dass KI-Systeme die Seite bereits als Quelle nutzen.

Experiment 5/6 (B2B-Nachfrage nach Paket):
```sql
SELECT meta, COUNT(*) FROM ev WHERE name='b2b_intent' GROUP BY meta;
```

## Auswertungsregeln

- `page LIKE '/__ci%'` sind Healthchecks aus der CI und zählen nie mit.
- `ref=''` ist Direktzugriff und wird wie bisher als Crawler-Rauschen behandelt;
  Urteile stützen sich auf organische und KI-Referrer.
- Die Zeitreihe beginnt am 2026-08-05. Vergleiche mit früheren GA4-Zahlen sind
  nur grob möglich, weil GA4 sitzungsbasiert und einwilligungsgefiltert war.

## 站内搜索遥测（2026-08-08 起）

事件 `site_search`：`meta.q`=搜索词（≤80 字符）、`meta.hits`=命中数（`-1`=用户点击了某条结果，另带 `meta.pick`）。

**未满足需求队列（每日循环 Step 2 的选题输入）**：
```sql
SELECT json_extract(meta,'$.q') q, COUNT(*) n
FROM ev WHERE name='site_search' AND json_extract(meta,'$.hits')=0
  AND page NOT LIKE '/__ci%' AND day >= date('now','-28 day')
GROUP BY q ORDER BY n DESC;
```
判定纪律不变：hits=0 只是候选，仍要过 KGR/SERP 判定与蚕食检查才允许成页。

**搜索→点击漏斗**（搜索体验是否把人送到了对的页）：
```sql
SELECT json_extract(meta,'$.q') q,
  SUM(CASE WHEN json_extract(meta,'$.hits')>0 THEN 1 ELSE 0 END) searched,
  SUM(CASE WHEN json_extract(meta,'$.hits')=-1 THEN 1 ELSE 0 END) clicked
FROM ev WHERE name='site_search' AND page NOT LIKE '/__ci%'
GROUP BY q ORDER BY searched DESC LIMIT 20;
```

## `ts` — 每行都有秒级时间戳（一直都有，2026-08-13 才被用上）

表结构自建库起就是 `ts TEXT NOT NULL DEFAULT (datetime('now'))`（UTC），但本手册此前只写了按 `day` 聚合的查询，
于是连续两轮把"同一天的两行"当成疑似重复计数来判断，**其实一查 ts 就有答案**。凡是"这是不是重复/这是不是同一个人/
这在部署前还是部署后"的问题，一律先看 ts，别用 day 猜。

**同页多次点击：真实比价还是双重计数？**
```sql
SELECT ts, page, COALESCE(json_extract(meta,'$.source'),'-') src,
       json_extract(meta,'$.link_url') link
FROM ev WHERE name='affiliate_click' AND day >= date('now','-3 day') ORDER BY ts;
```
判读口径：**间隔 <1 秒**＝同一次点击被两条代码路径上报（去重层应当合并，若出现说明有漏网）；
**几秒到几分钟、且商品在变**＝同一位访客在比价，是真实行为，不要"修"掉。

**MCP：自动化探测还是真实采纳？**（`meta.args` 自 2026-08-13 起记录，≤160 字符）
```sql
SELECT ts, json_extract(meta,'$.tool') tool, json_extract(meta,'$.args') args
FROM ev WHERE name='mcp_call' AND day >= date('now','-14 day') ORDER BY ts;
```
判读口径：**每天固定时段、参数一模一样、永远只调同一个工具**＝爬虫/索引器，不算采纳；
**参数各不相同、工具随问题变化**＝真实客户端。只有后者才触发"扩工具集"的预注册规则。

## `md_serve` — Markdown-Auslieferung an KI-Crawler (ab 2026-08-16)

Serverseitig geschrieben (Crawler führen kein JS aus), sobald eine Seite mit
`Accept: text/markdown` abgerufen wird. `meta.ua` enthält die ersten 80 Zeichen
des User-Agents — daran lässt sich ablesen, welcher Anbieter die Markdown-Route
tatsächlich nutzt.

```sql
-- Welche Crawler holen Markdown, und wie oft?
SELECT day, json_extract(meta,'$.ua') AS ua, count(*) AS n
FROM ev WHERE name='md_serve' AND page NOT LIKE '/__ci%'
GROUP BY day, ua ORDER BY day DESC, n DESC LIMIT 40;

-- Welche Seiten werden als Markdown gelesen?
SELECT page, count(*) AS n FROM ev
WHERE name='md_serve' AND day >= date('now','-28 day')
GROUP BY page ORDER BY n DESC LIMIT 20;
```
