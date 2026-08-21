// X 发帖队列。每周分发循环往末尾追加;发过的项由 KV 记账,改文件不会导致重发。
// 规则:每项 = 单条(text ≤280)或线程(thread 数组,每条 ≤280);每个数字必须
// 可溯源到已上线页面;不写订户数、不写佣金数;id 用日期前缀保序。
export default [
  {
    id: '2026-08-21-agent-protocols',
    thread: [
      '"Which AI agent protocols are actually used?" Backed and used are different claims. We put dates and evidence on every major protocol — the two-tier reality: 🧵',
      'Tier 1 — MCP. The only one with verifiable cross-vendor production adoption: OpenAI (Mar 2025), Google DeepMind (Apr 2025), a live official registry. We run 3 registered servers; the probes show up in our own logs.',
      'Tier 2 — everything else. A2A: 100+ partner logos, little observable traffic. x402: on-chain tx down ~92% (731k→57k/day), ~$28k/day by mid-2026, half of it test-shaped. OpenAI retreated from in-chat checkout in March.',
      'Full scoreboard with sources, plus what would flip each verdict: https://agiscorecard.com/which-agent-protocols-are-actually-used',
    ],
  },
  {
    id: '2026-08-23-eu-ai-act',
    thread: [
      'The EU AI Act deadline didn’t vanish on Aug 2 — it split. Chatbot disclosure (Art. 50) DID land, no grace period for new systems. High-risk got deferred by adopted law to Dec 2027 / Aug 2028. Most coverage conflates the two.',
      'The detail almost everyone gets wrong: the content-marking "deferral to Dec 2026" only covers systems already on the market before Aug 2. Ship a new system today and you must comply from day one.',
      'We keep it as a dated, obligation-by-obligation ledger with primary sources per row — re-checked when the law moves: https://agiscorecard.com/eu-ai-act-what-applies-now',
    ],
  },
];
