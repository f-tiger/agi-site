// Preserve the existing BPJ-only recovery route; no retention or CE work.
import {memberSite} from '../lib/membership.js';
import {recoverSiteMemberReceipts} from '../../../tools/member-studio/receipts.mjs';
export async function recoverMemberReceipts(env){
 if(memberSite(env)!=='bpj'){
  const error=Error('membership_recovery_unavailable');error.stage='configuration';error.reason='not_configured';throw error;
 }
 return recoverSiteMemberReceipts(env);
}
