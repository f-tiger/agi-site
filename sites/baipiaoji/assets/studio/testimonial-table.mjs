// Reused first-party CSV codec from tools/revenue-studio/core.mjs. No third-party API or network.
export const LIMIT=1500;
export function csv(text){
 if(typeof text!=='string'||text.length>300000)throw Error('Use a CSV smaller than 300 KB.');
 const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell==='')quoted=true;else if(quoted)quoted=false;else throw Error('Unexpected quote in CSV.');}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('Close the quoted CSV field.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)throw Error('Include a header and at least one data row.');
 const heads=rows.shift().map(x=>x.trim());if(new Set(heads).size!==heads.length||heads.some(x=>!x||['__proto__','constructor','prototype'].includes(x)))throw Error('Use unique, non-empty CSV column names.');
 if(rows.length>LIMIT)throw Error(`Use at most ${LIMIT} data rows.`);
 return rows.map((r,i)=>{if(r.length!==heads.length)throw Error(`Row ${i+2}: expected ${heads.length} columns, found ${r.length}.`);return Object.fromEntries(heads.map((h,j)=>[h,r[j].trim()]));});
}
export function requireCols(rows,cols){for(const c of cols)if(!(c in rows[0]))throw Error('Missing CSV column: '+c);return rows;}

export const csvOut=rows=>rows.map(r=>r.map(x=>'"'+String(x??'').replace(/^[=+@\t\r-]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n');
