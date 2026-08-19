#!/usr/bin/env node
// 一次性迁移：给 data/licence.json 加上「条件」这一维。
//
// 起因是 deep-research 的一条结论：把商用授权做成布尔值（能／不能）在结构上就是错的。
// 反例最清楚的是 Midjourney——商用权同时取决于「是否付费档」与「你所在公司上一自然年
// 营收是否超过 100 万美元」，两个条件与运算；用一个 ✅/❌ 字段回答，就会对
// 大公司员工给出确定但错误的答案。Midjourney 本身没有免费档、不在本站数据集内，
// 所以这里不写它的数据，只把它暴露出的结构缺陷修掉。
//
// 修法不是加一堆新事实，而是把**已核实文本里本来就写着的门槛**提取成机器可读字段：
//   type: tier（升档解锁）/ purchase（单独购买授权）/ review（须过审）/
//         model（由所用模型决定）/ attribution（须标注，且不随升档解除）
// 凡是已核实文本里没写解锁条件的（如 heygen、recraft），这里就不填——
// 「官方没说升级之后算不算」和「官方说了升级就行」是两种不同的事实，不许混。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'data/licence.json');
const L = JSON.parse(readFileSync(file, 'utf8'));

const C = {
  kling: ['tier', '开通 Pro / Premier / Ultra 付费档后才获得商用权',
    'Commercial rights arrive with the paid Pro / Premier / Ultra tiers'],
  krea: ['tier', '订阅任一付费档即获商用授权，不必挑最贵的那档',
    'Subscribing to any paid tier grants commercial rights — it need not be the top one'],
  'playground-ai': ['tier', '完整商用许可自付费档（Pro 起）生效',
    'The full commercial licence begins at the paid Pro tier'],
  removebg: ['purchase', '买积分买到的不只是分辨率，商用许可是一起给的',
    'Buying credits buys more than resolution — the commercial licence comes with them'],
  luma: ['tier', '付费档同时给更高分辨率与商用权，两者绑在一起',
    'Paid tiers bundle higher resolution and commercial rights together'],
  leonardo: ['tier', '商用相关权益随付费订阅发放',
    'Commercial entitlements come with a paid subscription'],
  framer: ['tier', '官方定价页把免费档定位为非商业用途，用于生意需升付费档',
    'The pricing page positions the free tier as non-commercial; business use needs a paid plan'],
  suno: ['tier', '付费商用权**只覆盖订阅期内生成的歌**——退订后已生成的不受影响，但不再新增',
    'Paid commercial rights cover **only songs generated while subscribed** — earlier ones keep their status, no new ones accrue'],
  'fish-audio': ['tier', 'YouTube／播客一类变现用途须付费档取得商用权',
    'Monetised uses such as YouTube or podcasts need a paid tier for commercial rights'],
  gaoding: ['tier', '商用授权只在会员有效期内成立，会员到期即失效——是租不是买',
    'The commercial licence holds only while the membership runs — it is rented, not bought'],
  vidu: ['tier', '付费用户才可在其服务条款与商业授权指引范围内商用',
    'Only paying users may use output commercially, within its terms and commercial-licence guide'],
  pika: ['tier', '须在商用订阅有效期间才可变现',
    'Monetisation requires an active commercial subscription'],
  elevenlabs: ['tier', '变现内容须付费档；免费档另有注明出处的义务',
    'Monetised content requires a paid tier; the free tier also carries an attribution duty'],
  wujie: ['purchase', '按用途分别购买标准／扩展／商品类授权，或另签《所有权购买协议》',
    'Buy the standard, extended or merchandise licence to match your use, or sign the separate ownership agreement'],
  yige: ['review', '**门是审核不是付费**：图片须先通过官方审核才支持下载，没过审就拿不到文件',
    '**The gate is review, not payment**: an image must pass official review before it can be downloaded'],
  udio: ['attribution', '免费档创作须显著标明「由 Udio 生成」，**日后订阅也不解除**——义务绑定创作那一刻的档位',
    'Free-tier creations must visibly credit Udio, and **subscribing later does not lift it** — the duty binds to the tier you were on when you created'],
  liblib: ['model', '由底模与所有 LoRA 的许可共同决定，取最严的一个',
    'Decided jointly by the base model and every LoRA licence — the strictest component wins'],
  civitai: ['model', '由上传者在模型页设定的四个开关决定，且属 honor system 而非正式授权',
    "Decided by the uploader's four toggles on the model page — an honour system, not a formal licence"],
  upscayl: ['model', '由你实际选用的那个模型的许可决定；Upscayl Cloud 提供明确可商用的模型',
    'Decided by the licence of the model you actually picked; Upscayl Cloud offers models cleared for commercial use'],
};

let n = 0;
for (const [slug, [type, zh, en]] of Object.entries(C)) {
  if (!L[slug]) throw new Error(`licence.json 缺少 ${slug}，迁移脚本与数据已经不同步`);
  L[slug].condition = { type, gate_zh: zh, gate_en: en };
  n++;
}

// 一格真正的「有条件可商用」：文心一格官方说可商用，但要先过审——
// 这既不是「可以」也不是「不可以」，压成任一态都会误导。第三态就是为它这种情况留的。
L.yige.verdict = 'conditional';
L.yige.scope_zh = '免费档，过审后';
L.yige.scope_en = 'Free tier, once the image passes review';

writeFileSync(file, `${JSON.stringify(L, null, 2)}\n`);
console.log(`已为 ${n} 条补上 condition；yige 判定改为 conditional。`);
