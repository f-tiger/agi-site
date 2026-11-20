import {cases, evaluateCase} from './suite.mjs';

const zh = document.documentElement.lang.startsWith('zh');
const lang = zh ? 'zh' : 'en';
const t = (en, cn) => zh ? cn : en;
const el = id => document.getElementById(id);
const version = el('rc-version');
const task = el('rc-task');
const promptField = el('rc-prompt');
const answer = el('rc-answer');
const score = el('rc-evaluate');
const releaseByUrl = new Map();
const knownUrls = new Set();
let runReport = null;
let advisorySources = [];

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function sourceLink(label, url) {
  const link = node('a', label);
  if (URL.canParse(url)) {
    const target = new URL(url);
    if (target.protocol === 'https:' && !target.username && !target.password) link.href = target.href;
  }
  return link;
}

function stamp(iso) {
  if (!iso) return t('Unknown', '未知');
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? t('Unknown', '未知') :
    date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

async function readFile(name) {
  const response = await fetch(new URL(name, import.meta.url), {credentials: 'omit'});
  if (!response.ok) throw new Error('Report unavailable');
  const data = await response.json();
  const key = {'releases.json':'sources', 'models.json':'models', 'runs.json':'runs', 'advisories.json':'sources'}[name];
  if (data.version !== 1 || !Array.isArray(data[key])) throw new Error('Unsupported report format');
  return data;
}

function renderReleases(data) {
  for (const source of data.sources) {
    const card = document.querySelector('#release-checks [data-repo="' +
      (source.id === 'codex' ? 'codex' : 'claude-code') + '"]');
    const latest = source.releases[0];
    const freshness = card.querySelector('.rc-freshness');
    const checked = stamp(source.checkedAt);
    const status = source.status === 'ok' ? t('Source checked', '已核对来源') :
      source.status === 'partial' ? t('Partial source coverage', '来源覆盖不完整') :
      t('Source unavailable', '来源暂不可读');
    freshness.textContent = status + ' · ' + checked;
    if (source.status !== 'ok' && source.lastSuccessAt) {
      freshness.append(node('br'), t('Last successful read', '上次成功核对') + ' · ' + stamp(source.lastSuccessAt));
    }
    if (!latest) {
      card.querySelector('.rc-latest').textContent = t('Version unknown', '版本未知');
      continue;
    }
    card.querySelector('.rc-latest').append(sourceLink(latest.version, latest.url));
    card.querySelector('.rc-latest').append(node('br'), latest.publishedAt.slice(0, 10) + ' UTC');
    const advice = advisoryStatus(source.id, latest.version);
    card.append(node('p', advice.label));
    const releaseCount = source.releases.length;
    const advisoryCount = advice.source?.advisories.length;
    const counts = t(releaseCount + ' stable releases tracked', '已记录 ' + releaseCount + ' 个稳定版本');
    const suffix = Number.isInteger(advisoryCount) ? t(' · ' + advisoryCount + ' package ' +
      (advisoryCount === 1 ? 'advisory' : 'advisories') + ' in snapshot', ' · 快照含 ' + advisoryCount + ' 条软件包公告') : '';
    card.append(node('p', counts + suffix));
    const group = node('optgroup');
    group.label = source.name;
    const history = node('ul');
    for (const [index, release] of source.releases.entries()) {
      const title = source.name + ' ' + release.version;
      const option = node('option', title + ' · ' + release.publishedAt.slice(0, 10));
      option.value = release.url;
      group.append(option);
      releaseByUrl.set(release.url, {source: source.id, version: release.version, title});
      knownUrls.add(release.url);
      if (index < 4) {
        const row = node('li');
        row.append(sourceLink(title, release.url), ' · ' + stamp(release.publishedAt));
        history.append(row);
      }
    }
    version.append(group);
    const header = node('h3', t('Recent releases', '近期版本') + ' · ' + source.name);
    el('rc-history-list').append(header, history);
  }
  version.disabled = !releaseByUrl.size;
}

function renderModels(data) {
  const list = node('ul');
  const models = [...data.models].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt));
  for (const [index, model] of models.entries()) {
    knownUrls.add(model.url);
    if (index < 8) {
      const entry = node('li');
      entry.append(sourceLink(model.vendor + ' · ' + model.title, model.url), ' · ' + model.publishedAt);
      list.append(entry);
    }
  }
  const destination = el('rc-models');
  if (models.length) destination.replaceChildren(list);
  else destination.replaceChildren(node('p', t('No dated model announcements in the monitored sources.', '监测来源中暂无带日期的模型发布公告。')));
  for (const source of data.sources ?? []) {
    if (!source.ok) destination.append(node('p', source.vendor + ' · ' + t('Source unavailable', '来源暂不可读')));
  }
}

