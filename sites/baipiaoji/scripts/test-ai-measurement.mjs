import assert from 'node:assert/strict';
import {tools} from '../lib/ai-suite/measurement.mjs';

const catalogue = new Map(tools.map(tool => [tool.id, tool]));
assert.equal(tools.length, 180);
assert.equal(catalogue.size, tools.length);
const run = (id, args) => {
  const tool = catalogue.get(id);
  assert.ok(tool, id);
  return tool.run({...tool.example,...args});
};
function near(value, expected, label) {
  assert.ok(Math.abs(value - expected) <= Math.max(1e-10, Math.abs(expected)*1e-9),
    label + ': ' + value + ' != ' + expected);
}

for (const tool of tools) {
  assert.deepEqual(Object.keys(tool.example).sort(),tool.inputs.map(input => input.key).sort(),tool.id);
  assert.ok(!/[\u3400-\u9fff]/u.test(tool.title.en+tool.description.en+JSON.stringify(tool.example)),tool.id);
  assert.ok(Object.keys(run(tool.id,{})).length,tool.id);
  const key=tool.inputs[0].key;
  assert.throws(()=>tool.run({...tool.example,[key]:false}),tool.id);
}
const unitFixtures=[
  ['length',1,'ft','in',12],['area',1,'acre','ft2',43560],['capacity',1,'USgal','USflOz',128],
  ['mass',1,'lb','oz',16],['duration',1,'wk','h',168],['speed',36,'km/h','m/s',10],
  ['acceleration',1,'Gal','m/s2',.01],['temperature',32,'degF','degC',0],
  ['temperature-gap',-18,'deltaF','deltaC',-10],['angle',1,'turn','arcmin',21600],
  ['pressure',1,'atm','Torr',760],['force',1,'kgf','N',9.80665],['torque',1,'lbf.ft','lbf.in',12],
  ['energy',1,'kWh','MJ',3.6],['power',1,'kW','mW',1e6],['frequency',60,'rpm','Hz',1],
  ['density',1,'g/cm3','kg/m3',1000],['volume-flow',60,'L/min','L/s',1],['mass-flow',1,'t/h','kg/h',1000],
  ['dynamic-viscosity',1,'P','cP',100],['kinematic-viscosity',1,'St','cSt',100],
  ['electrical-charge',1,'Ah','C',3600],['magnetic-flux',1,'Wb','Mx',1e8],['flux-density',1,'T','G',10000],
  ['illuminance',1,'fc','lx',10.7639104167],['luminance',1,'stilb','cd/m2',10000],
  ['information',1,'GiB','MiB',1024],['data-rate',8,'Mbit/s','MB/s',1],['typographic-size',1,'pc','pt',12],
  ['paper-grammage',1,'kg/m2','g/m2',1000],
];
for(const [id,value,unit,destination,expected] of unitFixtures){
  near(run('units-'+id,{value,unit}).equivalents[destination],expected,id);
}
const measurements=[
  ['geom-triangle-three-sides',{},'areaM2',6],['geom-chord-radius',{},'radiusM',5],
  ['geom-annulus',{outerRadius:5,innerRadius:4},'areaM2',9*Math.PI],
  ['geom-circular-sector',{radius:2,angle:90},'areaM2',Math.PI],
  ['geom-spherical-cap',{radius:3,cap:6},'volumeM3',36*Math.PI],
  ['geom-horizontal-tank',{radius:1,length:3,fill:1},'filledM3',1.5*Math.PI],
  ['geom-offset-fillet',{radius:3,interior:90},'setbackM',3],
  ['eng-sensible-heat',{},'heatKJ',836],['eng-mix-temperature',{},'mixedC',38],
  ['eng-heat-exchanger-lmtd',{endA:20,endB:20},'lmtdK',20],
  ['eng-pump-shaft-input',{head:1,flow:1,density:1000,efficiency:50},'shaftInputW',19.6133],
  ['eng-reynolds-pipe',{},'reynolds',20000],['eng-lead-screw-travel',{},'travelMm',800],
  ['eng-spring-compression',{},'energyJ',.25],['eng-combined-sound-level',{},'combinedDb',63.0102999566],
  ['design-printable-size',{pixelsWide:300,pixelsHigh:150,ppi:300},'widthMm',25.4],
  ['design-bleed-canvas',{},'canvasWidthMm',216],['design-saddle-folio',{pages:10,sheet:2},'backRight',9],
  ['design-poster-tiles',{},'sheets',10],['design-halftone-levels',{},'idealGrayLevels',257],
  ['design-neutral-density-exposure',{},'filteredSeconds',.64],['design-shutter-angle',{},'reciprocalShutter',48],
  ['design-lens-depth-range',{focus:9999},'nearM',10.406], // bounded below with a separate infinity check
  ['material-crosscut-stock',{},'piecesPerStock',5],['material-paint-cans',{},'cans',1],
  ['material-floor-cartons',{area:.3,waste:0,carton:.1},'cartons',3],
  ['material-baluster-spacing',{},'slats',8],['material-sealant-cartridge',{},'jointMetres',5.4],
  ['material-seed-spacing',{width:.3,length:.3,row:.1,plant:.1},'plants',9],
  ['material-roll-remaining',{outside:100,core:100},'remainingM',0],
  ['bench-loaded-divider',{},'loadedV',1.25],['bench-series-led-drop',{},'resistanceOhms',300],
  ['bench-capacitor-hold-up',{},'holdUpMs',10],['bench-pwm-average',{},'rmsV',2.5],
  ['bench-adc-quantizer',{bits:8,ref:5,input:5},'code',255],['bench-dac-reconstruction',{bits:8,ref:4,code:128},'outputV',2],
  ['bench-fft-bin-grid',{},'bin',21],['bench-sample-alias',{frequency:30000},'aliasHz',18000],
  ['bench-clock-drift',{},'maxErrorSeconds',12.096],['bench-thermistor-beta',{},'temperatureC',25],
  ['bench-sensor-linear-scale',{},'calibrated',40],['bench-stereo-mid-side',{},'side',.2],
];
for (const [id,args,key,value] of measurements) {
  const result=run(id,args);
  if(id==='design-lens-depth-range'){
    assert.ok(Math.abs(result[key]-value)<.02);
    assert.equal(result.farIsInfinite,true);
    assert.equal(result.farM,null);
  } else near(result[key],value,id);
}
for(const [id,args] of [
  ['units-length',{unit:'constructor'}],['units-temperature',{value:-1,unit:'K'}],
  ['geom-triangle-three-sides',{a:2,b:3,c:5}],['geom-horizontal-tank',{radius:1,fill:3}],
  ['eng-reservoir-time',{inflow:9,outflow:10}],['material-roll-remaining',{outside:50,core:100}],
  ['design-poster-tiles',{overlap:201}],['bench-adc-quantizer',{input:7}],
]) assert.throws(()=>run(id,args),id);
console.log('180 measurement tools passed examples and type guards, plus',unitFixtures.length+measurements.length+8,'independent reference and edge cases.');
