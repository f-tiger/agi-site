const numeric=(value,name,min,max,integer=false)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw new RangeError(`${name} must be ${integer?'a whole number':'a number'} from ${min} to ${max}.`);return value;};
const chance=(p,n)=>n===0||p===0?0:p===1?1:-Math.expm1(n*Math.log1p(-p));
export function compareBlindBoxBudget(a){
 const budget=numeric(a.budget,'budget',0,1000000),boxCost=numeric(a.boxCost,'boxCost',0.01,1000000),fixedCost=numeric(a.fixedCost,'fixedCost',0,1000000),confirmedCost=numeric(a.confirmedCost,'confirmedCost',0,1000000),p=numeric(a.probabilityPercent,'probabilityPercent',0,100)/100;
 // Decimal money is normalized to cents. All amounts use one user-chosen currency.
 const cents=n=>Math.round(n*100),b=cents(budget),c=cents(boxCost),f=cents(fixedCost);
 const boxes=Math.min(100000,Math.max(0,Math.floor((b-f)/c)));
 if(Math.max(0,Math.floor((b-f)/c))>100000)throw new RangeError('Budget permits more than 100000 boxes; reduce the budget or increase the per-box cost.');
 const hit=chance(p,boxes),expectedBoxes=p===0?boxes:hit/p;
 return {boxes,maxSpend:boxes?(boxes*c+f)/100:0,unspentBudget:(b-(boxes?boxes*c+f:0))/100,probabilityAtLeastOne:hit,probabilityNoTarget:1-hit,expectedBoxesIfStoppingAtFirstTarget:expectedBoxes,expectedSpendIfStoppingAtFirstTarget:boxes?(expectedBoxes*c+f)/100:0,confirmedCost:cents(confirmedCost)/100,confirmedWithinBudget:cents(confirmedCost)<=b,method:'Independent fixed-probability draws, hard budget cap, stop at first target or at the cap. Fixed costs occur once only if any box is bought. Amounts rounded to two decimals; one currency.',limitations:['Expected spend is an average, not a guaranteed price for the target. The target may never appear within the cap.','All-in confirmed quote is supplied by the user; no seller, authenticity, stock, resale or purchase recommendation.','No extra per-order postage, changing odds, case allocation, tax calculation or duplicate resale proceeds.']};
}
export function estimateCollectionProgress(a){
 const k=numeric(a.regularStyles,'regularStyles',1,1000,true),owned=numeric(a.ownedStyles,'ownedStyles',0,k,true),n=numeric(a.boxes,'boxes',0,100000,true),s=numeric(a.secretPercent,'secretPercent',0,100)/100;
 const p=(1-s)/k,newStyles=(k-owned)*chance(p,n),regularDraws=n*(1-s);
 return {expectedNewRegularStyles:newStyles,expectedUniqueRegularStyles:owned+newStyles,expectedRepeatedRegularDraws:Math.max(0,regularDraws-newStyles),expectedSecretDraws:n*s,probabilityAtLeastOneNewRegular:chance((k-owned)*p,n),method:'K equally likely regular styles; combined secret probability s replaces regular draws. Each regular has probability (1-s)/K. Expected new styles = (K-owned) × (1-(1-(1-s)/K)^boxes).',limitations:['Independent boxes only; no sealed no-repeat case or remaining-box hints.','Owned means distinct regular styles in this exact series. Secret outcomes are counted separately, not classified as new or repeated.','An expectation is not a whole-number prediction or the probability of completing a set. Unequal regular styles need a different model.']};
}
