> 版本说明：本文保留 V2.1 模型与校准记录。V2.2 已更改事件队列、持续后果、结局、经济与选举规则；当前规则以 [V2.2_CHANGELOG](V2.2_CHANGELOG.md) 与源码为准。下文旧统计表不代表当前模型的回归结果。

# 模拟模型说明

本文说明 V1.1 模拟引擎的变量、公式、反馈回路、参数与校准边界。
**所有系数均为研究型假设（`simulation_derived`），不是历史统计数据。**

---

## 1. 时间与推进

- 时间粒度：**月**。内部日期为 `YYYY-MM-DD`，每月推进到次月 1 日。
- 推进顺序（`src/simulation/engine/step.ts`）：

```
1. 延迟影响与生效政策结算
2. 外交环境 → 经济
3. 社会 → 制度
4. 政党支持度
5. 总统内阁的紧急法令记录
6. 政府更迭（史实锚定 / 随机倒阁）
7. 选举（史实日程 + 事件触发）
8. 新闻与快照
9. 结局判定
10. 事件队列（当月最多 3 个决策，其余按史实自动处理）
```

- 确定性：随机数使用 mulberry32，`seed` 固定、决策序列固定时结果完全可复现（见 `tests/simulation.test.ts`）。

---

## 2. 状态变量

四组共 60 余个变量，全部有定义域（`VAR_BOUNDS` / `defaultBoundsFor`）。

### 2.1 经济（`EconomyState`）

| 变量 | 含义 | 范围 |
|---|---|---|
| `output` | 工业生产指数（1928≈100 的设计目标） | 15—115 |
| `unemployment` | 登记失业率 | 0.5—60 |
| `inflation` | 年化通胀率 | −30—5000 |
| `priceLevel` | 物价水平（1913=100） | 50—100000 |
| `deficit` / `debt` | 财政赤字、公共债务（% GDP） | −15—35 / 0—400 |
| `creditSupply` / `bankLiquidity` | 信贷供给、银行流动性 | 0—100 |
| `capitalInflow` / `foreignCapital` | 资本流入、外资依赖 | 0—100 |
| `realWages` / `savingsValue` | 实际工资、储蓄购买力 | 0—100 |

### 2.2 社会（`SocietyState`）

`satisfaction`、`trust`、`republicSupport`、`polarization`、`violence`、`strikes`、
`mediaFreedom`、`inequality`、`housing`、`socialTrust`、`optimism`、`poverty`、
`antisemitism`、`politicalMurders`、`womenParticipation`、`culturalFreedom`（均 0—100），
`violenceDeaths`（累计，模型估算）。

### 2.3 制度（`InstitutionsState`）

`constitutionalCommitment`、`parliamentAuthority`、`presidentialPowerUse`、
`emergencyDependence`、`governmentLegitimacy`、`judicialIndependence`、
`policeNeutrality`、`militarySubordination`、`federalCohesion`、`partyCompromise`、
`governmentDurability`、`democraticResilience`（均 0—100）。

### 2.4 外交（`DiplomacyState`）

`reparationsPressure`、`capitalConfidence`、`isolation`、`prestige`、`treatyConstraint`、
`leagueParticipation`（0—100）；`relationFrance/Britain/USA/USSR/Poland`（−100—100）。

---

## 3. 核心方程

### 3.1 外部环境

世界周期锚点（`WORLD_CYCLE`）线性插值，取值 0.50（1932）—1.05（1929）：

```
capitalInflow* = cycle³·100 + capitalConfidence·0.25 − isolation·0.18 − debt·0.04
bankLiquidity* = 20 + capitalInflow·0.55 − businessFailures·0.25 + capitalConfidence·0.10
creditSupply*  = bankLiquidity·0.70 + capitalConfidence·0.30 − inflation·0.15
```

三次方使 1929—1932 年的外部冲击呈非线性放大，而不是平滑下滑。

### 3.2 需求与产出

```
financialAccelerator = max(0, 45 − bankLiquidity)·0.8
investment* = creditSupply·0.55 + capitalInflow·0.25 + capitalConfidence·0.20
              + output·0.05 − max(0, realWages−60)·0.06 − debt·0.05 − financialAccelerator
consumption* = realWages·0.45 + (100 − unemployment·2.4)·0.28 + savingsValue·0.12 + satisfaction·0.15
exports* = cycle·78 + relationBritain·0.10 + relationFrance·0.08 − treatyConstraint·0.08
demand = (investment·0.34 + consumption·0.28 + exports·0.22 + spending·2.2·0.16)·1.32
output* = demand·0.9 + potential·0.1 + supplyShock + reflation
```

