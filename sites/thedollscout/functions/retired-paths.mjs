// Known routes from the retired site. 404 and 410 both communicate removal;
// never redirect unrelated retired material to today's homepage.
export const RETIRED_PREFIXES = Object.freeze([
 '/scam-check','/picks','/quiz','/guides','/importing','/weight','/vendors',
 '/after-you-order','/payment-protection','/cost-calculator','/price-check',
 '/checklist','/faq','/for-creators','/trust','/ga-check','/feed.xml',
 '/search-index.json','/server.json',
]);
export function isRetiredPath(pathname){
 let p=pathname;
 try{for(let i=0;i<2;i++){const next=decodeURIComponent(p);if(next===p)break;p=next;}}catch{/* Match the decodable portion without ever serving archived content. */}
 p=p.toLowerCase().replace(/\/{2,}/g,'/').replace(/^\/(?:en|de|zh|th)(?=\/)/,'');
 return RETIRED_PREFIXES.some(prefix=>p===prefix||p.startsWith(prefix+'/')||p===prefix+'.html'||p===prefix+'.htm');
}
