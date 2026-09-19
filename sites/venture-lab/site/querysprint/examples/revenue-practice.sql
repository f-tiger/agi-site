-- Fictional educational data. Run in a new SQLite database.
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, country TEXT, status TEXT, revenue REAL, refund REAL);
INSERT INTO orders VALUES (1,'Ada','DE','paid',120,0),(2,'Bo','FR','paid',80,20),(3,'Ada','DE','cancelled',50,0),(4,'Cy','DE','paid',90,90),(5,'Di','FR','paid',200,0),(6,'Bo','FR','paid',40,0);
SELECT id,customer FROM orders WHERE status='paid' ORDER BY id;
-- Expected net_revenue: 420
SELECT SUM(revenue-refund) AS net_revenue FROM orders WHERE status='paid';
-- Expected: FR 300, DE 120
SELECT country,SUM(revenue-refund) AS net_revenue FROM orders WHERE status='paid' GROUP BY country ORDER BY net_revenue DESC,country ASC;
