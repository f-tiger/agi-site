// 由 scripts/build.mjs 生成，勿手改。作业包正文（/api/earn 校验注册后发放）。
export const PACKS = {
 "zh": {
  "ai-tool-review-account": {
   "slug": "ai-tool-review-account",
   "title": "做一个 AI 工具测评账号",
   "who": "每天能挤出 1 小时、愿意出镜或至少愿意录屏配音的人。不需要懂技术。",
   "why": "调研里被反复验证的一条路。一个具体案例：抖音账号每天测一个 AI 工具、做 1–3 分钟视频，做到 50 万粉。成立的原因很朴素——新工具每天都在出，普通人没时间一个个试，你替他们试。",
   "cost": "0 元：测评用的工具本身就是本站收录的免费工具，剪辑用剪映，配图用即梦。",
   "first_week": "第一周能做完的是：定方向、开号、发出 5 条。这是可验证的进度，和涨没涨粉无关。",
   "reality": "多数人死在第 2 周：发了七八条没水花就停更了。这条路的本质是「日更换算法信任」，前 30 条基本没有回报——这不是你做得不好，是这个游戏的规则。撑不过 30 条就别开始，省得浪费时间。",
   "traps": [
    "有人卖你「高权重起号账号」——买来的号大多是搬运号，一发原创就限流，钱打水漂。",
    "别买「AI 素材库」。里面的素材全网重复，用了容易吃版权投诉。"
   ],
   "steps": [
    {
     "n": 1,
     "do": "先定死一个细分方向再开号。不要做「AI 工具测评」，要做「给小学老师用的 AI 工具」或「给电商卖家用的 AI 工具」。宽的做不过大号，窄的才有人关注。",
     "plan": null,
     "tools": [
      "metaso",
      "doubao"
     ]
    },
    {
     "n": 2,
     "do": "选题直接从本站的工具库拿，每天一个。写脚本时只回答三件事：这工具解决什么问题、免费额度到哪、什么情况下别用。第三条最招人喜欢，也最少人做。",
     "plan": {
      "slug": "free-copywriting",
      "title": "写公众号、小红书文案，憋不出来",
      "steps": 5
     },
     "tools": []
    },
    {
     "n": 3,
     "do": "录屏 + 配音，不用出镜。剪辑和字幕全程免费工具搞定。",
     "plan": {
      "slug": "free-video-edit",
      "title": "想剪视频，但不会剪也不想付费",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 4,
     "do": "发布后把同一条内容改写成图文再发一遍——视频和图文的读者不重合，多一个渠道等于多一倍曝光。",
     "plan": {
      "slug": "free-copywriting",
      "title": "写公众号、小红书文案，憋不出来",
      "steps": 5
     },
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "metaso",
     "name": "秘塔 AI 搜索",
     "cat": "AI 搜索",
     "url": "https://baipiaoji.com/tools/metaso.html",
     "quota": "官方用户协议确认免费（普通）用户每日可领到一定额度的「刷新积分」，但官方明确写明「具体数额以服务页面显示为准」，未在任何可检索到的厂商页面公布具体数字。官方也从未说过「不限次数」——协议写的是按积分计费：普通模型回答 1 积分，DeepSeek 模型回答 3 积分，第一次工具调用不消耗积分、从第二次起每次 1 积分（消耗=(工具调用-1)+模型回答）。因此免费档是「有额度但官方不公布数字」，不是无限。",
     "source": "秘塔科技官方用户协议（metaso.cn/meta-user-policy）；官方定价页与订购页需登录才展示，具体额度与金额无法核实｜本轮执行限制：出口代理封锁全部厂商域名，未能直接打开官方页面，以上据搜索引擎索引中出自厂商自有域名的引文核实；对抗复核因搜索预算耗尽未能独立重查，故只发布有厂商域名直接引文支撑的说法",
     "checked": "2026-08-13",
     "verdict": null
    },
    {
     "slug": "doubao",
     "name": "豆包（字节跳动）",
     "cat": "对话助手",
     "url": "https://baipiaoji.com/tools/doubao.html",
     "quota": "官方未公布具体数字。登录后可免费使用对话、写作、翻译、编程等功能，官网未标注条数或频次上限；Seedance 2.0 视频生成模型已接入豆包，厂商研究站称登录即可免费使用，但未公布免费生成条数；云盘对普通账号提供「一定额度」的免费云存储空间，官方未明示容量。《豆包付费服务协议》将会员分为标准/加强/高级三档，声明开通会员可「解锁 AI 功能的更多使用额度」，并把具体权益推给「产品页面及服务权益实际展示为准」——即数字只在登录后的会员订阅页/产品界面动态展示，站外无法核验。",
     "source": "豆包官网与《豆包付费服务协议》《AI 空间服务条款》（doubao.com/legal/…），Seedance 2.0 免费可用见厂商研究站 research.doubao.com/en/seedance2_0（经搜索索引引文核实，未直接打开页面——出口代理封锁厂商域名；本轮结论已过一道对抗复核）",
     "checked": "2026-08-13",
     "verdict": null
    }
   ],
   "no_figure": [],
   "checked_at": "2026-09-16"
  },
  "ai-copywriting-service": {
   "slug": "ai-copywriting-service",
   "title": "帮小商家写商品描述和详情页",
   "who": "文字还过得去、能忍受和人反复沟通的人。不需要懂设计，也不需要懂运营。",
   "why": "调研里被验证的三条主路之一。成立的原因是：小卖家自己写不出像样的商品描述，但请文案又不划算——这个中间地带一直空着。而这活儿恰好是 AI 能扛 70% 的类型。",
   "cost": "0 元：写作、校对、配图用的都是本站收录的免费工具。",
   "first_week": "第一周能做完的是：3 个样品 + 挂出服务。第一单什么时候来取决于你挂在哪、有没有人看见，这个我们没法替你保证。",
   "reality": "多数人卡在开口报价。定太低累死自己，定太高没人下单。实际的解法是：前 5 单当成买评价，明确告诉客户「这个价只给前 5 位」，之后按评价涨价——这样不会被自己的低价套死。",
   "traps": [
    "警惕「包接单」的培训。调研里有明确记录：承诺包接单，实际单价 20–30 元，机构后续失联。",
    "不接「先做后付」的活。做完不给钱是这行最常见的坑，尤其是陌生人的大单。"
   ],
   "steps": [
    {
     "n": 1,
     "do": "先给自己攒 3 个样品。随便挑三个真实商品，按你的方法写出详情页文案——没有样品谁也不会给你第一单。",
     "plan": {
      "slug": "free-copywriting",
      "title": "写公众号、小红书文案，憋不出来",
      "steps": 5
     },
     "tools": []
    },
    {
     "n": 2,
     "do": "接到单后走固定流程：问清楚卖点和目标客户 → 让 AI 出 5 个角度 → 你挑一个改写 → 校对。AI 出草稿，你负责判断哪个角度对，这就是那 30% 的人工价值。",
     "plan": {
      "slug": "free-copywriting",
      "title": "写公众号、小红书文案，憋不出来",
      "steps": 5
     },
     "tools": [
      "doubao",
      "huoshan-xiezuo",
      "miaobi"
     ]
    },
    {
     "n": 3,
     "do": "顺手把配图也做了，能明显提高单价——客户要的是「能直接用」，不是一段文字。",
     "plan": {
      "slug": "free-ecommerce-image",
      "title": "开网店，商品图拍不好也没钱找模特",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 4,
     "do": "在闲鱼、小红书、本地商家群挂出服务。从低价起步换前 5 个评价，之后再涨。",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "doubao",
     "name": "豆包（字节跳动）",
     "cat": "对话助手",
     "url": "https://baipiaoji.com/tools/doubao.html",
     "quota": "官方未公布具体数字。登录后可免费使用对话、写作、翻译、编程等功能，官网未标注条数或频次上限；Seedance 2.0 视频生成模型已接入豆包，厂商研究站称登录即可免费使用，但未公布免费生成条数；云盘对普通账号提供「一定额度」的免费云存储空间，官方未明示容量。《豆包付费服务协议》将会员分为标准/加强/高级三档，声明开通会员可「解锁 AI 功能的更多使用额度」，并把具体权益推给「产品页面及服务权益实际展示为准」——即数字只在登录后的会员订阅页/产品界面动态展示，站外无法核验。",
     "source": "豆包官网与《豆包付费服务协议》《AI 空间服务条款》（doubao.com/legal/…），Seedance 2.0 免费可用见厂商研究站 research.doubao.com/en/seedance2_0（经搜索索引引文核实，未直接打开页面——出口代理封锁厂商域名；本轮结论已过一道对抗复核）",
     "checked": "2026-08-13",
     "verdict": null
    },
    {
     "slug": "huoshan-xiezuo",
     "name": "火山写作",
     "cat": "写作翻译",
     "url": "https://baipiaoji.com/tools/huoshan-xiezuo.html",
     "quota": "",
     "source": "",
     "checked": "",
     "verdict": null
    },
    {
     "slug": "miaobi",
     "name": "秘塔写作猫",
     "cat": "写作翻译",
     "url": "https://baipiaoji.com/tools/miaobi.html",
     "quota": "",
     "source": "",
     "checked": "",
     "verdict": null
    }
   ],
   "no_figure": [
    "火山写作",
    "秘塔写作猫"
   ],
   "checked_at": "2026-09-16"
  },
  "ai-chatbot-for-smb": {
   "slug": "ai-chatbot-for-smb",
   "title": "给本地小生意搭一个 AI 客服",
   "who": "愿意折腾工具、能跟老板讲清楚人话的人。不需要写代码。",
   "why": "调研显示单个项目 8k–30k，是这几条路里客单价最高的。成立的原因是：小生意主每天被同样的问题问几十遍（营业时间、地址、价目、能不能退），但请人接客服不值当；而零代码工具已经能把这事做完。",
   "cost": "0 元：扣子免费搭建发布，知识库用腾讯 ima，模型额度用免费的。",
   "first_week": "第一周能做完的是：给一家店做出可演示的成品。这是这条路上唯一真正的门槛，跨过去了后面都是重复。",
   "reality": "多数人卡在「找不到第一个客户」。真实解法不是去陌生开发，是从你已经认识的人开始——你家楼下那家店、你朋友开的工作室。这条路靠的是信任，不是话术。另外别高估自动化：AI 答得了常见问题，答不了纠纷，得跟老板讲清楚边界，否则出了事算你的。",
   "traps": [
    "别承诺「全自动无人值守」。真出了客诉，锅在你身上。",
    "别用需要付费才能发布的平台起步——先用免费的验证需求，客户认了再谈升级。"
   ],
   "steps": [
    {
     "n": 1,
     "do": "先给自己做一个。挑一家你熟悉的店（自己家的、朋友的都行），把它的常见问题整理成文档。",
     "plan": {
      "slug": "free-ai-chatbot",
      "title": "想给自己或公司做个 AI 客服、知识库",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 2,
     "do": "用零代码平台搭出来并发布到微信，让老板真用几天。有个能演示的成品，比任何话术都管用。",
     "plan": {
      "slug": "free-ai-chatbot",
      "title": "想给自己或公司做个 AI 客服、知识库",
      "steps": 4
     },
     "tools": [
      "coze",
      "ima"
     ]
    },
    {
     "n": 3,
     "do": "拿这个成品去谈第二家。谈的时候别讲 AI，讲「你一天被问多少次营业时间」——老板关心的是这个。",
     "plan": null,
     "tools": []
    },
    {
     "n": 4,
     "do": "交付后收一笔维护费。菜单、价格、活动都会变，这是这条路唯一稳定的复购。",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "coze",
     "name": "扣子 Coze（字节）",
     "cat": "智能体",
     "url": "https://baipiaoji.com/tools/coze.html",
     "quota": "个人版分五档（含免费档），按「资源点」计量。免费档具体资源点数官方未在可核实页面明示，因此不写数字；团队版于 2026-06-22 正式上线，另有多档。",
     "source": "扣子官方文档（docs.coze.cn 订阅套餐与计费概览，经搜索索引引文核实；免费档资源点数官方未明示）",
     "checked": "2026-08-04",
     "verdict": null
    },
    {
     "slug": "ima",
     "name": "腾讯 ima",
     "cat": "办公效率",
     "url": "https://baipiaoji.com/tools/ima.html",
     "quota": "免费提供 1GB 个人云存储（官方口径约可存 200 份标准论文）。另有三条免费扩容路径：把知识库发布到「知识库广场」共享可获免费无限扩容且不占个人空间；广场里别人的内容同样不占你的空间；通过邀请新用户与活动 CDkey 累计最高可得 100GB。",
     "source": "腾讯 ima 官网与腾讯云开发者社区官方文章（ima.qq.com、cloud.tencent.com，经搜索索引引文核实）",
     "checked": "2026-08-04",
     "verdict": null
    }
   ],
   "no_figure": [],
   "checked_at": "2026-09-16"
  },
  "ai-teaching-elders": {
   "slug": "ai-teaching-elders",
   "title": "教不会用 AI 的人用 AI",
   "who": "有耐心、讲得清楚的人。你只要比对方多懂一点点就够了。",
   "why": "调研里最被低估的一条：超过 90% 的普通人不会用 AI，卡点是「不知道该说什么」而不是「没有工具」。这个缺口现在几乎没人认真填——所有人都在教高级玩法，没人教怎么开口。",
   "cost": "0 元：教学内容就是本站的方案，你唯一要投入的是时间。",
   "first_week": "第一周能做完的是：自己跑通 3 套方案 + 找到 3 个愿意被免费带的人。",
   "reality": "多数人高估了「要懂多少才能教」。实际上教普通人用 AI，你只要比他们早会三个月就够了。真正的难点在耐心：同一个问题要讲第三遍时还能好好讲，这才是这条路的门槛。另外——你在教的是别人也能免费学到的东西，收的是「陪着走一遍」的钱，别把自己包装成大师，那会走到卖课那条路上去。",
   "traps": [
    "别做「承诺月入过万」的课。调研里明确记录：这类课程内容全是网上免费可查的，学员发现后就是投诉与退款。",
    "别用分期付款的套路。有消费者被诱导办 6000 元分期后无法解约——这是行业最恶劣的做法之一，做了就别想有口碑。"
   ],
   "steps": [
    {
     "n": 1,
     "do": "先把本站的方案自己全跑一遍。你要教的不是「AI 是什么」，是「这件具体的事怎么用 AI 做完」。",
     "plan": {
      "slug": "free-ask-ai",
      "title": "打开了 AI，却不知道该说什么",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 2,
     "do": "锁定一类人和一件事。比如「教开小店的人用 AI 写朋友圈」、「教家长用 AI 辅导作业」。越窄越好教，也越好收费。",
     "plan": {
      "slug": "free-homework",
      "title": "辅导孩子作业，自己先崩溃了",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 3,
     "do": "先免费带 3 个人跑通，把他们卡住的地方全记下来——这些卡点就是你后面课程的全部内容，比自己闭门造车准得多。",
     "plan": null,
     "tools": []
    },
    {
     "n": 4,
     "do": "从一对一或小班起步，别一上来做录播课。录播课需要流量，一对一只需要口碑。",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [],
   "no_figure": [],
   "checked_at": "2026-09-16"
  },
  "ai-content-account": {
   "slug": "ai-content-account",
   "title": "做一个垂直内容账号 + 接广告",
   "who": "对某个领域真感兴趣、能持续输出的人。兴趣是这条路唯一撑得住的燃料。",
   "why": "调研里的常见路径之一（小红书内容 + 广告）。成立的原因是：广告主找的是「精准且信任度高的小号」，不是大号——垂直小号的转化往往更好，所以有人愿意投。",
   "cost": "0 元：写作、配图、排版全用本站收录的免费工具。",
   "first_week": "第一周能做完的是：定方向 + 发出前 5 篇 + 把简介写清楚。",
   "reality": "这条路最慢，也最容易半途而废。真实情况是前三个月基本没有回报，大多数人在第 20 篇左右放弃。如果你要做，先接受「前 50 篇是在交学费」这件事，接受不了就选前面几条见效更快的。",
   "traps": [
    "别买粉。买来的粉不互动，反而会让账号被判定为异常，广告主一看数据就知道。",
    "别接和账号定位无关的广告。一次乱接可能毁掉你攒了半年的信任。"
   ],
   "steps": [
    {
     "n": 1,
     "do": "选一个你本来就感兴趣的窄领域。不感兴趣的领域撑不过三个月，这不是意志力问题。",
     "plan": null,
     "tools": [
      "metaso"
     ]
    },
    {
     "n": 2,
     "do": "用 AI 做选题和初稿，你负责改出「人味」。AI 写的东西平台能认出来，也不吸引人——它的价值在于让你从「写不出」变成「改一改」。",
     "plan": {
      "slug": "free-copywriting",
      "title": "写公众号、小红书文案，憋不出来",
      "steps": 5
     },
     "tools": []
    },
    {
     "n": 3,
     "do": "配图和封面全用免费工具做。封面决定点击率，值得多花时间。",
     "plan": {
      "slug": "free-illustration",
      "title": "想要插画和头像，但不会画也没钱约稿",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 4,
     "do": "粉丝到几千就会有广告主主动来。在那之前，先把「我是做什么的」讲清楚——模糊的账号没人投。",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "metaso",
     "name": "秘塔 AI 搜索",
     "cat": "AI 搜索",
     "url": "https://baipiaoji.com/tools/metaso.html",
     "quota": "官方用户协议确认免费（普通）用户每日可领到一定额度的「刷新积分」，但官方明确写明「具体数额以服务页面显示为准」，未在任何可检索到的厂商页面公布具体数字。官方也从未说过「不限次数」——协议写的是按积分计费：普通模型回答 1 积分，DeepSeek 模型回答 3 积分，第一次工具调用不消耗积分、从第二次起每次 1 积分（消耗=(工具调用-1)+模型回答）。因此免费档是「有额度但官方不公布数字」，不是无限。",
     "source": "秘塔科技官方用户协议（metaso.cn/meta-user-policy）；官方定价页与订购页需登录才展示，具体额度与金额无法核实｜本轮执行限制：出口代理封锁全部厂商域名，未能直接打开官方页面，以上据搜索引擎索引中出自厂商自有域名的引文核实；对抗复核因搜索预算耗尽未能独立重查，故只发布有厂商域名直接引文支撑的说法",
     "checked": "2026-08-13",
     "verdict": null
    }
   ],
   "no_figure": [],
   "checked_at": "2026-09-16"
  },
  "ai-design-service": {
   "slug": "ai-design-service",
   "title": "接 AI 辅助的设计小单",
   "who": "有点审美、愿意学基础工具的人。不需要科班出身。",
   "why": "调研验证的三条主路之一。成立的原因是：小商家需要的不是精品设计，是「能用、便宜、快」——海报、封面、商品图这类需求量大且单价不高，正好是 AI 辅助能吃下的部分。",
   "cost": "0 元：生图、模板、抠图用的都是本站收录的免费工具。",
   "first_week": "第一周能做完的是：10 张作品 + 挂出服务 + 写清楚修改次数上限。",
   "reality": "多数人栽在「无限改稿」上。一定要在成交前写死改几次、超出怎么算钱——这行的痛苦几乎全部来自这一条。另外单价确实不高，靠的是熟练之后的速度，不是单价。",
   "traps": [
    "别接「先看效果再付钱」的单。改了十版对方说不满意然后消失，是这行的经典遭遇。",
    "商用素材要确认授权。AI 生成的图各平台商用条款不同，用前看清楚，别等被投诉才知道。"
   ],
   "steps": [
    {
     "n": 1,
     "do": "先做 10 张作品放着。没有作品集就没有单，这行看的是眼睛不是嘴。",
     "plan": {
      "slug": "free-illustration",
      "title": "想要插画和头像，但不会画也没钱约稿",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 2,
     "do": "掌握一个模板工具就够开工了。多数小单要的是套模板改文字，不是从零创作。",
     "plan": null,
     "tools": [
      "gaoding",
      "chuangkit",
      "canva"
     ]
    },
    {
     "n": 3,
     "do": "商品图类的单子用专门工具做，效率比通用工具高得多。",
     "plan": {
      "slug": "free-ecommerce-image",
      "title": "开网店，商品图拍不好也没钱找模特",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 4,
     "do": "在闲鱼、小红书挂作品接单。明确写清楚「改几次」，否则会被无限次修改拖死。",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "gaoding",
     "name": "稿定 AI",
     "cat": "设计创意",
     "url": "https://baipiaoji.com/tools/gaoding.html",
     "quota": "在线设计与编辑功能可免费使用，模板与素材分为免费与会员两类（会员分模板会员、素材下载会员、大会员三档）。免费档具体下载额度官方未在可核实页面明示，因此不写数字。",
     "source": "稿定设计官方帮助文章与会员说明页（gaoding.com，经搜索索引引文核实；免费档下载额度官方未明示）",
     "checked": "2026-08-04",
     "verdict": {
      "label": "不可商用",
      "cls": "v-no",
      "scope": "免费档 / 会员到期后",
      "checked": "2026-08-06",
      "obligations": [
       "素材是租不是买：会员期内下载的素材，会员到期后不能继续使用"
      ]
     }
    },
    {
     "slug": "chuangkit",
     "name": "创客贴",
     "cat": "设计创意",
     "url": "https://baipiaoji.com/tools/chuangkit.html",
     "quota": "",
     "source": "",
     "checked": "",
     "verdict": null
    },
    {
     "slug": "canva",
     "name": "Canva 可画",
     "cat": "图像设计",
     "url": "https://baipiaoji.com/tools/canva.html",
     "quota": "设计基础功能免费不限；AI 功能两套额度（官方帮助中心明码）：Magic Write 免费档共 50 次——是终身总量不是每月；其余 AI 工具走按月发放的 AI 用量池（免费档具体数额官方帮助中心按功能列示，随版本调整）。另有一条独立于 AI 的官方额度：免费档可上传 5GB 素材。",
     "source": "Canva 官方内容授权协议、AI 产品条款、使用条款与帮助中心（canva.com/policies/content-license-agreement、canva.com/policies/ai-product-terms、canva.com/help 的「Copyright ownership of designs made in Canva」「Understanding your AI usage」等页，经搜索索引引文核实）",
     "checked": "2026-08-06",
     "verdict": {
      "label": "可以商用",
      "cls": "v-yes",
      "scope": "免费档",
      "checked": "2026-08-06",
      "obligations": [
       "产出是否适合商用由你自负，包括画面中的艺术作品、照片、商标、标识是否需另行取得许可"
      ]
     }
    }
   ],
   "no_figure": [
    "创客贴"
   ],
   "checked_at": "2026-09-16"
  }
 },
 "en": {
  "ai-tool-review-account": {
   "slug": "ai-tool-review-account",
   "title": "Run an AI tool review account",
   "who": "Anyone who can carve out an hour a day and is willing to be on camera — or at least record their screen and talk over it. No technical background needed.",
   "why": "One of the paths the research kept confirming. A concrete case: a Douyin account testing one AI tool a day in 1–3 minute videos grew to 500k followers. The reason is plain — new tools ship every day, ordinary people have no time to try them all, so you try them instead.",
   "cost": "¥0: the tools you review are the free ones listed here, editing in CapCut, images in Jimeng.",
   "first_week": "What week one can actually finish: pick the angle, open the account, publish five posts. That is verifiable progress, and it has nothing to do with follower count.",
   "reality": "Most people die in week two: seven or eight posts land with no reaction and they stop. This path is fundamentally 'daily posting traded for algorithmic trust', and the first 30 posts return almost nothing — that is not you doing badly, that is the rule of the game. If you cannot get through 30 posts, don't start; you will only waste the time.",
   "traps": [
    "People will sell you 'a ready-made high-authority account'. Most are repost farms that get throttled the moment you publish something original, and the money is gone.",
    "Don't buy an 'AI asset pack'. The material inside is duplicated all over the internet, and using it invites copyright complaints."
   ],
   "steps": [
    {
     "n": 1,
     "do": "Lock a narrow angle before you open the account. Not 'AI tool reviews' but 'AI tools for primary school teachers' or 'AI tools for e-commerce sellers'. Broad accounts lose to the big ones; narrow accounts get watched.",
     "plan": null,
     "tools": [
      "metaso",
      "doubao"
     ]
    },
    {
     "n": 2,
     "do": "Take your topics straight from the tool library here, one a day. Your script only has to answer three things: what problem it solves, where the free tier stops, and when not to use it. The third one is the most liked and the least done.",
     "plan": {
      "slug": "free-copywriting",
      "title": "Writing social posts and newsletters, and nothing comes out",
      "steps": 5
     },
     "tools": []
    },
    {
     "n": 3,
     "do": "Screen recording plus voiceover — you never have to be on camera. Editing and subtitles are covered end to end by free tools.",
     "plan": {
      "slug": "free-video-edit",
      "title": "You want to edit video but can't edit and won't pay",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 4,
     "do": "After publishing, rewrite the same piece as a text-and-image post and publish it again — video and text audiences barely overlap, so one extra channel roughly doubles your reach.",
     "plan": {
      "slug": "free-copywriting",
      "title": "Writing social posts and newsletters, and nothing comes out",
      "steps": 5
     },
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "metaso",
     "name": "Metaso",
     "cat": "AI search",
     "url": "https://baipiaoji.com/en/tools/metaso.html",
     "quota": "Metaso's own user agreement confirms that ordinary (free) users receive a daily allowance of \"refresh credits,\" but the agreement explicitly defers the amount to the in-product service page (\"the specific amount is as displayed on the service page\") and no vendor page reachable through search publishes a number. The vendor never states \"unlimited\": the agreement bills usage in credits — 1 credit per standard model answer, 3 credits per DeepSeek model answer, first tool call free and 1 credit per tool call thereafter. So the free tier is metered with an officially unpublished figure, not unlimited.",
     "source": "Metaso official user agreement (metaso.cn/meta-user-policy); the pricing and subscription pages render only after login, so neither the allowance nor the price could be verified | Method note: the egress proxy blocked every vendor domain, so no official page could be opened directly; the above is verified from search-index quotes attributed to the vendor's own pages. The adversarial re-check could not run an independent search (budget exhausted), so only claims backed by a direct vendor-domain quote are published.",
     "checked": "2026-08-13",
     "verdict": null
    },
    {
     "slug": "doubao",
     "name": "Doubao (ByteDance)",
     "cat": "Chat assistants",
     "url": "https://baipiaoji.com/en/tools/doubao.html",
     "quota": "No figure is published. Signing in unlocks chat, writing, translation and coding for free, with no message or frequency cap stated on the site; the Seedance 2.0 video model is now integrated into Doubao and the vendor's research site says it is free once you sign in, though no free generation count is published. Cloud storage gives ordinary accounts \"a certain amount\" of free space, with the capacity left unstated. The Doubao paid-service agreement splits membership into standard, enhanced and premium tiers, says a membership \"unlocks more usage quota for AI features\", and defers the specifics to \"whatever the product pages and service entitlements actually display\" — meaning the numbers exist only in the signed-in subscription page and cannot be verified from outside.",
     "source": "Doubao's own site and its paid-service and AI-Space terms (doubao.com/legal/…); free access to Seedance 2.0 per the vendor research site research.doubao.com/en/seedance2_0 (verified from search-index quotes rather than by opening the pages — the egress proxy blocks vendor domains; this round's conclusions went through an adversarial re-check.)",
     "checked": "2026-08-13",
     "verdict": null
    }
   ],
   "no_figure": [],
   "checked_at": "2026-09-16"
  },
  "ai-copywriting-service": {
   "slug": "ai-copywriting-service",
   "title": "Write product descriptions and detail pages for small sellers",
   "who": "Anyone whose writing is decent and who can stand going back and forth with clients. No design or e-commerce background needed.",
   "why": "One of the three main paths the research verified. It works because small sellers cannot write a decent product description themselves, yet hiring a copywriter does not pencil out — that middle ground has been empty all along. And it happens to be exactly the kind of work AI can carry 70% of.",
   "cost": "¥0: writing, proofreading and images all use free tools listed here.",
   "first_week": "What week one can finish: three samples plus a listed service. When the first order arrives depends on where you listed it and who saw it, and that is not something we can promise you.",
   "reality": "Most people freeze at quoting. Too low and you work yourself into the ground; too high and nobody orders. The practical fix: treat the first five orders as buying reviews, tell the client plainly that this price is for the first five only, then raise it on the strength of those reviews — that way your own low price does not trap you.",
   "traps": [
    "Be wary of training that guarantees you orders. The research records it explicitly: orders are promised, the real rate turns out to be ¥20–30 a piece, and the agency then goes dark.",
    "Do not take deliver-first-pay-later work. Not getting paid after delivery is the classic hazard here, especially on large jobs from strangers."
   ],
   "steps": [
    {
     "n": 1,
     "do": "Build three samples first. Pick any three real products and write their detail-page copy your way — nobody hands a first job to someone with no samples.",
     "plan": {
      "slug": "free-copywriting",
      "title": "Writing social posts and newsletters, and nothing comes out",
      "steps": 5
     },
     "tools": []
    },
    {
     "n": 2,
     "do": "Run every job through the same routine: pin down the selling points and target buyer → have AI produce five angles → you pick one and rewrite it → proofread. AI drafts, you judge which angle is right. That judgement is the 30% that is yours.",
     "plan": {
      "slug": "free-copywriting",
      "title": "Writing social posts and newsletters, and nothing comes out",
      "steps": 5
     },
     "tools": [
      "doubao",
      "huoshan-xiezuo",
      "miaobi"
     ]
    },
    {
     "n": 3,
     "do": "Do the images while you are at it — it lifts your rate noticeably, because what the client wants is something ready to use, not a block of text.",
     "plan": {
      "slug": "free-ecommerce-image",
      "title": "You run a shop, your product photos are bad, and models cost money",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 4,
     "do": "List the service on Xianyu, Xiaohongshu and local merchant groups. Start cheap to collect your first five reviews, then raise the price.",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "doubao",
     "name": "Doubao (ByteDance)",
     "cat": "Chat assistants",
     "url": "https://baipiaoji.com/en/tools/doubao.html",
     "quota": "No figure is published. Signing in unlocks chat, writing, translation and coding for free, with no message or frequency cap stated on the site; the Seedance 2.0 video model is now integrated into Doubao and the vendor's research site says it is free once you sign in, though no free generation count is published. Cloud storage gives ordinary accounts \"a certain amount\" of free space, with the capacity left unstated. The Doubao paid-service agreement splits membership into standard, enhanced and premium tiers, says a membership \"unlocks more usage quota for AI features\", and defers the specifics to \"whatever the product pages and service entitlements actually display\" — meaning the numbers exist only in the signed-in subscription page and cannot be verified from outside.",
     "source": "Doubao's own site and its paid-service and AI-Space terms (doubao.com/legal/…); free access to Seedance 2.0 per the vendor research site research.doubao.com/en/seedance2_0 (verified from search-index quotes rather than by opening the pages — the egress proxy blocks vendor domains; this round's conclusions went through an adversarial re-check.)",
     "checked": "2026-08-13",
     "verdict": null
    },
    {
     "slug": "huoshan-xiezuo",
     "name": "Huoshan Writing",
     "cat": "Writing & translation",
     "url": "https://baipiaoji.com/en/tools/huoshan-xiezuo.html",
     "quota": "",
     "source": "",
     "checked": "",
     "verdict": null
    },
    {
     "slug": "miaobi",
     "name": "Xiezuocat",
     "cat": "Writing & translation",
     "url": "https://baipiaoji.com/en/tools/miaobi.html",
     "quota": "",
     "source": "",
     "checked": "",
     "verdict": null
    }
   ],
   "no_figure": [
    "Huoshan Writing",
    "Xiezuocat"
   ],
   "checked_at": "2026-09-16"
  },
  "ai-chatbot-for-smb": {
   "slug": "ai-chatbot-for-smb",
   "title": "Build an AI support bot for a local business",
   "who": "Anyone willing to tinker with tools and explain things to a shop owner in plain language. No coding required.",
   "why": "The research puts a single project at ¥8k–30k, the highest ticket of any path here. It works because a small business owner is asked the same handful of questions dozens of times a day — hours, address, prices, refunds — while hiring someone to answer them is not worth it, and no-code tools can now do the job.",
   "cost": "¥0: build and publish free on Coze, knowledge base in Tencent ima, model credits from free tiers.",
   "first_week": "What week one can finish: one shop with a working, demoable bot. That is the only real barrier on this path — everything after it repeats.",
   "reality": "Most people stall at not being able to find the first customer. The real fix is not cold outreach, it is starting with people you already know — the shop downstairs, a friend's studio. This path runs on trust, not scripts. Also, do not overestimate automation: AI handles common questions, not disputes, and you must spell that boundary out to the owner or the fallout lands on you.",
   "traps": [
    "Never promise a fully automatic, unattended system. When a real complaint blows up, it is yours.",
    "Do not start on a platform that charges before you can publish — validate demand on a free one, and discuss upgrades only once the client is sold."
   ],
   "steps": [
    {
     "n": 1,
     "do": "Build one for yourself first. Pick a shop you know well — your family's, a friend's — and write its common questions into a document.",
     "plan": {
      "slug": "free-ai-chatbot",
      "title": "You want an AI support bot or knowledge base for yourself or your company",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 2,
     "do": "Assemble it on a no-code platform, publish it to WeChat, and let the owner actually use it for a few days. Having something to demo beats any pitch.",
     "plan": {
      "slug": "free-ai-chatbot",
      "title": "You want an AI support bot or knowledge base for yourself or your company",
      "steps": 4
     },
     "tools": [
      "coze",
      "ima"
     ]
    },
    {
     "n": 3,
     "do": "Take that demo to a second shop. Do not talk about AI — ask how many times a day people ask what time they close. That is what the owner cares about.",
     "plan": null,
     "tools": []
    },
    {
     "n": 4,
     "do": "Charge a maintenance fee after delivery. Menus, prices and promotions all change, and that is the only reliable repeat revenue on this path.",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "coze",
     "name": "Coze (ByteDance)",
     "cat": "Agents",
     "url": "https://baipiaoji.com/en/tools/coze.html",
     "quota": "The personal edition comes in five tiers including a free one, metered in \"resource points\". The free tier's point allowance isn't stated on any verifiable official page, so we publish no figure; a team edition launched on 22 June 2026 with its own tiers.",
     "source": "Coze official docs (docs.coze.cn subscription and billing overview, verified via search-index quotes; the free-tier point allowance is not officially stated)",
     "checked": "2026-08-04",
     "verdict": null
    },
    {
     "slug": "ima",
     "name": "Tencent ima",
     "cat": "Productivity",
     "url": "https://baipiaoji.com/en/tools/ima.html",
     "quota": "1GB of personal cloud storage free (officially described as roughly 200 standard papers). Three routes expand it at no cost: publishing a knowledge base to the public \"square\" grants unlimited free expansion that doesn't consume personal space; other people's content in the square likewise doesn't count against you; and inviting new users plus event CDkeys can accumulate up to 100GB.",
     "source": "Tencent ima official site and Tencent Cloud developer articles (ima.qq.com, cloud.tencent.com, verified via search-index quotes)",
     "checked": "2026-08-04",
     "verdict": null
    }
   ],
   "no_figure": [],
   "checked_at": "2026-09-16"
  },
  "ai-teaching-elders": {
   "slug": "ai-teaching-elders",
   "title": "Teach people who can't use AI how to use AI",
   "who": "Patient people who explain things clearly. Knowing slightly more than the other person is enough.",
   "why": "The most underrated finding in the research: over 90% of ordinary people cannot use AI, and the blocker is not knowing what to say rather than not having a tool. Almost nobody is seriously filling that gap — everyone teaches advanced tricks and nobody teaches people how to open their mouth.",
   "cost": "¥0: the teaching material is this site's recipes; the only thing you invest is time.",
   "first_week": "What week one can finish: run three recipes yourself, and find three people willing to be walked through them for free.",
   "reality": "Most people overestimate how much they need to know before they can teach. To teach ordinary people AI, being three months ahead of them is enough. The real difficulty is patience: still explaining the same question well the third time — that is the actual barrier here. And one more thing: what you teach is something they could learn free elsewhere; what you charge for is walking beside them, so do not package yourself as a guru, because that road ends at selling courses.",
   "traps": [
    "Do not build a course that promises five figures a month. The research records it plainly: the content of those courses is all freely available online, and once students find out it becomes complaints and refunds.",
    "Do not use instalment-payment tactics. One consumer was pushed into a ¥6,000 instalment plan they then could not cancel — one of the ugliest practices in this industry, and doing it ends any word of mouth you had."
   ],
   "steps": [
    {
     "n": 1,
     "do": "Work through this site's recipes yourself first. What you teach is not what AI is, it is how to finish this specific task with AI.",
     "plan": {
      "slug": "free-ask-ai",
      "title": "You opened the AI and had no idea what to type",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 2,
     "do": "Lock one kind of person and one task — teaching shop owners to write social posts with AI, say, or teaching parents to use AI on homework. The narrower it is, the easier to teach and the easier to charge for.",
     "plan": {
      "slug": "free-homework",
      "title": "Helping with homework and losing your mind first",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 3,
     "do": "Walk three people through it for free first and write down every place they got stuck. Those blockers are the entire content of whatever you build later, and far more accurate than guessing at your desk.",
     "plan": null,
     "tools": []
    },
    {
     "n": 4,
     "do": "Start one-on-one or with a tiny group; do not open with a recorded course. Recorded courses need traffic, one-on-one only needs word of mouth.",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [],
   "no_figure": [],
   "checked_at": "2026-09-16"
  },
  "ai-content-account": {
   "slug": "ai-content-account",
   "title": "Run a niche content account and take sponsorships",
   "who": "People genuinely interested in some subject who can keep publishing. Interest is the only fuel that lasts on this path.",
   "why": "A common route in the research: niche content plus sponsorships. It works because advertisers are looking for small accounts that are precise and trusted, not big ones — niche accounts often convert better, which is why someone is willing to pay.",
   "cost": "¥0: writing, images and layout all use free tools listed here.",
   "first_week": "What week one can finish: pick the angle, publish the first five posts, write a clear bio.",
   "reality": "This is the slowest path and the easiest to abandon. The honest picture is that the first three months return essentially nothing, and most people quit around post 20. If you are going to do it, accept up front that the first 50 posts are tuition — and if you cannot accept that, take one of the faster paths above.",
   "traps": [
    "Do not buy followers. Bought followers do not engage, the account gets flagged as anomalous, and an advertiser sees it in the numbers at a glance.",
    "Do not take sponsorships unrelated to what the account is about. One bad fit can destroy trust you spent six months building."
   ],
   "steps": [
    {
     "n": 1,
     "do": "Pick a narrow field you were already interested in. A field you do not care about will not survive three months, and that is not a willpower problem.",
     "plan": null,
     "tools": [
      "metaso"
     ]
    },
    {
     "n": 2,
     "do": "Use AI for angles and first drafts; you make it sound human. Platforms can tell AI writing and readers do not warm to it — its value is moving you from can't-write to just-editing.",
     "plan": {
      "slug": "free-copywriting",
      "title": "Writing social posts and newsletters, and nothing comes out",
      "steps": 5
     },
     "tools": []
    },
    {
     "n": 3,
     "do": "Do images and covers entirely with free tools. The cover decides the click-through rate, so it deserves the extra time.",
     "plan": {
      "slug": "free-illustration",
      "title": "You need illustrations and avatars, can't draw, and can't afford commissions",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 4,
     "do": "Advertisers come to you once you have a few thousand followers. Before that, make what this account is about unmistakable — nobody sponsors a vague account.",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "metaso",
     "name": "Metaso",
     "cat": "AI search",
     "url": "https://baipiaoji.com/en/tools/metaso.html",
     "quota": "Metaso's own user agreement confirms that ordinary (free) users receive a daily allowance of \"refresh credits,\" but the agreement explicitly defers the amount to the in-product service page (\"the specific amount is as displayed on the service page\") and no vendor page reachable through search publishes a number. The vendor never states \"unlimited\": the agreement bills usage in credits — 1 credit per standard model answer, 3 credits per DeepSeek model answer, first tool call free and 1 credit per tool call thereafter. So the free tier is metered with an officially unpublished figure, not unlimited.",
     "source": "Metaso official user agreement (metaso.cn/meta-user-policy); the pricing and subscription pages render only after login, so neither the allowance nor the price could be verified | Method note: the egress proxy blocked every vendor domain, so no official page could be opened directly; the above is verified from search-index quotes attributed to the vendor's own pages. The adversarial re-check could not run an independent search (budget exhausted), so only claims backed by a direct vendor-domain quote are published.",
     "checked": "2026-08-13",
     "verdict": null
    }
   ],
   "no_figure": [],
   "checked_at": "2026-09-16"
  },
  "ai-design-service": {
   "slug": "ai-design-service",
   "title": "Take small AI-assisted design jobs",
   "who": "People with some taste who are willing to learn the basic tools. No formal design training needed.",
   "why": "One of the three main paths the research verified. It works because small merchants do not need fine design — they need usable, cheap and fast. Posters, covers and product images are high in volume and low in price, which is exactly the slice AI assistance can take.",
   "cost": "¥0: generation, templates and background removal all use free tools listed here.",
   "first_week": "What week one can finish: 10 pieces, a listed service, and a written cap on revisions.",
   "reality": "Most people are wrecked by unlimited revisions. Write the revision count and the overage rate into the deal before you accept it — nearly all the pain in this trade comes from that one line. And the rates really are low; what pays is speed once you are fluent, not the price per job.",
   "traps": [
    "Do not take let-me-see-it-first-and-I-will-pay-if-I-like-it jobs. Ten revisions later they say they are not satisfied and disappear — the classic experience in this trade.",
    "Confirm commercial licensing. Commercial terms for AI-generated images differ by platform, so check before you use them, not after a complaint arrives."
   ],
   "steps": [
    {
     "n": 1,
     "do": "Make 10 pieces and have them ready. No portfolio, no jobs — this trade judges with the eyes, not the mouth.",
     "plan": {
      "slug": "free-illustration",
      "title": "You need illustrations and avatars, can't draw, and can't afford commissions",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 2,
     "do": "One template tool is enough to start. Most small jobs are template-plus-new-text, not creation from scratch.",
     "plan": null,
     "tools": [
      "gaoding",
      "chuangkit",
      "canva"
     ]
    },
    {
     "n": 3,
     "do": "Use a dedicated tool for product-image jobs; it is far faster than a general-purpose one.",
     "plan": {
      "slug": "free-ecommerce-image",
      "title": "You run a shop, your product photos are bad, and models cost money",
      "steps": 4
     },
     "tools": []
    },
    {
     "n": 4,
     "do": "List your work on Xianyu and Xiaohongshu. State exactly how many revisions are included, or you will be dragged to death by endless changes.",
     "plan": null,
     "tools": []
    }
   ],
   "stack": [
    {
     "slug": "gaoding",
     "name": "Gaoding AI",
     "cat": "Design",
     "url": "https://baipiaoji.com/en/tools/gaoding.html",
     "quota": "Online design and editing are free to use; templates and assets are split into free and member-only tiers (template membership, asset-download membership, and a premium tier). The free tier's download allowance isn't stated on any verifiable official page, so we publish no figure.",
     "source": "Gaoding official help articles and membership pages (gaoding.com, verified via search-index quotes; the free-tier download allowance is not officially stated)",
     "checked": "2026-08-04",
     "verdict": {
      "label": "No commercial use",
      "cls": "v-no",
      "scope": "Free tier / after membership lapses",
      "checked": "2026-08-06",
      "obligations": [
       "Assets are rented, not bought: material downloaded during a membership may not be used once it lapses"
      ]
     }
    },
    {
     "slug": "chuangkit",
     "name": "Chuangkit",
     "cat": "Design",
     "url": "https://baipiaoji.com/en/tools/chuangkit.html",
     "quota": "",
     "source": "",
     "checked": "",
     "verdict": null
    },
    {
     "slug": "canva",
     "name": "Canva",
     "cat": "Image generation",
     "url": "https://baipiaoji.com/en/tools/canva.html",
     "quota": "Core design features are free without limits; AI features run on two systems (per the official help center): Magic Write on the free plan totals 50 uses — a lifetime cap, not monthly; other AI tools draw from a monthly AI allowance (free-plan amounts are listed per feature in the help center and change over time). Separately from AI, the free plan also allows 5GB of media uploads.",
     "source": "Canva Content License Agreement, AI Product Terms, Terms of Use and Help Center (canva.com/policies/content-license-agreement, canva.com/policies/ai-product-terms, canva.com/help — \"Copyright ownership of designs made in Canva\", \"Understanding your AI usage\" — verified via search-index quotes)",
     "checked": "2026-08-06",
     "verdict": {
      "label": "Commercial use allowed",
      "cls": "v-yes",
      "scope": "Free tier",
      "checked": "2026-08-06",
      "obligations": [
       "It is on you to judge whether a design is fit for commercial use, including whether depicted artworks, photos, trademarks or logos need separate permission"
      ]
     }
    }
   ],
   "no_figure": [
    "Chuangkit"
   ],
   "checked_at": "2026-09-16"
  }
 }
};
