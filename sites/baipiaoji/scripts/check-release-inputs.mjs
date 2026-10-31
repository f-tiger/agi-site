#!/usr/bin/env node
// BPJ-only release freshness check. The shared guard remains exact for all other
// sites. A newer main can be accepted only when every changed path was audited
// as external content, or is one of the exact non-input release notes below.
// Do not add broad site, '*-assets', root-data, tools or workflow exceptions.
import {spawnSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const SHA=/^[0-9a-f]{40}$/;
const NOTES=new Set([
  'sites/baipiaoji/docs/PRD-listing-pack-2026-10-31.md',
  'sites/baipiaoji/docs/coding-access-relays-2026-10-31.md',
]);
const CONTENT_PREFIXES=[
  'sites/thedollscout/docs/',
  'sites/thedollscout/.agents/',
  'sites/getecoback/site/',
  'sites/getecoback/data/',
  'sites/getecoback/docs/',
  'sites/agiscorecard/docs/',
  'sites/agiscorecard/data/',
  'sites/agiscorecard/assets/',
];

export function allowedReleasePath(path){
  if(typeof path!=='string'||!path||/[\u0000-\u001f\u007f\\]/.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))return false;
  // Shared/release infrastructure is always protected, even under an otherwise
  // allowed prefix. AGI tools import server and client code used by BPJ gates.
  if(path.split('/').some(part=>['tools','functions','.github'].includes(part)))return false;
  if(NOTES.has(path)||path==='sites/thedollscout/CLAUDE.md')return true;
  if(CONTENT_PREFIXES.some(prefix=>path.startsWith(prefix)))return true;
  // Exact static extensions only: jarvis-assets/*.mjs, foresight-assets/*.mjs
  // and site-nav/*.mjs remain protected along with all unknown code/config.
  return path.startsWith('sites/agiscorecard/')&&/\.(?:html|md|txt|xml)$/.test(path);
}

function git(args,{allowFailure=false}={}){
  const result=spawnSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});
  if(result.error||result.signal||(!allowFailure&&result.status!==0)){
    // Git errors can contain remote URLs. Report the operation, never dump the
    // environment, git configuration, credential-bearing URLs or fetch output.
    throw new Error(`Git ${args[0]} failed; refusing release freshness approval.`);
  }
  return result;
}
function commit(ref){const sha=git(['rev-parse','--verify',`${ref}^{commit}`]).stdout.trim();if(!SHA.test(sha))throw new Error(`Invalid commit identity for ${ref}.`);return sha;}

function rejectAliases(sha){
  const entries=git(['ls-tree','-r','-z',sha]).stdout.split('\0').filter(Boolean);
  if(entries.some(entry=>/^(?:120000|160000) /.test(entry)))throw new Error('A symlink or gitlink exists in the source tree; main advancement requires the exact shared guard.');
}

export function parseReleaseDiff(raw){
  const tokens=raw.split('\0');if(tokens.at(-1)==='')tokens.pop();
  if(tokens.length%2!==0)throw new Error('Unrecognized NUL-delimited git diff.');
  const changes=[];
  for(let i=0;i<tokens.length;i+=2){
    const match=/^:(\d{6}) (\d{6}) ([0-9a-f]{40}) ([0-9a-f]{40}) ([AMD])$/.exec(tokens[i]);
    if(!match)throw new Error('Unsupported change type in release diff.');
    const [,before,after,,,status]=match,path=tokens[i+1];
    if(!['000000','100644'].includes(before)||!['000000','100644'].includes(after))throw new Error('Only regular non-executable content files may change during a BPJ build.');
    if((status==='A'&&before!=='000000')||(status==='D'&&after!=='000000')||(status==='M'&&(before!=='100644'||after!=='100644')))throw new Error('Unexpected file modes in release diff.');
    changes.push({path,status});
  }
  return changes;
}

export function checkReleaseInputs(env=process.env){
  if(env.GITHUB_REF!=='refs/heads/main')throw new Error('Production deployment requires refs/heads/main.');
  const built=env.DEPLOY_SHA;
  if(!SHA.test(built||''))throw new Error('Missing or invalid built release SHA.');
  const root=git(['rev-parse','--show-toplevel']).stdout.trim();
  if(realpathSync(root)!==realpathSync(process.cwd()))throw new Error('Run the BPJ release-input guard from the repository root.');
  // A cached origin/main must never substitute for a failed fresh fetch.
  git(['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main']);
  const head=commit('HEAD'),tip=commit('refs/remotes/origin/main');
  if(head!==built)throw new Error(`Checkout changed during build (built=${built} head=${head} checked_main=${tip}).`);
  const ancestry=git(['merge-base','--is-ancestor',built,tip],{allowFailure:true});
  if(ancestry.status!==0)throw new Error(`Fetched main is not a descendant of the built source (built=${built} checked_main=${tip}).`);
  let accepted=[];
  if(tip!==built){
    // A protected dependency could otherwise be a symlink to allowed content.
    // The current repo has none; fail closed if that assumption ever changes.
    rejectAliases(built);rejectAliases(tip);
    const raw=git(['diff','--raw','--full-index','--no-abbrev','--no-renames','--no-ext-diff','--no-textconv','-z',built,tip,'--']).stdout;
    const changes=parseReleaseDiff(raw),blocked=changes.filter(change=>!allowedReleasePath(change.path));
    if(blocked.length)throw new Error(`Main changed protected or unknown BPJ release inputs: ${JSON.stringify(blocked.map(change=>change.path))} (built=${built} checked_main=${tip}).`);
    accepted=changes.map(change=>change.path);
  }
  // stdout is a receipt, not a mutation of GITHUB_OUTPUT or generated artifacts.
  console.log(`BPJ release input check passed: built=${built} checked_main=${tip}`);
  console.log(`Accepted unrelated content/release-note paths: ${JSON.stringify(accepted)}`);
  return {built,checkedMain:tip,acceptedPaths:accepted};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  try{checkReleaseInputs();}catch(error){console.error(`::error::${error.message}`);process.exitCode=1;}
}
