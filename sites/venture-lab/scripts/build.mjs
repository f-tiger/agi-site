import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
const specs=JSON.parse(await readFile('experiments.json','utf8'));
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const id of Object.keys(specs)){await cp('site/'+id,'dist/'+id,{recursive:true});await cp('site/shared','dist/'+id,{recursive:true});await mkdir('dist/'+id+'/fonts');await cp('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2','dist/'+id+'/fonts/manrope-latin-wght-normal.woff2');await cp('node_modules/@fontsource-variable/manrope/LICENSE','dist/'+id+'/fonts/LICENSE');}
await mkdir('dist/querysprint/vendor');for(const f of ['sql-wasm.js','sql-wasm.wasm'])await cp('node_modules/sql.js/dist/'+f,'dist/querysprint/vendor/'+f);await cp('node_modules/sql.js/LICENSE','dist/querysprint/vendor/LICENSE');
for(const [id,s] of Object.entries(specs)){for(const f of ['index.html','guide.html','privacy.html']){const text=await readFile('dist/'+id+'/'+f,'utf8');if(!text.includes('https://'+s.host)||!text.includes('<title>'))throw Error('Missing canonical/title '+id+'/'+f);}}
console.log('Built three separate product sites and local SQLite runtime.');
