import {readFile,stat} from 'node:fs/promises';
import {run} from './engine.mjs';
import {LIMIT} from './core.mjs';
try{const[id,path]=process.argv.slice(2);if(!id||!path||process.argv.length!==4)throw Error('Usage: node runner.mjs <tool-id> input.json');if((await stat(path)).size>LIMIT)throw Error('Input exceeds 128 KiB.');console.log(JSON.stringify(run(id,await readFile(path,'utf8')),null,2));}catch(e){console.error(e.message);process.exitCode=2;}
