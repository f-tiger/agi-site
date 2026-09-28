import {memberRoute} from '../../../../tools/member-studio/server.mjs';
export const onRequest=({request,env})=>memberRoute(request,env,'tds');
