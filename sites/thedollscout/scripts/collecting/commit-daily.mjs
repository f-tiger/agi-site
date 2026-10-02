// Persist source data and its generated public pages before deploying this same run.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(fs.readFileSync('collector-assets/manifest.json','utf8'));
const files=['content/series-state.json','collector-assets/series-catalog.json','collector-assets/manifest.json','collector-assets/tool-capabilities.json','llms.txt','llms-full.txt','sitemap.xml','scripts/urls.txt'];
for(const r of manifest.records){const p=new URL(r.url).pathname;files.push(p==='/'?'index.html':p.endsWith('/')?p.slice(1)+'index.html':p.slice(1)+'.html');files.push(new URL(r.textUrl).pathname.slice(1));}
const before=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync('bash',['scripts/commit-generated.sh','tds-series-bot','chore(tds): daily verified series and checklists',...new Set(files)],{stdio:'inherit'});
const after=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
// A rebase may include another contributor's new generator/templates. Stop here
// rather than deploying old generated files; the next scheduled run rebuilds main.
const parents=execFileSync('git',['rev-list','--count',before+'..'+after],{encoding:'utf8'}).trim();
if(Number(parents)>1)throw Error('Main advanced during daily commit; persisted data, refusing stale build. Re-run deploy.');
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`TDS_RELEASE_SHA=${after}\nTDS_DAILY_BEFORE=${before}\nTDS_DAILY_AFTER=${after}\n`);
console.log('Daily source snapshot persisted at '+after);
