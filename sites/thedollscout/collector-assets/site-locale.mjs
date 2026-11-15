// Stable home identities. Deep English URLs keep their established unprefixed paths.
export const HOME_PATHS=Object.freeze({de:'/',en:'/en/',zh:'/zh/'});
export const DEFAULT_LANGUAGE='de';
export function pageLanguage(path){
 if(path==='/'||path==='/index.html')return DEFAULT_LANGUAGE;
 const match=/^\/(en|de|zh|th)(?:\/|$)/.exec(path||'');
 return match?match[1]:'en';
}