function advisoryStatus(id, releaseVersion) {
  const source = advisorySources.find(item => item.id === id);
  const entry = source?.versions?.[releaseVersion];
  const checkedTime = Date.parse(source?.lastSuccessAt);
  const fresh = Number.isFinite(checkedTime) && Math.abs(Date.now() - checkedTime) <= 48 * 3600 * 1000;
  const status = source?.status === 'ok' && fresh ? entry?.status : 'unknown';
  const labels = {
    affected: t('Affected by a published advisory', '有适用于该版本的公开安全公告'),
    no_match: t('No matching advisory in the checked source', '已核对的公告中未见匹配'),
    unknown: t('Advisory applicability unknown', '公告是否适用尚未确定'),
  };
  return {source, entry, label: labels[status] ?? labels.unknown};
}

function addAdvisories(destination, selection) {
  const {source, entry, label} = advisoryStatus(selection.source, selection.version);
  destination.append(node('h3', t('Package security advisories', '软件包安全公告')));
  destination.append(node('p', label));
  if (!source) return;
  const provenance = node('p');
  provenance.append(sourceLink(source.package, source.sourceUrl), ' · ',
    t('Last complete source check', '上次完整核对') + ' · ' + stamp(source.lastSuccessAt));
  destination.append(provenance);
  const ids = new Set([...(entry?.matches ?? []), ...(entry?.unparsed ?? [])]);
  const linked = source.advisories.filter(item => ids.has(item.id));
  for (const advisory of linked) {
    const line = node('p');
    line.append(sourceLink(advisory.id, advisory.url));
    if (advisory.severity) line.append(' · ' + advisory.severity);
    if (entry?.unparsed?.includes(advisory.id)) {
      line.append(' · ' + t('Publisher range requires manual review', '发布者的版本范围需人工核对'));
    }
    destination.append(line);
    const ranges = node('ul');
    for (const range of advisory.ranges) {
      const affected = range.affected || t('Affected range unspecified', '未注明影响范围');
      const fixed = range.fixed ? t('Fixed in ', '修复版本 ') + range.fixed : t('Fix version unspecified', '未注明修复版本');
      ranges.append(node('li', affected + ' · ' + fixed));
    }
    destination.append(ranges);
  }
}

function renderRun(run) {
  const summary = node('div');
  const matching = cases.filter(test => run.cases.some(item => item.id === test.id));
  const list = node('ul');
  const verdict = {
    pass: t('Matched', '符合标准'), fail: t('Did not match', '未达标准'),
    unverified: t('Unverified', '未核验'),
  };
  for (const test of matching) {
    const item = run.cases.find(entry => entry.id === test.id);
    list.append(node('li', test.title[lang] + ' · ' + (verdict[item.status] ?? verdict.unverified)));
  }
  const runStatus = run.status === 'complete' ? t('Complete', '核验完成') : t('Incomplete', '核验不完整');
  const model = run.model || t('Model ID unknown', '模型 ID 未核实');
  summary.append(node('p', [runStatus, run.cliVersion, stamp(run.checkedAt)].filter(Boolean).join(' · ')));
  if (run.requestedModel) summary.append(node('p', t('Requested model', '指定模型') + ' · ' + run.requestedModel));
  summary.append(node('p', t('Client-reported model', '客户端报告的模型') + ' · ' + model), list);
  return summary;
}

