import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';

// Public 1.0.0 files, byte-for-byte equal to release commit db601fe9c7407c976403316fdc48e6bad872a3aa.
// Do not publish private product context, logs, or arbitrary new files.
export const SKILL_FILES = {
  'SKILL.md':'b40b9a5025fb2f6fcd1209edfb30dc1b73ce58c9bd431ed1df9dccd3c06cf099',
  'README.md':'a8aff9956f516b4609bae008b77a3c83f1be9a76cb95f8e633d3d33e1b77dfe2',
  'LICENSE':'8e53062273ebb5d72b7d4421fa64867cf6324b9c252939e13ddc6e4c7cbbb854',
  'references/cli.md':'18ed96731d083572a701f86fd54c73508c3864baab4289d8fba31b5b54747e5f',
  'scripts/cli.mjs':'ee8569f62d97cdd291c697f0233ed2045257bcc981fbadba70c2109ca49c2519',
  'scripts/local.mjs':'8d081e6bbae467450f894f00b176fa5dc7d7af4c97646d64e7cf851eeecbad8d'
};
export function buildSkillDiscovery(root,dist){
  const name='bpj-codex-efficiency',description='Review selected local Codex CLI task counters and retry evidence. Free Lite; no guaranteed savings. BPJ independent product, Node.js 22+.';
  const buffers=Object.entries(SKILL_FILES).map(([file,digest])=>{const data=readFileSync(join(root,'products/codex-efficiency',file));if(createHash('sha256').update(data).digest('hex')!==digest)throw Error('Review and version skill distribution before changing '+file);return[file,data];});
  // Supported directory/files discovery format, not a claimed marketplace registration.
  for(const folder of ['.well-known/agent-skills','.well-known/skills']){
    const base=join(dist,folder);mkdirSync(base,{recursive:true});
    writeFileSync(join(base,'index.json'),JSON.stringify({skills:[{name,description,files:Object.keys(SKILL_FILES)}]},null,2)+'\n');
    for(const[file,data]of buffers){const dest=join(base,name,file);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data);}
    writeFileSync(join(base,name,'SHA256SUMS'),Object.entries(SKILL_FILES).map(([file,hash])=>hash+'  '+file).join('\n')+'\n');
  }
}
