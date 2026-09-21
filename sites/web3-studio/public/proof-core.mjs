const fields=['claim','evidence','counter','invalidate','reviewDate'];
export const PROOF_VERSION=1;
export const DEFAULT_DIFFICULTY=3;
const MAX_DIFFICULTY=5;
const enc=new TextEncoder();
function bytesToHex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function sha256(text){if(!globalThis.crypto?.subtle)throw Error('Web Crypto is unavailable.');return bytesToHex(await globalThis.crypto.subtle.digest('SHA-256',enc.encode(text)));}
function cleanNote(note){if(!note||fields.some(k=>typeof note[k]!=='string'||!note[k].trim()||note[k].length>2000))throw Error('Save the five research note fields before generating a proof.');return Object.fromEntries(fields.map(k=>[k,note[k].trim()]));}
function canonical(noteHash,symbol,reviewDate,createdAt,nonce){return ['w3-research-proof',PROOF_VERSION,symbol,reviewDate,createdAt,noteHash,nonce].join('|');}
function validSymbol(symbol){return typeof symbol==='string'&&/^[A-Z0-9-]{2,12}$/.test(symbol);}
export async function noteHash(note){return sha256(JSON.stringify(cleanNote(note)));}
export async function mineResearchProof({note,symbol,createdAt=new Date().toISOString(),difficulty=DEFAULT_DIFFICULTY,maxNonce=500000}){
 const value=cleanNote(note);if(!validSymbol(symbol))throw Error('Choose one reviewed asset.');
 if(!Number.isInteger(difficulty)||difficulty<1||difficulty>MAX_DIFFICULTY)throw Error('Unsupported proof difficulty.');
 if(!Number.isFinite(Date.parse(createdAt)))throw Error('Invalid proof time.');
 const hash=await noteHash(value),prefix='0'.repeat(difficulty);
 for(let nonce=0;nonce<=maxNonce;nonce++){const digest=await sha256(canonical(hash,symbol,value.reviewDate,createdAt,nonce));if(digest.startsWith(prefix))return {version:PROOF_VERSION,type:'web3-research-proof',symbol,reviewDate:value.reviewDate,createdAt,noteHash:hash,difficulty,nonce,digest};}
 throw Error('Proof search limit reached. Try again.');
}
export async function verifyResearchProof(proof,note=null){
 try{
  if(!proof||proof.version!==PROOF_VERSION||proof.type!=='web3-research-proof'||!validSymbol(proof.symbol)||typeof proof.reviewDate!=='string'||typeof proof.createdAt!=='string'||typeof proof.noteHash!=='string'||!/^[a-f0-9]{64}$/.test(proof.noteHash)||!Number.isInteger(proof.difficulty)||proof.difficulty<1||proof.difficulty>MAX_DIFFICULTY||!Number.isInteger(proof.nonce)||proof.nonce<0||typeof proof.digest!=='string'||!/^[a-f0-9]{64}$/.test(proof.digest))return {valid:false,reason:'Invalid proof shape.'};
  if(!Number.isFinite(Date.parse(proof.createdAt))||!/^\d{4}-\d{2}-\d{2}$/.test(proof.reviewDate))return {valid:false,reason:'Invalid proof dates.'};
  const expected=await sha256(canonical(proof.noteHash,proof.symbol,proof.reviewDate,proof.createdAt,proof.nonce));
  if(expected!==proof.digest||!expected.startsWith('0'.repeat(proof.difficulty)))return {valid:false,reason:'Hash proof does not verify.'};
  if(note){const hash=await noteHash(note);if(hash!==proof.noteHash)return {valid:false,reason:'This note does not match the proof commitment.'};}
  return {valid:true,reason:note?'Proof and note match.':'Proof is valid; the private note is not included.'};
 }catch(e){return {valid:false,reason:e.message||'Proof verification failed.'};}
}
function base64url(text){const bytes=enc.encode(text),chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0;out+=chars[a>>2]+chars[((a&3)<<4)|(b>>4)]+(i+1<bytes.length?chars[((b&15)<<2)|(c>>6)]:'=')+(i+2<bytes.length?chars[c&63]:'=');}return out.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fromBase64url(value){const s=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4),bin=atob(s);return new Uint8Array([...bin].map(c=>c.charCodeAt(0)));}
export function encodeProof(proof){return base64url(JSON.stringify(proof));}
export function decodeProof(value){if(typeof value!=='string'||value.length>3000)throw Error('Proof link is too long.');const text=new TextDecoder().decode(fromBase64url(value));return JSON.parse(text);}
export function proofShareUrl(origin,proof){return origin+'/market.html?proof='+encodeURIComponent(encodeProof(proof));}
