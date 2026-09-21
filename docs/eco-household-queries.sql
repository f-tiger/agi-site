-- Read-only experiment review. First 28 complete UTC dates after launch.
-- Excludes launch-day QA. Filtered events remain events, not unique people.
WITH cohort AS (
 SELECT page, name, meta FROM ev
 WHERE day >= '2026-09-20' AND day < '2026-10-18'
 AND ua_class = 'human'
 AND page IN ('/wohnkosten-werkstatt.html',
 '/waeschetrockner-oder-luftentfeuchter.html',
 '/strommess-protokoll.html','/geraete-austausch-rechner.html')
)
SELECT page,
 SUM(CASE WHEN name='page_view' THEN 1 ELSE 0 END) AS filtered_views,
 SUM(CASE WHEN name='stromkosten_calc' AND json_extract(meta,'$.source')
   IN ('household-drying','household-measured','household-replacement') THEN 1 ELSE 0 END) AS calculations,
 SUM(CASE WHEN name='affiliate_click' THEN 1 ELSE 0 END) AS affiliate_click_events
FROM cohort GROUP BY page ORDER BY filtered_views DESC;
-- Revenue and ordered items must be checked in PartnerNet separately.
