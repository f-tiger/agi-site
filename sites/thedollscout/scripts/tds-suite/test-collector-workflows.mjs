import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKFLOW_TOOLS, runWorkflowTool } from '../../collector-assets/tds-suite/collector-workflows.mjs';
import { WORKFLOW_KERNELS } from '../../collector-assets/tds-suite/workflow-kernels.mjs';
import { WORKFLOW_PROFILES } from '../../collector-assets/tds-suite/workflow-profiles.mjs';
import { matchesInputSchema } from '../../collector-assets/tds-suite/input-schema.mjs';

test('200 workflow examples have valid localized and distinct input contracts and real results',()=>{
  assert.equal(WORKFLOW_TOOLS.length,200);
  assert.equal(Object.keys(WORKFLOW_KERNELS).length,20);
  assert.equal(new Set(WORKFLOW_TOOLS.map(t=>t.name)).size,200);
  assert.equal(new Set(WORKFLOW_TOOLS.map(t=>t.slug)).size,200);
  assert.equal(new Set(WORKFLOW_TOOLS.map(t=>[...t.inputSchema.required].sort().join(' '))).size,200);
  for(const def of WORKFLOW_TOOLS){
    assert.ok(matchesInputSchema(def.example,def.inputSchema),def.name);
    for(const locale of ['en','de','zh']){
      assert.ok(def.title[locale].length>(locale==='zh'?5:15) && def.description[locale].length>(locale==='zh'?15:25),def.name);
      const result=runWorkflowTool(def.name,def.example,locale);
      assert.equal(result.task,def.title[locale],def.name);
      assert.ok(typeof result.method==='string'&&Object.keys(result).length>=3,def.name);
      assert.ok(!JSON.stringify(result).includes('"error"'),def.name);
    }
    assert.throws(()=>runWorkflowTool(def.name,{...def.example,unknown:'marker'}),TypeError,def.name);
    const withoutConstraint={...def.example};
    delete withoutConstraint[def.inputSchema.required.at(-1)];
    assert.throws(()=>runWorkflowTool(def.name,withoutConstraint),TypeError,def.name);
  }
  assert.throws(()=>runWorkflowTool('tds_does_not_exist',{}),RangeError);
});

function firstTool(kind){
  const [slug,,, ,key]=WORKFLOW_PROFILES[kind][0];
  const name='tds_'+slug.replaceAll('-','_');
  return {def:WORKFLOW_TOOLS.find(x=>x.name===name),key};
}
function evaluate(kind,patch={},constraint){
  const {def,key}=firstTool(kind);
  const args={...def.example,...patch};
  if(constraint!==undefined)args[key]=constraint;
  return runWorkflowTool(def.name,args);
}

test('geometry kernels match hand-derived clearances and reject infeasible bounds',()=>{
  assert.equal(evaluate('row').slots,6);
  assert.equal(evaluate('row',{},586).slots,0);
  assert.equal(evaluate('row',{insideWidthMm:192,itemWidthMm:80,itemGapMm:7},25).remainingWidthMm,0);
  assert.equal(evaluate('height').clearanceMarginMm,60);
  assert.equal(evaluate('height',{openingHeightMm:290},30).passesMeasuredHeight,true);
  assert.equal(evaluate('height',{openingHeightMm:289},30).passesMeasuredHeight,false);
  assert.deepEqual(evaluate('entry').orientations.map(x=>[x.rotationDegrees,x.passes]),[[0,true],[90,false]]);
  assert.equal(evaluate('entry',{doorWidthMm:220,allowsTurn:false}).passesAnyOrientation,false);
  assert.equal(evaluate('sightline',{eyeHeightMm:0,frontDistanceMm:100,backDistanceMm:200,frontTopMm:40,rearFeatureMm:50},10).minimumRiserMm,50);
  assert.throws(()=>evaluate('sightline',{frontDistanceMm:300,backDistanceMm:300}),RangeError);
  assert.equal(evaluate('load').totalMassG,2600);
  assert.equal(evaluate('load',{ratingG:2599}).withinStatedMass,false);
  assert.equal(evaluate('cartons').cartonsNeeded,1);
  assert.equal(evaluate('cartons',{packedHeightMm:400}).cartonsNeeded,null);
  assert.throws(()=>evaluate('cartons',{insideLengthMm:100001}),TypeError);
  assert.equal(evaluate('sheets').sheetsNeeded,3);
  assert.equal(evaluate('sheets',{pieceWidthMm:800}).sheetsNeeded,null);
});

