import {fail, json, label, make, number, parse, readArray} from './tables-core.mjs';

function validId(value, path) {
  if (typeof value !== 'string' || !value.length || value.length > 128 ||
      value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) {
    fail(`${path} must be a nonempty string ID of at most 128 characters, without control characters or surrounding whitespace.`);
  }
  return value;
}

function uniqueIds(values, path, minimum = 0) {
  if (!Array.isArray(values) || values.length < minimum || values.length > 200) {
    fail(`${path} must be an array of ${minimum} to 200 IDs.`);
  }
  const seen = new Set();
  for (const [index, value] of values.entries()) {
    const id = validId(value, `${path}[${index}]`);
    if (seen.has(id)) fail(`${path} has duplicate ID "${id}".`);
    seen.add(id);
  }
  return seen;
}

function records(text, path, keys) {
  const rows = readArray(text, 100);
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    if (row === null || typeof row !== 'object' || Array.isArray(row) ||
        Object.keys(row).length !== keys.length || keys.some(key => !Object.hasOwn(row, key))) {
      fail(`${path}[${index}] must contain exactly these fields: ${keys.join(', ')}.`);
    }
    const id = validId(row.id, `${path}[${index}].id`);
    if (ids.has(id)) fail(`${path} has duplicate record ID "${id}".`);
    ids.add(id);
  }
  return rows;
}

function nonblank(value, path) {
  if (typeof value !== 'string' || !value.trim()) fail(`${path} must be nonblank text.`);
  return value;
}

const retrieval = make('rag-retrieval-scorecard', 'RAG 检索召回与排名评估', 'RAG retrieval scorecard',
  '为每个查询提供相关资料 ID 和按排名排列的检索结果，计算前 K 项召回率、前 K 项与完整排名的平均倒数排名。各查询等权。',
  'Supply relevant IDs and ranked results for each query. Compare macro recall at K, MRR at K and MRR over the full submitted rankings. Each query has equal weight.',
  [
    json('queries', '查询数组（id、relevant、ranked）', 'Query records (id, relevant, ranked)', [
      {id:'q1', relevant:['A','B'], ranked:['X','A','B']},
      {id:'q2', relevant:['C'], ranked:['Y','Z','C']},
    ]),
    number('k', '统计前 K 个结果', 'Top K results', 2, 1, 200, true),
  ], ({queries, k}) => {
    const results = records(queries, 'queries', ['id','relevant','ranked']).map(({id, relevant, ranked}) => {
      const wanted = uniqueIds(relevant, `${id}.relevant`, 1);
      uniqueIds(ranked, `${id}.ranked`);
      const hits = ranked.slice(0, k).filter(doc => wanted.has(doc)).length;
      const first = ranked.findIndex(doc => wanted.has(doc)) + 1;
      return {id, hitsAtK:hits, relevantCount:wanted.size, recallAtK:hits / wanted.size,
        firstRelevantRank:first || null, reciprocalRank:first ? 1 / first : 0,
        reciprocalRankAtK:first && first <= k ? 1 / first : 0};
    });
    const average = field => results.reduce((total, row) => total + row[field], 0) / results.length;
    return {k, queryCount:results.length, macroRecallAtK:average('recallAtK'),
      mrrAtK:average('reciprocalRankAtK'), meanReciprocalRank:average('reciprocalRank'), queries:results};
  });

const citations = make('answer-citation-coverage', '回答逐条引用覆盖检查', 'Answer citation coverage audit',
  '按声明的来源 ID 检查每条陈述的引用，区分漏引和未知来源。覆盖率为至少有一个已知引用的陈述占比，内容是否支持结论仍需阅读原文。',
  'Check each claim against declared source IDs. Coverage is the fraction of claims with at least one known citation. Read the source to assess whether it supports the claim.',
  [
    json('sourceIds', '来源 ID 数组', 'Declared source IDs', ['A','B']),
    json('claims', '陈述数组（id、text、citations）', 'Claim records (id, text, citations)', [
      {id:'c1', text:'The sample had 12 rows.', citations:['A','X']},
      {id:'c2', text:'The limit was 30 rows.', citations:[]},
      {id:'c3', text:'The run took 4 seconds.', citations:['Y']},
    ]),
  ], ({sourceIds, claims}) => {
    const sources = uniqueIds(parse(sourceIds), 'sourceIds');
    const results = records(claims, 'claims', ['id','text','citations']).map(({id, text, citations}) => {
      nonblank(text, `${id}.text`);
      uniqueIds(citations, `${id}.citations`);
      const knownIds = citations.filter(ref => sources.has(ref));
      const unknownIds = citations.filter(ref => !sources.has(ref));
      return {id, knownIds, unknownIds, missingCitation:citations.length === 0};
    });
    const coveredClaims = results.filter(row => row.knownIds.length > 0).length;
    return {claimCount:results.length, coveredClaims, coverage:coveredClaims / results.length,
      uncitedClaims:results.filter(row => row.missingCitation).length,
      claimsWithUnknownIds:results.filter(row => row.unknownIds.length > 0).length, claims:results};
  });

const collapseWhitespace = text => text.trim().replace(/\s+/gu, ' ');

const quotes = make('evidence-quote-verifier', '证据引文逐字核对', 'Evidence quote verifier',
  '将引文与指定来源的已提供文本逐字比对。选择 whitespace 可合并空白，始终区分大小写。输入文件中的网址只作文本处理。',
  'Compare each quote with its supplied source text by ID. Use whitespace mode to collapse spacing. Matching is case-sensitive and URLs are treated as text.',
  [
    json('sources', '来源数组（id、text）', 'Source records (id, text)', [{id:'S1',text:'First line.\nSecond line.'}]),
    json('excerpts', '引文数组（id、sourceId、quote）', 'Excerpt records (id, sourceId, quote)', [
      {id:'e1',sourceId:'S1',quote:'First line.'},
      {id:'e2',sourceId:'S1',quote:'line. Second'},
      {id:'e3',sourceId:'S1',quote:'Third line.'},
      {id:'e4',sourceId:'S2',quote:'First line.'},
    ]),
    label('mode', '匹配方式（exact 或 whitespace）', 'Match mode (exact or whitespace)', 'whitespace'),
  ], ({sources, excerpts, mode}) => {
    if (mode !== 'exact' && mode !== 'whitespace') fail('Choose exact or whitespace.');
    const originals = new Map(records(sources, 'sources', ['id','text']).map(({id, text}) =>
      [id, nonblank(text, `${id}.text`)]));
    const results = records(excerpts, 'excerpts', ['id','sourceId','quote']).map(({id, sourceId, quote}) => {
      validId(sourceId, `${id}.sourceId`);
      nonblank(quote, `${id}.quote`);
      const source = originals.get(sourceId);
      let status = 'unknown-source';
      if (source !== undefined) {
        if (source.includes(quote)) status = 'exact';
        else if (mode === 'whitespace' && collapseWhitespace(source).includes(collapseWhitespace(quote))) status = 'whitespace-match';
        else status = 'not-found';
      }
      return {id, sourceId, status};
    });
    return {mode, excerptCount:results.length, matchedCount:results.filter(row =>
      row.status === 'exact' || row.status === 'whitespace-match').length, excerpts:results};
  });

export const tools = [retrieval, citations, quotes];
