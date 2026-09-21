import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=fileURLToPath(new URL('../site/',import.meta.url));
createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/config'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({available:false}));return;}
 const file=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));
 if(!file.startsWith(root))throw Error('Path');
 const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript'};res.setHeader('Content-Type',types[extname(file)]||'text/plain');res.end(await readFile(file));
}catch{res.statusCode=404;res.end('Not found');}}).listen(8789,'0.0.0.0',()=>console.log('LocaleBatch local preview: http://localhost:8789'));
