import {withMonitorOptOut} from '../../../tools/fleet/mcp-liveness-optout.mjs';
import {withFleetAccount} from '../../../tools/fleet-account/edge.mjs';
import worker from './worker.js';
import {laundryBookmarkRoute} from './laundry-bookmark.mjs';
import {createPulseCache} from './pulse-cache.mjs';
const pulseCache = createPulseCache();
const fleetWrappedWorker = {
  ...worker,
  async fetch(request, env, ctx) {
    const bookmark = await laundryBookmarkRoute(request);
    if (bookmark) return bookmark;
    return pulseCache(request, () => worker.fetch(request, env, ctx));
  }
};

export default withMonitorOptOut(withFleetAccount(fleetWrappedWorker));
