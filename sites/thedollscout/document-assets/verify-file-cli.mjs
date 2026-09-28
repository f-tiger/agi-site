// Independent TDS file-reference verifier. Node.js 20+, built-ins only, no network.
// Usage: node verify-file-cli.mjs ./your-file 'https://thedollscout.com/verify-file#tds-file-v1=HASH.BYTES'
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
try {
  const [file,reference,...extra]=process.argv.slice(2);
  if (!file || !reference || extra.length || reference.length>512) throw Error('Usage: node verify-file-cli.mjs FILE TDS_REFERENCE_URL');
  let fragment=reference;
  if(!fragment.startsWith('#')) {
    const url=new URL(reference);
    if(url.origin!=='https://thedollscout.com'||!/^\/(?:(de|zh)\/)?verify-file$/.test(url.pathname)||url.username||url.password) throw Error('Invalid reference URL');
    fragment=url.hash;
  }
  const match=/^#tds-file-v1=([a-f0-9]{64})\.(0|[1-9][0-9]{0,7})$/.exec(fragment);
  if(!match||Number(match[2])>20971520)throw Error('Invalid file reference');
  const hash=createHash('sha256');let bytes=0;
  for await (const chunk of createReadStream(file)) {bytes+=chunk.length;if(bytes>20971520)throw Error('File exceeds 20 MiB');hash.update(chunk);}
  const sha256=hash.digest('hex'),same=sha256===match[1]&&bytes===Number(match[2]);
  console.log(JSON.stringify({result:same?'match':'different',sha256,bytes,scope:'File equality only. No identity, delivery, consent or trusted time verified.'},null,2));
  process.exitCode=same?0:1;
} catch(error) {console.error(error.message);process.exitCode=2;}
