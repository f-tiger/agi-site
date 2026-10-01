// Fixed, first-party video entry paths. A typed URL is tag-only evidence.
export function videoEntry(url, method='GET') {
 const source={'/bill-youtube':'youtube','/bill-tiktok':'tiktok','/dry-youtube':'youtube','/dry-tiktok':'tiktok'}[url.pathname];
 if (!source || !['GET','HEAD'].includes(method)) return null;
 const drying=url.pathname.startsWith('/dry-');
 const target=new URL(drying?'/en/guide/dehumidifier-drying-clothes-cost.html':'/en/energy-tariff-workbench.html','https://getecoback.com');
 if(drying)target.hash='laundry-check';
 target.searchParams.set('utm_source',source);
 target.searchParams.set('utm_medium','organic_video');
 target.searchParams.set('utm_campaign',drying?'eco-laundry-03':'eco-fixed-02');
 target.searchParams.set('utm_content',drying?'low_watts_v1':'fixed_fee_v1');
 if(url.searchParams.has('__ci')||url.searchParams.has('__probe')) target.searchParams.set('__probe','1');
 return new Response(null,{status:302,headers:{location:target.href,'cache-control':'no-store','x-robots-tag':'noindex'}});
}
