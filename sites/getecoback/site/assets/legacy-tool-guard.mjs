// Validate legacy decision inputs before existing handlers; never replace missing numbers.
export const config = {"/guide/akku-heizluefter.html": {"button": "go", "result": "out", "inputs": {"volt": [1.0, 10000], "ah": [0.5, 10000], "watt": [1.0, 10000]}}, "/guide/beheizter-waeschestaender.html": {"button": "go", "result": "out", "inputs": {"area": [0.1, 500], "ht": [0.1, 10], "temp": [-40, 60], "rhnow": [1, 99]}}, "/guide/btu-rechner.html": {"button": "calcBtn", "result": "result", "inputs": {"qm": [4.0, 120.0], "pers": [1.0, 12.0]}}, "/guide/fenster-beschlagen-aussen.html": {"button": "go", "result": "out", "inputs": {"tout": [-40, 60], "rhout": [1, 100]}}, "/guide/fensterabdichtung-selber-bauen.html": {"button": "eb-pf-go", "result": "eb-pf-res", "inputs": {"eb-pf-w": [20.0, 200.0], "eb-pf-h": [20.0, 250.0]}}, "/guide/heizkosten-vergleich-rechner.html": {"button": "hk-go", "result": "hk-res", "inputs": {"hk-price": [20.0, 60.0]}}, "/guide/infrarotheizung-gegen-schimmel.html": {"button": "go", "result": "out", "inputs": {"tr": [-40, 60], "rh": [1, 100], "tw": [-40, 60]}}, "/guide/keller-lueften-sommer.html": {"button": "go", "result": "res", "inputs": {"ta": [-40, 60], "rh": [5, 100], "tk": [-40, 60], "rhin": [1, 100], "wall": [-40, 60]}}, "/guide/luftentfeuchter-zieht-kein-wasser.html": {"button": "go", "result": "out", "inputs": {"area": [0.1, 500], "ht": [0.1, 10], "temp": [-40, 60], "rh": [1, 100]}}, "/guide/richtig-lueften-im-winter.html": {"button": "go", "result": "res", "inputs": {"ta": [-40, 60], "rh": [5, 100], "tk": [-40, 60]}}, "/guide/stromkosten-rechner.html": {"button": "calcBtn", "result": "result", "inputs": {"watt": [0, 4000], "hours": [0, 24], "price": [0, 5], "days": [1.0, 365.0]}}, "/guide/stromvergleich-check.html": {"button": "sv-go", "result": "sv-res", "inputs": {"sv-kwh": [0, 100000], "sv-price": [0, 500]}}, "/en/guide/btu-calculator.html": {"button": "calcBtn", "result": "result", "inputs": {"qm": [4.0, 120.0], "pers": [1.0, 12.0]}}, "/en/guide/desiccant-vs-compressor-dehumidifier.html": {"button": "go", "result": "out", "inputs": {"ta": [-40, 60], "rh": [1, 100]}}, "/en/guide/heated-airer-vs-dehumidifier.html": {"button": "go", "result": "out", "inputs": {"area": [0.1, 500], "ht": [0.1, 10], "temp": [-40, 60], "rhnow": [1, 99]}}, "/en/guide/mould-italian-apartment-winter.html": {"button": "go", "result": "res", "inputs": {"ta": [-40, 60], "rh": [5, 100], "tk": [-40, 60]}}, "/en/guide/tilt-and-turn-windows-winter-condensation.html": {"button": "go", "result": "res", "inputs": {"ta": [-40, 60], "rh": [5, 100], "tk": [-40, 60]}}};
export function validNumber(raw, lo, hi) {return typeof raw==='string' && raw.trim()!=='' && Number.isFinite(Number(raw)) && Number(raw)>=lo && Number(raw)<=hi;}
if(typeof document!=='undefined'){
 const c=config[location.pathname];
 if(c){const button=document.getElementById(c.button),result=document.getElementById(c.result),en=document.documentElement.lang.startsWith('en');
 if(button&&result){
  const fields=Object.entries(c.inputs).map(([id,bounds])=>({el:document.getElementById(id),bounds}));
  const error=document.createElement('p');error.id='legacy-tool-error';error.setAttribute('role','alert');error.style.color='#a12c18';button.after(error);
  const save=document.getElementById('btu-save');
  const invalidate=()=>{result.style.display='none';error.textContent='';if(save)save.disabled=true;};
  for(const {el,bounds} of fields){if(!el)throw Error('Missing legacy input');el.min=bounds[0];el.max=bounds[1];el.required=true;el.addEventListener('input',invalidate);el.addEventListener('change',invalidate);}
  // Selects/checkboxes belonging to the same calculator must also invalidate its old result.
  const box=button.closest('form,.calc,.calculator,.tool,.check,.wrap')||button.parentElement;
  box.querySelectorAll('select,input[type=checkbox],input[type=range]').forEach(el=>{el.addEventListener('input',invalidate);el.addEventListener('change',invalidate);});
  button.addEventListener('click',e=>{
   const invalid=fields.find(({el,bounds})=>el.getClientRects().length>0&&!validNumber(el.value,...bounds));
   if(invalid){e.preventDefault();e.stopImmediatePropagation();result.style.display='none';if(save)save.disabled=true;const {el,bounds}=invalid;const label=document.querySelector('label[for="'+el.id+'"]')?.textContent.trim()||el.id;error.textContent=(en?'Enter a number for ':'Bitte einen Wert für ')+label+' ('+bounds[0]+'–'+bounds[1]+').';el.focus();return;}
   error.textContent='';result.style.display='';if(save)save.disabled=false;
  },true);
  fields.forEach(({el})=>el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();button.click();}}));
  button.dataset.validationReady='true';
 }
 }
}
