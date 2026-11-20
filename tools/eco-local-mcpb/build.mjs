import assert from 'node:assert/strict';
import {execFileSync, spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';

const id = 'ecoback-local-tools';
const version = '1.17.1';
const revision = '0604a0dae81b5cea9a27936de7d008d297040ddf';
const sourceRepository = 'f-tiger/getecoback-mcp';
const releaseTag = 'fleet-mcp-registry-2026-10-10';
const name = 'io.github.f-tiger/' + id;
const title = 'EcoBack Local Household Tools';
const description = 'German household tools with offline examples and optional public guide and weather lookup.';
const sourceUrl = 'https://github.com/' + sourceRepository;
const oldNames = [
  'btu_empfehlung', 'fensterabdichtung_laenge', 'heizleistung_watt', 'hitzewelle_vorschau',
  'klimaanlage_stromkosten', 'ratgeber_lesen', 'ratgeber_suche', 'taupunkt_lueften',
];
const featureNames = ['entfeuchter_ablaufcheck', 'btu_empfehlung', 'fensterabdichtung_laenge', 'taupunkt_lueften'];
const entry = 'src/server.mjs';
const legacyHelpers = fileURLToPath(new URL('../mcp-registry/local-packages/', import.meta.url));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
const drainArguments = {drain:'level_or_uphill',model:'meaco-one-20'};

function verifyFinder(extracted, drain) {
  const find = (...args) => spawnSync(process.execPath, [
    '--import',join(legacyHelpers,'deny-network.mjs'),join(extracted,'src/find-tools.mjs'),...args,
  ], {cwd:extracted,encoding:'utf8',timeout:10000});
  const output = (...args) => {
    const child = find(...args);
    assert.equal(child.error,undefined);
    assert.equal(child.status,0,child.stderr);
    return JSON.parse(child.stdout);
  };
  const drainage = 'entfeuchter_ablaufcheck';
  const shower = 'dusche_zeit_bei_wasserbudget';
  const first = output('Kann ich den Abflussschlauch nach oben führen?').tools[0];
  assert.equal(first.name,drainage);
  assert.equal(first.citation_url,drain.structuredContent.citation_url);
  assert.equal(first.guide_url,drain.structuredContent.guide_url);
  assert.deepEqual(first.example_arguments,drainArguments);
  assert.deepEqual(output('--example',drainage),{name:drainage,example_arguments:drainArguments,result:drain});
  const showerResult = output('--example',shower);
  assert.equal(showerResult.name,shower);
  assert.equal(showerResult.result.isError,false);
  assert.equal(showerResult.result.structuredContent.maximale_minuten,8);
  const rejected = find('--example','hitzewelle_vorschau');
  assert.equal(rejected.error,undefined);
  assert.equal(rejected.status,2);
  assert.equal(rejected.stdout,'');
  assert.match(rejected.stderr,/reviewed local example/);
  return {topMatch:first.name,examples:[drainage,shower],liveExampleRejected:true};
}

async function verifyStdio(extracted, manifest) {
  const {TOOLS} = await import(pathToFileURL(join(extracted,'src/tools.mjs')));
  const {expandedDefinitions} = await import(pathToFileURL(join(extracted,'src/eco-suite/src/mcp-expanded.mjs')));
  const expected = JSON.parse(JSON.stringify(TOOLS));
  assert.equal(expected.length,2003);
  assert.deepEqual(manifest.server.mcp_config, {command:'node',args:['${__dirname}/'+entry]});
  const child = spawn(process.execPath, [
    '--import',join(legacyHelpers,'deny-network.mjs'),join(extracted,entry),
  ], {cwd:extracted,stdio:['pipe','pipe','inherit'],timeout:30000});
  const output = createInterface({input:child.stdout});
  const lines = output[Symbol.asyncIterator]();
  let id = 0;
  async function rpc(method, params={}) {
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:++id,method,params})+'\n');
    const {done,value} = await lines.next();
    assert.ok(!done, `Local MCP closed during ${method}`);
    const message = JSON.parse(value);
    assert.equal(message.jsonrpc,'2.0');
    assert.equal(message.id,id);
    assert.equal(message.error,undefined,method);
    return message.result;
  }

  try {
    const init = await rpc('initialize',{
      protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'ecoback-bundle-check',version:'1'},
    });
    assert.deepEqual(init.serverInfo,{name:'getecoback-raumklima',version});
    assert.ok(init.capabilities.tools);
    child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    const listed = [], sizes = [], cursors = new Set();
    let cursor;
    do {
      const page = await rpc('tools/list',cursor ? {cursor} : {});
      listed.push(...page.tools);
      sizes.push(page.tools.length);
      cursor = page.nextCursor;
      if (cursor !== undefined) {
        assert.ok(typeof cursor==='string' && cursor && !cursors.has(cursor) && cursors.size<20);
        cursors.add(cursor);
      }
    } while (cursor !== undefined);
    assert.deepEqual(listed,expected);
    assert.deepEqual(sizes,[...Array(20).fill(100),3]);
    const names = new Set(listed.map(tool=>tool.name));
    assert.equal(names.size,2003);
    assert.ok(oldNames.every(name=>names.has(name)), 'Expected all eight supported legacy tools');
    assert.ok([...names].every(name=>!/balkonspeicher|balkonkraftwerk|solarbank|pv[_-]speicher/i.test(name)));
    assert.ok(manifest.tools.every(tool=>names.has(tool.name)));
    const btu = await rpc('tools/call',{name:'btu_empfehlung',arguments:{qm:20,sonne:'normal'}});
    assert.equal(btu.isError,false);
    assert.match(btu.content[0].text,/7\.000 BTU/);
    const drain = await rpc('tools/call',{
      name:'entfeuchter_ablaufcheck',arguments:drainArguments,
    });
    assert.equal(drain.isError,false);
    assert.equal(drain.structuredContent.outcome,'pump_check');
    const last = expandedDefinitions.at(-1);
    assert.equal(listed.at(-1).name,last.name);
    const result = await rpc('tools/call',{name:last.name,arguments:last.example.args});
    assert.equal(result.isError,false);
    for (const [key,value] of Object.entries(last.example.expect)) {
      assert.deepEqual(result.structuredContent[key],value,`${last.name}.${key}`);
    }
    return {tools:names.size,pages:sizes.length,firstExamples:['btu_empfehlung','entfeuchter_ablaufcheck'],finder:verifyFinder(extracted,drain),
      lastPageExample:last.name,legacyNames:oldNames.length,network:'disabled'};
  } finally {
    output.close();
    child.stdin.end();
    child.kill();
  }
}

