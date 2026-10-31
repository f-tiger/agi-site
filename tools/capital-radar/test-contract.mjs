import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {validateSnapshot,memberSnapshot} from '../../sites/agiscorecard/tools/capital-radar/server.mjs';

// Synthetic fixtures only, generated in memory. Never write a public dataset.
const code=`import sys,json,datetime as dt
sys.path.insert(0,'tools/capital-radar')
from radar import collect,forecasts
now=dt.datetime.now(dt.timezone.utc)
s,_=collect(None,now,lambda url:b'<rss/>')
print(json.dumps(s))
h=[{'date':(now.date()-dt.timedelta(days=70-i)).isoformat(),'count':2+3*(i%7),'complete':True} for i in range(70)]
s['history']=h;s['forecast'],s['model']=forecasts(h,now.date())
print(json.dumps(s))
`;
const r=spawnSync('python3',['-c',code],{encoding:'utf8'});
assert.equal(r.status,0,r.stderr);
for(const line of r.stdout.trim().split('\n')){
 const state=JSON.parse(line);
 assert.equal(validateSnapshot(state),state);
 const exposed=memberSnapshot(state);
 assert.equal(Object.hasOwn(exposed,'internal'),false);
 assert.equal(exposed.forecast.status,state.forecast.status);
}
console.log('Capital Radar Python/Worker snapshot contract: 2 cases passed');
