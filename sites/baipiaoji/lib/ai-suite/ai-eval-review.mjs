import { define, record, requireValue, string } from './developer-common.mjs';

const evaluationId = (value) => typeof value === 'string' && value.length >= 1 &&
  value.length <= 80 && /^[\p{L}\p{N}][\p{L}\p{N}_.-]{0,79}$/u.test(value);

function readIds(value, minimum, maximum, label) {
  requireValue(Array.isArray(value) && value.length >= minimum && value.length <= maximum &&
    value.every(evaluationId) && new Set(value).size === value.length,
  `Supply ${minimum} to ${maximum} unique ${label} text IDs of up to 80 characters using letters, numbers, dots, underscores or hyphens.`);
  return value;
}

function reviewQueue(sampleInput, reviewerInput, reviews) {
  const samples = readIds(sampleInput, 1, 200, 'sample');
  const reviewers = readIds(reviewerInput, 2, 10, 'reviewer');
  const registeredReviewers = new Set(reviewers);
  const gradesBySample = new Map(samples.map(sample => [sample, new Map()]));
  requireValue(Array.isArray(reviews), 'Supply an array of review records.');
  for (const review of reviews) {
    requireValue(record(review) && Object.keys(review).length === 3 &&
      ['sampleId', 'reviewerId', 'verdict'].every(field => Object.hasOwn(review, field)),
    'Each review must have exactly sampleId, reviewerId, and verdict.');
    const grades = gradesBySample.get(review.sampleId);
    requireValue(grades && registeredReviewers.has(review.reviewerId), 'Unknown sample or reviewer ID.');
    requireValue(typeof review.verdict === 'boolean', 'verdict must be true or false.');
    requireValue(!grades.has(review.reviewerId), 'Duplicate review for the same sample and reviewer.');
    grades.set(review.reviewerId, review.verdict);
  }

  const disagreements = [];
  const incomplete = [];
  const agreements = [];
  for (const [sampleId, grades] of gradesBySample) {
    const passedReviewerIds = [];
    const failedReviewerIds = [];
    const missingReviewerIds = [];
    for (const reviewerId of reviewers) {
      if (!grades.has(reviewerId)) missingReviewerIds.push(reviewerId);
      else if (grades.get(reviewerId)) passedReviewerIds.push(reviewerId);
      else failedReviewerIds.push(reviewerId);
    }
    const row = { sampleId, passedReviewerIds, failedReviewerIds, missingReviewerIds };
    if (passedReviewerIds.length && failedReviewerIds.length) {
      disagreements.push({ ...row, reason: 'opposing_verdicts' });
    } else if (missingReviewerIds.length) {
      incomplete.push({ ...row, reason: 'reviews_missing' });
    } else {
      agreements.push({ ...row, reason: 'all_reviewers_agree', unanimousVerdict: passedReviewerIds.length > 0 });
    }
  }
  return { sampleCount: samples.length, reviewerCount: reviewers.length, disagreements, incomplete, agreements };
}

const field = (key, zh, en, sample, limit) => string(key, zh, en, JSON.stringify(sample, null, 2), limit, JSON.parse);

const reviewTool = define('ai-human-review-queue', 'AI 评测人审队列', 'Human review queue for AI evaluation',
    '按固定样本和评审名单整理布尔判定。有分歧的样本保留缺席评审，尚未评齐的样本单列。仅在所有评审都提交相同判定时报告一致意见。',
    'Triage boolean verdicts using declared sample and reviewer IDs. Disagreements retain missing reviewers. Incomplete samples are tracked separately. A unanimous verdict requires a matching submission from every reviewer.',
    [
      field('sampleIdsJson', '待评样本编号（JSON）', 'Expected sample IDs (JSON)',
        ['A01', 'A02', 'A03', 'A04'], 8000),
      field('reviewerIdsJson', '应评人员编号（JSON）', 'Expected reviewer IDs (JSON)',
        ['reviewer-a', 'reviewer-b', 'reviewer-c'], 2000),
      field('reviewsJson', '已提交判断（JSON）', 'Submitted verdicts (JSON)',
        [
          { sampleId: 'A01', reviewerId: 'reviewer-c', verdict: true },
          { sampleId: 'A01', reviewerId: 'reviewer-b', verdict: false },
          { sampleId: 'A02', reviewerId: 'reviewer-b', verdict: true },
          { sampleId: 'A03', reviewerId: 'reviewer-c', verdict: false },
          { sampleId: 'A03', reviewerId: 'reviewer-a', verdict: false },
          { sampleId: 'A03', reviewerId: 'reviewer-b', verdict: false },
        ], 48000),
    ], reviewQueue);

const id = {type:'string',maxLength:80};
const reviewers = {type:'array',maxItems:10,items:id};
function reviewRows(reason, withVerdict = false) {
  const properties = {
    sampleId:id, passedReviewerIds:reviewers, failedReviewerIds:reviewers,
    missingReviewerIds:reviewers, reason:{const:reason},
    ...(withVerdict ? {unanimousVerdict:{type:'boolean'}} : {}),
  };
  return {type:'array',maxItems:200,items:{
    type:'object',additionalProperties:false,required:Object.keys(properties),properties,
  }};
}

export const tools = [{
  ...reviewTool,
  searchAliases:['review disagreements','评审分歧','漏评检查'],
  outputSchema:{
    type:'object',additionalProperties:false,
    required:['sampleCount','reviewerCount','disagreements','incomplete','agreements'],
    properties:{
      sampleCount:{type:'integer',minimum:1,maximum:200},
      reviewerCount:{type:'integer',minimum:2,maximum:10},
      disagreements:reviewRows('opposing_verdicts'),
      incomplete:reviewRows('reviews_missing'),
      agreements:reviewRows('all_reviewers_agree',true),
    },
  },
}];