const args = process.argv.slice(2);
assert.equal(args.length,2,'Usage: node build.mjs <pinned source checkout> <empty output directory>');
const [source, output] = args.map(value=>resolve(value));
await mkdir(output,{recursive:true});
assert.equal((await readdir(output)).length,0,'The bundle output directory must be empty');
const temp = await mkdtemp(join(tmpdir(),'eco-local-mcpb-'));
try {
  const stage = join(temp,'stage');
  const extracted = join(temp,'extracted');
  const tar = join(temp,'source.tar');
  await mkdir(stage);
  await mkdir(extracted);
  execFileSync('git',['-C',source,'archive','--format=tar','--output='+tar,revision,'LICENSE','README.md','package.json','src']);
  execFileSync('tar',['-xf',tar,'-C',stage]);
  const pkg = JSON.parse(await readFile(join(stage,'package.json'),'utf8'));
  assert.equal(pkg.version,version);
  assert.deepEqual(pkg.bin,{'getecoback-mcp':entry});
  for (const field of ['dependencies','devDependencies','optionalDependencies']) {
    assert.equal(Object.keys(pkg[field]??{}).length,0,`Unexpected ${field}`);
  }
  await writeJson(join(stage,'package-lock.json'),{name:pkg.name,version,lockfileVersion:3,requires:true,
    packages:{'':{name:pkg.name,version,license:pkg.license,engines:pkg.engines,bin:pkg.bin}}});
  const manifest = {
    manifest_version:'0.3',name:id,display_name:title,version,description,
    author:{name:'f-tiger',url:'https://github.com/f-tiger'},
    repository:{type:'git',url:sourceUrl},homepage:sourceUrl,license:pkg.license,
    server:{type:'node',entry_point:entry,mcp_config:{command:'node',args:['${__dirname}/'+entry]}},
    tools:featureNames.map(name=>({name})),tools_generated:true,
    compatibility:{runtimes:{node:'>=22.0.0'}},
    privacy_policies:['https://getecoback.com/datenschutz.html','https://open-meteo.com/en/terms'],
  };
  await writeJson(join(stage,'manifest.json'),manifest);
  await writeJson(join(stage,'SOURCE.json'),{repository:sourceRepository,revision});
  const artifactDir = join(output,'artifacts'), serverDir = join(output,'servers');
  await mkdir(artifactDir);
  await mkdir(serverDir);
  const file = `${id}-${version}.mcpb`, artifact = join(artifactDir,file);
  execFileSync('python3',[join(legacyHelpers,'deterministic-zip.py'),stage,artifact]);
  const digest = sha256(await readFile(artifact));
  execFileSync('python3',['-m','zipfile','-e',artifact,extracted]);
  const actualManifest = JSON.parse(await readFile(join(extracted,'manifest.json'),'utf8'));
  assert.deepEqual(actualManifest,manifest);
  const result = await verifyStdio(extracted,actualManifest);
  const identifier = `https://github.com/f-tiger/agi-site/releases/download/${releaseTag}/${file}`;
  await writeJson(join(serverDir,id+'.json'),{
    $schema:'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
    name,title,description,version,repository:{url:sourceUrl,source:'github'},websiteUrl:sourceUrl,
    packages:[{registryType:'mcpb',identifier,fileSha256:digest,transport:{type:'stdio'}}],
  });
  await writeFile(join(artifactDir,'SHA256SUMS'),`${digest}  ${file}\n`);
  await writeJson(join(output,'smoke-results.json'),{name,version,sourceRevision:revision,...result,fileSha256:digest});
  console.log(JSON.stringify({name,version,...result,fileSha256:digest}));
} finally {
  await rm(temp,{recursive:true,force:true});
}
