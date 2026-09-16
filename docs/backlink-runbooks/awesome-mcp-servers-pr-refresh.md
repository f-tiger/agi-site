# awesome-mcp-servers 的 PR 为什么没被合,以及怎么修(2026-09-16)

## 诊断:**不是没人合,是我们的 PR 冲突了**

上一轮我给的判断是「该仓 12 000+ PR,催它是彩票」。**这条判断要修正**——把 fork 拉下来
逐条查过之后,真正的原因是机械的:

| 事实 | 读数 |
|---|---|
| 我们分支的基点 | `cbcdf8f7` = 上游合并 **PR #11415** 时的树 |
| 今天上游 main | `393b4e9f` = 合并 **PR #13298**(日志里还能看到 #13919) |
| 也就是说 | 我们的 PR 挂着的这段时间,维护者**又合了一千多个 PR** |
| `git merge up` | **CONFLICT (content): README.md** |

**维护者不是不合,是跳过了冲突的那个。** 队列里堆着上千条时,冲突 PR 是第一个被略过的。

## 我们的改动到底是什么(比手册里记的小)

净差异 **README.md 一行**。bot review 那次提交叫
「Address bot review: add Glama score badge; **drop the non-GitHub-URL entry**」——
也就是 **agiscorecard 那条因为不是 GitHub URL 被删掉了**,分支上只剩一条:

```
- [f-tiger/verified-ai-free-tiers](https://github.com/f-tiger/verified-ai-free-tiers) [![f-tiger/verified-ai-free-tiers MCP server](https://glama.ai/mcp/servers/f-tiger/verified-ai-free-tiers/badges/score.svg)](https://glama.ai/mcp/servers/f-tiger/verified-ai-free-tiers) 📇 ☁️ - Verified AI free-tier limits and quota comparisons with a human-checked verification date on every entry, commercial-use verdicts, and zero-cost workflow recipes. Remote streamable-HTTP endpoint, no auth; data also served as JSON/markdown at [baipiaoji.com](https://baipiaoji.com/mcp.html).
```

**位置**:`### 💻 Developer Tools` 分区,按字母序插在
`embedded-society/altium-designer-mcp` 之后、`forgemeshlabs/aso-audit-mcp` 之前
(`f-` < `fo`,因为 `-` 的码位小于 `o`)。上游今天该分区在 README 第 1283 行起,插入点第 1313 行。

## 修法(会话里已经做到最后一步,卡在推送权限)

本会话已在 fork 的克隆里建好 `refresh` 分支 = **今天的上游 main + 上面那一行**,
`git diff up refresh` = `README.md | 1 +`,零删除,位置已核对。**但推不上去**:
- `git push --force-with-lease` → 被 harness 拦(`Git Destructive`)
- 改用非破坏性的「合并上游再快进推送」→ 同样被拦(`Create Public Surface`)

两次都是**会话侧的权限闸**,不是 GitHub 拒绝。**没有绕过。**

### 给 owner 的两条路

**A. 网页上点两下(最省事)**:打开那个 PR → "Resolve conflicts" → README 只有一处冲突,
保留上游内容并把上面那一行放回 `embedded-society` 与 `forgemeshlabs` 之间 → Mark as resolved → Commit。

**B. 命令行**:
```bash
git clone https://github.com/f-tiger/awesome-mcp-servers && cd awesome-mcp-servers
git remote add up https://github.com/punkpeye/awesome-mcp-servers && git fetch up main
git checkout add-agiscorecard-and-verified-free-tiers
git merge up/main            # README.md 冲突
# 解冲突:整体采用 up/main 的 README,再把上面那一行插回 Developer Tools 的正确位置
git add README.md && git commit && git push
```

### 如果要让会话来做
需要放行这两类操作之一(设置里加 Bash 权限规则):在该克隆目录内的 `git merge` / `git commit` /
`git push`。**注意跨 owner 挂载在 v1 不支持**——`punkpeye/awesome-mcp-servers` 永远挂不进
已经有 `f-tiger` 仓的会话,所以**上游 PR 的 open/closed 状态与维护者留言在本会话仍然读不到**;
要读只能新开一个以该仓为初始源的会话,或 owner 自己看。

## 顺带修正一条判断

上一轮写的「不催,它是彩票」**只对了一半**:那个仓确实巨大,但它**merge 得很勤**。
我们的 PR 被跳过有个具体且可修的原因。修完冲突再观察,才算真正判过这条渠道。
判定线 `fleet-backlinks-1116` 的读数口径不变(6 个目标里 ≥2 个被收录)。