test('date, inventory, archive and checklist kernels expose real discrepancies and validate inputs',()=>{
  assert.equal(evaluate('review').reviewDueOn,'2026-01-31');
  assert.equal(evaluate('review',{lastReviewDate:'2024-02-29',asOfDate:'2024-03-01'},1).reviewDue,true);
  assert.throws(()=>evaluate('review',{lastReviewDate:'2026-02-29',asOfDate:'2026-03-01'}),RangeError);
  assert.deepEqual(evaluate('stock').differences,[
    {id:'A011',expected:1,counted:2,delta:1},{id:'A012',expected:1,counted:0,delta:-1},
  ]);
  assert.equal(evaluate('stock',{expectedIds:'',countedIds:''}).exceedsReviewTolerance,false);
  assert.equal(evaluate('stock',{},1).exceedsReviewTolerance,false);
  assert.equal(evaluate('depletion').unitsToReplenish,18);
  assert.equal(evaluate('depletion',{unitsOnHand:0}).tasksCovered,0);
  assert.deepEqual(evaluate('index').missingIds,['A012']);
  assert.deepEqual(evaluate('index',{recordPairs:'R015 | box-a\nR015 | box-b'},'R015').duplicatedIds,['R015']);
  assert.throws(()=>evaluate('index',{recordPairs:'missing folder separator'}),RangeError);
  assert.equal(evaluate('scan',{},'A003').observations.find(x=>x.id==='A002').arrivalShortfall,1);
  assert.equal(evaluate('scan',{plannedIds:'',departureIds:''},'A003').observations[0].unplannedArrival,1);
  assert.equal(evaluate('checklist').requiredItemsCleared,false);
  assert.equal(evaluate('checklist',{statusRows:'A010 | ready\nA011 | ready'}).requiredItemsCleared,true);
  assert.throws(()=>evaluate('checklist',{statusRows:'A010 | ready\nA010 | pending'}),RangeError);
});

test('price, threshold and shipment arithmetic uses explicit whole-unit constraints',()=>{
  assert.equal(evaluate('units').lowerCostOffer,'A');
  assert.equal(evaluate('units',{offerACents:300,offerAQuantity:3,offerBCents:290,offerBQuantity:5},210).lowerCostOffer,'tie');
  assert.throws(()=>evaluate('units',{offerAQuantity:0}),TypeError);
  assert.equal(evaluate('landed').deliveredCents,4830);
  assert.throws(()=>evaluate('landed',{confirmedDiscountCents:9000}),RangeError);
  assert.equal(evaluate('budget').affordableUnits,6);
  assert.equal(evaluate('budget',{budgetCents:100}).overcommittedCents,7200);
  const a=evaluate('breakeven',{originalCostCents:3191,variableFeeBasisPoints:733},385);
  assert.equal(a.netAfterFeesAndExtraCents,3191);
  assert.ok(a.minimumGrossCents-1-Math.ceil((a.minimumGrossCents-1)*733/10000)-35-385<3191);
  assert.throws(()=>evaluate('breakeven',{variableFeeBasisPoints:10000}),TypeError);
  assert.equal(evaluate('threshold').additionalCents,110);
  assert.equal(evaluate('threshold',{cartCents:4350},150).qualifiesWithItem,true);
  assert.equal(evaluate('quotes').lowerCostOffer,'A');
  assert.equal(evaluate('quotes',{},12).lowerCostOffer,'B');
  assert.equal(evaluate('billing').billableMassG,6000);
  assert.equal(evaluate('billing',{outerLengthCm:10,outerWidthCm:10,outerHeightCm:10},1000).billableMassG,3000);
  assert.throws(()=>evaluate('billing',{},0),TypeError);
});
