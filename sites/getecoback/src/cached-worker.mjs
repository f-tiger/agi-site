import worker from './worker.js';
import {createPulseCache} from './pulse-cache.mjs';
const pulseCache = createPulseCache();
export default {
  ...worker,
  fetch(request, env, ctx) {
    return pulseCache(request, () => worker.fetch(request, env, ctx));
  }
};
