import {DatabaseSync} from 'node:sqlite';
import {ensureAccounts,issueSession,ACCOUNT_COOKIE,now} from '../lib/free-account.js';
import {onRequest} from '../functions/api/manju-watchlist.js';
export async function watchlistFixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 let beforeStatement=null;
 const HITS={prepare(query){let values=[];const statement={bind(...args){values=args;return statement;},execute(){beforeStatement?.(query,sql);const s=sql.prepare(query),results=s.columns().length?s.all(...values):(s.run(...values),[]);return {success:true,results,meta:{changes:Number(sql.prepare('SELECT changes() AS n').get().n)}};},async run(){return statement.execute();},async first(){return statement.execute().results[0]||null;},async all(){return statement.execute();}};return statement;},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>s.execute());sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 const env={HITS};await ensureAccounts(env);
 return {env,sql,setBeforeStatement(fn){beforeStatement=fn;},async account(id){sql.prepare('INSERT INTO free_accounts(id,username,password_hash,recovery_hash,created,updated) VALUES(?,?,?,?,?,?)').run(id,id,'test-only','test-only',now(),now());const token=await issueSession(env,{id,session_version:1});return {id,cookie:ACCOUNT_COOKIE+'='+token};},async call(user,body,options={}){const request=new Request('https://baipiaoji.com/api/manju-watchlist',{method:body?'POST':'GET',headers:{Origin:'https://baipiaoji.com','Content-Type':'application/json',...(user?{Cookie:user.cookie}:{}),...options.headers},...(body?{body:options.raw??JSON.stringify(body)}:{})});const response=await onRequest({request,env});return {status:response.status,headers:response.headers,body:await response.json()};}};
}
