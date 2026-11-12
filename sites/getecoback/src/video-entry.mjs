// Fixed, first-party video entry paths. A typed URL is tag-only evidence.
export function videoEntry(url, method='GET') {
 const robotSource={'/robot-youtube':'youtube','/robot-tiktok':'tiktok'}[url.pathname];
 if(robotSource && ['GET','HEAD'].includes(method)) {
  const target=new URL('/guide/saugroboter-kaufberatung.html','https://getecoback.com');
  target.hash='wohnung-pruefen';target.searchParams.set('utm_source',robotSource);
  target.searchParams.set('utm_medium',robotSource==='tiktok'?'social':'organic_video');
  target.searchParams.set('utm_campaign','eco-dach-robot-01');
  if(url.searchParams.has('__ci')||url.searchParams.has('__probe'))target.searchParams.set('__probe','1');
  return new Response(null,{status:302,headers:{location:target.href,'cache-control':'no-store','x-robots-tag':'noindex'}});
 }
 const thermostatSource={'/thermostat-youtube':'youtube','/thermostat-tiktok':'tiktok'}[url.pathname];
 if(thermostatSource && ['GET','HEAD'].includes(method)) {
  const target=new URL('/guide/smarte-heizkoerperthermostate-lohnen-sich.html','https://getecoback.com');
  target.hash='eb-thermostat-products';target.searchParams.set('utm_source',thermostatSource);
  target.searchParams.set('utm_medium',thermostatSource==='tiktok'?'social':'organic_video');
  target.searchParams.set('utm_campaign','eco-dach-thermostat-01');
  if(url.searchParams.has('__ci')||url.searchParams.has('__probe'))target.searchParams.set('__probe','1');
  return new Response(null,{status:302,headers:{location:target.href,'cache-control':'no-store','x-robots-tag':'noindex'}});
 }
 const catalogSource={'/entfeuchter-youtube':'youtube','/entfeuchter-tiktok':'tiktok'}[url.pathname];
 if(catalogSource && ['GET','HEAD'].includes(method)) {
  const target=new URL('/guide/luftentfeuchter-ratgeber.html','https://getecoback.com');
  target.hash='eb-models';target.searchParams.set('utm_source',catalogSource);
  target.searchParams.set('utm_medium',catalogSource==='tiktok'?'social':'organic_video');
  target.searchParams.set('utm_campaign','eco-dach-catalog-01');
  if(url.searchParams.has('__ci')||url.searchParams.has('__probe'))target.searchParams.set('__probe','1');
  return new Response(null,{status:302,headers:{location:target.href,'cache-control':'no-store','x-robots-tag':'noindex'}});
 }
 const source={'/bill-youtube':'youtube','/bill-tiktok':'tiktok','/dry-youtube':'youtube','/dry-tiktok':'tiktok','/waesche-youtube':'youtube','/waesche-tiktok':'tiktok'}[url.pathname];
 if (!source || !['GET','HEAD'].includes(method)) return null;
 const germanLaundry=url.pathname.startsWith('/waesche-');
 const drying=germanLaundry || url.pathname.startsWith('/dry-');
 const target=new URL(germanLaundry?'/waeschetrockner-oder-luftentfeuchter.html':drying?'/en/guide/dehumidifier-drying-clothes-cost.html':'/en/energy-tariff-workbench.html','https://getecoback.com');
 if(drying)target.hash='laundry-check';
 target.searchParams.set('utm_source',source);
 target.searchParams.set('utm_medium',germanLaundry&&source==='tiktok'?'social':'organic_video');
 target.searchParams.set('utm_campaign',drying?'eco-laundry-03':'eco-fixed-02');
 target.searchParams.set('utm_content',germanLaundry?'de_label100_20261106':drying?'low_watts_v1':'fixed_fee_v1');
 if(url.searchParams.has('__ci')||url.searchParams.has('__probe')) target.searchParams.set('__probe','1');
 return new Response(null,{status:302,headers:{location:target.href,'cache-control':'no-store','x-robots-tag':'noindex'}});
}