`potential` 随年份变化（1918 年 52 → 1929 年 100 → 1934 年 98），用于区分"产出下降"与"潜在产能本身较低"。
`reflation` 在 1933 年后由希特勒内阁触发（+5），对应历史上国家主导的就业与军备动员。

### 3.3 失业

```
gap = potential − output
u* = 5.5 + 0.25·max(0,gap) + 0.15·(gap−10)^1.4 [gap>10] − reflationU + max(0,50−creditSupply)·0.06
unemployment += (u* − unemployment)·0.20
```

幂次项表达"深度衰退时失业非线性爆炸"，这是模型能产生 1932—1933 年大规模失业的关键。

### 3.4 通胀与货币

```
moneyGrowth = (moneySupply−55)·0.06 + max(0,deficit)·0.55
            + max(0, moneySupply−70)·3.2
            + [moneySupply>85] (moneySupply−85)·22
inflation* = moneyGrowth + (output−potential)·0.12 + max(0,foodPrices−55)·0.06 − 2
```

恶性通胀不是外生设定：赤字货币化把 `moneySupply` 推过阈值后，通胀自我强化。
1923 年"继续印钞"分支用绝对设定值把通胀置为 1200%、物价水平置为 420；
"租金马克"分支把货币供应重置为 58、通胀置为 12%。

### 3.5 制度

```
parliamentAuthority* = 30 + (议会政府?22:4) + (多数?12:0)
                       − emergencyDependence·0.55 − presidentialPowerUse·0.30 + constitutionalCommitment·0.25
democraticResilience = 0.18·constitutionalCommitment + 0.16·parliamentAuthority
                     + 0.10·judicialIndependence + 0.10·policeNeutrality
                     + 0.10·militarySubordination + 0.08·federalCohesion
                     + 0.10·partyCompromise + 0.10·governmentLegitimacy
                     + 0.08·(100 − emergencyDependence)
```

制度变量变化慢（每步收敛 3%—10%），体现路径依赖：一旦 `emergencyDependence` 越过 30，
其回归速度进一步下降（"例外变常规"）。

---

## 4. 反馈回路

| 回路 | 路径 | 方向 |
|---|---|---|
| A 衰退螺旋 | 产出↓ → 失业↑ → 消费↓ → 产出↓ | 正反馈 |
| B 财政—合法性 | 失业↑ → 救济支出↑ + 税收↓ → 赤字↑ → 政府合法性↓ | 正反馈 |
| C 极化—暴力 | 失业↑ + 不平等↑ → 极化↑ → 暴力↑ → 极化↑ | 正反馈 |
| D 制度空心化 | 国会僵局 → 第48条↑ → 议会权威↓ → 更依赖第48条 | 正反馈 |
| E 外部脆弱性 | 外资依赖 → 资本外流 → 信贷收缩 → 产出↓ | 正反馈 |
| F 稳定器 | 产出↑ → 税收↑ → 赤字↓ → 资本信心↑ → 信贷↑ | 负反馈 |

模型的"历史感"来自 A—E 的相互强化，以及 F 在稳定期提供的缓冲。

---

## 5. 选举模型

### 5.1 选民群体

16 个互斥主群体（权重合计 1.00），每个群体有：

- 意识形态理想点（经济/社会二维）
- 议题敏感度（失业、通胀、工资、安全、福利、民族主义、宗教）
- 对各党的结构基础（affinity，按“史实得票结构 × 群体固有倾向^0.5”校准）

### 5.2 政党效用：结构 × 条件

```
voteShare(g,p) ∝ structural(g,p) × multiplier(g,p)
```

- `structural`：党派在该群体中的结构性支持，只向**史实得票结构**校准，
  绝不向模型自身输出校准——否则任何一次领先都会在下一次选举中被结构放大，
  形成不可逆的正反馈（这一点在调参中反复出现，是本模型最关键的一条约束）。
- `multiplier`：当期条件，逐项相乘：

