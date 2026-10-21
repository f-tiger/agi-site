#!/usr/bin/env python3
"""Generate reviewable campaign drafts, never send posts/emails or invent results."""
import argparse, datetime as dt, hashlib, json, pathlib, urllib.parse, urllib.request
from growth_lab import acquisition_decision
ROOT = pathlib.Path(__file__).resolve().parents[2]
ALLOWED = {'baipiaoji.com','agiscorecard.com','www.getecoback.com','getecoback.com','thedollscout.com','localebatch.agiscorecard.com'}
TDS_COLLECTION_PATHS = {'/series/smiski-museum', '/series/sonny-angel-snack-series', '/collection-tracker'}

def collection_links(c, u):
    """Opt-in preparation only. The shared campaign parser is checked in tests."""
    if c.get('link_policy') != 'tds_collection_v1':
        raise ValueError('Unknown campaign link policy')
    if c['site'] != 'tds' or u.netloc != 'thedollscout.com' or u.path not in TDS_COLLECTION_PATHS or u.query or u.fragment:
        raise ValueError('Collection policy requires an approved canonical destination')
    external=[]
    for source,medium in [('pinterest','social'),('reddit','social'),('youtube','organic_video')]:
        query=urllib.parse.urlencode({'utm_source':source,'utm_medium':medium,'utm_campaign':'free-tools'})
        blockers=['specific_publication_authorization_required']
        if source=='pinterest': blockers += ['account_and_website_claim_unverified','final_pin_asset_review_required']
        elif source=='reddit': blockers += ['account_and_community_rules_unverified']
        else: blockers += ['clickable_channel_entry_unverified','video_audio_and_platform_review_required']
        external.append({'source':source,'medium':medium,'campaign':'free-tools','url':urllib.parse.urlunsplit(u._replace(query=query)),
                         'state':'prepared_not_authorized','blockers':blockers,'published':False})
    return urllib.parse.urlunsplit(u),external

def compile_plan(catalog, doctor, today):
    rows=[]
    for c in catalog['campaigns']:
        # A reviewed entry must not renew unrelated campaigns in the same catalog.
        reviewed_at=c.get('reviewed_at', catalog['reviewed_at'])
        age = (dt.date.fromisoformat(today)-dt.date.fromisoformat(reviewed_at)).days
        u=urllib.parse.urlsplit(c['url'])
        if u.scheme!='https' or u.hostname not in ALLOWED or u.username or u.password:
            raise ValueError('Unapproved campaign destination')
        reasons=[]
        if age<0 or age>catalog['max_age_days']: reasons.append('review_stale')
        if c['status']!='approved_entry': reasons.append('entry_not_approved')
        if c.get('campaign_tracking_ready') is False or (c.get('site') == 'tds' and c.get('campaign_tracking_ready') is not True):
            reasons.append('tracking_not_registered')
        if c['requires_checkout'] and not (doctor.get('ok') is True and doctor.get('selling') is True and doctor.get('mode')=='live'):
            reasons.append('live_checkout_not_ready')
        external=None
        if 'link_policy' in c:
            link,external=collection_links(c,u)
        else:
            params=dict(urllib.parse.parse_qsl(u.query));params.update(utm_source=c['channel'],utm_medium='owned',utm_campaign=c['id'],utm_content='v1')
            link=urllib.parse.urlunsplit(u._replace(query=urllib.parse.urlencode(params)))
        key_input=c['id']+'|'+c['draft']+'|'+link
        if external is not None:key_input+='|'+json.dumps(external,sort_keys=True)
        key=hashlib.sha256(key_input.encode()).hexdigest()[:16]
        row={'id':c['id'],'site':c['site'],'state':'blocked' if reasons else 'draft_ready','blockers':reasons,'draft':c['draft'],'url':link,'goal':c['goal'],'dedupe_key':key,'published':False}
        if external is not None:
            for variant in external:
                variant['blockers']=reasons+variant['blockers']
            row.update(url_role='internal_canonical',external_drafts=external,distribution_authorized=False)
        rows.append(row)
    return {'as_of':today,'kind':'marketing_preparation_not_distribution','sends':0,'campaigns':rows,'measurement':{'visits':None,'qualified_tasks':None,'paid_buyers':None,'net_revenue':None},'notes':['No social post or email was sent. Unknown metrics remain null, never zero.','One-time sponsored orders are not membership MRR. Draft readiness is not payment acceptance.']}

def main():
    p=argparse.ArgumentParser();p.add_argument('--today',default=dt.datetime.now(dt.timezone.utc).date().isoformat());p.add_argument('--check',action='store_true');p.add_argument('--doctor-file');p.add_argument('--growth-file');a=p.parse_args()
    if a.doctor_file:doctor=json.loads(pathlib.Path(a.doctor_file).read_text())
    else:
        try:
            with urllib.request.urlopen('https://baipiaoji.com/api/ads?doctor=1',timeout=15) as r:doctor=json.load(r)
        except Exception:doctor={'ok':False,'selling':False}
    catalog=json.loads((ROOT/'data/marketing/campaigns.json').read_text());report=compile_plan(catalog,doctor,a.today)
    experiment=json.loads((ROOT/'data/marketing/traffic-experiment.json').read_text())
    if a.growth_file:measurement=json.loads(pathlib.Path(a.growth_file).read_text())
    else:
        try:
            with urllib.request.urlopen('https://baipiaoji.com/api/growth?days=14',timeout=15) as r:measurement=json.load(r)
        except Exception:measurement={'ok':False}
    report['growth_review']=acquisition_decision(experiment,measurement,a.today)
    output=ROOT/'data/autopilot/marketing';
    if not a.check:
        output.mkdir(parents=True,exist_ok=True)
        (output/'queue.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        growth=report['growth_review']
        lines=['# 自动营销准备清单', '',a.today+'；只生成草稿，未外发。','',
               '## 当前唯一获客实验','',growth['id']+' — '+growth['status'],growth['next_action'],
               '流量结论：'+growth['claim'],'', '以下为旧活动目录，不代表新增发布。','']
        for c in report['campaigns']:
            lines += ['## '+c['id'],'',c['state']+' / '+', '.join(c['blockers']),c['draft'],'',c['url'],'']
            for variant in c.get('external_drafts',[]):
                lines += [variant['source']+' — prepared, not authorized: '+', '.join(variant['blockers']),variant['url'],'']
        (output/'queue.md').write_text('\n'.join(lines))
    print(json.dumps({'date':a.today,'drafts':sum(c['state']=='draft_ready' for c in report['campaigns']),'blocked':sum(c['state']=='blocked' for c in report['campaigns']),'sends':0,'growth_review':report['growth_review'],'check_only':a.check}))
if __name__=='__main__':main()
