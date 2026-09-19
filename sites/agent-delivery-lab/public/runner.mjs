#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { VERSION, inspectChallenge, checkDelivery, compareChallenges } from './engine.mjs';
try {
  const [mode,a,b,...extra]=process.argv.slice(2);
  if (!['challenge','delivery','compare'].includes(mode)||!a||extra.length||(mode==='challenge'?!!b:!b)) throw Error('Usage: node runner.mjs challenge challenge.json | delivery response.json contract.json | compare before.json after.json');
  const first=await readFile(a,'utf8'), second=b?await readFile(b,'utf8'):'';
  const result=mode==='challenge'?inspectChallenge(first):mode==='delivery'?checkDelivery(first,second):compareChallenges(first,second);
  console.log(JSON.stringify({tool:'Agent Delivery Lab',version:VERSION,createdAt:new Date().toISOString(),...result},null,2));
  process.exitCode=['pass','unchanged'].includes(result.status)?0:1;
}catch(e){console.log(JSON.stringify({status:'input-error',error:e.message},null,2));process.exitCode=2;}
