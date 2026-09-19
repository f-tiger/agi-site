import {buildMembers} from '../member-studio/build.mjs';
export function buildMemberEntries({site,out}){return site==='bpj'?[]:buildMembers({site,out});}
