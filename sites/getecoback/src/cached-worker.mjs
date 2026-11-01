import {withMonitorOptOut} from '../../../tools/fleet/mcp-liveness-optout.mjs';
import {withFleetAccount} from '../../../tools/fleet-account/edge.mjs';
import worker from './worker.js';
import {createPulseCache} from './pulse-cache.mjs';
const pulseCache = createPulseCache();
const fleetWrappedWorker = {
  ...worker,
  fetch(request, env, ctx) {
    return pulseCache(request, () => worker.fetch(request, env, ctx));
  }
};

export default withMonitorOptOut(withFleetAccount(fleetWrappedWorker));
