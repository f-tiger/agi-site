#!/usr/bin/env python3
"""Generate reviewable campaign drafts, never send posts/emails or invent results."""
import argparse, datetime as dt, hashlib, json, pathlib, urllib.parse, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[2]
ALLOWED = {'baipiaoji.com','agiscorecard.com','www.getecoback.com','getecoback.com','thedollscout.com','localebatch.agiscorecard.com'}

def compile_plan(catalog, doctor, today):
    age = (dt.date.fromisoformat(today)-dt.date.fromisoformat(catalog['reviewed_at'])).days
    rows=[]
    for c in catalog['campaigns']:
        u=urllib.parse.urlsplit(c['url'])
        if u.scheme!='https' or u.hostname not in ALLOWED or u.username or u.password:
            raise ValueError('Unapproved campaign destination')
        reasons=[]
        if age<0 or age>catalog['max_age_days']: reasons.append('review_stale')
        if c['status']!='approved_entry': reasons.append('entry_not_approved')
        if c['requires_checkout'] and not (doctor.get('ok') is True and doctor.get('selling') is True and doctor.get('mode')=='live'):
            reasons.append('live_checkout_not_ready')
        params=dict(urllib.parse.parse_qsl(u.query));params.update(utm_source=c['channel'],utm_medium='owned',utm_campaign=c['id'],utm_content='v1')
        link=urllib.parse.urlunsplit(u._replace(query=urllib.parse.urlencode(params)))
        key=hashlib.sha256((c['id']+'|'+c['draft']+'|'+link).encode()).hexdigest()[:16]
        rows.append({'id':c['id'],'site':c['site'],'state':'blocked' if reasons else 'draft_ready','blockers':reasons,'draft':c['draft'],'url':link,'goal':c['goal'],'dedupe_key':key,'published':False})
    return {'as_of':today,'kind':'marketing_preparation_not_distribution','sends':0,'campaigns':rows,'measurement':{'visits':None,'qualified_tasks':None,'paid_buyers':None,'net_revenue':None},'notes':['No social post or email was sent. Unknown metrics remain null, never zero.','One-time sponsored orders are not membership MRR. Draft readiness is not payment acceptance.']}

def main():
    p=argparse.ArgumentParser();p.add_argument('--today',default=dt.datetime.now(dt.timezone.utc).date().isoformat());p.add_argument('--check',action='store_true');p.add_argument('--doctor-file');a=p.parse_args()
    if a.doctor_file:doctor=json.loads(pathlib.Path(a.doctor_file).read_text())
    else:
        try:
            with urllib.request.urlopen('https://baipiaoji.com/api/ads?doctor=1',timeout=15) as r:doctor=json.load(r)
        except Exception:doctor={'ok':False,'selling':False}
    catalog=json.loads((ROOT/'data/marketing/campaigns.json').read_text());report=compile_plan(catalog,doctor,a.today)
    output=ROOT/'data/autopilot/marketing';
    if not a.check:
        output.mkdir(parents=True,exist_ok=True)
        (output/'queue.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        lines=['# 自动营销准备清单', '',a.today+'；只生成草稿，未外发。','']
        for c in report['campaigns']:
            lines += ['## '+c['id'],'',c['state']+' / '+', '.join(c['blockers']),c['draft'],'',c['url'],'']
        (output/'queue.md').write_text('\n'.join(lines))
    print(json.dumps({'date':a.today,'drafts':sum(c['state']=='draft_ready' for c in report['campaigns']),'blocked':sum(c['state']=='blocked' for c in report['campaigns']),'sends':0,'check_only':a.check}))
if __name__=='__main__':main()

