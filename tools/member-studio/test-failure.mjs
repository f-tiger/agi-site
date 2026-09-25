import assert from 'node:assert/strict';
import {failureReason} from './failure.mjs';
import {onRequestPost} from '../../sites/baipiaoji/functions/api/member-watch.js';
import {database,mockChain} from './test-fixtures.mjs';
import {ensureMembers} from '../../sites/baipiaoji/lib/membership.js';
for (const [input,expected] of [['no such column: private_field','database_schema'],['D1_ERROR: private SQL','database_error'],['D1 daily limit exceeded','database_limit'],['customer@example.org','internal_error']]) assert.equal(failureReason(Error(input)),expected);
const restore=mockChain(),db=database(),secret='x'.repeat(64);
const env={HITS:db,MEMBER_SITE:'eco',ADS_WEB3_ENABLED:'true',MEMBERS_ENABLED:'true',ADS_WALLET:'0x'+'2'.repeat(40),ADS_WALLET_CHAIN:'bsc',ADS_WEB3_PRICE_USD:'49.00',ADS_WEB3_RPC_URL:'https://rpc.example.org',ADS_WATCH_SECRET:secret};
try {
 await ensureMembers(db,'eco');
 const prepare=db.prepare.bind(db);
 db.prepare=query=>{const statement=prepare(query);if(query.startsWith('SELECT * FROM wb_orders')) statement.all=async()=>{throw Error('D1_ERROR: no such column: confidential_order');};return statement;};
 const request=token=>new Request('https://getecoback.com/api/member-watch',{method:'POST',headers:{Authorization:'Bearer '+token}});
 const denied=await onRequestPost({request:request('wrong'),env});assert.equal(denied.status,401);assert.equal((await denied.json()).stage,undefined);
 const response=await onRequestPost({request:request(secret),env}),body=await response.json();
 assert.equal(response.status,503);assert.deepEqual(body,{ok:false,code:'membership_watch_unavailable',stage:'orders_read',reason:'database_schema'});
 assert.equal(JSON.stringify(body).includes('confidential_order'),false);
 assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM wb_health').get().n,0);
 console.log('PASS safe authenticated diagnosis; failures never refresh payment readiness');
} finally {restore();}
