import {ensureMembers,memberByToken,memberStatus} from '../../../baipiaoji/lib/membership.js';
import {hash} from '../create/store.mjs';
const ready=new WeakMap();
async function memberDB(env){
 const db=env.HITS||env.EVENTS;if(!db)throw Error('unavailable');
 if(!ready.has(db))ready.set(db,ensureMembers(db,'agi').catch(e=>{ready.delete(db);throw e;}));await ready.get(db);return db;
}
export const memberOwner=id=>hash('jarvis-member:v1:'+id);
export async function requireMember(env,token){
 const db=await memberDB(env),member=await memberByToken(db,token);
 if(!memberStatus(member).active)throw Error('membership_required');
 return {id:member.id,endsAt:member.ends_at,owner:await memberOwner(member.id)};
}
export async function memberActive(env,id){
 if(!id)return false;
 const db=await memberDB(env),member=await db.prepare('SELECT * FROM wb_members WHERE id=?').bind(id).first();
 return memberStatus(member).active;
}
