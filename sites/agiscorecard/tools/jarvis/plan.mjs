import {calculate,planOf} from '../../jarvis-assets/core.mjs';

// A transparent evidence workflow, not a generated plan. Never inspect private
// memory to choose a public query. Ambiguous arithmetic is left to the user.
export function evidencePlan(input){
 const actions=[],goal=input.goal;
 const hours=goal.match(/(?:^|[^\d.])(\d{1,5}(?:\.\d{1,3})?)\s*(?:小时|hours?\b)[^。；;\n]{0,35}?(?:分钟|minutes?\b)/i);
 const forward=/(?:换算|转换|折合|多少分钟|convert|in minutes|to minutes)/i.test(goal)&&/(?:分钟|minutes?\b)/i.test(goal);
 const explicit=goal.match(/(?:计算|算式|calculate|compute)\s*[:：]?\s*([\d\s.+*/()%\-]{3,120})/i);
 let expression=hours&&forward?hours[1]+'*60':explicit?.[1]?.trim();
 if(expression&&/[+*/%\-]/.test(expression)){try{calculate(expression);actions.push({tool:'calculate',query:expression});}catch{}}
 if(input.web){
  actions.push({tool:'github_search',query:input.publicQuery});
  actions.push({tool:'hackernews_search',query:input.publicQuery});
 }
 return planOf({approach:input.lang==='zh'?'按固定流程核对站内资料；仅使用已授权的公开关键词检索，并计算可明确解析的算式。':'Check catalog evidence, search only the authorized public keywords, and calculate explicitly supported arithmetic.',actions},input.web);
}
