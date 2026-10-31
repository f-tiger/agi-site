import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {allowedReleasePath} from './check-release-inputs.mjs';

const script=fileURLToPath(new URL('./check-release-inputs.mjs',import.meta.url));
const sharedGuard=fileURLToPath(new URL('../../../.github/scripts/deploy-main-guard.sh',import.meta.url));
function command(cwd,args,{failure=false,env={}}={}){const result=spawnSync(args[0],args.slice(1),{cwd,encoding:'utf8',env:{...process.env,...env}});assert.ifError(result.error);assert.equal(result.signal,null,'Subprocess must finish normally');if(!failure)assert.equal(result.status,0,result.stderr||result.stdout);return result;}
const git=(cwd,...args)=>command(cwd,['git',...args]).stdout.trim();
function write(cwd,path,text='content\n'){mkdirSync(dirname(join(cwd,path)),{recursive:true});writeFileSync(join(cwd,path),text);}
function fixture(t,{alias=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'bpj-release-inputs-')),remote=join(dir,'origin.git'),checkout=join(dir,'checkout'),writer=join(dir,'writer');
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  git(dir,'init','--bare',remote);git(remote,'symbolic-ref','HEAD','refs/heads/main');
  git(dir,'init','--initial-branch=main',checkout);git(checkout,'config','user.name','Release Guard Test');git(checkout,'config','user.email','guard@example.invalid');
  write(checkout,'sites/baipiaoji/source.mjs','export const built = true;\n');
  write(checkout,'sites/baipiaoji/dist/built.txt','initial artifact\n');
  write(checkout,'sites/getecoback/docs/guide.md','original external guide\n');
  write(checkout,'sites/getecoback/data/input.json','{}\n');
  write(checkout,'sites/agiscorecard/tools/jarvis/server.mjs','export const protectedInput = true;\n');
  if(alias){mkdirSync(join(checkout,'tools'),{recursive:true});symlinkSync('../sites/getecoback/data/input.json',join(checkout,'tools/alias.json'));}
  git(checkout,'add','.');git(checkout,'commit','-m','Fixture source');git(checkout,'remote','add','origin',remote);git(checkout,'push','-u','origin','main');
  const built=git(checkout,'rev-parse','HEAD');git(dir,'clone',remote,writer);git(writer,'config','user.name','Release Guard Test');git(writer,'config','user.email','guard@example.invalid');
  // Preserve BOTH a tracked build modification and an untracked generated file.
  write(checkout,'sites/baipiaoji/dist/built.txt','validated generated artifact\n');write(checkout,'sites/baipiaoji/dist/new.txt','new generated artifact\n');
  return {dir,remote,checkout,writer,built};
}
function advance(f,paths){for(const [path,text] of Object.entries(paths))write(f.writer,path,text);git(f.writer,'add','.');git(f.writer,'commit','-m','Advance source');git(f.writer,'push','origin','main');return git(f.writer,'rev-parse','HEAD');}
function run(f,env={},cwd=f.checkout){return command(cwd,[process.execPath,script],{failure:true,env:{GITHUB_REF:'refs/heads/main',DEPLOY_SHA:f.built,...env}});}
function unchanged(f){assert.equal(git(f.checkout,'rev-parse','HEAD'),f.built);assert.equal(readFileSync(join(f.checkout,'sites/baipiaoji/dist/built.txt'),'utf8'),'validated generated artifact\n');assert.equal(readFileSync(join(f.checkout,'sites/baipiaoji/dist/new.txt'),'utf8'),'new generated artifact\n');}

test('same SHA passes without changing validated generated artifacts',t=>{const f=fixture(t),result=run(f);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,new RegExp(`built=${f.built} checked_main=${f.built}`));unchanged(f);});

test('audited unrelated descendant passes using fresh remote main, preserving HEAD/artifact bytes',t=>{
  const f=fixture(t);const tip=advance(f,{
    'sites/thedollscout/docs/release.md':'external note',
    'sites/thedollscout/.agents/product-marketing.md':'external positioning',
    'sites/thedollscout/CLAUDE.md':'external conventions',
    'sites/getecoback/site/new.html':'external page',
    'sites/getecoback/data/new.json':'{}',
    'sites/agiscorecard/docs/release.md':'external note',
    'sites/agiscorecard/data/new.json':'{}',
    'sites/agiscorecard/assets/image.svg':'<svg/>',
    'sites/agiscorecard/public/new.html':'external static page',
    'sites/baipiaoji/docs/PRD-listing-pack-2026-10-31.md':'audited note',
    'sites/baipiaoji/docs/coding-access-relays-2026-10-31.md':'audited note',
  });
  assert.equal(git(f.checkout,'rev-parse','origin/main'),f.built);
  const result=run(f);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,new RegExp(`checked_main=${tip}`));assert.match(result.stdout,/sites\/getecoback\/site\/new.html/);unchanged(f);
});

for(const path of ['sites/baipiaoji/source.mjs','sites/baipiaoji/docs/unknown.md','tools/fleet-account/core.mjs','.github/workflows/deploy-baipiaoji.yml','README.md','data/radar.json','sites/getecoback/functions/api.mjs','sites/getecoback/tools/build.mjs','sites/thedollscout/assets/client.js','sites/agiscorecard/tools/jarvis/server.mjs','sites/agiscorecard/functions/api.mjs','sites/agiscorecard/jarvis-assets/core.mjs','sites/agiscorecard/foresight-assets/catalog.mjs','sites/agiscorecard/foresight-assets/recent.mjs','sites/agiscorecard/site-nav/render.mjs']){
  test(`protected or unknown path rejected: ${path}`,t=>{const f=fixture(t);advance(f,{[path]:'changed\n'});const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/protected or unknown/);unchanged(f);});
}

