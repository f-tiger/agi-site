import assert from 'node:assert/strict';
import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {cases} from '../../futures-assets/release-checks/suite.mjs';
import {announcementTarget, gradeExecution, officialRelease, runOnce, stableVersion} from './run-checks.mjs';

const cliOutput = text => [{type:'thread.started'}, {type:'turn.started'},
  {type:'item.completed', item:{type:'agent_message', text}}, {type:'turn.completed'}]
  .map(row => JSON.stringify(row)).join('\n');
const claude = (text, data = {}) => JSON.stringify({type:'result', subtype:'success', is_error:false,
  num_turns:1, result:text, modelUsage:{'claude-example-20261009':{}}, ...data});
const release = {id:1, tag:'rust-v1.2.3', version:'1.2.3',
  url:'https://github.com/openai/codex/releases/tag/rust-v1.2.3',
  checks:{officialSource:true,stableRelease:true,publicationTime:true}};
const snapshot = {sources:[{id:'codex',repo:'openai/codex',releases:[release]}]};

test('requires an observed stable version, publisher, URL and source-check results', () => {
  assert.equal(stableVersion('codex','codex-cli 1.2.3\n'), '1.2.3');
  assert.equal(stableVersion('codex','codex-cli 1.2.3-alpha.1'), null);
  assert.equal(stableVersion('claude-code','2.5.1 (Claude Code)'), '2.5.1');
  assert.equal(stableVersion('claude-code','2.5.1'), null);
  assert.equal(officialRelease(snapshot,'codex','1.2.3'), release);
  assert.equal(officialRelease(snapshot,'codex','1.2.4'), null);
  for (const extra of [{url:'https://example.org'}, {tag:'v1.2.3'}, {checks:{}}]) {
    assert.equal(officialRelease({sources:[{...snapshot.sources[0],releases:[{...release,...extra}]}]},'codex','1.2.3'),null);
  }
});

test('only supported complete, tool-free replies are assessed', () => {
  const text = '["draft_ready"]';
  assert.deepEqual(gradeExecution('codex','approval',cliOutput(text)),{status:'pass',model:null});
  assert.equal(gradeExecution('codex','approval',cliOutput('[]')).status,'fail');
  assert.equal(gradeExecution('codex','approval',cliOutput(text).replace('agent_message','command_execution')).status,'unverified');
  assert.equal(gradeExecution('codex','approval',cliOutput(text).replace('turn.completed','error')).status,'unverified');
  assert.equal(gradeExecution('codex','approval','').status,'unverified');
  assert.deepEqual(gradeExecution('claude-code','approval',claude(text)),{status:'pass',model:'claude-example-20261009'});
  assert.equal(gradeExecution('claude-code','approval',claude(text,{num_turns:2})).status,'unverified');
  assert.equal(gradeExecution('claude-code','approval',claude(text,{is_error:true})).status,'unverified');
  assert.equal(gradeExecution('claude-code','approval',claude(text,{modelUsage:{}})).model,null);
});

test('one private receipt reserves the version across concurrent and repeated invocations', async t => {
  const directory = await mkdtemp(join(tmpdir(),'agi-receipt-test-'));
  t.after(() => rm(directory,{recursive:true,force:true}));
  const prompts = [];
  const args = {client:'codex', release, directory, invoke: async prompt => {
    prompts.push(prompt);
    const answers = ['["draft_ready"]','["R-17","resolved"]','["0007","0021"]'];
    return cliOutput(answers[cases.findIndex(fixture => fixture.prompt === prompt)]);
  }};
  const statuses = await Promise.all([runOnce(args),runOnce(args)]);
  assert.deepEqual(statuses.sort(),['already_recorded','complete']);
  assert.deepEqual(prompts,cases.map(fixture => fixture.prompt));
  assert.equal(prompts.length,3);
  const files = await readdir(directory);
  assert.equal(files.length,1);
  const stored = await readFile(join(directory,files[0]),'utf8');
  assert.ok(!stored.includes('R-17') && !stored.includes('draft_ready'));
  assert.deepEqual(JSON.parse(stored).cases.map(fixture => fixture.status), ['pass','pass','pass']);
  assert.equal(JSON.parse(stored).model,null);
  assert.equal(await runOnce(args),'already_recorded');
});

