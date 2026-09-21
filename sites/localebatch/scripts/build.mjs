import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
await mkdir(new URL('../site/fonts/',import.meta.url),{recursive:true});
await cp(new URL('../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',import.meta.url),new URL('../site/fonts/manrope-latin-wght-normal.woff2',import.meta.url));
await cp(new URL('../node_modules/@fontsource-variable/manrope/LICENSE',import.meta.url),new URL('../site/fonts/LICENSE',import.meta.url));
const core=(await readFile(new URL('../site/core.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
const app=(await readFile(new URL('../site/app.mjs',import.meta.url),'utf8')).replace(/^import .*\n/,'').replace(/^export /gm,'');
const css=await readFile(new URL('../site/styles.css',import.meta.url),'utf8');
const bundle=(core+'\n'+app).replace(/<\/script/gi,'<\\/script');
const html=(await readFile(new URL('../site/index.html',import.meta.url),'utf8')).replace('<link rel="stylesheet" href="./styles.css">',`<style>${css}</style>`).replace('<script type="module" src="./app.mjs"></script>',`<script type="module">${bundle}</script>`);
await mkdir(new URL('../review/',import.meta.url),{recursive:true});
// Escaping script terminators is essential if a future sample includes markup.
await writeFile(new URL('../review/preview.html',import.meta.url),html.replaceAll('href="./guide.html"','href="../site/guide.html"').replaceAll('href="./privacy.html"','href="../site/privacy.html"'));
console.log('Built review/preview.html (offline checker and fixed sample; no payment or live model call).');
