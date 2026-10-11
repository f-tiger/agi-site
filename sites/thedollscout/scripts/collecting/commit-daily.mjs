// Persist source data and its generated public pages before deploying this same run.
import fs from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
const manifest=JSON.parse(fs.readFileSync('collector-assets/manifest.json','utf8'));
const files=['content/series-state.json','collector-assets/series-catalog.json','collector-assets/manifest.json','collector-assets/tool-capabilities.json','llms.txt','llms-full.txt','sitemap.xml','scripts/urls.txt'];
for(const r of manifest.records){const p=new URL(r.url).pathname;files.push(p==='/'?'index.html':p.endsWith('/')?p.slice(1)+'index.html':p.slice(1)+'.html');files.push(new URL(r.textUrl).pathname.slice(1));}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const before=git('rev-parse','HEAD');
// Build steps intentionally leave other tracked outputs dirty. Never rebase,
// stash or reset this checkout: dist and those outputs have already been tested.
// Only the daily manifest's explicit files may enter this source commit.
const index=spawnSync('git',['diff','--cached','--quiet']);
if(index.status!==0)throw Error('Refusing daily persistence with a nonempty or unreadable index.');
const fetchMain=()=>{git('fetch','--no-tags','origin','refs/heads/main:refs/remotes/origin/main');return git('rev-parse','refs/remotes/origin/main');};
if(fetchMain()!==before)throw Error('Main advanced during daily build; refusing stale build. Re-run deploy.');
git('add','--',...new Set(files));
const staged=spawnSync('git',['diff','--cached','--quiet']);
if(staged.status===1){
 execFileSync('git',['-c','user.name=tds-series-bot','-c','user.email=actions@users.noreply.github.com','commit','-m','chore(tds): daily verified series and checklists'],{stdio:'inherit'});
}else if(staged.status!==0)throw Error('Could not inspect the daily source snapshot.');
const after=git('rev-parse','HEAD');
if(after!==before){
 let published=false;
 for(const delay of [2,4,8,16,0]){
  // Ordinary push rejects a concurrent main update. No force or rebase, even
  // on retry; unrelated generated artifacts remain byte-for-byte untouched.
  const push=spawnSync('git',['push','origin','HEAD:refs/heads/main'],{stdio:'inherit'});
  const remote=fetchMain();
  if(remote===after){published=true;break;}
  if(remote!==before)throw Error('Main advanced during daily push; refusing stale build. Local snapshot retained; re-run deploy.');
  if(push.status===0)throw Error('Pushed daily snapshot could not be verified on main.');
  if(!delay)break;
  execFileSync('sleep',[String(delay)]);
 }
 if(!published)throw Error('Daily source snapshot push failed; local snapshot retained.');
}
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`TDS_RELEASE_SHA=${after}\nTDS_DAILY_BEFORE=${before}\nTDS_DAILY_AFTER=${after}\n`);
console.log('Daily source snapshot persisted at '+after);