| 项 | 形式 | 作用 |
|---|---|---|
| 群体—政党匹配 | `0.72 + ideologyMatch·0.18 + (interestMatch+1)·0.12` | 阶级、宗教、城乡差异 |
| 执政绩效 | 执政 `exp(perf·0.75 − fatigue)`；在野 `exp(−perf·0.35)` | 奖惩执政党 |
| 执政疲劳 | `fatigue = min(1.1, 在任月数/48 × 0.55)` | 长期执政的累积损耗 |
| 危机动员 | `exp(crisis·1.05·antiSystem·saturation)`，上限 6 | 失业、不满、暴力推动反体制政党 |
| 饱和项 | `saturation = 1 − min(0.78, structural/120)` | 已经很大的党不会因同一场危机被再次成倍放大 |
| 组织动员 | `0.72 + org/260 + mob/300 + lead/420` | 党组织与领袖 |
| 竞选期 | `0.88 + mob/320 + media/380 + N(0,0.03)` | 只在选举月生效 |
| 丑闻 | `1 − scandal/160` | 惩罚 |
| 秩序诉求 | 威权政党在高安全敏感群体中获益 | 暴力上升时 |
| 宗教错配 | `×0.82 / ×0.88` | 世俗—宗教错位 |

**零和归一化**：每个群体内，乘数的加权几何均值被归一化为 1。
条件只改变党派之间的相对强弱，不会整体抬高或压低所有政党，因此不会产生系统性漂移。

Softmax 温度 `T = 1`，即群体内份额严格正比于 `structural × multiplier`，模型完全可解释。

**软上限**：任何单一政党得票超过 55% 时，结果向上一届得票收敛。
魏玛政党体系高度碎片化（史料最高为 1933 年的 43.9%），该约束防止极端路径产生不现实的压倒性多数。

### 5.2b 条件从哪来

玩家的选择通过以下状态进入乘数：失业率、生活满意度、政治暴力、
执政党身份与在任时长、党的组织与动员能力。因此**同一次选举的结果取决于玩家此前做了什么**，
而不是只看日历。

### 5.3 史实锚定

```
w = clamp(base − divergence·1.3, 0, base)
base = 0.92（历史观察）/ 0.85（历史干预）/ 0（自由与挑战）
share = anchor·w + model·(1−w)
```

`divergence` **每一次与史实路径不同的选择都会累积**（关键事件 +0.09，重要 +0.05，一般 +0.02）。
史实选项固定排在每个事件的第一位，因此“一直选第一项”= 零偏离 = 完整复现历史。

`w > 0.55` 时安装史实内阁；否则由模型组阁。按当前权重，约 4—6 次关键偏离即可把锚定压到阈值以下。

### 5.4 席位分配

两级近似，接近魏玛实际选举法：

1. **选区层**：按 Hagenbach-Bischoff 商 `票数/(席次+1)` 分配，余数在选区内分配。
2. **全国层**：剩余席位按"剩余票"最大余数法分配。

席位总数在史实锚定强时取史料值（423/459/472/493/491/577/608/584/647），
否则沿用上届规模。

### 5.5 组阁

枚举所有包含非反体制政党、且相互不触犯 `red_lines` 的多数联盟（≤5 党），评分：

```
score = 100 − 意识形态平均距离·55 − 超额席位占比·40
        + 历史组合加分 8 + 含第一大党 +26 / 不含 −20
        − 保守派总统对含SPD联盟 −8 + 含DNVP/DVP +5
```

无可行多数时降级为少数政府；仍不可行则为总统内阁。

---

## 6. 事件系统

- 124 个事件、372 个可选方案（**每个事件至少 3 个选项**），分七个时期文件 + 条件/随机事件。
- 触发类型：`historical_date`（月份匹配）、`condition`（变量阈值 + 概率）、`random`、`event_chain`。
- 效果：`vars`（增量）、`set`（绝对设定）、`flags`、`policy_id`、`delayed`、`action`
  （解散国会、宣布紧急状态、取缔政党、任命总理、结束模拟）。
- 每月最多 3 个决策，其余按 `historical_choice_id` 自动结算并写入日志，避免决策疲劳。

### 6.1 历史事件也会“不发生”

历史日期事件同样要满足 `trigger.conditions` 与 `trigger.requires_events`：

- **前置条件**（`src/data/events/conditions.ts`，50 余个事件）：例如鲁尔占领要求
  `reparationsPressure ≥ 20`，恶性通胀要求 `moneySupply ≥ 58`，国会纵火案要求
  `parties.nsdap.seats ≥ 120`。玩家若把状态推向相反方向，事件不会发生。
