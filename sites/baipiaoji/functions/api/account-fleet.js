import {hubRoute} from '../../../../tools/fleet-account/hub.mjs';
export const onRequest=({request,env})=>hubRoute(request,env);
