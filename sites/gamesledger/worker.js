// 极简资产 worker:全部请求交给静态资产。将来第五站接 D1 埋点时在这里扩展。
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