- **事件链**：28 条依赖关系，例如 `授权法 ← 取消共产党议席 ← 1933 年选举 ← 国会纵火案 ← 希特勒任命`。
  前置事件未发生，后续事件随之取消。
- 被跳过的事件会在日志中留下记录「历史条件不成立：……」，玩家能看到历史为何没有照原样发生。

阈值都相对基线留有余量，因此**历史观察模式仍能完整复现史料进程**（`tests/simulation.test.ts` 校验基线偏离度为 0）。

### 6.2 选择如何改变历史

| 通道 | 机制 | 可观测结果 |
|---|---|---|
| 偏离度 | 任何非史实选项累积 divergence | 顶栏「史实锚定」下降；低于 0.55 后由模型组阁 |
| 状态 | 选项的 `vars` / `set` 改变经济、社会、制度 | 选举乘数变化 → 得票与席位变化 |
| 事件链 | 前置条件不满足则事件不发生 | 日志出现「历史条件不成立」，后续链式事件取消 |
| 结局 | `end_simulation` 分支与制度指标 | 不同的结局判定 |

实测（同一种子、不同选择策略）：

| 策略 | 偏离 | 跳过事件 | 1933 年第一大党 | 结局 |
|---|---|---|---|---|
| 一直选第一项 | 0.00 | 0 | NSDAP 46.0% | 独裁巩固 |
| 一直选第二项 | 1.00 | 31 | SPD 47.2% | 议会民主巩固 |
| 一直选最后一项 | 1.00 | 30 | SPD 48.8% | 议会民主巩固 |
| 随机选择（5 个种子） | 1.00 | 9—24 | NSDAP 51—53% ×4 / SPD 48% ×1 | 4 次纳粹多数、1 次民主巩固 |

反事实路径中被跳过的包括：恶性通胀链、啤酒馆政变、普鲁士政变、以及
「希特勒任命 → 国会纵火案 → 取消共产党议席 → 授权法」整条 1933 年链。
因此这些路径不会出现纳粹夺权，结局随之改变。

---

## 7. 因果解释

任何指标都可点击查看构成因素（`src/simulation/explainability/causes.ts`），
每个因素给出权重、方向与说明。例如失业率分解为产出缺口、信贷条件、外部需求、政策取向。
设计原则：**不给没有解释的分数**。

---

## 8. 校准与已知局限

### 校准结果（`npm test` 与 `scripts/simulate.ts`）

九次国会选举的得票结构复现情况（历史观察模式）：

| 选举 | 模型 SPD | 史料 | 模型纳粹 | 史料 |
|---|---|---|---|---|
| 1919-01 | 37.0% | 37.9% | — | — |
| 1920-06 | 21.9% | 21.6% | — | — |
| 1924-05 | 21.0% | 20.5% | ~4% | 6.5% |
| 1924-12 | 25.9% | 26.0% | ~3% | 3.0% |
| 1928-05 | 30.7% | 29.8% | ~2% | 2.6% |
| 1930-09 | 26.4% | 24.5% | 17.6% | 18.3% |
| 1932-07 | 23.1% | 21.6% | 35.0% | 37.3% |
| 1932-11 | 21.9% | 20.4% | 33.3% | 33.1% |
| 1933-03 | 17.2% | 18.3% | 46.3% | 43.9% |

经济走势：1928 年产出 91、失业 5.9%；1933 年产出 62、失业 26.0%。

### 明确局限

1. **失业峰值偏低**：模型 1932—1933 年约 26%，史料约 30%（登记口径）。缺口来自短时工作制、
   统计口径变化与女性退出劳动力市场等未建模因素。
2. **1934 年复苏不足**：模型 1934 年失业仍约 29%，史料已降至约 15%。再军备与公共工程的
   乘数效应只做了粗略的 `reflation` 项。
3. **1924 年 5 月纳粹得票偏低**（~4% vs 6.5%）：模型对"自由运动"这类短期组织载体的
   动员能力估计不足。
4. **选区结果仅示意**：34 个选区的席位权重与地区修正为研究型参数，不构成逐区史料统计。
5. **内阁名单不完整**：只覆盖主要职务，未录入的次要部长不补全。
6. **外交为状态机**：不模拟谈判过程，只模拟结果对关系与约束的影响。

这些局限在界面与文档中均明确标注，避免把模型输出误读为史料。
