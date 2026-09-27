(function(root){
  'use strict';
  const fields={rate:[0,5],hours:[0,24],days:[0,366],wattsA:[0,50000],wattsB:[0,50000],heat:[0,200000],effA:[0.1,10],effB:[0.1,10],costA:[0,200000],costB:[0,200000],grant:[0,200000],maintenanceA:[0,20000],maintenanceB:[0,20000],years:[1,40]};
  function calculate(raw){
    if(!['cool','dry','heat'].includes(raw.mode))throw new Error('mode');
    const x={};
    for(const [key,[min,max]] of Object.entries(fields)){
      if(raw[key]===null||raw[key]===undefined||String(raw[key]).trim()==='')throw new Error(key);
      const n=Number(raw[key]);if(!Number.isFinite(n)||n<min||n>max)throw new Error(key);x[key]=n;
    }
    if(x.grant>x.costB)throw new Error('grant');
    let energyA,energyB,annualA,annualB;
    /* PV self-consumption ("solar") mode removed 2026-09-27 with the balcony-PV pages. */
      energyA=raw.mode==='heat'?x.heat/x.effA:x.wattsA/1000*x.hours*x.days;
      energyB=raw.mode==='heat'?x.heat/x.effB:x.wattsB/1000*x.hours*x.days;
      annualA=energyA*x.rate+x.maintenanceA;annualB=energyB*x.rate+x.maintenanceB;
     const investment=x.costB-x.grant-x.costA,saving=annualA-annualB;
    const comparable=raw.comparable===true;
    const payback=!comparable||saving<=0?null:Math.max(0,investment)/saving;
    return {energyA,energyB,annualA,annualB,investment,saving,payback,comparable,
      totalA:x.costA+x.years*annualA,totalB:x.costB-x.grant+x.years*annualB,
      balance:Array.from({length:Math.floor(x.years)+1},(_,year)=>({year,balance:year*saving-investment}))};
  }
  const api={calculate,fields};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EcoCountryModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
