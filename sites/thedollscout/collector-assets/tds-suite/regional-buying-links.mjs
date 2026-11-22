const SITE = 'https://thedollscout.com';
export const REGIONAL_GUIDE_PATHS = Object.freeze({
  'dach-meter-fit': '/de/shop/categories/smart-home',
  'uk-laundry-session': '/uk/indoor-laundry',
});
const destinations = {
  tds_dach_meter_fit: ['#tapo-p110', '#tapo-p110m'].map(anchor => SITE + REGIONAL_GUIDE_PATHS['dach-meter-fit'] + anchor),
  tds_uk_laundry_session: [SITE + REGIONAL_GUIDE_PATHS['uk-laundry-session'] + '#model-1'],
};

export function approvedBuyingGuide(name, guide) {
  return Boolean(guide && typeof guide.label === 'string' && guide.label.trim() &&
    Object.hasOwn(destinations, name) && destinations[name].includes(guide.url));
}
