CREATE TABLE IF NOT EXISTS events (
 day TEXT NOT NULL,
 site TEXT NOT NULL CHECK(site IN ('rfqdesk','modelmeter','querysprint')),
 event TEXT NOT NULL,
 mode TEXT NOT NULL,
 source TEXT NOT NULL,
 session TEXT NOT NULL,
 PRIMARY KEY(day,site,event,mode,session)
);
CREATE INDEX IF NOT EXISTS events_day_site ON events(day,site);
