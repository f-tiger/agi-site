import {ensureMembers,memberByToken} from '../../../baipiaoji/lib/membership.js';
import {hash} from '../create/store.mjs';
const ready=new WeakMap();
async function memberDB(env){
 const db=env.HITS||env.EVENTS;if(!db)throw Error('unavailable');
 if(!ready.has(db))ready.set(db,ensureMembers(db,'agi').catch(e=>{ready.delete(db);throw e;}));await ready.get(db);return db;
}
export const memberOwner=id=>hash('jarvis-member:v1:'+id);
export async function resolveAccess(env,token){
 const db=await memberDB(env),member=await memberByToken(db,token);
 // Membership is optional. Existing member keys retain their stable ownership.
 if(member?.suspended)throw Error('access_blocked');
 if(member)return {id:member.id,endsAt:member.ends_at,owner:await memberOwner(member.id)};
 return {id:'',endsAt:0,owner:await hash('jarvis-owner:v1:'+token)};
}
export async function accessActive(env,id){
 if(!id)return true;
 const db=await memberDB(env),member=await db.prepare('SELECT * FROM wb_members WHERE id=?').bind(id).first();
 return !!member&&!member.suspended;
}
