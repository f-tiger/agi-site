import {collectionCloud} from '../../lib/collection-cloud.js';
export const onRequest=({request,env})=>collectionCloud(request,env);
