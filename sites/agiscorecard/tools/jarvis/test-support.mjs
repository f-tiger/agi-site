import {createHash} from 'node:crypto';
import {database as sqliteDatabase} from '../create/test-support.mjs';
// Local entitlement fixtures only: no real account, payment or provider call.
export const memberID=token=>'fixture-'+token.slice(0,8);
export function database(){
 const db=sqliteDatabase();db.sqlite.exec('CREATE TABLE wb_members(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,created INTEGER NOT NULL,ends_at INTEGER NOT NULL DEFAULT 0,suspended INTEGER NOT NULL DEFAULT 0)');
 for(const digit of ['1','2','a','b']){const token=digit.repeat(64);db.sqlite.prepare('INSERT INTO wb_members VALUES(?,?,?,?,0)').run(memberID(token),createHash('sha256').update(token).digest('hex'),Math.floor(Date.now()/1000),Math.floor(Date.now()/1000)+86400);}
 return db;
}
