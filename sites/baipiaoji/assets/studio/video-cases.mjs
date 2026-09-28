import {newProject,restore} from './video-core.mjs';

// Editorial demonstrations of actual tool operations, never customer case studies.
export const CASES=[
  {id:'launch',ratio:'9:16',variant:0,
    zh:{label:'商品上新',title:'三张商品图，先做三个开场',task:'准备介绍一款收纳包，但还没决定先讲外观、使用场景，还是细节。',input:'同一个虚构收纳包的全貌、开合与收纳插画。换成你的商品图后，核对文案再导出。',output:'3 条同画幅视频 + 3 份字幕 + 项目备份，镜头不变，开场不同。',change:'点选开场 A、B、C，比较同一素材的三种讲法。',next:'先选一个开场，替换三张商品图；需要其他画幅时切换后再次导出。',hooks:['把随身小物，放回一起','出门前，少找一遍','先看看它怎么收纳'],detail:'拉链开合 · 分区收纳',close:'查看颜色与尺寸'},
    en:{label:'Product launch',title:'Three product images. Three ways to open.',task:'You are introducing a pouch and deciding whether to lead with its look, an everyday use or a close-up.',input:'Original illustrations of one fictional pouch: overview, opening and contents. Replace them with your product images and review the copy.',output:'3 videos in one frame size, 3 subtitle files and a project backup. The footage stays; the opening changes.',change:'Choose opening A, B or C to compare three ways to tell the same story.',next:'Choose an opening, replace the three images, then export. Change frame size and export again when needed.',hooks:['Keep everyday essentials together','One less search before you leave','See how the essentials fit'],detail:'Zip closure · separate compartments',close:'Explore colours and dimensions'}},
  {id:'revision',ratio:'9:16',variant:1,
    zh:{label:'客户改稿',title:'“开头换一句，后面的镜头保留”',task:'第一稿先讲商品细节，第二稿想换成生活场景；你需要把两个版本放在一起看。',input:'沿用上一稿的三段画面，把开场 A 当作原稿、B 当作改稿，C 留作备选。',output:'原稿和改稿都能独立导出；字幕随当前开场一起更新。',change:'切换 A 与 B 看改稿差别，再拖到第 4 秒：后续镜头和字幕保持一致。',next:'免费导出项目 JSON 留底；若需要在不同设备找回每轮改稿，可使用会员云版本。',hooks:['拉开拉链，看清里面的分区','出门前，耳机和钥匙都放好了吗？','把小物集中，出门再检查一遍'],detail:'同一组镜头，保留商品细节',close:'确认文案后再交付'},
    en:{label:'Client revision',title:'“Change the opening. Keep the rest.”',task:'Draft one leads with a detail. Draft two needs an everyday-use angle. You want to compare them side by side.',input:'Reuse the same three visuals. Opening A is the first draft, B the revision and C an alternative.',output:'Export each draft separately, with subtitles that match its opening.',change:'Compare A with B, then scrub to second 4: the later visuals and captions stay the same.',next:'Keep a free local JSON backup. Use member cloud versions when you need to find revisions on another device.',hooks:['Unzip for a closer look inside','Are your keys and earphones ready to go?','Keep small items together before you leave'],detail:'The same visuals, with product details intact',close:'Review the copy before delivery'}},
  {id:'repurpose',ratio:'16:9',variant:0,
    zh:{label:'多画幅交付',title:'竖屏看完，再看横屏怎么排',task:'同一组商品素材，需要准备竖屏、方形和横屏版本，逐个检查文字和商品是否完整。',input:'保留三段原素材、文案和顺序，只切换画幅。',output:'3 个开场 × 3 种画幅，可完成 9 条视频。每次 ZIP 导出当前画幅的 3 条，需分三次导出。',change:'切换 9:16、1:1、16:9，检查画面留白、商品位置和字幕排版。',next:'按目标渠道的实际发布要求检查画幅；这是版式预览，不是平台发布审核。',hooks:['同一套素材，换一种呈现','竖屏、方形、横屏，逐个看清','保留商品完整，再检查字幕'],detail:'素材与顺序不变，画幅重新排版',close:'检查后导出当前画幅'},
    en:{label:'Multiple formats',title:'Watch it vertically. Then try landscape.',task:'One product needs vertical, square and landscape versions, each checked for readable copy and an intact product.',input:'Keep the three visuals, copy and sequence. Change only the frame size.',output:'3 openings × 3 frame sizes can produce 9 videos. Each ZIP contains the current frame size’s 3 videos; export three times.',change:'Switch between 9:16, 1:1 and 16:9 to inspect spacing, the product and captions.',next:'Check the destination’s actual format requirements. This is a layout preview, not a platform publishing review.',hooks:['One set of assets, another presentation','Vertical, square and landscape, reviewed','Keep the product intact and check the copy'],detail:'The same assets and order, in another layout',close:'Review and export this frame size'}}
];
export function caseByID(id){return CASES.find(c=>c.id===id);}
export function caseProject(id,lang='zh'){
  const c=caseByID(id);if(!c)throw Error('UNKNOWN_CASE');
  const locale=lang==='en'?'en':'zh',copy=c[locale],p=newProject(locale,true);
  p.ratio=c.ratio;p.hooks=[...copy.hooks];p.scenes.forEach(s=>s.seconds=3);
  p.scenes[1].text=copy.detail;p.scenes[2].text=copy.close;
  return restore(p);
}
