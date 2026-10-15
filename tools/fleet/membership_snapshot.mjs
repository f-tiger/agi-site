#!/usr/bin/env node
// Unprivileged consumer. No live site requests, operator secrets or artifact code.
// Only the exact trusted artifact JSON is parsed and the original observation
// timestamp preserved. Missing/stale/untrusted data never overwrites a snapshot.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {consumeEnvelope, MAX_BYTES} from './membership_handoff.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function argument(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
try {
  const input=argument('--input'),selectionFile=argument('--selection');
  if(!input||!selectionFile)throw Error();
  const entries=fs.readdirSync(input,{withFileTypes:true});
  if(entries.length!==1||entries[0].name!=='membership-aggregate.json'||!entries[0].isFile())throw Error();
  const file=path.join(input,'membership-aggregate.json');
  if(!fs.lstatSync(file).isFile()||fs.statSync(file).size>MAX_BYTES||fs.statSync(selectionFile).size>65536)throw Error();
  const value=consumeEnvelope(JSON.parse(fs.readFileSync(file,'utf8')),JSON.parse(fs.readFileSync(selectionFile,'utf8')));
  const output=argument('--out')||path.join(root,'data/fleet-evolution/membership.json');
  if(!process.argv.includes('--check')) {fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(value,null,2)+'\n');}
  console.log(`Accepted aggregate observed at ${value.generated}; counters_complete=${value.counters_complete}`);
}catch {console.error('::error::Membership source missing, stale or untrusted; existing observation left unchanged.');process.exitCode=1;}
