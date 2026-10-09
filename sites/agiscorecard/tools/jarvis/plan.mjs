import {calculate,planOf} from '../../jarvis-assets/core.mjs';

// A transparent evidence workflow, not a generated plan. Never inspect private
// memory to choose a public query. Ambiguous arithmetic is left to the user.
export function evidencePlan(input){
 const actions=[],goal=input.goal;
 const conversion=hourConversionOf(goal);
 const explicit=goal.match(/(?:计算|算式|calculate|compute)\s*[:：]?\s*([\d\s.+*/()%\-]{3,120})/i);
 const expression=conversion?conversion.hours+'*60':explicit?.[1]?.trim();
 if(expression&&/[+*/%\-]/.test(expression)){try{calculate(expression);actions.push({tool:'calculate',query:expression});}catch{}}
 if(input.web){
  actions.push({tool:'github_search',query:input.publicQuery});
  actions.push({tool:'hackernews_search',query:input.publicQuery});
 }
 const plan=planOf({approach:input.lang==='zh'?'按固定流程核对站内资料；仅使用已授权的公开关键词检索，并计算可明确解析的算式。':'Check catalog evidence, search only the authorized public keywords, and calculate explicitly supported arithmetic.',actions},input.web);
 if(conversion&&actions.some(a=>a.tool==='calculate'))plan.hourConversion=conversion;
 return plan;
}

// Units and cadence are attached only to a directly parsed conversion span.
export function hourConversionOf(goal){
 if(typeof goal!=='string')return null;
 const matches=[...goal.matchAll(/(?<![A-Za-z0-9_.,/+^\-\u2010-\u2015\u2212])(-?\d{1,5}(?:\.\d{1,3})?)\s*(?:小时|hours?\b)(?:\s+per week)?\s*(?:(?:换算|转换|折合)(?:成|为|到)?|(?:convert(?:ed)?\s*)?(?:in|to))\s*(?:分钟|minutes?\b)/gi)];
 if(matches.length!==1)return null;
 const m=matches[0],before=goal.slice(0,m.index);
 // Reject fragments after spaced fractions, ranges, grouping, or exponents.
 if(/[.,/+^\-\u2010-\u2015\u2212]\s*$|\d\s*[eE][+\-]?\s*$|\d\s+$|\d\s*(?:to|and|至|到|~|～)\s*$/i.test(before))return null;
 return {sourceId:'calc-'+m[1]+'*60',hours:m[1],fromUnit:'hours',toUnit:'minutes',period:/每周\s*$|(?:^|[^A-Za-z-])(?:per week|weekly)\s*$/i.test(before)||/hours?\s+per week/i.test(m[0])?'week':null};
}
