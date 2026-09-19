importScripts('./vendor/sql-wasm.js');
let ready=initSqlJs({locateFile:file=>'./vendor/'+file});
onmessage=async({data})=>{try{const SQL=await ready;const run=sql=>{const db=new SQL.Database();try{db.run(data.setup);return db.exec(sql);}finally{db.close();}};const result=run(data.query),expected=run(data.answer);postMessage({ok:true,result,expected});}catch(e){postMessage({ok:false,error:e.message});}};