function updateSelectedEvidence() {
  const destination = el('rc-selected-evidence');
  destination.replaceChildren();
  if (!version.value) return;
  const runs = (runReport?.runs ?? []).filter(run => run.trigger.url === version.value);
  addAdvisories(destination, releaseByUrl.get(version.value));
  destination.append(node('h3', t('Model check', '模型核验')));
  if (runs.length) {
    destination.append(node('p', t('Recorded checks for this release', '该版本的实测记录')));
    for (const run of runs) destination.append(renderRun(run));
  } else {
    destination.append(node('p', runReport ? t('Untested. The underlying model is unknown for this release.', '此版本暂无公开实测，底层模型未知。') :
      t('Public model results are unavailable.', '公开模型实测记录暂不可读。')));
  }
}

function renderRuns(data) {
  runReport = data;
  const destination = el('rc-runs');
  destination.replaceChildren(node('p', t('Model IDs appear when the client identifies the tested model. Each session can use a different model.', '只有客户端提供可核验信息时才列出实测模型 ID。各次会话可以使用不同模型。')));
  const ordered = data.runs.filter(run => knownUrls.has(run.trigger.url))
    .sort((a,b) => b.checkedAt.localeCompare(a.checkedAt));
  if (!ordered.length) {
    destination.append(node('p', t('No verified model run is recorded for the listed updates.', '所列更新暂无可核验的公开模型实测记录。')));
  }
  for (const run of ordered.slice(0, 8)) {
    const subject = node('h3');
    subject.append(sourceLink(run.trigger.label, run.trigger.url));
    destination.append(subject, renderRun(run));
  }
  updateSelectedEvidence();
}

function resetResult() {
  el('rc-result').textContent = '';
  score.disabled = !version.value || !task.value || !answer.value.trim();
}

function changeTask() {
  const selected = cases.find(test => test.id === task.value);
  promptField.value = selected?.prompt ?? '';
  el('rc-expected').querySelector('span').textContent = selected?.expectedDescription[lang] ?? '';
  el('rc-copy').disabled = !selected;
  el('rc-copy-state').textContent = '';
  answer.value = '';
  resetResult();
}

for (const test of cases) {
  const option = node('option', test.title[lang]);
  option.value = test.id;
  task.append(option);
}
task.disabled = !cases.length;
changeTask();
task.addEventListener('change', changeTask);
version.addEventListener('change', () => {
  answer.value = '';
  updateSelectedEvidence();
  resetResult();
});
answer.addEventListener('input', resetResult);
el('rc-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(promptField.value);
    el('rc-copy-state').textContent = t('Copied.', '已复制。');
  } catch {
    promptField.focus();
    promptField.select();
    el('rc-copy-state').textContent = t('Prompt selected. Use your device’s copy command.', '已选中提示词，请使用设备的复制命令。');
  }
});
score.addEventListener('click', () => {
  if (score.disabled) return;
  const pass = evaluateCase(task.value, answer.value);
  const result = pass ? t('The pasted answer matched this criterion.', '这份回答符合本项标准。') :
    t('The pasted answer did not match this criterion.', '这份回答未达本项标准。');
  el('rc-result').textContent = releaseByUrl.get(version.value).title + ' · ' + result;
  score.disabled = true;
  window.dispatchEvent(new CustomEvent('fleet:business', {detail: {name: 'legacy:verify_run'}}));
});

const [releases, models, runs, advisories] = await Promise.allSettled(
  ['releases.json', 'models.json', 'runs.json', 'advisories.json'].map(readFile)
);
if (advisories.status === 'fulfilled') advisorySources = advisories.value.sources;
if (releases.status === 'fulfilled') renderReleases(releases.value);
else el('rc-feed-status').textContent = t('Release history is unavailable. Official release links are shown above.', '版本记录暂不可读，可打开上方官方发布记录。');
if (models.status === 'fulfilled') renderModels(models.value);
else el('rc-models').replaceChildren(node('p', t('Model announcements are unavailable.', '模型公告暂不可读。')));
if (runs.status === 'fulfilled') renderRuns(runs.value);
else el('rc-runs').replaceChildren(node('p', t('Public model results are unavailable.', '公开模型实测记录暂不可读。')));
