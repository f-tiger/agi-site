import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {memberSecret} from '../member-studio/ops.mjs';

// Existing deployment derives the identical member secret. The parent Cloudflare
// credential never travels to the public endpoint, logs or a disk artifact.
const env = {...process.env};
if (!env.CAPITAL_RADAR_RUNNER_TOKEN && (env.CLOUDFLARE_API_TOKEN || env.ADS_WATCH_SECRET)) {
  env.CAPITAL_RADAR_RUNNER_TOKEN = createHash('sha256').update(memberSecret('agi', env) + ':capital-radar-runner:v1').digest('hex');
}
delete env.CLOUDFLARE_API_TOKEN;
delete env.ADS_WATCH_SECRET;
// Delivery is in SunWatch; don't pass unrelated notification secrets even if an
// interactive caller happens to have them in its environment.
for (const key of ['TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','TRADER_TG_TOKEN','TRADER_TG_CHAT']) delete env[key];
const result = spawnSync('python3', [fileURLToPath(new URL('./radar.py', import.meta.url)), ...process.argv.slice(2)], {env, stdio:'inherit'});
process.exitCode = result.status ?? 1;
