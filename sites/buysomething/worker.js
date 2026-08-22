// buysomething(SourceRadar)worker:静态资产透传。并舰后如需埋点在此扩展。
export default { async fetch(req, env) { return env.ASSETS.fetch(req); } };