test('mixed allowed and protected changes fail closed',t=>{const f=fixture(t);advance(f,{'sites/getecoback/docs/guide.md':'allowed','sites/baipiaoji/source.mjs':'protected'});assert.notEqual(run(f).status,0);unchanged(f);});

test('renaming allowed content across a protected boundary is rejected',t=>{
  const f=fixture(t);git(f.writer,'mv','sites/getecoback/docs/guide.md','sites/baipiaoji/guide.md');git(f.writer,'commit','-m','Cross-boundary rename');git(f.writer,'push','origin','main');
  const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/sites\/baipiaoji\/guide.md/);unchanged(f);
});

test('renaming a protected file into allowed content is still rejected',t=>{
  const f=fixture(t);git(f.writer,'mv','sites/baipiaoji/source.mjs','sites/getecoback/docs/source.md');git(f.writer,'commit','-m','Protected deletion rename');git(f.writer,'push','origin','main');
  const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/sites\/baipiaoji\/source.mjs/);unchanged(f);
});

test('fetch failure rejects cached main even when its diff was previously allowed',t=>{
  const f=fixture(t);advance(f,{'sites/getecoback/docs/guide.md':'allowed'});git(f.checkout,'fetch','origin');git(f.checkout,'remote','set-url','origin',join(f.dir,'missing-origin.git'));
  const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/Git fetch failed/);unchanged(f);
});

test('divergent fetched main is rejected even if its only visible path is allowed',t=>{
  const f=fixture(t);git(f.writer,'checkout','--orphan','replacement');git(f.writer,'rm','-rf','.');write(f.writer,'sites/getecoback/docs/new.md','unrelated root');git(f.writer,'add','.');git(f.writer,'commit','-m','Different history');git(f.writer,'push','--force','origin','HEAD:main');
  const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/not a descendant/);unchanged(f);
});

test('a changed checkout HEAD cannot be passed off as the built SHA',t=>{
  const f=fixture(t);write(f.checkout,'local-edit.txt','new local commit');git(f.checkout,'add','local-edit.txt');git(f.checkout,'commit','-m','Changed HEAD');
  const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/Checkout changed/);
  assert.equal(readFileSync(join(f.checkout,'sites/baipiaoji/dist/built.txt'),'utf8'),'validated generated artifact\n');
});

test('non-main, invalid built SHA and non-root invocation are rejected',t=>{
  const f=fixture(t);
  assert.notEqual(run(f,{GITHUB_REF:'refs/heads/topic'}).status,0);
  assert.notEqual(run(f,{DEPLOY_SHA:'main'}).status,0);
  assert.notEqual(run(f,{},join(f.checkout,'sites/baipiaoji')).status,0);
  unchanged(f);
});

test('regular content changed into a symlink rejects the relaxed check',t=>{
  const f=fixture(t);rmSync(join(f.writer,'sites/getecoback/docs/guide.md'));symlinkSync('../../baipiaoji/source.mjs',join(f.writer,'sites/getecoback/docs/guide.md'));git(f.writer,'add','.');git(f.writer,'commit','-m','Symlink type change');git(f.writer,'push','origin','main');
  assert.match(run(f).stderr,/symlink or gitlink/);unchanged(f);
});

test('existing protected symlink into allowed data prevents alias-based approval',t=>{
  const f=fixture(t,{alias:true});advance(f,{'sites/getecoback/data/input.json':'{"changed":true}'});const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/symlink or gitlink/);unchanged(f);
});

test('an allowed file becoming executable is rejected',t=>{
  const f=fixture(t);chmodSync(join(f.writer,'sites/getecoback/docs/guide.md'),0o755);git(f.writer,'add','.');git(f.writer,'commit','-m','Executable content');git(f.writer,'push','origin','main');
  const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/non-executable/);unchanged(f);
});

test('a gitlink under an allowed directory is rejected',t=>{
  const f=fixture(t);git(f.writer,'update-index','--add','--cacheinfo',`160000,${f.built},sites/getecoback/docs/submodule`);git(f.writer,'commit','-m','Gitlink content');git(f.writer,'push','origin','main');
  const result=run(f);assert.notEqual(result.status,0);assert.match(result.stderr,/symlink or gitlink/);unchanged(f);
});

test('the existing shared guard still rejects every main advance',t=>{
  const f=fixture(t);advance(f,{'sites/getecoback/docs/guide.md':'allowed only for BPJ'});
  const result=command(f.checkout,['bash',sharedGuard,'check'],{failure:true,env:{GITHUB_REF:'refs/heads/main',DEPLOY_SHA:f.built}});
  assert.notEqual(result.status,0);assert.match(result.stderr,/Main or checkout changed/);unchanged(f);
});

test('allowlist rejects path ambiguities and code nested under content directories',()=>{
  for(const path of ['sites/getecoback/docs/../source.mjs','sites/getecoback/docs/line\nbreak.md','sites/agiscorecard/docs/tools/input.md','sites/agiscorecard/docs/.github/a.md','sites/agiscorecard/jarvis-assets/core.mjs','sites/agiscorecard/site-nav/render.mjs','sites/getecoback//docs/a.md'])assert.equal(allowedReleasePath(path),false,path);
});
