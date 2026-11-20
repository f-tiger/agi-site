import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {buildEvidence} from './build-home-purchase-evidence.mjs';
import {HOME_TOOLS,runHomeTool} from '../../collector-assets/tds-suite/home-purchase.mjs';

const catalogue=JSON.parse(readFileSync(new URL('../../content/amazon-products.json',import.meta.url),'utf8')).products;
const tool=(id)=>HOME_TOOLS.find(t=>t.slug===`purchase-${id}`);
const categoryTool=(category)=>HOME_TOOLS.find(t=>t.category===category);

test('800 distinct tools are derived from the current independent model evidence',()=>{
  assert.equal(buildEvidence({check:true}).count,800);
  assert.equal(HOME_TOOLS.length,800);
  const names=new Set(HOME_TOOLS.map(t=>t.name));
  const slugs=new Set(HOME_TOOLS.map(t=>t.slug));
  assert.equal(names.size,800);
  assert.equal(slugs.size,800);
  assert.equal(new Set(HOME_TOOLS.map(t=>t.category)).size,14);
  for (const definition of HOME_TOOLS) {
    const model=catalogue.find(m=>`purchase-${m.id}`===definition.slug);
    assert.ok(model);
    assert.ok(/^[a-z0-9_]+$/.test(definition.name) && definition.name.length<=64);
    assert.equal(definition.evidence.url,model.sourceUrl);
    assert.equal(definition.evidence.checked,model.checked);
  }
});

test('all model-tool examples execute with explicit per-language checks and official provenance',()=>{
  for (const entry of HOME_TOOLS) {
    for (const locale of ['en','de','zh']) {
      const output=runHomeTool(entry.name,entry.examples[locale],locale);
      assert.equal(output.status,'model_matched',entry.name);
      assert.ok(Object.keys(output.calculation).length>=2);
      assert.ok(Object.values(output.calculation).every(value=>typeof value==='boolean'||Number.isFinite(value)));
      assert.equal(output.model.officialSource,entry.evidenceByLocale[locale].url);
      assert.equal(output.model.sourceChecked,entry.evidenceByLocale[locale].checked);
      assert.equal(output.model.model,entry.examples[locale].offeredModel);
      assert.ok(output.model.productCheck.length>=10);
    }
  }
});

test('two models in the same task cannot clear the same offer model gate',()=>{
  const first=tool('a03');
  const second=tool('a04');
  assert.equal(first.category,second.category);
  assert.equal(runHomeTool(first.name,first.example).status,'model_matched');
  const result=runHomeTool(second.name,first.example);
  assert.equal(result.status,'model_mismatch');
  assert.equal(result.model.model,second.example.offeredModel);
  assert.equal(result.calculation,undefined);
});

test('market-specific exact variants and evidence remain distinct',()=>{
  const hue=tool('b01');
  const result=runHomeTool(hue.name,hue.examples.de,'de');
  assert.equal(result.status,'model_matched');
  assert.match(result.model.model,/7602031P7/);
  assert.match(result.model.officialSource,/\/de-de\//);
  assert.equal(runHomeTool(hue.name,hue.example,'de').status,'model_mismatch');
});

test('category tools preserve units and calculate real decision metrics',()=>{
  const storage=tool('a03');
  assert.deepEqual(runHomeTool(storage.name,storage.example).calculation,
    {fitsMeasuredSpace:true,remainingWidthCm:3,remainingDepthCm:4,remainingHeightCm:3});
  assert.deepEqual(runHomeTool(storage.name,{...storage.example,paddingCm:3}).calculation,
    {fitsMeasuredSpace:false,remainingWidthCm:-1,remainingDepthCm:0,remainingHeightCm:-1});
  const lighting=categoryTool('lighting');
  assert.deepEqual(runHomeTool(lighting.name,{...lighting.example,powerWatts:10,hoursPerDay:4,daysPerYear:365,tariffPerKwh:0.30}).calculation,
    {annualKwh:14.6,estimatedAnnualEnergyCost:4.38});
  const creative=categoryTool('creative');
  assert.deepEqual(runHomeTool(creative.name,{...creative.example,projects:4,amountPerProject:10,unitsPerPack:10,sparePercent:25}).calculation,
    {materialUnitsIncludingAllowance:50,packs:5,materialUnitsRemaining:0});
  const climate=categoryTool('climate');
  assert.deepEqual(runHomeTool(climate.name,{...climate.example,measuredKwh:8,measuredDays:4,projectedDays:30,tariffPerKwh:0.35}).calculation,
    {kwhPerDay:2,projectedKwh:60,projectedEnergyCost:21});
});

test('rejects extra keys, missing fields, malformed input and out-of-range inputs',()=>{
  const lighting=categoryTool('lighting');
  for (const args of [
    {...lighting.example,trackingId:'not a product field'}, {...lighting.example,offeredModel:' '},
    {...lighting.example,hoursPerDay:25}, {...lighting.example,tariffPerKwh:Infinity},
    {...lighting.example,daysPerYear:90.5}, {...lighting.example,powerWatts:'32'}, {},
    'bad', [],
  ]) assert.equal(runHomeTool(lighting.name,args).status,'invalid_input');
  assert.throws(()=>runHomeTool('tds_purchase_not_a_model',{}),RangeError);
});
