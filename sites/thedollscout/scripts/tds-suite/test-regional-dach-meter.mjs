import test from 'node:test';
import assert from 'node:assert/strict';
import { DACH_METER_TOOL, runDachMeterTool } from '../../collector-assets/tds-suite/regional-dach-meter.mjs';
import { approvedBuyingGuide } from '../../collector-assets/tds-suite/regional-buying-links.mjs';
import { lookupTdsTool, runTdsTool } from '../../collector-assets/tds-suite/index.mjs';

const withInputs = (values, locale = 'de') => runDachMeterTool({ ...DACH_METER_TOOL.example, ...values }, locale);

test('P110 and P110M lead only to their currently sourced model cards', () => {
  const tapo = withInputs({needsMatter:false});
  const matter = withInputs({});
  assert.equal(tapo.model, 'Tapo P110');
  assert.equal(matter.model, 'Tapo P110M');
  assert.ok(tapo.buyerGuide.url.endsWith('#tapo-p110'));
  assert.ok(matter.buyerGuide.url.endsWith('#tapo-p110m'));
  assert.ok(approvedBuyingGuide(DACH_METER_TOOL.name, matter.buyerGuide));
  assert.ok(!approvedBuyingGuide(DACH_METER_TOOL.name, {label:'Unexpected',url:'https://www.amazon.de'}));
  assert.ok(!approvedBuyingGuide(DACH_METER_TOOL.name, {label:'Wrong region',url:'https://thedollscout.com/uk/indoor-laundry#model-1'}));
});

test('country, existing meter, Matter energy and unverified loads prevent a premature purchase handoff', () => {
  const branches = [
    [{market:'CH'},'local_plug_check'],
    [{load:'motor-or-compressor'},'check_device_load'],
    [{load:'unknown'},'check_device_load'],
    [{hasKwhMeter:true,wantsPhoneControl:false,needsMatter:false},'keep_meter'],
    [{wantsPhoneControl:false,needsMatter:false},'manual_meter'],
    [{needsMatterEnergy:true,confirmedMatterEnergy:false},'check_matter_energy'],
  ];
  for (const [values, status] of branches) {
    const result = withInputs(values);
    assert.equal(result.status, status);
    assert.equal(result.buyerGuide, undefined);
  }
  assert.match(withInputs({market:'CH'}).source.url,/^https:\/\/www\.esti\.admin\.ch\//);
  assert.match(withInputs({market:'AT'}).marketCheck,/österreichisches Angebot/);
  assert.equal(withInputs({needsMatterEnergy:true,confirmedMatterEnergy:true}).status,'P110M');
});

test('both native tools preserve structured locale results and exactly scoped guides', () => {
  for (const name of ['tds_dach_meter_fit','tds_uk_laundry_session']) {
    const tool = lookupTdsTool(name);
    for (const lang of ['en','de','zh']) {
      const result = runTdsTool(name,tool.example,lang);
      assert.ok(result.message);
      assert.ok(approvedBuyingGuide(name,result.buyerGuide));
      assert.match(result.buyerGuide.url,/^https:\/\/thedollscout\.com\//);
    }
  }
  const uk = lookupTdsTool('tds_uk_laundry_session');
  const nonComparable = runTdsTool(uk.name,{...uk.example,comparableSessions:false},'en');
  assert.equal(nonComparable.status,'needs_comparable_sessions');
  assert.equal(nonComparable.buyerGuide,undefined);
});
