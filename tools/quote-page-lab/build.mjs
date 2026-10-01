import {writeFileSync,mkdirSync} from 'node:fs';
import {renderQuoteStudio} from './render.mjs';
const out=new URL('./dist/',import.meta.url);
mkdirSync(out,{recursive:true});
for(const lang of ['zh','en']){
  const html=renderQuoteStudio(lang);
  writeFileSync(new URL(`quote-studio-${lang}.html`,out),html);
  console.log(`Built quote-studio-${lang}.html (${Buffer.byteLength(html)} bytes)`);
}
