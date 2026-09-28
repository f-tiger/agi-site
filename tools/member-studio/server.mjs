import {onRequestGet,onRequestPost} from '../../sites/baipiaoji/functions/api/member.js';
import {onRequestPost as watch} from '../../sites/baipiaoji/functions/api/member-watch.js';
import {onRequestPost as admin} from '../../sites/baipiaoji/functions/api/member-admin.js';
import {sites} from '../revenue-studio/catalog.mjs';
export function siteEnv(site,env){
 if(!Object.hasOwn(sites,site))throw Error('Unknown membership site');
 return site==='bpj'?{...env,MEMBER_SITE:site}:{...env,MEMBER_SITE:site,HITS:env.HITS||env.EVENTS,ADS_WALLET:env.MEMBER_WALLET,ADS_WATCH_SECRET:env.MEMBER_WATCH_SECRET,MEMBERS_ENABLED:env.MEMBERS_ENABLED,ADS_WEB3_ENABLED:env.MEMBERS_ENABLED,ADS_WALLET_CHAIN:'bsc',ADS_WEB3_PRICE_USD:'49.00',ADS_DAYS:'30',ADS_WEB3_RPC_URL:'https://rpc-bsc.48.club'};
}
export async function memberRoute(request,env,site){
 const url=new URL(request.url);if(!['/api/member','/api/member-watch','/api/member-admin'].includes(url.pathname))return null;
 const origin=sites[site]?.origin;if(!origin||![new URL(origin).hostname,'www.'+new URL(origin).hostname].includes(url.hostname))return new Response('Wrong site',{status:403});
 const local=siteEnv(site,env),ctx={request,env:local};
 if(url.pathname==='/api/member'&&request.method==='GET')return onRequestGet(ctx);
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:url.pathname==='/api/member'?'GET, POST':'POST'}});
 return url.pathname==='/api/member'?onRequestPost(ctx):url.pathname==='/api/member-watch'?watch(ctx):admin(ctx);
}
export const memberPage=path=>/^\/(?:en\/|de\/|it\/|zh\/)?members(?:\.html)?\/?$/.test(path);
export function secureMemberPage(response){const r=new Response(response.body,response);r.headers.set('Cache-Control','no-store');r.headers.set('Referrer-Policy','no-referrer');r.headers.set('X-Frame-Options','DENY');r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");return r;}
