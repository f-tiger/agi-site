import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {memberSecret} from '../member-studio/ops.mjs';

// Existing deployment derives the identical member secret. The parent Cloudflare
// credential never travels to the public endpoint, logs or a disk artifact.
const env = {...process.env};
// Never mix tokens and recipients from different integrations. Existing trader
// secrets refer to the owner's private notification channel, not trading APIs.
if (!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) && env.TRADER_TG_TOKEN && env.TRADER_TG_CHAT) {
  env.TELEGRAM_BOT_TOKEN = env.TRADER_TG_TOKEN;
  env.TELEGRAM_CHAT_ID = env.TRADER_TG_CHAT;
}
if (!env.CAPITAL_RADAR_RUNNER_TOKEN && (env.CLOUDFLARE_API_TOKEN || env.ADS_WATCH_SECRET)) {
  env.CAPITAL_RADAR_RUNNER_TOKEN = createHash('sha256').update(memberSecret('agi', env) + ':capital-radar-runner:v1').digest('hex');
}
delete env.CLOUDFLARE_API_TOKEN;
delete env.ADS_WATCH_SECRET;
const result = spawnSync('python3', [fileURLToPath(new URL('./radar.py', import.meta.url)), ...process.argv.slice(2)], {env, stdio:'inherit'});
process.exitCode = result.status ?? 1;
