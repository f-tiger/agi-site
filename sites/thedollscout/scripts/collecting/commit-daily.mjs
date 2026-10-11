// Persist source data and its generated public pages before deploying this same run.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(fs.readFileSync('collector-assets/manifest.json','utf8'));
const files=['content/series-state.json','collector-assets/series-catalog.json','collector-assets/manifest.json','collector-assets/tool-capabilities.json','llms.txt','llms-full.txt','sitemap.xml','scripts/urls.txt'];
for(const r of manifest.records){const p=new URL(r.url).pathname;files.push(p==='/'?'index.html':p.endsWith('/')?p.slice(1)+'index.html':p.slice(1)+'.html');files.push(new URL(r.textUrl).pathname.slice(1));}
const before=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const prefix=git('rev-parse','--show-prefix');
const allowed=new Set(files.map(file=>prefix+file));
const staged=git('diff','--cached','--name-only','-z').split('\0').filter(Boolean);
if(staged.some(file=>!allowed.has(file)))throw Error('Unrelated staged files; refusing to include them in the daily source commit.');
// Other generators leave tracked build outputs outside this deliberately narrow
// commit list. Preserve those edits while pulling instead of letting them block
// every daily push. Scope the setting to this child process and retain inherited
// Git configuration (including any configured authentication).
const configCount=Number(process.env.GIT_CONFIG_COUNT||0);
if(!Number.isSafeInteger(configCount)||configCount<0)throw Error('Invalid inherited Git configuration count');
const env={...process.env,GIT_CONFIG_COUNT:String(configCount+1),[`GIT_CONFIG_KEY_${configCount}`]:'rebase.autoStash',[`GIT_CONFIG_VALUE_${configCount}`]:'true'};
execFileSync('bash',['scripts/commit-generated.sh','tds-series-bot','chore(tds): daily verified series and checklists',...new Set(files)],{stdio:'inherit',env});
// Git can return success after an autostash restoration conflict. Never stamp
// or release that worktree; leave the conflict available for diagnosis.
if(git('diff','--name-only','--diff-filter=U'))throw Error('Build-output conflict after daily rebase; refusing stale build. Re-run deploy.');
const after=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
// A rebase may include another contributor's new generator/templates. Stop here
// rather than deploying old generated files; the next scheduled run rebuilds main.
const parents=execFileSync('git',['rev-list','--count',before+'..'+after],{encoding:'utf8'}).trim();
if(Number(parents)>1)throw Error('Main advanced during daily commit; persisted data, refusing stale build. Re-run deploy.');
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`TDS_RELEASE_SHA=${after}\nTDS_DAILY_BEFORE=${before}\nTDS_DAILY_AFTER=${after}\n`);
console.log('Daily source snapshot persisted at '+after);
