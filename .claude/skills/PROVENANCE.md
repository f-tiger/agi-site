# 技能出处(新增技能必须在此登记一行)

舰队技能装在**仓库根目录** `.claude/skills/`,14 个站通用(2026-09-16 合并完成,
见 CLAUDE.md「技能装在仓库根目录」一节)。**别再往 `sites/<x>/.claude/` 放。**

## 外部来源

| 技能 | 上游 | 许可证 | 取用日期 | 本地改动 |
|---|---|---|---|---|
| `linkbuilding` | [inhouseseo/superseo-skills](https://github.com/inhouseseo/superseo-skills) | Apache-2.0 | 2026-09-16(初次)· 2026-09-17 更新到上游版 | 无 |
| `featured-snippet-optimizer` | 同上 | Apache-2.0 | 2026-09-17 | 无 |
| `semantic-gap-analysis` | 同上 | Apache-2.0 | 2026-09-17 | 无 |
| `eeat-audit` | 同上 | Apache-2.0 | 2026-09-17 | 无 |
| `design-taste-frontend` 2.5.0 | [Leonxlnx/taste-skill@9b4bf93](https://github.com/Leonxlnx/taste-skill/tree/9b4bf937a1f69348126959c15d2f99a73e65699b) | MIT；资源另附来源/许可 | 2026-11-06 | 上游整包原样本地安装，含 LICENSE；大型资源不入 Git。固定版本安装：`python3 tools/skills/install_taste.py`；适配规则见 `docs/taste-skill-eco.md` |

Apache-2.0 要求保留版权声明并标注改动。以上四个均为**未改动的原样副本**;
若将来本地修改,必须在「本地改动」列写明,否则违反许可证。

## 取用纪律(2026-09-17 定)

1. **先查重**:`ls .claude/skills/` 已有 96+ 个,SEO 方向就有 15 个。
   装之前先确认新技能补的是**现有没有的能力**,不是换个名字的同一件事。
2. **整包装**:SKILL.md 自己列出的 `references/` 必须一并取,缺一个就是断链。
3. **先读后装**:公开仓,逐文件扫过密钥/PII/可执行动作/指令注入形态再合入。
4. **登记**:在上表加一行。没登记的外部技能视同来历不明。
