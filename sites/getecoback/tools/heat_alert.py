#!/usr/bin/env python3
"""Heat-wave alert for the Hitze-Radar list.

The list only compounds if something is actually delivered, and delivery needs a
mail provider credential this environment does not have. So the whole pipeline is
built and runs on schedule from day one — it just stays in dry-run until the
secrets exist. That way the pipeline is exercised (and its failures visible)
before it ever sends, and switching it on is one pasted key rather than a project.

Forecast comes from open-meteo, which needs no key. An alert fires when any
watched region is forecast at or above the threshold within the window, and the
state file keeps one heat event from producing a mail every single day.

Usage:
  python3 tools/heat_alert.py            # decide + send if configured, else dry-run
  python3 tools/heat_alert.py --dry-run  # never send, whatever the environment holds
  python3 tools/heat_alert.py --forecast fixture.json   # offline, for tests
"""
import argparse
import datetime
import json
import os
import sys
import urllib.request

# A spread across the German-speaking area rather than one city, so a regional
# heatwave is not missed because Berlin happens to be mild.
REGIONS = [
    ("Berlin", 52.52, 13.41),
    ("Hamburg", 53.55, 9.99),
    ("München", 48.14, 11.58),
    ("Köln", 50.94, 6.96),
    ("Frankfurt", 50.11, 8.68),
    ("Stuttgart", 48.78, 9.18),
    ("Wien", 48.21, 16.37),
]
THRESHOLD_C = 32.0          # a day people actually feel in an unairconditioned flat
WINDOW_DAYS = 3             # far enough ahead to still order something
MIN_DAYS_BETWEEN = 5        # one heat event, one mail
STATE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "docs", "heat-alert-state.json")


def fetch_forecast():
    """Max temperature per region for the next few days, from open-meteo (keyless)."""
    out = {}
    for name, lat, lon in REGIONS:
        url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
               f"&daily=temperature_2m_max&forecast_days={WINDOW_DAYS}&timezone=Europe%2FBerlin")
        with urllib.request.urlopen(url, timeout=20) as r:
            data = json.load(r)
        out[name] = data["daily"]["temperature_2m_max"]
    return out


def hottest(forecast):
    best = ("", -99.0)
    for name, temps in forecast.items():
        for t in temps:
            if t is not None and t > best[1]:
                best = (name, float(t))
    return best


def load_state():
    try:
        with open(STATE_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def too_soon(state, today):
    last = state.get("last_alert")
    if not last:
        return False
    try:
        prev = datetime.date.fromisoformat(last)
    except ValueError:
        return False
    return (today - prev).days < MIN_DAYS_BETWEEN


def fetch_subscribers(supabase_url, service_key):
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/ecoback_subscribers?select=email,locale&consent=eq.true",
        headers={"apikey": service_key, "authorization": f"Bearer {service_key}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def send(resend_key, recipients, subject, html):
    """One request per recipient — the list is small and BCC hides deliverability."""
    sent = 0
    for addr in recipients:
        body = json.dumps({
            "from": "EcoBack Hitze-Radar <radar@getecoback.com>",
            "to": [addr], "subject": subject, "html": html,
        }).encode()
        req = urllib.request.Request(
            "https://api.resend.com/emails", data=body,
            headers={"authorization": f"Bearer {resend_key}",
                     "content-type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30):
                sent += 1
        except Exception as exc:                      # one bad address must not stop the run
            print(f"  send failed for one recipient: {type(exc).__name__}")
    return sent


def build_mail(region, temp, when):
    subject = f"Hitze-Radar: bis {temp:.0f} °C in {region} — jetzt vorbereiten"
    html = f"""<p>Hallo,</p>
<p>für die nächsten Tage sind in <strong>{region}</strong> bis zu <strong>{temp:.0f} °C</strong>
gemeldet ({when}). Erfahrungsgemäß sind mobile Klimageräte dann innerhalb weniger Tage vergriffen.</p>
<p>Was jetzt hilft:</p>
<ul>
<li><a href="https://getecoback.com/guide/btu-rechner.html">Kühlleistung für deinen Raum berechnen</a> — die Zahl, die vor jedem Kauf zählt.</li>
<li><a href="https://getecoback.com/guide/beste-tragbare-klimaanlage-hitzewelle.html">Aktuelle Geräte-Empfehlungen</a> nach Raumgröße.</li>
<li><a href="https://getecoback.com/guide/klimaanlage-kippfenster.html">Fenster richtig abdichten</a> — ohne das bringt das beste Gerät wenig.</li>
</ul>
<p style="color:#5b6b78;font-size:13px;">Du bekommst diese Mail, weil du dich für den kostenlosen
Hitze-Radar eingetragen hast. Abbestellen: antworte einfach mit „Stop".
<a href="https://getecoback.com/datenschutz.html">Datenschutz</a></p>"""
    return subject, html


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--forecast", help="JSON fixture instead of calling open-meteo")
    args = ap.parse_args()

    if args.forecast:
        forecast = json.load(open(args.forecast, encoding="utf-8"))
    else:
        try:
            forecast = fetch_forecast()
        except Exception as exc:
            print(f"forecast unavailable ({type(exc).__name__}) — nothing decided today")
            return 0

    region, temp = hottest(forecast)
    today = datetime.date.today()
    print(f"hottest in the next {WINDOW_DAYS} days: {region} at {temp:.1f} °C "
          f"(threshold {THRESHOLD_C:.0f} °C)")

    if temp < THRESHOLD_C:
        print("below threshold — no alert")
        return 0

    state = load_state()
    if too_soon(state, today):
        print(f"already alerted on {state.get('last_alert')} — holding "
              f"({MIN_DAYS_BETWEEN} day gap)")
        return 0

    subject, html = build_mail(region, temp, f"Stand {today.isoformat()}")
    resend_key = os.environ.get("RESEND_API_KEY", "")
    supabase_url = os.environ.get("SUPABASE_URL", "https://uoijvtfrwlgixuogkyrz.supabase.co")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if args.dry_run or not resend_key or not service_key:
        missing = [n for n, v in (("RESEND_API_KEY", resend_key),
                                  ("SUPABASE_SERVICE_KEY", service_key)) if not v]
        why = "--dry-run" if args.dry_run else f"missing secret(s): {', '.join(missing)}"
        print(f"DRY RUN ({why}) — an alert would go out now")
        print(f"  subject: {subject}")
        print(f"  body: {len(html)} chars, {html.count('<a href')} links")
        print("  no state written, so the real run is not blocked by this rehearsal")
        return 0

    try:
        subs = fetch_subscribers(supabase_url, service_key)
    except Exception as exc:
        print(f"::error::could not read subscribers: {type(exc).__name__}")
        return 1
    recipients = sorted({s["email"] for s in subs if s.get("email")})
    if not recipients:
        print("no confirmed subscribers yet — nothing to send")
        return 0

    sent = send(resend_key, recipients, subject, html)
    print(f"sent {sent}/{len(recipients)} alerts for {region} at {temp:.1f} °C")
    if sent:
        state["last_alert"] = today.isoformat()
        state["last_region"] = region
        state["last_temp_c"] = round(temp, 1)
        state["last_recipients"] = sent
        save_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
