import {guardTraffic} from '../../lib/traffic-controls.mjs';
export const onRequest=ctx=>guardTraffic(ctx);
