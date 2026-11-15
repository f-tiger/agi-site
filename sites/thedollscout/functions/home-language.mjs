// Explicit stable language choice; no IP, browser-language or cookie guessing.
export function homeLanguageRedirect(request){
 if(!['GET','HEAD'].includes(request.method))return null;
 const url=new URL(request.url);
 const targets={'/de':'/','/de/':'/','/de/index.html':'/','/index.html':'/','/en':'/en/','/en/index.html':'/en/'};
 if(!Object.hasOwn(targets,url.pathname))return null;
 url.pathname=targets[url.pathname];
 return new Response(null,{status:308,headers:{location:url.href,'cache-control':'public, max-age=300'}});
}