test('an unavailable run stops early and retains a sanitized incomplete receipt', async t => {
  const directory = await mkdtemp(join(tmpdir(),'agi-receipt-test-'));
  t.after(() => rm(directory,{recursive:true,force:true}));
  let calls = 0;
  const args = {client:'codex',release,directory,invoke:() => {calls++; throw Error('private path or credentials');}};
  assert.equal(await runOnce(args),'incomplete');
  assert.equal(await runOnce(args),'already_recorded');
  assert.equal(calls,1);
  const file = (await readdir(directory))[0];
  const data = await readFile(join(directory,file),'utf8');
  assert.ok(!data.includes('private path'));
  assert.deepEqual(JSON.parse(data).cases.map(f => f.status),['unverified','unverified','unverified']);
});

const modelNotice = {vendor:'Anthropic', url:'https://anthropic.com/claude-fable-and-mythos-5-2',
  title:'Introducing Claude Fable 5.2 and Claude Mythos 5.2'};
const gptNotice = {vendor:'OpenAI', url:'https://openai.com/index/gpt-6-2',
  title:'Introducing GPT-6.2 Astra and Sol'};
const notices = {models:[modelNotice, gptNotice]};

test('a model-only trigger requires exact inventory URL, matching publisher, and full model name', () => {
  const select = (client, url, id) => announcementTarget(notices, client, url, id);
  assert.equal(select('claude-code', modelNotice.url, 'claude-fable-5-2').trigger.url,modelNotice.url);
  assert.equal(select('claude-code', modelNotice.url, 'claude-mythos-5-2').requestedModel,'claude-mythos-5-2');
  assert.equal(select('codex', gptNotice.url, 'gpt-6.2-astra').requestedModel,'gpt-6.2-astra');
  assert.equal(select('codex', gptNotice.url, 'gpt-6.2-sol'),null);
  assert.equal(select('codex', gptNotice.url, 'gpt-6.2'),null);
  assert.equal(select('claude-code', modelNotice.url + '?query', 'claude-fable-5-2'),null);
  assert.equal(select('codex', modelNotice.url, 'claude-fable-5-2'),null);
  assert.equal(select('claude-code', modelNotice.url, 'claude-fable-5-2-latest'),null);
  assert.equal(select('claude-code', 'https://example.test', 'claude-fable-5-2'),null);
});

test('same installed CLI reserves two named models for one launch and suppresses repeats', async t => {
  const directory = await mkdtemp(join(tmpdir(),'agi-model-receipts-'));
  t.after(() => rm(directory,{recursive:true,force:true}));
  let calls = 0;
  const fixed = {client:'claude-code', release:{...release,tag:'v1.2.3'}, directory};
  for (const id of ['claude-fable-5-2','claude-mythos-5-2']) {
    const target = announcementTarget(notices,'claude-code',modelNotice.url,id);
    const args = {...fixed,target,invoke:() => {
      calls++; return claude('[]',{modelUsage:{[id]:{}}});
    }};
    assert.equal(await runOnce(args),'complete');
    assert.equal(await runOnce(args),'already_recorded');
  }
  assert.equal(calls,6);
  const files = await readdir(directory);
  assert.equal(files.length,2);
  for (const file of files) {
    const receipt = JSON.parse(await readFile(join(directory,file),'utf8'));
    assert.equal(receipt.trigger.kind,'model_announcement');
    assert.equal(receipt.requestedModel,receipt.model);
    assert.equal(receipt.cases[0].reportedModel,receipt.model);
  }
});

test('a model-only run with unknown or different reported identity does not grade the requested model', async t => {
  const directory = await mkdtemp(join(tmpdir(),'agi-model-receipts-'));
  t.after(() => rm(directory,{recursive:true,force:true}));
  const target = announcementTarget(notices,'claude-code',modelNotice.url,'claude-fable-5-2');
  for (const [version, usage, expected] of [['1.2.3',{},null],['1.2.4',{'claude-other-5-2':{}},'claude-other-5-2']]) {
    let calls = 0;
    const args = {client:'claude-code',release:{...release,version},directory,target,invoke:() => {
      calls++; return claude('["draft_ready"]',{modelUsage:usage});
    }};
    assert.equal(await runOnce(args),'incomplete');
    assert.equal(calls,1);
    const file = (await readdir(directory)).find(name => name.includes(version));
    const receipt = JSON.parse(await readFile(join(directory,file),'utf8'));
    assert.equal(receipt.requestedModel,'claude-fable-5-2');
    assert.equal(receipt.model,expected);
    assert.equal(receipt.cases[0].cliOutcome,'pass');
    assert.equal(receipt.cases[0].status,'unverified');
  }
});
