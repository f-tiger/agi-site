export const WINTER_HUMIDITY_PATH = '/de/shop/categories/smart-home';
export const WINTER_HUMIDITY_ANCHOR = '#raumfeuchte-messen';
export const WINTER_HUMIDITY_EVENT = 'winter_humidity_arrival';
const ecoOrigin = 'https://getecoback.com';

export function winterHumidityArrival(path, fragment, referrer) {
  if (path !== WINTER_HUMIDITY_PATH || fragment !== WINTER_HUMIDITY_ANCHOR) return null;
  if (referrer !== ecoOrigin && referrer !== 'https://www.getecoback.com') return null;
  return {p: path, e: WINTER_HUMIDITY_EVENT, r: ecoOrigin};
}

export function validWinterHumidityEvent(body) {
  return body?.p === WINTER_HUMIDITY_PATH && body.e === WINTER_HUMIDITY_EVENT && body.r === ecoOrigin &&
    Object.keys(body).length === 3;
}
